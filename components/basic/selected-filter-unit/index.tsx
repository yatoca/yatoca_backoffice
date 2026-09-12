'use client'
import React from 'react';
import './styles.css';

type Props = {
    k: string;
    val: string;
    setSelectedFilters: React.Dispatch<React.SetStateAction<any>>;
    selectedFilters: any;
}

const SelectedFilterUnit: React.FC<Props> = ({ k, val, setSelectedFilters, selectedFilters }) => {
    return (
        <div
            key={`${k}-${val}`}
            className="d-flex aic gap8"
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
            <span className="fw400 fs14">
                {val}
            </span>
            <span
                onClick={() => {
                    setSelectedFilters((prev: any) => ({
                        ...prev,
                        [k]: prev[k as keyof typeof selectedFilters].filter((v: any) => v !== val),
                    }));
                }}
                className="pointer"
                style={{ cursor: 'pointer', fontWeight: 'bold' }}
            >
                ×
            </span>
        </div>
    );
};

export default SelectedFilterUnit;