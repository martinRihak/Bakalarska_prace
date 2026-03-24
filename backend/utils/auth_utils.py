from functools import wraps
from flask import request, jsonify, session, redirect, url_for, make_response, current_app
from services.auth_service import AuthService
from models.models import User

API_BLUEPRINTS = {
    'auth_api',
    'sensors_api',
    'dash_api',
    'modbus_api',
    'widget_api',
    'user_api',
    'weather_api',
    'backUpRoute',
}

def is_api_request():
    if request.blueprint in API_BLUEPRINTS:
        return True
    accept = request.headers.get('Accept', '')
    if request.is_json or 'application/json' in accept:
        return True
    return False

def _unauthorized_response():
    if is_api_request():
        return jsonify({'status': 'error', 'message': 'Nepřihlášený uživatel'}), 401
    return redirect(url_for('auth_views.login'))

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.method == 'OPTIONS':
            return '', 204

        # Kontrola JWT tokenu v Authorization hlavičce pro API požadavky
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            token_data = AuthService.verify_token(token)
            
            # Pokud je token neplatný, zkusíme použít refresh token
            if not token_data:
                refresh_token = request.cookies.get('refresh_token')
                if refresh_token:
                    try:
                        # Ověření refresh tokenu
                        refresh_data = AuthService.verify_token(refresh_token)
                        if refresh_data and refresh_data.get('type') == 'refresh':
                            # Načtení uživatele
                            user = User.query.get(refresh_data['user_id'])
                            if user:
                                # Vytvoření nového access tokenu
                                new_token = AuthService.create_access_token(user.user_id, user.username, user.role)
                                # Znovu ověříme nový token
                                token_data = AuthService.verify_token(new_token)
                                # Nastavíme nový token do hlavičky odpovědi
                                response = make_response(f(*args, **kwargs))
                                response.headers['New-Access-Token'] = new_token
                                return response
                            return _unauthorized_response()
                    except Exception as e:
                        current_app.logger.error(f"Chyba při obnovení tokenu: {e}")
            
            if token_data:
                user = User.query.get(token_data['user_id'])
                if not user:
                    return _unauthorized_response()

                # Token je platný, přidáme data do session pro kompatibilitu
                session['user_id'] = token_data['user_id']
                session['username'] = token_data['username']
                session['role'] = token_data['role']
                AuthService.setup_user_session(user)
                return f(*args, **kwargs)
            
            # Token je neplatný a jde o API požadavek
            if is_api_request():
                return jsonify({'status': 'error', 'message': 'Neplatný token nebo nepřihlášený uživatel'}), 401
        
        # Kontrola běžné session pro klasické požadavky
        if 'user_id' not in session:
            # Pro API požadavky vrátíme JSON
            return _unauthorized_response()
        
        return f(*args, **kwargs)
    return decorated_function
