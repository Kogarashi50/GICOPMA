import React from 'react';
import { ProgressBar, Alert } from 'react-bootstrap';
import { IconContext } from "react-icons";
import { FaExclamationTriangle} from "react-icons/fa"; // Bootstrap icons match alert names

// Map internal color names to bootstrap variants
const colorVariantMap = {
    dark: 'dark',    // Teal -> dark
    warning: 'warning', // Orange -> warning
    light: 'light',
    // Add more if needed
};

 // Map alert types to icons and variants
 const alertIconMap = {
     warning: { icon: <FaExclamationTriangle/>, variant: 'warning' },
     dark: { icon: <FaExclamationTriangle/>, variant: 'dark' } // Using dark for the 'delayed' icon style
 };

export default function BudgetDistribution({ data, alerts }) {

    return (
        <div>
            {data && data.length > 0 ? (
                data.map((item, index) => (
                    <div key={index} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small text-muted">{item.label}</span>
                            <span className={`fw-bold small text-${colorVariantMap[item.color] || 'secondary'}`}>
                                {item.percentage}%
                            </span>
                        </div>
                        <ProgressBar
                            now={item.percentage}
                            variant={colorVariantMap[item.color] || 'secondary'}
                            style={{ height: '10px' }}
                        />
                    </div>
                ))
            ) : (
                 <p className="text-muted text-center mt-3">Aucune donnée budgétaire disponible.</p>
            )}

            {/* Display Alerts Below Bars */}
            {alerts && alerts.length > 0 && (
                <div className="mt-4">
                    {alerts.filter(a => a.count > 0).map((alert, index) => {
                         const alertStyle = alertIconMap[alert.type] || { icon: <FaExclamationTriangle/>, variant: 'warning' };
                         return (
                             <Alert variant={alertStyle.variant} key={index} className="d-flex align-items-center p-2 small mb-2">
                                 <IconContext.Provider value={{ className: "me-2", size: '1em' }}>
                                     {alertStyle.icon}
                                 </IconContext.Provider>
                                 <span>{alert.count} {alert.text}</span>
                             </Alert>
                         );
                    })}
                </div>
            )}
        </div>
    );
}