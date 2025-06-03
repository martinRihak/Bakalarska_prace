import minimalmodbus
import serial
import asyncio

import time
from datetime import datetime
from flask import current_app
from models.models import Sensor, SensorData, UserSensor,db
from typing import Dict, Any, Optional, List
from concurrent.futures import ThreadPoolExecutor
from collections import deque
class ModbusManager_2_0:
    def __init__(self, 
                 cache_size: int = 1000,           # Maximální počet záznamů v cache
                 batch_size: int = 50,             # Velikost batch pro DB zápis
                 flush_interval: float = 120.0,     # Interval automatického ukládání (sekundy)
                 max_sensor_threads: int = 3,     # Max paralelních čtení senzorů
                 port: str = "/dev/ttyUSB0"):
        
        # Základní konfigurace
        self.cache_size = cache_size
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.port = port
        self.device_address = 1
        
        # Asynchronní komponenty
        self.data_queue = asyncio.Queue(maxsize=cache_size)
        self.memory_cache = deque(maxlen=cache_size)  # Ring buffer pro data
        self.background_tasks = set()  # Sledování background tasků
        
        # Thread pool pro synchronní Modbus operace
        # Modbus knihovna není async, takže musíme použít thread pool
        self.thread_pool = ThreadPoolExecutor(max_workers=max_sensor_threads)
        
        # Sensor management (podobně jako ve vašem původním kódu)
        self.user_sensors: Dict[int, List[Sensor]] = {}
        self.sensor_map: Dict[int, Sensor] = {}
        self.last_read: Dict[int, datetime] = {}
        self.sensor_locks: Dict[int, asyncio.Lock] = {}  # Locks pro jednotlivé senzory
        # Modbus instruments (jeden pro každý baudrate)
        self.instruments: Dict[int, minimalmodbus.Instrument] = {}
        self.instrument_locks: Dict[int, asyncio.Lock] = {}
        
        # Statistiky a monitoring
        self.stats = {
            'successful_reads': 0,
            'failed_reads': 0,
            'cache_hits': 0,
            'db_writes': 0,
            'last_flush': None
        }
        
        self._setup_complete = False
        self._shutdown_event = asyncio.Event()

    async def load_user_sensors(self,user_id:int) -> bool:
        try:
            sensors = await asyncio.get_event_loop().run_in_executor(
                self.thread_pool,
                self.__load_user_sensors,user_id
            )
            if not sensors:
                current_app.logger.error(f"No sensors found for use {user_id}")
                return False
            self.user_sensors[user_id] = sensors
            
            for sensor in sensors:
                self.sensor_map[sensor.sensor_id] = sensor
                self.last_read[sensor.sensor_id] = None
                self.sensor_locks[sensor.sensor_id] = asyncio.Lock()
                
                if(sensor.bit) not in self.instruments:
                    await self._init_modbus(sensor.bit)
                    
            print(self.instruments)
            print(self.sensor_map)
        except Exception as e:
            current_app.logger.error(f"Error loading sensors for user_id {e}")
            return False
        
    def __load_user_sensors(self,user_id:int) -> List[Sensor]:
        return Sensor.query.filter(Sensor.users.any(user_id=user_id)).all()
    
    async def _init_modbus(self, baudrate: int):
        """Inicializuje Modbus instrument pro daný baudrate."""
        try:
            # Vytvoření instrumentu v thread poolu (minimalmodbus není async)
            instrument = await asyncio.get_event_loop().run_in_executor(
                self.thread_pool,
                self._create_modbus_instrument,
                baudrate
            )
            
            self.instruments[baudrate] = instrument
            self.instrument_locks[baudrate] = asyncio.Lock()
            
            current_app.logger.info(f"Modbus instrument initialized for baudrate {baudrate}")
            
        except Exception as e:
            current_app.logger.error(f"Failed to initialize Modbus for baudrate {baudrate}: {e}")
            raise

    def _create_modbus_instrument(self, baudrate: int) -> minimalmodbus.Instrument:
        """Synchronní vytvoření Modbus instrumentu."""
        instrument = minimalmodbus.Instrument(self.port, self.device_address)
        instrument.serial.bytesize = 8
        instrument.serial.parity = serial.PARITY_NONE
        instrument.serial.stopbits = 1
        instrument.serial.timeout = 1
        instrument.serial.baudrate = baudrate
        return instrument

    def read_sensor(self,sensor_id) -> Optional[float]:
        try:
            sensor = self.sensor_map.get(sensor_id)  
            if not sensor:
                raise ValueError(f"Sensor with ID {sensor_id} not found")
            
            value = self.instruments.get(sensor.bit).read_register(
                sensor.address,
                sensor.scaling,
                sensor.functioncode
            )
            
            return float(value)
        except Exception as e:
            current_app.logger.error(f"Sync read error for sensor {sensor.sensor_id}: {e}")
            return None
        
        