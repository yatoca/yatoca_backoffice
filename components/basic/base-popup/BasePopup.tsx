import React from 'react';
import './BasePopup.css';
import SafeArea from '@/components/basic/safe-area';
import { CloseTwoSVG } from '@/constants/svgs';

type Props = {
    close: () => void;
    children: React.ReactNode;
}
const BasePopup: React.FC<Props> = ({ close, children }) => {
    return (
        <div className="base-popup-wrapper">
            <SafeArea mv={24}>
                <>
                    <div className='w100 d-flex jce' onClick={close}><div className='pointer'><CloseTwoSVG /></div></div>
                    <div className="w100">
                        {children}
                    </div>
                </>
            </SafeArea>
        </div>
    );
};

export default BasePopup;