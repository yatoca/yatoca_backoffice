import React from 'react';
import './styles.css';
import { get_substring } from '@/constants/functions';
import Wrapper from '../wrapper';
import SafeArea from '../safe-area';

type Props = {
    items: any[];
    onSelect?: (s: any) => void;
};

const UnprocessedStatementsTable: React.FC<Props> = ({ items, onSelect }) => {
    return (
        <Wrapper>
            <SafeArea mv={24}>
                <div className="w100">
                    <div className="table-wrapper">
                        <div className="table-header row">
                            <div className="col text">Declaraciones</div>
                            <div className="col keywords">Palabras clave</div>
                            <div className="col topics">Sugerencias de tema</div>
                            <div className="col action" />
                        </div>

                        {items.map((s: any) => (
                            <div key={s.id} className="row pointer" onClick={() => onSelect?.(s)}>
                                {/* Raw/Clean text */}
                                <div className="col text">
                                    {get_substring(s.text_clean || s.text_raw, 80)}
                                    <div className="muted fs12">{new Date(s.created_at).toLocaleDateString()}</div>
                                </div>

                                {/* Keywords */}
                                <div className="col keywords">
                                    {s.keywords.map((k: any) => (
                                        <span key={k.keyword_norm} className="badge">
                                            {k.keyword_raw}
                                        </span>
                                    ))}
                                </div>

                                {/* Topic suggestions */}
                                <div className="col topics">
                                    {s.topic_suggestions.slice(0, 3).map((t: any) => (
                                        <div key={t.topic_id} className="topic-suggestion">
                                            {t.topic_name} <span className="score">({(t.score * 100).toFixed(1)}%)</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="col action">
                                    <span className="action-text">ver más</span>
                                </div>
                            </div>
                        ))}

                        {items.length === 0 && (
                            <div className="row empty">
                                <div className="col">No hay registros pendientes.</div>
                            </div>
                        )}
                    </div>
                </div>
            </SafeArea>
        </Wrapper>
    );
};

export default UnprocessedStatementsTable;
