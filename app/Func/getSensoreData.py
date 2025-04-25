import minimalmodbus 
import serial
import json
import time
from datetime import datetime



PORT = "/dev/ttyUSB0" 
DEVICE_ADDRESS = 1 
def setup_modbus(bitrate):
    """Nastavení Modbus komunikace"""
    try:
        instrument = minimalmodbus.Instrument(PORT,DEVICE_ADDRESS)
        instrument.serial.baudrate = bitrate
        instrument.serial.bytesize = 8
        instrument.serial.parity = serial.PARITY_NONE
        instrument.serial.stopbits = 1
        instrument.serial.timeout = 1
        return instrument
    except Exception as e:
        print.error(f"Chyba při nastavení Modbus pro zařízení {DEVICE_ADDRESS} s bitrate {bitrate}: {e}")
        return None

def read_register(instrument,register_address, decimals, functioncode):
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


PORT = "/dev/ttyUSB0"
BAUDRATE = 4800

def scan_registers(device_address):
    instr = minimalmodbus.Instrument(PORT, device_address)
    instr.serial.baudrate = BAUDRATE
    instr.serial.bytesize = 8
    instr.serial.parity = serial.PARITY_NONE
    instr.serial.stopbits = 1
    instr.serial.timeout = 1
    

    print(f"📡 Čtení z adresy zařízení {device_address}...")
    while True:
        address = 3
        # Čtení hodnoty z registru 1
        value = instr.read_register(address, 0, functioncode=4)
        print(f"  ✅ Registr {address}: {value}")
        time.sleep(0.5)


    """
    for fc in [3,4]:
        print(f"\n🧩 Funkční kód: {fc} ({'holding' if fc == 3 else 'input'})")
        for reg in range(1, 70):
            try:
                val = instr.read_register(reg, 0, functioncode=fc)
                print(f"  ✅ Registr {reg:02d}: {val}")
            except Exception as e:
                print(f"  ❌ Registr {reg:02d}: {e}")
    """
# Zkusíme adresy 1–5, nebo jen 1, pokud víš přesně
scan_registers(1)
