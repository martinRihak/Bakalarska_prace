from models.models import db, Widget, DashboardWidget, Dashboard

class WidgetService:
    @staticmethod
    def delete_widget(dashboard_id, widget_id, user_id):
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

            dashboard_widget = DashboardWidget.query.filter_by(dashboard_id=dashboard_id, widget_id=widget_id).first()

            db.session.delete(widget)
            if dashboard_widget:
                db.session.delete(dashboard_widget)

            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            raise e
