import React, { useState, useEffect } from "react";
import api from "@services/apiService";
import { Activity, TrendingUp, Gauge, Loader, ArrowDownUp} from "lucide-react";
import "@css/forms.css";

// Define available chart types with icons
const chartTypes = [
  { type: "line", icon: Activity, label: "Line Chart" },
  { type: "area", icon: TrendingUp, label: "Area Chart" },
  { type: "value", icon: Loader, label: "Value" },
];

const WidgetForm = ({ onClose, onSuccess }) => {
    const [sensors, setSensors] = useState([]);
    const [selectedSensor, setSelectedSensor] = useState(null);
    const [selectedChartType, setSelectedChartType] = useState(null);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(true);
  
    // Fetch sensors when the modal opens
    useEffect(() => {
      const fetchSensors = async () => {
        try {
          const response = await api.getUserSensors();
          setSensors(response);
          setIsLoading(false);
        } catch (err) {
          setError("Nepodařilo se načíst senzory");
          setIsLoading(false);
        }
      };
      fetchSensors();
    }, []);
  
    // Handle form submission
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!selectedSensor || !selectedChartType) {
        setError("Prosím vyberte senzor a typ grafu");
        return;
      }

      try {
        await api.createWidget({
          dashboard_id: 1, // assuming dashboard_id=1 for now
          widget_type: selectedChartType,
          title: `${selectedSensor.name} - ${selectedChartType}`,
          position: {
            x: 0,
            y: 0,
            width: 4,
            height: 4
          },
          sensors: [selectedSensor.sensor_id]
        });

        // Success: refresh widgets and close modal
        if (onSuccess) {
          onSuccess();
        } else {
          onClose();
        }
      } catch (err) {
        setError("Došlo k chybě při přidávání widgetu");
        console.error("Error adding widget:", err);
      }
    };

    return (
      <div className="form-container">
        <div className="modal-header">
          <h2 className="form-heading">Přidat nový widget</h2>
        </div>
  
        {error && (
          <div className="form-error" role="alert">
            <span>{error}</span>
          </div>
        )}
  
        {isLoading ? (
          <div>Načítání senzorů...</div>
        ) : sensors.length === 0 ? (
          <div>Žádné senzory nejsou k dispozici</div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Sensor Selection */}
            <div className="form-group">
              <label htmlFor="sensor" className="form-label">
                Vyberte senzor
              </label>
              <select
                id="sensor"
                value={selectedSensor ? selectedSensor.sensor_id : ""}
                onChange={(e) => {
                  const sensorId = e.target.value;
                  const sensor = sensors.find(
                    (s) => s.sensor_id === parseInt(sensorId)
                  );
                  setSelectedSensor(sensor);
                }}
                className="form-select"
              >
                <option value="">Vyberte senzor</option>
                {sensors.map((sensor) => (
                  <option key={sensor.sensor_id} value={sensor.sensor_id}>
                    {sensor.sensor_id}-{sensor.name}
                  </option>
                ))}
              </select>
            </div>
  
            {/* Chart Type Selection */}
            <div className="form-group">
              <label className="form-label">Vyberte typ grafu</label>
              <div className="chart-type-selector">
                {chartTypes.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    className={`chart-type-button ${
                      selectedChartType === type ? "selected" : ""
                    }`}
                    onClick={() => setSelectedChartType(type)}
                  >
                    <Icon size={24} color="black" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
  
            {/* Form Actions */}
            <div className="form-footer">
              <button
                type="button"
                onClick={onClose}
                className="form-button cancel"
              >
                Zrušit
              </button>
              <button
                type="submit"
                className="form-submit"
                disabled={!selectedSensor || !selectedChartType}
              >
                Přidat widget
              </button>
            </div>
          </form>
        )}
      </div>
    );
  };
  
  export default WidgetForm;