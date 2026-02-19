import React, { useState, useEffect } from 'react';
import api from '@/api/apiService';
import SensorForm from '@/components/forms/SensorForm';
import '@css/forms.css';

const AddSensorModal = ({ onClose, onAdd }) => {
  const [mode, setMode] = useState(null); // 'existing' or 'new'
  const [availableSensors, setAvailableSensors] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [newSensorData, setNewSensorData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode === 'existing') {
      fetchAvailableSensors();
    }
  }, [mode]);

  const fetchAvailableSensors = async () => {
    try {
      const response = await api.getAvailableSensors();
      setAvailableSensors(response);
    } catch (err) {
      setError('Nepodařilo se načíst dostupné senzory');
    }
  };

  const handleAddExisting = async () => {
    if (!selectedSensorId) {
      setError('Vyberte senzor');
      return;
    }
    try {
      await api.addSensorToUser(selectedSensorId);
      onAdd();
    } catch (err) {
      setError('Nepodařilo se přidat senzor');
    }
  };

  const handleCreateNew = async (sensorData) => {
    try {
      const response = await api.createSensor(sensorData);
      await api.addSensorToUser(response.sensor_id);
      onAdd();
    } catch (err) {
      setError('Nepodařilo se vytvořit senzor');
    }
  };

  const handleBaseOnExisting = (e) => {
    const sensorId = e.target.value;
    const sensor = availableSensors.find(s => s.sensor_id === parseInt(sensorId));
    setNewSensorData(sensor || {});
  };

  return (
    <div className="modal-overlay">
      <div className="form-container">
        {!mode ? (
          <>
            <h2 className="form-heading">Přidat senzor</h2>
            <button onClick={() => setMode('existing')} className="form-submit">Přidat existující</button>
            <button onClick={() => setMode('new')} className="form-submit">Vytvořit nový</button>
            <button onClick={onClose} className="form-button cancel">Zrušit</button>
          </>
        ) : mode === 'existing' ? (
          <>
            <h2 className="form-heading">Vybrat existující senzor</h2>
            {error && <div className="error-message">{error}</div>}
            <select
              value={selectedSensorId}
              onChange={(e) => setSelectedSensorId(e.target.value)}
              className="form-select"
            >
              <option value="">Vyberte senzor</option>
              {availableSensors.map(sensor => (
                <option key={sensor.sensor_id} value={sensor.sensor_id}>
                  {sensor.name} ({sensor.sensor_type})
                </option>
              ))}
            </select>
            <div className="form-footer">
              <button onClick={handleAddExisting} className="form-submit">Přidat</button>
              <button onClick={onClose} className="form-button cancel">Zrušit</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="form-heading">Vytvořit nový senzor</h2>
            {error && <div className="error-message">{error}</div>}
            <select onChange={handleBaseOnExisting} className="form-select">
              <option value="">Vybrat šablonu (volitelné)</option>
              {availableSensors.map(sensor => (
                <option key={sensor.sensor_id} value={sensor.sensor_id}>
                  {sensor.name}
                </option>
              ))}
            </select>
            <SensorForm sensor={newSensorData} onSubmit={handleCreateNew} onClose={onClose} />
          </>
        )}
      </div>
    </div>
  );
};

export default AddSensorModal;