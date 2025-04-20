import minimalmodbus
import serial
import json
import time
import os
from datetime import datetime
from influxdb import InfluxDBClient
import logging
from systemd import journal
import math

# Nastavení loggeru
logger = logging.getLogger("sensor_data")
logger.setLevel(logging.INFO)
journald_handler = journal.JournaldLogHandler()
journald_handler.setFormatter(logging.Formatter('[%(levelname)s] %(message)s'))
logger.addHandler(journald_handler)

# Konfigurace sériového portu
PORT = "/dev/ttyUSB0" 
DEVICE_ADDRESS = 1 
RSBIT = 9600             # Bitrate pro teplotně-vlhkostní senzor
LIGBIT = 4800            # Bitrate pro světelný senzor

# Pevná GPS lokace
LATITUDE = "49.5944"
LONGITUDE = "18.0103"

# Konfigurace InfluxDB
HOST = "localhost"
DATA_PORT = 8086
DATABASE = "sensore_data"

DEFAULT_INTERVAL = 1 * 60
MIN_INTERVAL = 5 * 60    
MAX_INTERVAL = 15 * 60   

# Globální proměnné pro sledování změn
previous_temp = None
previous_humidity = None
previous_light = None

# Globální modbus instrument
instrument = None

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

def init_modbus():
    """Inicializuje globální Modbus instrument"""
    global instrument
    try:
        instrument = minimalmodbus.Instrument(PORT, DEVICE_ADDRESS)
        instrument.serial.bytesize = 8
        instrument.serial.parity = serial.PARITY_NONE
        instrument.serial.stopbits = 1
        instrument.serial.timeout = 1
        return True
    except Exception as e:
        logger.error(f"Chyba při inicializaci Modbus instrumentu: {e}")
        return False

def change_bitrate(bitrate):
    """Změní bitrate existujícího Modbus instrumentu"""
    global instrument
    try:
        instrument.serial.baudrate = bitrate
        # Krátká pauza pro stabilizaci sériové komunikace
        time.sleep(0.2)
        return True
    except Exception as e:
        logger.error(f"Chyba při změně bitrate na {bitrate}: {e}")
        return False

def read_sensore(decimals, reg, fun):
    """Čtení hodnoty ze senzoru pomocí globálního instrumentu"""
    global instrument
    try:
        raw_value = instrument.read_register(reg, 0, functioncode=fun)
        value = raw_value / (10 ** decimals)
        return value
    except Exception as e:
        logger.error(f"Chyba při čtení z registru {reg}: {e}")
        return None

def calculate_next_interval(temp, prev_temp, humidity, prev_humidity, light=None, prev_light=None):
    """Vypočítá příští interval měření na základě změny hodnot"""
    if prev_temp is None or prev_humidity is None:
        return DEFAULT_INTERVAL
    
    # Výpočet rychlosti změny
    temp_change_rate = abs(temp - prev_temp)
    humidity_change_rate = abs(humidity - prev_humidity)
    
    # Přidání změny světla do výpočtu, pokud jsou data k dispozici
    light_change_rate = 0
    if light is not None and prev_light is not None:
        light_change_rate = abs(light - prev_light) / max(1, prev_light)  # Relativní změna, aby se předešlo problémům s nulovými hodnotami
    
    # Výpočet skóre změny - vyšší skóre znamená rychlejší změny
    change_score = (temp_change_rate * 2) + (humidity_change_rate * 0.5) + (light_change_rate * 10)
    
    # Logaritmické mapování skóre na interval (inverzní vztah - vyšší změny -> kratší interval)
    if change_score <= 0.1:
        new_interval = MAX_INTERVAL
    elif change_score >= 5:
        new_interval = MIN_INTERVAL
    else:
        log_factor = 1 - (math.log(change_score + 0.1) / math.log(5.1))  # Normalizovaný log faktor (0-1)
        new_interval = MIN_INTERVAL + log_factor * (MAX_INTERVAL - MIN_INTERVAL)
    
    logger.info(f"Vypočítaný nový interval měření: {int(new_interval)} sekund (skóre změny: {change_score:.2f})")
    return int(new_interval)

def save_to_influx(client, temp, hum, light=None):
    """Ukládání dat do InfluxDB ve správném formátu"""
    try:
        # Vytvoření základního datového bodu pro teplotu a vlhkost
        data_point = {
            "measurement": "senzore_data",
            "tags": {
                "sensor_id": "1",
                "location": f"{LATITUDE},{LONGITUDE}"
            },
            "fields": {
                "temperature": float(temp),
                "humidity": float(hum),
                "info": "SHT20",  # Informace o typu senzoru
                "location": f"{LATITUDE},{LONGITUDE}"  # Přidání lokace také do fields pro kompatibilitu s původním formátem
            }
        }
        
        # Vytvoření seznamu datových bodů
        data = [data_point]
        
        # Přidání datového bodu pro světlo, pokud je k dispozici
        if light is not None:
            light_point = {
                "measurement": "senzore_data",
                "tags": {
                    "sensor_id": "3",
                    "sensor_type": "light",
                    "location": f"{LATITUDE},{LONGITUDE}"
                },
                "fields": {
                    "value": float(light),
                    "info": "LIGHT",
                    "location": f"{LATITUDE},{LONGITUDE}"
                }
            }
            data.append(light_point)
        
        client.write_points(data)
        logger.info(f"Data úspěšně uložena do InfluxDB: Teplota: {temp}°C, Vlhkost: {hum}%, Světlo: {light}")
        return True
    except Exception as e:
        logger.error(f"Chyba při zápisu do InfluxDB: {e}")
        return False

def read_all_sensors():
    """Funkce pro čtení všech senzorů s dynamickým přepínáním bitrate"""
    global instrument
    
    # Nastavení pro teplotně-vlhkostní senzor
    if not change_bitrate(RSBIT):
        return None, None, None
    
    # Čtení teploty a vlhkosti
    temp = read_sensore(1, 1, 4)
    hum = read_sensore(1, 2, 4)
    
    # Přenastavení pro světelný senzor
    light = None
    if change_bitrate(LIGBIT):
        light = read_sensore(0, 64, 3)
    
    return temp, hum, light

def main():
    """Hlavní funkce programu"""
    logger.info("Program na sběr dat ze senzorů byl spuštěn")
    
    # Inicializace InfluxDB
    client = setup_influxdb()
    if client is None:
        logger.error("Nelze pokračovat bez připojení k InfluxDB")
        return
    
    # Inicializace jednoho Modbus instrumentu
    if not init_modbus():
        logger.error("Nelze pokračovat bez inicializace Modbus instrumentu")
        return
    
    logger.info(f"Zahájení měření s počátečním intervalem {DEFAULT_INTERVAL} sekund...")
    
    # Globální proměnné pro uchování předchozích hodnot
    global previous_temp, previous_humidity, previous_light
    
    # Počáteční interval
    current_interval = DEFAULT_INTERVAL
    
    try:
        while True:
            start_time = time.time()
            
            # Čtení všech senzorů s dynamickým přepínáním bitrate
            temp, hum, light = read_all_sensors()
            
            # Logika pro zpracování a ukládání dat
            if temp is not None and hum is not None:
                # Uložení dat do InfluxDB
                if save_to_influx(client, temp, hum, light):
                    log_message = f"Teplota: {temp}°C, Vlhkost: {hum}%"
                    if light is not None:
                        log_message += f", Světlo: {light}"
                    log_message += f", Pozice: {LATITUDE}, {LONGITUDE}"
                    logger.info(log_message)
                
                # Výpočet dalšího intervalu měření na základě změn
                if previous_temp is not None and previous_humidity is not None:
                    current_interval = calculate_next_interval(
                        temp, previous_temp, 
                        hum, previous_humidity,
                        light, previous_light
                    )
                
                # Aktualizace předchozích hodnot pro příští výpočet
                previous_temp = temp
                previous_humidity = hum
                previous_light = light
            
            # Výpočet zbývajícího času do dalšího měření
            elapsed = time.time() - start_time
            sleep_time = max(1, current_interval - elapsed)  # Zajištění, že sleep_time je alespoň 1 sekunda
            
            logger.info(f"Další měření za {sleep_time:.1f} sekund.")
            time.sleep(sleep_time)
    
    except KeyboardInterrupt:
        logger.info("Měření ukončeno uživatelem.")
    except Exception as e:
        logger.error(f"Neočekávaná chyba: {e}")
    
    logger.info("Program ukončen")

if __name__ == "__main__":
    main()