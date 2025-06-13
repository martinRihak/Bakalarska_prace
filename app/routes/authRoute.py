from flask import Blueprint, request, jsonify, session, redirect, url_for, current_app, make_response
from werkzeug.security import check_password_hash, generate_password_hash
from models.models import User, db
from datetime import datetime,timedelta,timezone
from functools import wraps
import jwt, redis,asyncio

auth_api = Blueprint('auth_api', __name__)
JWT_SECRET_KEY = 'tajny_klic_pro_podpis_jwt'
ACCESS_TOKEN_EXPIRATION = 15 * 60  # 15 minut
REFRESH_TOKEN_EXPIRATION = 7 * 24 * 60 * 60  # 7 dní

def setup_user_session(user):
    # Aktualizace posledního přihlášení
    user.last_login = db.func.now()
    db.session.commit()

def create_access_token(user_id, username, role):
    """Vytvoří krátkodobý JWT access token"""
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.now(tz=timezone.utc) + timedelta(seconds=ACCESS_TOKEN_EXPIRATION),
        'type': 'access'
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm='HS256')

def create_refresh_token(user_id):
    """Vytvoří dlouhodobý JWT refresh token"""
    payload = {
        'user_id': user_id,
        'exp': datetime.now(tz=timezone.utc) + timedelta(seconds=REFRESH_TOKEN_EXPIRATION),
        'type': 'refresh'
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
            
            # Pokud je token neplatný, zkusíme použít refresh token
            if not token_data:
                refresh_token = request.cookies.get('refresh_token')
                if refresh_token:
                    try:
                        # Ověření refresh tokenu
                        refresh_data = verify_token(refresh_token)
                        if refresh_data and refresh_data.get('type') == 'refresh':
                            # Načtení uživatele
                            user = User.query.get(refresh_data['user_id'])
                            if user:
                                # Vytvoření nového access tokenu
                                new_token = create_access_token(user.user_id, user.username, user.role)
                                # Znovu ověříme nový token
                                token_data = verify_token(new_token)
                                # Nastavíme nový token do hlavičky odpovědi
                                response = make_response(f(*args, **kwargs))
                                response.headers['New-Access-Token'] = new_token
                                return response
                    except Exception as e:
                        current_app.logger.error(f"Chyba při obnovení tokenu: {e}")
            
            if token_data:
                user = User.query.get(token_data['user_id'])
                if user:
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
   # print(user) 
    if not user or not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({'status': 'error', 'message': 'Nesprávné přihlašovací údaje'}), 401
    
    # Vytvoření access a refresh tokenů
    access_token = create_access_token(user.user_id, user.username, user.role)
    refresh_token = create_refresh_token(user.user_id)
    
    # Uložení refresh tokenu do HTTP-only cookie
    response = jsonify({
        'status': 'success',
        'message': 'Přihlášení bylo úspěšné',
        'user': {
            'id': user.user_id,
            'username': user.username,
            'email': user.email,
            'role': user.role
        },
        'token': access_token  # Pro zpětnou kompatibilitu
    })
    
    # Nastavení HTTP-only cookie pro refresh token
    response.set_cookie(
        'refresh_token',
        refresh_token,
        httponly=True,
        secure=False,  # Jen pro HTTPS
        samesite='Strict',
        max_age=REFRESH_TOKEN_EXPIRATION
    )
    
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
            
    return response
    
    
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

@auth_api.route('/refresh-token', methods=['POST'])
def refresh_token():
    refresh_token = request.cookies.get('refresh_token')
    if not refresh_token:
        return jsonify({'status': 'error', 'message': 'Refresh token chybí'}), 401
    
    try:
        # Ověření refresh tokenu
        token_data = verify_token(refresh_token)
        if not token_data or token_data.get('type') != 'refresh':
            return jsonify({'status': 'error', 'message': 'Neplatný refresh token'}), 401
        
        # Načtení uživatele
        user = User.query.get(token_data['user_id'])
        if not user:
            return jsonify({'status': 'error', 'message': 'Uživatel nenalezen'}), 401
        
        # Vytvoření nového access tokenu
        access_token = create_access_token(user.user_id, user.username, user.role)
        
        return jsonify({
            'status': 'success',
            'token': access_token
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 401