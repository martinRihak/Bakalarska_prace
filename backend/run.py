from flask import Flask, render_template, jsonify, session
from flask_cors import CORS
from utils.modbusManagerNew import ModbusManager_2_0
from routes import init_routes
from models.models import init_db
from utils.auth_utils import login_required
import os,sys,logging
import asyncio
import secrets
def _get_env_bool(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}

def _get_env_list(name, default):
    value = os.environ.get(name)
    if not value:
        return default
    return [item.strip() for item in value.split(",") if item.strip()]
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

is_production = os.environ.get("FLASK_ENV") == "production" or os.environ.get("ENV") == "production" or os.environ.get("APP_ENV") == "production"
cors_origins = _get_env_list("CORS_ORIGINS", ["http://127.0.0.1:5173"])

app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or secrets.token_hex(16)
app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET') or app.config['SECRET_KEY']
app.config['COOKIE_SECURE'] = _get_env_bool('COOKIE_SECURE', default=is_production)
app.config['COOKIE_SAMESITE'] = os.environ.get('COOKIE_SAMESITE') or 'Strict'
app.config['COOKIE_DOMAIN'] = os.environ.get('COOKIE_DOMAIN') or None
app.config['CORS_ORIGINS'] = cors_origins

CORS(app, 
    resources={r"/api/*": {
        "origins": cors_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True,
        "expose_headers": ["Content-Range", "X-Content-Range"]
    },
    r"/*": {
        "origins": cors_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
        "allow_headers": ["Content-Type", "Authorization", "Accept"],
        "supports_credentials": True,
        "expose_headers": ["Content-Range", "X-Content-Range"]
    }},
    supports_credentials=True
)


logger = setup_logger()
if not os.environ.get('JWT_SECRET'):
    logger.warning("JWT_SECRET is not set; falling back to SECRET_KEY")
init_db(app)
# Inicializace ModbusManager v kontextu aplikace
with app.app_context():
    try:
        modbus_manager = ModbusManager_2_0(app=app)
        app.config['MODBUS_MANAGER'] = modbus_manager
        logger.info("ModbusManager successfully initialized")
    except Exception as e:
        logger.error(f"Failed to initialize ModbusManager: {e}")
        sys.exit(1)


init_routes(app)


@app.route('/')
@login_required
def index():
    return render_template('index.html')

if __name__ == '__main__':
    debug = _get_env_bool("FLASK_DEBUG", default=not is_production)
    host = os.environ.get("FLASK_HOST", "0.0.0.0")
    port = int(os.environ.get("FLASK_PORT", "5000"))
    app.run(host=host, port=port, debug=debug, use_reloader=False)
    
