import React, { useState, useEffect } from 'react';
import '@css/forms.css';

const SensorForm = ({ sensor = null, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    sensor_id: sensor ? sensor.sensor_id : null,
    parent_sensor_id: sensor ? sensor.parent_sensor_id  : null,
    name: sensor ? sensor.name : '',
    sensor_type: sensor ? sensor.sensor_type : '',
    address: sensor ? sensor.address : '',
    functioncode: sensor ? sensor.functioncode : '',
    bit: sensor ? sensor.bit : '',
    scaling: sensor ? sensor.scaling : '',
    unit: sensor ? sensor.unit : '',
    min_value: sensor ? sensor.min_value : '',
    max_value: sensor ? sensor.max_value : '',
    sampling_rate: sensor ? sensor.sampling_rate : '',
    is_active: sensor ? sensor.is_active : true,
  });

  useEffect(() => {
    if (sensor) {
      setFormData({
        parent_sensor_id: sensor.parent_sensor_id,
        sensor_id: sensor.sensor_id,
        name: sensor.name || '',
        sensor_type: sensor.sensor_type || '',
        address: sensor.address || '',
        functioncode: sensor.functioncode || '',
        bit: sensor.bit || '',
        scaling: sensor.scaling || '',
        unit: sensor.unit || '',
        min_value: sensor.min_value || '',
        max_value: sensor.max_value || '',
        sampling_rate: sensor.sampling_rate || '',
        is_active: sensor.is_active !== undefined ? sensor.is_active : true,
      });
    } else {
      setFormData({
        name: '',
        sensor_type: '',
        address: '',
        functioncode: '',
        bit: '',
        scaling: '',
        unit: '',
        min_value: '',
        max_value: '',
        sampling_rate: '',
        is_active: true,
      });
    }
  }, [sensor]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="form-container">
      <h2 className="form-heading">{sensor?.sensor_id ? 'Upravit senzor' : 'Vytvořit senzor'}</h2>
      <form onSubmit={handleSubmit}>

        <div className="form-group">
          <label htmlFor="name" className="form-label">Název</label>
          <input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="sensor_type" className="form-label">Typ senzoru</label>
          <input
            id="sensor_type"
            name="sensor_type"
            value={formData.sensor_type}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="address" className="form-label">Adresa</label>
          <input
            id="address"
            name="address"
            type="number"
            value={formData.address}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="functioncode" className="form-label">Function Code</label>
          <input
            id="functioncode"
            name="functioncode"
            type="number"
            value={formData.functioncode}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="bit" className="form-label">Bit</label>
          <input
            id="bit"
            name="bit"
            type="number"
            value={formData.bit}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="scaling" className="form-label">Scaling</label>
          <input
            id="scaling"
            name="scaling"
            type="number"
            value={formData.scaling}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="unit" className="form-label">Jednotka</label>
          <input
            id="unit"
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="min_value" className="form-label">Minimální hodnota</label>
          <input
            id="min_value"
            name="min_value"
            type="number"
            step="any"
            value={formData.min_value}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="max_value" className="form-label">Maximální hodnota</label>
          <input
            id="max_value"
            name="max_value"
            type="number"
            step="any"
            value={formData.max_value}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="sampling_rate" className="form-label">Sampling Rate (minuty)</label>
          <input
            id="sampling_rate"
            name="sampling_rate"
            type="number"
            value={formData.sampling_rate}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="is_active" className="form-label">Aktivní</label>
          <input
            id="is_active"
            name="is_active"
            type="checkbox"
            checked={formData.is_active}
            onChange={handleChange}
            className="form-input"
          />
        </div>
        <div className="form-footer">
          <button type="button" onClick={onClose} className="form-button cancel">Zrušit</button>
          <button type="submit" className="form-submit">Uložit</button>
        </div>
      </form>
    </div>
  );
};

export default SensorForm;