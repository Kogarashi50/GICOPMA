// src/pages/projets_views/ProjetVisualisation.jsx (Original Style + Fonctionnaire Display)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    // Icons from original + faUserTie
    faSpinner, faExclamationTriangle, faTimes, faCheckCircle, faTimesCircle, faUsers,
    faEuroSign, faCalendarAlt, faInfoCircle, faHandHoldingUsd,
    faBalanceScaleLeft, faFileInvoiceDollar,
    faUserTie, // <-- Needed for Fonctionnaire
    faBuilding // <-- Needed for Partner Card Title
} from '@fortawesome/free-solid-svg-icons';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import PropTypes from 'prop-types';
import Spinner from 'react-bootstrap/Spinner';
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import ProgressBar from 'react-bootstrap/ProgressBar';
import Stack from 'react-bootstrap/Stack'; // <-- Added for Fonctionnaire badges

// --- Helpers ---
const formatPercentage = (value) => { const n = parseFloat(value); return isNaN(n)?'-':`${n.toFixed(2)} %`; };
const formatCurrency = (value) => { const n = parseFloat(value); return isNaN(n)?'-':n.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const displayData = (data, fallback = '-') => data ?? fallback;
const formatDate = (dateString) => { if (!dateString) return '-'; try { return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return dateString; } };
const formatDateSimple = (dateString) => { if (!dateString) return '-'; try { if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) { return new Date(dateString+'T00:00:00Z').toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' }); } const d=new Date(dateString); return isNaN(d.getTime())?dateString:d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' }); } catch (e) { return dateString; } };
const formatBoolean = (value) => value ?<> <FontAwesomeIcon icon={faCheckCircle} className="text-success" title="Oui"/><span className='small text-muted ms-1'>(Formalisé) </span></>: <><FontAwesomeIcon icon={faTimesCircle} className="text-secondary" title="Non"/><span className='small text-muted ms-1'>(non Formalisé)</span> </>;
// --- End Helpers ---

// --- Styles/Classes (Using definitions from the 'original' provided code) ---
const VISUALISATION_CONTAINER_CLASS = "p-3 p-md-4 convention-visualisation-container"; // Note: Renamed in code below for clarity
const VISUALISATION_CLOSE_BUTTON_CLASS = 'float-end py-2 rounded-5 shadow fw-bold px-5';
const CARD_CLASS = "h-100 border-light shadow-sm";
const CARD_TITLE_CLASS = "mb-3 fw-semibold text-secondary text-uppercase small";
const DL_CLASS = "row mb-0 dl-compact";
const DT_CLASS = "col-sm-5 fw-bold text-dark";
const DD_CLASS = "col-sm-7";
const PARTNER_CARD_CLASS = "mb-3 border-light shadow-sm";
// --- End Styles/Classes ---


const ProjetVisualisation = ({ itemId, onClose, baseApiUrl = 'http://localhost:8000/api' }) => { // Default added
    // --- State ---
    const [projetData, setProjetData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]); // <-- ADDED: State for fonctionnaire lookup

    // --- Data Fetching Logic (Includes Fonctionnaires List) ---
    const fetchProjetAndFonctionnaires = useCallback(async () => {
        if (!itemId) { setError("ID Projet manquant."); setLoading(false); return; }
        if (!baseApiUrl) { setError("URL d'API (baseApiUrl) manquante."); setLoading(false); return; }

        setLoading(true); setError(null); setProjetData(null); setFonctionnairesList([]);
        console.log(`[FETCH START] Fetching project ${itemId}...`);

        try {
            console.log("[FETCH] Making API calls...");
            const [projetRes, foncRes] = await Promise.allSettled([
                axios.get(`${baseApiUrl}/projets/${itemId}`, {
                     params: { include: 'domaine,programme,chantier,convention,engagementsFinanciers.partenaire,engagementsFinanciers.versements' },
                     withCredentials: true
                }),
                axios.get(`${baseApiUrl}/fonctionnaires`, { withCredentials: true })
            ]);
            console.log("[FETCH] API calls settled:", { projetRes, foncRes });

            // Process Projet Response
            if (projetRes.status === 'fulfilled' && projetRes.value.data) {
                console.log("[FETCH] Processing successful project response...");
                const data = projetRes.value.data.projet || projetRes.value.data;
                console.log("[FETCH] Raw project data from response:", data);
                if (data && typeof data === 'object' && data.ID_Projet) {
                    data.engagements_financiers = Array.isArray(data.engagements_financiers) ? data.engagements_financiers : [];
                    data.engagements_financiers.forEach(eng => { eng.versements = Array.isArray(eng.versements) ? eng.versements : []; });
                    setProjetData(data);
                    console.log("[FETCH] Projet data state SET.");
                } else {
                    console.error("[FETCH] Project data invalid format or missing ID.", data);
                    throw new Error(`Format de données invalide reçu pour Projet ID ${itemId}.`);
                }
            } else {
                 const errorDetail = projetRes.reason?.response?.data?.message || projetRes.reason?.message || 'Erreur inconnue';
                 console.error("[FETCH] Project fetch failed:", errorDetail, projetRes.reason);
                 throw new Error(`Échec chargement projet: ${errorDetail}`);
            }

            // Process Fonctionnaires Response
            if (foncRes.status === 'fulfilled' && foncRes.value.data) {
                 console.log("[FETCH] Processing successful fonctionnaires response...");
                 const foncData = foncRes.value.data.fonctionnaires || foncRes.value.data || [];
                 setFonctionnairesList(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID: ${f.id}` })));
                 console.log("[FETCH] Fonctionnaires list state SET.");
            } else {
                console.warn("[FETCH] Could not fetch fonctionnaires list:", foncRes.reason?.message || foncRes.reason);
            }
            console.log("[FETCH] Try block finished successfully.");

        } catch (err) {
            console.error("[FETCH] Error caught in CATCH block:", err);
            setError(err.message || 'Erreur de chargement.');
        }
        finally {
            console.log("[FETCH] Entering FINALLY block.");
            setLoading(false);
            console.log("[FETCH END] setLoading(false) executed.");
        }
    // *** REMOVED fonctionnairesList.length from dependencies ***
    }, [itemId, baseApiUrl]); // Only depend on props that trigger a *new* fetch

    useEffect(() => {
        console.log("[EFFECT] Running fetch effect.");
        fetchProjetAndFonctionnaires();
        // Optional cleanup if needed
        // return () => { console.log("[EFFECT] Cleanup."); }
    }, [fetchProjetAndFonctionnaires]); // Added fonctionnairesList.length to dependencies - maybe trigger re-fetch if empty? Reconsider this dependency.


    useEffect(() => { fetchProjetAndFonctionnaires(); }, [fetchProjetAndFonctionnaires]);

    // --- Helper Function for Rendering Fonctionnaire Names --- <-- ADDED
    // Uses the `fonctionnairesList` state (mapped to {value, label})
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) {
            return displayData(null); // Use standard fallback '-'
        }
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
            return displayData(null);
        }
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        <Badge key={id} pill bg="info" text="dark" className="border me-1 mb-1 fw-normal">
                            <FontAwesomeIcon icon={faUserTie} className="me-1" /> {/* Optional icon */}
                            {fonctionnaire?.label || `ID ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]); // Dependency on the fetched list


    // --- Calculate Financial Summary using useMemo ---
    const financialSummary = useMemo(() => {
        if (!projetData || !Array.isArray(projetData.engagements_financiers)) {
            return { partnerSummary: {}, totalPaid: 0, totalEngagedProject: 0 };
        }
        const summary = { partnerSummary: {}, totalPaid: 0, totalEngagedProject: 0 };
        projetData.engagements_financiers.forEach(eng => {
             const partnerId = eng.partenaire?.Id ?? eng.partenaire_id;
             const partnerName = eng.partenaire?.Description ?? `Partenaire ID: ${partnerId}`;
             if (!partnerId) { console.warn("Skipping engagement with missing partner ID:", eng); return; }
             if (!summary.partnerSummary[partnerId]) { summary.partnerSummary[partnerId] = { name: partnerName, totalEngaged: 0, totalVersed: 0 }; }
             const engagedAmount = parseFloat(eng.montant_engage || 0);
             const currentEngagementVersed = Array.isArray(eng.versements) ? eng.versements.reduce((sum, v) => sum + parseFloat(v.montant_verse || 0), 0) : 0;
             summary.partnerSummary[partnerId].totalEngaged += engagedAmount;
             summary.partnerSummary[partnerId].totalVersed += currentEngagementVersed;
             summary.totalPaid += currentEngagementVersed;
             summary.totalEngagedProject += engagedAmount;
         });
        return summary;
    }, [projetData]);


    // --- Render Logic ---
    if (loading) { return ( <div className="text-center p-5 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}><Spinner animation="border" variant="primary" className="me-3"/><span className="text-muted">Chargement du projet...</span></div> ); }
    if (error) { return ( <Alert variant="danger" className="m-3 m-md-4"><Alert.Heading><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> Erreur</Alert.Heading><p>{error}</p><hr/><Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button></Alert> ); }
    if (!projetData) { return ( <Alert variant="warning" className="m-3 m-md-4">Aucune donnée disponible pour ce projet (ID: {itemId}).<Button variant="link" size="sm" onClick={onClose} className="float-end">Fermer</Button></Alert> ); }

    // Destructure calculations after data check
    const { partnerSummary, totalPaid, totalEngagedProject } = financialSummary;
    const projectCost = parseFloat(projetData.Cout_Projet || 0);
    const remainingAmount = projectCost - totalPaid;
    const paymentProgress = projectCost > 0 ? Math.min(100,(totalPaid / projectCost) * 100) : (totalPaid > 0 ? 100:0);

    // --- Main Content Render ---
    return (
        // Use the specific container class from the original
        <div className={VISUALISATION_CONTAINER_CLASS} style={{ backgroundColor: '#f8f9fa', borderRadius: '15px', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
            {/* Header (Using original close button class) */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">Détails du Projet</h5>
                    <h2 className="mb-0 fw-bold">{displayData(projetData.Nom_Projet)} <small className="text-muted">({displayData(projetData.Code_Projet)})</small></h2>
                </div>
                <Button variant="warning" size="sm" onClick={onClose} className={VISUALISATION_CLOSE_BUTTON_CLASS} aria-label="Fermer">Revenir à la liste</Button>
            </div>

            {/* Main Content Grid */}
            <Row className="g-3">

                {/* Card 1: Basic Info */}
                <Col md={6} lg={4}>
                    <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Informations Projet</Card.Title>
                            <dl className={DL_CLASS}>
                                <dt className={DT_CLASS}>Code Projet:</dt><dd className={DD_CLASS}>{displayData(projetData.Code_Projet)}</dd>
                                <dt className={DT_CLASS}>Nom Projet:</dt><dd className={DD_CLASS}>{displayData(projetData.Nom_Projet)}</dd>
                                <dt className={DT_CLASS}>Convention:</dt><dd className={DD_CLASS} title={projetData.convention?.Intitule}>{displayData(projetData.Convention_Code)} {projetData.convention?.Intitule ? `- ${String(projetData.convention.Intitule).substring(0, 30)}...` : ''}</dd>
                            </dl>
                        </Card.Body>
                    </Card>
                </Col>

                 {/* Card 2: Associations & Fonctionnaire (Added Fonctionnaire) */}
                <Col md={6} lg={4}>
                     <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Associations</Card.Title>
                             <dl className={DL_CLASS}>
                                <dt className={DT_CLASS}>Domaine:</dt><dd className={DD_CLASS} title={projetData.domaine?.Description}>{displayData(projetData.domaine?.Description, `(Ref: ${projetData.Id_Domaine})`)}</dd>
                                <dt className={DT_CLASS}>Programme:</dt><dd className={DD_CLASS} title={projetData.programme?.Description}>{displayData(projetData.programme?.Description, `(Ref: ${projetData.Id_Programme})`)}</dd>
                                <dt className={DT_CLASS}>Chantier:</dt><dd className={DD_CLASS} title={projetData.chantier?.Description}>{displayData(projetData.chantier?.Description, `(Ref: ${projetData.Id_Chantier})`)}</dd>
                                {/* --- End Fonctionnaire --- */}
                             </dl>
                        </Card.Body>
                    </Card>
                </Col>

                 {/* Card 3: Dates & Avancement */}
                 <Col md={6} lg={4}>
                     <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Dates & Avancement</Card.Title>
                             <dl className={DL_CLASS}>
                                 <dt className={DT_CLASS}>Date Début:</dt><dd className={DD_CLASS}>{formatDateSimple(projetData.Date_Debut)}</dd>
                                 <dt className={DT_CLASS}>Date Fin:</dt><dd className={DD_CLASS}>{formatDateSimple(projetData.Date_Fin)}</dd>
                                 <dt className={DT_CLASS}>Av. Physique:</dt><dd className={DD_CLASS}>{formatPercentage(projetData.Etat_Avan_Physi)}</dd>
                                 <dt className={DT_CLASS}>Av. Financier:</dt><dd className={DD_CLASS}>{formatPercentage(projetData.Etat_Avan_Finan)}</dd>
                             </dl>
                        </Card.Body>
                    </Card>
                 </Col>

                {/* Card 4: Finance Summary */}
                <Col md={6} lg={6}>
                     <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Synthèse Financière</Card.Title>
                            <dl className={DL_CLASS}>
                                <dt className={DT_CLASS}>Coût Projet Total:</dt><dd className={`${DD_CLASS} fw-bold`}>{formatCurrency(projectCost)}</dd>
                                <dt className={DT_CLASS}>Total Versé <small>(par Part.)</small>:</dt><dd className={`${DD_CLASS} fw-bold text-success`}>{formatCurrency(totalPaid)}</dd>
                                <dt className={DT_CLASS}>Reste à Financer:</dt><dd className={`${DD_CLASS} fw-bold ${remainingAmount > 0 ? 'text-danger' : 'text-info'}`}>{formatCurrency(remainingAmount)}</dd>
                                <dt className={DT_CLASS}>Coût Part CRO:</dt><dd className={DD_CLASS}>{formatCurrency(projetData.Cout_CRO)}</dd>
                                <dt className={DT_CLASS}>Engagé <small>(par Part.)</small>:</dt><dd className={DD_CLASS}>{formatCurrency(totalEngagedProject)}</dd>
                            </dl>
                            <hr className="my-2"/>
                            <div className="mt-2"><small className="text-muted">Progression Paiements vs Coût Total</small><ProgressBar now={paymentProgress} label={`${paymentProgress.toFixed(1)}%`} variant="success" striped animated className="mt-1" style={{height: '10px'}} title={`Payé: ${formatCurrency(totalPaid)} / ${formatCurrency(projectCost)}`}/></div>
                        </Card.Body>
                    </Card>
                </Col>

                 {/* Card 5: Observations & Audit Dates */}
                 <Col md={6} lg={6}>
                     <Card className={CARD_CLASS}>
                        <Card.Body className="d-flex flex-column">
                             <Card.Title as="h6" className={CARD_TITLE_CLASS}>Observations & Audit & Points Focaux</Card.Title>
                             <dt className={DT_CLASS}>Point Focal:</dt>
                            <dd className={DD_CLASS}>{getFonctionnaireNames(projetData.id_fonctionnaire)}</dd>
                             <dl className={`${DL_CLASS} mt-auto`}>
                                <dt className={DT_CLASS}>Créé le:</dt><dd className={DD_CLASS}>{formatDate(projetData.created_at)}</dd>
                                <dt className={DT_CLASS}>Modifié le:</dt><dd className={DD_CLASS}>{formatDate(projetData.updated_at)}</dd>
                             </dl>
                             <div className="mb-3 flex-grow-1" style={{maxHeight: 'auto', overflowY: 'auto'}}>
                                 <p className="small mb-0">{displayData(projetData.Observations)}</p>
                             </div>
                        </Card.Body>
                    </Card>
                 </Col>

                 {/* Card 6: Partner Contributions (Using original Card style) */}
                 <Col md={12}> {/* Make full width */}
                     <Card className="border-light shadow-sm"> {/* Remove h-100 if content varies */}
                        <Card.Body>
                             <Card.Title as="h6" className={CARD_TITLE_CLASS}>
                                <FontAwesomeIcon icon={faUsers} className="me-2"/> Contributions des Partenaires
                             </Card.Title>
                             {Object.keys(partnerSummary).length > 0 ? (
                                 <Row className="g-3">
                                     {Object.entries(partnerSummary).map(([partnerId, summary]) => {
                                         const partnerRemaining = summary.totalEngaged - summary.totalVersed;
                                         const paymentRatio = summary.totalEngaged > 0 ? (summary.totalVersed / summary.totalEngaged) * 100 : 0;
                                         return (
                                            <Col key={partnerId}>
                                                <Card className={PARTNER_CARD_CLASS}>
                                                    <Card.Header className="bg-light py-2 px-3">
                                                        <h6 className="mb-0 text-dark fw-semibold text-truncate" title={summary.name}>
                                                          <FontAwesomeIcon icon={faUsers} className="me-2 text-primary"/>
                                                          {summary.name}
                                                        </h6>
                                                    </Card.Header>
                                                    <ListGroup variant="flush">
                                                        <ListGroup.Item className="d-flex justify-content-between align-items-center px-3 py-2">
                                                            <span><FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2 text-info" title="Engagé"/> Engagé:</span>
                                                            <Badge bg="info" pill>{formatCurrency(summary.totalEngaged)}</Badge>
                                                        </ListGroup.Item>
                                                        <ListGroup.Item className="d-flex justify-content-between align-items-center px-3 py-2">
                                                            <span><FontAwesomeIcon icon={faHandHoldingUsd} className="me-2 text-success" title="Versé"/> Versé:</span>
                                                            <Badge bg="success" pill>{formatCurrency(summary.totalVersed)}</Badge>
                                                        </ListGroup.Item>
                                                         <ListGroup.Item className="d-flex justify-content-between align-items-center px-3 py-2">
                                                           {partnerRemaining!=0?<><span><FontAwesomeIcon icon={faBalanceScaleLeft} className="me-2 text-warning" title="Restant"/> Restant:</span>
                                                            <Badge bg={partnerRemaining > 0 ? "warning" : "light"} text={partnerRemaining > 0 ? "dark" : "danger"} pill>
                                                                {formatCurrency(partnerRemaining)}
                                                            </Badge></>:<><div></div><Badge bg='success'  text='light' pill>
                                                                Soldé
                                                            </Badge></>
                                                            } 
                                                        </ListGroup.Item>
                                                         <ListGroup.Item className="px-3 py-2">
                                                            <ProgressBar
                                                                now={paymentRatio}
                                                                variant="success"
                                                                style={{ height: '6px' }}
                                                                title={`Payé: ${paymentRatio.toFixed(1)}% de l'engagement`}
                                                             />
                                                         </ListGroup.Item>
                                                        {/* Optional: Add a button/link here to show detailed engagements/versements later */}
                                                    </ListGroup>
                                                </Card>
                                            </Col>
                                        );
                                    })}
                                 </Row>
                             ) : (
                                 <Alert variant="secondary" className="text-center">
                                     Aucun engagement financier (ou partenaire associé) trouvé pour ce projet.
                                 </Alert>
                             )}
                        </Card.Body>
                    </Card>
                 </Col>
                 {/* === End Partner Contributions Card === */}

            </Row>
        </div>
    );
};

// --- Proptypes ---
ProjetVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

// Default Props removed as baseApiUrl is required

export default ProjetVisualisation;