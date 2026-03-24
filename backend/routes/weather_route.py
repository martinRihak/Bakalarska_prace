from flask import Blueprint, current_app, jsonify, request
from services.weather_service import WeatherService
from utils.auth_utils import login_required

weather_api = Blueprint("weather_api", __name__)

@weather_api.route("", methods=["GET", "OPTIONS"])
@weather_api.route("/", methods=["GET"])
@login_required
def get_weather():
    latitude = request.args.get("latitude", "52.52437").strip()
    longitude = request.args.get("longitude", "13.41053").strip()
    location_name = request.args.get("locationName", "").strip() or None

    try:
        weather_data = WeatherService.get_weather(latitude, longitude, location_name)
        return jsonify(weather_data), 200
    except ValueError as error:
        return jsonify({"error": f"Invalid coordinates: {error}"}), 400
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 502
    except Exception as error:
        current_app.logger.error(f"Weather endpoint failed: {error}")
        return jsonify({"error": "Nepodařilo se načíst data počasí"}), 500
