import React from 'react';
import { ListGroup, Alert } from 'react-bootstrap';
import { IconContext } from "react-icons";
import { FaCalendarAlt ,FaCalendarCheck, FaCalendarTimes, FaBuilding, FaExclamationTriangle} from 'react-icons/fa'; 
// Map deadline types to icons
const deadlineIconMap = {
    project_start: <FaCalendarAlt />,
    project_end: <FaCalendarCheck />,
    convention_end: <FaCalendarTimes />,
    market_launch: <FaBuilding />,
    default: <FaCalendarAlt />
};

// Map alert types to icons and variants (same as BudgetDistribution)
const alertIconMap = {
    warning: { icon: <FaExclamationTriangle/>, variant: 'warning' },
    danger: { icon: <FaExclamationTriangle/>, variant: 'danger' }
};


export default function DeadlineCalendar({ deadlines, alerts }) {

    return (
        <div>
            {deadlines && deadlines.length > 0 ? (
                <ListGroup variant="flush">
                    {deadlines.map((item, index) => (
                        <ListGroup.Item key={index} className="d-flex align-items-center border-0 px-0 py-2">
                            <IconContext.Provider value={{ size: '1em', className: 'me-3 text-secondary' }}>
                                {deadlineIconMap[item.type] || deadlineIconMap.default}
                            </IconContext.Provider>
                            <div className="flex-grow-1">
                                <p className="mb-0 small">{item.text}</p>
                                <p className="mb-0 small text-muted">{item.display_date}</p>
                            </div>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            ) : (
                <p className="text-muted text-center mt-3">Aucune échéance à venir.</p>
            )}

             {/* Display Alerts Below List */}
             {alerts && alerts.length > 0 && (
                <div className="mt-4">
                    {alerts.filter(a => a.count > 0).map((alert, index) => {
                        const alertStyle = alertIconMap[alert.type] || { icon: <FaExclamationTriangle/>};
                        return (
                            <Alert variant={`${alert.type}`} key={index} className="d-flex align-items-center p-2 small mb-2">
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