export const getBaseChartOptions = (sensorName) => ({
  chart: {
    zoom: {
      enabled: true,
      autoScaleYaxis: true,
      zoomedArea: {
        fill: {
          color: '#90CAF9',
          opacity: 0.4
        },
        stroke: {
          color: '#0D47A1',
          opacity: 0.4,
          width: 1
        }
      }
    },

    animations: {
      enabled: true,
      easing: 'easeinout',
      speed: 350,
      animateGradually: {
        enabled: true,
        delay: 150
      },
      dynamicAnimation: {
        enabled: true,
        speed: 350
      }
    },
    background: 'transparent'
  },
  tooltip: {
    x: {
      format: "dd.MM.yyyy HH:mm",
    },
    theme: 'dark',
    shared: true,
    intersect: false,
    followCursor: true
  },
  stroke: {
    curve: 'smooth',
    width: 2,
    lineCap: 'round'
  },
  grid: {
    padding: {
      left: 10,
      right: 10
    },
    xaxis: {
      lines: {
        show: true
      }
    }
  },
  markers: {
    size: 0,
    strokeWidth: 0,
    hover: {
      size: 5,
      sizeOffset: 3
    }
  },
  yaxis: {
    title: { text: sensorName },
    tickAmount: 5,
    forceNiceScale: true,
    decimalsInFloat: 1,
    labels: {
      formatter: (val) => val.toFixed(1)
    }
  }
});

export const getAreaChartOptions = (sensorName) => ({
  ...getBaseChartOptions(sensorName),
  chart: {
    ...getBaseChartOptions(sensorName).chart,
    type: "area"
  },
  dataLabels: {
    enabled: false
  },
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
      hideOverlappingLabels: true
    },
    tickAmount: 6,
  },
  fill: {
    type: "gradient",
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0.05,
      stops: [50, 100]
    }
  }
});

export const getLineChartOptions = (sensorName) => ({
  ...getBaseChartOptions(sensorName),
  chart: {
    ...getBaseChartOptions(sensorName).chart,
    type: "line"
  },
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
      hideOverlappingLabels: true
    },
    tickAmount: 6
  },
  stroke: {
    curve: 'smooth',
    width: 2
  }
});
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