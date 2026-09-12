'use client';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Title
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Title);

type Props = {
    regions: {
        name: string;
        num: number;
        color: string;
    }[];
}

const options = {
    indexAxis: 'y' as const, // Makes it horizontal
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
                    family: 'BricolageGrotesque-Light'
                },
            }
        },
        y: {
            ticks: {
                color: '#000',
                font: {
                    size: 16,
                    weight: 300,
                    family: 'BricolageGrotesque-Light'
                },

            },
            grid: {
                display: false
            }
        }
    },
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            enabled: true
        }
    },
    elements: {
        bar: {
            borderSkipped: false
        }
    },
};

const BarRegions: React.FC<Props> = ({ regions }) => {
    const data = {
        labels: regions.map(r => r.name),
        datasets: [
            {
                label: 'Regions',
                data: regions.map(r => r.num),
                backgroundColor: regions.map(r => r.color),
                borderRadius: 0,
                barThickness: 28,
            }
        ]
    };
    return (
        <Bar data={data} options={options} />
    );
}

export default BarRegions;
