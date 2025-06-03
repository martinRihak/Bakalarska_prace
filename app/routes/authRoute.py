from flask import Blueprint, request, jsonify, session, redirect, url_for, current_app
from werkzeug.security import check_password_hash, generate_password_hash
from models.models import User, db
from datetime import datetime,timedelta,timezone
from functools import wraps
import jwt, redis,asyncio

auth_api = Blueprint('auth_api', __name__)
JWT_SECRET_KEY = 'tajny_klic_pro_podpis_jwt'
JWT_EXPIRATION = 24 * 60 * 60

def setup_user_session(user):
    # Nastavení modbus
    modbus_manager = current_app.config['MODBUS_MANAGER']
        
    try:
        success = modbus_manager.load_user_sensors(user.user_id)
        if success:
            current_app.logger.info(f"Senzory načteny pro uživatele {user.user_id}")
        else:
            current_app.logger.warning(f"Žádné senzory nebyly nalezeny pro uživatele {user.user_id}")
    except Exception as e:
        current_app.logger.error(f"Chyba při načítání senzorů pro uživatele {user.user_id}: {e}")
    
        
    # Aktualizace posledního přihlášení
    user.last_login = db.func.now()
    db.session.commit()
    
    
def create_token(user_id, username, role):
    """Vytvoří JWT token"""
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.now(tz=timezone.utc) + timedelta(seconds=JWT_EXPIRATION)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')

def verify_token(token):
    """Ověří JWT token a vrátí data z tokenu"""
    try:
        data = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        return data
    except jwt.ExpiredSignatureError:
        return None  # Token vypršel
    except jwt.InvalidTokenError:
        return None  # Neplatný token
    
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Kontrola JWT tokenu v Authorization hlavičce pro API požadavky
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            token_data = verify_token(token)
            print(token_data)   
            user = User.query.get(token_data['user_id'])
            if token_data:
                # Token je platný, přidáme data do session pro kompatibilitu
                session['user_id'] = token_data['user_id']
                session['username'] = token_data['username']
                session['role'] = token_data['role']
                
                setup_user_session(user)
                return f(*args, **kwargs)
            
            # Token je neplatný a jde o API požadavek
            if request.path.startswith('/api/'):
                return jsonify({'status': 'error', 'message': 'Neplatný token nebo nepřihlášený uživatel'}), 401
        
        # Kontrola běžné session pro klasické požadavky
        if 'user_id' not in session:
            # Pro API požadavky vrátíme JSON
            if request.path.startswith('/api/'):
                return jsonify({'status': 'error', 'message': 'Nepřihlášený uživatel'}), 401
            # Jinak přesměrujeme na přihlášení
            return redirect(url_for('auth_views.login'))
        
        return f(*args, **kwargs)
    return decorated_function


@auth_api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'status': 'error', 'message': 'Chybějící uživatelské jméno nebo heslo'}), 400
    
    user = User.query.filter_by(username=data.get('username')).first()
    print(user) 
    if not user or not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({'status': 'error', 'message': 'Nesprávné přihlašovací údaje'}), 401
    
    token = create_token(user.user_id,user.username,user.role)
    
    # Uložení informací o přihlášení do session
    session['user_id'] = user.user_id
    session['username'] = user.username
    session['role'] = user.role
    
    # Aktualizace posledního přihlášení
    user.last_login = db.func.now()
    db.session.commit()
    
    # Použít current_app místo app
    modbus_manager = current_app.config['MODBUS_MANAGER']
    with current_app.app_context():
        try:
            success = modbus_manager.load_user_sensors(user.user_id)
            if success:
                current_app.logger.info(f"Senzory načteny pro uživatele {user.user_id}")
            else:
                current_app.logger.warning(f"Žádné senzory nebyly nalezeny pro uživatele {user.user_id}")
        except Exception as e:
            current_app.logger.error(f"Chyba při načítání senzorů pro uživatele {user.user_id}: {e}")
    
    
    return jsonify({
        'status': 'success',
        'message': 'Přihlášení bylo úspěšné',
        'user': {
            'id': user.user_id,
            'username': user.username,
            'email': user.email,
            'role': user.role
        },
        'token' : token
    }), 200

@auth_api.route('/logout', methods=['POST'])
def logout():
    if 'user_id' in session:
        # Get ModbusManager from app config
        modbus_manager = current_app.config['MODBUS_MANAGER']
        modbus_manager.release_resources(session['user_id'])
    session.clear()
    return jsonify({'status': 'success', 'message': 'Odhlášení proběhlo úspěšně'}), 200

@auth_api.route('/status', methods=['GET'])
def auth_status():
    # Kontrola JWT tokenu
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        token_data = verify_token(token)
        
        if token_data:
            return jsonify({
                'status': 'authenticated',
                'user': {
                    'user_id': token_data['user_id'],
                    'username': token_data['username'],
                    'role': token_data['role']
                }
            })
    
    # Kontrola session
    if 'user_id' in session:
        return jsonify({
            'status': 'authenticated',
            'user': {
                'user_id': session['user_id'],
                'username': session['username'],
                'role': session['role']
            }
        })
    
    return jsonify({'status': 'unauthenticated'})

@auth_api.route('/healthcheck', methods=['GET'])
def healthcheck():
    """Endpoint pro kontrolu stavu serveru"""
    try:
        # Zkusíme připojení k databázi
        db.session.execute('SELECT 1')
        return jsonify({
            'status': 'online',
            'database': 'connected',
            'timestamp': datetime.now().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@auth_api.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('password') or not data.get('email'):
        return jsonify({'status': 'error', 'message': 'Chybějící údaje pro registraci'}), 400
    
    # Kontrola, zda uživatel již neexistuje
    existing_user = User.query.filter_by(username=data.get('username')).first()
    if existing_user:
        return jsonify({'status': 'error', 'message': 'Uživatelské jméno již existuje'}), 400
    
    existing_email = User.query.filter_by(email=data.get('email')).first()
    if existing_email:
        return jsonify({'status': 'error', 'message': 'E-mail již existuje'}), 400
    
    user_id = User.query.count() + 1

    # Vytvoření nového uživatele
    password_hash = generate_password_hash(data.get('password'))
    new_user = User(
        user_id=user_id,
        username=data.get('username'),
        password_hash=password_hash,
        email=data.get('email'),
        role='user'
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Registrace proběhla úspěšně',
        'user': {
            'id': new_user.user_id,
            'username': new_user.username,
            'email': new_user.email,
            'role': new_user.role
        }
    }), 201