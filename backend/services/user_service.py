from werkzeug.security import generate_password_hash
from models.models import User, Sensor, UserSensor, db


class UserService:
    @staticmethod
    def serialize_user(user):
        return {
            "user_id": user.user_id,
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login.isoformat() if user.last_login else None,
        }

    @staticmethod
    def get_all_users():
        users = User.query.order_by(User.user_id.asc()).all()
        return [UserService.serialize_user(user) for user in users]

    @staticmethod
    def get_user_by_id(user_id):
        user = User.query.get(user_id)
        if not user:
            return None
        return UserService.serialize_user(user)

    @staticmethod
    def create_user(data):
        username = (data.get("username") or "").strip()
        email = (data.get("email") or "").strip()
        password = data.get("password")
        role = (data.get("role") or "user").strip().lower()

        if not username or not email or not password:
            raise ValueError("Missing required fields: username, email, password")
        if role not in {"user", "admin"}:
            raise ValueError("Invalid role")
        if User.query.filter_by(username=username).first():
            raise ValueError("Username already exists")
        if User.query.filter_by(email=email).first():
            raise ValueError("Email already exists")

        new_user = User(
            username=username,
            email=email,
            role=role,
            password_hash=generate_password_hash(password),
        )
        db.session.add(new_user)
        db.session.commit()
        return UserService.serialize_user(new_user)

    @staticmethod
    def update_user(user_id, data):
        user = User.query.get(user_id)
        if not user:
            return None

        if "username" in data:
            username = (data.get("username") or "").strip()
            if not username:
                raise ValueError("Username cannot be empty")
            existing = User.query.filter_by(username=username).first()
            if existing and existing.user_id != user_id:
                raise ValueError("Username already exists")
            user.username = username

        if "email" in data:
            email = (data.get("email") or "").strip()
            if not email:
                raise ValueError("Email cannot be empty")
            existing = User.query.filter_by(email=email).first()
            if existing and existing.user_id != user_id:
                raise ValueError("Email already exists")
            user.email = email

        if "role" in data:
            role = (data.get("role") or "").strip().lower()
            if role not in {"user", "admin"}:
                raise ValueError("Invalid role")
            user.role = role

        if "password" in data:
            password = data.get("password")
            if not password:
                raise ValueError("Password cannot be empty")
            user.password_hash = generate_password_hash(password)

        db.session.commit()
        return UserService.serialize_user(user)

    @staticmethod
    def delete_user(user_id):
        user = User.query.get(user_id)
        if not user:
            return False
        db.session.delete(user)
        db.session.commit()
        return True

    @staticmethod
    def serialize_sensor(sensor):
        return {
            "sensor_id": sensor.sensor_id,
            "parent_sensor_id": sensor.parent_sensor_id,
            "name": sensor.name,
            "sensor_type": sensor.sensor_type,
            "address": sensor.address,
            "functioncode": sensor.functioncode,
            "bit": sensor.bit,
            "scaling": sensor.scaling,
            "unit": sensor.unit,
            "min_value": sensor.min_value,
            "max_value": sensor.max_value,
            "sampling_rate": sensor.sampling_rate,
            "is_active": sensor.is_active,
            "created_at": sensor.created_at.isoformat() if sensor.created_at else None,
            "updated_at": sensor.updated_at.isoformat() if sensor.updated_at else None,
        }

    @staticmethod
    def get_sensors_for_user(user_id):
        user = User.query.get(user_id)
        if not user:
            return None
        sensors = Sensor.query.join(UserSensor).filter(UserSensor.user_id == user_id).all()
        return [UserService.serialize_sensor(sensor) for sensor in sensors]

    @staticmethod
    def update_user_sensor(user_id, sensor_id, data):
        association = UserSensor.query.filter_by(user_id=user_id, sensor_id=sensor_id).first()
        if not association:
            raise PermissionError("Sensor does not belong to this user")

        sensor = Sensor.query.get(sensor_id)
        if not sensor:
            return None

        allowed_fields = {
            "name": str,
            "sensor_type": str,
            "unit": str,
            "sampling_rate": int,
            "min_value": float,
            "max_value": float,
            "is_active": bool,
        }

        for key, caster in allowed_fields.items():
            if key not in data:
                continue
            value = data.get(key)
            if value is None:
                setattr(sensor, key, None)
                continue
            if caster is bool:
                if isinstance(value, str):
                    value = value.strip().lower() in {"1", "true", "yes", "on"}
                else:
                    value = bool(value)
            else:
                value = caster(value)
            setattr(sensor, key, value)

        db.session.commit()
        return UserService.serialize_sensor(sensor)
