'use client';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Title,
} from 'chart.js';
import { get_substring } from '@/constants/functions';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Title);

type Props = {
    topics: {
        name: string;
        selection1: { value: number; color: string };
        selection2: { value: number; color: string };
    }[];
};

const options = {
    indexAxis: 'y' as const,
    scales: {
        x: {
            beginAtZero: true,
            grid: {
                color: '#F5F5F5',
            },
            ticks: {
                color: '#000',
                font: {
                    size: 16,
                    weight: 300,
                    family: 'BricolageGrotesque-Light',
                },
            },
        },
        y: {
            ticks: {
                color: '#000',
                font: {
                    size: 16,
                    weight: 300,
                    family: 'BricolageGrotesque-Light',
                },
            },
            grid: {
                display: false,
            },
        },
    },
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            enabled: true,
        },
    },
    elements: {
        bar: {
            borderSkipped: false,
        },
    },
};

const BarTopics: React.FC<Props> = ({ topics }) => {
    const data = {
        labels: topics.map(t => get_substring(t.name, 20)),
        datasets: [
            {
                label: 'Selección 1',
                data: topics.map(t => t.selection1.value),
                backgroundColor: topics.map(t => t.selection1.color),
                barThickness: 16,
            },
            {
                label: 'Selección 2',
                data: topics.map(t => t.selection2.value),
                backgroundColor: topics.map(t => t.selection2.color),
                barThickness: 16,
            },
        ],
    };

    return <Bar data={data} options={options} />;
};

export default BarTopics;
