import minimalmodbus
import serial
import json
import time
import os
from datetime import datetime
from influxdb import InfluxDBClient
import requests
import logging
from systemd import journal

# Nastavení loggeru
logger = logging.getLogger("sensor_data")
logger.setLevel(logging.INFO)
journald_handler = journal.JournaldLogHandler()
journald_handler.setFormatter(logging.Formatter('[%(levelname)s] %(message)s'))
logger.addHandler(journald_handler)

# Konfigurace sériového portu
PORT = "/dev/ttyUSB0" 
DEVICE_ADDRESS = 1 

# Konfigurace InfluxDB
HOST = "localhost"
DATA_PORT = 8086
DATABASE = "sensore_data"

# Interval sběru dat (15 minut v sekundách)
INTERVAL = 15 * 60

def get_location():
    """Získává přibližnou geografickou polohu z IP adresy"""
    try:
        response = requests.get('https://ipinfo.io/json')
        if response.status_code == 200:
            data = response.json()
            if 'loc' in data:
                return data['loc'].split(',')
            else:
                return [None, None]
        else:
            logger.error(f"Nelze získat polohu, stavový kód: {response.status_code}")
            return [None, None]
    except Exception as e:
        logger.error(f"Chyba při získávání polohy: {e}")
        return [None, None]

def setup_influxdb():
    """Nastavení připojení k InfluxDB"""
    try:
        client = InfluxDBClient(host=HOST, port=DATA_PORT)
        databases = client.get_list_database()
        logger.info(f"Dostupné databáze: {databases}")
        
        # Vytvoří databázi, pokud neexistuje
        if {'name': DATABASE} not in databases:
            logger.info(f"Vytvářím databázi {DATABASE}")
            client.create_database(DATABASE)
        
        client.switch_database(DATABASE)
        return client
    except Exception as e:
        logger.error(f"Chyba při nastavení InfluxDB: {e}")
        return None

def setup_modbus():
    """Nastavení Modbus komunikace"""
    try:
        instrument = minimalmodbus.Instrument(PORT, DEVICE_ADDRESS)
        instrument.serial.baudrate = 9600
        instrument.serial.bytesize = 8
        instrument.serial.parity = serial.PARITY_NONE
        instrument.serial.stopbits = 1
        instrument.serial.timeout = 1
        return instrument
    except Exception as e:
        logger.error(f"Chyba při nastavení Modbus: {e}")
        return None

def read_temperature(instrument):
    """Čtení teploty ze senzoru"""
    try:
        raw_temp = instrument.read_register(1, 0, functioncode=4)
        temperature = raw_temp / 10.0
        return temperature
    except Exception as e:
        logger.error(f"Chyba při čtení teploty: {e}")
        return None

def read_humidity(instrument):
    """Čtení vlhkosti ze senzoru"""
    try:
        raw_hum = instrument.read_register(2, 0, functioncode=4)
        humidity = raw_hum / 10.0
        return humidity
    except Exception as e:
        logger.error(f"Chyba při čtení vlhkosti: {e}")
        return None

def save_to_influx(client, temp, hum, lat, lon):
    """Ukládání dat do InfluxDB"""
    try:
        # Příprava dat pro InfluxDB
        data = [
            {
                "measurement": "sensor_data",
                "tags": {
                    "sensor_id": "1",
                    "sensor_type": "temperature"
                },
                "fields": {
                    "value": temp
                }
            },
            {
                "measurement": "sensor_data",
                "tags": {
                    "sensor_id": "2",
                    "sensor_type": "humidity"
                },
                "fields": {
                    "value": hum
                }
            }
        ]
        
        # Přidání geolokačních dat, pokud jsou dostupná
        if lat is not None and lon is not None:
            for point in data:
                point["fields"]["latitude"] = float(lat)
                point["fields"]["longitude"] = float(lon)
        
        client.write_points(data)
        logger.info(f"Data úspěšně uložena do InfluxDB: Teplota: {temp}°C, Vlhkost: {hum}%")
        return True
    except Exception as e:
        logger.error(f"Chyba při zápisu do InfluxDB: {e}")
        return False

def main():
    """Hlavní funkce programu"""
    logger.info("Program na sběr dat ze sběrnice RS485 byl spuštěn")
    
    # Inicializace InfluxDB
    client = setup_influxdb()
    if client is None:
        logger.error("Nelze pokračovat bez připojení k InfluxDB")
        return
    
    # Inicializace Modbus
    instrument = setup_modbus()
    if instrument is None:
        logger.error("Nelze pokračovat bez komunikace Modbus")
        return
    
    logger.info(f"Zahájení měření s intervalem {INTERVAL} sekund...")
    
    try:
        while True:
            # Čtení dat
            temp = read_temperature(instrument)
            hum = read_humidity(instrument)
            
            # Získání geolokace
            lat, lon = get_location()
            
            if temp is not None and hum is not None:
                # Uložení dat do InfluxDB
                if save_to_influx(client, temp, hum, lat, lon):
                    logger.info(f"Teplota: {temp}°C, Vlhkost: {hum}%, Pozice: {lat}, {lon}")
                
            # Čekání na další interval měření
            time.sleep(INTERVAL)
    
    except KeyboardInterrupt:
        logger.info("Měření ukončeno uživatelem.")
    except Exception as e:
        logger.error(f"Neočekávaná chyba: {e}")
    
    logger.info("Program ukončen")

if __name__ == "__main__":
    main()