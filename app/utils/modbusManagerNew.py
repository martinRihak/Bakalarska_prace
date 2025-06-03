import minimalmodbus
import serial
import time
from models.models import Sensor
from datetime import datetime, timedelta
from flask import current_app
from collections import deque
from typing import Dict, Any, Optional, List
import threading
import queue

class ModbusManager_2_0:
    def __init__(self, 
                 cache_size: int = 1000,           # Maximální počet záznamů v cache
                 batch_size: int = 50,             # Velikost batch pro DB zápis
                 flush_interval: float = 120.0,    # Interval automatického ukládání (sekundy)
                 read_interval_secs: float = 10.0, # Interval automatického čtení senzorů (sekundy)
                 port: str = "/dev/ttyUSB0",
                 app=None):                        # Flask app pro kontext
        
        # Uložení Flask aplikace pro kontext
        self.app = app
        
        # Základní konfigurace
        self.cache_size = cache_size
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.read_interval_secs = read_interval_secs
        self.port = port
        self.device_address = 1
        
        # Synchronní komponenty
        self.data_queue = queue.Queue(maxsize=cache_size)
        self.memory_cache = deque(maxlen=cache_size)  # Ring buffer pro data
        
        # Sensor management
        self.user_sensors: Dict[int, List[Sensor]] = {}
        self.sensor_map: Dict[int, Sensor] = {}
        self.last_read: Dict[int, datetime] = {}
        self.sensor_locks: Dict[int, threading.Lock] = {}  # Locks pro jednotlivé senzory
        
        # Jediný modbus instrument
        self.instrument = None
        self.instrument_lock = threading.Lock()  # Lock pro přístup k instrumentu
        
        # Automatické čtení senzorů
        self.user_read_threads: Dict[int, threading.Thread] = {}  # Vlákna pro čtení senzorů podle uživatele
        self.user_read_events: Dict[int, threading.Event] = {}    # Eventy pro zastavení čtení
        
        # Statistiky a monitoring
        self.stats = {
            'successful_reads': 0,
            'failed_reads': 0,
            'cache_hits': 0,
            'db_writes': 0,
            'last_flush': None
        }
        
        self._shutdown_event = threading.Event()
        
        # Spustíme background workery
        self._start_background()

    def _start_background(self):
        """Spustí background vlákna pro zpracování dat."""
        threading.Thread(target=self._queue_background, daemon=True).start()
        threading.Thread(target=self._periodic_flush_background, daemon=True).start()
        threading.Thread(target=self._stats_monitor_background, daemon=True).start()

    def load_user_sensors(self, user_id: int) -> bool:
        """Načte senzory pro daného uživatele a spustí automatické čtení."""
        with self.app.app_context():
            try:
                sensors = self._load_user_sensors(user_id)
                if not sensors:
                    current_app.logger.error(f"No sensors found for user {user_id}")
                    return False
                self.user_sensors[user_id] = sensors
                
                for sensor in sensors:
                    self.sensor_map[sensor.sensor_id] = sensor
                    self.last_read[sensor.sensor_id] = None
                    self.sensor_locks[sensor.sensor_id] = threading.Lock()
                
                # Inicializace modbus instrumentu (pouze jednou)
                if self.instrument is None:
                    self._init_modbus()
                
                # Spustíme automatické čtení senzorů pro uživatele
                self._start_user_reading(user_id)
                return True
            except Exception as e:
                current_app.logger.error(f"Error loading sensors for {user_id}: {e}")
                return False

    def _load_user_sensors(self, user_id: int) -> List[Sensor]:
        """Synchronní načtení senzorů z databáze."""
        return Sensor.query.filter(Sensor.users.any(user_id=user_id)).all()

    def _init_modbus(self):
        """Inicializuje jediný modbus instrument."""
        with self.app.app_context():
            try:
                self.instrument = minimalmodbus.Instrument(self.port, self.device_address)
                self.instrument.serial.bytesize = 8
                self.instrument.serial.parity = serial.PARITY_NONE
                self.instrument.serial.stopbits = 1
                self.instrument.serial.timeout = 1
                # Baudrate bude nastaven dynamicky před čtením
                current_app.logger.info("Modbus instrument initialized")
            except Exception as e:
                current_app.logger.error(f"Failed to initialize Modbus: {e}")
                raise

    def _start_user_reading(self, user_id: int):
        """Spustí vlákno pro automatické čtení senzorů uživatele."""
        with self.app.app_context():
            if user_id in self.user_read_threads and self.user_read_threads[user_id].is_alive():
                current_app.logger.info(f"Reading thread for user {user_id} already running")
                return
            
            # Vytvoříme event pro zastavení čtení
            self.user_read_events[user_id] = threading.Event()
            
            # Spustíme nové vlákno pro čtení
            thread = threading.Thread(
                target=self._auto_read_sensors,
                args=(user_id,),
                daemon=True
            )
            self.user_read_threads[user_id] = thread
            thread.start()
            current_app.logger.info(f"Started automatic sensor reading for user {user_id}")

    def _auto_read_sensors(self, user_id: int):
        """Automaticky čte senzory uživatele v pravidelných intervalech."""
        while not self._shutdown_event.is_set() and not self.user_read_events[user_id].is_set():
            with self.app.app_context():
                try:
                    # Načteme data ze všech senzorů uživatele
                    sensor_data = self.read_all_sensors(user_id)
                    if sensor_data:
                        current_app.logger.debug(f"Automatically read sensors for user {user_id}: {sensor_data}")
                except Exception as e:
                    current_app.logger.error(f"Error in auto reading for user {user_id}: {e}")
                # Počkáme na další interval
                time.sleep(self.read_interval_secs)

    def read_sensor(self, sensor_id: int) -> Optional[float]:
        """Synchronní čtení senzoru s nastavením baudrate."""
        with self.app.app_context():
            sensor = self.sensor_map.get(sensor_id)
            if not sensor:
                current_app.logger.error(f"Sensor {sensor_id} not found")
                return None
            
            with self.sensor_locks[sensor_id]:
                try:
                    # Nastavíme baudrate pro daný senzor
                    with self.instrument_lock:
                        self.instrument.serial.baudrate = sensor.bit
                        value = self._read_sensor_sync(sensor)
                    if value is not None:
                        self.stats['successful_reads'] += 1
                        self.last_read[sensor_id] = datetime.utcnow()
                        self._add_to_cache(sensor_id, value)
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
        """Synchronní čtení ze senzoru."""
        try:
            value = self.instrument.read_register(
                sensor.address,
                sensor.scaling,
                sensor.functioncode
            )
            return float(value)
        except Exception as e:
            current_app.logger.error(f"Error reading sensor {sensor.sensor_id}: {e}")
            return None

    def _add_to_cache(self, sensor_id: int, value: float):
        """Přidá data do cache systému."""
        with self.app.app_context():
            data_point = {
                'sensor_id': sensor_id,
                'value': value,
                'timestamp': datetime.utcnow(),
                'cached_at': datetime.utcnow()
            }
            try:
                self.data_queue.put_nowait(data_point)
            except queue.Full:
                current_app.logger.warning("Data queue is full, forcing immediate flush")
                self._force_flush_batch()
                try:
                    self.data_queue.put_nowait(data_point)
                except queue.Full:
                    if self.memory_cache:
                        self.memory_cache.popleft()
                    self.memory_cache.append(data_point)

    def read_all_sensors(self, user_id: int) -> Dict[int, Optional[float]]:
        """Synchronní načtení dat ze všech senzorů uživatele."""
        with self.app.app_context():
            if user_id not in self.user_sensors:
                current_app.logger.warning(f"No sensors loaded for user_id {user_id}")
                return {}
            
            active_sensors = [s for s in self.user_sensors[user_id] if s.is_active]
            if not active_sensors:
                return {}
            
            sensor_data = {}
            for sensor in active_sensors:
                value = self.read_sensor(sensor.sensor_id)
                sensor_data[sensor.sensor_id] = value
            return sensor_data

    def _queue_background(self):
        """Background worker pro zpracování fronty dat."""
        batch = []
        while not self._shutdown_event.is_set():
            with self.app.app_context():
                try:
                    try:
                        data = self.data_queue.get(timeout=2.0)
                        batch.append(data)
                        self.memory_cache.append(data)
                    except queue.Empty:
                        pass
                    
                    if len(batch) >= self.batch_size:
                        self._flush_batch(batch)
                        batch.clear()
                except Exception as e:
                    current_app.logger.error(f"Error in queue processor: {e}")
                    time.sleep(1)

    def _periodic_flush_background(self):
        """Background worker pro periodické ukládání dat."""
        while not self._shutdown_event.is_set():
            with self.app.app_context():
                try:
                    time.sleep(self.flush_interval)
                    if self.memory_cache:
                        self._flush_memory_cache()
                except Exception as e:
                    current_app.logger.error(f"Error in periodic flush: {e}")

    def _flush_batch(self, batch: List[Dict]):
        """Uloží batch dat do databáze."""
        with self.app.app_context():
            if not batch:
                return
            try:
                self._save_batch_to_db(batch)
                self.stats['db_writes'] += len(batch)
                self.stats['last_flush'] = datetime.utcnow()
                current_app.logger.debug(f"Flushed batch of {len(batch)} records to database")
            except Exception as e:
                current_app.logger.error(f"Error flushing batch to database: {e}")

    def _save_batch_to_db(self, batch: List[Dict]):
        """Synchronní uložení batch do databáze."""
        try:
            sensor_data_objects = []
            for data_point in batch:
                sensor_data = SensorData(
                    sensor_id=data_point['sensor_id'],
                    timestamp=data_point['timestamp'],
                    value=data_point['value']
                )
                sensor_data_objects.append(sensor_data)
            db.session.bulk_save_objects(sensor_data_objects)
            db.session.commit()
        except Exception as e:
            current_app.logger.error(f"Database save error: {e}")
            db.session.rollback()
            raise

    def _flush_memory_cache(self):
        """Uloží všechna data z memory cache."""
        with self.app.app_context():
            if not self.memory_cache:
                return
            batch = list(self.memory_cache)
            self.memory_cache.clear()
            self._flush_batch(batch)

    def _force_flush_batch(self):
        """Vynutí okamžité uložení části dat z fronty."""
        with self.app.app_context():
            batch = []
            for _ in range(min(self.batch_size, self.data_queue.qsize())):
                try:
                    data = self.data_queue.get_nowait()
                    batch.append(data)
                except queue.Empty:
                    break
            if batch:
                self._flush_batch(batch)

    def _stats_monitor_background(self):
        """Background worker pro monitoring statistik."""
        while not self._shutdown_event.is_set():
            with self.app.app_context():
                try:
                    time.sleep(60)  # Report každou minutu
                    current_app.logger.info(
                        f"Cache stats - Successful reads: {self.stats['successful_reads']}, "
                        f"Failed reads: {self.stats['failed_reads']}, "
                        f"DB writes: {self.stats['db_writes']}, "
                        f"Queue size: {self.data_queue.qsize()}, "
                        f"Cache size: {len(self.memory_cache)}"
                    )
                except Exception as e:
                    current_app.logger.error(f"Error in stats monitor: {e}")

    def get_cached_data(self, sensor_id: int, max_age_minutes: int = 5) -> Optional[Dict]:
        """Vrátí nejnovější cached data pro senzor, pokud nejsou starší než max_age_minutes."""
        with self.app.app_context():
            cutoff_time = datetime.utcnow() - timedelta(minutes=max_age_minutes)
            for data_point in reversed(self.memory_cache):
                if data_point['sensor_id'] == sensor_id and data_point['timestamp'] >= cutoff_time:
                    self.stats['cache_hits'] += 1
                    return data_point
            return None

    def shutdown(self):
        """Graceful shutdown cache systému."""
        with self.app.app_context():
            current_app.logger.info("Shutting down ModbusManager...")
            self._shutdown_event.set()
            
            # Zastavíme všechny čtecí vlákna
            for user_id in list(self.user_read_events):
                self._stop_user_reading(user_id)
            
            # Uložíme zbývající data
            self._flush_memory_cache()
            remaining_batch = []
            while not self.data_queue.empty():
                try:
                    data = self.data_queue.get_nowait()
                    remaining_batch.append(data)
                except queue.Empty:
                    break
            if remaining_batch:
                self._flush_batch(remaining_batch)
                current_app.logger.info(f"Saved {len(remaining_batch)} remaining records during shutdown")
            current_app.logger.info("ModbusManager shutdown completed")

    def _stop_user_reading(self, user_id: int):
        """Zastaví automatické čtení senzorů pro uživatele."""
        with self.app.app_context():
            if user_id in self.user_read_events:
                self.user_read_events[user_id].set()
                if user_id in self.user_read_threads:
                    self.user_read_threads[user_id].join(timeout=1.0)  # Počkáme max 1 sekundu
                    del self.user_read_threads[user_id]
                del self.user_read_events[user_id]
                current_app.logger.info(f"Stopped automatic sensor reading for user {user_id}")

    def release_sensors(self, user_id: int):
        """Uvolní senzory pro daného uživatele a zastaví automatické čtení."""
        with self.app.app_context():
            # Zastavíme čtení senzorů
            self._stop_user_reading(user_id)
            
            # Uvolníme senzory
            if user_id in self.user_sensors:
                del self.user_sensors[user_id]
                current_app.logger.info(f"Sensors for user {user_id} have been released")