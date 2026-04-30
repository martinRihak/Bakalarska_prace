import React, { useState, useEffect } from 'react';
import api from '@/api/apiService';
import '@css/DataExport.css'; // Import your CSS file for styling
import UserBar from "@/components/layout/UserBar";
const DataExport = () => {
  const [sensors, setSensors] = useState([]);
  const [selectedSensors, setSelectedSensors] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileName, setFileName] = useState('');
  const [format, setFormat] = useState('json');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSensors = async () => {
      try {
        const sensorData = await api.getUserSensors();
        setSensors(sensorData);
      } catch (err) {
        setError(err.message || 'Nepodařilo se načíst senzory');
      }
    };
    fetchSensors();
  }, []);

  const handleSensorToggle = (sensorId) => {
    setSelectedSensors(prev =>
      prev.includes(sensorId)
        ? prev.filter(id => id !== sensorId)
        : [...prev, sensorId]
    );
  };

  const handleExport = async () => {
    if (!startDate || !endDate || selectedSensors.length === 0) {
      const message = 'Vyplňte všechna povinná pole';
      setError(message);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const exportData = {
        startDate,
        endDate,
        sensorIds: selectedSensors,
        format,
        fileName: fileName || `data_export_${new Date().toISOString().split('T')[0]}`
      };

      const response = await api.exportSensorData(exportData);

      // Vytvoření a stažení souboru
      const blob = new Blob([response], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${exportData.fileName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setError(''); // Vyčištění chybové hlášky po úspěšném exportu
    } catch (err) {
      // Zobrazení chybové hlášky z backendu
      const errorMessage = err.message || 'Nastala neočekávaná chyba při exportu dat';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main">
      <UserBar />
      <main className="page-shell">
        <section className="main-content data-export-page">
          <h1>Export dat</h1>
          {error && <div className="error-message">{error}</div>}
          <div className="export-form">
            <div className="form-group">
              <label>Datum od:</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Datum do:</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Vyberte senzory:</label>
              <div className="sensor-list">
                {sensors.map(sensor => (
                  <label key={sensor.sensor_id} className="sensor-item">
                    <input
                      type="checkbox"
                      checked={selectedSensors.includes(sensor.sensor_id)}
                      onChange={() => handleSensorToggle(sensor.sensor_id)}
                    />
                    {sensor.name} ({sensor.unit})
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Název souboru (nepovinné):</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Pokud nevyplníte, použije se výchozí název"
              />
            </div>
            <div className="form-group">
              <label>Formát exportu:</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <button onClick={handleExport} disabled={loading}>
              {loading ? 'Exportuji...' : 'Exportovat data'}
            </button>
          </div>
        </section>
      </main>
      </div>
  );
};

export default DataExport;
