from flask import Blueprint, request, jsonify, session, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from models.models import SensorData, db
from functools import wraps
from datetime import datetime
import csv,time

backUpRoute = Blueprint('backUpRoute',__name__)
@backUpRoute.route('/backUp',methods=['GET'])
def insert_from_csv():
    data = []
    with open('/media/rih0075/HDDv02/Ubuntu/6.sem/Bakalarska_prace/data/test.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # IGNORUJ všechny LIGHT záznamy
            if row.get('sensor_type', '').lower() == 'light' or row.get('info', '').upper() == 'LIGHT':
                continue

            # rozdělení location na latitude/longitude (pokud je)
            if 'location' in row and row['location']:
                latitude, longitude = row['location'].split(',')
                row['latitude']  = float(latitude)
                row['longitude'] = float(longitude)

            # převod na správné typy
            if 'time' in row and row['time']:
                row['time'] = int(row['time'])
            if 'humidity' in row and row['humidity']:
                row['humidity'] = float(row['humidity'])
            if 'temperature' in row and row['temperature']:
                row['temperature'] = float(row['temperature'])

            data.append(row)

    temp_data     = []
    humidity_data = []
    for item in data:
        # Timestamp z nanosekund → datetime
        timestamp = datetime.fromtimestamp(item['time'] / 1e9)

        # Teplota
        temp_entry = SensorData(
            sensor_id=int(item['sensor_id']),
            timestamp=timestamp,
            value=item['temperature']
        )
        temp_data.append(temp_entry)

        # Vlhkost
        hum_entry = SensorData(
            sensor_id=int(item['sensor_id']) + 1,
            timestamp=timestamp,
            value=item['humidity']
        )
        humidity_data.append(hum_entry)

    try:
        db.session.bulk_save_objects(temp_data)
        db.session.bulk_save_objects(humidity_data)
        db.session.commit()
        return jsonify({
            "status":  "success",
            "message": f"Úspěšně uloženo {len(temp_data)} teplotních a {len(humidity_data)} vlhkostních záznamů"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status":  "error",
            "message": f"Chyba při ukládání dat: {str(e)}"
        }), 500