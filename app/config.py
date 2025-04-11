from influxdb import InfluxDBClient
# InfluxDB konfigurace
INFLUXDB_CONFIG = {
    'host': "localhost",
    'port': 8086,
    'database': "sensore_data"
}

def get_influxdb_client():
    client = InfluxDBClient(**INFLUXDB_CONFIG)
    return client 


#influx -database sensore_data -execute "SELECT * FROM senzore_data" -format csv > export.csv
