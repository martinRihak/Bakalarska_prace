import { useState, useEffect, useRef } from 'react';
import api from '@/api/apiService';
import '@css/DataImport.css';
import UserBar from '@/components/layout/UserBar';

const DataImport = () => {
  const [sensors, setSensors] = useState([]);
  const [selectedSensorId, setSelectedSensorId] = useState('');
  const [file, setFile] = useState(null);
  const [parsedRecords, setParsedRecords] = useState([]);
  const [parseError, setParseError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.getUserSensors()
      .then(setSensors)
      .catch(() => setError('Nepodařilo se načíst senzory'));
  }, []);

  const parseJSON = (content) => {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) throw new Error('JSON musí obsahovat pole záznamů');
    return data.map((item, i) => {
      if (!item.timestamp || item.value === undefined)
        throw new Error(`Záznam ${i + 1}: chybí pole timestamp nebo value`);
      return { timestamp: item.timestamp, value: parseFloat(item.value) };
    });
  };

  const parseCSV = (content) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV soubor neobsahuje žádná data');
    const sep = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(sep).map(h => h.trim());
    const tsIdx = headers.indexOf('timestamp');
    const valIdx = headers.indexOf('value');
    if (tsIdx === -1 || valIdx === -1)
      throw new Error('CSV musí obsahovat sloupce timestamp a value');
    return lines.slice(1).map((line, i) => {
      const cols = line.split(sep);
      const timestamp = cols[tsIdx]?.trim();
      const value = parseFloat(cols[valIdx]?.trim());
      if (!timestamp || isNaN(value))
        throw new Error(`Řádek ${i + 2}: neplatná hodnota timestamp nebo value`);
      return { timestamp, value };
    });
  };

  const processFile = (f) => {
    setFile(f);
    setParseError('');
    setParsedRecords([]);
    setMessage('');
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
        let records;
        if (f.name.endsWith('.json')) {
          records = parseJSON(content);
        } else if (f.name.endsWith('.csv')) {
          records = parseCSV(content);
        } else {
          throw new Error('Nepodporovaný formát. Použijte soubor .json nebo .csv');
        }
        setParsedRecords(records);
      } catch (err) {
        setParseError(err.message);
      }
    };
    reader.readAsText(f);
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) processFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const handleImport = async () => {
    if (!selectedSensorId) { setError('Vyberte cílový senzor'); return; }
    if (parsedRecords.length === 0) { setError('Nahrajte platný soubor s daty'); return; }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await api.importSensorData({
        sensorId: parseInt(selectedSensorId),
        records: parsedRecords,
      });
      setMessage(result.message || 'Data byla úspěšně importována');
      setParsedRecords([]);
      setFile(null);
    } catch (err) {
      setError(err.message || 'Chyba při importu dat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main">
      <UserBar />
      <main className="page-shell">
        <section className="main-content data-import-page">
          <h1>Import dat</h1>

          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <div className="import-form">
            <div className="form-group">
              <label>Cílový senzor:</label>
              <select
                value={selectedSensorId}
                onChange={(e) => setSelectedSensorId(e.target.value)}
              >
                <option value="">— Vyberte senzor —</option>
                {sensors.map(s => (
                  <option key={s.sensor_id} value={s.sensor_id}>
                    {s.name} ({s.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Soubor (CSV nebo JSON):</label>
              <div
                className={`drop-zone${isDragging ? ' drop-zone--active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                {file ? (
                  <span className="drop-zone__filename">{file.name}</span>
                ) : (
                  <>
                    <span className="drop-zone__icon">↑</span>
                    <span>Přetáhněte soubor nebo klikněte pro výběr</span>
                    <span className="drop-zone__hint">.json · .csv</span>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>

            {parseError && <div className="parse-error">{parseError}</div>}

            {parsedRecords.length > 0 && (
              <div className="form-group">
                <label>Náhled ({parsedRecords.length} záznamů):</label>
                <div className="import-preview">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Hodnota</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRecords.slice(0, 5).map((r, i) => (
                        <tr key={i}>
                          <td>{r.timestamp}</td>
                          <td>{r.value}</td>
                        </tr>
                      ))}
                      {parsedRecords.length > 5 && (
                        <tr>
                          <td colSpan={2} className="preview-more">
                            … a dalších {parsedRecords.length - 5} záznamů
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={loading || parsedRecords.length === 0 || !selectedSensorId}
            >
              {loading ? 'Importuji…' : 'Importovat data'}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default DataImport;
