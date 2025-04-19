import minimalmodbus
import serial
# Konfigurace portu a adresy zařízení
PORT = "/dev/ttyUSB0"
DEVICE_ADDRESS = 1

# Inicializace přístroje
instrument = minimalmodbus.Instrument(PORT, DEVICE_ADDRESS)
instrument.serial.baudrate = 9600
instrument.serial.bytesize = 8
instrument.serial.parity = serial.PARITY_NONE
instrument.serial.stopbits = 1
instrument.serial.timeout = 1

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