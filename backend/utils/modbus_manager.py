import threading
import time
import os
from collections import deque
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor

import minimalmodbus
import serial

from flask import current_app
from models.models import Sensor, SensorData, db


class ModbusManager:
    def __init__(
        self,
        app=None,
        baudrate: int = 9600,
        cache_size: int = 200,
        flush_interval: int = 60 * 30,       # seconds
        check_interval: int = 60 * 10    # seconds
    ):
        self.port = os.environ.get("USB_PORT")
        self.device_address = 1
        self.baudrate = baudrate
        self.app = app

        self.instrument = None
        self.modbus_connected = False

        # Cache
        self.memory_cache = deque(maxlen=cache_size)
        self.cache_lock = threading.Lock()

        # Sensor metadata (NO ORM objects here)
        self.sensor_map = {}
        self.sensor_locks = {}
        self.last_read = {}

        # Thread safety
        self.serial_lock = threading.Lock()
        self.stats_lock = threading.Lock()

        # Stats
        self.stats = {
            "successful_reads": 0,
            "failed_reads": 0,
            "cache_hits": 0,
            "total_cached": 0,
            "total_saved_to_db": 0,
        }

        # Thread control
        self._shutdown_event = threading.Event()
        self._flush_event = threading.Event()

        self.executor = ThreadPoolExecutor(max_workers=4)
        self.flush_interval = flush_interval
        self.check_interval = check_interval

        self._log_info(f"Inicializuji ModbusManager na portu {self.port}")

        self._init_modbus()
        self.load_all_sensors()
        # zabrání dvojitému spuštění při Flask debug reload
        if self.modbus_connected and (
            not os.environ.get("WERKZEUG_RUN_MAIN")
            or os.environ.get("WERKZEUG_RUN_MAIN") == "true"
        ):
            self._start_background_threads()

    # Logging helpers
    # =========================

    def _log_info(self, msg):
        if self.app:
            with self.app.app_context():
                current_app.logger.info(msg)
        else:
            print(msg)

    def _log_error(self, msg):
        if self.app:
            with self.app.app_context():
                current_app.logger.error(msg)
        else:
            print(msg)

    # Modbus init
    # =========================

    def _init_modbus(self):
        try:
            self.instrument = minimalmodbus.Instrument(
                self.port, self.device_address
            )

            ser = self.instrument.serial
            ser.baudrate = self.baudrate
            ser.bytesize = 8
            ser.parity = serial.PARITY_NONE
            ser.stopbits = 1
            ser.timeout = 1

            if not getattr(ser, "is_open", False):
                ser.open()

            self.modbus_connected = True
            self._log_info("Modbus inicializován")

        except Exception as e:
            self.modbus_connected = False
            self._log_error(f"Selhala inicializace Modbus: {e}")

    # Sensor loading
    # =========================
    def add_new_sensor(self,sensor: Sensor):
        if not self.app:
            return False
    def delete_sensor(self,sensor_id: int):
        if not self.app:
            return False
         
    def load_all_sensors(self):
        if not self.app:
            return False

        with self.app.app_context():
            sensors = Sensor.query.all()
            if not sensors:
                self._log_error("Nenalezeny žádné senzory v DB")
                return False

            new_sensor_map = {}
            for s in sensors:
                # Mapujeme atributy z models.py do slovníku v paměti
                new_sensor_map[s.sensor_id] = {
                    "address": s.address,          # Opraveno z register_address
                    "functioncode": s.functioncode,
                    "baudrate": s.bit,             # Sloupec 'bit' používáme jako baudrate
                    "scaling": s.scaling,
                    "sampling_rate": s.sampling_rate * 60,
                    "is_active": s.is_active,
                }
                self.sensor_locks[s.sensor_id] = threading.Lock()
                self.last_read[s.sensor_id] = 0.0
            
            self.sensor_map = new_sensor_map

        self._log_info("Senzory úspěšně načteny z DB ")
        return True

    # Reading
    # =========================

    def read_sensor(self, sensor_id: int):
        if not self.modbus_connected:
            return None
        sensor = self.sensor_map.get(sensor_id)
        if not sensor or not sensor["is_active"]:
            return None

        with self.sensor_locks[sensor_id]:
            try:
                with self.serial_lock:
                    # 1. Dynamické nastavení baudrate před čtením
                    target_baudrate = sensor["baudrate"]
                    if self.instrument.serial.baudrate != target_baudrate:
                        self.instrument.serial.baudrate = target_baudrate
                        time.sleep(0.05) # Krátká pauza na stabilizaci portu

                    # 2. Čtení s využitím FC a scalingu z DB
                    value = self.instrument.read_register(
                        registeraddress=sensor["address"],
                        number_of_decimals=sensor["scaling"],
                        functioncode=sensor["functioncode"]
                    )

                with self.stats_lock:
                    self.stats["successful_reads"] += 1

                self.last_read[sensor_id] = time.time()
                self._add_to_cache(sensor_id, value)
                return value

            except Exception as e:
                with self.stats_lock:
                    self.stats["failed_reads"] += 1
                self._log_error(f"Chyba čtení senzoru {sensor_id}: {e}")
                return None
    # Cache
    # =========================

    def _add_to_cache(self, sensor_id, value):
        with self.cache_lock:
            self.memory_cache.append({
                "sensor_id": sensor_id,
                "value": value,
                "timestamp": datetime.now()
            })
            self.stats["total_cached"] += 1

    def get_latest_data(self, sensor_id):
        sensor = self.sensor_map.get(sensor_id)
        if not sensor:
            return None
        cutoff = datetime.now() - timedelta(seconds=sensor["sampling_rate"])
        with self.cache_lock:
            for dp in reversed(self.memory_cache):
                if dp["sensor_id"] == sensor_id and dp["timestamp"] >= cutoff:
                    with self.stats_lock:
                        self.stats["cache_hits"] += 1
                    return dp["value"]

        return self.read_sensor(sensor_id)

    # Background reading
    # =========================

    def _start_background_threads(self):
        threading.Thread(
            target=self._auto_read_loop,
            daemon=True
        ).start()

        threading.Thread(
            target=self._flush_loop,
            daemon=True
        ).start()

    def _auto_read_loop(self):
        while not self._shutdown_event.is_set():
            now = time.time()

            for sensor_id, sensor in self.sensor_map.items():
                if not sensor["is_active"]:
                    continue

                last_time = self.last_read.get(sensor_id, 0.0)
                
                if now - last_time >= sensor["sampling_rate"]:
                    self.executor.submit(self.read_sensor, sensor_id)

            time.sleep(self.check_interval)

    # DB FLUSH (SYNC)
    # =========================

    def _flush_loop(self):
        while not self._shutdown_event.is_set():
            time.sleep(self.flush_interval)
            self._flush_memory_cache()

    def _flush_memory_cache(self):
        with self.cache_lock:
            if not self.memory_cache:
                return

            batch = list(self.memory_cache)
            self.memory_cache.clear()

        try:
            with self.app.app_context():
                objs = [SensorData(**data) for data in batch]
                db.session.add_all(objs)
                db.session.commit()

            with self.stats_lock:
                self.stats["total_saved_to_db"] += len(batch)

            self._log_info(f"Uloženo {len(batch)} záznamů do DB")

        except Exception as e:
            self._log_error(f"Chyba při ukládání do DB: {e}")
            db.session.rollback()

    # Shutdown
    # =========================

    def shutdown(self):
        self._shutdown_event.set()
        self.executor.shutdown(wait=True)
        self._flush_memory_cache()

        try:
            if self.instrument and getattr(self.instrument.serial, "is_open", False):
                self.instrument.serial.close()
                self.modbus_connected = False
                self._log_info("Serial port uzavřen")
        except Exception as e:
            self._log_error(f"Chyba při zavírání portu: {e}")