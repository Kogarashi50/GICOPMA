import React from 'react';
import { Card } from 'react-bootstrap';
import { IconContext } from 'react-icons'; // Optional for icons within cards
import { FaRegBuilding, FaTasks, FaFileSignature, FaCoins } from 'react-icons/fa'; // Example icons

// Map color names to bootstrap classes
const colorMap = {
    white: { bg: 'light', text: 'dark', border: 'light' }, // Add border for white cards
    warning: { bg: 'warning', text: 'white', border: 'warning' },
    dark: { bg: 'dark', text: 'white', border: 'dark' },
};

// Optional: Map titles to icons
const iconMap = {
    "Conventions": <FaFileSignature />,
    "Projets en cours": <FaTasks />,
    "Marchés lancés": <FaRegBuilding />,
    "Budget Total": <FaCoins /> // Assuming 1.2M relates to budget
}

export default function StatCard({ title, value, color = 'white' }) {
    const { bg, text, border } = colorMap[color] || colorMap.white;
    const cardIcon = iconMap[title];

    return (
        <Card className={`h-75 small border-${border} shadow-sm bg-${bg} text-${text}`}>
            <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center p-3">
                {/* Optional Icon */}
                {/* {cardIcon && (
                    <IconContext.Provider value={{ size: '1em', className: `mb-2 text-${text}` }}>
                        {cardIcon}
                    </IconContext.Provider>
                )} */}
                <h1 className=" fw-bold mb-0">{value ?? '...'}</h1>
                <p className={`mb-0 text-${text} text-uppercase`}>{title}</p>
            </Card.Body>
        </Card>
    );
}