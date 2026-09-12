import React from 'react'
import './styles.css'
import Wrapper from '@/components/basic/wrapper'
import SafeArea from '@/components/basic/safe-area'
import { separate_number_commas } from '@/constants/functions'
import DoughnutParticipants from '@/components/basic/doughnut-participants/DoughnutParticipants'
import BarMedios from '@/components/basic/bar-medios/BarMedios'
import DoughnutGender from '@/components/basic/doughnut-gender/DoughnutGender'
import DoughnutAge from '@/components/basic/doughnut-age/DoughnutAge'


const Dashboard: React.FC = () => {
    const topics = [
        { percentage: 30.6, topic: 'Abuso de personas' },
        { percentage: 22, topic: 'Abuso de poder' },
        { percentage: 14, topic: 'Acción colectiva' },
        { percentage: 7, topic: 'Actos ilícitos' },
        { percentage: 4, topic: 'Alianzas y acciones colaborativas' },
        { percentage: 4, topic: 'Avances Sociales' },
        { percentage: 4, topic: 'Comunidad /comunidades' },
        { percentage: 2, topic: 'Corte Interamericana de Derechos Humanos' },
        { percentage: 1, topic: 'Iniciativa para la transparencia de las industrias extractivas' },
        { percentage: 1, topic: 'Movilizaciones sociales' },
        { percentage: 1, topic: 'Organizaciones de la sociedad civil' },
        { percentage: 1, topic: 'Partidos políticos' },
        { percentage: 1, topic: 'Perú profundo' },
        { percentage: 0.5, topic: 'Política económica' },
        { percentage: 0.1, topic: 'Política económica' },
        { percentage: 0.1, topic: 'Otro tema' },
        { percentage: 0.1, topic: 'Otro tema' },
        { percentage: 0.1, topic: 'Otro tema' },
    ]
    const regions = [
        { name: 'Arequipa', color: '#E53016', num_participants: 164 },
        { name: 'Callao', color: '#EABF00', num_participants: 142 },
        { name: 'Cajamarca', color: '#0059A6', num_participants: 81 },
        { name: 'Amazonas', color: '#D9B3D6', num_participants: 55 },
        { name: 'Áncash', color: '#2E585B', num_participants: 50 },
        { name: 'La Libertad', color: '#5EC2D0', num_participants: 45 },
        { name: 'Piura', color: '#D4C2FC', num_participants: 40 },
        { name: 'Cusco', color: '#14248A', num_participants: 35 },
    ]
    const medios = [
        { name: 'Cabildos', num: 220, color: '#E53016' },
        { name: 'Festivales', num: 180, color: '#EABF00' },
        { name: 'Activaciones', num: 160, color: '#0059A6' },
        { name: 'Whatsapp', num: 150, color: '#D9B3D6' },
        { name: 'Web', num: 140, color: '#2E585B' },
        { name: 'Redes sociales', num: 130, color: '#5EC2D0' },
    ]
    const genders = [
        { type: 'Hombre', number: 4000, color: '#E53016' },
        { type: 'Mujer', number: 3000, color: '#EABF00' },
        { type: 'Otro', number: 1000, color: '#0059A6' },
    ]
    const ages = [
        { type: '15-', number: 1000, color: '#43A047' },
        { type: '16-29', number: 2564, color: '#E53016' },
        { type: '30-45', number: 3200, color: '#EABF00' },
        { type: '46+', number: 4239, color: '#0059A6' },
    ]
    const num_participants = 10203;
    const num_mentions = 7560;
    const num_topics = 198;
    return (
        <>
            <Wrapper>
                <div className="dashboard">
                    <SafeArea>
                        <div className="d-flex flex-col gap">
                            <div className="d-flex aic gap">
                                <div className="dashboard-top-topic w100">
                                    <div className="fw700 fs16">Tema más comentado</div>
                                    <div>
                                        <div className="most-commented-topic-percentage">58.9%</div>
                                        <div className="fs16 fw700 w100 tac">Acceso a la educación superior y becas</div>
                                    </div>
                                    <div className="d-flex jcsb">
                                        <div className="fw300 fs16">Número de participantes: {separate_number_commas(num_participants)}</div>
                                        <div className="fw300 fs16">Número de menciones: {separate_number_commas(num_mentions)}</div>
                                    </div>
                                </div>
                                <div className="dashboard-topics w100">
                                    <div className="fw700 fs16 mb32">Temas</div>
                                    <div className="dashboard-topics-list">
                                        {topics.map((topic, index) => (
                                            <div key={index} className="d-flex ais gap8">
                                                <div className="fw500 fs16 tar" style={{ width: 49 }}>{topic.percentage}%</div>
                                                <div className="fw400 fs16 tal">{topic.topic}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex aic gap">
                                <div className="dashboard-regions w100">
                                    <div className="fw700 fs16 mb32">Regiones</div>
                                    <div className="d-flex gap">
                                        <div className="dashboard-regions-p1" style={{ position: 'relative', width: 236, height: 236 }}>
                                            <DoughnutParticipants regions={regions} num_participants={num_participants} />
                                        </div>
                                        <div className="dashboard-regions-p2">
                                            {regions.map((region, index) => (
                                                <div key={index} className="d-flex aic gap8">
                                                    <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: region.color }} />
                                                    <div className="fw300 fs16 tar">{region.name}</div>
                                                    <div className="fw500 fs16 tal ml8">{region.num_participants}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="dashboard-medios w100">
                                    <div className="fw700 fs16 mb32">Medios</div>
                                    <BarMedios medios={medios} />
                                </div>
                            </div>
                            <div className="d-flex aic gap">
                                <div className="d-flex gap w100">
                                    <div className="dashboard-p3 w100 flex1">
                                        <div className="fw700 fs16 mb32">Género</div>
                                        <DoughnutGender genders={genders} num_participants={num_participants} />
                                    </div>
                                    <div className="dashboard-p3 w100 flex1">
                                        <div className="fw700 fs16 mb32">Edad</div>
                                        <DoughnutAge ages={ages} num_participants={num_participants} />
                                    </div>
                                </div>
                                <div className="d-flex gap w100">
                                    <div className="dashboard-p3 w100 flex1">
                                        <div className="fw700 fs16 mb32">Total de participantes</div>
                                        <div className="fw700 fs48 d-flex jcc aic h100">{separate_number_commas(num_participants)}</div>
                                    </div>
                                    <div className="dashboard-p3 w100 flex1">
                                        <div className="fw700 fs16 mb32">Total de temas</div>
                                        <div className="fw700 fs48 d-flex jcc aic h100">{separate_number_commas(num_topics)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </SafeArea>
                </div>
            </Wrapper>
        </>
    )
}
export default Dashboard
