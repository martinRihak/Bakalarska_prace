
from .auth_route import auth_api
from .sensors_route import sensors_api
from .dashboard_route import dashboard_api
from .backup_route import backUpRoute
from .modbus_route import modbus_api
from .widget_route import widget_api
from .user_route import user_api
from .weather_route import weather_api

def init_routes(app):
    app.register_blueprint(auth_api, url_prefix='/auth')
    app.register_blueprint(sensors_api, url_prefix='/sensors')
    app.register_blueprint(dashboard_api, url_prefix='/dashboard')
    app.register_blueprint(modbus_api, url_prefix='/modbus')
    app.register_blueprint(widget_api, url_prefix='/widget')
    app.register_blueprint(user_api, url_prefix='/users')
    app.register_blueprint(weather_api,url_prefix='/weather')
    app.register_blueprint(backUpRoute)

    
