import minimalmodbus
import serial
import time
from datetime import datetime
from flask import current_app
from models.models import Sensor, SensorData, UserSensor,db


class ModbusManager:
    def __init__(self):
        current_app.logger.info("Initializing ModbusManager...")
        self.instrument = None
        self.devise_address = 1
        self.user_sensors = {}  # Dictionary pro uložení senzorů podle user_id
        self.sensor_map = {}    # Dictionary pro rychlý přístup k senzorům podle sensor_id
        self.last_read = {}
        self.port = "/dev/ttyUSB0"
        current_app.logger.debug(f"ModbusManager initialized with port: {self.port}")
        self.init_mondus()

    def load_use_sensors(self, user_id):
        """Load all sensors for a specific user and create mappings."""
        try:
            # Načtení senzorů pro daného uživatele
            sensors = Sensor.query.filter(Sensor.users.any(user_id=user_id)).all()
            print(sensors)
            if not sensors:
                current_app.logger.warning(f"No sensors found for user: {user_id}")
                return False

            # Uložení senzorů pro uživatele
            self.user_sensors[user_id] = sensors
            
            # Vytvoření mapování sensor_id -> Sensor pro rychlý přístup
            for sensor in sensors:
                self.sensor_map[sensor.sensor_id] = sensor
                self.last_read[sensor.sensor_id] = None

            current_app.logger.info(f"Loaded {len(sensors)} sensors for user_id {user_id}")
            return True
        except Exception as e:
            current_app.logger.error(f"Error loading sensors for user_id {user_id}: {e}")
            return False

    def get_sensor_by_id(self, sensor_id):
        """Get sensor object by its ID."""
        return self.sensor_map.get(sensor_id)

    def read_sensor(self, sensor_id):
        """Read value from a specific sensor using its ID."""
        try:
            # Získání objektu senzoru
            sensor = self.get_sensor_by_id(sensor_id)
            if not sensor:
                raise ValueError(f"Sensor with ID {sensor_id} not found")

            if not self.instrument:
                self.init_mondus()

            self.change_bitrate(sensor.bit)
            
            # Čtení hodnoty
            value = self.instrument.read_register(
                sensor.address,  # Register address
                sensor.scaling,      # Number of decimals
                sensor.functioncode       # Standard Modbus read holding register
            )
            
            # Aktualizace času posledního čtení
            self.last_read[sensor_id] = datetime.utcnow()
            
            # Uložení do databáze
            self.save_to_db(sensor_id, value)
            
            return value
        except Exception as e:
            current_app.logger.error(f"Error reading sensor {sensor_id}: {e}")
            return None

    def get_sensor_info(self, sensor_id):
        """Get sensor information including last read value and timestamp."""
        sensor = self.get_sensor_by_id(sensor_id)
        if not sensor:
            return None
            
        return {
            'sensor_id': sensor.sensor_id,
            'name': sensor.name,
            'type': sensor.sensor_type,
            'unit': sensor.unit,
            'last_read_time': self.last_read.get(sensor_id),
            'address': sensor.address,
            'functioncode': sensor.functioncode,
            'scaling': sensor.scaling
        }

    def init_mondus(self):
        """Initialize Modbus instrument for a specific device address."""
        try:
            self.instrument = minimalmodbus.Instrument(self.port, self.devise_address)
            self.instrument.serial.bytesize = 8
            self.instrument.serial.parity = serial.PARITY_NONE
            self.instrument.serial.stopbits = 1
            self.instrument.serial.timeout = 1  # 1 second timeout
            current_app.logger.info(f"Modbus initialized for address on {self.port}")
            return True
        except Exception as e:
            current_app.logger.error(f"Failed to initialize Modbus : {e}")
            return False
    def change_bitrate(self, bitrate):
        """Change the bitrate for the current Modbus instrument."""
        try:
            if not self.instrument:
                raise ValueError("Modbus instrument not initialized")
            self.instrument.serial.baudrate = bitrate
            time.sleep(0.2)  # Allow time for bitrate change to stabilize
            
            current_app.logger.debug(f"Bitrate changed to {bitrate}")
            return True
        except Exception as e:
            current_app.logger.error(f"Error changing bitrate to {bitrate}: {e}")
            return False

    def save_to_db(self, sensor_id, value):
        """Save sensor data to SQLite database."""
        try:
            data = SensorData(sensor_id=sensor_id, timestamp=datetime.utcnow(), value=value)
            db.session.add(data)
            db.session.commit()
            current_app.logger.debug(f"Saved value {value} for sensor {sensor_id} to database")
            return True
        except Exception as e:
            current_app.logger.error(f"Error saving data for sensor {sensor_id}: {e}")
            db.session.rollback()
            return False

    def read_all_sensors(self, user_id):
        """Read data from all sensors associated with a user."""
        if user_id not in self.user_sensors:
            current_app.logger.warning(f"No sensors loaded for user_id {user_id}")
            return False
        success = True
        for sensor in self.user_sensors[user_id]:
            if not sensor.is_active:
                current_app.logger.debug(f"Skipping inactive sensor {sensor.sensor_id}")
                continue
            value = self.read_sensor(sensor)
            if value is not None:
                self.save_to_db(sensor.sensor_id, value)
                self.last_read[sensor.sensor_id] = datetime.utcnow()
            else:
                success = False
        return success

    def release_resources(self, user_id):
        """Release resources for a user's sensors upon logout."""
        if user_id in self.user_sensors:
            del self.user_sensors[user_id]
            current_app.logger.info(f"Released sensors for user_id {user_id}")
        # Clean up last_read entries
        self.last_read = {k: v for k, v in self.last_read.items() if any(k in [s.sensor_id for s in sensors] for sensors in self.user_sensors.values())}
        if not self.user_sensors and self.instrument:
            self.instrument.serial.close()
            self.instrument = None
            current_app.logger.info("Modbus connection closed")
