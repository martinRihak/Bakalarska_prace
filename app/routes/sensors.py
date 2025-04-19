from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from models.models import db, Sensor, SensorData
from routes.authRoute import login_required
#from utils.modbusUtils import read_register
# Vytvoření blueprintu pro senzory
sensors_api = Blueprint('sensors_api', __name__)

@sensors_api.route('/getSensorHistory/<int:sensor_id>', methods=['GET'])
def get_sensor_history(sensor_id):
    try:
        # Získání dat ze senzoru
        sensor = Sensor.query.get_or_404(sensor_id)
        print(sensor)
        sensor_data = SensorData.query.filter_by(sensor_id=sensor_id)\
            .order_by(SensorData.timestamp)\
            .all()
        
        # Formátování dat pro frontend
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
            'data': data
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
"""
def actual_data(sensor_id):
    try:
        # Získání senzoru z databáze
        sensor = Sensor.query.get_or_404(sensor_id)
        
        # Čtení aktuální hodnoty z registru
        value = read_register(sensor.address, decimals=1,functioncode=sensor.register)
        
        if value is None:
            return jsonify({'error': 'Nepodařilo se načíst data ze senzoru'}), 500
        
        # Formátování odpovědi
        response = {
            'sensor_id': sensor.sensor_id,
            'register': sensor.register,
            'address': sensor.address,
            'value': value,
            'unit': sensor.unit
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
"""