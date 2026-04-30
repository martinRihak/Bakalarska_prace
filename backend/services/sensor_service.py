from models.models import db, Sensor, SensorData, UserSensor, Widget, DashboardWidget, Dashboard, User
from datetime import datetime, timedelta
import csv
import io
from flask import current_app

class SensorService:
    VALID_TIME_RANGES = {'24h', '7d', '30d'}

    @staticmethod
    def _sync_modbus_sensor(sensor):
        modbus = current_app.config.get('MODBUS_MANAGER')
        if not modbus:
            return

        try:
            modbus.add_new_sensor(sensor)
        except Exception as e:
            current_app.logger.error(f"Error syncing sensor {sensor.sensor_id} to modbus map: {e}")

    @staticmethod
    def _remove_modbus_sensor(sensor_id):
        modbus = current_app.config.get('MODBUS_MANAGER')
        if not modbus:
            return

        try:
            modbus.delete_sensor(sensor_id)
        except Exception as e:
            current_app.logger.error(f"Error removing sensor {sensor_id} from modbus map: {e}")

    @staticmethod
    def _user_owns_sensor(user_id, sensor_id):
        return UserSensor.query.filter_by(user_id=user_id, sensor_id=sensor_id).first() is not None

    @staticmethod
    def _ensure_user_owns_sensor(user_id, sensor_id):
        if not SensorService._user_owns_sensor(user_id, sensor_id):
            raise PermissionError("Access denied")

    @staticmethod
    def _ensure_user_owns_widget(user_id, widget_id):
        if not widget_id:
            return
        owned_widget = DashboardWidget.query.join(Dashboard).filter(
            DashboardWidget.widget_id == widget_id,
            Dashboard.user_id == user_id
        ).first()
        if not owned_widget:
            raise PermissionError("Access denied")

    @staticmethod
    def get_sensor_history(sensor_id, time_range, user_id, widget_id=None):
        time_range = time_range if time_range in SensorService.VALID_TIME_RANGES else '24h'
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
        
        sensor = Sensor.query.get(sensor_id)
        if not sensor:
            return None

        SensorService._ensure_user_owns_sensor(user_id, sensor_id)

        # Side effect on widget
        if widget_id:
            widget_id = int(widget_id)
            SensorService._ensure_user_owns_widget(user_id, widget_id)
            Widget.query.filter_by(widget_id=widget_id).update({'time': time_range})
            db.session.commit()
            
        sensor_data = SensorData.query.filter_by(sensor_id=sensor_id)\
            .filter(SensorData.timestamp >= start_time)\
            .order_by(SensorData.timestamp)\
            .all()
            
        data = [{
            'timestamp': d.timestamp.isoformat(),
            'value': d.value
        } for d in sensor_data]
        
        return {
            'sensor': {
                'id': sensor.sensor_id,
                'name': sensor.name,
                'unit': sensor.unit,
                'type': sensor.sensor_type
            },
            'data': data,
            'timeRange': time_range
        }

    @staticmethod
    def get_sensor_history_hourly(sensor_id, start_date, end_date, user_id):
        sensor = Sensor.query.get(sensor_id)
        if not sensor:
            return None

        SensorService._ensure_user_owns_sensor(user_id, sensor_id)

        query = SensorData.query.filter_by(sensor_id=sensor_id)
        if start_date is not None:
            query = query.filter(SensorData.timestamp >= start_date)
        if end_date is not None:
            query = query.filter(SensorData.timestamp < end_date + timedelta(days=1))
        sensor_data = query.order_by(SensorData.timestamp).all()

        seen_hours = set()
        hourly_samples = []
        for record in sensor_data:
            hour_key = record.timestamp.replace(minute=0, second=0, microsecond=0)
            if hour_key in seen_hours:
                continue
            seen_hours.add(hour_key)
            hourly_samples.append({
                'timestamp': hour_key.isoformat(),
                'value': record.value,
            })

        return {
            'sensor': {
                'id': sensor.sensor_id,
                'name': sensor.name,
                'unit': sensor.unit,
                'type': sensor.sensor_type,
            },
            'data': hourly_samples,
        }

    @staticmethod
    def create_sensor_from_form(data):
        address = int(data['address']) if data.get('address') else None
        register = int(data['register']) if data.get('register') else None
        min_value = float(data['min_value']) if data.get('min_value') else None
        max_value = float(data['max_value']) if data.get('max_value') else None
        sampling_rate = int(data['sampling_rate']) if data.get('sampling_rate') else None
        parent_sensor_id = int(data['parent_sensor_id']) if data.get('parent_sensor_id') else None
        is_virtual = True if data.get('is_virtual') else False
        
        new_sensor = Sensor(
            name=data.get('name'),
            sensor_type=data.get('sensor_type'),
            description=data.get('description'),
            address=address,
            register=register,
            unit=data.get('unit'),
            min_value=min_value,
            max_value=max_value,
            sampling_rate=sampling_rate,
            is_virtual=is_virtual,
            parent_sensor_id=parent_sensor_id
        )
        
        db.session.add(new_sensor)
        db.session.commit()
        SensorService._sync_modbus_sensor(new_sensor)
        return new_sensor
#-------- Deleting sensors ------------------------------------------------------------
    @staticmethod
    def delete_sensor(sensor_id, user_id):
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            raise PermissionError("Only admins can delete sensors")

        sensor = Sensor.query.get(sensor_id)
        if not sensor:
            raise ValueError("Sensor not found")

        has_data = SensorData.query.filter_by(sensor_id=sensor_id).first() is not None
        if has_data:
            raise ValueError("Sensor obsahuje data. Před smazáním je nejprve smažte nebo exportujte.")
        
        try:
            widget_ids = [
                ws.widget_id
                for ws in Widget.query.filter_by(sensor_id=sensor_id).all()
            ]
            if widget_ids:
                DashboardWidget.query.filter(
                    DashboardWidget.widget_id.in_(widget_ids)
                ).delete(synchronize_session=False)
            UserSensor.query.filter_by(sensor_id=sensor_id).delete()
            db.session.delete(sensor)
            db.session.commit()
            SensorService._remove_modbus_sensor(sensor_id)
        except Exception as e:
            db.session.rollback()
            raise e

    @staticmethod
    def delete_user_sensor(user_id, sensor_id):
        user_sensor = UserSensor.query.filter_by(user_id=user_id, sensor_id=sensor_id).first()
        if not user_sensor:
            raise ValueError("Sensor není přiřazen tomuto uživateli")
        db.session.delete(user_sensor)
        db.session.commit()
    
    @staticmethod
    def get_sensors_for_user(user_id):
        return Sensor.query.join(UserSensor).filter(UserSensor.user_id == user_id).all()

    @staticmethod
    def get_all_sensors(user_id):
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            raise PermissionError("Only admins can list all sensors")
        return Sensor.query.all()

    @staticmethod
    def get_latest_data(sensor_id, user_id):
        sensor = Sensor.query.get(sensor_id)
        if not sensor:
            return None

        SensorService._ensure_user_owns_sensor(user_id, sensor_id)

        modbus = current_app.config.get('MODBUS_MANAGER')
        result_data = None # Přejmenujeme pro jasnost
        modbus_status = None

        # 1. Pokus o čtení z Modbusu
        if modbus:
            try:
               # raw_value = modbus.read_sensor(sensor_id=sensor_id)
                data_point = modbus.get_latest_data_point(sensor_id=sensor_id)
                if data_point is not None:
                    # Vytvoříme strukturu, která imituje DB model
                    result_data = {
                        'timestamp': data_point['timestamp'],
                        'value': data_point['value']
                    }
                else:
                    status = modbus.get_status()
                    if status.get('connected') is False and status.get('last_error'):
                        modbus_status = status
            except Exception as e:
                current_app.logger.error(f"Error reading from modbus: {e}")
                modbus_status = modbus.get_status()
            
        # 2. Pokud Modbus selhal, zkusíme DB
        if result_data is None:
            current_app.logger.info(f"Load from database for sensor {sensor_id}")
            db_data = SensorData.query.filter_by(sensor_id=sensor_id).order_by(SensorData.timestamp.desc()).first()
            if db_data:
                result_data = {
                    'timestamp': db_data.timestamp,
                    'value': db_data.value
                }
        # 3. Pokud nemáme data odnikud
        if not result_data:
            return None
        
        response = {
            'sensor': {
                'id': sensor.sensor_id,
                'name': sensor.name,
                'unit': sensor.unit,
                'min_value': sensor.min_value,
                'max_value': sensor.max_value, 
            },
            'data': {
                'timestamp': result_data['timestamp'].isoformat(), # Nyní přistupujeme jako ke slovníku
                'read_at': result_data['timestamp'].isoformat(),
                'value': result_data['value']
            }
        }

        if modbus_status:
            response['modbus_status'] = modbus_status

        return response
        
    @staticmethod
    def import_data(sensor_id, records, user_id):
        SensorService._ensure_user_owns_sensor(user_id, sensor_id)

        for record in records:
            timestamp = datetime.fromisoformat(record['timestamp'])
            value = float(record['value'])
            db.session.add(SensorData(sensor_id=sensor_id, timestamp=timestamp, value=value))

        db.session.commit()
        return len(records)
    
    @staticmethod
    def export_data(start_date, end_date, sensor_ids, export_format, user_id):
        if start_date > end_date:
            raise ValueError('Datum začátku musí být před datem konce')

        if not sensor_ids:
            return None

        owned_sensor_ids = {us.sensor_id for us in UserSensor.query.filter_by(user_id=user_id).all()}
        if not set(sensor_ids).issubset(owned_sensor_ids):
            raise PermissionError("Access denied")

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
                    'sensor_id': sensor.sensor_id,
                    'unit': sensor.unit,
                    'timestamp': record.timestamp.isoformat(),
                    'value': record.value
                })

        if not sensor_data:
            return None

        if export_format == 'csv':
            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=['sensor_name', 'sensor_id', 'unit', 'timestamp', 'value'])
            writer.writeheader()
            writer.writerows(sensor_data)
            return output.getvalue()
        else:
            return sensor_data

    @staticmethod
    def get_available_sensors(user_id):
        return Sensor.query.all()

    @staticmethod
    def add_sensor_to_user(user_id, sensor_id):
        if UserSensor.query.filter_by(user_id=user_id, sensor_id=sensor_id).first():
            raise ValueError('Sensor already associated with user')
        new_user_sensor = UserSensor(user_id=user_id, sensor_id=sensor_id)
        db.session.add(new_user_sensor)
        db.session.commit()

    @staticmethod
    def create_sensor_json(data):
        parent_sensor_id = int(data['parent_sensor_id']) if data.get('parent_sensor_id') else None

        new_sensor = Sensor(
            name=data['name'],
            parent_sensor_id=parent_sensor_id,
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
        SensorService._sync_modbus_sensor(new_sensor)
        return new_sensor

    @staticmethod
    def update_sensor(sensor_id, data, user_id):
        sensor = Sensor.query.get(sensor_id)
        if not sensor:
            return False
        SensorService._ensure_user_owns_sensor(user_id, sensor_id)

        for key, value in data.items():
            if hasattr(sensor, key):
                setattr(sensor, key, value)
        db.session.commit()
        SensorService._sync_modbus_sensor(sensor)
        return True

    @staticmethod
    def toggle_sensor_active(sensor_id, is_active, user_id):
        sensor = Sensor.query.get(sensor_id)
        if not sensor:
            return False
        SensorService._ensure_user_owns_sensor(user_id, sensor_id)
        sensor.is_active = is_active
        db.session.commit()
        SensorService._sync_modbus_sensor(sensor)
        return True
