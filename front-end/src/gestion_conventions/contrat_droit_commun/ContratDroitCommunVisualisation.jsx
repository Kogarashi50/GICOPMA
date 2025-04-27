// src/gestion_contrats_cdc_views/ContratDroitCommunVisualisation.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
// Keep original Bootstrap imports + add Stack
import { Button, Row, Col, ListGroup, Spinner, Alert, Stack, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Keep original icons + add faUsers, faUserTie
import {
    faDownload, faFileAlt, faTimes, faPaperclip, faBuilding, faCalendarAlt,
    faFileInvoiceDollar, faTag, faFileContract, faInfoCircle, faClock,
    faExclamationTriangle, faHashtag, faAlignLeft, faFileSignature,
    faHandHoldingUsd, faRulerHorizontal, faListAlt, faMoneyCheckAlt, faCommentDots,
    faUsers, faUserTie // <-- Added for fonctionnaire
} from '@fortawesome/free-solid-svg-icons';

// Keep original CSS import
import '../bon_commandes_views/boncmd.css'; // Reuse existing styles if suitable

// --- Environment Variables (Keep original) ---
const BASE_API_URL =  'http://localhost:8000/api';
const STORAGE_URL = 'http://localhost:8000/public';

// --- Helper Functions (Keep original) ---
const formatDecimal = (value, currency = 'MAD', decimals = 2) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    const formatted = number.toLocaleString('fr-MA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return currency ? `${formatted} ${currency}` : formatted;
};

const formatDateSimple = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
             console.warn("Visualisation: Invalid date received:", dateString);
             return dateString;
        }
        return date.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
        console.error("Visualisation: Error formatting date:", dateString, e);
        return dateString;
    }
};

const displayData = (data, fallback = '-') => data ?? fallback;
// --- End Helpers ---

// --- Component Definition ---
const ContratDroitCommunVisualisation = ({ itemId, onClose, baseApiUrl = BASE_API_URL }) => {
    const [contratData, setContratData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // --- ADDED: State for fonctionnaires list ---
    const [fonctionnairesList, setFonctionnairesList] = useState([]);

    // --- MODIFIED: Fetching Logic ---
    const fetchData = useCallback(async () => {
        if (!itemId) {
            setContratData(null); setLoading(false); setError(null);
            return;
        }

        console.log(`[CDC Visualisation] Fetching data for Contrat ID: ${itemId}`);
        setLoading(true); setError(null); setContratData(null); setFonctionnairesList([]); // Reset lists

        const apiPrefix = ''; // Adjust if needed
        const contratUrl = `${baseApiUrl}${apiPrefix}/contrat-droit-commun/${itemId}`;
        const fonctionnairesUrl = `${baseApiUrl}${apiPrefix}/fonctionnaires`;

        try {
            // Fetch both concurrently
            const [contratRes, foncRes] = await Promise.allSettled([
                 axios.get(contratUrl, { params: { include: 'fichiers' }, withCredentials: true }),
                 axios.get(fonctionnairesUrl, { withCredentials: true })
            ]);

            // Process Contrat Response
            if (contratRes.status === 'fulfilled' && contratRes.value.data) {
                const cdcData = contratRes.value.data.contrat_droit_commun || contratRes.value.data;
                if (cdcData && typeof cdcData === 'object' && cdcData.id) { // Check for primary key
                     cdcData.fichiers = Array.isArray(cdcData.fichiers) ? cdcData.fichiers : [];
                     setContratData(cdcData);
                     console.log("[CDC Visualisation] Data Received:", cdcData);
                } else {
                    throw new Error(`Aucune donnée ou format invalide reçu pour le contrat ID ${itemId}.`);
                }
            } else {
                 const status = contratRes.reason?.response?.status;
                 const errorDetail = contratRes.reason?.response?.data?.message || contratRes.reason?.message || `Erreur inconnue (Status: ${status || 'N/A'})`;
                 console.error(`Contrat fetch failed (Status: ${status}):`, errorDetail, contratRes.reason);
                 throw new Error(`Échec chargement Contrat: ${errorDetail}`);
            }

            // Process Fonctionnaires Response
            if (foncRes.status === 'fulfilled' && foncRes.value.data) {
                 const foncData = foncRes.value.data.fonctionnaires || foncRes.value.data || [];
                 setFonctionnairesList(foncData.map(f => ({
                     value: f.id,
                     label: f.nom_complet || `ID ${f.id}`
                 })));
                 console.log("Fetched Fonctionnaires List (count):", foncData.length);
            } else {
                console.warn("Could not fetch fonctionnaires list:", foncRes.reason?.message || foncRes.reason);
                setFonctionnairesList([]); // Ensure it's an array
            }

        } catch (err) {
            console.error(`[CDC Visualisation] API Error fetching ID ${itemId}:`, err.response || err);
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message || `Erreur de chargement (ID: ${itemId}).`;
            setError(errorMsg + (err.response ? ` (Status: ${err.response.status})` : ''));
            setContratData(null);
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]); // Keep original dependencies

    // Effect to trigger fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- ADDED: Helper function to get fonctionnaire names ---
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) {
            return <span className="fs-6 text-end text-muted fst-italic">-</span>; // Match value style from renderField
        }
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
             return <span className="fs-6 text-end text-muted fst-italic">-</span>;
        }
        return (
            // Use Stack for layout, apply original badge styling (light bg, dark text, border)
            <Stack direction="horizontal" gap={1} wrap="wrap" className='justify-content-end'> {/* Align badges to the right */}
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        // Use original badge styling from BC Visu province example
                        <Badge key={id} pill bg="light" text="dark" className="me-1 mb-1 border">
                            <FontAwesomeIcon icon={faUserTie} className="me-1" />
                            {fonctionnaire?.label || `ID ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]); // Recalculate only if the list changes


    // --- Render Logic ---

    // Keep original renderField helper
    const renderField = (label, value, icon = null, className = "mb-3", extraClass = "") => (
        <div className={`${className} bc-data-point`}>
             <p className={`text-dark d-flex justify-content-between titly mb-1 ${extraClass}`}>
                <b>
                    {icon && <FontAwesomeIcon icon={icon} className="me-2 text-warning" />}
                    <span>{label}</span>
                </b>
                <span className="fs-6 text-end">{displayData(value)}</span>
             </p>
        </div>
    );

    // Keep original renderFieldBlock helper
    const renderFieldBlock = (label, value, icon = null, className = "mb-3") => (
        <div className={`${className} bc-data-point d-flex flex-column justify-content-center `}>
             <p className="text-dark mb-1 titly">
                 <b>
                    {icon && <FontAwesomeIcon icon={icon} className="me-2 text-warning" />}
                    <span>{label}</span>
                </b>
            </p>
             <p className="fs-6 p-2 rounded-5 border px-4 bg-white shadow-sm" style={{ whiteSpace: 'pre-wrap' }}>{displayData(value)}</p>
        </div>
    );

    // --- Loading State (Keep original) ---
    if (loading) {
        return ( <div className="text-center p-4"> <Spinner animation="border" variant="primary" /> <p className="mt-2 text-muted">Chargement...</p> </div> );
    }

    // --- Error State (Keep original) ---
    if (error) {
         return ( <Alert variant="danger" className="m-3"> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {error} {onClose && <Button variant="link" className="btn-close float-end" onClick={onClose}></Button>} </Alert> );
     }

    // --- No Data State (Keep original - ensure check happens after loading/error) ---
    if (!contratData) {
         return ( <div className="text-center p-4"> <p className="mt-2 text-muted">Aucune donnée de contrat à afficher.</p> </div> );
     }

    // --- Main Content Rendering ---
    return (
        // Keep original container classes
        <div className="p-3 bc-visualisation-container holder">
             {/* Header - Keep original */}
             <div className="d-flex p-5 justify-content-between align-items-start mb-4 px-md-5 border-bottom holder pb-2">
                <h2 className='mb-1 fw-bold text-dark'> Contrat: <span className="text-dark">{contratData.numero_contrat}</span> </h2>
                {onClose && ( <Button variant="warning" onClick={onClose} title="Retour" className="px-5 py-2 border-0 rounded-5 shadow-sm"> <b>Revenir à la liste</b> </Button> )}
             </div>

            {/* Keep original layout structure */}
            <Row className='mt-4 px-md-4'>
                {/* Main Details Column 1 - Keep original */}
                <Col md={5} className='border rounded-5 bg-white shadow-sm m-4 p-4'>
                    {renderField("Fournisseur", contratData.fournisseur_nom, faBuilding)}
                    {renderField("Date Signature", formatDateSimple(contratData.date_signature), faCalendarAlt)}
                    {renderField("Montant Total", formatDecimal(contratData.montant_total, 'MAD'), faHandHoldingUsd)}
                    {renderField("Durée", contratData.duree_contrat, faClock)}
                </Col>
                <Col md={1}></Col>

                {/* Main Details Column 2 - Keep original structure */}
                <Col md={5} className='border rounded-5 bg-white m-4 shadow-sm p-4'>
                    {renderField("Type Contrat", contratData.type_contrat, faListAlt)}
                    {renderField("Mode Paiement", contratData.mode_paiement, faMoneyCheckAlt)}

                    {/* --- ADDED: Fonctionnaire Display within this Column --- */}
                     {/* Use renderField structure */}
                     <div className="mb-3 bc-data-point"> {/* Match margin */}
                         <p className="text-dark d-flex justify-content-between titly mb-1">
                             <b>
                                <FontAwesomeIcon icon={faUsers} className="me-2 text-warning" /> {/* Use original icon style */}
                                <span>Points Focaux</span>
                            </b>
                             {/* Value is rendered by the helper */}
                            {/* Apply text-end to align the badges like other values */}
                            <span className="fs-6 text-end">
                                {getFonctionnaireNames(contratData.id_fonctionnaire)}
                            </span>
                         </p>
                    </div>
                    {/* --- END ADDED --- */}

                    {/* Keep optional created/updated fields if needed */}
                    {/* {contratData.created_at && renderField("Créé le", formatDateSimple(contratData.created_at), faClock)} */}
                    {/* {contratData.updated_at && renderField("Modifié le", formatDateSimple(contratData.updated_at), faClock)} */}
                </Col>
            </Row>

            <Row className='mt-4 px-md-4'>
                {/* Keep original Objet */}
                <Col xs={6}> {renderFieldBlock("Objet du Contrat", contratData.objet, faAlignLeft)} </Col>
                {/* Keep original Observations */}
                {contratData.observations && ( <Col xs={6}> {renderFieldBlock("Observations", contratData.observations, faCommentDots)} </Col> )}
            </Row>

            {/* --- Fichiers Section (Keep original) --- */}
            <Row className="mt-4 pt-3 border-top mx-md-3">
                <Col xs={12}>
                    <h5 className="text-uppercase titly text-muted fs-4"> <FontAwesomeIcon icon={faPaperclip} className='me-2'/> Fichiers Associés ({contratData.fichiers.length}) </h5>
                    {Array.isArray(contratData.fichiers) && contratData.fichiers.length > 0 ? (
                        <ListGroup variant="flush" className=" d-flex justify-content-evenly flex-wrap flex-row align-items-center p-2 ">
                            {contratData.fichiers.map(file => ( file && file.id ? ( <ListGroup.Item key={file.id} className="border rounded-4 p-2 d-flex align-items-center bg-dark m-1 text-white"> <div> <FontAwesomeIcon icon={faFileAlt} className='me-2 text-warning'/> <span className="text-truncate" title={file.nom_fichier || 'Nom inconnu'}>{file.nom_fichier || 'Fichier sans nom'}</span> <span className='text-muted small ms-2'>({formatDateSimple(file.date_ajout)})</span> </div> {file.chemin_fichier && ( <a href={`${STORAGE_URL}/${file.chemin_fichier}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-warning ms-2 py-0 px-2" title="Voir / Télécharger"><FontAwesomeIcon icon={faDownload} className='text-warning' /></a> )} </ListGroup.Item> ) : null ))}
                        </ListGroup>
                    ) : ( <p className="text-muted fst-italic small">Aucun fichier associé à ce contrat.</p> )}
                </Col>
            </Row>
        </div>
    );
};

// --- PropTypes (Keep original) ---
ContratDroitCommunVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string
};

// Default Props
ContratDroitCommunVisualisation.defaultProps = {
   baseApiUrl: BASE_API_URL
};

export default ContratDroitCommunVisualisation;