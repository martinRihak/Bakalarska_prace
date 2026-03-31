import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import Widget from "@/components/widgets/Widget";
import api from "@/api/apiService";
import DashboardForm from "@/components/forms/DashboardForm";
import WidgetForm from "@/components/forms/WidgetForm";

// CSS
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "@css/pageLayout.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

const VALUE_WIDGET_MIN_SIZE = {
  minW: 3,
  minH: 3,
};

const GRAPH_WIDGET_MIN_SIZE = {
  minW: 5,
  minH: 4,
};

const getMinWidgetSizeByType = (widgetType) =>
  widgetType === "value" ? VALUE_WIDGET_MIN_SIZE : GRAPH_WIDGET_MIN_SIZE;

const Dashboard = () => {
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [layouts, setLayouts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [saveMess, setSeveMess] = useState("");
  const [error, setError] = useState(null);
  const [isDashboardFormOpen, setIsDashboardFormOpen] = useState(false);
  const [isWidgetFormOpen, setIsWidgetFormOpen] = useState(false);

  const loadDashboards = async () => {
    try {
      const userDashboards = await api.getDashboards();
      setDashboards(userDashboards || []);
      if (userDashboards && userDashboards.length > 0) {
        setSelectedDashboard(userDashboards[0].dashboard_id);
      } else {
        setIsLoading(false);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Failed to load dashboards:", err);
      setDashboards([]);
      setIsLoading(false);
      setIsLoading(false);
    }
  };

  const loadWidgets = async (dashboardId) => {
    try {
      setIsLoading(true);
      const dashboardWidgets = await api.getDashboardWidgets(dashboardId);
      const newLayouts = {
        lg: dashboardWidgets.map((widget) => ({
          ...getMinWidgetSizeByType(widget.widget_type),
          i: widget.widget_id.toString(),
          x: widget.position_x || 0,
          y: widget.position_y || 0,
          w: widget.width,
          h: widget.height,
        })),
      };
      setWidgets(dashboardWidgets);
      setLayouts(newLayouts);
      setError(null);
    } catch (err) {
      console.error("Failed to load widgets:", err);
      setWidgets([]);
      setLayouts({});
      setError("Nepodařilo se načíst widgety");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboards();
  }, []);

  useEffect(() => {
    if (selectedDashboard) {
      loadWidgets(selectedDashboard);
    } else {
      setIsLoading(false);
      setIsLoading(false);
    }
  }, [selectedDashboard]);

  const onLayoutChange = (layout, allLayouts) => {
    setLayouts(allLayouts);
  };

  const handleDashboardCreate = () => {
    setIsDashboardFormOpen(true);
  };

  const handleWidgetCreate = () => {
    setIsWidgetFormOpen(true);
  };

  const handleDashboardChange = (e) => {
    setSelectedDashboard(e.target.value);
  };

  const handleDeleteDashboard = async () => {
    if (window.confirm("Opravdu chcete smazat tento dashboard?")) {
      try {
        await api.deleteDashboard(selectedDashboard);
        load, setSelectedDashboard(null);
        loadDashboards();
      } catch (err) {
        console.error("Failed to delete dashboard:", err);
        setError("Nepodařilo se smazat dashboard");
      }
    }
  };

  const handleSaveWidgetPositions = async () => {
    try {
      // Použijeme lg layout nebo první dostupný layout
      const currentLayout = layouts.lg || Object.values(layouts)[0];
      if (!currentLayout) {
        throw new Error("No layout available");
      }


      const widgetPositions = currentLayout.map((layout) => ({
        widget_id: layout.i,
        position_x: layout.x,
        position_y: layout.y,
        width: layout.w,
        height: layout.h,
      }));
      await api.saveWidgetPositions(selectedDashboard, widgetPositions);
      alert("Pozice widgetů byly uloženy");
    } catch (err) {
      console.error("Failed to save widget positions:", err);
      setError("Nepodařilo se uložit pozice widgetů");
    }
  };

 const DashboardHeader = () => (
    <div className="dashboard-header">
      {
        <>
          <button className="dashboard-btn" onClick={handleDashboardCreate}>
            Vytvořit nový dashboard
          </button>
          <button className="dashboard-btn" onClick={handleWidgetCreate}>
            Vytvořit nový widget
          </button>
          <select
            value={selectedDashboard || ""}
            onChange={handleDashboardChange}
          >
            {dashboards.map((dashboard) => (
              <option
                key={dashboard.dashboard_id}
                value={dashboard.dashboard_id}
              >
                {dashboard.name}
              </option>
            ))}
          </select>
          <button className="dashboard-btn" onClick={handleDeleteDashboard}>
            Smazat dashboard
          </button>
          <button className="dashboard-btn" onClick={handleSaveWidgetPositions}>
            Uložit pozice widgetů
          </button>
        </>
      }
    </div>
  );
  const handleWidgetDelete = () => {
    loadWidgets(selectedDashboard);
  };
  return (
    <div className="main-content">
      <DashboardHeader />
      {isLoading ? (
        <div>Načítání...</div>
      ) : (
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
              cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
              rowHeight={100}
              margin={[16, 16]}
              onLayoutChange={onLayoutChange}
              isDraggable={true}
              isResizable={true}
              autoSize={true}
              useCSSTransforms={true}
              preventCollision={true}
              compactType={null}
            >
              {widgets.map((widget) => (
                <div key={widget.widget_id.toString()} className="widget">
                  <Widget
                    title={widget.title}
                    widget_id={widget.widget_id}
                    sensorName={`Sensor ${widget.sensors[0].name}`}
                    id={widget.sensors[0].sensor_id}
                    active={widget.sensors[0].is_active}
                    time={widget.time}
                    widgetType={widget.widget_type}
                    dashboard_id={selectedDashboard}
                    onDelete={handleWidgetDelete} // Předání callbacku
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
            <DashboardForm
              onClose={() => setIsDashboardFormOpen(false)}
              onSuccess={() => {
                setIsDashboardFormOpen(false);
                loadDashboards();
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
              dashboardId={selectedDashboard}
              onSuccess={() => {
                setIsWidgetFormOpen(false);
                loadWidgets(selectedDashboard);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

