// src/gestion_conventions/marches_views/MarchePublicVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Spinner, Alert, Table, Badge, Stack, Button, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt,
    faExternalLinkAlt, faTimes, faInfoCircle, faLink,
    faUserTie
} from '@fortawesome/free-solid-svg-icons';

import './marche.css';

// --- Helpers ---
const displayData = (data, fallback = '-') => data ?? fallback;
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
             const parsedDate = new Date(dateString);
             if (isNaN(parsedDate)) throw new Error("Invalid date format after direct parse");
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
const CARD_CLASS = "border-light shadow-sm mb-3";
const CARD_TITLE_CLASS = "mb-3 section-title text-uppercase fw-bold text-secondary";
// --- End Constants ---


const MarchePublicVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    // --- State Variables ---
    const [marcheData, setMarcheData] = useState(null);
    const [lotsData, setLotsData] = useState([]);
    const [filesData, setFilesData] = useState([]);
    const [conventionName, setConventionName] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]);
    const [loadingMarche, setLoadingMarche] = useState(true);
    const [loadingRelated, setLoadingRelated] = useState(true);
    const [error, setError] = useState(null);

     useEffect(() => {
        let isMounted = true;
        if (!itemId) {
            setLoadingMarche(false); setLoadingRelated(false);
            setError("MARCHE VISU: ID du Marché manquant.");
            return;
        }

        const fetchDetails = async () => {
            setLoadingMarche(true);
            setLoadingRelated(true);
            setError(null);
            setMarcheData(null); setLotsData([]); setFilesData([]); setConventionName(null); setFonctionnairesList([]);
            console.log(`MARCHE VISU: Fetching ALL details for Marche ID: ${itemId}`);

            // Assuming baseApiUrl is 'http://localhost:8000/api'
            // So, no additional apiPrefix is needed if Laravel prefixes /api automatically.
            const marcheUrl = `${baseApiUrl}/marches-publics/${itemId}`;
            const fonctionnairesUrl = `${baseApiUrl}/options/fonctionnaires`; // <<< CORRECTED URL

            try {
                console.log("MARCHE VISU: Fetching Marche from:", marcheUrl);
                console.log("MARCHE VISU: Fetching Fonctionnaires from:", fonctionnairesUrl);

                const [marcheRes, foncRes] = await Promise.allSettled([
                    axios.get(marcheUrl, { withCredentials: true }),
                    axios.get(fonctionnairesUrl, { withCredentials: true })
                ]);

                if (!isMounted) return;

                // Process Marche Public Response
                if (marcheRes.status === 'fulfilled' && marcheRes.value.data) {
                    const fetchedMarcheData = marcheRes.value.data?.marche_public || marcheRes.value.data || null;
                    if (!fetchedMarcheData || !fetchedMarcheData.id) { // Check for a primary key or essential field
                        throw new Error("Données principales du marché non trouvées ou invalides.");
                    }
                    console.log("MARCHE VISU: Received main data:", fetchedMarcheData);
                    setMarcheData(fetchedMarcheData);
                    setLoadingMarche(false);

                    const extractedLots = fetchedMarcheData.lots || [];
                    setLotsData(extractedLots);
                    console.log("MARCHE VISU: Extracted Lots (count):", extractedLots.length);

                    const generalFiles = fetchedMarcheData.fichiers_joints_generaux || [];
                    let allFiles = [...generalFiles];
                    extractedLots.forEach(lot => {
                        if (lot.fichiers_joints && Array.isArray(lot.fichiers_joints)) {
                            allFiles = [...allFiles, ...lot.fichiers_joints];
                        }
                    });
                    setFilesData(allFiles);
                    console.log("MARCHE VISU: Extracted and Combined Files (count):", allFiles.length);

                    const loadedConvention = fetchedMarcheData.convention;
                    setConventionName(loadedConvention ? (loadedConvention.Intitule || null) : null);

                } else {
                    const status = marcheRes.reason?.response?.status;
                    const errorDetail = marcheRes.reason?.response?.data?.message || marcheRes.reason?.message || `Erreur inconnue (Status: ${status || 'N/A'})`;
                    console.error(`MARCHE VISU: Marche fetch failed (Status: ${status}):`, errorDetail, marcheRes.reason);
                    throw new Error(`Échec chargement marché: ${errorDetail}`);
                }

                // =============== MODIFIED SECTION FOR FONCTIONNAIRES DEBUGGING ===============
                if (foncRes.status === 'fulfilled') {
                    const foncResValueData = foncRes.value.data; // This is the data part of the Axios response
                    // --- CRITICAL LOGS FOR FONCTIONNAIRES ---
                    console.log("MARCHE VISU: Raw response for /options/fonctionnaires:", foncResValueData);
                    console.log("MARCHE VISU: typeof foncResValueData:", typeof foncResValueData);
                    console.log("MARCHE VISU: Array.isArray(foncResValueData):", Array.isArray(foncResValueData));

                    if (foncResValueData && typeof foncResValueData === 'object') {
                        // Check for the 'fonctionnaires' key as returned by your controller
                        console.log("MARCHE VISU: foncResValueData.fonctionnaires:", foncResValueData.fonctionnaires);
                        console.log("MARCHE VISU: typeof foncResValueData.fonctionnaires:", typeof foncResValueData.fonctionnaires);
                        console.log("MARCHE VISU: Array.isArray(foncResValueData.fonctionnaires):", Array.isArray(foncResValueData.fonctionnaires));

                        // Also check for a 'data' key in case of Laravel pagination wrapper (less likely for options)
                        console.log("MARCHE VISU: foncResValueData.data (for pagination check):", foncResValueData.data);
                        console.log("MARCHE VISU: typeof foncResValueData.data:", typeof foncResValueData.data);
                        console.log("MARCHE VISU: Array.isArray(foncResValueData.data):", Array.isArray(foncResValueData.data));
                    }
                    // --- END CRITICAL LOGS ---

                    // Extract the array. Your controller returns { "fonctionnaires": [...] }
                    const foncDataPayload = foncResValueData.fonctionnaires; // <<< CORRECTED EXTRACTION

                    if (Array.isArray(foncDataPayload)) {
                        setFonctionnairesList(foncDataPayload.map(f => ({
                            value: f.id, // From your controller's DB::raw select
                            label: f.nom_complet || f.Nom_Fonctionnaire || f.nom || f.name || `ID ${f.id}`
                        })));
                        console.log(`MARCHE VISU: Processed ${foncDataPayload.length} fonctionnaires for list from array.`);
                    } else {
                        console.warn("MARCHE VISU: Payload 'foncResValueData.fonctionnaires' was NOT an array:", foncDataPayload);
                        setFonctionnairesList([]); // Fallback
                        // Optionally set an error or part of an error message
                        // setError(prev => (prev ? prev + "\n" : "") + "Format incorrect pour points focaux.");
                    }
                } else {
                     if (isMounted) {
                         console.warn("MARCHE VISU: Could not fetch fonctionnaires list:", foncRes.reason?.message || foncRes.reason);
                         setFonctionnairesList([]); // Fallback
                         // Optionally set an error
                         // setError(prev => (prev ? prev + "\n" : "") + "Erreur chargement points focaux.");
                     }
                }
                // =============== END MODIFIED SECTION FOR FONCTIONNAIRES DEBUGGING ===============

            } catch (err) {
                 if (!isMounted) return;
                console.error("MARCHE VISU: Error fetching marche data:", err.response || err);
                setError(err.response?.data?.message || err.message || "Erreur critique lors du chargement du marché.");
                 setLoadingMarche(false);
                 setMarcheData(null);
                 setFonctionnairesList([]); // Ensure empty on major error
            } finally {
                 if (isMounted) setLoadingRelated(false);
            }
        };
        fetchDetails();
        return () => { isMounted = false; };
    }, [itemId, baseApiUrl]);

    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        console.log("MARCHE VISU GETNAMES: Called with string:", fonctionnaireIdString);
        console.log("MARCHE VISU GETNAMES: current fonctionnairesList:", fonctionnairesList);
        console.log("MARCHE VISU GETNAMES: Array.isArray(fonctionnairesList):", Array.isArray(fonctionnairesList));

        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || fonctionnaireIdString.trim() === '') {
            return <span className="text-muted small fst-italic">Aucun point focal assigné.</span>;
        }
        if (!Array.isArray(fonctionnairesList)) {
            console.error("MARCHE VISU GETNAMES: fonctionnairesList is NOT an array!");
            return <span className="text-danger">Erreur: Liste points focaux invalide</span>;
        }
        if (fonctionnairesList.length === 0) { // Check after confirming it's an array
             return <span className="text-warning fst-italic">Chargement points focaux... (IDs: {fonctionnaireIdString})</span>;
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
                            {fonctionnaire?.label || `ID Point Focal: ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]);

    // --- Render Detail Helpers ---
    // ... (Your renderDetail and renderDetail2 helpers remain the same) ...
    const renderDetail = (label, value, formatter = null, mdSize = 6, lgSize = 3) => (
        ((value !== null && value !== undefined && String(value).trim() !== '') || value === 0) ?
           <Col xs={12} md={mdSize} lg={lgSize} className="mb-3 data-point text-center">
               <strong className="text-dark titly d-block label">{label}</strong>
               <span className="value">{formatter ? formatter(value) : displayData(value)}</span>
           </Col>
       : null
   );
   const renderDetail2 = (label, value, formatter = null) => (
       ((value !== null && value !== undefined && String(value).trim() !== '') || value === 0) ?
          <div className="mb-2 d-flex justify-content-between align-items-center data-point">
              <strong className="text-dark titly fw-bold label me-2">{label} :</strong>
              <span className="value text-end">
                  {formatter ? formatter(value) : displayData(value)}
              </span>
          </div>
      : null
  );


    // --- File Mapping Logic ---
    const marketFiles = (filesData || []).filter(f => f.marche_id && !f.lot_id);
    const lotFilesMap = (filesData || []).reduce((acc, f) => {
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

    return (
        <div className='px-4'>
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

            <div className="px-5 pb-3 holder">
                <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Informations Générales</h5>
                <Row className="mb-4 pb-3 border-bottom data-section">
                     <Col xs={12} className="mb-3 data-point text-dark text-center pill bg-white shadow-sm p-2 px-5 rounded-2 ">
                        <strong className=" titly fs-bold d-block label">Intitulé du Marché</strong>
                        <p className="value lead mb-0">{displayData(marcheData.intitule)}</p>
                    </Col>
                </Row>
                <Row className="mb-3 data-section">
                     <Col xs={12} className="mb-3 data-point">
                         <Row className='p-4 m-2 bg-white shadow-sm rounded-5'>
                            {renderDetail( "Convention Associée", conventionName, (name) => name ? <span><FontAwesomeIcon icon={faLink} className="me-2 text-warning"/>{displayData(name)}</span> : '-', 6, 3 )}
                            {renderDetail( "Appel d'Offre Réf.", marcheData.appel_offre?.numero, (num) => num ? <span><FontAwesomeIcon icon={faLink} className="me-2 text-warning"/>{displayData(num)}</span> : '-', 6, 3 )}
                            {renderDetail("Type", marcheData.type_marche, null, 6, 3)}
                            {renderDetail("Statut", marcheData.statut, getStatusBadge, 6, 3)}
                         </Row>
                     </Col>
                 </Row>
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

                 {loadingRelated && (
                     <div className="text-center my-3 text-muted">
                         <Spinner animation="border" size="sm" className="me-2"/> Chargement des détails supplémentaires...
                     </div>
                 )}

                <Card className={CARD_CLASS}>
                     <Card.Body>
                         <Card.Title as="h5" className={CARD_TITLE_CLASS}>Points Focaux</Card.Title>
                         {loadingRelated ? (
                             <div className="text-center"> <Spinner animation="border" size="sm" /> </div>
                         ) : (
                             getFonctionnaireNames(marcheData.id_fonctionnaire)
                         )}
                     </Card.Body>
                 </Card>

                 {!loadingRelated && lotsData && lotsData.length > 0 && (
                     <div className="mb-4 pb-3 border-bottom data-section">
                        <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Lots Associés ({lotsData.length})</h5>
                        <Table striped hover responsive size="sm" className="mytab">
                            <thead className="table-light">
                                <tr>
                                    <th>N° Lot</th><th>Objet</th><th className="text-end">Montant Attribué</th><th>Attributaire</th><th>Fichiers</th>
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
                                                        const publicUrl = file.url;
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

                {!loadingRelated && marketFiles && marketFiles.length > 0 && (
                    <div className="mb-3 data-section">
                        <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Fichiers Généraux ({marketFiles.length})</h5>
                        <Stack direction="horizontal" gap={3} wrap className='justify-content-start'>
                            {marketFiles.map(file => {
                                const publicUrl = file.url;
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

                 {!loadingRelated && (!lotsData || lotsData.length === 0) && (!marketFiles || marketFiles.length === 0) && (
                    <Alert variant='secondary' className='small py-2'><FontAwesomeIcon icon={faInfoCircle} className="me-2"/> Aucun lot ou fichier général joint pour ce marché.</Alert>
                 )}
             </div>
         </div>
    );
};

MarchePublicVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func,
    baseApiUrl: PropTypes.string.isRequired,
};

export default MarchePublicVisualisation;