from flask import Flask, render_template, jsonify
from flask_cors import CORS
from influxdb import InfluxDBClient


app = Flask(__name__)
CORS(app)

# InfluxDB
HOST = "localhost"
DATA_PORT = 8086
DATABASE = "sensore_data"

client = InfluxDBClient(host=HOST,port=DATA_PORT,database = DATABASE)
database = client.get_list_database()
print("Dostupne databaze: " ,database )

@app.route('/api/sensor/data',methods=['GET'])
def get_sensor_data():
    formatted_data = []
    query = 'SELECT * FROM "sensor_data"'
    result = client.query(query)
    # Převedení výsledku na požadovaný formát
    formatted_data = []
    for point in result.get_points():
        formatted_data.append({
            'time': point['time'],
            'sensor_id': point['sensor_id'],
            'sensor_type': point['sensor_type'],
            'value': point['value']
        })
    
    return jsonify(formatted_data)

@app.route('/api/data',methods=['GET'])
def get_data():
    return jsonify({'message': 'Hello, Flask!'})


@app.route('/hello')
def hello():
    return 'Hello, World'

@app.route('/')
def index():
    return "Hello, Flask!"

if __name__ == '__main__':
    app.run(debug=True)