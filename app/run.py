from flask import Flask, render_template, jsonify
from flask_cors import CORS
from routes import init_routes
from models.models import init_db
app = Flask(__name__)
CORS(app)

#Init databaze
init_db(app)

# Registrace blueprintu
init_routes(app)


@app.route('/api/data',methods=['GET'])
def get_data():
    return jsonify({'message': 'Hello, Flask!'})

@app.route('/hello')
def hello():
    return 'Hello, World'

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)