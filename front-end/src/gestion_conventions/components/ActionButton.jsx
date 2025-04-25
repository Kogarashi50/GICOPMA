import React from 'react';
import { Button } from 'react-bootstrap';
import { IconContext } from 'react-icons';
import { FaPlus, FaFlag, FaDownload ,FaFileContract} from 'react-icons/fa'; // Example icons
import {faFileContract} from "@fortawesome/free-solid-svg-icons";
// Map internal icon names to actual icons
const actionIconMap = {
    plus: <FaPlus />,
    flag: <FaFlag />,
    download: <FaDownload />,
    faFileContract: <FaFileContract />
};

export default function ActionButton({ text, icon, onClick, variant = 'light', className = '' }) {
    const buttonIcon = actionIconMap[icon];

    return (
        <Button variant={variant} onClick={onClick} className={`w-100 d-flex border border-dark align-items-center justify-content-center p-2 shadow-sm ${className}`}>
            {buttonIcon && (
                <IconContext.Provider value={{ className: 'me-2' }}>
                    {buttonIcon}
                </IconContext.Provider>
            )}
            <span className="small">{text}</span>
        </Button>
    );
}