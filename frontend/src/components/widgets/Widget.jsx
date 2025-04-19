import React, { useState, useEffect } from 'react';
import { RefreshCw, Maximize2, X, ImageOff } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import api from '@services/apiService';

const Widget = ({ title, sensorName, id }) => {
    const [sensorData, setSensorData] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await api.getSensorHistory(id);
            if (!response) {
                throw new Error('Nepodařilo se načíst data ze senzoru');
            }
            setSensorData(response.data);
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

    const chartOptions = {
        chart: {
            type: 'line',
            zoom: {
                enabled: true
            },
            toolbar: {
                show: false
            }
        },
        stroke: {
            curve: 'smooth',
            width: 2
        },
        title: {
            text: title,
            align: 'center'
        },
        xaxis: {
            type: 'datetime',
            title: {
                text: 'Čas'
            },
            labels: {
                datetimeFormatter: {
                    year: 'yyyy',
                    month: 'MMM \'yy',
                    day: 'dd MMM',
                    hour: 'HH:mm'
                },
                rotateAlways: true,
                rotate: -45
            }
        },
        yaxis: {
            title: {
                text: sensorName || 'Hodnota'
            }
        },
        tooltip: {
            x: {
                format: 'dd.MM.yyyy HH:mm'
            }
        },
        markers: {
            size: 0
        }
    };

    const series = [{
        name: sensorName || 'Hodnota',
        data: sensorData.map(d => ({
            x: new Date(d.timestamp).getTime(),
            y: d.value
        }))
    }];

    return (
        <div className="widget">
            <div className="widget-header">
                <h3>{title}</h3>
                <div className="widget-controls">
                </div>
            </div>
            <div className="widget-content">
                {error ? (
                    <div className="error-message">
                        <ImageOff />
                        <p>{error}</p>
                    </div>
                ) : (
                    <ReactApexChart 
                        options={chartOptions}
                        series={series}
                        type="line"
                        height="100%"
                        width="100%"
                    />
                )}
            </div>
        </div>
    );
};

export default Widget;