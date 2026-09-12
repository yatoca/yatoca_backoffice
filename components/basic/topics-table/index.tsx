import React from 'react'
import './styles.css'
import { get_substring } from '@/constants/functions';

type Props = {
    topics: any[];
}

const TopicsTable: React.FC<Props> = ({ topics }) => {
    return (
        <div className="w100">
            <div className="table-wrapper">
                <div className="table-header row">
                    <div className="col topic">Tema</div>
                    <div className="col percentage">Porcentaje</div>
                    <div className="col mentions">Nº de menciones</div>
                    <div className="col summary">Resumen</div>
                    <div className="col action"></div>
                </div>

                {topics.map((topic) => (
                    <div key={topic.id} className="row pointer">
                        <div className="col topic">{get_substring(topic.text, 30)}</div>
                        <div className="col percentage fw700">{topic.percentage}%</div>
                        <div className="col mentions fw700">{topic.num_mentions}</div>
                        <div className="col summary ellipsis">{get_substring(topic.summary, 50)}</div>
                        <div className="col action">
                            <span className="action-text">ver más</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
export default TopicsTable;  