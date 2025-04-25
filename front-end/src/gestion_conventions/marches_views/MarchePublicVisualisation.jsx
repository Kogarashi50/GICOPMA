// src/gestion_conventions/marches_views/MarchePublicVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Spinner, Alert, Table, Badge, Stack, Button, Row, Col, Card } from 'react-bootstrap'; // Keep Card for Points Focaux
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt,
    faExternalLinkAlt, faTimes, faInfoCircle, faLink,
    faUserTie // Keep User Tie icon
} from '@fortawesome/free-solid-svg-icons';

import './marche.css'; // Ensure this CSS file exists and has necessary styles

// --- Helpers (Keep formatting functions, status badge, file icon) ---
const displayData = (data, fallback = '-') => data ?? fallback;
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
             const parsedDate = new Date(dateString);
             if (isNaN(parsedDate)) throw new Error("Invalid date format");
             return parsedDate.toLocaleDateString('fr-CA');
        }
        return new Date(datePart + 'T00:00:00').toLocaleDateString('fr-CA');
     }
    catch (e) { console.error("Date format error:", dateString, e); return dateString; }
};
const formatCurrency = (value) => {
    if (value == null || value === '' || isNaN(Number(value))) return '-';
    try {
        return parseFloat(value).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
    } catch (e) {
         console.error("Currency format error:", value, e);
         return String(value);
    }
};
const formatPercentage = (value) => {
    const n = parseFloat(value);
    return isNaN(n) ? '-' : `${n.toFixed(2)} %`;
};
const STATUT_OPTIONS = [
    { value: 'En préparation', label: 'En préparation', color: 'secondary' },
    { value: 'En cours', label: 'En cours', color: 'primary' },
    { value: 'Terminé', label: 'Terminé', color: 'success' },
    { value: 'Résilié', label: 'Résilié', color: 'danger' }
];
const getStatusBadge = (statusValue) => {
    const option = STATUT_OPTIONS.find(opt => opt.value === statusValue);
    const color = option ? option.color : "light";
    const textColor = ['warning', 'light', 'secondary'].includes(color) ? 'dark' : 'white';
    return <Badge bg={color} text={textColor} className="shadow-sm">{displayData(statusValue)}</Badge>;
};
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

// --- Constants ---
// Constants for Card styling specifically for Points Focaux if needed
const CARD_CLASS = "border-light shadow-sm mb-3"; // Standard card class for the Points Focaux
const CARD_TITLE_CLASS = "mb-3 section-title text-uppercase fw-bold text-secondary"; // Use existing title style
// --- End Constants ---


const MarchePublicVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    // --- State Variables (Keep all from previous working version) ---
    const [marcheData, setMarcheData] = useState(null);
    const [lotsData, setLotsData] = useState([]);
    const [filesData, setFilesData] = useState([]);
    const [conventionName, setConventionName] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]);
    const [loadingMarche, setLoadingMarche] = useState(true);
    const [loadingRelated, setLoadingRelated] = useState(true);
    const [error, setError] = useState(null);

    // --- Public Base URL Calculation (Keep from previous working version) ---
    const publicBaseUrl = React.useMemo(() => {
        try {
            const url = new URL(baseApiUrl);
            url.pathname = url.pathname.replace(/\/api(\/)?$/, '');
            return url.origin + url.pathname.replace(/\/$/, '');
        } catch (e) {
            console.error("Could not parse baseApiUrl to determine public base URL", baseApiUrl, e);
            return baseApiUrl.replace(/\/api(\/)?$/, '').replace(/\/$/, '');
        }
    }, [baseApiUrl]);

    // --- Fetch Logic (Keep from previous working version) ---
    useEffect(() => {
        let isMounted = true;
        if (!itemId) {
            setLoadingMarche(false); setLoadingRelated(false);
            setError("ID du Marché manquant.");
            return;
        }

        const fetchDetails = async () => {
            setLoadingMarche(true); setLoadingRelated(true);
            setError(null);
            setMarcheData(null); setLotsData([]); setFilesData([]); setConventionName(null); setFonctionnairesList([]);
            console.log(`Visualisation: Fetching main details for Marche ID: ${itemId}`);
            const apiPrefix = '';

            try {
                const marcheUrl = `${baseApiUrl}${apiPrefix}/marches-publics/${itemId}`;
                const marcheRes = await axios.get(marcheUrl, { withCredentials: true });
                if (!isMounted) return;
                const fetchedMarcheData = marcheRes.data?.marche_public || marcheRes.data || null;
                if (!fetchedMarcheData || !fetchedMarcheData.id) {
                    throw new Error("Données principales du marché non trouvées ou invalides.");
                }
                setMarcheData(fetchedMarcheData);
                setLoadingMarche(false);
                console.log(`Visualisation: Fetched Marche data, ID Convention: ${fetchedMarcheData.id_convention}`);

                const lotsUrl = `${baseApiUrl}${apiPrefix}/marches-publics/${itemId}/lots`;
                const filesUrl = `${baseApiUrl}${apiPrefix}/marches-publics/${itemId}/fichiers`;
                const fonctionnairesUrl = `${baseApiUrl}${apiPrefix}/fonctionnaires`;
                const relatedPromises = [
                    axios.get(lotsUrl, { withCredentials: true }),
                    axios.get(filesUrl, { withCredentials: true }),
                    axios.get(fonctionnairesUrl, { withCredentials: true })
                ];
                let conventionPromise = Promise.resolve({ status: 'fulfilled', value: null });
                if (fetchedMarcheData.id_convention) {
                    const conventionUrl = `${baseApiUrl}${apiPrefix}/conventions/${fetchedMarcheData.id_convention}`;
                    conventionPromise = axios.get(conventionUrl, { withCredentials: true });
                 }
                relatedPromises.push(conventionPromise);

                const results = await Promise.allSettled(relatedPromises);
                const [lotsRes, filesRes, foncRes, conventionResSettled] = results;
                if (!isMounted) return;

                // Process Lots
                if (lotsRes.status === 'fulfilled' && lotsRes.value?.data) {
                    setLotsData(lotsRes.value.data?.lots || lotsRes.value.data || []);
                } else { console.warn("Could not fetch lots:", lotsRes.reason?.message); setLotsData([]); }
                // Process Files
                if (filesRes.status === 'fulfilled' && filesRes.value?.data) {
                    setFilesData(filesRes.value.data?.fichiers_joints || filesRes.value.data || []);
                } else { console.warn("Could not fetch files:", filesRes.reason?.message); setFilesData([]); }
                // Process Fonctionnaires
                if (foncRes.status === 'fulfilled' && foncRes.value?.data) {
                    const foncData = foncRes.value.data.fonctionnaires || foncRes.value.data || [];
                    setFonctionnairesList(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` })));
                    console.log("Visualisation: Fetched Fonctionnaires List (length):", (foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` }))).length);
                } else { console.warn("Could not fetch fonctionnaires list:", foncRes.reason?.message); setFonctionnairesList([]); }
                // Process Convention
                if (conventionResSettled.status === 'fulfilled' && conventionResSettled.value?.data) {
                    const name = conventionResSettled.value.data?.convention?.Intitule || conventionResSettled.value.data?.Intitule || null;
                    setConventionName(name);
                } else if (fetchedMarcheData.id_convention) {
                    setConventionName(`(Erreur chargement Conv. ID: ${fetchedMarcheData.id_convention})`);
                    console.warn(`Could not fetch convention details (ID: ${fetchedMarcheData.id_convention}):`, conventionResSettled.reason?.message);
                } else { setConventionName(null); }

            } catch (err) {
                 if (!isMounted) return;
                console.error("Error fetching primary marche data:", err.response || err);
                setError(err.response?.data?.message || err.message || "Erreur critique lors du chargement du marché.");
                 setLoadingMarche(false);
                 setMarcheData(null);
            } finally {
                 if (isMounted) setLoadingRelated(false);
            }
        };
        fetchDetails();
        return () => { isMounted = false; };
    }, [itemId, baseApiUrl]);

    // --- Helper to render Fonctionnaire names (Keep from previous working version) ---
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) {
            return <span className="text-muted small fst-italic">Aucun point focal assigné.</span>;
        }
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
            return <span className="text-muted small fst-italic">Aucun point focal assigné.</span>;
        }
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        <Badge key={id} pill bg="light" text="dark" className="border me-1 mb-1 fw-normal shadow-sm">
                            <FontAwesomeIcon icon={faUserTie} className="me-1 text-secondary" />
                            {fonctionnaire?.label || `ID ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]);

    // --- Original renderDetail / renderDetail2 helpers ---
    const renderDetail = (label, value, formatter = null, mdSize = 6, lgSize = 3) => ( // Default lg=3 again
         (value !== null && value !== undefined && value !== '') || value === 0 ?
            <Col xs={12} md={mdSize} lg={lgSize} className="mb-3 data-point text-center">
                <strong className="text-dark titly d-block label">{label}</strong>
                <span className="value">{formatter ? formatter(value) : displayData(value)}</span>
            </Col>
        : null
    );
    const renderDetail2 = (label, value, formatter = null) => (
        (value !== null && value !== undefined && value !== '') || value === 0 ?
           <div className="mb-2 d-flex justify-content-between align-items-center data-point">
               <strong className="text-dark titly fw-bold label me-2">{label} :</strong>
               <span className="value text-end">
                   {formatter ? formatter(value) : displayData(value)}
               </span>
           </div>
       : null
   );

    // --- Public File URL (Keep from previous working version) ---
    const getPublicFileUrl = (relativePath) => {
        if (!relativePath || !publicBaseUrl) return null;
        const storageUrl = `${publicBaseUrl}/storage`;
        return `${storageUrl}/${relativePath.replace(/^storage\//i, '').replace(/^\//, '')}`;
    };

    // --- File Mapping (Keep from previous working version) ---
    const marketFiles = filesData.filter(f => f.marche_id && !f.lot_id);
    const lotFilesMap = filesData.reduce((acc, f) => {
        if (f.lot_id) {
            if (!acc[f.lot_id]) acc[f.lot_id] = [];
            acc[f.lot_id].push(f);
        }
        return acc;
    }, {});

    // --- Render Logic ---

    if (loadingMarche) {
       return <div className="text-center p-5"><Spinner animation="border" /><span> Chargement initial...</span></div>;
    }

    if (error) { return <Alert variant="danger" className="m-3">Erreur: {error}</Alert>; }
    if (!marcheData) { return <Alert variant="warning" className="m-3">Aucune donnée principale de marché trouvée.</Alert>; }

    // Main content render - Reverted to original structure without Cards for main details
    return (
        <div className='px-4'>
            {/* Header Section - Original */}
             <div className="d-flex justify-content-between align-items-start mb-4 px-5 pt-5 border-bottom holder pb-1">
                 <div>
                    <h2 className="mb-1 fw-bold text-dark ">Marché Public : {displayData(marcheData.numero_marche)}</h2>
                 </div>
                 {onClose && (
                     <Button variant="warning" onClick={onClose} title="Fermer" className="px-5 border-0 rounded-5 shadow-sm ">
                         <b>Revenir a la liste</b>
                     </Button>
                 )}
             </div>

             {/* Original holder padding */}
            <div className="px-5 pb-3 holder">

                {/* --- Main Details Section - Original Structure --- */}
                <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Informations Générales</h5>
                 {/* Intitule - Original */}
                <Row className="mb-4 pb-3 border-bottom data-section">
                     <Col xs={12} className="mb-3 data-point text-dark text-center pill bg-white shadow-sm p-2 px-5 rounded-2 ">
                        <strong className=" titly fs-bold d-block label">Intitulé du Marché</strong>
                        <p className="value lead mb-0">{displayData(marcheData.intitule)}</p>
                    </Col>
                </Row>
                 {/* Convention, AO, Type, Statut - Original Row */}
                <Row className="mb-3 data-section">
                     <Col xs={12} className="mb-3 data-point">
                         <Row className='p-4 m-2 bg-white shadow-sm rounded-5'>
                            {/* Convention Associée */}
                            {renderDetail(
                                "Convention Associée",
                                conventionName,
                                (name) => name ? <span><FontAwesomeIcon icon={faLink} className="me-2 text-warning"/>{displayData(name)}</span> : '-',
                                6, 3 // Original col sizes
                            )}
                             {/* Appel d'Offre */}
                            {renderDetail(
                                "Appel d'Offre Réf.",
                                marcheData.appel_offre?.numero,
                                (num) => num ? <span><FontAwesomeIcon icon={faLink} className="me-2 text-warning"/>{displayData(num)}</span> : '-',
                                6, 3 // Original col sizes
                            )}
                             {/* Type */}
                            {renderDetail("Type", marcheData.type_marche, null, 6, 3)}
                             {/* Statut */}
                            {renderDetail("Statut", marcheData.statut, getStatusBadge, 6, 3)}
                         </Row>
                     </Col>
                 </Row>
                 {/* Procedure, Mode, Budget, Montant, Source, Attributaire, Dates - Original Row */}
                 <Row className="mb-3 data-section">
                     <Col xs={12} className="mb-3 data-point">
                         <div className='d-flex w-100 justify-content-between'>
                             <div className='p-3 m-2 bg-white rounded-5 shadow-sm w-100'>
                                {renderDetail2("Procédure Passation", marcheData.procedure_passation)}
                                {renderDetail2("Mode Passation", marcheData.mode_passation)}
                                {renderDetail2("Budget Prévisionnel", marcheData.budget_previsionnel, formatCurrency)}
                                {renderDetail2("Montant Attribué", marcheData.montant_attribue, formatCurrency)}
                             </div>
                             <div className='p-4 m-2 bg-white rounded-5 shadow-sm w-100'>
                                {renderDetail2("Source Financement", marcheData.source_financement)}
                                {renderDetail2("Attributaire(s) Principal", marcheData.attributaire)}
                                {renderDetail2("Date Publication", marcheData.date_publication, formatDate)}
                                {renderDetail2("Date Limite Offres", marcheData.date_limite_offres, formatDate)}
                             </div>
                         </div>
                     </Col>
                 </Row>
                 {/* Dates, Avancement, Engagement - Original Row */}
                <Row className="mb-4 pb-3 border-bottom data-section">
                    <Col md={6}>
                        <div className='p-4 m-2 bg-white rounded-5 shadow-sm flex-fill w-100'>
                            {renderDetail2("Date Ouverture Plis", marcheData.date_ouverture_plis, formatDate)}
                            {renderDetail2("Date Fin Session Ouverture", marcheData.date_fin_ouverture, formatDate)}
                            {renderDetail2("Avancement Physique", marcheData.avancement_physique, formatPercentage)}
                            {renderDetail2("Avancement Financier", marcheData.avancement_financier, formatPercentage)}
                            {renderDetail2("Date Engagement Trésorerie", marcheData.date_engagement_tresorerie, formatDate)}
                         </div>
                     </Col>
                     <Col md={6}>
                         <div className='p-4 m-2 bg-white rounded-5 shadow-sm w-100 flex-fill'>
                            {renderDetail2("Date Notification", marcheData.date_notification, formatDate)}
                            {renderDetail2("Date Début Exécution", marcheData.date_debut_execution, formatDate)}
                            {renderDetail2("Durée (jours)", marcheData.duree_marche)}
                         </div>
                     </Col>
                </Row>
                {/* --- End Main Details Section --- */}


                {/* Loading indicator for related data */}
                 {loadingRelated && (
                     <div className="text-center my-3 text-muted">
                         <Spinner animation="border" size="sm" className="me-2"/> Chargement des détails (lots, fichiers, points focaux...)...
                     </div>
                 )}


                {/* --- Points Focaux Section (New Card at the end) --- */}
                {!loadingMarche && ( // Only show this card after main marche data is loaded
                     <Card className={CARD_CLASS}>
                         <Card.Body>
                             <Card.Title as="h5" className={CARD_TITLE_CLASS}>Points Focaux</Card.Title>
                             {loadingRelated ? (
                                 <div className="text-center">
                                     <Spinner animation="border" size="sm" />
                                 </div>
                             ) : (
                                 getFonctionnaireNames(marcheData.id_fonctionnaire)
                             )}
                         </Card.Body>
                     </Card>
                )}
                {/* --- End Points Focaux Section --- */}


                {/* --- Lots Section (Original Structure) --- */}
                 {!loadingRelated && lotsData && lotsData.length > 0 && (
                     <div className="mb-4 pb-3 border-bottom data-section">
                        <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Lots Associés ({lotsData.length})</h5>
                        <Table striped hover responsive size="sm" className="mytab">
                            <thead className="table-light">
                                <tr>
                                    <th>N° Lot</th>
                                    <th>Objet</th>
                                    <th className="text-end">Montant Attribué</th>
                                    <th>Attributaire</th>
                                    <th>Fichiers</th>
                                </tr>
                            </thead>
                             <tbody>
                                {lotsData.map(lot => (
                                    <tr key={lot.id}>
                                        <td>{displayData(lot.numero_lot)}</td>
                                        <td>{displayData(lot.objet)}</td>
                                        <td className="text-end">{formatCurrency(lot.montant_attribue)}</td>
                                        <td>{displayData(lot.attributaire)}</td>
                                        <td>
                                            {lotFilesMap[lot.id]?.length > 0 ? (
                                                <Stack direction="horizontal" gap={2}>
                                                    {lotFilesMap[lot.id].map(file => {
                                                        const publicUrl = getPublicFileUrl(file.chemin_fichier);
                                                        return publicUrl ? (
                                                            <a key={file.id} href={publicUrl} target="_blank" rel="noopener noreferrer" className="p-0 text-secondary" title={`Ouvrir: ${file.nom_fichier}`}>
                                                                <FontAwesomeIcon className='text-warning' icon={getFileIcon(file.nom_fichier || file.type_fichier)} />
                                                            </a>
                                                        ) : (<FontAwesomeIcon icon={faLink} className="text-muted" title="Lien indisponible"/>);
                                                    })}
                                                </Stack>
                                            ) : (<span className="text-muted fst-italic">-</span>)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                 )}

                 {/* --- General Files Section (Original Structure) --- */}
                {!loadingRelated && marketFiles && marketFiles.length > 0 && (
                    <div className="mb-3 data-section">
                        <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Fichiers Généraux ({marketFiles.length})</h5>
                        <Stack direction="horizontal" gap={3} wrap className='justify-content-start'>
                            {marketFiles.map(file => {
                                const publicUrl = getPublicFileUrl(file.chemin_fichier);
                                return (
                                    <div key={file.id} className="border rounded p-2 d-flex align-items-center bg-dark text-white shadow-sm mb-2" style={{minWidth: '180px'}}>
                                        <FontAwesomeIcon icon={getFileIcon(file.nom_fichier || file.type_fichier)} className="me-2 fa-lg text-warning"/>
                                        <span className="me-auto small text-truncate" title={file.nom_fichier}>
                                            {displayData(file.nom_fichier, 'Fichier')}
                                        </span>
                                        {publicUrl ? (
                                            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-warning py-0 px-1 ms-2" title="Ouvrir">
                                                <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" className='text-warning'/>
                                            </a>
                                        ) : (
                                            <span className="text-muted fst-italic small ms-2">(Lien invalide)</span>
                                        )}
                                    </div>
                                );
                             })}
                        </Stack>
                    </div>
                )}

                {/* No Lots/Files Message (Original Structure) */}
                 {!loadingRelated && (!lotsData || lotsData.length === 0) && (!marketFiles || marketFiles.length === 0) && (
                    <Alert variant='secondary' className='small py-2'><FontAwesomeIcon icon={faInfoCircle} className="me-2"/> Aucun lot ou fichier général joint pour ce marché.</Alert>
                 )}
             </div> {/* End holder padding */}
         </div>
    );
};

// --- PropTypes (Keep from previous working version) ---
MarchePublicVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func,
    baseApiUrl: PropTypes.string.isRequired,
};

export default MarchePublicVisualisation;