import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import Widget from "@widgets/Widget";
import api from "@services/apiService";
import DashBoardForm from "@forms/DashBoardForm";
import WidgetForm from "@forms/WidgetForm";

// CSS
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "@css/dashBoard.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

const SensorDashboard = () => {
  const [dashboards, setDashboards] = useState([]);
  const [selectedDashboard, setSelectedDashboard] = useState(null);
  const [widgets, setWidgets] = useState([]);
  const [layouts, setLayouts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDashboardFormOpen, setIsDashboardFormOpen] = useState(false);
  const [isWidgetFormOpen, setIsWidgetFormOpen] = useState(false);

  // Načtení dashboardů
  const loadDashboards = async () => {
    try {
      const userDashboards = await api.getDashboards();
      console.log(userDashboards);
      setDashboards(userDashboards || []);
      if (userDashboards && userDashboards.length > 0) {
        setSelectedDashboard(userDashboards[0].dashboard_id);
      } else {
        setIsLoading(false); // Pokud nejsou dashboardy, nastavíme isLoading na false
      }
    } catch (err) {
      console.error("Failed to load dashboards:", err);
      setDashboards([]);
      setIsLoading(false); // I při chybě nastavíme isLoading na false
    }
  };

  // Načtení widgetů pro vybraný dashboard
  const loadWidgets = async (dashboardId) => {
    try {
      setIsLoading(true);
      const dashboardWidgets = await api.getDashboardWidgets(dashboardId);
      console.log(dashboardWidgets);
      const newLayouts = {
        lg: dashboardWidgets.map((widget) => ({
          i: widget.widget_id.toString(),
          x: widget.position_x || 0,
          y: widget.position_y || 0,
          w: widget.width, 
          h: widget.height, 
          minW: widget.widget_type === 'value' ? 4 : 6 ,
          minH: widget.widget_type === 'value' ? 3 : 4 ,
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
      setIsLoading(false); // Pokud není vybrán dashboard, nastavíme isLoading na false
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
      console.log("Saving widget positions:", widgetPositions[0]);
      await api.saveWidgetPositions(selectedDashboard, widgetPositions);
      alert("Pozice widgetů byly uloženy");
    } catch (err) {
      console.error("Failed to save widget positions:", err);
      setError("Nepodařilo se uložit pozice widgetů");
    }
  };

  const DashboardHeader = () => (
    <div className="dashboard-header">
      <button className="dashboard-btn" onClick={handleDashboardCreate}>
        Vytvořit nový dashboard
      </button>
      <button className="dashboard-btn" onClick={handleWidgetCreate}>
        Vytvořit nový widget
      </button>
      {dashboards.length > 0 && (
        <>
          <select value={selectedDashboard || ''} onChange={handleDashboardChange}>
            {dashboards.map((dashboard) => (
              <option key={dashboard.dashboard_id} value={dashboard.dashboard_id}>
                {dashboard.name}
              </option>
            ))}
          </select>
          <button className="dashboard-btn" onClick={handleDeleteDashboard}>Smazat dashboard</button>
          <button className="dashboard-btn" onClick={handleSaveWidgetPositions}>Uložit pozice widgetů</button>
        </>
      )}
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
              cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
              rowHeight={100}
              margin={[16, 16]}
              onLayoutChange={onLayoutChange}
              isDraggable={true}
              isResizable={true}
              autoSize={true}
              useCSSTransforms={true}
              preventCollision={true}
              compactType={null}
              verticalCompact={false}
            >
              {widgets.map((widget) => (
                <div
                  key={widget.widget_id.toString()}
                  className="widget"
                >
  
                  <Widget
                    title={widget.title}
                    widget_id={widget.widget_id}
                    sensorName={`Sensor ${widget.sensors[0].name}`}
                    id={widget.sensors[0].sensor_id}
                    active={widget.sensors[0].is_active}
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
            <DashBoardForm
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

export default SensorDashboard;