from flask import Blueprint, request, jsonify, session, current_app
from models.models import db
from datetime import datetime
from services.auth_service import AuthService

auth_api = Blueprint('auth_api', __name__)

@auth_api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'status': 'error', 'message': 'Chybějící uživatelské jméno nebo heslo'}), 400
    
    user = AuthService.authenticate_user(data.get('username'), data.get('password'))
    
    if not user:
        return jsonify({'status': 'error', 'message': 'Nesprávné přihlašovací údaje'}), 401
    
    # Vytvoření access a refresh tokenů
    access_token = AuthService.create_access_token(user.user_id, user.username, user.role)
    refresh_token = AuthService.create_refresh_token(user.user_id)
    
    response = jsonify({
        'status': 'success',
        'message': 'Přihlášení bylo úspěšné',
        'user': {
            'id': user.user_id,
            'username': user.username,
            'email': user.email,
            'role': user.role
        },
        'token': access_token
    })
    
    # Nastavení HTTP-only cookie pro refresh token
    secure = current_app.config.get('COOKIE_SECURE', False)
    samesite = current_app.config.get('COOKIE_SAMESITE', 'Strict')
    domain = current_app.config.get('COOKIE_DOMAIN')
    response.set_cookie(
        'refresh_token',
        refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        domain=domain,
        path='/auth',
        max_age=AuthService.REFRESH_TOKEN_EXPIRATION
    )
    
    # Načtení senzorů
    with current_app.app_context():
        AuthService.load_user_sensors(user.user_id)
            
    return response

@auth_api.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status': 'success', 'message': 'Odhlášení proběhlo úspěšně'}), 200

@auth_api.route('/status', methods=['GET'])
def auth_status():
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        token_data = AuthService.verify_token(token)
        
        if token_data:
            return jsonify({
                'status': 'authenticated',
                'user': {
                    'user_id': token_data['user_id'],
                    'username': token_data['username'],
                    'role': token_data['role']
                }
            })
    
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
    try:
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
    
    try:
        new_user = AuthService.register_user(data.get('username'), data.get('email'), data.get('password'))
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
    except ValueError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

@auth_api.route('/refresh-token', methods=['POST'])
def refresh_token():
    refresh_token = request.cookies.get('refresh_token')
    if not refresh_token:
        return jsonify({'status': 'error', 'message': 'Refresh token chybí'}), 401
    
    try:
        access_token = AuthService.refresh_access_token(refresh_token)
        return jsonify({
            'status': 'success',
            'token': access_token
        })
    except ValueError as e:
        return jsonify({'status': 'error', 'message': str(e)}), 401
