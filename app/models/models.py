from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from datetime import datetime
import os


db = SQLAlchemy()

def init_db(app: Flask):
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + '/home/rih0075/BK_projekt.db' 
    db.init_app(app)
    with app.app_context():
        db.create_all()

# User Model
class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    password_hash = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True)
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=func.now())
    last_login = db.Column(db.DateTime)
    
    # Relationships
    dashboards = db.relationship('Dashboard', backref='user', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<User {self.username}>'

# Dashboard Model
class Dashboard(db.Model):
    __tablename__ = 'dashboards'
    
    dashboard_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    layout_config = db.Column(db.Text)  # JSON representation of dashboard layout
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    widgets = db.relationship('DashboardWidget', backref='dashboard', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Dashboard {self.name}>'

# Dashboard Widget Model
class DashboardWidget(db.Model):
    __tablename__ = 'dashboard_widgets'
    
    widget_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    dashboard_id = db.Column(db.Integer, db.ForeignKey('dashboards.dashboard_id', ondelete='CASCADE'), nullable=False)
    widget_type = db.Column(db.String(50), nullable=False)  # 'chart', 'gauge', 'value', etc.
    position_x = db.Column(db.Integer, nullable=False)
    position_y = db.Column(db.Integer, nullable=False)
    width = db.Column(db.Integer, nullable=False)
    height = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(100))
    config = db.Column(db.Text)  # JSON configuration for the widget
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    sensors = db.relationship('WidgetSensor', backref='widget', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Widget {self.widget_id} ({self.widget_type})>'

# Sensor Model
class Sensor(db.Model):
    __tablename__ = 'sensors'
    
    sensor_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    parent_sensor_id = db.Column(db.Integer, db.ForeignKey('sensors.sensor_id', ondelete='SET NULL'), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    sensor_type = db.Column(db.String(50), nullable=False)
    address = db.Column(db.Integer)  # RS-485 address
    register = db.Column(db.Integer)  # Register number
    parameters = db.Column(db.Text)  # JSON parameters for the sensor
    unit = db.Column(db.String(20))  # Measurement unit
    min_value = db.Column(db.Float)
    max_value = db.Column(db.Float)
    sampling_rate = db.Column(db.Integer)  # Seconds between readings
    is_virtual = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    derived_sensors = db.relationship('Sensor', 
                                     backref=db.backref('parent_sensor', remote_side=[sensor_id]),
                                     lazy=True)
    sensor_data = db.relationship('SensorData', backref='sensor', lazy=True, cascade="all, delete-orphan")
    widget_sensors = db.relationship('WidgetSensor', backref='sensor', lazy=True, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f'<Sensor {self.name} ({self.sensor_type})>'

# Widget-Sensor Junction Model
class WidgetSensor(db.Model):
    __tablename__ = 'widget_sensors'
    
    widget_sensor_id = db.Column(db.Integer, autoincrement=True)
    widget_id = db.Column(db.Integer, db.ForeignKey('dashboard_widgets.widget_id', ondelete='CASCADE'), primary_key=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensors.sensor_id', ondelete='CASCADE'), primary_key=True)
    display_options = db.Column(db.Text)  # JSON configuration for display options
    
    def __repr__(self):
        return f'<WidgetSensor {self.widget_id}:{self.sensor_id}>'

# Sensor Data Model (Backup from InfluxDB)
class SensorData(db.Model):
    __tablename__ = 'sensor_data'
    
    data_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensors.sensor_id', ondelete='CASCADE'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    value = db.Column(db.Float, nullable=False)
    
    def __repr__(self):
        return f'<SensorData {self.sensor_id} @ {self.timestamp}: {self.value}>'
