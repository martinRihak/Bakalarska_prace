import minimalmodbus
import serial
import json
import time
from datetime import datetime
from influxdb import InfluxDBClient
PORT = "/dev/ttyUSB0" 
DEVICE_ADDRESS = 1 

# Influx DB
HOST = "localhost"
DATA_PORT = 8086
DATABASE = "sensore_data"

client = InfluxDBClient(host=HOST,port=DATA_PORT,database = DATABASE)
database = client.get_list_database()
print("Dostupne databaze: " ,database )

instrument = minimalmodbus.Instrument(PORT, DEVICE_ADDRESS)

# Konfigurace sériové komunikace
instrument.serial.baudrate = 9600
instrument.serial.bytesize = 8
instrument.serial.parity   = serial.PARITY_NONE
instrument.serial.stopbits = 1
instrument.serial.timeout  = 1

def read_temperature():
    try:
        raw_temp = instrument.read_register(1, 0, functioncode=4)  # Použití funkčního kódu 0x04
        temperature = raw_temp / 10.0
        return temperature
    except Exception as e:
        print("Chyba při čtení teploty:", e)
        return None

def read_humidity():
    try:
        raw_hum = instrument.read_register(2, 0, functioncode=4)  # Použití funkčního kódu 0x04
        humidity = raw_hum / 10.0
        return humidity
    except Exception as e:
        print("Chyba při čtení vlhkosti:", e)
        return None

def save_data_to_json(temperature, humidity):
    data = {
        "timestamp": datetime.now().isoformat(),
        "temperature": temperature,
        "humidity": humidity
    }
    with open("sensor_data.json", "a") as json_file:
        json.dump(data, json_file)
        json_file.write("\n")
def save_to_influx(client,temp,hum):
    try:
        data = [
            {
                "measurement": "sensor_data",
                "tags": {
                    "sensor_id": "1",
                    "sensor_type": "temperature",
                },
                "fields": {
                    "value": temp,
                }
            },
            {
                "measurement": "sensor_data",
                "tags": {
                    "sensor_id": "2",
                    "sensor_type": "humidity",
                },
                "fields": {
                    "value": hum,
                }
            }
        ]
        client.write_points(data)
    except Exception as e:
        print(f"Chyba při zápisu do InfluxDB: {e}")
        
        
if __name__ == "__main__":
    print("Zahájení měření...")

    try:
        while True:
            temp = read_temperature()
            hum = read_humidity()
            if temp is not None and hum is not None:
                print(f"Teplota: {temp} °C, Vlhkost: {hum} %")
                save_to_influx(client=client,temp=temp,hum=hum)
            time.sleep(5)
    except KeyboardInterrupt:
        print("Měření ukončeno uživatelem.")

    print("Zpracovávám data...")

    query = "SELECT * FROM sensor_data WHERE time > now() - 1h"
    result = client.query(query)

    for point in result.get_points():
        print(point)

