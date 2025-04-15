from .sensoreRoute import api_sensor
from .authRoute import auth_api
from .sensors import sensors
from .backUpRoute import backUpRoute

def init_routes(app):
    app.register_blueprint(api_sensor, url_prefix='/api')
    app.register_blueprint(auth_api, url_prefix='/auth')
    app.register_blueprint(sensors)
    app.register_blueprint(backUpRoute)

    