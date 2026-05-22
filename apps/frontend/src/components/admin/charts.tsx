'use client';

import { useEffect, useState } from 'react';
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
if (typeof window !== 'undefined') {
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
}

interface ChartProps {
    data: number[];
    labels: string[];
    title: string;
    type?: 'bar' | 'line' | 'doughnut';
    color?: string;
}

export function Chart({ data, labels, title, type = 'bar', color = '#3b82f6' }: ChartProps) {
    const { theme } = useTheme();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Validate data
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                <div className="h-80 flex items-center justify-center text-on-surface-variant">
                    Không có dữ liệu để hiển thị
                </div>
            </div>
        );
    }

    if (!labels || !Array.isArray(labels) || labels.length === 0) {
        return (
            <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                <div className="h-80 flex items-center justify-center text-on-surface-variant">
                    Không có nhãn để hiển thị
                </div>
            </div>
        );
    }

    // Ensure data and labels have same length
    const minLength = Math.min(data.length, labels.length);
    const chartDataValues = data.slice(0, minLength);
    const chartLabels = labels.slice(0, minLength);

    if (!isMounted) {
        return (
            <div className="bg-surface-container rounded-lg p-6 shadow-sm">
                <div className="h-80 flex items-center justify-center text-on-surface-variant">
                    Đang tải...
                </div>
            </div>
        );
    }

    const isDark = theme === 'dark';

    const textColor = isDark ? '#e5e7eb' : '#111827';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    const bgColor = isDark ? '#1f2937' : '#ffffff';

    const chartData = {
        labels: chartLabels,
        datasets: [
            {
                label: title,
                data: chartDataValues,
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
                        if (!context.parsed) return '';
                        const value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
                        return typeof value === 'number' ? value.toLocaleString() : String(value);
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
                                if (typeof value === 'number') {
                                    return value.toLocaleString();
                                }
                                return value;
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
        <div className="bg-surface-container rounded-lg p-6 shadow-sm">
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
