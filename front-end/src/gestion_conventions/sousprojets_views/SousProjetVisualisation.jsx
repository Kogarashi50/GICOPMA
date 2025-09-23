// src/pages/sousprojets_views/SousProjetVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// --- Add necessary icons ---
import {
    faSpinner, faExclamationTriangle, faUserTie, faUsers
} from '@fortawesome/free-solid-svg-icons';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
// --- Add necessary layout components ---
import Stack from 'react-bootstrap/Stack';
import Badge from 'react-bootstrap/Badge';

// Helpers
const formatPercentage = (value) => { const n = parseFloat(value); return isNaN(n)?'-':`${n.toFixed(2)} %`; };
const formatNumber = (value, decimals = 2) => { const n = parseFloat(value); return isNaN(n)?'-':n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); };
const displayData = (data, fallback = '-') => data ?? fallback;
const formatDate = (dateString) => { if (!dateString) return '-'; try { return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return dateString; } };
// const formatDateSimple = (dateString) => { ... }; // Define if needed elsewhere

// Styles/Classes
const VISUALISATION_CONTAINER_CLASS = "p-3 p-md-4 sousprojet-visualisation-container";
const VISUALISATION_CLOSE_BUTTON_CLASS = 'float-end py-2 rounded-5 shadow fw-bold px-5';
const CARD_CLASS = "h-100 border-light shadow-sm";
const CARD_TITLE_CLASS = "mb-3 fw-semibold text-secondary text-uppercase small";
const DL_CLASS = "row mb-0 dl-compact"; // Compact definition list style
const DT_CLASS = "col-sm-5 fw-bold"; // Adjust grid for label width
const DD_CLASS = "col-sm-7";         // Adjust grid for data width

const SousProjetVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [sousProjetData, setSousProjetData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]); // State for fonctionnaires lookup

    // Fetch Sous-Projet and Fonctionnaires data
    const fetchSousProjetAndFonctionnaires = useCallback(async () => {
        if (!itemId || !baseApiUrl) {
            setError("Configuration error: Missing ID or Base URL.");
            setLoading(false);
            return;
        }
        setLoading(true); setError(null); setSousProjetData(null); setFonctionnairesList([]);
        const apiPrefix = ''; // Set to '/api' if your Laravel routes ARE NOT prefixed automatically
        const sousProjetUrl = `${baseApiUrl}${apiPrefix}/sousprojets/${itemId}`;
        const fonctionnairesUrl = `${baseApiUrl}/options/fonctionnaires`; 
        console.log("Fetching Sous-Projet from:", sousProjetUrl);
        console.log("Fetching Fonctionnaires from:", fonctionnairesUrl);

        try {
            const [sousProjetRes, foncRes] = await Promise.allSettled([
                axios.get(sousProjetUrl, { withCredentials: true }),
                axios.get(fonctionnairesUrl, { withCredentials: true })
            ]);

            // Process Sous-Projet Response
            if (sousProjetRes.status === 'fulfilled' && sousProjetRes.value.data) {
                // Adjust key based on your API response structure
                const data = sousProjetRes.value.data.sousprojet || sousProjetRes.value.data.sous_projet || sousProjetRes.value.data;
                console.log("Fetched Sous-Projet Data:", data);
                if (data && typeof data === 'object' && data.Code_Sous_Projet) {
                     if (!data.projet) console.warn(`Projet Maître data missing for Sous-Projet ${itemId}.`);
                     if (!data.province) console.warn(`Province data missing for Sous-Projet ${itemId}.`);
                     if (!data.commune) console.warn(`Commune data missing for Sous-Projet ${itemId}.`);
                    setSousProjetData(data);
                } else {
                    console.error("Sous-Projet data invalid format or missing Code.", data);
                    throw new Error(`Format de données invalide reçu pour Sous-Projet ${itemId}.`);
                }
            } else {
                const status = sousProjetRes.reason?.response?.status;
                const errorDetail = sousProjetRes.reason?.response?.data?.message || sousProjetRes.reason?.message || `Erreur inconnue (Status: ${status || 'N/A'})`;
                console.error(`Sous-Projet fetch failed (Status: ${status}):`, errorDetail, sousProjetRes.reason);
                throw new Error(`Échec chargement sous-projet: ${errorDetail}`);
            }

            // Process Fonctionnaires Response
            if (foncRes.status === 'fulfilled' && foncRes.value.data) {
                const foncData = foncRes.value.data.fonctionnaires || foncRes.value.data || [];
                setFonctionnairesList(foncData.map(f => ({
                    value: f.id, // Ensure 'id' is the primary key in your Fonctionnaire model/resource
                    label: f.nom_complet || `ID ${f.id}` // Ensure 'nom_complet' exists or adjust field name
                })));
                 console.log("Fetched Fonctionnaires List:", fonctionnairesList); // Log list AFTER set state finishes potentially
            } else {
                console.warn("Could not fetch fonctionnaires list:", foncRes.reason?.message || foncRes.reason);
                // Don't throw error, visualisation might still work partially
            }

        } catch (err) {
            console.error(`Error during fetch:`, err);
            setError(err.message || 'Erreur de chargement.');
        }
        finally { setLoading(false); }
    }, [itemId, baseApiUrl]); // Removed fonctionnairesList from dependency array

    // Trigger fetch on mount or when dependencies change
    useEffect(() => {
        fetchSousProjetAndFonctionnaires();
    }, [fetchSousProjetAndFonctionnaires]);

    // Helper to render Fonctionnaire names as badges
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) {
            return displayData(null); // Use standard fallback '-'
        }
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
            return displayData(null);
        }
        return (
            <div direction="horizontal" gap={1} wrap="wrap d-inline">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        <Badge key={id} pill bg="light" text="dark" className="border me-1 mb-1 fw-normal shadow-sm">
                            <FontAwesomeIcon icon={faUserTie} className="me-1 text-secondary" />
                            {fonctionnaire?.label || `ID ${id}`}
                        </Badge>
                    );
                })}
             </div>
        );
    }, [fonctionnairesList]); // Re-calculate only if fonctionnairesList changes


    // --- Render Logic ---

    // State 1: Loading
    if (loading) {
        return (
            <div className="text-center p-5 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                <Spinner animation="border" variant="primary" className="me-3"/>
                <span className="text-muted fs-5">Chargement du sous-projet...</span>
            </div>
        );
    }

    // State 2: Error
    if (error) {
        return (
            <Alert variant="danger" className="m-3 m-md-4 shadow">
                <Alert.Heading><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> Erreur de Chargement</Alert.Heading>
                <p>{error}</p>
                <hr/>
                <Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button>
            </Alert>
        );
    }

    // State 3: No Data (after loading is false and no error occurred)
    if (!sousProjetData) {
        return (
            <Alert variant="warning" className="m-3 m-md-4 shadow">
                 <Alert.Heading>Données indisponibles</Alert.Heading>
                 <p>Aucune donnée n'a pu être chargée pour ce sous-projet (Code: {itemId}). Cela peut être dû à une réponse inattendue de l'API.</p>
                 <hr/>
                 <Button onClick={onClose} variant="outline-warning" size="sm">Fermer</Button>
            </Alert>
        );
    }

    // State 4: Data Loaded Successfully - Render the visualization
    // --- If code execution reaches here, sousProjetData is guaranteed to be an object ---
    return (
        <div className={VISUALISATION_CONTAINER_CLASS}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <h3 className="mb-0 fw-bold text-primary">
                    {displayData(sousProjetData.Nom_Projet)}
                    <small className="text-muted fw-normal ms-2">({displayData(sousProjetData.Code_Sous_Projet)})</small>
                </h3>
                <Button variant="warning" size="sm" onClick={onClose} className={VISUALISATION_CLOSE_BUTTON_CLASS} aria-label="Fermer">
                   Revenir à la liste
                </Button>
            </div>

            {/* Main Content Grid */}
            <Row className="g-3 mb-3">

                {/* Card 1: Basic Info */}
                <Col md={6} lg={4}>
                    <Card className={CARD_CLASS}>
                         <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Informations Générales</Card.Title>
                            <dl className={DL_CLASS}>
                                <dt className={DT_CLASS}>Code:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Code_Sous_Projet)}</dd>
                                <dt className={DT_CLASS}>Nom:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Nom_Projet)}</dd>
                                <dt className={DT_CLASS}>Projet Maître:</dt>
                                <dd className={DD_CLASS} title={sousProjetData.projet ? `Code: ${sousProjetData.projet.Code_Projet}` : ''}>
                                    {/* Display name if available, otherwise show the ID from sousProjetData */}
                                    {displayData(sousProjetData.projet?.Code_Projet+ ' - '+sousProjetData.projet?.Nom_Projet, `(Code: ${displayData(sousProjetData.ID_Projet_Maitre)})`)}
                                </dd>
                                <dt className={DT_CLASS}>Statut:</dt><dd className={DD_CLASS}><Badge bg="secondary">{displayData(sousProjetData.Status)}</Badge></dd>
                                <dt className={DT_CLASS}>Secteur:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Secteur)}</dd>
                            </dl>
                        </Card.Body>
                    </Card>
                </Col>

                 {/* Card 2: Localisation */}
                <Col md={6} lg={4}>
                     <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Localisation</Card.Title>
                             <dl className={DL_CLASS}>
                                <dt className={DT_CLASS}>Province:</dt>
                                <dd className={DD_CLASS}>
                                    {/* Display province name if available, otherwise show the ID */}
                                    {displayData(sousProjetData.province?.Description, `(ID: ${displayData(sousProjetData.Id_Province)})`)}
                                </dd>
                                <dt className={DT_CLASS}>Commune:</dt>
                                <dd className={DD_CLASS}>
                                    {/* Display commune name if available, otherwise show the ID */}
                                    {displayData(sousProjetData.commune?.Description, `(ID: ${displayData(sousProjetData.Id_Commune)})`)}
                                </dd>
                                <dt className={DT_CLASS}>Localité:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Localite)}</dd>
                                <dt className={DT_CLASS}>Centre:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Centre)}</dd>
                                <dt className={DT_CLASS}>Site:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Site)}</dd>
                                <dt className={DT_CLASS}>Douars Desservis:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Douars_Desservis)}</dd>
                             </dl>
                        </Card.Body>
                    </Card>
                </Col>

                 {/* Card 3: Détails Techniques & Financiers */}
                 <Col md={6} lg={4}>
                     <Card className={CARD_CLASS}>
                         <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Détails Techniques & Financiers</Card.Title>
                             <dl className={DL_CLASS}>
                                 <dt className={DT_CLASS}>Nature Intervention:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Nature_Intervention)}</dd>
                                 <dt className={DT_CLASS}>Surface:</dt><dd className={DD_CLASS}>{formatNumber(sousProjetData.Surface)}</dd>
                                 <dt className={DT_CLASS}>Linéaire:</dt><dd className={DD_CLASS}>{formatNumber(sousProjetData.Lineaire)}</dd>
                                 <dt className={DT_CLASS}>Av. Physique:</dt><dd className={DD_CLASS}><Badge bg="primary">{formatPercentage(sousProjetData.Etat_Avan_Physi)}</Badge></dd>
                                 <dt className={DT_CLASS}>Av. Financier:</dt><dd className={DD_CLASS}><Badge bg="success">{formatPercentage(sousProjetData.Etat_Avan_Finan)}</Badge></dd>
                                 <dt className={DT_CLASS}>Estim. Initiale:</dt><dd className={`${DD_CLASS} fw-bold`}>{formatNumber(sousProjetData.Estim_Initi)} MAD</dd> {/* Added currency indication */}
                                 <dt className={DT_CLASS}>Financement:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Financement)}</dd>
                                 <dt className={DT_CLASS}>Bénéficiaire:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Benificiaire)}</dd>
                             </dl>
                        </Card.Body>
                    </Card>
                 </Col>

                 {/* Card 4: Fonctionnaires, Observations & Audit */}
                 {/* Adjusted grid width for potentially longer content */}
                 <Col md={12} lg={8}> {/* Make observations wider */}
                     <Card className={CARD_CLASS}>
                        <Card.Body>
                             <Card.Title as="h6" className={CARD_TITLE_CLASS}>Observations & Audit</Card.Title>
                             <p className="small mb-3 text-muted fst-italic">{displayData(sousProjetData.Observations, "Aucune observation.")}</p>
                             <hr className="my-2" />
                             <dl className={`${DL_CLASS} mt-2`}>
                                <dt className={DT_CLASS}>Créé le:</dt><dd className={DD_CLASS}>{formatDate(sousProjetData.created_at)}</dd>
                                <dt className={DT_CLASS}>Modifié le:</dt><dd className={DD_CLASS}>{formatDate(sousProjetData.updated_at)}</dd>
                             </dl>
                        </Card.Body>
                    </Card>
                 </Col>
                 <Col md={12} lg={4}> {/* Make observations wider */}
                     <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Points Focaux</Card.Title>
                            <dt className={`${DT_CLASS} d-flex flex-row wrap justify-content-between`}>Points Focaux : </dt>
                            <dl className={`${DL_CLASS} mt-auto `}>
                                {getFonctionnaireNames(sousProjetData.id_fonctionnaire)}
                            </dl>
                        </Card.Body>
                    </Card>
                 </Col>

            </Row>
        </div>
    );
};

// Proptypes
SousProjetVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, // Code_Sous_Projet
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

export default SousProjetVisualisation;