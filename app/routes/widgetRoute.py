from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify,session
from models.models import db, Sensor, SensorData, UserSensor,WidgetSensor,DashboardWidget
from routes.authRoute import login_required

widget_api = Blueprint('widget_api', __name__)


@widget_api.route('/create', methods=['POST'])
@login_required
def create_widget():
    print("Creating widget...")
    return jsonify({"message": "Widget created successfully!"}), 201


@widget_api.route('/createWidgetSenzor', methods=['POST'])
def create_widget_sensor():
    print("Creating widget sensor...")
    return jsonify({"message": "Widget sensor created successfully!"}), 201
