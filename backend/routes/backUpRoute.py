from flask import Blueprint, jsonify, session
from utils.auth_utils import login_required
from services.backup_service import BackupService

backUpRoute = Blueprint('backUpRoute',__name__)

@backUpRoute.route('/backUp',methods=['GET'])
@login_required
def insert_from_csv():
    if session.get('role') != 'admin':
        return jsonify({
            "status": "error",
            "message": "Access denied"
        }), 403

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
