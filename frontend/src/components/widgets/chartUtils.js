const isDarkMode = () => document.documentElement.classList.contains('dark-mode');

export const getBaseChartOptions = (sensorName) => {
  const dark = isDarkMode();
  return {
    chart: {
      zoom: {
        enabled: true,
        autoScaleYaxis: true,
        zoomedArea: {
          fill: { color: '#3b82f6', opacity: 0.15 },
          stroke: { color: '#3b82f6', opacity: 0.3, width: 1 }
        }
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 350,
        animateGradually: { enabled: true, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 350 }
      },
      background: 'transparent',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    tooltip: {
      x: { format: "dd.MM.yyyy HH:mm" },
      theme: dark ? 'dark' : 'light',
      shared: true,
      intersect: false,
      followCursor: true,
      style: { fontSize: '12px' },
      y: {
        formatter: (val) => val !== undefined ? val.toFixed(1) : ''
      }
    },
    stroke: {
      curve: 'smooth',
      width: 2.5,
      lineCap: 'round'
    },
    grid: {
      borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      strokeDashArray: 4,
      padding: { left: 10, right: 10 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } }
    },
    markers: {
      size: 0,
      strokeWidth: 0,
      hover: { size: 5, sizeOffset: 3 }
    },
    yaxis: {
      title: {
        text: sensorName,
        style: {
          fontSize: '12px',
          fontWeight: 500,
          color: dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
        }
      },
      tickAmount: 5,
      forceNiceScale: true,
      decimalsInFloat: 1,
      labels: {
        formatter: (val) => val.toFixed(1),
        style: {
          fontSize: '11px',
          colors: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
        }
      }
    }
  };
};

export const getAreaChartOptions = (sensorName) => {
  const dark = isDarkMode();
  const base = getBaseChartOptions(sensorName);
  return {
    ...base,
    chart: { ...base.chart, type: "area" },
    colors: ['#3b82f6'],
    dataLabels: { enabled: false },
    xaxis: {
      type: "datetime",
      labels: {
        datetimeFormatter: {
          year: "yyyy",
          month: "MMM",
          day: "dd MMM",
          hour: "HH:mm"
        },
        rotate: -45,
        rotateAlways: false,
        hideOverlappingLabels: true,
        style: {
          fontSize: '11px',
          colors: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
        }
      },
      tickAmount: 6,
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.03,
        stops: [0, 100],
        colorStops: [{
          offset: 0,
          color: '#3b82f6',
          opacity: 0.3
        }, {
          offset: 100,
          color: '#3b82f6',
          opacity: 0.02
        }]
      }
    }
  };
};

export const getLineChartOptions = (sensorName) => {
  const dark = isDarkMode();
  const base = getBaseChartOptions(sensorName);
  return {
    ...base,
    chart: { ...base.chart, type: "line" },
    colors: ['#3b82f6'],
    xaxis: {
      type: "datetime",
      labels: {
        datetimeFormatter: {
          year: "yyyy",
          month: "MMM",
          day: "dd MMM",
          hour: "HH:mm"
        },
        rotate: -45,
        rotateAlways: false,
        hideOverlappingLabels: true,
        style: {
          fontSize: '11px',
          colors: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
        }
      },
      tickAmount: 6,
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    stroke: {
      curve: 'smooth',
      width: 2.5
    }
  };
};

export const getBarChartOptions = (sensorName) => {
  const dark = isDarkMode();
  const base = getBaseChartOptions(sensorName);
  return {
    ...base,
    chart: {
      ...base.chart,
      type: "bar",
    },
    colors: ['#3b82f6'],
    plotOptions: {
      bar: {
        borderRadius: 6,
        borderRadiusApplication: 'end',
        columnWidth: '60%',
        distributed: false,
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: "datetime",
      labels: {
        datetimeFormatter: {
          year: "yyyy",
          month: "MMM",
          day: "dd MMM",
          hour: "HH:mm"
        },
        rotate: -45,
        rotateAlways: false,
        hideOverlappingLabels: true,
        style: {
          fontSize: '11px',
          colors: dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'
        }
      },
      tickAmount: 6,
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    fill: {
      type: 'gradient',
      gradient: {
        shade: dark ? 'dark' : 'light',
        type: 'vertical',
        shadeIntensity: 0.3,
        opacityFrom: 0.85,
        opacityTo: 0.55,
        stops: [0, 100]
      }
    },
    stroke: {
      width: 0
    }
  };
};

export const getAreaChartSeries = (data, sensorName) => [{
  name: sensorName || "Hodnota",
  data: data
    .filter(d => d.timestamp)
    .map(d => ({
      x: new Date(d.timestamp).getTime(),
      y: parseFloat(d.value.toFixed(1))
    }))
}];

export const getLineChartSeries = (data, sensorName) => [{
  name: sensorName || "Hodnota",
  data: data
    .filter(d => d.timestamp)
    .map(d => ({
      x: new Date(d.timestamp).getTime(),
      y: parseFloat(d.value.toFixed(1))
    }))
}];

export const getBarChartSeries = (data, sensorName) => [{
  name: sensorName || "Hodnota",
  data: data
    .filter(d => d.timestamp)
    .map(d => ({
      x: new Date(d.timestamp).getTime(),
      y: parseFloat(d.value.toFixed(1))
    }))
}];
