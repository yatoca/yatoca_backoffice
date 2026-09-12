'use client';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';
import { separate_number_commas } from '@/constants/functions';

ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
    regions: {
        name: string;
        color: string;
        num_participants: number;
    }[];
    num_participants: number;
}

const DoughnutParticipants: React.FC<Props> = ({ regions, num_participants }) => {
    const totalParticipants = regions.reduce((sum, r) => sum + r.num_participants, 0);

    const data = {
        labels: regions.map(r => r.name),
        datasets: [
            {
                data: regions.map(r => r.num_participants),
                backgroundColor: regions.map(r => r.color),
                borderWidth: 0,
            }
        ]
    };

    const options = {
        cutout: '75%', // makes it a doughnut with space in the center
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (tooltipItem: any) => {
                        const value = tooltipItem.raw;
                        return `${tooltipItem.label}: ${value}`;
                    }
                }
            }
        }
    };

    return (
        <>
            <Doughnut data={data} options={options} />
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center'
                }}
                className="d-flex flex-col aic"
            >
                <div className="fw700 fs16">{separate_number_commas(num_participants)}</div>
                <div className="fw300 fs16">Participantes</div>
            </div>
        </>
    );
}

export default DoughnutParticipants;
