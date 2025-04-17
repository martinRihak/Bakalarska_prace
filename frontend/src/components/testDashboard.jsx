import React, { useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, Maximize2, X } from 'lucide-react';
import GridLayout from "react-grid-layout";
import '../../node_modules/react-grid-layout/css/styles.css'
import '../../node_modules/react-resizable/css/styles.css'
import '../assets/css/dashBoard.css'

const ResponsiveGridLayout = WidthProvider(Responsive);

class SensorDashboard extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            layouts: this.getInitialLayout(),
            widgets: [
                { id: "a", title: "Senzor 1" },
                { id: "b", title: "Senzor 2" },
                { id: "c", title: "Senzor 3" }
            ]
        };
    }

    getInitialLayout = () => {
        return {
            lg: [
                { i: "a", x: 0, y: 0, w: 4, h: 2 },
                { i: "b", x: 4, y: 0, w: 4, h: 2 },
                { i: "c", x: 8, y: 0, w: 4, h: 2 }
            ]
        };
    };

    onLayoutChange = (layout, layouts) => {
        this.setState({ layouts });
    };

    render() {
        return (
            <div>
                <h1>Sensor Dashboard</h1>
                <ResponsiveGridLayout
                    className="layout"
                    layouts={this.state.layouts}
                    breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                    cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                    rowHeight={100}
                    onLayoutChange={(layout, layouts) => this.onLayoutChange(layout, layouts)}
                    isDraggable={true}
                    isResizable={true}
                >
                    {this.state.widgets.map(widget => (
                        <div key={widget.id} className="widget">
                            <div className="widget-header">
                                <h3>{widget.title}</h3>
                                <div className="widget-controls">
                                    <RefreshCw className="widget-icon" />
                                    <Maximize2 className="widget-icon" />
                                    <X className="widget-icon" />
                                </div>
                            </div>
                            <div className="widget-content">
                                {/* Zde bude obsah widgetu */}
                            </div>
                        </div>
                    ))}
                </ResponsiveGridLayout>
            </div>
        );
    }
}export default SensorDashboard;