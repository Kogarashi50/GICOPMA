// src/pages/programmes_views/ProgrammeVisualisation.jsx

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

// Helpers
const displayData = (data, fallback = '-') => data ?? fallback;
const formatDate = (dateString) => {
    if (!dateString) return '-'; try { return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return dateString; }
};

// Placeholder CSS classes (Define based on ConventionVisualisation)
const VISUALISATION_CONTAINER_CLASS = "p-3 p-md-4";
const VISUALISATION_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold'; // Match Convention close button

const ProgrammeVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [programmeData, setProgrammeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchProgramme = useCallback(async () => {
        if (!itemId || !baseApiUrl) { setError("Config/ID manquant."); setLoading(false); return; }
        setLoading(true); setError(null); setProgrammeData(null);
        const fetchUrl = `${baseApiUrl}/programmes/${itemId}`;
        try {
            const response = await axios.get(fetchUrl, { withCredentials: true });
            const data = response.data.programme || response.data;
            if (data && typeof data === 'object') {
                 if (!data.chantier) console.warn(`Chantier data missing for Programme ${itemId}.`);
                setProgrammeData(data);
            } else { setError(`Aucune donnée pour ID ${itemId}.`); }
        } catch (err) { const errorMsg = err.response?.data?.message || err.message || `Erreur chargement.`; setError(`${errorMsg} (Status: ${err.response?.status})`); }
        finally { setLoading(false); }
    }, [itemId, baseApiUrl]);

    useEffect(() => { fetchProgramme(); }, [fetchProgramme]);

    if (loading) { return <div className="text-center p-5"><Spinner/> Chargement...</div>; }
    if (error) { return <Alert variant="danger" className="m-3"><Alert.Heading>Erreur</Alert.Heading><p>{error}</p><Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button></Alert>; }
    if (!programmeData) { return <Alert variant="warning" className="m-3">Aucune donnée.<Button variant="link" size="sm" onClick={onClose} className="float-end">Fermer</Button></Alert>; }

    return (
        // Apply visualisation container style
        <div className={VISUALISATION_CONTAINER_CLASS}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="mb-0 fw-bold">Programme: {displayData(programmeData.Code_Programme)}</h3>
                <Button variant="light" size="sm" onClick={onClose} className={VISUALISATION_CLOSE_BUTTON_CLASS} aria-label="Fermer">Revenir à la liste</Button>
            </div>
            {/* Card structure like ConventionVisualisation */}
            <Card className="border-light shadow-sm">
                 <Card.Body>
                     <Row className="g-3">
                         <Col md={6}>
                             <h6 className="text-secondary text-uppercase small fw-semibold mb-3">Détails Programme</h6>
                             <dl className="row mb-0 dl-compact">
                                 <dt className="col-sm-4">ID:</dt><dd className="col-sm-8">{displayData(programmeData.Id)}</dd>
                                 <dt className="col-sm-4">Code:</dt><dd className="col-sm-8">{displayData(programmeData.Code_Programme)}</dd>
                                 <dt className="col-sm-4">Description:</dt><dd className="col-sm-8">{displayData(programmeData.Description)}</dd>
                                 <dt className="col-sm-4">Créé le:</dt><dd className="col-sm-8">{formatDate(programmeData.created_at)}</dd>
                                 <dt className="col-sm-4">Modifié le:</dt><dd className="col-sm-8">{formatDate(programmeData.updated_at)}</dd>
                             </dl>
                         </Col>
                         <Col md={6}>
    <h6 className="text-secondary text-uppercase small fw-semibold mb-3">Axe stratégique Associé</h6>
    {programmeData.domaine ? (
       <dl className="row mb-0 dl-compact">
           <dt className="col-sm-4">Code Axe stratégique:</dt>
           <dd className="col-sm-8">{displayData(programmeData.domaine.Code)}</dd>
           <dt className="col-sm-4">Desc. Axe stratégique:</dt>
           <dd className="col-sm-8">{displayData(programmeData.domaine.Description)}</dd>
       </dl>
    ) : ( <p className="text-muted">Aucun Axe stratégique associé.</p> )}
</Col>
                     </Row>
                 </Card.Body>
            </Card>
        </div>
    );
};

ProgrammeVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

export default ProgrammeVisualisation;