'use client'

import React, { useMemo } from 'react'
import './styles.css'
import Wrapper from '@/components/basic/wrapper'
import SafeArea from '@/components/basic/safe-area'
import DoughnutParticipants from '@/components/basic/doughnut-participants/DoughnutParticipants'
import DoughnutGender from '@/components/basic/doughnut-gender/DoughnutGender'
import DoughnutAge from '@/components/basic/doughnut-age/DoughnutAge'
import { topics } from '@/constants'
import { CompareSVG, SearchSVG } from '@/constants/svgs'
import TopicsTable from '@/components/basic/topics-table'
import BaseFilter from '@/components/basic/base-filter'
import SelectedFilterUnit from '@/components/basic/selected-filter-unit'
import BasePopup from '@/components/basic/base-popup/BasePopup'
import { useRouter } from 'next/navigation'


const Topics: React.FC = () => {
    const router = useRouter()
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
    const filters = {
        age: ['15-', '16-29', '30-45', '46+'],
        gender: ['Hombre', 'Mujer', 'Otro'],
        region: ['Lima', 'Cusco', 'Arequipa', 'Callao', 'Piura', 'Cajamarca', 'Amazonas', 'Áncash', 'La Libertad'],
        medio: ['Redes sociales', 'Web', 'Whatsapp', 'Activaciones', 'Festivales', 'Cabildos'],
    };
    const [inputFocused, setInputFocused] = React.useState<boolean>(false);
    const [topicsList, setTopicsList] = React.useState<any[]>(topics);
    const [search, setSearch] = React.useState<string>('');
    const [open, setOpen] = React.useState<boolean>(false);
    const [selection1, setSelection1] = React.useState<string | null>(null);
    const [selection2, setSelection2] = React.useState<string | null>(null);

    const handleSelectForComparison = (col: 1 | 2, val: string) => {
        if (col === 1) setSelection1(val === selection1 ? null : val);
        else setSelection2(val === selection2 ? null : val);
    };

    type SelectedFilters = {
        [key in keyof typeof filters]: string[];
    };

    const [selectedFilters, setSelectedFilters] = React.useState<SelectedFilters>({
        age: [],
        gender: [],
        region: [],
        medio: [],
    });

    const handleOptionClick = (key: keyof typeof filters, option: string) => {
        setSelectedFilters(prev => {
            const isSelected = prev[key].includes(option);
            const updated = isSelected
                ? prev[key].filter(val => val !== option)
                : [...prev[key], option];
            return { ...prev, [key]: updated };
        });
    };

    const filteredTopics = topics.filter(topic => {
        const matchesAge = selectedFilters.age.length === 0 || selectedFilters.age.includes(topic.age[0]);
        const matchesGender = selectedFilters.gender.length === 0 || selectedFilters.gender.includes(topic.gender[0]);
        const matchesRegion = selectedFilters.region.length === 0 || selectedFilters.region.includes(topic.region[0]);
        const matchesMedio = selectedFilters.medio.length === 0 || selectedFilters.medio.includes(topic.medio[0]);
        return matchesAge && matchesGender && matchesRegion && matchesMedio;
    });

    const num_participants = 10203;

    const handleSearch = (e: any) => {
        const value = e.target.value;
        setSearch(value);

        if (value.length >= 3) {
            const filtered = topicsList.filter(c =>
                c.text.toLowerCase().includes(value.toLowerCase()) || c.summary.toLowerCase().includes(value.toLowerCase())
            );
            setTopicsList(filtered);
        }
    };

    React.useEffect(() => {
        if (search.length >= 3) {
            const filtered = topicsList.filter(c =>
                c.text.toLowerCase().includes(search.toLowerCase()) || c.summary.toLowerCase().includes(search.toLowerCase())
            );
            setTopicsList(filtered);
        } else {
            setTopicsList(topics); // Reset when search is too short
        }
    }, [search]);

    const isDisabledForComparison = Object.entries(selectedFilters)
        .flatMap(([key, values]) => values.map((val) => ({ key, val })))
        .length < 2;
    return (
        <>
            {open && <BasePopup close={() => setOpen(false)} children={<div>
                <div className="mb32">Selecciona las etiquetas que quieras comparar.</div>
                <div className="d-flex gap32">
                    {[1, 2].map((col) => (
                        <div key={col} style={{ flex: 1 }}>
                            <div className="fs16 mb16" style={{ color: '#BABABA' }}>
                                Selección {col}
                            </div>
                            <div style={{ maxHeight: '400px', overflowY: 'scroll' }}>
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
                        </div>
                    ))}
                </div>
                <br />
                <div className="d-flex jcc gap16 mt32 mauto w100">
                    <button
                        className="px24 py8 w100"
                        style={{ background: '#000', color: '#fff', borderRadius: 6, height: 40 }}
                        onClick={() => {
                            router.push(`/topics-comparison?selection1=${selection1}&selection2=${selection2}`);
                            setOpen(false);
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
            <Wrapper>
                <div className="topics">
                    <SafeArea>
                        <div className="d-flex flex-col gap">
                            <div className="d-flex aic gap">
                                <div className="topics-p3 w100 flex1">
                                    <div className="fw700 fs16 mb16">Edad</div>
                                    <DoughnutAge ages={ages} num_participants={num_participants} />
                                </div>
                                <div className="topics-p3 w100 flex1">
                                    <div className="fw700 fs16 mb16">Género</div>
                                    <DoughnutGender genders={genders} num_participants={num_participants} />
                                </div>
                                <div className="topics-regions w100">
                                    <div className="fw700 fs16 mb16">Regiones</div>
                                    <div className="d-flex gap">
                                        <div className="topics-regions-p1" style={{ position: 'relative', width: 236, height: 236 }}>
                                            <DoughnutParticipants regions={regions} num_participants={num_participants} />
                                        </div>
                                        <div className="topics-regions-p2">
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
                            </div>
                            <div className="topics-table">
                                <SafeArea mv={24}>
                                    <div>
                                        <div className="d-flex flex-col w100">
                                            <div className="d-flex gap10 aic jcs w100 mb24">
                                                <div className="w100 d-flex aic gap8">
                                                    <SearchSVG />
                                                    <input onFocus={() => setInputFocused(true)}
                                                        onBlur={() => setInputFocused(false)}
                                                        onChange={handleSearch}
                                                        className='directory-search-input-desktop'
                                                        placeholder="¿Qué tema estás buscando?"
                                                    />
                                                </div>
                                                <div className="d-flex gap32 aic">
                                                    <BaseFilter
                                                        filters={filters}
                                                        selectedFilters={selectedFilters}
                                                        handleOptionClick={handleOptionClick}
                                                    />
                                                </div>
                                            </div>
                                            <div className="d-flex gap8 jcsb aic">
                                                <div className="d-flex gap8 selected-filters">
                                                    {Object.entries(selectedFilters)
                                                        .flatMap(([key, values]) => values.map((val) => ({ key, val })))
                                                        .map(({ key, val }) => (
                                                            <SelectedFilterUnit
                                                                key={`${key}-${val}`}
                                                                k={key}
                                                                val={val}
                                                                setSelectedFilters={setSelectedFilters}
                                                                selectedFilters={selectedFilters}
                                                            />
                                                        ))}
                                                </div>
                                                <button
                                                    disabled={isDisabledForComparison}
                                                    className={`${isDisabledForComparison ? 'disabled' : ''} compare-btn`}
                                                    onClick={() => setOpen(true)}>Comparar <CompareSVG /></button>
                                            </div>
                                            <div style={{ height: 60 }} />
                                            <div className="directory-content-companies-list-desktop">
                                                {topicsList.length === 0 && (
                                                    <div className="fw500 fs16">No se encontraron resultados.</div>
                                                )}
                                                <TopicsTable topics={topicsList} />
                                            </div>
                                        </div>
                                    </div>
                                </SafeArea>
                            </div>
                        </div>
                    </SafeArea>
                </div>
            </Wrapper>
        </>
    )
}
export default Topics
