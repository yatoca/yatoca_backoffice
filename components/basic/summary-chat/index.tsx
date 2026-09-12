import React from 'react'
import './styles.css'
import BaseFilter from '../base-filter';
import { CompareSVG } from '@/constants/svgs';
import BasePopup from '../base-popup/BasePopup';


type Props = {
    handle_compare: (selection1: string | null, selection2: string | null) => void;
    selection1: string | null;
    selection2: string | null;
    handle_reset: () => void;
}

const SummaryChat: React.FC<Props> = ({ handle_compare, selection1, selection2, handle_reset }) => {
    const filters = {
        age: ['15-', '16-29', '30-45', '46+'],
        gender: ['Hombre', 'Mujer', 'Otro'],
        region: ['Lima', 'Cusco', 'Arequipa', 'Callao', 'Piura', 'Cajamarca', 'Amazonas', 'Áncash', 'La Libertad'],
        medio: ['Redes sociales', 'Web', 'Whatsapp', 'Activaciones', 'Festivales', 'Cabildos'],
    };
    const [open, setOpen] = React.useState<boolean>(false);

    type SelectedFilters = {
        [key in keyof typeof filters]: string[];
    };
    const [selectedFilters, setSelectedFilters] = React.useState<SelectedFilters>({
        age: [],
        gender: [],
        region: [],
        medio: [],
    });
    const handleSelectForComparison = (col: 1 | 2, val: string) => {
        if (col === 1) handle_compare(val === selection1 ? null : val, selection2);
        else handle_compare(selection1, val === selection2 ? null : val);
    };
    const handleOptionClick = (key: keyof typeof filters, option: string) => {
        setSelectedFilters(prev => {
            const isSelected = prev[key].includes(option);
            const updated = isSelected
                ? prev[key].filter(val => val !== option)
                : [...prev[key], option];
            return { ...prev, [key]: updated };
        });
    };
    const isDisabledForComparison = Object.entries(selectedFilters)
        .flatMap(([key, values]) => values.map((val) => ({ key, val })))
        .length < 2;

    return (
        <>
            {open && <BasePopup close={() => setOpen(false)} children={<div>
                <div className="mb32">Crear comparación</div>
                <div className="d-flex gap32">
                    {[1, 2].map((col) => (
                        <div key={col} style={{ flex: 1 }}>
                            <div className="fs16 mb16" style={{ color: '#BABABA' }}>
                                Selección {col}
                            </div>
                            {Object.entries(selectedFilters)
                                .flatMap(([key, values]) => values.map((val) => ({ key, val }))).map((opt) => {
                                    const selected = (col === 1 ? selection1 : selection2) === opt.val;
                                    const disabled = (col === 1 ? selection2 : selection1) === opt.val;

                                    return (
                                        <label
                                            key={opt.val}
                                            className="d-flex aic gap8 mb16"
                                            style={{
                                                opacity: disabled ? 0.4 : 1,
                                                cursor: disabled ? 'not-allowed' : 'pointer',
                                            }}
                                        >
                                            <input
                                                type="radio"
                                                name={`selection-${col}`}
                                                checked={selected}
                                                disabled={disabled}
                                                onChange={() => handleSelectForComparison(col as 1 | 2, opt.val)}
                                            />
                                            <div
                                                style={{
                                                    backgroundColor: '#f0f0f0',
                                                    width: 'max-content',
                                                    borderRadius: 6,
                                                    padding: '4px 8px',
                                                    fontSize: 14,
                                                    color: '#000',
                                                    minWidth: 75
                                                }}
                                            >
                                                {opt.val}
                                            </div>
                                        </label>
                                    );
                                })}
                        </div>
                    ))}
                </div>
                <br />
                <div className="d-flex jcc gap16 mt32 mauto w100">
                    <button
                        className="px24 py8 w100"
                        style={{ background: '#000', color: '#fff', borderRadius: 6, height: 40 }}
                        onClick={() => {
                            setOpen(false);
                            handle_compare(selection1, selection2);
                        }}
                    >
                        Aplicar
                    </button>
                    <button
                        className="px24 py8 w100"
                        style={{
                            background: 'transparent',
                            border: '1px solid #000',
                            borderRadius: 6,
                            color: '#000',
                            height: 40
                        }}
                        onClick={() => setOpen(false)}
                    >
                        Cancelar
                    </button>
                </div>
            </div>} />}
            <div className="summary-chat">
                <input type="text" placeholder="Pregunta lo que quieras" />
                <div className="d-flex gap32 aic jcsb">
                    <div className="d-flex gap32 aic w100">
                        <BaseFilter
                            filters={filters}
                            selectedFilters={selectedFilters}
                            handleOptionClick={handleOptionClick}
                        />
                    </div>
                    {selection1 && selection2 && (
                        <button
                            disabled={isDisabledForComparison}
                            className={`${isDisabledForComparison ? 'disabled' : ''} compare-btn-summary`}
                            onClick={() => {
                                handle_reset();
                                setSelectedFilters({
                                    age: [],
                                    gender: [],
                                    region: [],
                                    medio: [],
                                });
                            }}>Deshacer <CompareSVG color="#000" /></button>
                    )}
                    {(!selection1 || !selection2) && (
                        <button
                            disabled={isDisabledForComparison}
                            className={`${isDisabledForComparison ? 'disabled' : ''} compare-btn-summary`}
                            onClick={() => setOpen(true)}>Comparar <CompareSVG color="#000" /></button>
                    )}
                </div>
            </div>
        </>
    )
}

export default SummaryChat
