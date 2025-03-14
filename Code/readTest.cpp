#include <iostream>
#include <fstream>
#include <chrono>
#include <thread>
#include <nlohmann/json.hpp>
#include <modbus/modbus.h>

using json = nlohmann::json;
using namespace std;

const char* PORT = "/dev/ttyUSB0"; // Na Windows použij COM port, např. "COM3"
const int DEVICE_ADDRESS = 1;

modbus_t* ctx;

void initialize_modbus() {
    ctx = modbus_new_rtu(PORT, 9600, 'N', 8, 1);
    if (ctx == nullptr) {
        cerr << "Chyba: Nelze inicializovat MODBUS." << endl;
        exit(1);
    }
    modbus_set_slave(ctx, DEVICE_ADDRESS);
    if (modbus_connect(ctx) == -1) {
        cerr << "Chyba: Nelze se připojit k zařízení." << endl;
        modbus_free(ctx);
        exit(1);
    }
}

double read_register(int reg) {
    uint16_t value;
    if (modbus_read_input_registers(ctx, reg, 1, &value) == -1) {
        cerr << "Chyba při čtení registru " << reg << endl;
        return -1;
    }
    return static_cast<double>(value) / 10.0;
}

void save_data_to_json(double temperature, double humidity) {
    json data = {
        {"timestamp", chrono::duration_cast<chrono::seconds>(chrono::system_clock::now().time_since_epoch()).count()},
        {"temperature", temperature},
        {"humidity", humidity}
    };
    ofstream json_file("sensor_data.json", ios::app);
    json_file << data.dump() << endl;
    json_file.close();
}

int main() {
    initialize_modbus();
    cout << "Zahájení měření..." << endl;
    while (true) {
        double temp = read_register(1);
        double hum = read_register(2);
        if (temp != -1 && hum != -1) {
            cout << "Teplota: " << temp << " °C, Vlhkost: " << hum << " %" << endl;
            save_data_to_json(temp, hum);
        }
        this_thread::sleep_for(chrono::seconds(5));
    }
    modbus_close(ctx);
    modbus_free(ctx);
    return 0;
}
