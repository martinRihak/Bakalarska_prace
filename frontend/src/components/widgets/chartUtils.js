// Base chart options that are common for all chart types
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

// Area chart specific options
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

// Enhanced RadialBar chart specific options
export const getEnhancedRadialBarOptions = (sensorName) => ({
  ...getBaseChartOptions(sensorName),
  chart: {
    ...getBaseChartOptions(sensorName).chart,
    type: "radialBar",
    offsetY: -20
  },
  plotOptions: {
    radialBar: {
      startAngle: -135,
      endAngle: 135,
      hollow: {
        margin: 15,
        size: "70%",
        background: "#fff",
        imageOffsetX: 0,
        imageOffsetY: 0,
        dropShadow: {
          enabled: true,
          top: 3,
          left: 0,
          blur: 4,
          opacity: 0.24
        }
      },
      track: {
        background: "#fff",
        strokeWidth: "67%",
        margin: 0,
        dropShadow: {
          enabled: true,
          top: -3,
          left: 0,
          blur: 4,
          opacity: 0.35
        }
      },
      dataLabels: {
        show: true,
        name: {
          offsetY: -10,
          show: true,
          color: "#888",
          fontSize: "17px"
        },
        value: {
          formatter: function(val) {
            return typeof val === 'number' ? val.toFixed(1) : '0.0';
          },
          color: "#111",
          fontSize: "36px",
          show: true,
          offsetY: 5
        }
      }
    }
  },
  fill: {
    type: "gradient",
    gradient: {
      shade: "dark",
      type: "horizontal",
      shadeIntensity: 0.5,
      gradientToColors: ["#ABE5A1"],
      inverseColors: true,
      opacityFrom: 1,
      opacityTo: 1,
      stops: [0, 100]
    }
  },
  states: {
    hover: {
      filter: {
        type: 'none'
      }
    }
  }
});

// Line chart specific options
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

// Regular RadialBar options
export const getRadialBarOptions = (sensorName) => ({
  ...getBaseChartOptions(sensorName),
  chart: {
    ...getBaseChartOptions(sensorName).chart,
    type: "radialBar"
  },
  plotOptions: {
    radialBar: {
      startAngle: -90,
      endAngle: 90,
      hollow: {
        margin: 0,
        size: "70%"
      },
      track: {
        background: "#e7e7e7",
        strokeWidth: "97%",
        margin: 5,
        dropShadow: {
          enabled: true,
          top: 2,
          left: 0,
          blur: 4,
          opacity: 0.15
        }
      },
      dataLabels: {
        name: {
          show: true,
          fontSize: "16px",
          offsetY: -10
        },
        value: {
          show: true,
          fontSize: "30px",
          formatter: function(val) {
            return typeof val === 'number' ? val.toFixed(1) : '0.0';
          }
        }
      }
    }
  },
  fill: {
    type: "gradient",
    gradient: {
      shade: "dark",
      type: "horizontal",
      colorStops: [
        {
          offset: 0,
          color: "#4CAF50",
          opacity: 1
        },
        {
          offset: 100,
          color: "#8BC34A",
          opacity: 1
        }
      ]
    }
  }
});

// Data transformation functions for each chart type
export const getAreaChartSeries = (data, sensorName) => [{
  name: sensorName || "Hodnota",
  data: data.map(d => ({
    x: new Date(d.timestamp).getTime(),
    y: parseFloat(d.value.toFixed(1))
  }))
}];

export const getEnhancedRadialBarSeries = (data, sensorName) => {
  const latestData = data[data.length - 1];
  const allValues = data.map(d => d.value);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const value = latestData ? parseFloat(latestData.value.toFixed(1)) : 0;
  const percentage = range === 0 ? 0 : ((value - minValue) / range * 100);
  
  return [{
    name: sensorName || "Hodnota",
    data: [parseFloat(percentage.toFixed(1))],
    value
  }];
};

export const getLineChartSeries = (data, sensorName) => [{
  name: sensorName || "Hodnota",
  data: data.map(d => ({
    x: new Date(d.timestamp).getTime(),
    y: parseFloat(d.value.toFixed(1))
  }))
}];

export const getRadialBarSeries = (data, sensorName) => {
  const latestData = data[data.length - 1];
  const allValues = data.map(d => d.value);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const range = maxValue - minValue;
  const value = latestData ? parseFloat(latestData.value.toFixed(1)) : 0;
  const percentage = range === 0 ? 0 : ((value - minValue) / range * 100);
  
  return [{
    name: sensorName || "Hodnota",
    data: [parseFloat(percentage.toFixed(1))],
    value
  }];
};