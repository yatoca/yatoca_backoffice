'use client';
import React from 'react';
import '../../app/home/Home.css';

const HomeSection: React.FC = () => {
    return (
        <div className='home-section-wrapper'>
            <div className='home-section'>
                <div className="home-section-video" />
                <div className="flex1 w100" style={{ backgroundColor: 'transparent', height: 1 }} />
                <div className='home-section-phrase'>
                    <div className='fw400 home-section-phrase-title'>
                        ¿Qué %$#!@
                    </div>
                    <div className='fw400 home-section-phrase-title'>
                        hacemos con el Perú?
                    </div>
                    <div className='fs16 mt10'>
                        Para responder, <a href="/talk#questions" className="fw700 home-section-phrase-link">haz click aquí</a>
                    </div>
                </div>
            </div>
        </div>

    )
}
export default HomeSection;