// src/gestion_conventions/marches_views/MarchePublicVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
// --- CHANGE 1: Import Popover and OverlayTrigger ---
import { Spinner, Alert, Table, Badge, Stack, Button, Row, Col, Card, Popover, OverlayTrigger } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt,
    faExternalLinkAlt, faTimes, faInfoCircle, faLink,
    faUserTie, faProjectDiagram // <-- Add project icon
} from '@fortawesome/free-solid-svg-icons';

import './marche.css';

// --- Helpers (No changes needed here) ---
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

const CARD_CLASS = "border-light shadow-sm mb-3";
const CARD_TITLE_CLASS = "mb-3 section-title text-uppercase fw-bold text-secondary";


const MarchePublicVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [marcheData, setMarcheData] = useState(null);
    const [lotsData, setLotsData] = useState([]);
    const [filesData, setFilesData] = useState([]);
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
            setLoadingMarche(true); setLoadingRelated(true); setError(null);
            setMarcheData(null); setLotsData([]); setFilesData([]); setFonctionnairesList([]);
            
            const marcheUrl = `${baseApiUrl}/marches-publics/${itemId}`;
            const fonctionnairesUrl = `${baseApiUrl}/options/fonctionnaires`;

            try {
                const [marcheRes, foncRes] = await Promise.all([
                    axios.get(marcheUrl, { withCredentials: true }),
                    axios.get(fonctionnairesUrl, { withCredentials: true })
                ]);

                if (!isMounted) return;

                if (marcheRes.status === 200 && marcheRes.data) {
                    const fetchedMarcheData = marcheRes.data?.marche_public || marcheRes.data;
                    setMarcheData(fetchedMarcheData);
                    setLotsData(fetchedMarcheData.lots || []);
                    const generalFiles = fetchedMarcheData.fichiers_joints_generaux || [];
                    const allLotFiles = (fetchedMarcheData.lots || []).flatMap(lot => lot.fichiers_joints || []);
                    console.log("Données du marché reçues par le composant:", fetchedMarcheData);
                    setFilesData([...generalFiles, ...allLotFiles]);
                } else {
                    throw new Error("Données principales du marché non trouvées ou invalides.");
                }
                setLoadingMarche(false);

                if (foncRes.status === 200 && foncRes.data) {
                    const foncDataPayload = foncRes.data.fonctionnaires;
                    if (Array.isArray(foncDataPayload)) {
                        setFonctionnairesList(foncDataPayload.map(f => ({
                            value: f.id,
                            label: f.nom_complet
                        })));
                    } else {
                        console.warn("MARCHE VISU: Payload 'fonctionnaires' was not an array.");
                    }
                } else {
                     console.warn("MARCHE VISU: Could not fetch fonctionnaires list.");
                }
            } catch (err) {
                 if (!isMounted) return;
                setError(err.response?.data?.message || err.message || "Erreur critique lors du chargement.");
                 setLoadingMarche(false);
            } finally {
                 if (isMounted) setLoadingRelated(false);
            }
        };
        fetchDetails();
        return () => { isMounted = false; };
    }, [itemId, baseApiUrl]);

    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString) return <span className="text-muted small fst-italic">Aucun point focal assigné.</span>;
        if (fonctionnairesList.length === 0) return <span className="text-warning fst-italic">Chargement... (IDs: {fonctionnaireIdString})</span>;

        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(Boolean);
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value) === id);
                    return (
                        <Badge key={id} pill bg="light" text="dark" className="border me-1 mb-1 fw-normal shadow-sm">
                            <FontAwesomeIcon icon={faUserTie} className="me-1 text-secondary" />
                            {fonctionnaire?.label || `ID: ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]);

    const renderDetail = (label, value, formatter = null, mdSize = 6, lgSize = 3) => (
        (value !== null && value !== undefined && String(value).trim() !== '') || value === 0 ?
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

    const marketFiles = (filesData || []).filter(f => f.marche_id && !f.lot_id);
    const lotFilesMap = (filesData || []).reduce((acc, f) => {
        if (f.lot_id) {
            if (!acc[f.lot_id]) acc[f.lot_id] = [];
            acc[f.lot_id].push(f);
        }
        return acc;
    }, {});

    if (loadingMarche) {
       return <div className="text-center p-5"><Spinner animation="border" /><span> Chargement initial...</span></div>;
    }
    if (error) { return <Alert variant="danger" className="m-3">Erreur: {error}</Alert>; }
    if (!marcheData) { return <Alert variant="warning" className="m-3">Aucune donnée principale de marché trouvée.</Alert>; }
    
    // --- CHANGE 2: Define a reusable popover component for files ---
    const filePopover = (file) => (
        <Popover id={`popover-file-${file.id}`} style={{maxWidth: '350px'}}>
            <Popover.Header as="h3" className='small fw-bold'>{displayData(file.intitule, "Détails du Fichier")}</Popover.Header>
            <Popover.Body>
                <p className='small mb-1'><strong>Fichier Original:</strong> <span className='text-muted'>{displayData(file.nom_fichier)}</span></p>
                <p className='small mb-0'><strong>Catégorie:</strong> <Badge bg="secondary" pill>{displayData(file.categorie, 'N/A')}</Badge></p>
            </Popover.Body>
        </Popover>
    );

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
                            {/* --- CHANGE 3: Display Project/Sub-Project --- */}
                            {renderDetail(
                                marcheData.projectable_type?.includes('SousProjet') ? "Sous-Projet Associé" : "Projet Associé",
                                marcheData.projectable?.Nom_Projet, // The name of the project/sub-project
                                (name) => name ? <span><FontAwesomeIcon icon={faProjectDiagram} className="me-2 text-info"/>{displayData(name)}</span> : '-',
                                6, 6 // Make it wider
                            )}
                            {renderDetail( "Convention Associée", marcheData.convention?.Intitule, (name) => name ? <span><FontAwesomeIcon icon={faLink} className="me-2 text-warning"/>{displayData(name)}</span> : '-', 6, 3 )}
                            {renderDetail("Statut", marcheData.statut, getStatusBadge, 6, 3)}
                         </Row>
                     </Col>
                 </Row>
                <Row className="mb-3 data-section">
                     <Col xs={12} className="mb-3 data-point">
                         <div className='d-flex w-100 justify-content-between'>
                             <div className='p-3 m-2 bg-white rounded-5 shadow-sm w-100'>
                                {renderDetail2("Appel d'Offre Réf.", marcheData.appel_offre?.numero)}
                                {renderDetail2("Procédure Passation", marcheData.procedure_passation)}
                                {renderDetail2("Mode Passation", marcheData.mode_passation)}
                                {renderDetail2("Type de Marché", marcheData.type_marche)}
                             </div>
                             <div className='p-4 m-2 bg-white rounded-5 shadow-sm w-100'>
                                {renderDetail2("Budget Prévisionnel", marcheData.budget_previsionnel, formatCurrency)}
                                {renderDetail2("Montant Attribué", marcheData.montant_attribue, formatCurrency)}
                                {renderDetail2("Source Financement", marcheData.source_financement)}
                                {renderDetail2("Attributaire(s) Principal", marcheData.attributaire)}
                             </div>
                         </div>
                     </Col>
                 </Row>
                <Row className="mb-4 pb-3 border-bottom data-section">
                    <Col md={6}>
                        <div className='p-4 m-2 bg-white rounded-5 shadow-sm flex-fill w-100'>
                            {renderDetail2("Date Publication", marcheData.date_publication, formatDate)}
                            {renderDetail2("Date Limite Offres", marcheData.date_limite_offres, formatDate)}
                            {renderDetail2("Date Notification", marcheData.date_notification, formatDate)}
                         </div>
                     </Col>
                     <Col md={6}>
                         <div className='p-4 m-2 bg-white rounded-5 shadow-sm w-100 flex-fill'>
                            {renderDetail2("Date Début Exécution", marcheData.date_debut_execution, formatDate)}
                            {renderDetail2("Durée (jours)", marcheData.duree_marche)}
                            {renderDetail2("Date Engagement Trésorerie", marcheData.date_engagement_tresorerie, formatDate)}
                            {renderDetail2("Date Visa Trésorerie", marcheData.date_visa_tresorerie, formatDate)}
                            {renderDetail2("Date Approbation Président", marcheData.date_approbation_president, formatDate)}
                         </div>
                     </Col>
                </Row>
                
                <Row className="mb-4 pb-3 border-bottom data-section">
                    <Col md={12}>
                        <Card className={CARD_CLASS}>
                            <Card.Body>
                                <Card.Title as="h5" className={CARD_TITLE_CLASS}>Suivi et Points Focaux</Card.Title>
                                <Row>
                                    <Col md={6} className="mb-3 mb-md-0">
                                        {renderDetail2("Avancement Physique", marcheData.avancement_physique, formatPercentage)}
                                        {renderDetail2("Avancement Financier", marcheData.avancement_financier, formatPercentage)}
                                    </Col>
                                    <Col md={6}>
                                        <strong className="text-dark titly fw-bold label me-2 d-block mb-1">Points Focaux :</strong>
                                        {loadingRelated ? <Spinner size="sm"/> : getFonctionnaireNames(marcheData.id_fonctionnaire)}
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
                
                 {loadingRelated && <div className="text-center my-3 text-muted"><Spinner animation="border" size="sm" className="me-2"/> Chargement...</div>}

                 {!loadingRelated && lotsData && lotsData.length > 0 && (
                     <div className="mb-4 pb-3 border-bottom data-section">
                        <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Lots Associés ({lotsData.length})</h5>
                        <Table striped hover responsive size="sm" className="mytab">
                            <thead className="table-light"><tr><th>N° Lot</th><th>Objet</th><th className="text-end">Montant</th><th>Attributaire</th><th>Fichiers</th></tr></thead>
                             <tbody>
                                {lotsData.map(lot => (
                                    <tr key={lot.id}>
                                        <td>{displayData(lot.numero_lot)}</td>
                                        <td>{displayData(lot.objet)}</td>
                                        <td className="text-end">{formatCurrency(lot.montant_attribue)}</td>
                                        <td>{displayData(lot.attributaire)}</td>
                                        <td>
                                            {/* --- CHANGE 4: Add OverlayTrigger to Lot Files --- */}
                                            {lotFilesMap[lot.id]?.length > 0 ? (
                                                <Stack direction="horizontal" gap={2}>
                                                    {lotFilesMap[lot.id].map(file => (
                                                        <OverlayTrigger trigger={['hover', 'focus']} placement="top" overlay={filePopover(file)} key={file.id}>
                                                            <a href={file.url || '#'} target="_blank" rel="noopener noreferrer" className={`p-0 ${file.url ? 'text-secondary' : 'text-muted'}`} title={file.intitule}>
                                                                <FontAwesomeIcon className='text-warning' icon={getFileIcon(file.nom_fichier)} />
                                                            </a>
                                                        </OverlayTrigger>
                                                    ))}
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
                        <div className="d-flex flex-wrap" style={{gap: '0.75rem'}}>
                            {/* --- CHANGE 5: Update General Files display --- */}
                            {marketFiles.map(file => (
                                <OverlayTrigger trigger={['hover', 'focus']} placement="top" overlay={filePopover(file)} key={file.id}>
                                    <div className="border rounded p-2 d-flex align-items-center bg-dark text-white shadow-sm" style={{minWidth: '220px'}}>
                                        <FontAwesomeIcon icon={getFileIcon(file.nom_fichier)} className="me-2 fa-lg text-warning"/>
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
                    </div>
                )}

                 {!loadingRelated && (!lotsData || lotsData.length === 0) && (!marketFiles || marketFiles.length === 0) && (
                    <Alert variant='secondary' className='small py-2'><FontAwesomeIcon icon={faInfoCircle} className="me-2"/> Aucun lot ou fichier général joint.</Alert>
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
