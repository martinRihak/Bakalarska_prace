from flask import Blueprint, request, jsonify, session, redirect, url_for
from werkzeug.security import check_password_hash, generate_password_hash
from models.models import User, db
from functools import wraps

auth_api = Blueprint('auth_api', __name__)

# Decorator pro kontrolu přihlášení uživatele
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            # Pokud jde o API požadavek, vrátíme JSON odpověď
            if request.path.startswith('/api/') or request.headers.get('Accept') == 'application/json':
                return jsonify({'status': 'error', 'message': 'Přístup odepřen. Je vyžadováno přihlášení.'}), 401
            # Jinak přesměrujeme na přihlašovací stránku
            return redirect(url_for('auth_views.login_page'))
        return f(*args, **kwargs)
    return decorated_function

@auth_api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'status': 'error', 'message': 'Chybějící uživatelské jméno nebo heslo'}), 400
    
    user = User.query.filter_by(username=data.get('username')).first()
    
    if not user or not check_password_hash(user.password_hash, data.get('password')):
        return jsonify({'status': 'error', 'message': 'Nesprávné přihlašovací údaje'}), 401
    
    # Uložení informací o přihlášení do session
    session['user_id'] = user.user_id
    session['username'] = user.username
    session['role'] = user.role
    
    # Aktualizace posledního přihlášení
    user.last_login = db.func.now()
    db.session.commit()
    
    return jsonify({
        'status': 'success',
        'message': 'Přihlášení bylo úspěšné',
        'user': {
            'id': user.user_id,
            'username': user.username,
            'email': user.email,
            'role': user.role
        }
    }), 200

@auth_api.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status': 'success', 'message': 'Odhlášení proběhlo úspěšně'}), 200

@auth_api.route('/status', methods=['GET'])
def user_status():
    if 'user_id' in session:
        user = User.query.get(session['user_id'])
        if user:
            return jsonify({
                'status': 'authenticated',
                'user': {
                    'id': user.user_id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role
                }
            }), 200
    
    return jsonify({'status': 'not_authenticated'}), 200

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
    
    # Vytvoření nového uživatele
    password_hash = generate_password_hash(data.get('password'))
    new_user = User(
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