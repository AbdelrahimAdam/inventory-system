import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const ChartSection: React.FC = () => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    const myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو'],
        datasets: [
          {
            label: 'عدد الزجاجات',
            data: [120, 150, 80, 200, 170],
            backgroundColor: '#7C3AED',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Tajawal' } },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      myChart.destroy();
    };
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow-md">
      <h3 className="text-lg font-semibold text-purple-700 dark:text-white mb-4">إحصائيات الجرد</h3>
      <canvas ref={chartRef} />
    </div>
  );
};

export default ChartSection;
