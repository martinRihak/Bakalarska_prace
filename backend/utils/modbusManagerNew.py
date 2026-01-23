import time
import threading
from datetime import datetime, timedelta
from collections import deque
from concurrent.futures import ThreadPoolExecutor
import serial
import minimalmodbus
from flask import current_app
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from models.models import Sensor, SensorData, db

class ModbusManager_2_0:
    def __init__(self, 
                 cache_size: int = 10,           
                 batch_size: int = 5,           
                 flush_interval: float = 120,    
                 check_interval: float = 6000000,     
                 port: str = "/dev/ttyUSB0",
                 app=None):                      
        self.cache_size = cache_size
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.check_interval = check_interval
        self.port = port
        self.app = app
        self.device_address = 1
        
        self.memory_cache = deque(maxlen=cache_size)
        self.sensor_map = {}
        self.last_read = {}
        self.sensor_locks = {}
        
        # Inicializace statistik a zámků
        self.stats = {
            'successful_reads': 0,
            'failed_reads': 0,
            'cache_hits': 0,
            'db_writes': 0,
            'last_flush': None
        }
        self.stats_lock = threading.Lock()
        self.cache_lock = threading.Lock()
        
        self._shutdown_event = threading.Event()
        self._all_sensors_event = threading.Event()
        self.executor = ThreadPoolExecutor(max_workers=4)
        
        self.instrument = None
        self.modbus_connected = False
        
        # První pokus o inicializaci
        self._init_modbus()
        
        # Spuštění background úkolů
       # threading.Thread(target=self._check_modbus_connection, daemon=True).start()
        if self.modbus_connected:
            threading.Thread(target=self._auto_read_all_sensors, daemon=True).start()
            threading.Thread(target=self._periodic_flush_background, daemon=True).start()
            threading.Thread(target=self._stats_monitor_background, daemon=True).start()

    def _init_modbus(self):
        """Inicializuje Modbus připojení a nastaví příznak modbus_connected."""
        with self.app.app_context():
            try:
                self.instrument = minimalmodbus.Instrument(self.port, self.device_address)
                self.instrument.serial.bytesize = 8
                self.instrument.serial.parity = serial.PARITY_NONE
                self.instrument.serial.stopbits = 1
                self.instrument.serial.timeout = 1
                self.instrument.serial.open()
                self.instrument.serial.close()
                self.modbus_connected = True
                current_app.logger.info("Modbus úspěšně inicializován")
            except Exception as e:
                self.modbus_connected = False
                current_app.logger.error(f"Selhala inicializace Modbus: {e}")

    def _check_modbus_connection(self):
        """Periodicky kontroluje připojení a pokusí se ho znovu inicializovat."""
        while not self._shutdown_event.is_set():
            if not self.modbus_connected:
                with self.app.app_context():
                    current_app.logger.info("Pokus o opětovnou inicializaci Modbus připojení...")
                    self._init_modbus()
                    if self.modbus_connected and not hasattr(self, '_all_sensors_thread'):
                        self._start_all_sensors_reading()
            time.sleep(self.check_interval)

    def _add_to_cache(self, sensor_id: int, value: float):
        """Přidá data do cache s thread-safety."""
        data_point = {
            'sensor_id': sensor_id,
            'value': value,
            'timestamp': datetime.now()
        }
        with self.cache_lock:
            self.memory_cache.append(data_point)

    def read_sensor(self, sensor_id: int) -> float:
        """Čte data ze senzoru, pokud je připojení aktivní."""
        if not self.modbus_connected:
            with self.app.app_context():
                current_app.logger.warning("Modbus není připojen, čtení senzoru přeskočeno")
            return None
        sensor = self.sensor_map.get(sensor_id)
        if not sensor or not sensor.is_active:
            return None
        with self.sensor_locks[sensor_id]:
            try:
                value = self.instrument.read_register(sensor.register_address)
                with self.stats_lock:
                    self.stats['successful_reads'] += 1
                self._add_to_cache(sensor_id, value)
                return value
            except Exception as e:
                with self.stats_lock:
                    self.stats['failed_reads'] += 1
                with self.app.app_context():
                    current_app.logger.error(f"Chyba při čtení senzoru {sensor_id}: {e}")
                return None

    def get_latest_data(self, sensor_id: int, max_age_minutes: int = 5) -> float:
        """Získá nejnovější data z cache nebo senzoru, pokud je připojení aktivní."""
        with self.cache_lock:
            cutoff_time = datetime.now() - timedelta(minutes=max_age_minutes)
            for data_point in reversed(self.memory_cache):
                if data_point['sensor_id'] == sensor_id and data_point['timestamp'] >= cutoff_time:
                    with self.stats_lock:
                        self.stats['cache_hits'] += 1
                    return data_point['value']
        value = self.read_sensor(sensor_id)
        if value is not None:
            self._add_to_cache(sensor_id, value)
        return value

    def _periodic_flush_background(self):
        """Periodicky ukládá data z cache do databáze."""
        while not self._shutdown_event.is_set():
            with self.app.app_context():
                try:
                    if len(self.memory_cache) >= self.batch_size:
                        self._flush_memory_cache()
                except Exception as e:
                    current_app.logger.error(f"Chyba při periodickém ukládání: {e}")
            time.sleep(self.flush_interval)

    async def _save_batch_to_db(self, batch: list):
        """Asynchronně uloží dávku dat do databáze."""
        async with AsyncSession(db.engine) as session:
            try:
                sensor_data_objects = [SensorData(**data) for data in batch]
                session.add_all(sensor_data_objects)
                await session.commit()
            except Exception as e:
                current_app.logger.error(f"Chyba při ukládání do databáze: {e}")
                await session.rollback()
                raise

    def _flush_memory_cache(self):
        """Vyprázdní cache do databáze a aktualizuje statistiky."""
        with self.app.app_context():
            if not self.memory_cache:
                return
            with self.cache_lock:
                batch = list(self.memory_cache)
                self.memory_cache.clear()
            try:
                asyncio.run(self._save_batch_to_db(batch))
                with self.stats_lock:
                    self.stats['db_writes'] += len(batch)
                    self.stats['last_flush'] = datetime.utcnow()
                current_app.logger.debug(f"Uložena dávka {len(batch)} záznamů do databáze")
            except Exception as e:
                current_app.logger.error(f"Chyba při ukládání dávky do databáze: {e}")

    def _stats_monitor_background(self):
        """Periodicky loguje statistiky."""
        while not self._shutdown_event.is_set():
            with self.app.app_context():
                try:
                    with self.stats_lock:
                        stats_copy = self.stats.copy()
                    with self.cache_lock:
                        stats_copy['cache_size'] = len(self.memory_cache)
                    current_app.logger.info(f"Statistiky ModbusManager: {stats_copy}")
                except Exception as e:
                    current_app.logger.error(f"Chyba v monitoru statistik: {e}")
            time.sleep(60)

    def _auto_read_all_sensors(self):
        """Automaticky čte všechny senzory v paralelním režimu."""
        while not self._shutdown_event.is_set() and not self._all_sensors_event.is_set():
            with self.app.app_context():
                try:
                    current_time = time.time()
                    futures = []
                    for sensor in self.sensor_map.values():
                        if sensor.is_active and (current_time - self.last_read.get(sensor.sensor_id, 0)) >= sensor.sampling_rate:
                            future = self.executor.submit(self.read_sensor, sensor.sensor_id)
                            futures.append((sensor.sensor_id, future))
                    for sensor_id, future in futures:
                        try:
                            value = future.result(timeout=5)
                            if value is not None:
                                self.last_read[sensor_id] = current_time
                        except Exception as e:
                            current_app.logger.error(f"Chyba při čtení senzoru {sensor_id}: {e}")
                except Exception as e:
                    current_app.logger.error(f"Chyba při automatickém čtení senzorů: {e}")
                time.sleep(1)

    def load_all_sensors(self) -> bool:
        """Načte senzory a spustí automatické čtení, pokud je připojení aktivní."""
        with self.app.app_context():
            try:
                sensors = Sensor.query.all()
                if not sensors:
                    current_app.logger.error("V databázi nebyly nalezeny žádné senzory")
                    return False
                for sensor in sensors:
                    self.sensor_map[sensor.sensor_id] = sensor
                    self.last_read[sensor.sensor_id] = 0.0
                    self.sensor_locks[sensor.sensor_id] = threading.Lock()
                if self.modbus_connected:
                    self._start_all_sensors_reading()
                return True
            except Exception as e:
                current_app.logger.error(f"Selhala inicializace senzorů: {e}")
                return False

    def _start_all_sensors_reading(self):
        """Spustí automatické čtení senzorů."""
        self._all_sensors_thread = threading.Thread(target=self._auto_read_all_sensors, daemon=True)
        self._all_sensors_thread.start()

    def shutdown(self):
        """Ukončí operace a uloží zbývající data."""
        self._shutdown_event.set()
        self._all_sensors_event.set()
        self._flush_memory_cache()
        self.executor.shutdown(wait=True)