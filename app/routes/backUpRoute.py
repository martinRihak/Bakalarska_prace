from flask import Blueprint, request, jsonify, session, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from models.models import SensorData, db
from functools import wraps
import csv,time

backUpRoute = Blueprint('backUpRoute',__name__)
@backUpRoute.route('/backUp',methods=['GET'])
def insert_from_csv():
    data = []
    with open('/mnt/9044FFDF44FFC64E/Ubuntu/6.sem/Bakalarska_prace/data/export.csv', 'r') as file:
        reader = csv.DictReader(file)

        for row in reader:
                if 'location' in row:
                    latitude, longitude = row['location'].split(',')
                    row['latitude'] = float(latitude)
                    row['longitude'] = float(longitude)
                
                # převod na správné typy
                if 'time' in row:
                    row['time'] = int(row['time'])
                if 'humidity' in row:
                    row['humidity'] = float(row['humidity'])
                if 'temperature' in row:
                    row['temperature'] = float(row['temperature'])

                data.append(row)
                

        sensor_data_objects = []
        for item in data:
            # Převod časového razítka z nanosekund na sekundy a pak na datetime
            from datetime import datetime
            timestamp = datetime.fromtimestamp(item['time'] / 1e9)
            
            new_data = SensorData(
                sensor_id=int(item['sensor_id']),
                timestamp=timestamp,
                value=item['temperature']  
            )
            sensor_data_objects.append(new_data)
        
        print(sensor_data_objects)
        try:
            db.session.bulk_save_objects(sensor_data_objects)
            db.session.commit()
            return jsonify({"status": "success", "message": f"Úspěšně uloženo {len(sensor_data_objects)} záznamů"})
        except Exception as e:
            db.session.rollback()
            return jsonify({"status": "error", "message": f"Chyba při ukládání dat: {str(e)}"}), 500
