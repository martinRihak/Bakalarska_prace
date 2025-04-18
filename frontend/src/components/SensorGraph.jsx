import React, { useEffect, useState } from 'react';
import api from '@services/apiService';
import { useParams } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { LineChart, Line } from 'recharts';

const SensorGraph = () => {
  const { sensorId } = useParams();
  const [sensorData, setSensorData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.getSensorHistory(sensorId);
        if (!response) {
          throw new Error('Nepodařilo se načíst data ze senzoru');
        }
        setSensorData(response);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchData();
  }, [sensorId]);

  if (error) return <div className="error">{error}</div>;
  if (!sensorData) return <div>Načítání...</div>;

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
      text: `Data ze senzoru ${sensorData.sensor.name}`,
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
        text: sensorData.sensor.unit
      },
      min: -10,
      max: 50
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
    name: `${sensorData.sensor.name} (${sensorData.sensor.unit})`,
    data: sensorData.data.map(d => ({
      x: new Date(d.timestamp).getTime(),
      y: d.value
    }))
  }];

  return (
    <div className='main-content'>
      <div className="sensor-graph">
        <ReactApexChart 
          options={chartOptions}
          series={series}
          type="line"
          height={400}
          width={800}
        />
      </div>
    </div>
  );
};

export default SensorGraph;