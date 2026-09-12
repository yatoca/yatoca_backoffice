'use client';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
    ages: {
        type: string;
        color: string;
        number: number;
    }[];
    num_participants: number;
}

const DoughnutAge: React.FC<Props> = ({ ages, num_participants }) => {

    const data = {
        labels: ages.map(r => r.type),
        datasets: [
            {
                data: ages.map(r => r.number),
                backgroundColor: ages.map(r => r.color),
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
        <div style={{ position: 'relative', maxWidth: 236 }}>
            <Doughnut data={data} options={options} />
            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    width: '60%',
                }}
                className="d-flex flex-col aic gap10"
            >
                {ages.map((age, i) => (
                    <div key={i} className="d-flex aic jcsb w100">
                        <div className="d-flex aic jcs gap8">
                            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: age.color }} />
                            <div className="fw300 fs16">{age.type}</div>
                        </div>
                        <div className="fw500 fs16">{(age.number / num_participants * 100).toFixed(1)}%</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default DoughnutAge;
