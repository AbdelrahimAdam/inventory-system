import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface Item {
  name: string;
  type: 'bottle' | 'accessory';
  sold?: number;
}

interface ChartSectionProps {
  inventory: Item[];
  view: 'week' | 'month';
}

const ChartSection: React.FC<ChartSectionProps> = ({ inventory, view }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Filter only sold items
    const filtered = inventory.filter((item) => item.sold && item.sold > 0);

    // Prepare data: weekly view scales down sales by 25% (same logic as in ManagerDashboardPage)
    const labels = filtered.map((item) => item.name);
    const dataValues = filtered.map((item) =>
      view === 'week' ? Math.round((item.sold ?? 0) * 0.25) : item.sold ?? 0
    );

    const myChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'عدد القطع المباعة',
            data: dataValues,
            backgroundColor: '#7C3AED',
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Tajawal', size: 12 } },
          },
          tooltip: { bodyFont: { family: 'Tajawal', size: 12 } },
        },
        scales: {
          x: { ticks: { font: { family: 'Tajawal', size: 12 } } },
          y: {
            beginAtZero: true,
            ticks: { font: { family: 'Tajawal', size: 12 } },
          },
        },
      },
    });

    return () => {
      myChart.destroy();
    };
  }, [inventory, view]); // re-render chart when inventory or view changes

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md w-full max-w-full">
      <h3 className="text-lg sm:text-xl font-semibold text-purple-700 dark:text-white mb-4">
        المبيعات حسب المنتج ({view === 'week' ? 'أسبوعي' : 'شهري'})
      </h3>
      <div className="w-full h-64 sm:h-80 md:h-96">
        <canvas ref={chartRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default ChartSection;
