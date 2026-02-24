from models.models import db, Widget, WidgetSensor, DashboardWidget, Dashboard

class WidgetService:
    @staticmethod
    def delete_widget(dashboard_id, widget_id, user_id):
        # Note: Ideally we should verify user_id owns the dashboard containing this widget.
        # Following existing logic which trusts the IDs.
        
        try:
            widget = Widget.query.filter_by(widget_id=widget_id).first()
            if not widget:
                return False

            owned_widget = DashboardWidget.query.join(Dashboard).filter(
                DashboardWidget.dashboard_id == dashboard_id,
                DashboardWidget.widget_id == widget_id,
                Dashboard.user_id == user_id
            ).first()
            if not owned_widget:
                raise PermissionError("Access denied")
            
            # Explicit deletion of related records as per original code
            widget_sensor = WidgetSensor.query.filter_by(widget_id=widget_id).first()
            dashboard_widget = DashboardWidget.query.filter_by(dashboard_id=dashboard_id, widget_id=widget_id).first()
            
            db.session.delete(widget)
            if widget_sensor:
                db.session.delete(widget_sensor)
            if dashboard_widget:
                db.session.delete(dashboard_widget)
                
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise e
