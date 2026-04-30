"""
Script pro čtení dat ze senzorů přes Modbus RTU.
Data se NEUKLÁDAJÍ do databáze, jen se vypisují na výstup.

Senzory:
  - Teplotně-vlhkostní (SHT20): bitrate 9600, registry 1 (teplota) a 2 (vlhkost),
    FC=4, hodnota /10
  - Světelný senzor: bitrate 4800, registr 64, FC=3, hodnota přímo v Lux
"""

import minimalmodbus
import serial
import time
import math
import logging
from datetime import datetime

# Nastavení loggeru — vypisuje na stdout
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("sensor_data")

# Konfigurace sériového portu
PORT = "/dev/ttyUSB0"
DEVICE_ADDRESS = 1
RSBIT = 9600             # Bitrate pro teplotně-vlhkostní senzor
LIGBIT = 4800            # Bitrate pro světelný senzor

# Pevná GPS lokace (jen pro výpis)
LATITUDE = "49.5944"
LONGITUDE = "18.0103"

# Intervaly měření
DEFAULT_INTERVAL = 1 * 60
MIN_INTERVAL = 5 * 60
MAX_INTERVAL = 15 * 60

# Globální proměnné pro sledování změn
previous_temp = None
previous_humidity = None
previous_light = None

# Globální modbus instrument
instrument = None


def init_modbus():
    """Inicializuje globální Modbus instrument."""
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
    """Změní bitrate existujícího Modbus instrumentu."""
    global instrument
    try:
        instrument.serial.baudrate = bitrate
        time.sleep(0.2)  # Krátká pauza pro stabilizaci
        return True
    except Exception as e:
        logger.error(f"Chyba při změně bitrate na {bitrate}: {e}")
        return False


def read_sensore(decimals, reg, fun):
    """Čtení hodnoty ze senzoru pomocí globálního instrumentu."""
    global instrument
    try:
        raw_value = instrument.read_register(reg, 0, functioncode=fun)
        value = raw_value / (10 ** decimals)
        return value
    except Exception as e:
        logger.error(f"Chyba při čtení z registru {reg}: {e}")
        return None


def calculate_next_interval(temp, prev_temp, humidity, prev_humidity,
                            light=None, prev_light=None):
    """Vypočítá příští interval měření na základě změny hodnot."""
    if prev_temp is None or prev_humidity is None:
        return DEFAULT_INTERVAL

    temp_change_rate = abs(temp - prev_temp)
    humidity_change_rate = abs(humidity - prev_humidity)

    light_change_rate = 0
    if light is not None and prev_light is not None:
        light_change_rate = abs(light - prev_light) / max(1, prev_light)

    change_score = (temp_change_rate * 2) + (humidity_change_rate * 0.5) + \
                   (light_change_rate * 10)

    if change_score <= 0.1:
        new_interval = MAX_INTERVAL
    elif change_score >= 5:
        new_interval = MIN_INTERVAL
    else:
        log_factor = 1 - (math.log(change_score + 0.1) / math.log(5.1))
        new_interval = MIN_INTERVAL + log_factor * (MAX_INTERVAL - MIN_INTERVAL)

    logger.info(f"Vypočítaný nový interval měření: {int(new_interval)} s "
                f"(skóre změny: {change_score:.2f})")
    return int(new_interval)


def print_measurement(temp, hum, light=None):
    """Vypíše naměřená data na výstup v přehledné podobě."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print("─" * 60)
    print(f"📊 Měření z {timestamp}")
    print(f"   📍 Pozice:    {LATITUDE}, {LONGITUDE}")
    print(f"   🌡️  Teplota:   {temp} °C")
    print(f"   💧 Vlhkost:   {hum} %")
    if light is not None:
        print(f"   💡 Světlo:    {light} Lux")
    else:
        print(f"   💡 Světlo:    n/a")
    print("─" * 60)


def read_all_sensors():
    """Přečte všechny senzory s dynamickým přepínáním bitrate."""
    # Teplotně-vlhkostní senzor
    if not change_bitrate(RSBIT):
        return None, None, None

    temp = read_sensore(1, 1, 4)
    hum = read_sensore(1, 2, 4)

    # Světelný senzor
    light = None
    if change_bitrate(LIGBIT):
        light = read_sensore(0, 64, 3)

    return temp, hum, light


def main():
    """Hlavní funkce programu."""
    logger.info("Program na sběr dat ze senzorů byl spuštěn (režim: pouze výpis)")

    if not init_modbus():
        logger.error("Nelze pokračovat bez inicializace Modbus instrumentu")
        return

    logger.info(f"Zahájení měření s počátečním intervalem "
                f"{DEFAULT_INTERVAL} sekund…")

    global previous_temp, previous_humidity, previous_light
    current_interval = DEFAULT_INTERVAL

    try:
        while True:
            start_time = time.time()

            temp, hum, light = read_all_sensors()

            if temp is not None and hum is not None:
                # Místo zápisu do DB jen vypíšeme na stdout
                print_measurement(temp, hum, light)

                # Dynamický interval podle změn
                if previous_temp is not None and previous_humidity is not None:
                    current_interval = calculate_next_interval(
                        temp, previous_temp,
                        hum, previous_humidity,
                        light, previous_light
                    )

                previous_temp = temp
                previous_humidity = hum
                previous_light = light
            else:
                logger.warning("Měření se nezdařilo — přeskakuji tento cyklus.")

            time.sleep(2)

    except KeyboardInterrupt:
        logger.info("Měření ukončeno uživatelem.")
    except Exception as e:
        logger.error(f"Neočekávaná chyba: {e}")

    logger.info("Program ukončen")


if __name__ == "__main__":
    main()