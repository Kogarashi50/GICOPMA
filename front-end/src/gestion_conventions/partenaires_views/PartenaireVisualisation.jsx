// src/pages/PartenaireVisualisation.jsx (Optional Financial Data Version)

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faInfoCircle,
    faFileInvoiceDollar, faHandHoldingDollar, faBalanceScaleLeft
} from '@fortawesome/free-solid-svg-icons';
import { Button, Card, Row, Col, Alert, Spinner, ListGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';

// --- Helper Functions (Included for direct copy-paste) ---
const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (value === null || value === undefined || isNaN(number)) {
        return (0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return number.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const displayData = (data, fallback = '-') => data ?? fallback;
// --- End Helpers ---

// --- Styles/Classes (Define or reuse consistent ones) ---
const VISUALISATION_CONTAINER_CLASS = "p-3 p-md-4 partenaire-visualisation-container";
const CARD_CLASS = "h-100 border-light shadow-sm mb-4";
const CARD_TITLE_CLASS = "mb-3 fw-semibold text-secondary text-uppercase small d-flex align-items-center";
const DETAIL_ITEM_CLASS = "list-group-item d-flex justify-content-between align-items-start border-0 px-0 py-2";
const DETAIL_LABEL_CLASS = "fw-bold me-2";
const DETAIL_VALUE_CLASS = "text-muted text-end";
// --- End Styles/Classes ---


const PartenaireVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [partnerData, setPartnerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchPartnerDetails = useCallback(async () => {
        if (!itemId || !baseApiUrl) {
            setError("ID Partenaire ou URL API manquant.");
            setLoading(false);
            return;
        }
        setLoading(true); setError(null); setPartnerData(null);

        // Use the endpoint that SHOULD contain the summary
        const fetchUrl = `${baseApiUrl}/partenaires/${itemId}/details-with-summary`;
        try {
            console.log(`[PartenaireVisualisation] Fetching data from: ${fetchUrl}`);
            const response = await axios.get(fetchUrl, { withCredentials: true });
            const data = response.data?.partenaireDetails;
            console.log("[PartenaireVisualisation] Received data:", data);

            // *** MODIFIED CHECK: Only require basic data to exist ***
            // We will check for financial fields specifically during rendering.
            if (data && typeof data === 'object' && data.Id) { // Check for basic object and presence of primary key 'Id'
                 setPartnerData(data);
            } else {
                 // Throw error if even basic data is invalid/missing
                 console.error("Format de données de base invalide reçu pour ID", itemId, data);
                 // Use the error message from the response if available (e.g., 404 message)
                 const errorMsg = response?.data?.message || `Données de base invalides ou manquantes pour ID ${itemId}.`;
                 // Use the status code from the response if available
                 const statusCode = response?.status || 400; // Default to 400 Bad Request if status not available
                 setError(`${errorMsg} (Code: ${statusCode})`);
                 // Explicitly set data to null if the response was invalid
                 setPartnerData(null);
            }
        } catch (err) {
            // Handle API errors (network, 404, 500, etc.)
            console.error("[PartenaireVisualisation] Error fetching details:", err.response || err);
            const statusCode = err.response?.status;
            let eMsg = err.response?.data?.message || err.message || 'Erreur inconnue';
            if (statusCode === 404) {
                eMsg = `Partenaire avec ID ${itemId} non trouvé.`;
            } else if (statusCode >= 500) {
                eMsg = "Une erreur s'est produite sur le serveur.";
            }
            setError(`Erreur chargement: ${eMsg} ${statusCode ? `(Code: ${statusCode})` : ''}`);
        }
        finally { setLoading(false); }
    }, [itemId, baseApiUrl]);

    useEffect(() => { fetchPartnerDetails(); }, [fetchPartnerDetails]);

    // --- Render Logic ---
    if (loading) { /* ... loading spinner ... */
        return ( <div className="text-center p-5 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}> <Spinner animation="border" variant="primary" className="me-3" /> <span className="text-muted fs-5">Chargement des détails du partenaire...</span> </div> );
    }
    if (error) { /* ... error alert ... */
        return ( <Alert variant="danger" className="m-3 m-md-4"> <Alert.Heading><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> Erreur de Chargement</Alert.Heading> <p>{error}</p> <hr /> <div className="d-flex justify-content-end"> <Button onClick={onClose} variant="warning" size="sm">Revenir a la liste</Button> </div> </Alert> );
    }
    if (!partnerData) { /* ... no data fallback ... */
        return ( <Alert variant="warning" className="m-3 m-md-4"> Aucune donnée de base trouvée pour ce partenaire (ID: {itemId}). <Button variant="link" size="sm" onClick={onClose} className="float-end">Revenir a la liste</Button> </Alert> );
    }

    // *** Check if financial data is available within partnerData ***
    const hasFinancialData = partnerData &&
                             partnerData.hasOwnProperty('total_engage') &&
                             partnerData.hasOwnProperty('total_verse') &&
                             partnerData.hasOwnProperty('reste_a_payer');

    // --- Display Component ---
    return (
        <div className={VISUALISATION_CONTAINER_CLASS}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                {/* ... header content ... */}
                 <div> <h1 className="text-uppercase fw-bold text-dark mb-1">Détails du Partenaire  <small className="text-muted fs-5 ms-2">{displayData(partnerData.Description||partnerData.Description_Arr)}
                    ({displayData(partnerData.Code)})</small></h1>  </div>
                 <Button variant="warning" size="sm" onClick={onClose} className="rounded-pill px-5 fw-bold py-2" aria-label="Fermer"> Revenir a la liste </Button>
             </div>

            {/* Content Grid */}
            {/* *** Adjust column spans based on financial data presence *** */}
            <Row className="g-4">

                {/* Card 1: Partner Basic Information (Always takes full width if no financial data) */}
                <Col md={hasFinancialData ? 6 : 12}> {/* Adjust column span */}
                    <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>
                                <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-primary"/> Informations Générales
                            </Card.Title>
                            <ListGroup variant="flush">
                                <ListGroup.Item className={DETAIL_ITEM_CLASS}>
                                    <span className={DETAIL_LABEL_CLASS}>Code Partenaire:</span>
                                    <span className={DETAIL_VALUE_CLASS}>{displayData(partnerData.Code)}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className={DETAIL_ITEM_CLASS}>
                                    <span className={DETAIL_LABEL_CLASS}>Description (Français):</span>
                                    <span className={DETAIL_VALUE_CLASS}>{displayData(partnerData.Description)}</span>
                                </ListGroup.Item>
                                <ListGroup.Item className={DETAIL_ITEM_CLASS}>
                                    <span className={DETAIL_LABEL_CLASS}>Description (Arabe):</span>
                                    <span className={`${DETAIL_VALUE_CLASS} text-right-arabic`} dir="rtl">
                                        {displayData(partnerData.Description_Arr)}
                                    </span>
                                </ListGroup.Item>
                                {/* Add other basic fields */}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </Col>

                {/* *** Card 2: Financial Summary (RENDER CONDITIONALLY) *** */}
                {hasFinancialData && (
                    <Col md={6}>
                         <Card className={CARD_CLASS}>
                            <Card.Body>
                                <Card.Title as="h6" className={CARD_TITLE_CLASS}>
                                    <FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2 text-success"/> Résumé Financier
                                </Card.Title>
                                <ListGroup variant="flush">
                                    <ListGroup.Item className={DETAIL_ITEM_CLASS}>
                                        <span className={DETAIL_LABEL_CLASS}><FontAwesomeIcon icon={faFileInvoiceDollar} className="me-1 text-muted fa-fw"/> Total Engagé:</span>
                                        <span className={`${DETAIL_VALUE_CLASS} fw-bold`}>{formatCurrency(partnerData.total_engage)}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className={DETAIL_ITEM_CLASS}>
                                        <span className={DETAIL_LABEL_CLASS}><FontAwesomeIcon icon={faHandHoldingDollar} className="me-1 text-muted fa-fw"/> Total Versé:</span>
                                        <span className={`${DETAIL_VALUE_CLASS} fw-bold text-success`}>{formatCurrency(partnerData.total_verse)}</span>
                                    </ListGroup.Item>
                                    <ListGroup.Item className={DETAIL_ITEM_CLASS}>
                                        <span className={DETAIL_LABEL_CLASS}><FontAwesomeIcon icon={faBalanceScaleLeft} className="me-1 text-muted fa-fw"/> Reste à Payer:</span>
                                        <span className={`${DETAIL_VALUE_CLASS} fw-bolder`}>
                                            {(() => { // IIFE to calculate style inline
                                                const value = parseFloat(partnerData.reste_a_payer);
                                                let style = {};
                                                if (isNaN(value)) style = { color: 'grey' };
                                                else if (value < 0) style = { color: '#dc3545' };
                                                else if (value > 0) style = { color: '#ffc107' };
                                                else style = { color: '#198754' };
                                                return <span style={style}>{formatCurrency(partnerData.reste_a_payer)}</span>;
                                            })()}
                                        </span>
                                    </ListGroup.Item>
                                 </ListGroup>
                            </Card.Body>
                        </Card>
                    </Col>
                )}
                {/* End Conditional Rendering of Financial Card */}

            </Row>
        </div>
    );
};

// --- Proptypes ---
PartenaireVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

export default PartenaireVisualisation;