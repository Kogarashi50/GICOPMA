// src/gestion_conventions/bons_de_commande_views/BonDeCommandeVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import PropTypes from 'prop-types';
// Import necessary Bootstrap components + Stack
import { Button, Row, Col, Badge, ListGroup, Spinner, Alert, Stack } from 'react-bootstrap'; // Added Stack
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Import original icons + add faUsers, faUserTie
import {
    faDownload, faFileAlt, faTimes, faBuilding, faCalendarAlt,
    faFileInvoiceDollar, faTag, faFileContract, faClipboardCheck,
    faMoneyBillWave, faInfoCircle, faClock, faExclamationTriangle,
    faUsers, faUserTie // Added icons for fonctionnaire
} from '@fortawesome/free-solid-svg-icons';
// Keep original CSS import
import './boncmd.css'; // Adjust path if needed

// --- Environment Variables (Keep original) ---
const BASE_API_URL = 'http://localhost:8000/api';
const STORAGE_URL =  'http://localhost:8000/storage';

// --- Helper Functions (Keep original helpers) ---
const formatDecimal = (value, currency = '', decimals = 2) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    const formatted = number.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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
        // Keep original formatting
        return date.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
        console.error("Visualisation: Error formatting date:", dateString, e);
        return dateString;
    }
};

const displayData = (data, fallback = '-') => data ?? fallback;

// Keep original badge helper
const getEtatBadgeVariant = (etat) => {
     switch (etat?.toLowerCase()) {
        case 'en préparation': return 'primary';
        case 'validé': return 'info';
        case 'envoyé': return 'warning';
        case 'reçu': return 'success';
        case 'annulé': return 'danger';
        default: return 'secondary';
     }
 };
// --- End Helpers ---


// --- Component Definition ---
const BonDeCommandeVisualisation = ({ itemId, onClose, baseApiUrl = BASE_API_URL }) => {

    // Keep original state + add state for fonctionnaires list
    const [bonCommandeData, setBonCommandeData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // --- ADDED: State for fonctionnaires list ---
    const [fonctionnairesList, setFonctionnairesList] = useState([]);

    // --- MODIFIED: Fetching Logic ---
    const fetchBonCommandeAndFonctionnaires = useCallback(async () => {
        if (!itemId) {
            setBonCommandeData(null); setLoading(false); setError(null);
            return;
        }
        console.log(`[BC Visualisation Content] Fetching data for Bon de Commande ID: ${itemId}`);
        setLoading(true); setError(null); setBonCommandeData(null); setFonctionnairesList([]); // Reset lists

        const apiPrefix = ''; // Assuming no prefix needed
        const bonCommandeUrl = `${baseApiUrl}${apiPrefix}/bon-de-commande/${itemId}`;
        const fonctionnairesUrl = `${baseApiUrl}${apiPrefix}/fonctionnaires`;

        try {
            // Fetch both concurrently
            const [bcRes, foncRes] = await Promise.allSettled([
                axios.get(bonCommandeUrl, { withCredentials: true }),
                axios.get(fonctionnairesUrl, { withCredentials: true })
            ]);

            // Process Bon de Commande Response (keep original logic)
            if (bcRes.status === 'fulfilled' && bcRes.value.data) {
                const bcData = bcRes.value.data.bon_de_commande || bcRes.value.data;
                if (bcData && typeof bcData === 'object' && bcData.id) { // Check for primary key 'id'
                     bcData.fichiers = Array.isArray(bcData.fichiers) ? bcData.fichiers : [];
                     bcData.marche_public = bcData.marche_public || null;
                     bcData.contrat = bcData.contrat || null;
                     setBonCommandeData(bcData);
                     console.log("[BC Visualisation Content] Bon de Commande Data Received:", bcData);
                } else {
                    throw new Error(`Aucune donnée ou format invalide reçu pour le bon de commande ID ${itemId}.`);
                }
            } else {
                 const status = bcRes.reason?.response?.status;
                 const errorDetail = bcRes.reason?.response?.data?.message || bcRes.reason?.message || `Erreur inconnue (Status: ${status || 'N/A'})`;
                 console.error(`Bon de Commande fetch failed (Status: ${status}):`, errorDetail, bcRes.reason);
                 throw new Error(`Échec chargement Bon de Commande: ${errorDetail}`);
            }

             // Process Fonctionnaires Response (keep original logic)
            if (foncRes.status === 'fulfilled' && foncRes.value.data) {
                const foncData = foncRes.value.data.fonctionnaires || foncRes.value.data || [];
                setFonctionnairesList(foncData.map(f => ({
                    value: f.id,
                    label: f.nom_complet || `ID ${f.id}` // Use appropriate name field
                })));
                console.log("Fetched Fonctionnaires List (count):", foncData.length);
            } else {
                console.warn("Could not fetch fonctionnaires list:", foncRes.reason?.message || foncRes.reason);
                 // Don't throw error, allow component to render without names if list fails
                 setFonctionnairesList([]);
            }

        } catch (err) {
            console.error(`[BC Visualisation Content] API Error fetching data for ID ${itemId}:`, err.response || err);
            const errorMsg = err.response?.data?.message || err.response?.data?.failed || err.response?.statusText || err.message || `Erreur de chargement (ID: ${itemId}).`;
            setError(errorMsg + (err.response ? ` (Status: ${err.response.status})` : ''));
            setBonCommandeData(null); // Clear data on error
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]); // Keep original dependencies

    // Effect to trigger fetch when itemId changes
    useEffect(() => {
        fetchBonCommandeAndFonctionnaires();
    }, [fetchBonCommandeAndFonctionnaires]); // Use the new combined fetch function


    // --- ADDED: Helper to render Fonctionnaire names ---
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        // Keep original checks for validity and empty list
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) {
            // Return simple fallback consistent with original renderField
            return <span className="value fst-italic text-muted">-</span>;
        }
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
             return <span className="value fst-italic text-muted">-</span>;
        }
        return (
            // Use Stack for layout, apply original badge styling (light bg, dark text, border)
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        // Match badge style used for provinces in original code
                        <Badge key={id} pill bg="light" text="dark" className="me-1 mb-1 border">
                            <FontAwesomeIcon icon={faUserTie} className="me-1" /> {/* Keep icon */}
                            {fonctionnaire?.label || `ID ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]); // Recalculate only if the list changes


    // --- Render Logic ---

    // Keep original renderField helper
    const renderField = (label, value, icon = null, className = "mb-3", isBadge = false) => (
        <div className={className}>
             <p className="text-dark d-flex justify-content-between titly d-block mb-1">
                <b> {icon && <FontAwesomeIcon icon={icon} className="me-2 text-warning" />}
                 <span>{label}</span></b>
             {/* Keep original Badge rendering logic */}
             {isBadge ? (
                 <Badge bg={getEtatBadgeVariant(value)} text={['warning', 'light', 'info'].includes(getEtatBadgeVariant(value)) ? 'dark' : 'white'} className="py-1 px-2" style={{fontSize: '0.85rem'}} >
                    {displayData(value)}
                 </Badge>
             ) : (
                 <span className="fs-6">{displayData(value)}</span>
             )}
              </p>
        </div>
    );
    // Keep original renderField2 helper
    const renderField2 = (label, value) => (
        <div className='border shadow-sm my-5 rounded-5 justify-content-center align-items-center d-flex flex-column py-3 bg-white'>
             <p className="text-dark titly">
                <b><span>{label}</span></b>
             </p>
              <p className="fs-6">{displayData(value)}</p>
        </div>
    );

    // --- Loading State (Keep original) ---
    if (loading) {
        return ( <div className="text-center p-4"> <Spinner animation="border" variant="primary" /> <p className="mt-2 text-muted">Chargement...</p> </div> );
    }

    // --- Error State (Keep original) ---
    if (error) {
         return ( <Alert variant="danger" className="m-3"> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {error} </Alert> );
     }

    // --- No Data State (Keep original - ensure check happens after loading/error) ---
    if (!bonCommandeData) {
         return ( <div className="text-center p-4"> <p className="mt-2 text-muted">Aucune donnée à afficher.</p> </div> );
     }

    // --- Main Content Rendering (Keep original structure and classes) ---
    return (
        <div className="py-3 px-5 bc-visualisation-container holder"> {/* Keep original class */}
             {/* Header - Keep original */}
             <div className="d-flex p-3 justify-content-between align-items-start mb-4 px-5 border-bottom holder pb-1">
                <h2 className='mb-1 fw-bold text-dark'>
                    Bon de Commande: <span>{bonCommandeData.numero_bc}</span>
                </h2>
                  {onClose && (
                     <Button variant="warning" onClick={onClose} title="Fermer" className="px-5 border-0 rounded-5 shadow-sm ">
                        <b>Revenir a la liste</b>
                     </Button>
                  )}
             </div>

            {/* Keep original layout structure */}
            <Row className='mt-5 '>
                {/* Main Details Col - Keep original */}
                <Col md={5} className='border mx-5 rounded-5 shadow-sm p-5 bg-white'>
                    {renderField("Fournisseur", bonCommandeData.fournisseur_nom, faBuilding)}
                    {renderField("Date Émission", formatDateSimple(bonCommandeData.date_emission), faCalendarAlt)}
                    {renderField("Montant Total TTC", formatDecimal(bonCommandeData.montant_total, 'DH'), faMoneyBillWave)}
                    {renderField("État", bonCommandeData.etat, faInfoCircle, "mb-3 bc-data-point", true)}
                </Col>
                {/* Associations & Payment Col - Keep original structure */}
                <Col md={5} className='border mx-5 rounded-5 shadow-sm p-5 bg-white'>
                    {renderField("Mode Paiement", bonCommandeData.mode_paiement, faTag)}
                    {renderField(
                        "Marché Associé",
                        bonCommandeData.marche_public ? `${bonCommandeData.marche_public.numero_marche || bonCommandeData.marche_public.intitule || `ID: ${bonCommandeData.marche_public.id}`}` : '-',
                        faClipboardCheck
                    )}
                    {renderField(
                        "Contrat Associé",
                        bonCommandeData.contrat ? `${bonCommandeData.contrat.numero_contrat || bonCommandeData.contrat.objet || `ID: ${bonCommandeData.contrat.id}`}` : '-',
                        faFileContract
                    )}
                    {renderField("Créé le", formatDateSimple(bonCommandeData.created_at), faClock)}

                    {/* --- ADDED: Fonctionnaire Display within this Col --- */}
                    {/* Use a similar structure to other fields in this column */}
                    <div className="mb-3"> {/* Match margin of other fields */}
                        <p className="text-dark d-flex justify-content-between titly d-block mb-1">
                           <b> <FontAwesomeIcon icon={faUsers} className="me-2 text-warning" /> {/* Use original icon style */}
                            <span>Poins Focaux</span></b>
                            {/* Value part will be the badges generated by the helper */}
                            <span className="fs-6">{/* Keep fs-6 for consistency */}
                               {getFonctionnaireNames(bonCommandeData.id_fonctionnaire)}
                            </span>
                         </p>
                   </div>
                   {/* --- END ADDED --- */}

                </Col>
                {/* Keep original spacer columns */}
                <Col xs={1}></Col>
                 <Col xs={10}>
                    {/* Keep original Objet display */}
                     {renderField2("Objet du Bon de Commande", bonCommandeData.objet)}
                 </Col>
                 <Col xs={1}></Col>
            </Row>

            {/* --- Fichiers Section (Keep original) --- */}
            {Array.isArray(bonCommandeData.fichiers) && bonCommandeData.fichiers.length > 0 ? (
                <Row className=" pt-3 border-top">
                    <Col xs={12}>
                        <strong className=" d-block  ">
                         <p className="text-uppercase titly text-muted fs-4">Fichiers Associés ({bonCommandeData.fichiers.length})</p>
                       </strong>
                        <ListGroup variant="" className=" d-flex justify-content-evenly flex-wrap flex-row align-items-center p-2 ">
                            {bonCommandeData.fichiers.map(file => (
                                file && file.id ? (
                                    <ListGroup.Item key={file.id} className="border rounded-4 p-2 d-flex align-items-center bg-dark  m-1 text-white">
                                        <FontAwesomeIcon icon={faFileAlt} className='me-2 text-warning'/>
                                        <span className="text-truncate" title={file.nom_fichier || 'Nom inconnu'}>{file.nom_fichier || 'Fichier sans nom'}</span>
                                        {file.chemin_fichier && (<a href={`${STORAGE_URL}/${file.chemin_fichier}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-warning ms-2" title="Voir / Télécharger" > <FontAwesomeIcon icon={faDownload} /> </a> )}
                                    </ListGroup.Item>
                                ) : null
                            ))}
                        </ListGroup>
                    </Col>
                </Row>
            ) : (
               <Row className="mt-3 pt-3 border-top">
                   <Col><p className="text-muted fst-italic small">Aucun fichier associé.</p></Col>
               </Row>
            )}
        </div>
    );
};

// --- PropTypes (Keep original) ---
BonDeCommandeVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string
};

// Set default prop if needed
BonDeCommandeVisualisation.defaultProps = {
   baseApiUrl: BASE_API_URL
};


export default BonDeCommandeVisualisation;