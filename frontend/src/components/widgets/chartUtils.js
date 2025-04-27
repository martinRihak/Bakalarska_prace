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
    toolbar: {
      show: true,
      tools: {
        download: true,
        selection: true,
        zoom: true,
        zoomin: true,
        zoomout: true,
        pan: true,
        reset: true
      },
      autoSelected: 'zoom'
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
    tooltip: {
      enabled: false
    }
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

export const getRadialBarOptions = (sensorName) => ({
  chart: {
    height: 350,
    type: "radialBar",
    toolbar: {
      show: true
    }
  },
  plotOptions: {
    radialBar: {
      startAngle: -135,
      endAngle: 225,
      hollow: {
        margin: 0,
        size: '70%',
        background: '#fff',
        image: undefined,
        imageOffsetX: 0,
        imageOffsetY: 0,
        position: 'front',
        dropShadow: {
          enabled: true,
          top: 3,
          left: 0,
          blur: 4,
          opacity: 0.5
        }
      },
      track: {
        background: '#fff',
        strokeWidth: '67%',
        margin: 0,
        dropShadow: {
          enabled: true,
          top: -3,
          left: 0,
          blur: 4,
          opacity: 0.7
        }
      },
      dataLabels: {
        show: true,
        name: {
          offsetY: -10,
          show: true,
          color: '#888',
          fontSize: '17px'
        },
        value: {
          formatter: function(val) {
            return parseInt(val);
          },
          color: '#111',
          fontSize: '36px',
          show: true,
        }
      }
    }
  },
  fill: {
    type: 'gradient',
    gradient: {
      shade: 'dark',
      type: 'horizontal',
      shadeIntensity: 0.5,
      gradientToColors: ['#ABE5A1'],
      inverseColors: true,
      opacityFrom: 1,
      opacityTo: 1,
      stops: [0, 100]
    }
  },
  stroke: {
    lineCap: 'round'
  },
  labels: ['Hodnota'],
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

export const getRadialBarSeries = (data) => {
  if (!data || data.length === 0) return [];
  return [{
    name: "Hodnota",
    data: [parseFloat(data[0].value.toFixed(1))]
  }];
};
