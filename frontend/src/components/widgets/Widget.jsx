import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, Maximize2, X, ImageOff } from 'lucide-react';
import api from '../../apiService';

const Widget = ({ title, sensorName }) => {
    const [sensorData, setSensorData] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await api.getSensorHistory(1);
            if (!response) {
                throw new Error('Nepodařilo se načíst data ze senzoru');
            }
            setSensorData(response);
            setError(null);
            setLastUpdate(new Date());
        } catch (err) {
            setError(err.message);
            console.error('Chyba při načítání dat:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRefresh = () => {
        fetchData();
    };

    return (
        <div className="widget">
            <div className="widget-header">
                <h3>{title}</h3>
                <div className="widget-controls">
                    <RefreshCw 
                        className={`widget-icon ${isLoading ? 'rotating' : ''}`} 
                        onClick={handleRefresh} 
                    />
                    <Maximize2 className="widget-icon" />
                    <X className="widget-icon" />
                </div>
            </div>
            <div className="widget-content">
                {error ? (
                    <div className="error-message">
                        <ImageOff />
                        <p>{error}</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={sensorData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="timestamp" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#8884d8" 
                                name={sensorName || 'Hodnota'} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default Widget;