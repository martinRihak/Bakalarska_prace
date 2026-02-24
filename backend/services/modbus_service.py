from flask import current_app
from datetime import datetime

class ModbusService:
    @staticmethod
    def get_sensor_data(sensor_id):
        modbus_manager = current_app.config.get('MODBUS_MANAGER')
        if not modbus_manager:
            raise Exception("Modbus manager not initialized")
            
        # Získání informací o senzoru
        sensor_info = modbus_manager.read_sensor(sensor_id)
        
        if not sensor_info:
            return None

        # Čtení aktuální hodnoty
        value = modbus_manager.read_sensor(sensor_id)
        
        return {
            'sensor': sensor_info,
            'current_value': value,
            'timestamp': datetime.utcnow().isoformat()
        }
