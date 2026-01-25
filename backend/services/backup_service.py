import csv
from datetime import datetime
from models.models import SensorData, db

class BackupService:
    @staticmethod
    def import_csv_data(filepath):
        """Imports data from CSV file into the database"""
        data = []
        try:
            with open(filepath, 'r') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    # IGNORUJ všechny LIGHT záznamy
                    if row.get('sensor_type', '').lower() == 'light' or row.get('info', '').upper() == 'LIGHT':
                        continue

                    # rozdělení location na latitude/longitude (pokud je)
                    if 'location' in row and row['location']:
                        latitude, longitude = row['location'].split(',')
                        row['latitude']  = float(latitude)
                        row['longitude'] = float(longitude)

                    # převod na správné typy
                    if 'time' in row and row['time']:
                        row['time'] = int(row['time'])
                    if 'humidity' in row and row['humidity']:
                        row['humidity'] = float(row['humidity'])
                    if 'temperature' in row and row['temperature']:
                        row['temperature'] = float(row['temperature'])

                    data.append(row)

            temp_data     = []
            humidity_data = []
            for item in data:
                # Timestamp z nanosekund → datetime
                timestamp = datetime.fromtimestamp(item['time'] / 1e9)

                # Teplota
                temp_entry = SensorData(
                    sensor_id=int(item['sensor_id']),
                    timestamp=timestamp,
                    value=item['temperature']
                )
                temp_data.append(temp_entry)

                # Vlhkost
                hum_entry = SensorData(
                    sensor_id=int(item['sensor_id']) + 1,
                    timestamp=timestamp,
                    value=item['humidity']
                )
                humidity_data.append(hum_entry)

            db.session.bulk_save_objects(temp_data)
            db.session.bulk_save_objects(humidity_data)
            db.session.commit()
            
            return len(temp_data), len(humidity_data)
            
        except Exception as e:
            db.session.rollback()
            raise e
