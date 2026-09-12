import React from 'react'
import './styles.css'

type Props = {
    children: React.ReactNode;
    onClose: () => void;
}
const DetailSideBar: React.FC<Props> = ({ children, onClose }) => {
    return (
        <div className="detail-sidebar">
            <div className="detail-sidebar__close-icon" onClick={onClose}>✕</div>
            {children}
        </div>
    )
}
export default DetailSideBar