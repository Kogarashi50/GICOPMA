// src/gestion_conventions/appel_offres_views/AppelOffreVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
// --- MERGED IMPORTS ---
import { Spinner, Alert, Badge, Button, Row, Col, Stack, Card, Popover, OverlayTrigger } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// --- MERGED ICONS ---
import {
    faBuilding, faToggleOn, faToggleOff, faInfoCircle,
    faCalendarAlt, faTimes, faTag, faMoneyBillWave, faClock, faMapMarkedAlt,
    faUsers, faUserTie, faPaperclip, faFilePdf, faFileWord, faFileExcel,
    faFileImage, faFileAlt, faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';

import '../marches_views/marche.css'; // Adjust path if needed

// --- Helpers ---
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
    return value ?
        <Badge bg={trueVariant} text="white"><FontAwesomeIcon icon={trueIcon} className="me-1" /> {trueText}</Badge> :
        <Badge bg={falseVariant} text="white"><FontAwesomeIcon icon={falseIcon} className="me-1" /> {falseText}</Badge>;
};

const displayData = (data, fallback = '-') => data ?? fallback;

const getFileIcon = (filenameOrMimeType) => {
    if (!filenameOrMimeType) return faFileAlt;
    const lowerCase = String(filenameOrMimeType).toLowerCase();
    if (lowerCase.includes('pdf')) return faFilePdf;
    if (lowerCase.includes('doc')) return faFileWord;
    if (lowerCase.includes('xls')) return faFileExcel;
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage;
    return faFileAlt;
};
// --- End Helpers ---

const AppelOffreVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [appelOffreData, setAppelOffreData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]);

    // --- Data Fetching ---
    const fetchAppelOffreAndFonctionnaires = useCallback(async () => {
        if (!itemId) { setError("ID de l'Appel d'Offre manquant."); setLoading(false); return; }
        if (!baseApiUrl) { setError("URL de base de l'API manquante."); setLoading(false); return; }

        setLoading(true); setError(null); setAppelOffreData(null); setFonctionnairesList([]);

        const apiPrefix = ''; // Adjust if needed
        const appelOffreUrl = `${baseApiUrl}${apiPrefix}/appel-offres/${itemId}`;
        const fonctionnairesUrl = `${baseApiUrl}/options/fonctionnaires`;

        console.log(`Visualisation AO: Fetching AO from ${appelOffreUrl}`);
        console.log(`Visualisation AO: Fetching Fonctionnaires from ${fonctionnairesUrl}`);

        try {
            const [aoRes, foncRes] = await Promise.allSettled([
                axios.get(appelOffreUrl, { withCredentials: true }),
                axios.get(fonctionnairesUrl, { withCredentials: true })
            ]);

            // Process Appel d'Offre Response
            if (aoRes.status === 'fulfilled' && aoRes.value.data) {
                const fetchedData = aoRes.value.data?.appel_offre || aoRes.value.data || null;
                console.log(`Visualisation AO: Fetched AO data`, fetchedData);
                if (fetchedData && fetchedData.id) {
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


    // --- Helper function to get fonctionnaire names ---
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) {
            return <span className="value fst-italic text-muted">-</span>;
        }
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
             return <span className="value fst-italic text-muted">-</span>;
        }
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        <Badge key={id} pill bg="light" text="dark" className="me-1 mb-1 border">
                            <FontAwesomeIcon icon={faUserTie} className="me-1" />
                            {fonctionnaire?.label || `ID ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]);


    // --- Render Detail Helper ---
    const renderDetail = (label, value, formatter = null, mdSize = 6, lgSize = 4, icon = null) => (
         (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) || value === 0 ?
            <Col xs={12} md={mdSize} lg={lgSize} className="mb-3 data-point">
                <strong className="text-dark titly d-block label">
                    {icon && <FontAwesomeIcon icon={icon} className="me-2 text-secondary" />}
                    {label}
                </strong>
                {label === "Province(s)" && Array.isArray(value) ? (
                    value.length > 0 ? (
                         value.map((prov, index) => (
                            <Badge key={index} pill bg="light" text="dark" className="me-1 mb-1 border">{prov}</Badge>
                         ))
                    ) : ( <span className="value fst-italic text-muted">-</span> )
                ) : (
                   <span className="value">{formatter ? formatter(value) : displayData(value)}</span>
                 )}
            </Col>
        : null
    );

    // --- Render Logic ---
    if (loading) {
       return <div className="text-center p-5"><Spinner animation="border" /><span> Chargement des détails...</span></div>;
    }
    if (error) {
        return <Alert variant="danger" className="m-3">Erreur: {error}</Alert>;
    }
    if (!appelOffreData) {
        return <Alert variant="warning" className="m-3">Aucune donnée trouvée pour cet appel d'offre (ID: {itemId}).</Alert>;
    }

    // --- Reusable popover function for file details ---
    const filePopover = (file) => (
        <Popover id={`popover-file-${file.id}`} style={{maxWidth: '350px'}}>
            <Popover.Header as="h3" className='small fw-bold'>{displayData(file.intitule, "Détails du Fichier")}</Popover.Header>
            <Popover.Body>
                <p className='small mb-1'><strong>Fichier Original:</strong> <span className='text-muted'>{displayData(file.nom_fichier)}</span></p>
                <p className='small mb-0'><strong>Catégorie:</strong> <Badge bg="secondary" pill>{displayData(file.categorie, 'N/A')}</Badge></p>
            </Popover.Body>
        </Popover>
    );

    // --- Main content render ---
    return (
        <div className='px-4'>
            {/* Header Section */}
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

             <div className="px-5 pb-3 holder">
                 {/* Intitule */}
                 <Row className="mb-4 pb-3 border-bottom data-section">
                     <Col xs={12} className="mb-3 data-point text-center pill bg-light shadow-sm p-3 rounded-pill">
                         <strong className="text-dark titly fs-bold d-block label">Intitulé</strong>
                         <p className="value lead mb-0">{appelOffreData.intitule || '-'}</p>
                     </Col>
                 </Row>

                 {/* Main Details Grid */}
                 <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Informations Clés</h5>
                 <Row className="mb-4 pb-3 border-bottom data-section">
                     {renderDetail("Catégorie", appelOffreData.categorie, null, 6, 4, faTag)}
                     {renderDetail("Province(s)", appelOffreData.provinces, null, 6, 4, faMapMarkedAlt)}
                     {renderDetail("Estimation TTC", appelOffreData.estimation, formatCurrency, 6, 4, faMoneyBillWave)}
                     {renderDetail("Estimation HT", appelOffreData.estimation_HT, formatCurrency, 6, 4, faMoneyBillWave)}
                     {renderDetail("Montant TVA", appelOffreData.montant_TVA, formatCurrency, 6, 4, faMoneyBillWave)}
                     {renderDetail("Durée Exécution (jours)", appelOffreData.duree_execution, null, 6, 4, faClock)}
                 </Row>

                 {/* Dates */}
                 <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Dates Importantes</h5>
                 <Row className="mb-4 pb-3 border-bottom data-section">
                     {renderDetail("Date Publication", appelOffreData.date_publication, formatDate, 6, 3, faCalendarAlt)}
                     {renderDetail("Date Vérification", appelOffreData.date_verification, formatDate, 6, 3, faCalendarAlt)}
                     {renderDetail("Date Ouverture Plis", appelOffreData.date_ouverture, formatDate, 6, 3, faCalendarAlt)}
                     {renderDetail("Dernière Session OP", appelOffreData.last_session_op, formatDate, 6, 3, faCalendarAlt)}
                 </Row>

                 {/* Statut & Points Focaux */}
                 <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Statut Portail & Points Focaux</h5>
                 <Row className="mb-3 pb-3 border-bottom data-section">
                      {renderDetail("Lancé sur Portail Achat Public", appelOffreData.lancement_portail, renderBooleanStatus, 6, 4)}
                      {appelOffreData.lancement_portail && renderDetail("Date Lancement Portail", appelOffreData.date_lancement_portail, formatDate, 6, 4, faCalendarAlt)}

                      <Col xs={12} md={6} lg={8} className="mb-3 data-point">
                          <strong className="text-dark titly d-block label">
                              <FontAwesomeIcon icon={faUsers} className="me-2 text-secondary" />
                              Points Focaux
                          </strong>
                          <div className="value mt-1">
                             {getFonctionnaireNames(appelOffreData.id_fonctionnaire)}
                          </div>
                      </Col>
                 </Row>

                 {/* --- NEW SECTION: Attached Files --- */}
                 <h5 className="mb-3 mt-4 section-title text-uppercase fw-bold text-secondary">
                     <FontAwesomeIcon icon={faPaperclip} className="me-2" />
                     Pièces Jointes
                 </h5>
                 {appelOffreData.fichiers && appelOffreData.fichiers.length > 0 ? (
                     <Card>
                         <Card.Body>
                             <div className="d-flex flex-wrap" style={{gap: '0.75rem'}}>
                                 {appelOffreData.fichiers.map(file => (
                                     <OverlayTrigger trigger={['hover', 'focus']} placement="top" overlay={filePopover(file)} key={file.id}>
                                         <div className="border rounded p-2 d-flex align-items-center bg-dark text-white shadow-sm" style={{minWidth: '220px'}}>
                                             <FontAwesomeIcon icon={getFileIcon(file.nom_fichier || file.type_fichier)} className="me-2 fa-lg text-warning"/>
                                             <span className="me-auto small text-truncate" title={file.intitule}>
                                                 {displayData(file.intitule, 'Fichier')}
                                             </span>
                                             {file.url ? (
                                                 <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-warning py-0 px-1 ms-2" title="Ouvrir">
                                                     <FontAwesomeIcon icon={faExternalLinkAlt} size="xs"/>
                                                 </a>
                                             ) : (
                                                 <span className="text-muted fst-italic small ms-2">(Lien invalide)</span>
                                             )}
                                         </div>
                                     </OverlayTrigger>
                                 ))}
                             </div>
                         </Card.Body>
                     </Card>
                 ) : (
                     <Alert variant='secondary' className='small py-2'>
                         <FontAwesomeIcon icon={faInfoCircle} className="me-2"/> Aucune pièce jointe pour cet appel d'offre.
                     </Alert>
                 )}
                 {/* --- END OF NEW SECTION --- */}

                 {(!appelOffreData.provinces || appelOffreData.provinces.length === 0) && (
                    <Alert variant='secondary' className='small py-2 mt-3'>
                        <FontAwesomeIcon icon={faInfoCircle} className="me-2"/> Aucune province n'est associée à cet appel d'offre.
                    </Alert>
                 )}
             </div>
        </div>
    );
};

// --- PropTypes ---
AppelOffreVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func, // Optional close function
    baseApiUrl: PropTypes.string.isRequired,
};

export default AppelOffreVisualisation;