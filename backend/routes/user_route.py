from flask import Blueprint, jsonify, request, session
from utils.auth_utils import login_required
from services.user_service import UserService

user_api = Blueprint("user_api", __name__)


def _admin_only():
    return session.get("role") == "admin"


@user_api.route("", methods=["GET"])
@user_api.route("/", methods=["GET"])
@login_required
def get_all_users():
    if not _admin_only():
        return jsonify({"status": "error", "message": "Access denied"}), 403
    users = UserService.get_all_users()
    return jsonify(users), 200


@user_api.route("/<int:user_id>", methods=["GET"])
@login_required
def get_user(user_id):
    if not _admin_only():
        return jsonify({"status": "error", "message": "Access denied"}), 403
    user = UserService.get_user_by_id(user_id)
    if not user:
        return jsonify({"status": "error", "message": "User not found"}), 404
    return jsonify(user), 200


@user_api.route("", methods=["POST"])
@user_api.route("/", methods=["POST"])
@login_required
def create_user():
    if not _admin_only():
        return jsonify({"status": "error", "message": "Access denied"}), 403
    data = request.get_json() or {}
    try:
        user = UserService.create_user(data)
        return jsonify({"status": "success", "user": user}), 201
    except ValueError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@user_api.route("/<int:user_id>", methods=["PATCH"])
@login_required
def update_user(user_id):
    if not _admin_only():
        return jsonify({"status": "error", "message": "Access denied"}), 403
    data = request.get_json() or {}
    try:
        user = UserService.update_user(user_id, data)
        if not user:
            return jsonify({"status": "error", "message": "User not found"}), 404
        return jsonify({"status": "success", "user": user}), 200
    except ValueError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@user_api.route("/<int:user_id>", methods=["DELETE"])
@login_required
def delete_user(user_id):
    if not _admin_only():
        return jsonify({"status": "error", "message": "Access denied"}), 403
    if session.get("user_id") == user_id:
        return jsonify({"status": "error", "message": "Admin cannot delete own account"}), 400
    success = UserService.delete_user(user_id)
    if not success:
        return jsonify({"status": "error", "message": "User not found"}), 404
    return jsonify({"status": "success", "message": "User deleted"}), 200


@user_api.route("/<int:user_id>/sensors", methods=["GET"])
@login_required
def get_user_sensors(user_id):
    if not _admin_only():
        return jsonify({"status": "error", "message": "Access denied"}), 403
    sensors = UserService.get_sensors_for_user(user_id)
    if sensors is None:
        return jsonify({"status": "error", "message": "User not found"}), 404
    return jsonify(sensors), 200


@user_api.route("/<int:user_id>/sensors/<int:sensor_id>", methods=["PATCH"])
@login_required
def update_user_sensor(user_id, sensor_id):
    if not _admin_only():
        return jsonify({"status": "error", "message": "Access denied"}), 403
    data = request.get_json() or {}
    try:
        sensor = UserService.update_user_sensor(user_id, sensor_id, data)
        if not sensor:
            return jsonify({"status": "error", "message": "Sensor not found"}), 404
        return jsonify({"status": "success", "sensor": sensor}), 200
    except PermissionError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 403
    except (ValueError, TypeError) as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@user_api.route("/<int:user_id>/sensors", methods=["POST"])
@login_required
def create_sensor_for_user(user_id):
    if not _admin_only():
        return jsonify({"status": "error", "message": "Access denied"}), 403
    data = request.get_json() or {}
    try:
        sensor = UserService.create_sensor_for_user(user_id, data)
        if sensor is None:
            return jsonify({"status": "error", "message": "User not found"}), 404
        return jsonify({"status": "success", "sensor": sensor}), 201
    except ValueError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400


@user_api.route("/<int:user_id>/sensors/<int:sensor_id>", methods=["POST"])
@login_required
def add_existing_sensor_to_user(user_id, sensor_id):
    if not _admin_only():
        return jsonify({"status": "error", "message": "Access denied"}), 403
    try:
        sensor = UserService.add_existing_sensor_to_user(user_id, sensor_id)
        if sensor is None:
            return jsonify({"status": "error", "message": "User not found"}), 404
        return jsonify({"status": "success", "sensor": sensor}), 200
    except ValueError as exc:
        return jsonify({"status": "error", "message": str(exc)}), 400
