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
  const [dashboards, setDashboards] = useState([]);
  const [widgets, setWidgets] = useState([]);
  const [layouts, setLayouts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDashboardFormOpen, setIsDashboardFormOpen] = useState(false);
  const [isWidgetFormOpen, setIsWidgetFormOpen] = useState(false);

  // Function to load dashboards and widgets from the API
  const loadData = async () => {
    try {
      setIsLoading(true);
      // First load dashboards
      const userDashboards = await api.getDashboards();

      // Pokud API vrátí null nebo undefined, nastavíme prázdné pole
      setDashboards(userDashboards || []);

      if (userDashboards && userDashboards.length > 0) {
        try {
          const dashboardWidgets = await api.getDashboardWidgets();
          const newLayouts = {
            lg: dashboardWidgets.map((widget) => ({
              i: widget.widget_id.toString(),
              x: widget.position_x || 0,
              y: widget.position_y || 0,
              w: widget.width || 4,
              h: widget.height || 4,
            })),
          };
          setWidgets(dashboardWidgets);
          setLayouts(newLayouts);
        } catch (widgetErr) {
          console.error("Failed to load widgets:", widgetErr);
          setWidgets([]);
          setLayouts({});
        }
      } else {
        // Když nejsou dashboardy, nastavíme prázdné widgety a layouts
        setWidgets([]);
        setLayouts({});
      }
      setError(null);
    } catch (err) {
      console.error("Failed to load dashboards:", err);
      // Místo nastavení error stavu nastavíme prázdné pole dashboardů
      setDashboards([]);
      setWidgets([]);
      setLayouts({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onLayoutChange = (layout, allLayouts) => {
    setLayouts(allLayouts);
  };

  const handleDashboardCreate = () => {
    console.log("Opening dashboard form"); // Pro debugování
    setIsDashboardFormOpen(true);
  };

  const handleWidgetCreate = () => {
    console.log("Opening widget form"); // Pro debugování
    setIsWidgetFormOpen(true);
  };

  // Upravený DashboardHeader s novými handlery
  const DashboardHeader = () => (
    <div className="dashboard-header">
      <button className="create-dashboard-btn" onClick={handleDashboardCreate}>
        Vytvořit nový dashboard
      </button>
      <button className="create-dashboard-btn" onClick={handleWidgetCreate}>
        Vytvořit nový widget
      </button>
    </div>
  );

  // Replace the existing loading and error returns with these:
  if (isLoading) {
    return (
      <div className="main-content">
        <DashboardHeader />
        <div>Načítání...</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <DashboardHeader />
      {!isLoading && (
        <>
          {dashboards.length === 0 ? (
            <div className="no-dashboards-message">
              Zatím nemáte vytvořený žádný dashboard. Vytvořte první pomocí
              tlačítka výše.
            </div>
          ) : widgets.length === 0 ? (
            <div className="no-widgets-message">
              Dashboard je připraven. Nyní můžete přidat widgety.
            </div>
          ) : (
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
                <div
                  key={widget.widget_id.toString()}
                  className="widget-wrapper"
                >
                  <Widget
                    title={widget.title}
                    sensorName={`Sensor ${widget.sensors[0].name}`}
                    id={widget.sensors[0].sensor_id}
                    widgetType={widget.widget_type} // Přidána nová prop
                  />
                </div>
              ))}
            </ResponsiveGridLayout>
          )}
        </>
      )}

      {isDashboardFormOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsDashboardFormOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <DashBoardForm
              onClose={() => setIsDashboardFormOpen(false)}
              onSuccess={() => {
                setIsDashboardFormOpen(false);
                loadData(); // Použijeme loadData místo loadWidgets
              }}
            />
          </div>
        </div>
      )}

      {isWidgetFormOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsWidgetFormOpen(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Vytvořit nový widget</h2>
            <WidgetForm
              onClose={() => setIsWidgetFormOpen(false)}
              onSuccess={() => {
                setIsWidgetFormOpen(false);
                loadWidgets();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default SensorDashboard;
