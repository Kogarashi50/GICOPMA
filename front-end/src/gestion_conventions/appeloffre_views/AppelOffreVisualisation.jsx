// src/gestion_conventions/appel_offres_views/AppelOffreVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import PropTypes from 'prop-types';
import axios from 'axios';
// Keep original imports: Spinner, Alert, Badge, Button, Row, Col
import { Spinner, Alert, Badge, Button, Row, Col, Stack } from 'react-bootstrap'; // Added Stack for layout
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// Keep original icons + add faUsers, faUserTie
import {
    faBuilding, faToggleOn, faToggleOff, faInfoCircle,
    faCalendarAlt, faTimes, faTag, faMoneyBillWave, faClock, faMapMarkedAlt,
    faUsers, faUserTie // <-- Added for Fonctionnaires
} from '@fortawesome/free-solid-svg-icons';
// Keep original CSS import
import '../marches_views/marche.css'; // Adjust path if needed

// --- Helpers (Keep original formatting helpers) ---
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) { return dateString; }
        // Use fr-CA for YYYY-MM-DD output, consistent with form input type="date"
        return new Date(datePart + 'T00:00:00Z').toLocaleDateString('fr-CA');
    } catch (e) { console.error("Date format error:", dateString, e); return dateString; }
};

const formatCurrency = (value) => {
    if (value == null || value === '' || isNaN(Number(value))) return '-';
    try {
        return parseFloat(value).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
    } catch (e) { console.error("Currency format error:", value, e); return String(value); }
};

const renderBooleanStatus = (value, trueIcon = faToggleOn, falseIcon = faToggleOff, trueText = "Oui", falseText = "Non", trueVariant = "success", falseVariant = "secondary") => {
    if (value === null || value === undefined) return '-';
    // Use original badge styling from helper
    return value ?
        <Badge bg={trueVariant} text="white"><FontAwesomeIcon icon={trueIcon} className="me-1" /> {trueText}</Badge> :
        <Badge bg={falseVariant} text="white"><FontAwesomeIcon icon={falseIcon} className="me-1" /> {falseText}</Badge>;
};

// Added helper to display data or fallback, used in renderDetail
const displayData = (data, fallback = '-') => data ?? fallback;
// --- End Helpers ---

const AppelOffreVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [appelOffreData, setAppelOffreData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // --- ADDED: State for fonctionnaires list ---
    const [fonctionnairesList, setFonctionnairesList] = useState([]);

    // --- MODIFIED: Fetch Appel d'Offre AND Fonctionnaires ---
    const fetchAppelOffreAndFonctionnaires = useCallback(async () => {
        // Keep original checks
        if (!itemId) { setError("ID de l'Appel d'Offre manquant."); setLoading(false); return; }
        if (!baseApiUrl) { setError("URL de base de l'API manquante."); setLoading(false); return; }

        setLoading(true); setError(null); setAppelOffreData(null); setFonctionnairesList([]);

        const apiPrefix = ''; // Adjust if needed
        const appelOffreUrl = `${baseApiUrl}${apiPrefix}/appel-offres/${itemId}`;
        const fonctionnairesUrl = `${baseApiUrl}${apiPrefix}/fonctionnaires`;

        console.log(`Visualisation AO: Fetching AO from ${appelOffreUrl}`);
        console.log(`Visualisation AO: Fetching Fonctionnaires from ${fonctionnairesUrl}`);

        try {
            const [aoRes, foncRes] = await Promise.allSettled([
                axios.get(appelOffreUrl, { withCredentials: true }),
                axios.get(fonctionnairesUrl, { withCredentials: true })
            ]);

            // Process Appel d'Offre Response (Keep original logic)
            if (aoRes.status === 'fulfilled' && aoRes.value.data) {
                const fetchedData = aoRes.value.data?.appel_offre || aoRes.value.data || null;
                console.log(`Visualisation AO: Fetched AO data`, fetchedData);
                if (fetchedData && fetchedData.id) { // Check for primary key
                    fetchedData.provinces = Array.isArray(fetchedData.provinces) ? fetchedData.provinces : [];
                    setAppelOffreData(fetchedData);
                } else {
                    throw new Error("Format de données invalide reçu pour l'Appel d'Offre.");
                }
            } else {
                 const status = aoRes.reason?.response?.status;
                 const errorDetail = aoRes.reason?.response?.data?.message || aoRes.reason?.message || `Erreur inconnue (Status: ${status || 'N/A'})`;
                 console.error(`Appel d'Offre fetch failed (Status: ${status}):`, errorDetail, aoRes.reason);
                 throw new Error(`Échec chargement Appel d'Offre: ${errorDetail}`);
            }

            // Process Fonctionnaires Response (Keep original logic)
            if (foncRes.status === 'fulfilled' && foncRes.value.data) {
                const foncData = foncRes.value.data.fonctionnaires || foncRes.value.data || [];
                setFonctionnairesList(foncData.map(f => ({
                    value: f.id,
                    label: f.nom_complet || `ID ${f.id}`
                })));
                 console.log("Fetched Fonctionnaires List (count):", foncData.length);
            } else {
                console.warn("Could not fetch fonctionnaires list:", foncRes.reason?.message || foncRes.reason);
            }

        } catch (err) {
            console.error("Error during fetch:", err);
            setError(err.message || "Erreur lors du chargement des détails.");
            setAppelOffreData(null);
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]);

    useEffect(() => {
        fetchAppelOffreAndFonctionnaires();
    }, [fetchAppelOffreAndFonctionnaires]);


    // --- ADDED: Helper function to get fonctionnaire names ---
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) {
            // Return simple fallback consistent with original renderDetail
            return <span className="value fst-italic text-muted">-</span>;
        }
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
             return <span className="value fst-italic text-muted">-</span>;
        }
        return (
            // Use Stack for layout, keep original badge styling intent
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        // Use original badge styling from renderDetail province example
                        <Badge key={id} pill bg="light" text="dark" className="me-1 mb-1 border">
                            <FontAwesomeIcon icon={faUserTie} className="me-1" /> {/* Keep icon */}
                            {fonctionnaire?.label || `ID ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]);


    // --- Render Detail Helper (Keep original structure and logic) ---
    const renderDetail = (label, value, formatter = null, mdSize = 6, lgSize = 4, icon = null) => (
         // Keep original condition, including handling of empty provinces array
         (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) || value === 0 ?
            <Col xs={12} md={mdSize} lg={lgSize} className="mb-3 data-point">
                {/* Keep original label structure and classes */}
                <strong className="text-dark titly d-block label">
                    {icon && <FontAwesomeIcon icon={icon} className="me-2 text-secondary" />}
                    {label}
                </strong>
                {/* Keep original province array rendering logic */}
                {label === "Province(s)" && Array.isArray(value) ? (
                    value.length > 0 ? (
                         value.map((prov, index) => (
                            // Use original province badge styling
                            <Badge key={index} pill bg="light" text="dark" className="me-1 mb-1 border">{prov}</Badge>
                         ))
                    ) : ( <span className="value fst-italic text-muted">-</span> )
                ) : ( // Keep original rendering for other values
                   <span className="value">{formatter ? formatter(value) : displayData(value)}</span>
                 )}
            </Col>
        : null // Keep original behavior of not rendering the Col if value is empty/null
    );

    // --- Render Logic ---
    if (loading) {
       // Keep original loading spinner
       return <div className="text-center p-5"><Spinner animation="border" /><span> Chargement des détails...</span></div>;
    }
    if (error) {
        // Keep original error alert
        return <Alert variant="danger" className="m-3">Erreur: {error}</Alert>;
    }
    // Ensure the !appelOffreData check happens before accessing its properties
    if (!appelOffreData) {
        // Keep original no-data alert
        return <Alert variant="warning" className="m-3">Aucune donnée trouvée for cet appel d'offre (ID: {itemId}).</Alert>;
    }

    // --- Main content render ---
    // Use original root div classes/styles
    return (
        <div className='px-4'> {/* Keep original padding */}
            {/* Header Section - Keep original structure and classes */}
             <div className="d-flex justify-content-between align-items-start mb-4 px-5 pt-5 border-bottom holder pb-1">
                 <div>
                     <h5 className="text-uppercase fw-bold text-secondary mb-1">Détails</h5>
                     <h2 className="mb-1 fw-bold text-dark">Appel d'Offre : {appelOffreData.numero}</h2>
                 </div>
                 {onClose && (
                     <Button variant="warning" onClick={onClose} title="Fermer" className="px-5 border-0 rounded-5 shadow-sm ">
                          <b>Revenir a la liste</b>
                     </Button>
                 )}
             </div>

             {/* Keep original content padding and classes */}
             <div className="px-5 pb-3 holder">
                 {/* Intitule - Keep original structure and classes */}
                 <Row className="mb-4 pb-3 border-bottom data-section">
                     <Col xs={12} className="mb-3 data-point text-center pill bg-light shadow-sm p-3 rounded-pill">
                         <strong className="text-dark titly fs-bold d-block label">Intitulé</strong>
                         <p className="value lead mb-0">{appelOffreData.intitule || '-'}</p>
                     </Col>
                 </Row>

                 {/* Main Details Grid - Keep original structure and classes */}
                 <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Informations Clés</h5>
                 <Row className="mb-4 pb-3 border-bottom data-section">
                     {renderDetail("Catégorie", appelOffreData.categorie, null, 6, 4, faTag)}
                     {/* Pass label exactly as before for province handling in renderDetail */}
                     {renderDetail("Province(s)", appelOffreData.provinces, null, 6, 4, faMapMarkedAlt)}
                     {renderDetail("Estimation TTC", appelOffreData.estimation, formatCurrency, 6, 4, faMoneyBillWave)}
                     {renderDetail("Estimation HT", appelOffreData.estimation_HT, formatCurrency, 6, 4, faMoneyBillWave)}
                     {renderDetail("Montant TVA", appelOffreData.montant_TVA, formatCurrency, 6, 4, faMoneyBillWave)}
                     {renderDetail("Durée Exécution (jours)", appelOffreData.duree_execution, null, 6, 4, faClock)}
                 </Row>

                 {/* Dates - Keep original structure and classes */}
                 <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Dates Importantes</h5>
                 <Row className="mb-4 pb-3 border-bottom data-section">
                     {renderDetail("Date Publication", appelOffreData.date_publication, formatDate, 6, 3, faCalendarAlt)}
                     {renderDetail("Date Vérification", appelOffreData.date_verification, formatDate, 6, 3, faCalendarAlt)}
                     {renderDetail("Date Ouverture Plis", appelOffreData.date_ouverture, formatDate, 6, 3, faCalendarAlt)}
                     {renderDetail("Dernière Session OP", appelOffreData.last_session_op, formatDate, 6, 3, faCalendarAlt)}
                 </Row>

                 {/* --- MODIFIED: Add Fonctionnaire display here --- */}
                 <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Statut Portail & Points Focaux</h5>
                 <Row className="mb-3 data-section">
                      {/* Keep original Portail display */}
                      {renderDetail("Lancé sur Portail Achat Public", appelOffreData.lancement_portail, renderBooleanStatus, 6, 4)}
                      {appelOffreData.lancement_portail && renderDetail("Date Lancement Portail", appelOffreData.date_lancement_portail, formatDate, 6, 4, faCalendarAlt)}

                      {/* ADDED: Display for Fonctionnaires */}
                      {/* Use a similar structure to other details */}
                      <Col xs={12} md={6} lg={8} className="mb-3 data-point"> {/* Adjust width as needed */}
                          <strong className="text-dark titly d-block label">
                              <FontAwesomeIcon icon={faUsers} className="me-2 text-secondary" />
                              Points Focaux
                          </strong>
                          {/* Call helper function */}
                          <div className="value mt-1">{/* Add mt-1 for spacing if needed */}
                             {getFonctionnaireNames(appelOffreData.id_fonctionnaire)}
                          </div>
                      </Col>
                      {/* --- END ADDED SECTION FOR FONCTIONNAIRES --- */}
                 </Row>


                 {/* Keep original message for no provinces */}
                 {(!appelOffreData.provinces || appelOffreData.provinces.length === 0) && (
                    <Alert variant='secondary' className='small py-2 mt-3'>
                        <FontAwesomeIcon icon={faInfoCircle} className="me-2"/> Aucune province n'est associée à cet appel d'offre.
                    </Alert>
                 )}
             </div>
        </div>
    );
};

// --- PropTypes (Keep original) ---
AppelOffreVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func, // Optional close function
    baseApiUrl: PropTypes.string.isRequired,
};

export default AppelOffreVisualisation;