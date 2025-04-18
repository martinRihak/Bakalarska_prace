import React, { useEffect, useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import Widget from "@widgets/Widget";
import api from "@services/apiService";

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

  // Načtení widgetů při prvním renderu
  useEffect(() => {
    const loadWidgets = async () => {
      try {
        setIsLoading(true);
        // Předpokládáme, že máme ID dashboardu 1 (později můžeme přidat výběr dashboardu)
        const dashboardWidgets = await api.getDashboardWidgets();
        console.log(dashboardWidgets);
        // Vytvoření layoutu z načtených widgetů
        const newLayouts = {
          lg: dashboardWidgets.map(widget => ({
            i: widget.widget_id.toString(),
            x: widget.position_x || 0,
            y: widget.position_y || 0,
            w: widget.width || 6,
            h: widget.height || 4
          }))
        };
        
        setWidgets(dashboardWidgets);
        setLayouts(newLayouts);
        setError(null);
      } catch (err) {
        console.error('Failed to load widgets:', err);
        setError('Nepodařilo se načíst widgety');
      } finally {
        setIsLoading(false);
      }
    };

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
              sensorName={`Sensor ${widget.widget_id}`} // Později můžeme přidat skutečné názvy senzorů
              id = {widget.sensors.sensore_id}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
};

export default SensorDashboard;
