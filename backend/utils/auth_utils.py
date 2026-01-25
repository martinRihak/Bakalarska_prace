from functools import wraps
from flask import request, jsonify, session, redirect, url_for, make_response, current_app
from services.auth_service import AuthService
from models.models import User

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
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
                    except Exception as e:
                        current_app.logger.error(f"Chyba při obnovení tokenu: {e}")
            
            if token_data:
                user = User.query.get(token_data['user_id'])
                if user:
                    # Token je platný, přidáme data do session pro kompatibilitu
                    session['user_id'] = token_data['user_id']
                    session['username'] = token_data['username']
                    session['role'] = token_data['role']
                
                AuthService.setup_user_session(user)
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
