from flask import Flask, render_template, jsonify, session
from flask_cors import CORS
from utils.modbusManager import ModbusManager
from routes import init_routes
from models.models import init_db
from routes.authRoute import login_required
import os,sys,logging
import secrets
def setup_logger():
        # Vytvoření formátovače s barevným výstupem
    formatter = logging.Formatter(
        '\033[92m%(asctime)s\033[0m - \033[94m%(name)s\033[0m - \033[93m%(levelname)s\033[0m - %(message)s'
    )

    # Nastavení handleru pro výstup do konzole
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(logging.DEBUG)

    # Vyčištění existujících handlerů
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    
    # Nastavení root loggeru
    root_logger.addHandler(console_handler)
    root_logger.setLevel(logging.DEBUG)

    # Nastavení Flask loggeru
    app_logger = logging.getLogger('flask.app')
    app_logger.handlers.clear()
    app_logger.addHandler(console_handler)
    app_logger.setLevel(logging.DEBUG)
    
    return app_logger

app = Flask(__name__)

CORS(app, 
    resources={r"/api/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True,
        "expose_headers": ["Content-Range", "X-Content-Range"]
    },
    r"/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
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

setup_logger()
init_db(app)
init_routes(app)

@app.route('/api/data', methods=['GET'])
@login_required
def get_data():
    return jsonify({'message': 'Hello, Flask!'})

@app.route('/hello')
@login_required
def hello():
    return 'Hello, World'

@app.route('/')
@login_required
def index():
    return render_template('index.html')

if __name__ == '__main__':
    logger = setup_logger()
    app.run(debug=True, use_reloader=True)