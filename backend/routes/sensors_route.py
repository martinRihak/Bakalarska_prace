from flask import Blueprint, request, jsonify, session, current_app, make_response
from utils.auth_utils import login_required
from services.sensor_service import SensorService
from datetime import datetime

sensors_api = Blueprint('sensors_api', __name__)

@sensors_api.route('/getSensorHistory/<int:sensor_id>', methods=['GET'])
@login_required
def get_sensor_history(sensor_id):
    try:
        time_range = request.args.get('timeRange')
        widget_id = request.args.get('widget_id')
        user_id = session.get('user_id')

        result = SensorService.get_sensor_history(sensor_id, time_range, user_id, widget_id)
        if not result:
            return jsonify({'error': 'Sensor not found'}), 404
            
        return jsonify(result)
        
    except PermissionError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensors_api.route('/getSensorHistoryHourly/<int:sensor_id>', methods=['GET'])
@login_required
def get_sensor_history_hourly(sensor_id):
    try:
        start_date_raw = request.args.get('startDate')
        end_date_raw = request.args.get('endDate')
        user_id = session.get('user_id')

        start_date = datetime.fromisoformat(start_date_raw) if start_date_raw else None
        end_date = datetime.fromisoformat(end_date_raw) if end_date_raw else None

        result = SensorService.get_sensor_history_hourly(sensor_id, start_date, end_date, user_id)
        if not result:
            return jsonify({'error': 'Sensor not found'}), 404

        return jsonify(result)

    except PermissionError:
        return jsonify({'error': 'Access denied'}), 403
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensors_api.route('/add', methods=['POST'])
@login_required
def add_sensor():
    try:
        SensorService.create_sensor_from_form(request.form)
        return jsonify({'message': 'Senzor byl úspěšně přidán!'}), 201
    except Exception as e:
        return jsonify({'error': f'Chyba při přidávání senzoru: {str(e)}'}), 400

@sensors_api.route('/delete/<int:sensor_id>', methods=['DELETE'])
@login_required
def delete_sensor(sensor_id):
    try:
        SensorService.delete_sensor(sensor_id, session.get('user_id'))
        return jsonify({'message': 'Senzor byl úspěšně smazán!'}), 200
    except PermissionError:
        return jsonify({'error': 'Přístup odepřen'}), 403
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': f'Chyba při mazání senzoru: {str(e)}'}), 400

@sensors_api.route('/remove-from-user/<int:sensor_id>', methods=['DELETE'])
@login_required
def remove_sensor_from_user(sensor_id):
    try:
        SensorService.delete_user_sensor(session.get('user_id'), sensor_id)
        return jsonify({'message': 'Senzor byl odebrán z účtu'}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensors_api.route('/all', methods=['GET'])
@login_required
def get_all_sensors():
    try:
        sensors = SensorService.get_all_sensors(session.get('user_id'))
        return jsonify([{
            'sensor_id': s.sensor_id,
            'name': s.name,
            'sensor_type': s.sensor_type,
            'address': s.address,
            'functioncode': s.functioncode,
            'bit': s.bit,
            'scaling': s.scaling,
            'min_value': s.min_value,
            'max_value': s.max_value,
            'sampling_rate': s.sampling_rate,
            'unit': s.unit,
            'is_active': s.is_active,
        } for s in sensors]), 200
    except PermissionError:
        return jsonify({'error': 'Přístup odepřen'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensors_api.route('/getSensors', methods=['GET'])
@login_required
def get_sensors():
    try:
        user_id = session.get('user_id')
        user_sensors = SensorService.get_sensors_for_user(user_id)

        sensor_data = [{
            'sensor_id': sensor.sensor_id,
            'name': sensor.name,
            'sensor_type': sensor.sensor_type,
            'address': sensor.address,
            'functioncode': sensor.functioncode,
            'bit' : sensor.bit,
            'scaling': sensor.scaling,
            'min_value': sensor.min_value,
            'max_value':sensor.max_value,
            'sampling_rate': sensor.sampling_rate,
            'unit': sensor.unit,
            'is_active': sensor.is_active,
        } for sensor in user_sensors]
            
        return jsonify(sensor_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@sensors_api.route('/getLatestSensorData/<int:sensor_id>', methods=['GET'])
@login_required
def get_latest_sensor_data(sensor_id):
    try:
        result = SensorService.get_latest_data(sensor_id, session.get('user_id'))
        print(result)
        if not result:
            return jsonify({'error': 'No data available for this sensor'}), 404
        return jsonify(result)
    except PermissionError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500
    

@sensors_api.route('/import_data', methods=['PATCH'])
@login_required
def import_sensor_data():
    try:
        data = request.get_json()
        sensor_id = data['sensorId']
        records = data['records']
        user_id = session.get('user_id')

        if not records:
            return jsonify({'message': 'Žádná data k importu'}), 400

        inserted = SensorService.import_data(sensor_id, records, user_id)
        return jsonify({'message': f'Úspěšně importováno {inserted} záznamů'}), 200

    except PermissionError:
        return jsonify({'error': 'Přístup odepřen'}), 403
    except (KeyError, ValueError) as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@sensors_api.route('/export_data', methods=['POST'])
@login_required
def export_sensor_data():
    try:
        data = request.get_json()
        start_date = datetime.fromisoformat(data['startDate'])
        end_date = datetime.fromisoformat(data['endDate'])
        sensor_ids = data['sensorIds']
        export_format = data.get('format', 'json')

        if not sensor_ids:
             return jsonify({'message': 'Vyberte alespoň jeden senzor'}), 400
             
        result = SensorService.export_data(start_date, end_date, sensor_ids, export_format, session.get('user_id'))

        if result is None:
            return jsonify({'message': 'Žádná data nebyla nalezena pro zadané období'}), 404

        if export_format == 'csv':
            response = make_response(result)
            response.headers["Content-Disposition"] = "attachment; filename=export.csv"
            response.headers["Content-Type"] = "text/csv"
            return response
        else:
            return jsonify(result)

    except PermissionError:
        return jsonify({'message': 'Access denied'}), 403
    except ValueError as e:
        return jsonify({'message': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f'Chyba při exportu dat: {str(e)}')
        return jsonify({'message': 'Internal Server Error'}), 500

@sensors_api.route('/available', methods=['GET'])
@login_required
def get_available_sensors():
    user_id = session.get('user_id')
    available_sensors = SensorService.get_available_sensors(user_id)
    print(available_sensors)
    return jsonify([{
        'sensor_id': s.sensor_id,
        'name': s.name,
        'sensor_type': s.sensor_type,
        'unit': s.unit
    } for s in available_sensors])
    

@sensors_api.route('/add-to-user', methods=['POST'])
@login_required
def add_sensor_to_user():
    data = request.get_json()
    try:
        SensorService.add_sensor_to_user(session.get('user_id'), data.get('sensorId'))
        return jsonify({'message': 'Sensor added to user'}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

@sensors_api.route('/create', methods=['POST'])
@login_required
def create_sensor():
    data = request.get_json()
    new_sensor = SensorService.create_sensor_json(data)
    return jsonify({'message': 'Sensor created', 'sensor_id': new_sensor.sensor_id}), 201

@sensors_api.route('/<int:sensor_id>', methods=['PATCH'])
@login_required
def update_sensor(sensor_id):
    data = request.get_json()
    try:
        success = SensorService.update_sensor(sensor_id, data, session.get('user_id'))
    except PermissionError:
        return jsonify({'error': 'Access denied'}), 403
    if not success:
         return jsonify({'error': 'Sensor not found'}), 404
    return jsonify({'message': 'Sensor updated'}), 200

@sensors_api.route('/<int:sensor_id>/toggle-active', methods=['PATCH'])
@login_required
def toggle_sensor_active(sensor_id):
    data = request.get_json()
    try:
        success = SensorService.toggle_sensor_active(sensor_id, data.get('isActive'), session.get('user_id'))
    except PermissionError:
        return jsonify({'error': 'Access denied'}), 403
    if not success:
         return jsonify({'error': 'Sensor not found'}), 404
    return jsonify({'message': 'Sensor active status updated'}), 200
