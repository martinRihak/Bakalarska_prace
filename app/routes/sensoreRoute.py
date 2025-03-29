from flask import Blueprint,jsonify
from config import get_influxdb_client

api_sensor = Blueprint('api_sensor',__name__,url_prefix='/api')

@api_sensor.route('/sensor/data/<int:sensor_id>',methods=['GET'])
def get_sensor_data(sensor_id):
    try:
        # Vytvoření připojení
        client = get_influxdb_client()
        
        formatted_data = []
        query = f'SELECT * FROM "sensor_data" WHERE "sensor_id" = \'{sensor_id}\''
        result = client.query(query)
        
        # Převedení výsledku na požadovaný formát
        for point in result.get_points():
            formatted_data.append({
                'time': point['time'],
                'sensor_id': point['sensor_id'],
                'sensor_type': point['sensor_type'],
                'value': point['value']
            })
        
        return jsonify(formatted_data)
    finally:
        # Zavření připojení
        client.close()
