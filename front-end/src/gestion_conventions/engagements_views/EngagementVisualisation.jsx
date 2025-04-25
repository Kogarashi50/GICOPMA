// src/pages/engagements_views/EngagementVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import PropTypes from 'prop-types';
import Spinner from 'react-bootstrap/Spinner';

// Helpers (Copied or imported)
const displayData = (data, fallback = '-') => data ?? fallback;
const formatDate = (dateString) => { if (!dateString) return '-'; try { return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return dateString; } };
// Use same currency formatter as in EngagementsPage
const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) return '-';
    return number.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


// Placeholder CSS classes (Copied for consistency)
const VISUALISATION_CONTAINER_CLASS = "p-3 p-md-4";
const VISUALISATION_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold';

const EngagementVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [engagementData, setEngagementData] = useState(null); // Renamed state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch single engagement, ensuring programme is loaded
    const fetchEngagement = useCallback(async () => { // Renamed function
        if (!itemId || !baseApiUrl) { setError("Config/ID manquant."); setLoading(false); return; }
        setLoading(true); setError(null); setEngagementData(null); // Use correct state setter
        const fetchUrl = `${baseApiUrl}/engagements/${itemId}`; // Correct endpoint
        try {
            const response = await axios.get(fetchUrl, { withCredentials: true });
            const data = response.data.engagement || response.data; // Adjust key based on API
            if (data && typeof data === 'object') {
                 if (!data.programme) console.warn(`Programme data missing for Engagement ${itemId}.`); // Check for 'programme' relation
                setEngagementData(data); // Use correct state setter
            } else { setError(`Aucune donnée pour ID ${itemId}.`); }
        } catch (err) { const errorMsg = err.response?.data?.message || err.message || `Erreur chargement.`; setError(`${errorMsg} (Status: ${err.response?.status})`); }
        finally { setLoading(false); }
    }, [itemId, baseApiUrl]);

    useEffect(() => { fetchEngagement(); }, [fetchEngagement]); // Call fetchEngagement

    // --- Render Logic ---
    if (loading) { return <div className="text-center p-5"><Spinner/> Chargement...</div>; }
    if (error) { return <Alert variant="danger" className="m-3"><Alert.Heading>Erreur</Alert.Heading><p>{error}</p><Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button></Alert>; }
    if (!engagementData) { return <Alert variant="warning" className="m-3">Aucune donnée.<Button variant="link" size="sm" onClick={onClose} className="float-end">Fermer</Button></Alert>; }

    return (
        // Apply visualisation container style
        <div className={VISUALISATION_CONTAINER_CLASS}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="mb-0 fw-bold">Engagement: {displayData(engagementData.Code_Engag)}</h3> {/* Use Exact Case */}
                <Button variant="light" size="sm" onClick={onClose} className={VISUALISATION_CLOSE_BUTTON_CLASS} aria-label="Fermer">Revenir à la liste</Button>
            </div>
            {/* Card structure */}
            <Card className="border-light shadow-sm">
                 <Card.Body>
                     <Row className="g-3">
                         {/* Engagement Details */}
                         <Col md={6}>
                             <h6 className="text-secondary text-uppercase small fw-semibold mb-3">Détails Engagement</h6>
                             <dl className="row mb-0 dl-compact">
                                 {/* Use Exact Case from schema */}
                                 <dt className="col-sm-4">ID:</dt><dd className="col-sm-8">{displayData(engagementData.ID)}</dd>
                                 <dt className="col-sm-4">Code:</dt><dd className="col-sm-8">{displayData(engagementData.Code_Engag)}</dd>
                                 <dt className="col-sm-4">Description:</dt><dd className="col-sm-8">{displayData(engagementData.Description)}</dd>
                                 <dt className="col-sm-4">Coût:</dt><dd className="col-sm-8 fw-bold">{formatCurrency(engagementData.Cout)}</dd>
                                 <dt className="col-sm-4">Montant CRO:</dt><dd className="col-sm-8 fw-bold">{formatCurrency(engagementData.Montant_CRO)}</dd>
                                 <dt className="col-sm-4">Montant Hors CRO:</dt><dd className="col-sm-8 fw-bold">{formatCurrency(engagementData.Montant_Hors_CRO)}</dd>
                                 <dt className="col-sm-4">Rang:</dt><dd className="col-sm-8">{displayData(engagementData.Rang)}</dd>
                                 <dt className="col-sm-4">Créé le:</dt><dd className="col-sm-8">{formatDate(engagementData.created_at)}</dd>
                                 <dt className="col-sm-4">Modifié le:</dt><dd className="col-sm-8">{formatDate(engagementData.updated_at)}</dd>
                             </dl>
                         </Col>
                         {/* Programme Details */}
                         <Col md={6}>
                             <h6 className="text-secondary text-uppercase small fw-semibold mb-3">Programme Associé</h6>
                             {/* Check if programme data was loaded */}
                             {engagementData.programme ? (
                                <dl className="row mb-0 dl-compact">
                                    <dt className="col-sm-4">Code Programme:</dt>
                                    <dd className="col-sm-8">{displayData(engagementData.programme.Code_Programme)}</dd> {/* Match key from Programme model */}
                                    <dt className="col-sm-4">Desc. Programme:</dt>
                                    <dd className="col-sm-8">{displayData(engagementData.programme.Description)}</dd> {/* Match key from Programme model */}
                                    {/* Display foreign key value stored on engagement */}
                                    <dt className="col-sm-4">(FK Ref):</dt>
                                    <dd className="col-sm-8">{displayData(engagementData.Programme)}</dd>
                                </dl>
                             ) : ( <p className="text-muted">Détails non dispo. (Ref: {displayData(engagementData.Programme)}).</p> )}
                         </Col>
                     </Row>
                 </Card.Body>
            </Card>
        </div>
    );
};

EngagementVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

export default EngagementVisualisation;