import React, { useState, useEffect } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, Maximize2, X } from 'lucide-react';

// Vytvoření responzivní verze GridLayout
const ResponsiveGridLayout = WidthProvider(Responsive);

// Generování testovacích dat pro senzory
const generateSensorData = (dataPoints = 24) => {
  const data = [];
  const now = new Date();
  
  for (let i = dataPoints; i >= 0; i--) {
    const time = new Date(now);
    time.setHours(now.getHours() - i);
    
    data.push({
      time: time.toLocaleTimeString(),
      temperature: Math.round((20 + Math.random() * 5) * 10) / 10,
      humidity: Math.round((50 + Math.random() * 20) * 10) / 10,
      pressure: Math.round((1000 + Math.random() * 20) * 10) / 10,
      light: Math.round(Math.random() * 100)
    });
  }
  
  return data;
};

// Komponenta widgetu
const Widget = ({ title, children, onRemove }) => {
  return (
    <div className="bg-white rounded-lg shadow-md h-full w-full flex flex-col overflow-hidden border border-gray-200">
      <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <div className="flex space-x-2">
          <button className="text-gray-500 hover:text-gray-700">
            <RefreshCw size={16} />
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <Maximize2 size={16} />
          </button>
          <button className="text-gray-500 hover:text-red-500" onClick={onRemove}>
            <X size={16} />
          </button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {children}
      </div>
    </div>
  );
};

// Sensor Dashboard komponenta
export default function SensorDashboard() {
  const [layouts, setLayouts] = useState({
    lg: [
      { i: 'temperature', x: 0, y: 0, w: 6, h: 8 },
      { i: 'humidity', x: 6, y: 0, w: 6, h: 8 },
      { i: 'pressure', x: 0, y: 8, w: 4, h: 8 },
      { i: 'light', x: 4, y: 8, w: 4, h: 8 },
      { i: 'status', x: 8, y: 8, w: 4, h: 8 }
    ],
    md: [
      { i: 'temperature', x: 0, y: 0, w: 6, h: 8 },
      { i: 'humidity', x: 6, y: 0, w: 6, h: 8 },
      { i: 'pressure', x: 0, y: 8, w: 4, h: 8 },
      { i: 'light', x: 4, y: 8, w: 4, h: 8 },
      { i: 'status', x: 8, y: 8, w: 4, h: 8 }
    ],
    sm: [
      { i: 'temperature', x: 0, y: 0, w: 6, h: 8 },
      { i: 'humidity', x: 6, y: 0, w: 6, h: 8 },
      { i: 'pressure', x: 0, y: 8, w: 6, h: 8 },
      { i: 'light', x: 6, y: 8, w: 6, h: 8 },
      { i: 'status', x: 0, y: 16, w: 12, h: 6 }
    ],
    xs: [
      { i: 'temperature', x: 0, y: 0, w: 12, h: 8 },
      { i: 'humidity', x: 0, y: 8, w: 12, h: 8 },
      { i: 'pressure', x: 0, y: 16, w: 12, h: 8 },
      { i: 'light', x: 0, y: 24, w: 12, h: 8 },
      { i: 'status', x: 0, y: 32, w: 12, h: 6 }
    ]
  });
  
  const [sensorData, setSensorData] = useState(generateSensorData());
  const [widgets, setWidgets] = useState([
    'temperature', 'humidity', 'pressure', 'light', 'status'
  ]);

  // Simulace aktualizace dat senzorů každých 5 sekund
  useEffect(() => {
    const interval = setInterval(() => {
      const newData = [...sensorData];
      const lastEntry = { ...newData[newData.length - 1] };
      
      const now = new Date();
      lastEntry.time = now.toLocaleTimeString();
      lastEntry.temperature = Math.round((lastEntry.temperature + (Math.random() * 2 - 1)) * 10) / 10;
      lastEntry.humidity = Math.round((lastEntry.humidity + (Math.random() * 4 - 2)) * 10) / 10;
      lastEntry.pressure = Math.round((lastEntry.pressure + (Math.random() * 2 - 1)) * 10) / 10;
      lastEntry.light = Math.max(0, Math.min(100, Math.round(lastEntry.light + (Math.random() * 10 - 5))));
      
      newData.push(lastEntry);
      newData.shift(); // Odstranění nejstaršího záznamu
      
      setSensorData(newData);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [sensorData]);

  // Odstranění widgetu
  const removeWidget = (widgetId) => {
    setWidgets(widgets.filter(id => id !== widgetId));
  };

  // Uložení rozvržení při změně
  const handleLayoutChange = (currentLayout, allLayouts) => {
    setLayouts(allLayouts);
    // Zde by mohlo být ukládání do localStorage nebo na server
  };

  // Renderování widgetů podle jejich typu
  const renderWidgetContent = (widgetId) => {
    switch (widgetId) {
      case 'temperature':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[15, 30]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="temperature" 
                stroke="#FF6B6B" 
                dot={false} 
                name="Teplota (°C)" 
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'humidity':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[30, 90]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="humidity" 
                stroke="#4ECDC4" 
                dot={false} 
                name="Vlhkost (%)" 
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pressure':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[980, 1040]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="pressure" 
                stroke="#1A535C" 
                dot={false} 
                name="Tlak (hPa)" 
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'light':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sensorData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="light" 
                stroke="#FFE66D" 
                dot={false} 
                name="Osvětlení (%)" 
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'status':
        return (
          <div className="h-full flex flex-col justify-center items-center">
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-green-100 p-4 rounded-lg">
                <h4 className="text-green-800 font-medium">Online senzory</h4>
                <p className="text-2xl font-bold text-green-600">4/4</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <h4 className="text-blue-800 font-medium">Poslední aktualizace</h4>
                <p className="text-sm text-blue-600">{new Date().toLocaleTimeString()}</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg">
                <h4 className="text-yellow-800 font-medium">Průměrná teplota</h4>
                <p className="text-xl font-bold text-yellow-600">
                  {Math.round(sensorData.reduce((sum, item) => sum + item.temperature, 0) / sensorData.length * 10) / 10}°C
                </p>
              </div>
              <div className="bg-purple-100 p-4 rounded-lg">
                <h4 className="text-purple-800 font-medium">Upozornění</h4>
                <p className="text-xl font-bold text-purple-600">0</p>
              </div>
            </div>
          </div>
        );
      default:
        return <div>Neznámý widget</div>;
    }
  };

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Senzorový Dashboard</h1>
        <p className="text-gray-600">Přehled všech senzorů a jejich historických dat</p>
      </div>
      
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12 }}
        rowHeight={30}
        onLayoutChange={handleLayoutChange}
        isDraggable={true}
        isResizable={true}
        margin={[16, 16]}
      >
        {widgets.map((widgetId) => (
          <div key={widgetId}>
            <Widget 
              title={widgetId.charAt(0).toUpperCase() + widgetId.slice(1)} 
              onRemove={() => removeWidget(widgetId)}
            >
              {renderWidgetContent(widgetId)}
            </Widget>
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}