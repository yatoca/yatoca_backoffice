'use client';
import React from 'react';
import './styles.css';
import SafeArea from '../safe-area';
import { COLORS } from '../../../constants/texts';
import { IconFb, IconInsta, IconTikTok, IconWhatsApp } from '../../../constants/svgs';
import { logos_black, logos_white } from '../../../constants';

interface Props {
    color?: string;
}
const Footer: React.FC<Props> = ({ color = COLORS.BLACK }) => {
    const logos = color !== COLORS.BLACK ? logos_black : logos_white;
    return (
        <div className='footer w100' style={{ color: color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK, backgroundColor: color }}>
            <SafeArea>
                <>
                    <div className='footer-body'>
                        <div className='flex6'>
                            <div className='thunder-fw-bold-lc fs96 mb20 pointer' style={{ width: 'fit-content', borderBottom: `8px solid ${color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK}`, paddingBottom: '14px' }}><a href="mailto:conectemos@yatoca.pe">SÚMATE.</a></div>
                            <div className='footer-p fw300'>Si quieres ser parte del Ya Toca Fest, escríbenos a conectemos@yatoca.pe</div>
                            <div className='footer-p fw300'>(no te vamos a dejar en visto).</div>
                        </div>
                        <div className='flex5' />
                        <div className='flex1 footer-networks'>
                            <div className='fw400 fs16' style={{ width: 'max-content' }}>Síguenos en:</div>
                            <div style={{ height: 21 }} />
                            <a
                                className='fs16 fw400 footer-networks-item'
                                href='https://www.instagram.com/yatoca.pe?igsh=MTBuenQ1MHY2ZnA3ag=='
                                target='_blank'
                                rel='noopener noreferrer'><IconInsta color={color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK} />Instagram</a>
                            <a
                                className='fs16 fw400 footer-networks-item'
                                href='https://www.facebook.com/share/1CWrVyGAfg/?mibextid=LQQJ4d'
                                target='_blank'
                                rel='noopener noreferrer'><IconFb color={color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK} />Facebook</a>
                            <a
                                className='fs16 fw400 footer-networks-item'
                                href='https://www.tiktok.com/@yatoca.pe?_t=ZM-8xEYtCXpEbW&_r=1'
                                target='_blank'
                                rel='noopener noreferrer'><IconTikTok color={color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK} /> Tik Tok</a>
                            <a
                                className='fs16 fw400 footer-networks-item'
                                href='https://wa.me/51922824173'
                                target='_blank'
                                rel='noopener noreferrer'><IconWhatsApp color={color === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK} /> Whatsapp</a>
                        </div>
                    </div>
                    <div className="logos-grid">
                        {logos.map((logo, index) => (
                            <img key={index} src={logo} alt={`Logo ${index}`} className={logo.includes('Resurgir')
                                ? 'logo-img-resurgir'
                                : logo.includes('RPP')
                                    ? 'logo-img-rpp'
                                    : logo.includes('Openmind')
                                    ? 'logo-img-openmind'
                                    : 'logo-img'} />
                        ))}
                    </div>
                </>
            </SafeArea>
        </div>
    )
}
export default Footer;