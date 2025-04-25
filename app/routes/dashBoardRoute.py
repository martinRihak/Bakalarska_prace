from flask import Blueprint, request, jsonify, session
from models.models import Dashboard, User, db, DashboardWidget, Widget, Sensor, SensorData
from datetime import datetime, timedelta
from sqlalchemy import func
from routes.authRoute import login_required

dashboard_api = Blueprint('dash_api', __name__)

def aggregate_sensor_data(sensor_id, widget_type, start_time=None):
    query = SensorData.query.filter(SensorData.sensor_id == sensor_id)
    
    if start_time:
        query = query.filter(SensorData.timestamp >= start_time)
    
    if widget_type == "area":
        # For area charts, get all data points for smooth visualization
        return query.order_by(SensorData.timestamp.asc()).all()
    elif widget_type in ["radialBar", "enhancedRadialBar"]:
        # For radial bar charts, only get the latest value
        return query.order_by(SensorData.timestamp.desc()).limit(1).all()
    else:
        # For line charts (default), get all data points
        return query.order_by(SensorData.timestamp.asc()).all()

@dashboard_api.route('/widget/<int:widget_id>/data', methods=['GET'])
@login_required
def get_widget_data(widget_id):
    try:
        widget = Widget.query.get_or_404(widget_id)
        time_range = request.args.get('timeRange', '24h')  # Default to last 24 hours
        
        # Calculate start time based on time range
        now = datetime.utcnow()
        if time_range == '24h':
            start_time = now - timedelta(hours=24)
        elif time_range == '7d':
            start_time = now - timedelta(days=7)
        elif time_range == '30d':
            start_time = now - timedelta(days=30)
        else:
            start_time = now - timedelta(hours=24)  # Default
            
        response_data = []
        for sensor in widget.sensors:
            aggregated_data = aggregate_sensor_data(sensor.sensor_id, widget.widget_type, start_time)
            
            # For all chart types, we're now using a consistent data format
            data = [{
                'timestamp': row.timestamp.isoformat(),
                'value': float(row.value)
            } for row in aggregated_data]
                
            sensor_data = {
                'sensor_id': sensor.sensor_id,
                'name': sensor.name,
                'unit': sensor.unit,
                'data': data
            }
            response_data.append(sensor_data)
            
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_api.route('/userDashBoards', methods=['GET'])
@login_required
def getDashBoards():
    # Získání user_id z session
    user_id = session.get('user_id')
    
    # Načtení všech dashboardů uživatele
    dashboards = Dashboard.query.filter_by(user_id=user_id).all()
    
    if not dashboards:
        return jsonify([])
    
    dashboards_data = [{
        'dashboard_id': dashboard.dashboard_id,
        'name': dashboard.name,
        'description': dashboard.description,
        'created_at': dashboard.created_at,
        'updated_at': dashboard.updated_at
    } for dashboard in dashboards]
    
    return jsonify(dashboards_data)


@dashboard_api.route('/widgets', methods=['GET'])
@login_required
def get_dashboard_widgets():
    print("Getting dashboard widgets...")
    # Získání user_id z session
    user_id = session.get('user_id', 1)  # Fallback na ID 1 pro testování
    dashboard_id = request.args.get('dashboard_id', 1)  # Získání dashboard_id z query parametru
    
    print(f"Looking for dashboard_id: {dashboard_id} and user_id: {user_id}")
    
    # Ověření, že dashboard patří uživateli
    dashboard = Dashboard.query.filter_by(
        dashboard_id=dashboard_id,
        user_id=user_id
    ).first()
    
    if not dashboard:
        return jsonify({'error': 'Dashboard not found or access denied'}), 404

    # Načtení widgetů pro daný dashboard
    dashboard_widgets = DashboardWidget.query.join(Widget).filter(
        DashboardWidget.dashboard_id == dashboard_id
    ).all()

    if not dashboard_widgets:
        return jsonify([])

    widgets_data = []
    for dashboard_widget in dashboard_widgets:
        widget = Widget.query.get(dashboard_widget.widget_id)
        
        widget_data = {
            'widget_id': dashboard_widget.widget_id,
            'widget_type': widget.widget_type,
            'title': widget.title,
            'position_x': dashboard_widget.position_x,
            'position_y': dashboard_widget.position_y,
            'width': dashboard_widget.width,
            'height': dashboard_widget.height,
            'sensors': [],
            'has_data': False  # Přidáno pro indikaci dostupnosti dat
        }
        
        # Přidání informací o senzorech
        for sensor in widget.sensors:
            # Zkontrolovat, zda má senzor nějaká data
            has_sensor_data = SensorData.query.filter_by(sensor_id=sensor.sensor_id).first() is not None
            
            sensor_data = {
                'sensor_id': sensor.sensor_id,
                'name': sensor.name,
                'sensor_type': sensor.sensor_type,
                'unit': sensor.unit,    
                'min_value': sensor.min_value,
                'max_value': sensor.max_value,
                'sampling_rate': sensor.sampling_rate,
                'has_data': has_sensor_data
            }
            widget_data['sensors'].append(sensor_data)
            if has_sensor_data:
                widget_data['has_data'] = True
            
        # Pokud widget nemá žádná data, přidáme informační zprávu
        if not widget_data['has_data']:
            widget_data['error_message'] = "Pro tento widget nejsou k dispozici žádná data ze senzorů."
            
        widgets_data.append(widget_data)

    return jsonify(widgets_data)

@login_required
@dashboard_api.route('/create', methods=['POST'])
def create_dashboard():
    user_id = session.get('user_id')  # Fallback na ID 1 pro testování
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
        
    new_dashboard = Dashboard(
        user_id=user_id,
        name=data['name'],
        description=data.get('description', '')
    )
    
    db.session.add(new_dashboard)
    db.session.commit()
    
    return jsonify({
        'dashboard_id': new_dashboard.dashboard_id,
        'name': new_dashboard.name,
        'description': new_dashboard.description,
        'created_at': new_dashboard.created_at,
        'updated_at': new_dashboard.updated_at
    }), 201

@dashboard_api.route('/dashboard/<int:dashboard_id>', methods=['PUT'])
def update_dashboard(dashboard_id):
    user_id = session.get('user_id', 1)
    data = request.get_json()
    
    dashboard = Dashboard.query.filter_by(
        dashboard_id=dashboard_id,
        user_id=user_id
    ).first()
    
    if not dashboard:
        return jsonify({'error': 'Dashboard not found or access denied'}), 404
        
    if 'name' in data:
        dashboard.name = data['name']
    if 'description' in data:
        dashboard.description = data['description']
    
    db.session.commit()
    
    return jsonify({
        'dashboard_id': dashboard.dashboard_id,
        'name': dashboard.name,
        'description': dashboard.description,
        'created_at': dashboard.created_at,
        'updated_at': dashboard.updated_at
    })

@dashboard_api.route('/dashboard/<int:dashboard_id>', methods=['DELETE'])
def delete_dashboard(dashboard_id):
    user_id = session.get('user_id', 1)
    
    dashboard = Dashboard.query.filter_by(
        dashboard_id=dashboard_id,
        user_id=user_id
    ).first()
    
    if not dashboard:
        return jsonify({'error': 'Dashboard not found or access denied'}), 404
        
    db.session.delete(dashboard)  # Kaskádové mazání se postará o související widgety
    db.session.commit()
    
    return jsonify({'message': 'Dashboard successfully deleted'})

@dashboard_api.route('/widget', methods=['POST'])
def add_widget():
    user_id = session.get('user_id', 1)
    data = request.get_json()
    
    if not data or not all(k in data for k in ['dashboard_id', 'widget_type', 'title', 'position']):
        return jsonify({'error': 'Missing required fields'}), 400
        
    # Ověření, že dashboard patří uživateli
    dashboard = Dashboard.query.filter_by(
        dashboard_id=data['dashboard_id'],
        user_id=user_id
    ).first()
    
    if not dashboard:
        return jsonify({'error': 'Dashboard not found or access denied'}), 404

    # Vytvoření nového widgetu
    new_widget = Widget(
        widget_type=data['widget_type'],
        title=data['title']
    )
    db.session.add(new_widget)
    db.session.flush()  # Získáme ID widgetu před commitem
    
    # Vytvoření vazby mezi dashboardem a widgetem
    dashboard_widget = DashboardWidget(
        dashboard_id=data['dashboard_id'],
        widget_id=new_widget.widget_id,
        position_x=data['position'].get('x', 0),
        position_y=data['position'].get('y', 0),
        width=data['position'].get('width', 2),
        height=data['position'].get('height', 2)
    )
    
    # Přidání senzorů k widgetu
    if 'sensors' in data:
        for sensor_id in data['sensors']:
            sensor = Sensor.query.get(sensor_id)
            if sensor:
                new_widget.sensors.append(sensor)
    
    db.session.add(dashboard_widget)
    db.session.commit()
    
    return jsonify({
        'widget_id': new_widget.widget_id,
        'dashboard_id': dashboard.dashboard_id,
        'widget_type': new_widget.widget_type,
        'title': new_widget.title,
        'position': {
            'x': dashboard_widget.position_x,
            'y': dashboard_widget.position_y,
            'width': dashboard_widget.width,
            'height': dashboard_widget.height
        }
    }), 201

@dashboard_api.route('/widget/<int:widget_id>', methods=['PUT'])
def update_widget(widget_id):
    user_id = session.get('user_id', 1)
    data = request.get_json()
    
    # Najít widget a ověřit přístup
    dashboard_widget = DashboardWidget.query.join(Dashboard).filter(
        DashboardWidget.widget_id == widget_id,
        Dashboard.user_id == user_id
    ).first()
    
    if not dashboard_widget:
        return jsonify({'error': 'Widget not found or access denied'}), 404
        
    widget = Widget.query.get(widget_id)
    
    # Aktualizace pozice a velikosti
    if 'position' in data:
        dashboard_widget.position_x = data['position'].get('x', dashboard_widget.position_x)
        dashboard_widget.position_y = data['position'].get('y', dashboard_widget.position_y)
        dashboard_widget.width = data['position'].get('width', dashboard_widget.width)
        dashboard_widget.height = data['position'].get('height', dashboard_widget.height)
    
    # Aktualizace základních vlastností widgetu
    if 'title' in data:
        widget.title = data['title']
    if 'widget_type' in data:
        widget.widget_type = data['widget_type']
        
    # Aktualizace senzorů
    if 'sensors' in data:
        widget.sensors = []  # Odstranění stávajících vazeb
        for sensor_id in data['sensors']:
            sensor = Sensor.query.get(sensor_id)
            if sensor:
                widget.sensors.append(sensor)
    
    db.session.commit()
    
    return jsonify({
        'widget_id': widget.widget_id,
        'widget_type': widget.widget_type,
        'title': widget.title,
        'position': {
            'x': dashboard_widget.position_x,
            'y': dashboard_widget.position_y,
            'width': dashboard_widget.width,
            'height': dashboard_widget.height
        }
    })

@dashboard_api.route('/widget/<int:widget_id>', methods=['DELETE'])
def delete_widget(widget_id):
    user_id = session.get('user_id', 1)
    
    # Najít widget a ověřit přístup
    dashboard_widget = DashboardWidget.query.join(Dashboard).filter(
        DashboardWidget.widget_id == widget_id,
        Dashboard.user_id == user_id
    ).first()
    
    if not dashboard_widget:
        return jsonify({'error': 'Widget not found or access denied'}), 404
        
    # Odstranění widgetu a všech jeho vazeb
    widget = Widget.query.get(widget_id)
    if widget:
        db.session.delete(widget)  # Kaskádové mazání se postará o vazby
        db.session.commit()
        
    return jsonify({'message': 'Widget successfully deleted'})
