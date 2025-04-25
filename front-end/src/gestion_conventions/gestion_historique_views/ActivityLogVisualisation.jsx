// src/gestion_historique/ActivityLogVisualisation.jsx (Adjust path)

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Modal, Button, Badge, Row, Col, ListGroup, Card, Spinner, Alert, Collapse } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUser, faInfoCircle,faExchangeAlt, faCubes, faClock, faFileAlt, faTags,
    faTimes, faCogs, faExclamationTriangle, faKey, faCheck, faBan,
    faArrowAltCircleLeft, faArrowAltCircleRight, faPlusCircle, faTrashAlt, faCalendarAlt ,
    faChevronDown, faChevronUp /// Added icons for better visuals
} from '@fortawesome/free-solid-svg-icons';
import './activity.css'
// --- Helpers (reuse or import) ---
const formatDate = (dateString, includeTime = true) => {
    // ... (keep existing formatDate helper) ...
    if (!dateString) return '-';
    try {
        // Basic check for YYYY-MM-DD format or ISO string before parsing
        const isValidFormat = /^\d{4}-\d{2}-\d{2}/.test(dateString);
        if (!isValidFormat) return dateString; // Return as is if not a recognizable date start

        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; // Invalid date object
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        if (!includeTime) { return `${day}/${month}/${year}`; }
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) { console.error("Date format error:", dateString, e); return dateString; }
};

// --- ** NEW UX-Focused Properties Renderer ** ---
const renderProperties = (props, eventType) => {
    if (!props || typeof props !== 'object' || Object.keys(props).length === 0) {
        return <ListGroup.Item className="text-muted  fst-italic py-3 px-3 text-center">Aucune propriété supplémentaire enregistrée.</ListGroup.Item>;
    }

    // Helper to render a single value with better type handling & styling
    const renderValue = (value, context = 'default') => {
        if (value === null || value === undefined) return <em className="text-muted fst-italic">(Vide)</em>;

        // Basic Date Detection (adjust regex if needed for more formats)
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|\s)?\d{2}:\d{2}:\d{2}/.test(value)) {
            return <span className="text-nowrap"><FontAwesomeIcon icon={faCalendarAlt} className="me-1 text-warning" /> {formatDate(value)}</span>;
        }
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return <span className="text-nowrap"><FontAwesomeIcon icon={faCalendarAlt} className="me-1 text-warning" /> {formatDate(value, false)}</span>;
        }

        if (typeof value === 'boolean') {
            return value
                ? <Badge bg="success-subtle" text="success-emphasis" className="border border-success-subtle"><FontAwesomeIcon icon={faCheck} /> Oui</Badge>
                : <Badge bg="danger-subtle" text="danger-emphasis" className="border border-danger-subtle"><FontAwesomeIcon icon={faBan} /> Non</Badge>;
        }
        // Display objects/arrays simply for now, could be expandable later
        if (typeof value === 'object') {
             return <pre className=" bg-light border rounded p-1 mb-0 text-break">{JSON.stringify(value, null, 2)}</pre>;
        }

        // Default string/number display
        let valueClass = "text-dark";
        if (context === 'old') valueClass = "text-danger-emphasis";
        if (context === 'new') valueClass = "text-success-emphasis";

        // Use text-break for potentially long strings
        return <span className={`value ${valueClass} text-break`}>{String(value)}</span>;
    };

    // --- Handling for 'updated' Events ---
    if (eventType === 'updated' && props.attributes && props.old) {
        const changedKeys = new Set([...Object.keys(props.attributes), ...Object.keys(props.old)].filter(key =>
             JSON.stringify(props.old?.[key]) !== JSON.stringify(props.attributes?.[key]) // Filter only changed keys
        ));

        const unchangedKeys = new Set(Object.keys(props.attributes).filter(key => !changedKeys.has(key)));

        if (changedKeys.size === 0 && unchangedKeys.size === 0) {
            return <ListGroup.Item className="text-muted  fst-italic py-3 px-3 text-center">Aucun changement détaillé enregistré.</ListGroup.Item>;
        }

        return (
            <>
                {/* Changed Fields Section */}
                {changedKeys.size > 0 && Array.from(changedKeys).sort().map(key => (
                    <ListGroup.Item key={`changed-${key}`} className="py-3 px-3 data-point">
                        <h6 className="mb-2 fw-bold text-primary-emphasis">
                            <FontAwesomeIcon icon={faKey} className="me-2 text-primary opacity-75" />
                            Champ Modifié : <span className='text-dark'>{key}</span>
                        </h6>
                        <Row className="g-2">
                            {/* Before Column */}
                            <Col xs={12} md={6}>
                                <Card className="h-100 border-danger-subtle shadow-sm">
                                    <Card.Header className="bg-danger-subtle text-danger-emphasis  py-1 px-2">
                                        <FontAwesomeIcon icon={faArrowAltCircleLeft} className="me-1" /> Valeur Initiale
                                    </Card.Header>
                                    <Card.Body className="p-2">
                                        {renderValue(props.old?.[key], 'old')}
                                    </Card.Body>
                                </Card>
                            </Col>
                            {/* After Column */}
                            <Col xs={12} md={6}>
                                <Card className="h-100 border-success-subtle shadow-sm">
                                    <Card.Header className="bg-success-subtle text-success-emphasis py-1 px-2">
                                        <FontAwesomeIcon icon={faArrowAltCircleRight} className="me-1" /> Nouvelle Valeur
                                    </Card.Header>
                                    <Card.Body className="p-2">
                                        {renderValue(props.attributes?.[key], 'new')}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </ListGroup.Item>
                ))}
                {/* Unchanged Fields Section (Optional, can be verbose) */}
                {/* You might want to hide this by default or make it collapsible */}
                {/* {unchangedKeys.size > 0 && (
                    <ListGroup.Item className='bg-light small pt-2 pb-1 px-3'><em className='text-muted'>Champs non modifiés:</em></ListGroup.Item>
                )}
                {unchangedKeys.size > 0 && Array.from(unchangedKeys).sort().map(key => (
                     <ListGroup.Item key={`unchanged-${key}`} className="py-1 px-3 small data-point text-muted">
                         <Row>
                             <Col xs={4} md={3}><strong className="label text-break">{key}:</strong></Col>
                             <Col xs={8} md={9}>{renderValue(props.attributes[key], 'default')}</Col>
                         </Row>
                     </ListGroup.Item>
                ))} */}
            </>
        );
    }

    // --- Handling for 'created' Events ---
    if (eventType === 'created' && props.attributes) {
         if (Object.keys(props.attributes).length === 0) {
            return <ListGroup.Item className="text-muted  fst-italic py-3 px-3 text-center">Aucun attribut initial enregistré.</ListGroup.Item>;
         }
         return (
            <>
                <ListGroup.Item className="py-1 px-3 bg-success-subtle text-success-emphasis  fw-bold">
                    <FontAwesomeIcon icon={faPlusCircle} className="me-2" /> Attributs à la Création
                </ListGroup.Item>
                {Object.entries(props.attributes).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, value]) => (
                    <ListGroup.Item key={key} className="py-2 px-3 data-point ">
                        <Row className="align-items-center">
                            <Col xs={5} sm={4} md={3}><strong className="label text-break fw-semibold">{key}:</strong></Col>
                            <Col xs={7} sm={8} md={9}>{renderValue(value, 'new')}</Col>
                        </Row>
                    </ListGroup.Item>
                ))}
            </>
         );
    }

    // --- Handling for 'deleted' Events ---
    if (eventType === 'deleted' && props.old) {
         if (Object.keys(props.old).length === 0) {
            return <ListGroup.Item className="text-muted fst-italic py-3 px-3 text-center">Aucun attribut enregistré avant suppression.</ListGroup.Item>;
         }
        return (
            <>
                <ListGroup.Item className="py-1 px-3 bg-danger-subtle text-danger-emphasis fw-bold">
                    <FontAwesomeIcon icon={faTrashAlt} className="me-2" /> Attributs avant Suppression
                </ListGroup.Item>
                {Object.entries(props.old).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, value]) => (
                    <ListGroup.Item key={key} className="py-2 px-3 data-point  text-muted">
                         <Row className="align-items-center">
                            <Col xs={5} sm={4} md={3}><strong className="label text-break">{key}:</strong></Col>
                             <Col xs={7} sm={8} md={9}>{renderValue(value, 'old')}</Col>
                         </Row>
                    </ListGroup.Item>
                ))}
            </>
        );
    }


    // --- Default/Fallback: Display all top-level properties ---
    return (
        <>
             <ListGroup.Item className="py-1 px-3 bg-light text-muted  fw-bold">Propriétés Personnalisées / Non Standard</ListGroup.Item>
             {Object.entries(props).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, value]) => (
                <ListGroup.Item key={key} className="py-2 px-3 data-point text-muted">
                     <Row className="align-items-center">
                         <Col xs={5} sm={4} md={3}><strong className="label text-break fw-semibold">{key}:</strong></Col>
                         <Col xs={7} sm={8} md={9}>{renderValue(value, 'default')}</Col>
                    </Row>
                </ListGroup.Item>
             ))}
        </>
    );
};
// --- ** End of Properties Renderer ** ---


// --- Main Component ---
const ActivityLogVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [showProperties, setShowProperties] = useState(false); // Start collapsed

    const [logData, setLogData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
const eventLIEE=(event)=>{
    switch(event){
        case'created':return 'Créé'
        case'updated':return 'Modifié'
        case 'deleted':return 'Supprimé'


    }
}
    useEffect(() => {
        let isMounted = true;
        if (!itemId) { setIsLoading(false); setError("ID d'historique manquant."); setLogData(null); return; }
        const fetchLogDetails = async () => {
            setIsLoading(true); setError(null); setLogData(null);
            setShowProperties(false); // Reset collapse state

            try {
                const response = await axios.get(`${baseApiUrl}/activity-log/${itemId}`, { withCredentials: true });
                if (isMounted) { setLogData(response.data); }
            } catch (err) {
                if (isMounted) { setError(err.response?.data?.message || err.message || "Erreur chargement."); }
            } finally {
                if (isMounted) { setIsLoading(false); }
            }
        };
        fetchLogDetails();
        return () => { isMounted = false; };
    }, [itemId, baseApiUrl]);

    const renderLogDetail = (label, value, icon, formatter = null) => (
        (value !== null && value !== undefined && value !== '') || value === 0 ?
           <div className=" mb-3 data-point">
               <div className='p-2'><FontAwesomeIcon icon={icon} className="me-2 text-muted fa-fw"/>
               <strong className="text-dark  label">{label}:</strong></div>
               <span className="value d-block">{formatter ? formatter(value) : value}</span>
           </div>
       : null
    );

    // --- Render Logic ---
    let modalContent;
    if (isLoading) {
        modalContent = <div className="text-center p-5"><Spinner animation="border" /><span> Chargement des détails...</span></div>;
    } else if (error) {
        modalContent = <Alert variant="danger" className="m-3"><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/>Erreur: {error}</Alert>;
    } else if (!logData) {
        modalContent = <Alert variant="warning" className="m-3">Aucune donnée trouvée pour cet historique.</Alert>;
    } else {
        const hasProperties = logData.properties && typeof logData.properties === 'object' && Object.keys(logData.properties).length > 0;
        const hasAttributes = logData.attributes && typeof logData.attributes === 'object' && Object.keys(logData.attributes).length > 0;
        const hasOld = logData.old && typeof logData.old === 'object' && Object.keys(logData.old).length > 0;

        const causerName = logData.causer?.nom_complet || null;
        const causerInfo = logData.causer ? `(ID: ${logData.causer_id} / ${logData.causer.email || 'N/A'})` : null;
        const subjectInfo = logData.subject_type
            ? `${logData.subject_type.split('\\').pop() || 'Objet inconnu'} (ID: ${logData.subject_id || 'N/A'})`
            : 'Aucun';

        modalContent = (
            <>
                 <div className="mb-4 pb-3 bg-white border-bottom data-section">
                     <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary"> Informations Générales</h5>
                     <Row>
                       <Col xs={12} md={12} lg={6} className="mb-3  bg-light m-3 data-point card shadow p-3 border-0"> 
                        {renderLogDetail("Date/Heure", logData.created_at, faClock, formatDate)}
                         
                             <div className='p-2'> <FontAwesomeIcon icon={causerName ? faUser : faCogs} className="me-2 text-muted fa-fw"/>
                              <strong className="text-dark label">Utilisateur :</strong></div>
                              <span className="value">
                                 {causerName || <span className='text-info fst-italic'>Système / Inconnu</span>}
                                 {causerInfo && <span className="text-muted ms-2">{causerInfo}</span>}
                             </span>
                          </Col>
                         <Col xs={12} md={12} lg={5} className="mb-3  bg-light  m-3 data-point card shadow p-3 border-0">{renderLogDetail("Événement", logData.event, faTags, (event) => (<Badge bg="warning" text="dark" style={{fontSize:'13px'}} className="ms-1">{eventLIEE(event)}</Badge>))}
                         {renderLogDetail("Log Name", logData.log_name, faTags, (logName) => (<Badge bg="dark" style={{fontSize:'13px'}} className="ms-1 ">{logName}</Badge>))}
                    </Col> </Row>
                 </div>

                 <div className="mb-3 data-section">
             {/* Clickable Header to Toggle Collapse */}
             <Button 
                 variant="link"
                 onClick={() => setShowProperties(!showProperties)}
                 aria-controls="properties-collapse-content"
                 aria-expanded={showProperties}
                 disabled={!hasProperties} // Disable if no properties exist
                 className="d-flex justify-content-between align-items-center w-100 p-0 px-3 m-0 text-decoration-none section-title"
             >
                <h5 className="mb-0 text-uppercase fw-bold text-secondary titledropdown">
                      Propriétés / Changements
                 </h5>
                 {/* Show chevron only if there are properties */}
                 {hasProperties && (
                   <FontAwesomeIcon
                      icon={showProperties ? faChevronUp : faChevronDown}
                      className="text-warning bg-black small p-2 rounded-5 opacity-75"
                   />
                 )}
             </Button>

             {/* Collapsible Content Area */}
             <Collapse in={showProperties}>
                 <div id="properties-collapse-content" className='mt-2'>
                     <Card className="shadow-sm border-light">
                         <ListGroup variant="flush">
                             {/* Render properties only if they exist */}
                             {hasProperties ? renderProperties(logData.properties, logData.event)
                              : <ListGroup.Item className="text-muted small fst-italic py-3 px-3 text-center">Aucune propriété supplémentaire enregistrée.</ListGroup.Item> }
                         </ListGroup>
                     </Card>
                 </div>
             </Collapse>
        </div>
            </>
        );
    }

    return (
        <div> {/* Using fragment as Modal is rendered by DynamicTable */}
            <div className='d-flex border-bottom pb-3 m-4 bg-white justify-content-between activityLog'>
                <h4 className="fw-bold text-dark">
                    Détails de l'Historique {itemId ? `(ID: ${itemId})` : ''}
                </h4>
                <Button variant="warning" onClick={onClose} className="px-5 fw-bold py-1 rounded-pill shadow-sm">
                     Revenir a la liste
                </Button>
            </div>

            <Modal.Body className="px-4 py-4 bg-white">
                {modalContent}
            </Modal.Body>

           
        </div>
    );
};

// --- PropTypes ---
ActivityLogVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

export default ActivityLogVisualisation;