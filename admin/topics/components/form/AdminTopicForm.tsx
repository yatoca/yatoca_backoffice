import React from 'react'
import './styles.css'
import { AdminTopic } from '@/constants/types';
import { sentence_case } from '@/constants/functions';
import { DeleteIconSVG } from '@/constants/svgs';

type Props = {
    topic?: AdminTopic;
}
const AdminTopicForm: React.FC<Props> = ({ topic }) => {
    const [topicData, setTopicData] = React.useState<AdminTopic>({
        id: topic?.id || "",
        name: topic?.name || "",
        description: topic?.description || "",
        keywords: topic?.keywords || [],
    })
    return (
        <div className="admin-topic-form">
            <div className="admin-topic-form__body">
                <div className="admin-topic-form__body__form">
                    <div className="admin-topic-form__body__form__field">
                        <label htmlFor="name">Nombre</label>
                        <input type="text" maxLength={500} id="name" value={topicData.name} onChange={(e) => setTopicData({ ...topicData, name: e.target.value })} />
                    </div>
                    <div className="admin-topic-form__body__form__field">
                        <label htmlFor="description">Descripción</label>
                        <textarea maxLength={1000} id="description" value={topicData.description} onChange={(e) => setTopicData({ ...topicData, description: e.target.value })}></textarea>
                    </div>
                    <div className="admin-topic-form__body__form__field">
                        <div className="fs14 fw500 tac">Keywords</div>
                        <div className="admin-topic-form__body__form__field__keywords">
                            {topicData.keywords.map((kw, index) => (
                                <div key={index} className="admin-topic-form__body__form__field__keywords__keyword">
                                    <div className="fs13" style={{ flex: 4 }}>{sentence_case(kw.keyword)}</div>
                                    <input type="number" min={0.1} max={1.0} step={0.1} value={kw.weight} onChange={(e) => setTopicData({ ...topicData, keywords: topicData.keywords.map((kw2, index2) => index2 === index ? { ...kw2, weight: Number(e.target.value) } : kw2) })} />
                                    <button className="pointer" onClick={() => setTopicData({ ...topicData, keywords: topicData.keywords.filter((_, index2) => index2 !== index) })}><DeleteIconSVG /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <div className="admin-topic-form__footer">
                <button className="admin-topic-form__footer__button" onClick={() => { }}>Guardar</button>
            </div>
        </div>
    )
}
export default AdminTopicForm