from flask import Blueprint, send_file, request, redirect, url_for, flash, jsonify,session
from models.models import db, Sensor, SensorData, UserSensor
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
        time_range = request.args.get('timeRange', '24h')  # default to '24h' if not specified

        sensor = Sensor.query.get_or_404(sensor_id)
        # Calculate time range based on parameter
        print(sensor)
        now = datetime.utcnow()
        print(f"Current UTC time: {now}")
        if time_range == '24h':
            delta = timedelta(days=1)
        elif time_range == '7d':
            delta = timedelta(weeks=1)
        elif time_range == '30d':  # Changed from 'month' to '30d' to match Widget.jsx
            delta = timedelta(days=30)
        else:
            delta = timedelta(days=1)  # default to 1 day
        print(delta)
        start_time = now - delta
        print(f"Start time for sensor {sensor_id}: {start_time}")
        # Query data within the time range
        sensor_data = SensorData.query.filter_by(sensor_id=sensor_id)\
            .filter(SensorData.timestamp >= start_time)\
            .order_by(SensorData.timestamp)\
            .all()
    
        # Format data for frontend
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
    """Přidání nového senzoru."""
    try:
        # Získání dat z formuláře
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
        
        # Převod typů
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
        
        # Vytvoření nového senzoru
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
        
        # Uložení do databáze
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
    """Smazání senzoru."""
    try:
        sensor = Sensor.query.get_or_404(sensor_id)
        db.session.delete(sensor)
        db.session.commit()
        flash('Senzor byl úspěšně smazán!', 'success')
    except Exception as e:
        db.session.rollback()
        flash(f'Chyba při mazání senzoru: {str(e)}', 'danger')
    
    return redirect(url_for('sensors.list_sensors'))


@sensors_api.route('/getSensors',methods=['GET'])
@login_required
def get_sensors():
    try:
        user_id = session.get('user_id')
        # Query sensors through UserSensor relationship
        user_sensors = Sensor.query.join(UserSensor).filter(UserSensor.user_id == user_id).all()

        sensore_data = [{
            'sensor_id': sensor.sensor_id,
            'name': sensor.name,
            'sensor_type': sensor.sensor_type,
            'address': sensor.address,
            'functioncode': sensor.functioncode,
            'unit': sensor.unit
        } for sensor in user_sensors]
            
        return jsonify(sensore_data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@sensors_api.route('/getLatestSensorData/<int:sensor_id>', methods=['GET'])
@login_required
def get_latest_sensor_data(sensor_id):
    try:
        # Get the latest data point for this sensor
        latest_data = SensorData.query.filter_by(sensor_id=sensor_id)\
            .order_by(SensorData.timestamp.desc())\
            .first()
        if not latest_data:
            return jsonify({'error': 'No data available for this sensor'}), 404
            
        # Get sensor info
        sensor = Sensor.query.get_or_404(sensor_id)

        return jsonify({
            'sensor': {
                'id': sensor.sensor_id,
                'name': sensor.name,
                'unit': sensor.unit,
                'min_value' : sensor.min_value,
                'max_value' : sensor.max_value, 
  
            },
            'data': {
                'timestamp': latest_data.timestamp.isoformat(),
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
        start_date = datetime.fromisoformat(data['startDate'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['endDate'].replace('Z', '+00:00'))
        sensor_ids = data['sensorIds']
        format = data['format']
        file_name = data['fileName']
        
        user_id = session.get('user_id')
        allowed_sensors = Sensor.query.join(UserSensor)\
            .filter(UserSensor.user_id == user_id)\
            .filter(Sensor.sensor_id.in_(sensor_ids))\
            .all()
        
        if len(allowed_sensors) != len(sensor_ids):
            return jsonify({'error': 'Unauthorized access to some sensors'}), 403

        sensor_data = SensorData.query\
            .filter(SensorData.sensor_id.in_(sensor_ids))\
            .filter(SensorData.timestamp.between(start_date, end_date))\
            .order_by(SensorData.timestamp)\
            .all()

        if not sensor_data:
            return jsonify({'error': 'No data found for the specified criteria'}), 404

        output = io.StringIO()
        
        if format == 'json':
            data_to_export = [{
                'sensor_id': d.sensor_id,
                'timestamp': d.timestamp.isoformat(),
                'value': d.value
            } for d in sensor_data]
            print(data_to_export)
            output.write(json.dumps(data_to_export))
            content_type = 'application/json'
        else:  # csv
            writer = csv.writer(output)
            writer.writerow(['sensor_id', 'timestamp', 'value'])
            for d in sensor_data:
                writer.writerow([d.sensor_id, d.timestamp.isoformat(), d.value])
            content_type = 'text/csv'

        output.seek(0)
        return send_file(
            io.BytesIO(output.getvalue().encode('utf-8')),
            mimetype=content_type,
            as_attachment=True,
            download_name=f"{file_name}.{format}"
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500