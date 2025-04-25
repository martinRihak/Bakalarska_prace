import React from 'react';
import ReactApexChart from 'react-apexcharts';

const Graph = ({ type, options, series }) => {
  return (
    <ReactApexChart
      options={{ ...options, chart: { ...options.chart, type } }}
      series={series}
      height="100%"
      width="100%"
    />
  );
};

export default Graph;