from flask import Blueprint, send_file, request, redirect, url_for, flash, jsonify, session,current_app
from models.models import db, Sensor, SensorData, UserSensor,Widget
from routes.authRoute import login_required
from datetime import datetime, timedelta
import json
import csv
import io

sensors_api = Blueprint('sensors_api', __name__)

@sensors_api.route('/getSensorHistory/<int:sensor_id>', methods=['GET'])
@login_required
def get_sensor_history(sensor_id):
    try:
        time_range = request.args.get('timeRange')  # default to '24h' if not specified
        widget_id = request.args.get('widget_id')
        now = datetime.utcnow()
        if time_range == '24h':
            delta = timedelta(days=1)
        elif time_range == '7d':
            delta = timedelta(weeks=1)
        elif time_range == '30d':
            delta = timedelta(days=30)
        else:
            delta = timedelta(days=1)
        start_time = now - delta
        with db.session.begin():
            sensor = Sensor.query.get_or_404(sensor_id)
            Widget.query.filter_by(widget_id=widget_id).update({'time': time_range})
            
            sensor_data = SensorData.query.filter_by(sensor_id=sensor_id)\
                .filter(SensorData.timestamp >= start_time)\
                .order_by(SensorData.timestamp)\
                .all()
        
            data = [{
                'timestamp': data.timestamp.isoformat(),
                'value': data.value
            } for data in sensor_data]
        
            return jsonify({
                'sensor': {
                    'id': sensor.sensor_id,
                    'name': sensor.name,
                    'unit': sensor.unit,
                    'type': sensor.sensor_type
                },
                'data': data,
                'timeRange': time_range
            })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensors_api.route('/add', methods=['POST'])
@login_required
def add_sensor():
    try:
        name = request.form.get('name')
        sensor_type = request.form.get('sensor_type')
        description = request.form.get('description')
        address = request.form.get('address')
        register = request.form.get('register')
        unit = request.form.get('unit')
        min_value = request.form.get('min_value')
        max_value = request.form.get('max_value')
        sampling_rate = request.form.get('sampling_rate')
        is_virtual = True if request.form.get('is_virtual') else False
        parent_sensor_id = request.form.get('parent_sensor_id')
        
        if address:
            address = int(address)
        else:
            address = None
            
        if register:
            register = int(register)
        else:
            register = None
            
        if min_value:
            min_value = float(min_value)
        else:
            min_value = None
            
        if max_value:
            max_value = float(max_value)
        else:
            max_value = None
            
        if sampling_rate:
            sampling_rate = int(sampling_rate)
        else:
            sampling_rate = None
            
        if parent_sensor_id:
            parent_sensor_id = int(parent_sensor_id)
        else:
            parent_sensor_id = None
        
        new_sensor = Sensor(
            name=name,
            sensor_type=sensor_type,
            description=description,
            address=address,
            register=register,
            unit=unit,
            min_value=min_value,
            max_value=max_value,
            sampling_rate=sampling_rate,
            is_virtual=is_virtual,
            parent_sensor_id=parent_sensor_id
        )
        
        db.session.add(new_sensor)
        db.session.commit()
        
        flash('Senzor byl úspěšně přidán!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Chyba při přidávání senzoru: {str(e)}', 'danger')
    
    return redirect(url_for('sensors.list_sensors'))

@sensors_api.route('/delete/<int:sensor_id>', methods=['POST'])
@login_required
def delete_sensor(sensor_id):
    try:
        sensor = Sensor.query.get_or_404(sensor_id)
        db.session.delete(sensor)
        db.session.commit()
        flash('Senzor byl úspěšně smazán!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Chyba při mazání senzoru: {str(e)}', 'danger')
    
    return redirect(url_for('sensors.list_sensors'))

@sensors_api.route('/getSensors', methods=['GET'])
@login_required
def get_sensors():
    try:
        user_id = session.get('user_id')
        user_sensors = Sensor.query.join(UserSensor).filter(UserSensor.user_id == user_id).all()

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
        modbus = current_app.config['MODBUS_MANAGER']
        latest_data = modbus.read_sensor(sensor_id=sensor_id)
        print(latest_data)
        if latest_data is None:
            current_app.logger.info(f"Load from database for sensore {sensor_id}")
            latest_data = SensorData.query.filter_by(sensor_id=sensor_id).order_by(SensorData.timestamp.desc()).first()
        
        if not latest_data:
            return jsonify({'error': 'No data available for this sensor'}), 404
        
        sensor = Sensor.query.get_or_404(sensor_id)
        
        return jsonify({
            'sensor': {
            'id': sensor.sensor_id,
            'name': sensor.name,
            'unit': sensor.unit,
            'min_value': sensor.min_value,
            'max_value': sensor.max_value, 
            },
            'data': {
            'timestamp': latest_data.timestamp,
            'value': latest_data.value
            }
        })
        
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

        if start_date > end_date:
            return jsonify({'message': 'Datum začátku musí být před datem konce'}), 400

        if not sensor_ids:
            return jsonify({'message': 'Vyberte alespoň jeden senzor'}), 400

        # Načtení dat senzorů
        sensor_data = []
        for sensor_id in sensor_ids:
            sensor = Sensor.query.get(sensor_id)
            if not sensor:
                continue

            data = SensorData.query.filter(
                SensorData.sensor_id == sensor_id,
                SensorData.timestamp >= start_date,
                SensorData.timestamp <= end_date
            ).order_by(SensorData.timestamp).all()

            for record in data:
                sensor_data.append({
                    'sensor_name': sensor.name,
                    'sensor_type': sensor.sensor_type,
                    'unit': sensor.unit,
                    'timestamp': record.timestamp.isoformat(),
                    'value': record.value
                })

        if not sensor_data:
            return jsonify({'message': 'Žádná data nebyla nalezena pro zadané období'}), 404

        # Export do požadovaného formátu
        if export_format == 'csv':
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=['sensor_name', 'sensor_type', 'unit', 'timestamp', 'value'])
            writer.writeheader()
            writer.writerows(sensor_data)
            return output.getvalue()
        else:
            return jsonify(sensor_data)

    except ValueError as e:
        return jsonify({'message': 'Neplatný formát data'}), 400
    except Exception as e:
        current_app.logger.error(f'Chyba při exportu dat: {str(e)}')
        return jsonify({'message': ''}), 500

@sensors_api.route('/available', methods=['GET'])
@login_required
def get_available_sensors():
    user_id = session.get('user_id')
    user_sensors = [us.sensor_id for us in UserSensor.query.filter_by(user_id=user_id).all()]
    available_sensors = Sensor.query.filter(Sensor.sensor_id.in_(user_sensors)).all()
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
    sensor_id = data.get('sensorId')
    user_id = session.get('user_id')
    if UserSensor.query.filter_by(user_id=user_id, sensor_id=sensor_id).first():
        return jsonify({'error': 'Sensor already associated with user'}), 400
    new_user_sensor = UserSensor(user_id=user_id, sensor_id=sensor_id)
    db.session.add(new_user_sensor)
    db.session.commit()
    return jsonify({'message': 'Sensor added to user'}), 201

@sensors_api.route('/create', methods=['POST'])
@login_required
def create_sensor():
    data = request.get_json()
    new_sensor = Sensor(
        name=data['name'],
        sensor_type=data['sensor_type'],
        unit=data['unit'],
        address=data['address'],  
        functioncode= data['functioncode'],
        bit=data['bit'],
        min_value=data.get('min_value'),
        max_value=data.get('max_value'),
        scaling=data.get('scaling'),
        sampling_rate=data['sampling_rate']
    )
    db.session.add(new_sensor)
    db.session.commit()
    return jsonify({'message': 'Sensor created', 'sensor_id': new_sensor.sensor_id}), 201

@sensors_api.route('/<int:sensor_id>', methods=['PATCH'])
@login_required
def update_sensor(sensor_id):
    sensor = Sensor.query.get_or_404(sensor_id)
    data = request.get_json()
    for key, value in data.items():
        if hasattr(sensor, key):
            setattr(sensor, key, value)
    db.session.commit()
    return jsonify({'message': 'Sensor updated'}), 200

@sensors_api.route('/<int:sensor_id>/toggle-active', methods=['PATCH'])
@login_required
def toggle_sensor_active(sensor_id):
    sensor = Sensor.query.get_or_404(sensor_id)
    data = request.get_json()
    is_active = data.get('isActive')
    sensor.is_active = is_active
    db.session.commit()
    return jsonify({'message': 'Sensor active status updated'}), 200