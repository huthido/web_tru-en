'use client';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { useTheme } from '@/components/providers/theme-provider';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface ChartProps {
    data: number[];
    labels: string[];
    title: string;
    type?: 'bar' | 'line' | 'doughnut';
    color?: string;
}

export function Chart({ data, labels, title, type = 'bar', color = '#3b82f6' }: ChartProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const textColor = isDark ? '#e5e7eb' : '#111827';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const bgColor = isDark ? '#1f2937' : '#ffffff';

    const chartData = {
        labels,
        datasets: [
            {
                label: title,
                data,
                backgroundColor:
                    type === 'doughnut'
                        ? [
                            'rgba(59, 130, 246, 0.8)',
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(139, 92, 246, 0.8)',
                            'rgba(236, 72, 153, 0.8)',
                        ]
                        : `${color}40`,
                borderColor: color,
                borderWidth: 2,
                fill: type === 'line',
                tension: type === 'line' ? 0.4 : 0,
                pointBackgroundColor: color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: title,
                color: textColor,
                font: {
                    size: 18,
                    weight: 'bold' as const,
                },
                padding: {
                    top: 10,
                    bottom: 20,
                },
            },
            tooltip: {
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                titleColor: textColor,
                bodyColor: textColor,
                borderColor: gridColor,
                borderWidth: 1,
                padding: 12,
                displayColors: true,
                callbacks: {
                    label: function (context: any) {
                        return `${context.parsed.y?.toLocaleString() || context.parsed.toLocaleString()}`;
                    },
                },
            },
        },
        scales:
            type !== 'doughnut'
                ? {
                    x: {
                        grid: {
                            color: gridColor,
                            drawBorder: false,
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                size: 12,
                            },
                        },
                    },
                    y: {
                        grid: {
                            color: gridColor,
                            drawBorder: false,
                        },
                        ticks: {
                            color: textColor,
                            font: {
                                size: 12,
                            },
                            callback: function (value: any) {
                                return value.toLocaleString();
                            },
                        },
                        beginAtZero: true,
                    },
                }
                : undefined,
        animation: {
            duration: 1500,
            easing: 'easeInOutQuart' as const,
        },
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="h-80">
                {type === 'bar' && <Bar data={chartData} options={options} />}
                {type === 'line' && <Line data={chartData} options={options} />}
                {type === 'doughnut' && <Doughnut data={chartData} options={options} />}
            </div>
        </div>
    );
}

// Convenience components
export function BarChart({ data, labels, title, color }: ChartProps) {
    return <Chart data={data} labels={labels} title={title} type="bar" color={color} />;
}

export function LineChart({ data, labels, title, color }: ChartProps) {
    return <Chart data={data} labels={labels} title={title} type="line" color={color} />;
}

export function DoughnutChart({ data, labels, title }: ChartProps) {
    return <Chart data={data} labels={labels} title={title} type="doughnut" />;
}
