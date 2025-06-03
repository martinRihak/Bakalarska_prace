import asyncio
import minimalmodbus
import serial
import time
from datetime import datetime, timedelta
from flask import current_app
from models.models import Sensor, SensorData, UserSensor, db
from typing import Dict, Any, Optional, List
import json
from collections import defaultdict, deque
import threading
from concurrent.futures import ThreadPoolExecutor


class AsyncModbusCache:
    """
    Asynchronní cache pro efektivní sběr a ukládání dat z Modbus senzorů.
    
    Klíčové vlastnosti:
    - Paralelní čtení ze senzorů
    - Buffering dat v paměti před uložením do DB
    - Automatické batch ukládání pro optimalizaci
    - Graceful handling chyb komunikace
    """
    
    def __init__(self, 
                 cache_size: int = 1000,           # Maximální počet záznamů v cache
                 batch_size: int = 50,             # Velikost batch pro DB zápis
                 flush_interval: float = 10.0,     # Interval automatického ukládání (sekundy)
                 max_sensor_threads: int = 10,     # Max paralelních čtení senzorů
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

    async def setup(self):
        """
        Inicializace cache systému.
        Musí být zavolána před použitím cache.
        """
        try:
            current_app.logger.info("Setting up AsyncModbusCache...")
            
            # Spustíme background workery
            await self._start_background_workers()
            
            self._setup_complete = True
            current_app.logger.info("AsyncModbusCache setup completed successfully")
            current_app.logger.info(f"{self.sensor_map}")
        except Exception as e:
            current_app.logger.error(f"Failed to setup AsyncModbusCache: {e}")
            raise

    async def _start_background_workers(self):
        """Spouští background tasky pro zpracování dat."""
        
        # Worker pro zpracování fronty dat
        task = asyncio.create_task(self._queue_processor())
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)
        
        # Worker pro periodické ukládání
        task = asyncio.create_task(self._periodic_flush())
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)
        
        # Worker pro monitoring a statistiky
        task = asyncio.create_task(self._stats_monitor())
        self.background_tasks.add(task)
        task.add_done_callback(self.background_tasks.discard)

    async def load_user_sensors(self, user_id: int) -> bool:
        """
        Načte senzory pro daného uživatele a připraví je pro použití.
        
        Args:
            user_id: ID uživatele
            
        Returns:
            bool: True pokud byly senzory úspěšně načteny
        """
        try:
            # Načtení z databáze (synchronní operace v thread poolu)
            sensors = await asyncio.get_event_loop().run_in_executor(
                self.thread_pool,
                self._load_sensors_from_db,
                user_id
            )
            
            if not sensors:
                current_app.logger.warning(f"No sensors found for user: {user_id}")
                return False

            # Uložení do cache struktur
            self.user_sensors[user_id] = sensors
            
            # Vytvoření mapování a inicializace locks
            for sensor in sensors:
                self.sensor_map[sensor.sensor_id] = sensor
                self.last_read[sensor.sensor_id] = None
                self.sensor_locks[sensor.sensor_id] = asyncio.Lock()
                
                # Příprava Modbus instrumentu pro daný baudrate
                if sensor.bit not in self.instruments:
                    await self._init_modbus_instrument(sensor.bit)

            current_app.logger.info(f"Loaded {len(sensors)} sensors for user_id {user_id}")
            return True
            
        except Exception as e:
            current_app.logger.error(f"Error loading sensors for user_id {user_id}: {e}")
            return False

    def _load_sensors_from_db(self, user_id: int) -> List[Sensor]:
        """Synchronní načtení senzorů z databáze (běží v thread poolu)."""
        return Sensor.query.filter(Sensor.users.any(user_id=user_id)).all()

    async def _init_modbus_instrument(self, baudrate: int):
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

    async def read_sensor_async(self, sensor_id: int) -> Optional[float]:
        """
        Asynchronně načte hodnotu ze senzoru.
        
        Args:
            sensor_id: ID senzoru
            
        Returns:
            Optional[float]: Načtená hodnota nebo None při chybě
        """
        if not self._setup_complete:
            raise RuntimeError("Cache není inicializována. Zavolejte setup() nejdříve.")
        
        sensor = self.sensor_map.get(sensor_id)
        if not sensor:
            current_app.logger.error(f"Sensor {sensor_id} not found")
            return None

        # Použijeme lock pro daný senzor, aby nedošlo ke konfliktům
        async with self.sensor_locks[sensor_id]:
            try:
                # Čtení ze senzoru v thread poolu (modbus operace jsou synchronní)
                value = await asyncio.get_event_loop().run_in_executor(
                    self.thread_pool,
                    self._read_sensor_sync,
                    sensor
                )
                
                if value is not None:
                    # Aktualizace statistik
                    self.stats['successful_reads'] += 1
                    self.last_read[sensor_id] = datetime.utcnow()
                    
                    # Přidání do cache (asynchronně)
                    await self._add_to_cache(sensor_id, value)
                    
                    current_app.logger.debug(f"Successfully read sensor {sensor_id}: {value}")
                    return value
                else:
                    self.stats['failed_reads'] += 1
                    current_app.logger.warning(f"Failed to read sensor {sensor_id}")
                    return None
                    
            except Exception as e:
                self.stats['failed_reads'] += 1
                current_app.logger.error(f"Error reading sensor {sensor_id}: {e}")
                return None

    def _read_sensor_sync(self, sensor: Sensor) -> Optional[float]:
        """
        Synchronní čtení ze senzoru (běží v thread poolu).
        
        Tato funkce zapouzdřuje původní logiku čtení z vašeho kódu.
        """
        try:
            instrument = self.instruments.get(sensor.bit)
            if not instrument:
                raise ValueError(f"No instrument available for baudrate {sensor.bit}")
            
            # Čtení hodnoty (toto je synchronní operace)
            value = instrument.read_register(
                sensor.address,
                sensor.scaling,
                sensor.functioncode
            )
            
            return float(value)
            
        except Exception as e:
            current_app.logger.error(f"Sync read error for sensor {sensor.sensor_id}: {e}")
            return None

    async def _add_to_cache(self, sensor_id: int, value: float):
        """Přidá data do cache systému."""
        data_point = {
            'sensor_id': sensor_id,
            'value': value,
            'timestamp': datetime.utcnow(),
            'cached_at': datetime.utcnow()
        }
        
        try:
            # Pokusíme se přidat do fronty (non-blocking)
            self.data_queue.put_nowait(data_point)
        except asyncio.QueueFull:
            # Fronta je plná - okamžitě uložíme nejstarší data
            current_app.logger.warning("Data queue is full, forcing immediate flush")
            await self._force_flush_batch()
            # Zkusíme znovu
            try:
                self.data_queue.put_nowait(data_point)
            except asyncio.QueueFull:
                # Pokud stále není místo, zahodíme nejstarší data z memory cache
                if self.memory_cache:
                    self.memory_cache.popleft()
                self.memory_cache.append(data_point)

    async def read_all_sensors_async(self, user_id: int) -> Dict[int, Optional[float]]:
        """
        Asynchronně načte data ze všech senzorů uživatele.
        
        Toto je klíčová výhoda async přístupu - všechny senzory se čtou paralelně!
        """
        if user_id not in self.user_sensors:
            current_app.logger.warning(f"No sensors loaded for user_id {user_id}")
            return {}

        active_sensors = [s for s in self.user_sensors[user_id] if s.is_active]
        
        if not active_sensors:
            return {}

        # Spustíme všechna čtení paralelně
        tasks = [
            self.read_sensor_async(sensor.sensor_id) 
            for sensor in active_sensors
        ]
        
        # Počkáme na dokončení všech čtení
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Sestavíme výsledek
        sensor_data = {}
        for sensor, result in zip(active_sensors, results):
            if isinstance(result, Exception):
                current_app.logger.error(f"Error reading sensor {sensor.sensor_id}: {result}")
                sensor_data[sensor.sensor_id] = None
            else:
                sensor_data[sensor.sensor_id] = result
        
        return sensor_data

    async def _queue_processor(self):
        """
        Background worker pro zpracování fronty dat.
        
        Tento worker běží neustále a zpracovává data z fronty do batch pro uložení.
        """
        batch = []
        
        while not self._shutdown_event.is_set():
            try:
                # Čekáme na data s timeoutem
                try:
                    data = await asyncio.wait_for(
                        self.data_queue.get(), 
                        timeout=2.0
                    )
                    batch.append(data)
                    self.memory_cache.append(data)
                    
                except asyncio.TimeoutError:
                    # Timeout - zpracujeme současný batch pokud existuje
                    pass
                
                # Zpracujeme batch když je dost velký
                if len(batch) >= self.batch_size:
                    await self._flush_batch(batch)
                    batch.clear()
                
            except Exception as e:
                current_app.logger.error(f"Error in queue processor: {e}")
                await asyncio.sleep(1)

    async def _periodic_flush(self):
        """Background worker pro periodické ukládání dat."""
        while not self._shutdown_event.is_set():
            try:
                await asyncio.sleep(self.flush_interval)
                
                # Pokud máme nějaká data v cache, uložíme je
                if self.memory_cache:
                    await self._flush_memory_cache()
                
            except Exception as e:
                current_app.logger.error(f"Error in periodic flush: {e}")

    async def _flush_batch(self, batch: List[Dict]):
        """Uloží batch dat do databáze."""
        if not batch:
            return
        
        try:
            # Databázové operace spustíme v thread poolu
            await asyncio.get_event_loop().run_in_executor(
                self.thread_pool,
                self._save_batch_to_db,
                batch
            )
            
            self.stats['db_writes'] += len(batch)
            self.stats['last_flush'] = datetime.utcnow()
            
            current_app.logger.debug(f"Flushed batch of {len(batch)} records to database")
            
        except Exception as e:
            current_app.logger.error(f"Error flushing batch to database: {e}")

    def _save_batch_to_db(self, batch: List[Dict]):
        """Synchronní uložení batch do databáze (běží v thread poolu)."""
        try:
            sensor_data_objects = []
            for data_point in batch:
                sensor_data = SensorData(
                    sensor_id=data_point['sensor_id'],
                    timestamp=data_point['timestamp'],
                    value=data_point['value']
                )
                sensor_data_objects.append(sensor_data)
            
            # Bulk insert pro efektivitu
            db.session.bulk_save_objects(sensor_data_objects)
            db.session.commit()
            
        except Exception as e:
            current_app.logger.error(f"Database save error: {e}")
            db.session.rollback()
            raise

    async def _flush_memory_cache(self):
        """Uloží všechna data z memory cache."""
        if not self.memory_cache:
            return
        
        batch = list(self.memory_cache)
        self.memory_cache.clear()
        await self._flush_batch(batch)

    async def _force_flush_batch(self):
        """Vynutí okamžité uložení části dat z fronty."""
        batch = []
        
        # Vezmeme až batch_size položek z fronty
        for _ in range(min(self.batch_size, self.data_queue.qsize())):
            try:
                data = self.data_queue.get_nowait()
                batch.append(data)
            except asyncio.QueueEmpty:
                break
        
        if batch:
            await self._flush_batch(batch)

    async def _stats_monitor(self):
        """Background worker pro monitoring statistik."""
        while not self._shutdown_event.is_set():
            try:
                await asyncio.sleep(60)  # Report každou minutu
                
                current_app.logger.info(
                    f"Cache stats - Successful reads: {self.stats['successful_reads']}, "
                    f"Failed reads: {self.stats['failed_reads']}, "
                    f"DB writes: {self.stats['db_writes']}, "
                    f"Queue size: {self.data_queue.qsize()}, "
                    f"Cache size: {len(self.memory_cache)}"
                )
                
            except Exception as e:
                current_app.logger.error(f"Error in stats monitor: {e}")

    async def get_cached_data(self, sensor_id: int, max_age_minutes: int = 5) -> Optional[Dict]:
        """
        Vrátí nejnovější cached data pro senzor, pokud nejsou starší než max_age_minutes.
        
        Args:
            sensor_id: ID senzoru
            max_age_minutes: Maximální stáří dat v minutách
            
        Returns:
            Dict s daty nebo None
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=max_age_minutes)
        
        # Prohledáme cache od nejnovějších dat
        for data_point in reversed(self.memory_cache):
            if (data_point['sensor_id'] == sensor_id and 
                data_point['timestamp'] >= cutoff_time):
                
                self.stats['cache_hits'] += 1
                return data_point
        
        return None

    async def shutdown(self):
        """
        Graceful shutdown cache systému.
        
        Dokončí všechny pending operace a uloží zbývající data.
        """
        current_app.logger.info("Shutting down AsyncModbusCache...")
        
        # Signalizujeme shutdown
        self._shutdown_event.set()
        
        # Zrušíme background tasky
        for task in self.background_tasks:
            task.cancel()
        
        # Počkáme na dokončení tasků
        if self.background_tasks:
            await asyncio.gather(*self.background_tasks, return_exceptions=True)
        
        # Uložíme zbývající data
        await self._flush_memory_cache()
        
        # Zpracujeme zbývající data ve frontě
        remaining_batch = []
        while not self.data_queue.empty():
            try:
                data = self.data_queue.get_nowait()
                remaining_batch.append(data)
            except asyncio.QueueEmpty:
                break
        
        if remaining_batch:
            await self._flush_batch(remaining_batch)
            current_app.logger.info(f"Saved {len(remaining_batch)} remaining records during shutdown")
        
        # Uzavřeme thread pool
        self.thread_pool.shutdown(wait=True)
        
        current_app.logger.info("AsyncModbusCache shutdown completed")

    def get_stats(self) -> Dict[str, Any]:
        """Vrátí aktuální statistiky cache."""
        return {
            **self.stats,
            'queue_size': self.data_queue.qsize(),
            'memory_cache_size': len(self.memory_cache),
            'active_sensors': len(self.sensor_map),
            'active_users': len(self.user_sensors)
        }