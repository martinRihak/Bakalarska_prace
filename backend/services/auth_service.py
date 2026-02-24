from datetime import datetime, timedelta, timezone
import jwt
from flask import current_app
from werkzeug.security import check_password_hash, generate_password_hash
from models.models import User, db
import os

class AuthService:
    ACCESS_TOKEN_EXPIRATION = 1 * 60  # 15 minutes
    REFRESH_TOKEN_EXPIRATION = 7 * 24 * 60 * 60  # 7 days

    @staticmethod
    def _get_jwt_secret():
        return current_app.config.get('JWT_SECRET') or current_app.config.get('SECRET_KEY')

    @staticmethod
    def create_access_token(user_id, username, role):
        """Creates a short-lived JWT access token"""
        payload = {
            'user_id': user_id,
            'username': username,
            'role': role,
            'exp': datetime.now(tz=timezone.utc) + timedelta(seconds=AuthService.ACCESS_TOKEN_EXPIRATION),
            'type': 'access'
        }
        return jwt.encode(payload, AuthService._get_jwt_secret(), algorithm='HS256')

    @staticmethod
    def create_refresh_token(user_id):
        """Creates a long-lived JWT refresh token"""
        payload = {
            'user_id': user_id,
            'exp': datetime.now(tz=timezone.utc) + timedelta(seconds=AuthService.REFRESH_TOKEN_EXPIRATION),
            'type': 'refresh'
        }
        return jwt.encode(payload, AuthService._get_jwt_secret(), algorithm='HS256')

    @staticmethod
    def verify_token(token):
        """Verifies JWT token and returns token data"""
        try:
            data = jwt.decode(token, AuthService._get_jwt_secret(), algorithms=['HS256'])
            return data
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            return None

    @staticmethod
    def setup_user_session(user):
        """Updates last login time"""
        user.last_login = db.func.now()
        db.session.commit()

    @staticmethod
    def authenticate_user(username, password):
        """Authenticates user and returns user object if successful"""
        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password_hash, password):
            return None
        return user

    @staticmethod
    def register_user(username, email, password):
        """Registers a new user"""
        if User.query.filter_by(username=username).first():
            raise ValueError("Uživatelské jméno již existuje")
        if User.query.filter_by(email=email).first():
            raise ValueError("E-mail již existuje")
        
        password_hash = generate_password_hash(password)
        new_user = User(
            username=username,
            password_hash=password_hash,
            email=email,
            role='user'
        )
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @staticmethod
    def load_user_sensors(user_id):
        """Loads sensors for the user via ModbusManager"""
        modbus_manager = current_app.config.get('MODBUS_MANAGER')
        if modbus_manager:
            try:
                success = modbus_manager.load_user_sensors(user_id)
                if success:
                    current_app.logger.info(f"Senzory načteny pro uživatele {user_id}")
                else:
                    current_app.logger.warning(f"Žádné senzory nebyly nalezeny pro uživatele {user_id}")
                return success
            except Exception as e:
                current_app.logger.error(f"Chyba při načítání senzorů pro uživatele {user_id}: {e}")
                return False
        return False

    @staticmethod
    def refresh_access_token(refresh_token):
        """Refreshes access token using refresh token"""
        token_data = AuthService.verify_token(refresh_token)
        if not token_data or token_data.get('type') != 'refresh':
            raise ValueError("Neplatný refresh token")
        
        user = User.query.get(token_data['user_id'])
        if not user:
            raise ValueError("Uživatel nenalezen")
        
        return AuthService.create_access_token(user.user_id, user.username, user.role)
