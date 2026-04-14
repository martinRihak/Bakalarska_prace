from flask import Blueprint, request, jsonify, session
from utils.auth_utils import login_required
from services.dashboard_service import DashboardService

dashboard_api = Blueprint('dash_api', __name__)

@dashboard_api.route('/widget/<int:widget_id>/data', methods=['GET'])
@login_required
def get_widget_data(widget_id):
    try:
        time_range = request.args.get('timeRange')
        user_id = session.get('user_id')

        response_data = DashboardService.get_widget_data(user_id, widget_id, time_range)
        if response_data is None:
             return jsonify({'error': 'Widget not found'}), 404
             
        return jsonify(response_data)
    except PermissionError:
        return jsonify({'error': 'Access denied'}), 403
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_api.route('/userDashBoards', methods=['GET'])
@login_required
def getDashBoards():
    user_id = session.get('user_id')
    dashboards = DashboardService.get_user_dashboards(user_id)
    
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

@dashboard_api.route('/widgets/<int:dashboard_id>', methods=['GET'])
@login_required
def get_dashboard_widgets(dashboard_id):
    user_id = session.get('user_id')
    # Uložení dashboard_id do session
    session['dashboard_id'] = dashboard_id
    
    widgets_data = DashboardService.get_dashboard_widgets(user_id, dashboard_id)
    
    if widgets_data is None:
        return jsonify({'error': 'Dashboard not found or access denied'}), 404

    return jsonify(widgets_data)

@dashboard_api.route('/create', methods=['POST'])
@login_required
def create_dashboard():
    user_id = session.get('user_id')
    data = request.get_json()
    
    if not data or 'name' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
        
    new_dashboard = DashboardService.create_dashboard(user_id, data['name'], data.get('description', ''))
    
    session['dashboard_id'] = new_dashboard.dashboard_id
    
    return jsonify({
        'dashboard_id': new_dashboard.dashboard_id,
        'name': new_dashboard.name,
        'description': new_dashboard.description,
        'created_at': new_dashboard.created_at,
        'updated_at': new_dashboard.updated_at
    }), 200 

@dashboard_api.route('/dashboard/<int:dashboard_id>', methods=['PUT'])
@login_required
def update_dashboard(dashboard_id):
    user_id = session.get('user_id')
    data = request.get_json()
    
    dashboard = DashboardService.update_dashboard(user_id, dashboard_id, data)
    
    if not dashboard:
        return jsonify({'error': 'Dashboard not found or access denied'}), 404
    
    return jsonify({
        'dashboard_id': dashboard.dashboard_id,
        'name': dashboard.name,
        'description': dashboard.description,
        'created_at': dashboard.created_at,
        'updated_at': dashboard.updated_at
    })

@dashboard_api.route('/dashboard/<int:dashboard_id>', methods=['DELETE'])
@login_required
def delete_dashboard(dashboard_id):
    user_id = session.get('user_id')
    
    success = DashboardService.delete_dashboard(user_id, dashboard_id)
    
    if not success:
        return jsonify({'error': 'Dashboard not found or access denied'}), 404
        
    return jsonify({'message': 'Dashboard successfully deleted'})

@dashboard_api.route('/dashboard/<int:dashboard_id>/save_positions', methods=['POST'])
@login_required
def save_widget_positions(dashboard_id):
    user_id = session.get('user_id')
    data = request.get_json()
    
    widget_positions = data.get('widgetPositions', [])
    success = DashboardService.save_widget_positions(user_id, dashboard_id, widget_positions)
    
    if not success:
        return jsonify({'error': 'Dashboard not found or access denied'}), 404
    
    return jsonify({'message': 'Widget positions saved successfully'})

@dashboard_api.route('/widget', methods=['POST'])
@login_required
def add_widget():
    user_id = session.get('user_id')
    dashboard_id = session.get('dashboard_id')
    
    if not dashboard_id:    
        return jsonify({'error': 'Dashboard not found'}), 404
        
    data = request.get_json()
    if not data or not all(k in data for k in ['widget_type', 'title', 'position', 'sensor_id']):
        return jsonify({'error': 'Missing required fields'}), 400
        
    result = DashboardService.add_widget(user_id, dashboard_id, data)
    
    if not result:
         return jsonify({'error': 'Dashboard not found or access denied'}), 404
         
    return jsonify(result), 201

@dashboard_api.route('/widget/<int:widget_id>', methods=['PUT'])
@login_required
def update_widget(widget_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'User not logged in'}), 401
    data = request.get_json()
    
    result = DashboardService.update_widget(user_id, widget_id, data)
    
    if not result:
        return jsonify({'error': 'Widget not found or access denied'}), 404
        
    return jsonify(result)
