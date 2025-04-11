from flask import Blueprint,jsonify
from config import get_influxdb_client
import io,csv
api_sensor = Blueprint('api_sensor',__name__,url_prefix='/api')

@api_sensor.route('/sensor/dataInflux/<int:sensor_id>',methods=['GET'])
def get_sensor_data_influx(sensor_id):
    try:
        # Vytvoření připojení
        client = get_influxdb_client()
        
        formatted_data = []
        query = f'SELECT * FROM "sensor_data" WHERE "sensor_id" = \'{sensor_id}\''
        result = client.query(query)
        
        # Převedení výsledku na požadovaný formát
        for point in result.get_points():
            formatted_data.append({
                'Time': point['time'],
                'Value': point['value']
                
            })
        
        return jsonify(formatted_data)
    finally:
        # Zavření připojení
        client.close()


@api_sensor.route('/sensor/data/<int:sensor_id>',methods=['GET'])
def TEST_get_sensor_data(sensor_id):
    try:
        # Vytvoření připojení
        data = []
        with open('../data/export.csv', 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                if int(row['sensor_id']) == sensor_id:
                    # rozdělení souřadnic pokud existují
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
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

