import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import Widget from "@widgets/Widget";
import api from "@services/apiService";
import DashBoardForm from "@forms/DashBoardForm";
import WidgetForm from "@forms/WidgetForm"; // New component for adding widgets

// CSS
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "@css/dashBoard.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

const SensorDashboard = () => {
  const [widgets, setWidgets] = useState([]);
  const [layouts, setLayouts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDashboardFormOpen, setIsDashboardFormOpen] = useState(false);
  const [isWidgetFormOpen, setIsWidgetFormOpen] = useState(false);

  // Function to load widgets from the API
  const loadWidgets = async () => {
    try {
      setIsLoading(true);
      const dashboardWidgets = await api.getDashboardWidgets();
      const newLayouts = {
        lg: dashboardWidgets.map((widget) => ({
          i: widget.widget_id.toString(),
          x: widget.position_x || 0,
          y: widget.position_y || 0,
          w: widget.width || 4, // Default width
          h: widget.height || 4, // Default height
        })),
      };
      setWidgets(dashboardWidgets);
      setLayouts(newLayouts);
      setError(null);
    } catch (err) {
      console.error("Failed to load widgets:", err);
      setError("Nepodařilo se načíst widgety");
    } finally {
      setIsLoading(false);
    }
  };

  // Load widgets on component mount
  useEffect(() => {
    loadWidgets();
  }, []);

  const onLayoutChange = (layout, allLayouts) => {
    setLayouts(allLayouts);
  };

  if (isLoading) {
    return <div className="main-content">Načítání...</div>;
  }

  if (error) {
    return <div className="main-content error">{error}</div>;
  }

  return (
    <div className="main-content">
      <div className="dashboard-header">
        <button
          className="create-dashboard-btn"
          onClick={() => setIsDashboardFormOpen(true)}
        >
          Vytvořit nový dashboard
        </button>
        <button
          className="create-dashboard-btn"
          onClick={() => setIsWidgetFormOpen(true)}
        >
          Vytvořit nový widget
        </button>
      </div>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
        rowHeight={100}
        margin={[16, 16]}
        onLayoutChange={onLayoutChange}
        isDraggable={true}
        isResizable={true}
        autoSize={true}
        useCSSTransforms={true}
      >
        {widgets.map((widget) => (
          <div key={widget.widget_id.toString()} className="widget-wrapper">
            <Widget
              title={widget.title}
              sensorName={`Sensor ${widget.sensors[0].name}`}
              id={widget.sensors[0].sensor_id}
            />
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Modal for creating a new dashboard */}
      {isDashboardFormOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsDashboardFormOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <DashBoardForm onClose={() => setIsDashboardFormOpen(false)} />
          </div>
        </div>
      )}

      {/* Modal for adding a new widget */}
      {isWidgetFormOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsWidgetFormOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <WidgetForm
              onClose={() => setIsWidgetFormOpen(false)}
              onWidgetAdded={loadWidgets}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorDashboard;