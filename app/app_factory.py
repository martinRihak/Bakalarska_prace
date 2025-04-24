from flask import Flask
from flask_cors import CORS
from utils.modbusManager import ModbusManager
import os
import secrets

def create_app():
    app = Flask(__name__)
    
    CORS(app, 
         resources={r"/*": {
             "origins": ["http://localhost:5173"],
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True,
             "expose_headers": ["Content-Range", "X-Content-Range"]
         }},
         supports_credentials=True
    )

    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or secrets.token_hex(16)
    
    # Create ModbusManager instance within app context
    with app.app_context():
        modbus_manager = ModbusManager()
        app.config['MODBUS_MANAGER'] = modbus_manager
    
    return app
