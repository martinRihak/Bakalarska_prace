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

class UserSensor(db.Model):
    __tablename__ = 'user_sensors'
    
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), primary_key=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensors.sensor_id', ondelete='CASCADE'), primary_key=True)
    created_at = db.Column(db.DateTime, default=func.now())
    
    def __repr__(self):
        return f'<UserSensor {self.user_id}:{self.sensor_id}>'

class User(db.Model):
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    password_hash = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True)
    role = db.Column(db.String(20), default='user')
    created_at = db.Column(db.DateTime, default=func.now())
    last_login = db.Column(db.DateTime)
    
    dashboards = db.relationship('Dashboard', backref='user', lazy=True, cascade="all, delete-orphan")
    sensors = db.relationship('Sensor', secondary='user_sensors',
                            backref=db.backref('users', lazy=True),
                            lazy=True)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Dashboard(db.Model):
    __tablename__ = 'dashboards'
    
    dashboard_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f'<Dashboard {self.name}>'

class DashboardWidget(db.Model):
    __tablename__ = 'dashboard_widgets'
    
    dashboard_id = db.Column(db.Integer, db.ForeignKey('dashboards.dashboard_id', ondelete='CASCADE'), primary_key=True)
    widget_id = db.Column(db.Integer, db.ForeignKey('widgets.widget_id', ondelete='CASCADE'), primary_key=True)
    position_x = db.Column(db.Integer, nullable=False)
    position_y = db.Column(db.Integer, nullable=False)
    width = db.Column(db.Integer, nullable=False)
    height = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
    
    @classmethod
    def get_widgets_for_user_dashboard(cls, dashboard_id, user_id):
        return cls.query\
            .join(Dashboard)\
            .filter(
                Dashboard.dashboard_id == dashboard_id,
                Dashboard.user_id == user_id
            )\
            .all()

class Widget(db.Model):
    __tablename__ = 'widgets'
    
    widget_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    widget_type = db.Column(db.String(50), nullable=False)
    title = db.Column(db.String(100))
    time = db.Column(db.String(4), nullable=True)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
    
    dashboards = db.relationship('Dashboard', secondary='dashboard_widgets', 
                               backref=db.backref('widgets', lazy=True),
                               lazy=True)
                               
    def __repr__(self):
        return f'<Widget {self.widget_id}: {self.title}>'

class Sensor(db.Model):
    __tablename__ = 'sensors'
    
    sensor_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    parent_sensor_id = db.Column(db.Integer, db.ForeignKey('sensors.sensor_id', ondelete='SET NULL'), nullable=True)
    name = db.Column(db.String(100), nullable=False)
    sensor_type = db.Column(db.String(50))
    address = db.Column(db.Integer, nullable=False)
    functioncode = db.Column(db.Integer, nullable=False)
    bit = db.Column(db.Integer, nullable=False)
    scaling = db.Column(db.Integer, nullable=False)
    unit = db.Column(db.String(20), nullable=False)
    min_value = db.Column(db.Float)
    max_value = db.Column(db.Float)
    sampling_rate = db.Column(db.Integer, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=func.now())
    updated_at = db.Column(db.DateTime, default=func.now(), onupdate=func.now())
    
    derived_sensors = db.relationship('Sensor', 
                                     backref=db.backref('parent_sensor', remote_side=[sensor_id]),
                                     lazy=True)
    sensor_data = db.relationship('SensorData', backref='sensor', lazy=True, cascade="all, delete-orphan")
    widgets = db.relationship('Widget', secondary='widget_sensors',
                            backref=db.backref('sensors', lazy=True),
                            lazy=True)
    def __repr__(self):
        return f'<Sensor {self.name} ({self.sensor_type})>'

class WidgetSensor(db.Model):
    __tablename__ = 'widget_sensors'
    
    widget_id = db.Column(db.Integer, db.ForeignKey('widgets.widget_id', ondelete='CASCADE'), primary_key=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensors.sensor_id', ondelete='CASCADE'), primary_key=True)
    
    def __repr__(self):
        return f'<WidgetSensor {self.widget_id}:{self.sensor_id}>'

class SensorData(db.Model):
    __tablename__ = 'sensor_data'
    
    data_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sensor_id = db.Column(db.Integer, db.ForeignKey('sensors.sensor_id', ondelete='CASCADE'), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    value = db.Column(db.Float, nullable=False)
    
    def __repr__(self):
        return f'<SensorData {self.sensor_id} @ {self.timestamp}: {self.value}>'