// src/pages/ChantierVisualisation.jsx (Adjust path if needed)

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import PropTypes from 'prop-types';
import Spinner from 'react-bootstrap/Spinner';

// Helper for displaying potentially missing data
const displayData = (data, fallback = '-') => data ?? fallback;

// Helper to format dates (can be imported from a shared utils file)
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString; // Return original if formatting fails
    }
};


// --- Component ---
const ChantierVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [chantierData, setChantierData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetching Logic
    const fetchChantier = useCallback(async () => {
        if (!itemId || !baseApiUrl) {
            setError("Configuration ou ID manquant."); setLoading(false); return;
        }

        console.log(`[Visualisation] Fetching chantier ID: ${itemId}`);
        setLoading(true); setError(null); setChantierData(null);

        // IMPORTANT: Ensure this endpoint returns the related 'domaine' object
        const fetchUrl = `${baseApiUrl}/chantiers/${itemId}`;
        console.log("[Visualisation] Fetching from URL:", fetchUrl);

        try {
            // Ensure CSRF cookie if needed
            // await axios.get(`${baseApiUrl}/sanctum/csrf-cookie`, { withCredentials: true });

            const response = await axios.get(fetchUrl, { withCredentials: true }); // Add credentials if needed
            console.log("[Visualisation] API Success Response data:", response.data);

            // Adjust based on your API response structure (e.g., response.data.chantier)
            const data = response.data.chantier || response.data;

            if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                // Check if the related domaine data is present
                 if (!data.domaine) {
                    console.warn(`[Visualisation] Related 'domaine' data missing in response for Chantier ID ${itemId}.`);
                    // Optionally set an error or proceed showing only id_domaine
                 }
                setChantierData(data);
            } else {
                console.warn(`[Visualisation] No chantier data found in response for ID ${itemId}`);
                setError(`Aucune donnée trouvée pour le chantier ID ${itemId}.`);
            }
        } catch (err) {
            console.error(`[Visualisation] API Error fetching chantier ${itemId}:`, err.response || err);
            const errorMsg = err.response?.data?.message || err.message || `Erreur de chargement.`;
            setError(errorMsg + (err.response ? ` (Status: ${err.response.status})` : ''));
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]);

    useEffect(() => {
        fetchChantier();
    }, [fetchChantier]);

    // --- Render Logic ---

    if (loading) {
        return (
            <div className="text-center p-5 d-flex justify-content-center align-items-center" style={{ minHeight: '250px' }}>
                <Spinner animation="border" variant="primary" className="me-3"/>
                <span className="text-muted">Chargement du chantier...</span>
            </div>
        );
    }

    if (error) {
        return (
             <Alert variant="danger" className="m-3">
                 <Alert.Heading><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> Erreur</Alert.Heading>
                 <p>{error}</p>
                 <hr />
                 <div className="d-flex justify-content-end">
                     <Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button>
                 </div>
             </Alert>
        );
    }

    if (!chantierData) {
        return (
            <Alert variant="warning" className="m-3">
                Aucune donnée disponible pour ce chantier.
                 <Button variant="link" size="sm" onClick={onClose} className="float-end">Fermer</Button>
            </Alert>
        );
    }

    // --- Main Content ---
    return (
        <div className="p-3 p-md-4 chantier-visualisation-container">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="mb-0 fw-bold">
                    Chantier: {displayData(chantierData.Code_Chantier)}
                </h3>
                <Button variant="light" size="sm" onClick={onClose} className="btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold" aria-label="Fermer" >
                   Revenir a la liste
                </Button>
            </div>

            {/* Details Card */}
            <Card className="border-light shadow-sm">
                 <Card.Body>
                     <Row className="g-3"> {/* Use Row and Col for layout */}
                         <Col md={6}>
                            <h6 className="text-secondary text-uppercase small fw-semibold mb-3">Détails Chantier</h6>
                            <dl className="row mb-0 dl-compact">
                                <dt className="col-sm-4">Code Chantier:</dt>
                                <dd className="col-sm-8">{displayData(chantierData.Code_Chantier)}</dd>

                                <dt className="col-sm-4">Description:</dt>
                                <dd className="col-sm-8">{displayData(chantierData.Description)}</dd>

                                <dt className="col-sm-4">Créé le:</dt>
                                <dd className="col-sm-8">{formatDate(chantierData.created_at)}</dd>

                                <dt className="col-sm-4">Modifié le:</dt>
                                <dd className="col-sm-8">{formatDate(chantierData.updated_at)}</dd>
                            </dl>
                         </Col>
                         <Col md={6}>
                             <h6 className="text-secondary text-uppercase small fw-semibold mb-3">Domaine Associé</h6>
                             {chantierData.domaine ? (
                                <dl className="row mb-0 dl-compact">
                                    <dt className="col-sm-4">Code Domaine:</dt>
                                    {/* Domaine Code is stored in chantier.id_domaine */}
                                    <dd className="col-sm-8">{displayData(chantierData.Id_Domaine)}</dd>

                                    <dt className="col-sm-4">Description Domaine:</dt>
                                    <dd className="col-sm-8">{displayData(chantierData.domaine.Description)}</dd>

                                     {/* Add other Domaine fields if needed and available */}
                                     {/* <dt className="col-sm-4">ID Domaine:</dt> */}
                                     {/* <dd className="col-sm-8">{displayData(chantierData.domaine.Id)}</dd> */}
                                </dl>
                             ) : (
                                 <p className="text-muted">
                                     Informations du domaine non disponibles (ID Domaine: {displayData(chantierData.Id_Domaine)}).
                                 </p>
                             )}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>
        </div>
    );
};

// --- PropTypes ---
ChantierVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

export default ChantierVisualisation;