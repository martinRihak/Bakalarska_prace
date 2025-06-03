import React from 'react';
import { Thermometer, Droplet } from 'lucide-react';
const ValueWidget = ({ sensorData }) => {
  // Fallback if sensorData is missing or incomplete
  if (!sensorData || !sensorData.sensor || !sensorData.data) {
    return <div className="error-message">Žádná data k zobrazení</div>;
  }

  const { sensor, data } = sensorData;

  // Function to select an appropriate icon based on the unit
  const getIcon = (unit) => {
    switch (unit) {
      case '°C':
        return <Thermometer  color="var(--highlight-color)" />;
      case '%':
        return <Droplet  color="var(--accent-color)" />;
      default:
        return null; // No icon if unit is unrecognized
    }
  };

  const icon = getIcon(sensor.unit);
  const formattedValue = `${data.value} ${sensor.unit}`;
  const formattedTimestamp = new Date(data.timestamp).toLocaleString('cs-CZ'); // Czech locale for date and time

  return (
    <div className="value-widget">
      <div className="value-container">
        {icon && <div className="icon">{icon}</div>}
        <div className="value">{formattedValue}</div>
      </div>
      <div className="timestamp">{formattedTimestamp}</div>
    </div>
  );
};

export default ValueWidget;