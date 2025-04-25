import React from 'react';
import { ListGroup, Badge } from 'react-bootstrap';
import { FaFileSignature, FaFileExcel, FaFilePen } from 'react-icons/fa6'; // Example icons

// Optional: Map status to icon and color/variant
const statusDetailsMap = {
    'Signé': { icon: <FaFileSignature className="me-2" />, variant: 'success' },
    'Non Signé': { icon: <FaFileExcel className="me-2" />, variant: 'danger' },
    'En cours de signature': { icon: <FaFilePen className="me-2" />, variant: 'warning' },
};


export default function ConventionStatusSummary({ data }) {
console.log(data)
    // Handle loading or no data case (though parent component handles loading)
    if (!data || data.length === 0) {
        return <p className="text-muted text-center mt-3">Aucun résumé de statut de convention disponible.</p>;
    }

    return (
        <div>
            {/* Option 1: Using ListGroup for a cleaner look */}
            <ListGroup variant="flush">
                {data.map((item, index) => {
                    const details = statusDetailsMap[item.status] || { icon: null, variant: 'secondary' };
                    return (
                        <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center p-2 border-0">
                            <div className="d-flex align-items-center">
                                {details.icon}
                                <span className="small">{item.status}</span>
                            </div>
                            <Badge bg={details.variant} pill>
                                {item.count}
                            </Badge>
                        </ListGroup.Item>
                    );
                })}
            </ListGroup>

            {/* Option 2: Simple text display (similar to budget bars structure)
             <div>
                {data.map((item, index) => {
                     const details = statusDetailsMap[item.status] || { variant: 'secondary' }; // Get variant for text color
                     return (
                        <div key={index} className="d-flex justify-content-between align-items-center mb-2">
                             <span className={`small text-${details.variant}`}>{item.status}</span>
                             <span className={`fw-bold small text-${details.variant}`}>
                                {item.count}
                            </span>
                         </div>
                    );
                })}
             </div> */}
        </div>
    );
}