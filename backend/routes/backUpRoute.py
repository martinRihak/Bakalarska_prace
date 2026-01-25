from flask import Blueprint, jsonify
from services.backup_service import BackupService

backUpRoute = Blueprint('backUpRoute',__name__)

@backUpRoute.route('/backUp',methods=['GET'])
def insert_from_csv():
    # Hardcoded path from original file
    filepath = '/media/rih0075/HDDv02/Ubuntu/6.sem/Bakalarska_prace/data/test.csv'
    
    try:
        temp_count, hum_count = BackupService.import_csv_data(filepath)
        return jsonify({
            "status":  "success",
            "message": f"Úspěšně uloženo {temp_count} teplotních a {hum_count} vlhkostních záznamů"
        })
    except Exception as e:
        return jsonify({
            "status":  "error",
            "message": f"Chyba při ukládání dat: {str(e)}"
        }), 500
