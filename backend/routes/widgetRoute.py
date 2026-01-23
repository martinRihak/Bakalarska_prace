from flask import Blueprint, render_template, jsonify,session
from models.models import db, Sensor, Widget, UserSensor,WidgetSensor,DashboardWidget
from routes.authRoute import login_required

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
            return jsonify({"error": "User not logged in"}), 401
        widget = Widget.query.filter_by(widget_id=widget_id).first()
        widget_sensor = WidgetSensor.query.filter_by(widget_id=widget_id).first()
        dashboard_widget = DashboardWidget.query.filter_by(dashboard_id=dashboard_id, widget_id=widget_id).first()
        if not widget:
            return jsonify({"error": "Widget not found"}), 404
        db.session.delete(widget)
        db.session.delete(widget_sensor)
        db.session.delete(dashboard_widget)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.session.close()
    return jsonify({"message": "Widget deleted successfully!"}), 200
@widget_api.route('/createWidgetSenzor', methods=['POST'])
def create_widget_sensor():
    print("Creating widget sensor...")
    return jsonify({"message": "Widget sensor created successfully!"}), 201
