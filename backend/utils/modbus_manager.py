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
        self.port = os.environ.get("USB_PORT") or os.environ.get("MODBUS_PORT", "/dev/ttyUSB0")
        self.device_address = 1
        self.baudrate = baudrate
        self.app = app

        self.instrument = None
        self.modbus_connected = False
        self.last_error = None
        self.last_error_at = None

        # Cache
        self.memory_cache = deque(maxlen=cache_size)
        self.cache_lock = threading.Lock()

        # Sensor metadata (NO ORM objects here)
        self.sensor_map = {}
        self.sensor_locks = {}
        self.last_read = {}
        self.sensor_map_lock = threading.Lock()

        # Thread safety
        self.connection_lock = threading.Lock()
        self.reconnect_lock = threading.Lock()
        self.serial_lock = threading.Lock()
        self.stats_lock = threading.Lock()
        self.thread_start_lock = threading.Lock()
        self.threads_started = False

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

    def _format_connection_error(self, error):
        return f"Nelze komunikovat se sběrnicí Modbus na portu {self.port}: {error}"

    def _close_serial_port(self):
        try:
            if self.instrument and getattr(self.instrument.serial, "is_open", False):
                self.instrument.serial.close()
        except Exception as e:
            self._log_error(f"Chyba při zavírání Modbus portu: {e}")

    def _set_connected(self, instrument):
        with self.connection_lock:
            self.instrument = instrument
            self.modbus_connected = True
            self.last_error = None
            self.last_error_at = None

    def _mark_disconnected(self, message):
        with self.connection_lock:
            self.modbus_connected = False
            self.last_error = message
            self.last_error_at = datetime.now()
        self._close_serial_port()

    def _is_connection_error(self, error):
        connection_error_types = (
            serial.SerialException,
            OSError,
            IOError,
            minimalmodbus.NoResponseError,
        )
        if isinstance(error, connection_error_types):
            return True

        message = str(error).lower()
        return any(
            text in message
            for text in (
                "could not open port",
                "no such file or directory",
                "no such device",
                "input/output error",
                "port is not open",
                "device reports readiness",
            )
        )

    def _sync_port_presence(self):
        with self.connection_lock:
            connected = self.modbus_connected

        if connected and self.port and not os.path.exists(self.port):
            self._mark_disconnected(
                f"Nelze komunikovat se sběrnicí Modbus na portu {self.port}: port není dostupný"
            )

    # Modbus init
    # =========================

    def _init_modbus(self):
        instrument = None
        try:
            instrument = minimalmodbus.Instrument(
                self.port, self.device_address
            )

            ser = instrument.serial
            ser.baudrate = self.baudrate
            ser.bytesize = 8
            ser.parity = serial.PARITY_NONE
            ser.stopbits = 1
            ser.timeout = 1

            if not getattr(ser, "is_open", False):
                ser.open()

            self._set_connected(instrument)
            self._log_info("Modbus inicializován")
            return True

        except Exception as e:
            try:
                if instrument and getattr(instrument.serial, "is_open", False):
                    instrument.serial.close()
            except Exception:
                pass
            self._mark_disconnected(self._format_connection_error(e))
            self._log_error(f"Selhala inicializace Modbus: {e}")
            return False

    def get_status(self):
        with self.connection_lock:
            connected = self.modbus_connected
            last_error = self.last_error
            last_error_at = self.last_error_at

        return {
            "connected": connected,
            "port": self.port,
            "message": None if connected else last_error or f"Modbus na portu {self.port} není připojen",
            "last_error": last_error,
            "last_error_at": last_error_at.isoformat() if last_error_at else None,
        }

    def reconnect(self):
        with self.reconnect_lock:
            self._log_info(f"Zkouším znovu inicializovat Modbus na portu {self.port}")
            self._close_serial_port()
            success = self._init_modbus()

            if success:
                self.load_all_sensors()
                self._start_background_threads()

            return self.get_status()

    # Sensor loading
    # =========================
    def _build_sensor_config(self, sensor: Sensor):
        return {
            "address": sensor.address,
            "functioncode": sensor.functioncode,
            "baudrate": sensor.bit,
            "scaling": sensor.scaling,
            "sampling_rate": sensor.sampling_rate * 60,
            "is_active": sensor.is_active,
        }

    def add_new_sensor(self, sensor: Sensor):
        if not sensor:
            return False

        with self.sensor_map_lock:
            self.sensor_map[sensor.sensor_id] = self._build_sensor_config(sensor)
            self.sensor_locks.setdefault(sensor.sensor_id, threading.Lock())
            self.last_read.setdefault(sensor.sensor_id, 0.0)

        self._log_info(f"Senzor {sensor.sensor_id} načten do Modbus mapy")
        return True

    def delete_sensor(self, sensor_id: int):
        with self.sensor_map_lock:
            self.sensor_map.pop(sensor_id, None)
            self.sensor_locks.pop(sensor_id, None)
            self.last_read.pop(sensor_id, None)
        with self.cache_lock:
            self.memory_cache = deque(
                (dp for dp in self.memory_cache if dp["sensor_id"] != sensor_id),
                maxlen=self.memory_cache.maxlen
            )

        self._log_info(f"Senzor {sensor_id} odebrán z Modbus mapy")
        return True
         
    def load_all_sensors(self):
        if not self.app:
            return False

        with self.app.app_context():
            sensors = Sensor.query.all()
            if not sensors:
                self._log_error("Nenalezeny žádné senzory v DB")
                return False

            new_sensor_map = {}
            new_sensor_locks = {}
            new_last_read = {}
            for s in sensors:
                # Mapujeme atributy z models.py do slovníku v paměti
                new_sensor_map[s.sensor_id] = self._build_sensor_config(s)
                new_sensor_locks[s.sensor_id] = self.sensor_locks.get(s.sensor_id, threading.Lock())
                new_last_read[s.sensor_id] = self.last_read.get(s.sensor_id, 0.0)
            
            with self.sensor_map_lock:
                self.sensor_map = new_sensor_map
                self.sensor_locks = new_sensor_locks
                self.last_read = new_last_read

        self._log_info("Senzory úspěšně načteny z DB ")
        return True

    # Reading
    # =========================

    def read_sensor(self, sensor_id: int):
        if not self.modbus_connected:
            return None
        with self.sensor_map_lock:
            sensor = self.sensor_map.get(sensor_id)
            sensor_lock = self.sensor_locks.get(sensor_id)
        if not sensor or not sensor["is_active"]:
            return None

        if not sensor_lock:
            return None

        with sensor_lock:
            try:
                with self.serial_lock:
                    if not self.instrument:
                        raise serial.SerialException("Modbus instrument is not initialized")
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

                read_at = datetime.now()
                self.last_read[sensor_id] = time.time()
                self._add_to_cache(sensor_id, value, read_at)
                return value

            except Exception as e:
                with self.stats_lock:
                    self.stats["failed_reads"] += 1
                if self._is_connection_error(e):
                    self._mark_disconnected(self._format_connection_error(e))
                self._log_error(f"Chyba čtení senzoru {sensor_id}: {e}")
                return None
    # Cache
    # =========================

    def _add_to_cache(self, sensor_id, value, timestamp=None):
        timestamp = timestamp or datetime.now()
        with self.cache_lock:
            self.memory_cache.append({
                "sensor_id": sensor_id,
                "value": value,
                "timestamp": timestamp
            })
            self.stats["total_cached"] += 1

    def get_latest_data_point(self, sensor_id):
        with self.sensor_map_lock:
            sensor = self.sensor_map.get(sensor_id)
        if not sensor:
            return None
        cutoff = datetime.now() - timedelta(seconds=sensor["sampling_rate"])
        with self.cache_lock:
            for dp in reversed(self.memory_cache):
                if dp["sensor_id"] == sensor_id and dp["timestamp"] >= cutoff:
                    with self.stats_lock:
                        self.stats["cache_hits"] += 1
                    return {
                        "value": dp["value"],
                        "timestamp": dp["timestamp"],
                    }

        value = self.read_sensor(sensor_id)
        if value is None:
            return None

        read_at = datetime.now()
        with self.cache_lock:
            for dp in reversed(self.memory_cache):
                if dp["sensor_id"] == sensor_id:
                    read_at = dp["timestamp"]
                    break

        return {
            "value": value,
            "timestamp": read_at,
        }

    def get_latest_data(self, sensor_id):
        data_point = self.get_latest_data_point(sensor_id)
        if not data_point:
            return None
        return data_point["value"]

    # Background reading
    # =========================

    def _start_background_threads(self):
        with self.thread_start_lock:
            if self.threads_started:
                return
            self.threads_started = True

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

            with self.sensor_map_lock:
                sensors = list(self.sensor_map.items())

            for sensor_id, sensor in sensors:
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
