from .sensoreRoute import api_sensor
from .authRoute import auth_api

def init_routes(app):
    app.register_blueprint(api_sensor, url_prefix='/api')
    app.register_blueprint(auth_api, url_prefix='/auth')

    