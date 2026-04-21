const isDarkMode = (themeMode) => {
  if (themeMode) {
    return themeMode === "dark";
  }
  return document.documentElement.classList.contains("dark-mode");
};

export const getBaseChartOptions = (sensorName, themeMode) => {
  const dark = isDarkMode(themeMode);
  return {
    chart: {
      zoom: {
        enabled: true,
        autoScaleYaxis: true,
        zoomedArea: {
          fill: { color: "#3b82f6", opacity: 0.15 },
          stroke: { color: "#3b82f6", opacity: 0.3, width: 1 },
        },
      },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 350,
        animateGradually: { enabled: true, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
      background: "transparent",
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
      foreColor: dark ? "rgba(241,245,249,0.72)" : "rgba(15,23,42,0.65)",
      fontFamily: "Inter, system-ui, sans-serif",
    },
    theme: {
      mode: dark ? "dark" : "light",
    },
    tooltip: {
      x: { format: "dd.MM.yyyy HH:mm" },
      theme: dark ? "dark" : "light",
      shared: true,
      intersect: false,
      followCursor: true,
      style: { fontSize: "12px" },
      y: {
        formatter: (val) => (val !== undefined ? val.toFixed(1) : ""),
      },
    },
    stroke: {
      curve: "smooth",
      width: 2.5,
      lineCap: "round",
    },
    grid: {
      borderColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      strokeDashArray: 4,
      padding: { left: 10, right: 10 },
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    markers: {
      size: 0,
      strokeWidth: 0,
      hover: { size: 5, sizeOffset: 3 },
    },
    legend: {
      labels: {
        colors: dark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,1)",
      },
    },
    yaxis: {
      title: {
        text: sensorName,
        style: {
          fontSize: "12px",
          fontWeight: 500,
          color: dark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,1)",
        },
      },
      tickAmount: 5,
      forceNiceScale: true,
      decimalsInFloat: 1,
      labels: {
        formatter: (val) => val.toFixed(1),
        style: {
          fontSize: "11px",
          colors: dark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,)",
        },
      },
    },
  };
};

export const getAreaChartOptions = (sensorName, themeMode) => {
  const dark = isDarkMode(themeMode);
  const base = getBaseChartOptions(sensorName, themeMode);
  return {
    ...base,
    chart: { ...base.chart, type: "area" },
    colors: ["#3b82f6"],
    dataLabels: { enabled: false },
    xaxis: {
      type: "datetime",
      labels: {
        datetimeFormatter: {
          year: "yyyy",
          month: "MMM",
          day: "dd MMM",
          hour: "HH:mm",
        },
        rotate: -45,
        rotateAlways: false,
        hideOverlappingLabels: true,
        style: {
          fontSize: "11px",
          colors: dark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,1)",
        },
      },
      tickAmount: 6,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.03,
        stops: [0, 100],
        colorStops: [
          {
            offset: 0,
            color: "#3b82f6",
            opacity: 0.3,
          },
          {
            offset: 100,
            color: "#3b82f6",
            opacity: 0.02,
          },
        ],
      },
    },
  };
};

export const getLineChartOptions = (sensorName, themeMode) => {
  const dark = isDarkMode(themeMode);
  const base = getBaseChartOptions(sensorName, themeMode);
  return {
    ...base,
    chart: { ...base.chart, type: "line" },
    colors: ["#3b82f6"],
    xaxis: {
      type: "datetime",
      labels: {
        datetimeFormatter: {
          year: "yyyy",
          month: "MMM",
          day: "dd MMM",
          hour: "HH:mm",
        },
        rotate: -45,
        rotateAlways: false,
        hideOverlappingLabels: true,
        style: {
          fontSize: "11px",
          colors: dark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,1)",
        },
      },
      tickAmount: 6,
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    stroke: {
      curve: "smooth",
      width: 2.5,
    },
  };
};

export const getRadialBarChartOptions = (sensorName, themeMode, min, max, unit) => {
  const dark = isDarkMode(themeMode);
  const minValue = typeof min === "number" ? min : 0;
  const maxValue = typeof max === "number" ? max : 100;
  const range = maxValue - minValue;
  const suffix = unit ? ` ${unit}` : "";
  return {
    chart: {
      type: "radialBar",
      background: "transparent",
      foreColor: dark ? "rgba(241,245,249,0.72)" : "rgba(15,23,42,0.65)",
      fontFamily: "Inter, system-ui, sans-serif",
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 500,
        dynamicAnimation: { enabled: true, speed: 500 },
      },
    },
    theme: { mode: dark ? "dark" : "light" },
    colors: ["#3b82f6"],
    plotOptions: {
      radialBar: {
        startAngle: -135,
        endAngle: 135,
        hollow: {
          margin: 0,
          size: "62%",
          background: "transparent",
        },
        track: {
          background: dark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
          strokeWidth: "100%",
          margin: 0,
        },
        dataLabels: {
          name: {
            show: true,
            offsetY: -12,
            color: dark ? "rgba(241,245,249,0.8)" : "rgba(15,23,42,0.7)",
            fontSize: "13px",
            fontWeight: 500,
          },
          value: {
            show: true,
            offsetY: 6,
            color: dark ? "rgba(255,255,255,1)" : "rgba(15,23,42,1)",
            fontSize: "28px",
            fontWeight: 600,
            formatter: (val) => {
              if (range <= 0) return `${minValue.toFixed(1)}${suffix}`;
              const actual = minValue + (parseFloat(val) / 100) * range;
              return `${actual.toFixed(1)}${suffix}`;
            },
          },
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shade: dark ? "dark" : "light",
        type: "horizontal",
        shadeIntensity: 0.4,
        gradientToColors: ["#60a5fa"],
        inverseColors: false,
        opacityFrom: 1,
        opacityTo: 1,
        stops: [0, 100],
      },
    },
    stroke: {
      lineCap: "round",
    },
    labels: [sensorName || "Hodnota"],
  };
};

export const getAreaChartSeries = (data, sensorName) => [
  {
    name: sensorName || "Hodnota",
    data: data
      .filter((d) => d.timestamp)
      .map((d) => ({
        x: new Date(d.timestamp).getTime(),
        y: parseFloat(d.value.toFixed(1)),
      })),
  },
];

export const getLineChartSeries = (data, sensorName) => [
  {
    name: sensorName || "Hodnota",
    data: data
      .filter((d) => d.timestamp)
      .map((d) => ({
        x: new Date(d.timestamp).getTime(),
        y: parseFloat(d.value.toFixed(1)),
      })),
  },
];

export const getRadialBarChartSeries = (value, min, max) => {
  if (value === undefined || value === null) return [0];
  const minValue = typeof min === "number" ? min : 0;
  const maxValue = typeof max === "number" ? max : 100;
  const range = maxValue - minValue;
  if (range <= 0) return [0];
  const pct = ((parseFloat(value) - minValue) / range) * 100;
  return [Math.max(0, Math.min(100, parseFloat(pct.toFixed(1))))];
};
