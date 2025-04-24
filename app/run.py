from app_factory import create_app
from routes import init_routes
from models.models import init_db
from views.auth_views import auth_views
from routes.authRoute import login_required
from flask import render_template, jsonify

app = create_app()
init_db(app)
init_routes(app)

@app.route('/api/data', methods=['GET'])
@login_required
def get_data():
    return jsonify({'message': 'Hello, Flask!'})

@app.route('/hello')
@login_required
def hello():
    return 'Hello, World'

@app.route('/')
@login_required
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)