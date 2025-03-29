from .sensoreRoute import api_sensor

def init_routes(app):
    app.register_blueprint(api_sensor,url_prefix='/api')