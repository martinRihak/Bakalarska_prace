from flask import Flask, render_template, jsonify, redirect, url_for, session
from flask_cors import CORS
from routes import init_routes
from models.models import init_db
from views.auth_views import auth_views
from routes.authRoute import login_required
import os
import secrets

app = Flask(__name__)
CORS(app, 
     resources={r"/*": {
         "origins": ["http://localhost:5173"],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization"],
         "supports_credentials": True,
         "expose_headers": ["Content-Range", "X-Content-Range"]
     }},
     supports_credentials=True
)

# Konfigurace secret_key pro session
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or secrets.token_hex(16)

#Init databaze
init_db(app)

# Registrace blueprintu
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