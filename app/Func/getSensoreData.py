import minimalmodbus
import serial
import json
import time
from datetime import datetime



PORT = "/dev/ttyUSB0" 
DEVICE_ADDRESS = 1 

# Inicializace přístroje
instrument = minimalmodbus.Instrument(PORT, DEVICE_ADDRESS)
# Konfigurace séAffinity
instrument.serial.baudrate = 9600
instrument.serial.bytesize = 8
instrument.serial.parity   = serial.PARITY_NONE
instrument.serial.stopbits = 1
instrument.serial.timeout  = 1

def read_register(register_address, decimals=1, functioncode=4):
    """
    Čte data z input registru na zadané adrese přes Modbus RTU.
    
    Args:
        register_address (int): Adresa registru (např. 1 pro teplotu, 2 pro vlhkost).
        decimals (int): Počet desetinných míst pro výstupní hodnotu (výchozí 1, děleno 10).
        functioncode (int): Funkční kód Modbus (výchozí 4 pro input registry).
    
    Returns:
        float or None: Dekódovaná hodnota (např. teplota nebo vlhkost) nebo None při chybě.
    """
    try:
        raw_value = instrument.read_register(register_address, 0, functioncode=functioncode)
        value = raw_value / (10 ** decimals)
        return value
    except Exception as e:
        print(f"Chyba při čtení registru {register_address}: {e}")
        return None

def read_temperature():
    """Čte teplotu z registru 0x0001."""
    return read_register(1, decimals=1)

def read_humidity():
    """Čte vlhkost z registru 0x0002."""
    return read_register(2, decimals=1)

if __name__ == "__main__":
    print("Zahájení měření...")

    # Čtení teploty a vlhkosti
    temp = read_temperature()
    hum = read_humidity()
    
    # Uložení dat do slovníku
    data = {
        'temp': temp,
        'hum': hum, 
    }
    
    print(data)
    
    # Příklad čtení z jiné adresy (např. teplota znovu, pro ukázku)
    custom_value = read_register(1, decimals=1)
    print(f"Hodnota z registru 0x0001: {custom_value}")