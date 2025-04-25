import React, { useEffect, useState } from 'react';
import api from '@services/apiService';
import { useParams } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';

const SensorGraph = () => {
  const { sensorId } = useParams();
  const [sensorData, setSensorData] = useState(null);
  const [sensorInfo, setSensorInfo] = useState(null);
  const [timeRange, setTimeRange] = useState('day');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.getSensorHistory(sensorId, timeRange);
        setSensorData(result.data);
        setSensorInfo(result.sensor);
      } catch (error) {
        console.error('Error fetching sensor data:', error);
      }
    };

    fetchData();
  }, [sensorId, timeRange]);

  if (!sensorData || !sensorInfo) return <div>Načítání...</div>;

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
      text: `Data ze senzoru ${sensorInfo.name}`,
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
        text: sensorInfo.unit
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
    name: `${sensorInfo.name} (${sensorInfo.unit})`,
    data: sensorData.map(d => ({
      x: new Date(d.timestamp).getTime(),
      y: d.value
    }))
  }];

  return (
    <div className="sensor-graph">
      <div className="graph-controls">
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="time-range-select"
        >
          <option value="hour">Last Hour</option>
          <option value="day">Last Day</option>
          <option value="week">Last Week</option>
          <option value="month">Last Month</option>
        </select>
      </div>
      <ReactApexChart 
        options={chartOptions}
        series={series}
        type="line"
        height={400}
        width={800}
      />
    </div>
  );
};

export default SensorGraph;