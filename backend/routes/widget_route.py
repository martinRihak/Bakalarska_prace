from flask import Blueprint, jsonify, session
from utils.auth_utils import login_required
from services.widget_service import WidgetService

widget_api = Blueprint('widget_api', __name__)

@widget_api.route('/create', methods=['POST'])
@login_required
def create_widget():
    print("Creating widget...")
    return jsonify({"message": "Widget created successfully!"}), 201

@widget_api.route('/delete/<int:dashboard_id>/<int:widget_id>', methods=['DELETE'])
@login_required
def delete_widget(dashboard_id, widget_id):
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({"message": "User not logged in"}), 401
            
        success = WidgetService.delete_widget(dashboard_id, widget_id, user_id)
        
        if not success:
             return jsonify({"message": "Widget not found"}), 404
             
        return jsonify({"message": "Widget deleted successfully!"}), 200
    except PermissionError:
        return jsonify({"message": "Access denied"}), 403
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@widget_api.route('/createWidgetSenzor', methods=['POST'])
def create_widget_sensor():
    print("Creating widget sensor...")
    return jsonify({"message": "Widget sensor created successfully!"}), 201
