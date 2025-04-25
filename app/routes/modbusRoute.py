from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.security import check_password_hash, generate_password_hash
from models.models import User, db
from datetime import datetime,timedelta,timezone
from functools import wraps
import jwt, redis

modbus_api = Blueprint('modbus_api', __name__)

@modbus_api.route('/getValue/<int:sensor_id>', methods=['GET'])
def get_sensor_data(sensor_id):
    """Get sensor data and information."""
    try:
        modbus_manager = current_app.config['MODBUS_MANAGER']
        
        # Získání informací o senzoru
        sensor_info = modbus_manager.get_sensor_info(sensor_id)
        print(sensor_info)
        if not sensor_info:
            return jsonify({
                'status': 'error',
                'message': f'Sensor {sensor_id} not found'
            }), 404

        # Čtení aktuální hodnoty
        value = modbus_manager.read_sensor(sensor_id)
        
        return jsonify({
            'status': 'success',
            'sensor': sensor_info,
            'current_value': value,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting sensor data: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    

