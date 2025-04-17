import React from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import Widget from "./widgets/Widget";

// CSS
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import "../assets/css/dashBoard.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

class SensorDashboard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      layouts: this.getInitialLayout(),
      widgets: [
        { id: "a", title: "Senzor 1" },
        { id: "b", title: "Senzor 2" },
        { id: "c", title: "Senzor 3" },
      ],
    };
  }

  getInitialLayout = () => {
    return {
      lg: [
        { i: "a", x: 0, y: 0, w: 6, h: 4 },
        { i: "b", x: 6, y: 0, w: 6, h: 4 },
        { i: "c", x: 0, y: 4, w: 12, h: 4 },
      ],
      md: [
        { i: "a", x: 0, y: 0, w: 6, h: 4 },
        { i: "b", x: 6, y: 0, w: 6, h: 4 },
        { i: "c", x: 0, y: 4, w: 12, h: 4 },
      ],
      sm: [
        { i: "a", x: 0, y: 0, w: 6, h: 4 },
        { i: "b", x: 0, y: 4, w: 6, h: 4 },
        { i: "c", x: 0, y: 8, w: 6, h: 4 },
      ],
      xs: [
        { i: "a", x: 0, y: 0, w: 4, h: 4 },
        { i: "b", x: 0, y: 4, w: 4, h: 4 },
        { i: "c", x: 0, y: 8, w: 4, h: 4 },
      ],
    };
  };

  onLayoutChange = (layout, layouts) => {
    this.setState({ layouts });
  };

  render() {
    const { widgets } = this.state;
    return (
      <div className="dashboard-container">
        <ResponsiveGridLayout
          className="layout"
          layouts={this.state.layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
          rowHeight={100}
          margin={[16, 16]}
          onLayoutChange={(layout, layouts) => this.onLayoutChange(layout, layouts)}
          isDraggable={true}
          isResizable={true}
          autoSize={true}
          useCSSTransforms={true}
        >
          {widgets.map((widget) => (
            <div key={widget.id} className="widget-wrapper">
              <Widget title={widget.title} />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    );
  }
}

export default SensorDashboard;
