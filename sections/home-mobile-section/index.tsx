'use client';
import React from 'react';
import './styles.css'
import SafeArea from '../../components/basic/safe-area';

const HomeSectionMobile: React.FC = () => {
    return (
        <div className='home-section-wrapper-mobile'>
            <div className='home-section-container-mobile'>
                <SafeArea>
                    <div className='home-section-mobile'>
                        <div className='home-section-phrase-mobile'>
                            <div className='fw400 home-section-phrase-title-mobile'>
                                ¿Qué %$#!@
                            </div>
                            <div className='fw400 home-section-phrase-title-mobile'>
                                hacemos con el Perú?
                            </div>
                            <div className='fs16 mt10'>
                                Para responder, <a href="/talk#questions" className='fw700 home-section-phrase-link-mobile'>haz click aquí</a>
                            </div>
                        </div>
                    </div>
                </SafeArea>
            </div>
        </div>

    )
}
export default HomeSectionMobile;