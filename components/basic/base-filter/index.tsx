'use client'

import React, { useRef, useState } from 'react'
import './styles.css'

type Props = {
    filters: any;
    selectedFilters: any;
    handleOptionClick: (key: any, option: string) => void;
};

const BaseFilter = ({ filters, selectedFilters, handleOptionClick }: Props) => {
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [dropdownDirection, setDropdownDirection] = useState<'down' | 'up'>('down');
    const refs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const toggleDropdown = (key: string) => {
        if (openDropdown === key) {
            setOpenDropdown(null);
            return;
        }

        const triggerEl = refs.current[key];
        if (triggerEl) {
            const rect = triggerEl.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;

            if (spaceBelow < 200 && spaceAbove > 200) {
                setDropdownDirection('up');
            } else {
                setDropdownDirection('down');
            }
        }

        setOpenDropdown(key);
    };

    return (
        <>
            {Object.entries(filters).map(([key, options]: any) => {
                const isOpen = openDropdown === key;

                return (
                    <div key={key} className="fs14 d-flex flex-col pointer" style={{ position: 'relative' }}>
                        <div
                            ref={(el) => (refs.current[key] = el) as any}
                            className="d-flex aic gap8 pointer"
                            onClick={() => toggleDropdown(key)}
                        >
                            <label className="fw300 fs16 pointer">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                            <svg width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 0.999999L7 7L13 1" stroke="black" />
                            </svg>
                        </div>

                        {isOpen && (
                            <div
                                className="dropdown-options"
                                style={{
                                    position: 'absolute',
                                    top: dropdownDirection === 'down' ? '100%' : 'auto',
                                    bottom: dropdownDirection === 'up' ? '100%' : 'auto',
                                    left: 0,
                                    backgroundColor: 'white',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                    borderRadius: 4,
                                    marginTop: dropdownDirection === 'down' ? 4 : 0,
                                    marginBottom: dropdownDirection === 'up' ? 4 : 0,
                                    padding: 8,
                                    gap: 8,
                                    zIndex: 10,
                                    width: 124,
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}
                            >
                                {options.map((option: any) => {
                                    const isSelected = selectedFilters[key].includes(option);
                                    return (
                                        <div
                                            key={option}
                                            onClick={() => handleOptionClick(key, option)}
                                            className="fs14 pointer filter-option"
                                            style={{
                                                padding: '4px 8px',
                                                backgroundColor: isSelected ? '#eee' : 'transparent',
                                                fontWeight: isSelected ? 600 : 400,
                                                cursor: 'pointer',
                                                borderRadius: 4,
                                            }}
                                        >
                                            {option}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </>
    );
};

export default BaseFilter;
