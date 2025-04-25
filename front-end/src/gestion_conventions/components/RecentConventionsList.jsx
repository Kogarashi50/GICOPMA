import React from 'react';
import { ListGroup, Badge, ProgressBar, OverlayTrigger, Tooltip } from 'react-bootstrap';

// Define mappings for status colors (adjust variants as needed)
const statusVariantMap = {
    // Priority 1: Signed / Approved / Done
    'signé': 'success',
    'approuvé': 'success', // Assuming 'approuvé' is a final state

    // Priority 2: In Progress / Pending Signature/Approval/Visa
    'en cours de signature': 'warning',
    'en cours de visa': 'info', // Use 'info' for visa steps?
    'en cours d\'approbation': 'warning',
    'visé': 'info', // If 'visé' is an intermediate step

    // Priority 3: Not Signed / Not Approved / Blocked
    'non signé': 'danger',
    'non visé': 'secondary', // Use 'secondary' or 'danger' for non-visa?
    'non approuvé': 'danger',

    // Default / Unknown
    default: 'secondary'
};

// Helper function to determine ProgressBar variant based on percentage
const getProgressBarVariant = (percentage) => {
    if (percentage < 30) return 'danger';
    if (percentage < 70) return 'warning';
    return 'success';
};

export default function RecentConventionsList({ conventions }) {
    console.log('ur data:',conventions)

    if (!conventions || conventions.length === 0) {
        return <p className="text-muted text-center mt-3">Aucune convention récente à afficher.</p>;
    }

    return (
        <ListGroup variant="flush">
            {conventions.map((convention) => {
                const statusKey = convention.statut ? convention.statut.toLowerCase() : 'default';
                const variant = statusVariantMap[statusKey] || statusVariantMap.default;
                const progressVariant = getProgressBarVariant(convention.advancementPercentage);
                const roundedPercentage = Math.round(convention.advancementPercentage);

                // Tooltip for potentially long titles
                const renderTooltip = (props) => (
                    <Tooltip id={`tooltip-${convention.id}`} {...props}>
                        {convention.intitule}
                    </Tooltip>
                );

                return (
                    <ListGroup.Item key={convention.id} className="p-2 border-bottom"> {/* Add bottom border */}
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <OverlayTrigger
                                placement="top"
                                delay={{ show: 250, hide: 400 }}
                                overlay={renderTooltip}
                            >
                                <span className="fw-medium text-truncate me-2" style={{ maxWidth: '60%' }}> {/* Truncate title */}
                                    {convention.intitule || 'Convention sans titre'}
                                </span>
                            </OverlayTrigger>
                            <Badge bg={variant} pill>
                                {convention.statut || 'Statut inconnu'}
                            </Badge>
                        </div>
                        <div>
                            <ProgressBar
                                now={convention.advancementPercentage}
                                label={`${roundedPercentage}%`}
                                variant={progressVariant}
                                style={{ height: '12px' }}
                                className="small" // Make progress bar text smaller if needed
                            />
                            {/* Optional: Add text description below progress bar */}
                            {/* <div className="text-muted small mt-1 text-end">{roundedPercentage}% Avancé</div> */}
                        </div>
                    </ListGroup.Item>
                );
            })}
        </ListGroup>
    );
}