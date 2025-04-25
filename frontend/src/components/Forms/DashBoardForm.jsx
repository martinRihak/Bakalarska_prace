import React, { useState } from 'react';
import api from '../../apiService';
import '@css/forms.css';

const DashBoardForm = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.createDashboard(formData);
      console.log('Dashboard vytvořen:', response);
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Error creating dashboard:', err);
      setError(err.message || 'Došlo k chybě při vytváření dashboardu');
    }
  };

  return (
    <div className="form-container">
      <div className="modal-header">
        <h2 className="form-heading">Vytvořit nový dashboard</h2>
      </div>
      
      {error && (
        <div className="form-error" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Název dashboardu
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="form-input"
            placeholder="Zadejte název dashboardu"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Popis
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            className="form-textarea"
            placeholder="Zadejte popis dashboardu (volitelné)"
          />
        </div>

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
          >
            Vytvořit
          </button>
        </div>
      </form>
    </div>
  );
};

export default DashBoardForm;