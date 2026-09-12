import React from 'react';
import './styles.css';
import { sentence_case } from '@/constants/functions';

type Option = { id: number; label: string };

type TopicsFilterProps = {
    options: Option[];
    selected: number[];
    onChange: (next: number[]) => void;
    apply: () => void;
};

const TopicsFilter: React.FC<TopicsFilterProps> = ({ options, selected, onChange, apply }) => {
    const [open, setOpen] = React.useState(false);
    const [q, setQ] = React.useState('');

    const refWrap = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!refWrap.current) return;
            if (!refWrap.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const filtered = React.useMemo(() => {
        const qq = q.trim().toLowerCase();
        if (!qq) return options;
        return options.filter(o => o.label.toLowerCase().includes(qq));
    }, [options, q]);

    const toggle = (id: number) => {
        if (selected.includes(id)) onChange(selected.filter(x => x !== id));
        else onChange([...selected, id]);
    };

    const addAll = () => {
        const ids = new Set(selected);
        filtered.forEach(f => ids.add(f.id));
        onChange(Array.from(ids));
    };

    const removeAll = () => {
        const del = new Set(filtered.map(f => f.id));
        onChange(selected.filter(id => !del.has(id)));
    };

    const count = selected.length;

    return (
        <div className="kwf-wrap" ref={refWrap}>
            <button className="kwf-btn" onClick={() => setOpen(v => !v)} type="button">
                Temas {count ? `(${count})` : ''}
                <span className={`kwf-caret ${open ? 'up' : ''}`} />
            </button>

            {open && (
                <div className="kwf-pop">
                    <div className="kwf-top">
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Buscar tema…"
                            className="kwf-search"
                        />
                        <div className="d-flex aic jcsb w100">
                            <div className="kwf-actions">
                                {/* <button className="kwf-link" onClick={addAll} type="button">Añadir todos</button>
                                <span className="kwf-dot">•</span> */}
                                <button className="kwf-link" onClick={removeAll} type="button">Quitar todos</button>
                            </div>
                            <button className="kwf-link fs13 mt8" onClick={apply} type="button">Aplicar</button>
                        </div>
                    </div>

                    <div className="kwf-list">
                        {filtered.length === 0 && (
                            <div className="kwf-empty">Sin resultados</div>
                        )}
                        {filtered.map(opt => {
                            const checked = selected.includes(opt.id);
                            return (
                                <label key={opt.id} className="kwf-item">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggle(opt.id)}
                                    />
                                    <span className="kwf-label">{sentence_case(opt.label)}</span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TopicsFilter;
