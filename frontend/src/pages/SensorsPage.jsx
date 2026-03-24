import React, { useState, useEffect } from 'react';
import api from '@/api/apiService';
import AddSensorModal from '@/components/forms/AddSensorModal';
import '@css/SensorsPage.css';
import SensorForm from '@/components/forms/SensorForm';
import UserBar from "@/components/layout/UserBar";
const SensorsPage = () => {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingSensor, setEditingSensor] = useState(null);

  useEffect(() => {
    fetchSensors();
  }, []);

  const fetchSensors = async () => {
    try {
      const response = await api.getUserSensors();
      setSensors(response);
      setLoading(false);
    } catch (err) {
      setError('Nepodařilo se načíst senzory');
      setLoading(false);
    }
  };

  const handleToggleActive = async (sensorId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      await api.toggleSensorActive(sensorId, newStatus);
      setSensors(sensors.map(sensor =>
        sensor.sensor_id === sensorId ? { ...sensor, is_active: newStatus } : sensor
      ));
    } catch (err) {
      setError('Nepodařilo se změnit stav senzoru');
    }
  };

  const handleEditSensor = (sensor) => {
    console.log(sensor);
    setEditingSensor(sensor);
  };

  const handleUpdateSensor = async (updatedSensor) => {
    try {
      console.log(updatedSensor);
      await api.updateSensor(updatedSensor);
      setSensors(sensors.map(sensor =>
        sensor.sensor_id === updatedSensor.sensor_id ? updatedSensor : sensor
      ));
      setEditingSensor(null);
    } catch (err) {
      setError('Nepodařilo se aktualizovat senzor');
    }
  };

  const handleAddSensor = () => {
    fetchSensors(); // Refresh sensor list after adding
    setIsAddModalOpen(false);
  };

  return (
    <div className="main">
      <UserBar />
      <main className="page-shell">
        <section className="main-content sensors-page">
          <h1>Moje senzory</h1>
          {loading ? (
            <div>Načítání senzorů...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              <button onClick={() => setIsAddModalOpen(true)} className="add-sensor-btn">
                Přidat senzor
              </button>
              <table className="sensor-table">
                <thead>
                  <tr>
                    <th>Název</th>
                    <th>Typ</th>
                    <th>Jednotka</th>
                    <th>Aktivní</th>
                    <th>Akce</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map(sensor => (
                    <tr key={sensor.sensor_id}>
                      <td>{sensor.name}</td>
                      <td>{sensor.sensor_type}</td>
                      <td>{sensor.unit}</td>
                      <td>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={sensor.is_active}
                            onChange={() => handleToggleActive(sensor.sensor_id, sensor.is_active)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>
                      <td>
                        <button onClick={() => handleEditSensor(sensor)}>Upravit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {isAddModalOpen && (
                <AddSensorModal
                  onClose={() => setIsAddModalOpen(false)}
                  onAdd={handleAddSensor}
                />
              )}

              {editingSensor && (
                <SensorForm
                  sensor={editingSensor}
                  onSubmit={handleUpdateSensor}
                  onClose={() => setEditingSensor(null)}
                />
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default SensorsPage;
