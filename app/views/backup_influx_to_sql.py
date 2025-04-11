from influxdb_client import InfluxDBClient
from models.models import Sensor,SensorData
import sqlite3
from datetime import datetime

def backup_influx_to_sql():
    client = InfluxDBClient(url='http://localhost:8086',database='sensore_data', token='')
    query = 'from(bucket: "sensore_data") |> range(start: -30d) |> filter(fn: (r) => r._measurement == "senzory") |> filter(fn: (r) => r._field == "temperature")'
    result = client.query_api().query(query)
    for table in result:
        for record in table.records:
            print(record)


backup_influx_to_sql()