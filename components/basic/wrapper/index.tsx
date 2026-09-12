'use client';
import React, { JSX } from 'react';
import './styles.css';
import { COLORS } from '../../../constants/texts';
import SidebarMenu from '../sidebar-menu';

interface Props {
    children: JSX.Element;
    color?: string;
}
const Wrapper: React.FC<Props> = ({ children, color = COLORS.GRAY2 }) => {
    return (
        <div className='wrapper' style={{ backgroundColor: color }}>
            <div style={{ flex: 1.3, width: '100%', height: '100vh', backgroundColor: 'black' }}><SidebarMenu /></div>
            <div style={{ flex: 10.7 }} className='wrapper-children'>{children}</div>
        </div>
    )
}
export default Wrapper;