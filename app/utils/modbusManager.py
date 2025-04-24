import minimalmodbus
import serial
import time
from datetime import datetime
from flask import current_app
from models.models import Sensor, SensorData, UserSensor,db


class ModbusManager:
    def __init__(self):
        self.instument = None
        self.devise_address = 1
        self.user_sensors = {}
        self.users = {}
        self.port = '/dev/ttyUSB0'
        self.init_mondus()

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


    def load_use_sensors(self,user_id):
        try:
            sensors = Sensor.query.filter(Sensor.users.any(user_id=user_id)).all()
            if not sensors:
                current_app.logger.warning(f"No sensors found for user: {user_id}")
            self.user_sensors[user_id] = sensors
            for sensor in sensors:
                self.last_read[sensor.sensor_id] = None
                # Initialize Modbus for the sensor's address if not already done
                if not self.instrument or self.instrument.address != sensor.address:
                    self.init_modbus(sensor.address)
            current_app.logger.info(f"Loaded {len(sensors)} sensors for user_id {user_id}")
            return True
        except Exception as e:
            current_app.logger.error(f"Error loading sensors for user_id {user_id}: {e}")
            return False
        
    def change_bitrate(self, bitrate):
        try:
            if not self.instrument:
                raise ValueError("Modbus instrument not initialized")
            self.instrument.serial.baudreate = bitrate
            time.sleep(0.2)
            current_app.logger.debug(f"Bitrate changed to {bitrate}")
            return True
        except Exception as e:
            current_app.logger.error(f"Erron changing bitrate {bitrate} : {e}")
            return False
        
    def read_sensor(self,sensor):
        try:
            if not self.instrument:
                self.init_mondus()

            self.change_bitrate(sensor.bit)
            value = self.instrument.read_register(sensor.address,sensor.scaling,sensor.functioncode)            
            return value
        except Exception as e:
            current_app.logger.error(f"Error read a sensor {sensor.sensor_id} : {e}")
            return None


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
