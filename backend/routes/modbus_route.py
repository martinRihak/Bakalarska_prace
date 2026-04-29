from flask import Blueprint, jsonify, current_app
from utils.auth_utils import login_required
from services.modbus_service import ModbusService

modbus_api = Blueprint('modbus_api', __name__)

@modbus_api.route('/status', methods=['GET'])
@login_required
def get_modbus_status():
    """Get current Modbus connection status."""
    status = ModbusService.get_status()
    return jsonify({
        'status': 'success' if status['connected'] else 'error',
        **status
    }), 200

@modbus_api.route('/reconnect', methods=['POST'])
@login_required
def reconnect_modbus():
    """Try to reinitialize the Modbus serial connection."""
    try:
        status = ModbusService.reconnect()
        return jsonify({
            'status': 'success' if status['connected'] else 'error',
            **status
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error reconnecting Modbus: {str(e)}")
        return jsonify({
            'status': 'error',
            'connected': False,
            'message': str(e)
        }), 200

@modbus_api.route('/getValue/<int:sensor_id>', methods=['GET'])
@login_required
def get_sensor_data(sensor_id):
    """Get sensor data and information."""
    try:
        data = ModbusService.get_sensor_data(sensor_id)
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': f'Sensor {sensor_id} not found'
            }), 404
            
        return jsonify({
            'status': 'success',
            'current_value': data['current_value'],
            'timestamp': data['timestamp']
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting sensor data: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
