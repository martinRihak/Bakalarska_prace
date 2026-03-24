
from .authRoute import auth_api
from .sensorsRoute import sensors_api
from .dashBoardRoute import dashboard_api
from .backUpRoute import backUpRoute
from .modbusRoute import modbus_api
from .widgetRoute import widget_api
from .user_route import user_api

def init_routes(app):
    app.register_blueprint(auth_api, url_prefix='/auth')
    app.register_blueprint(sensors_api, url_prefix='/sensors')
    app.register_blueprint(dashboard_api, url_prefix='/dashboard')
    app.register_blueprint(modbus_api, url_prefix='/modbus')
    app.register_blueprint(widget_api, url_prefix='/widget')
    app.register_blueprint(user_api, url_prefix='/users')
    app.register_blueprint(backUpRoute)

    
