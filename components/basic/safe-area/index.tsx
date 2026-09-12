'use client';
import React, { JSX } from 'react';
import './styles.css';

interface Props {
    children: JSX.Element;
    mv?: number;
}
const SafeArea: React.FC<Props> = ({ children, mv = 60 }) => {
    return (
        <div className="safe-area w100">
            <div style={{ marginTop: mv }} />
            {children}
        </div>
    )
}
export default SafeArea;