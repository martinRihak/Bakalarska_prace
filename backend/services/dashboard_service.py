from models.models import Dashboard, User, db, DashboardWidget, Widget, Sensor, SensorData
from datetime import datetime, timedelta
from sqlalchemy import func

class DashboardService:
    @staticmethod
    def aggregate_sensor_data(sensor_id, widget_type, start_time=None):
        query = SensorData.query.filter(SensorData.sensor_id == sensor_id)
        
        if start_time:
            query = query.filter(SensorData.timestamp >= start_time)
        
        if widget_type == "area":
            return query.order_by(SensorData.timestamp.asc()).all()
        elif widget_type in ["radialBar", "enhancedRadialBar"]:
            return query.order_by(SensorData.timestamp.desc()).limit(1).all()
        else:
            return query.order_by(SensorData.timestamp.asc()).all()

    @staticmethod
    def get_widget_data(user_id, widget_id, time_range_str):
        widget = Widget.query.get(widget_id)
        if not widget:
            return None

        owned_widget = Widget.query.join(DashboardWidget).join(Dashboard).filter(
            Widget.widget_id == widget_id,
            Dashboard.user_id == user_id
        ).first()
        if not owned_widget:
            raise PermissionError("Access denied")
            
        now = datetime.utcnow()
        if time_range_str == '24h':
            start_time = now - timedelta(hours=24)
        elif time_range_str == '7d':
            start_time = now - timedelta(days=7)
        elif time_range_str == '30d':
            start_time = now - timedelta(days=30)
        else:
            start_time = now - timedelta(hours=24)
            
        sensor = Sensor.query.get(widget.sensor_id)
        if not sensor:
            return []

        aggregated_data = DashboardService.aggregate_sensor_data(sensor.sensor_id, widget.widget_type, start_time)
        data = [{
            'timestamp': row.timestamp.isoformat(),
            'value': float(row.value)
        } for row in aggregated_data]

        return [{
            'sensor_id': sensor.sensor_id,
            'name': sensor.name,
            'unit': sensor.unit,
            'data': data
        }]

    @staticmethod
    def get_user_dashboards(user_id):
        return Dashboard.query.filter_by(user_id=user_id).all()

    @staticmethod
    def get_dashboard_widgets(user_id, dashboard_id):
        dashboard = Dashboard.query.filter_by(
            dashboard_id=dashboard_id,
            user_id=user_id
        ).first()
        
        if not dashboard:
            return None

        dashboard_widgets = DashboardWidget.query.join(Widget).filter(
            DashboardWidget.dashboard_id == dashboard_id
        ).all()

        widgets_data = []
        for dw in dashboard_widgets:
            widget = Widget.query.get(dw.widget_id)
            
            widget_data = {
                'widget_id': dw.widget_id,
                'widget_type': widget.widget_type,
                'title': widget.title,
                'time': widget.time,
                'position_x': dw.position_x,
                'position_y': dw.position_y,
                'width': dw.width,
                'height': dw.height,
                'sensors': [],
                'has_data': False
            }

            sensor = Sensor.query.get(widget.sensor_id)
            if sensor:
                has_sensor_data = SensorData.query.filter_by(sensor_id=sensor.sensor_id).first() is not None
                widget_data['sensors'] = [{
                    'sensor_id': sensor.sensor_id,
                    'is_active': sensor.is_active,
                    'name': sensor.name,
                    'sensor_type': sensor.sensor_type,
                    'unit': sensor.unit,
                    'min_value': sensor.min_value,
                    'max_value': sensor.max_value,
                    'sampling_rate': sensor.sampling_rate,
                    'has_data': has_sensor_data
                }]
                if has_sensor_data:
                    widget_data['has_data'] = True

            if not widget_data['has_data']:
                widget_data['error_message'] = "Pro tento widget nejsou k dispozici žádná data ze senzorů."
                
            widgets_data.append(widget_data)
        return widgets_data

    @staticmethod
    def create_dashboard(user_id, name, description):
        new_dashboard = Dashboard(
            user_id=user_id,
            name=name,
            description=description
        )
        db.session.add(new_dashboard)
        db.session.commit()
        return new_dashboard

    @staticmethod
    def update_dashboard(user_id, dashboard_id, data):
        dashboard = Dashboard.query.filter_by(
            dashboard_id=dashboard_id,
            user_id=user_id
        ).first()
        
        if not dashboard:
            return None
            
        if 'name' in data:
            dashboard.name = data['name']
        if 'description' in data:
            dashboard.description = data['description']
        
        db.session.commit()
        return dashboard

    @staticmethod
    def delete_dashboard(user_id, dashboard_id):
        dashboard = Dashboard.query.filter_by(
            dashboard_id=dashboard_id,
            user_id=user_id
        ).first()
        
        if not dashboard:
            return False
            
        db.session.delete(dashboard)
        db.session.commit()
        return True

    @staticmethod
    def save_widget_positions(user_id, dashboard_id, widget_positions):
        dashboard = Dashboard.query.filter_by(
            dashboard_id=dashboard_id,
            user_id=user_id
        ).first()
        
        if not dashboard:
            return False
        
        for position in widget_positions:
            dashboard_widget = DashboardWidget.query.filter_by(
                dashboard_id=dashboard_id,
                widget_id=position['widget_id']
            ).first()
            
            if dashboard_widget:
                dashboard_widget.position_x = position['position_x']
                dashboard_widget.position_y = position['position_y']
                dashboard_widget.width = position['width']
                dashboard_widget.height = position['height']
        
        db.session.commit()
        return True

    @staticmethod
    def add_widget(user_id, dashboard_id, widget_data):
        dashboard = Dashboard.query.filter_by(
            dashboard_id=dashboard_id,
            user_id=user_id
        ).first()
        
        if not dashboard:
            return None
        
        new_widget = Widget(
            widget_type=widget_data['widget_type'],
            title=widget_data['title'],
            sensor_id=widget_data['sensor_id']
        )
        db.session.add(new_widget)
        db.session.flush()

        default_width = 4 if widget_data['widget_type'] == 'value' else 6
        default_height = 3 if widget_data['widget_type'] == 'value' else 4

        dashboard_widget = DashboardWidget(
            dashboard_id=dashboard_id,
            widget_id=new_widget.widget_id,
            position_x=widget_data['position'].get('x', 0),
            position_y=widget_data['position'].get('y', 0),
            width=default_width,
            height=default_height
        )
        
        db.session.add(dashboard_widget)
        db.session.commit()
        
        return {
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
        }

    @staticmethod
    def update_widget(user_id, widget_id, data):
        dashboard_widget = DashboardWidget.query.join(Dashboard).filter(
            DashboardWidget.widget_id == widget_id,
            Dashboard.user_id == user_id
        ).first()
        
        if not dashboard_widget:
            return None
            
        widget = Widget.query.get(widget_id)
        
        if 'position' in data:
            dashboard_widget.position_x = data['position'].get('x', dashboard_widget.position_x)
            dashboard_widget.position_y = data['position'].get('y', dashboard_widget.position_y)
            dashboard_widget.width = data['position'].get('width', dashboard_widget.width)
            dashboard_widget.height = data['position'].get('height', dashboard_widget.height)
        
        if 'title' in data:
            widget.title = data['title']
        if 'widget_type' in data:
            widget.widget_type = data['widget_type']
            
        if 'sensor_id' in data:
            widget.sensor_id = data['sensor_id']
        
        db.session.commit()
        
        return {
            'widget_id': widget.widget_id,
            'widget_type': widget.widget_type,
            'title': widget.title,
            'position': {
                'x': dashboard_widget.position_x,
                'y': dashboard_widget.position_y,
                'width': dashboard_widget.width,
                'height': dashboard_widget.height
            }
        }
