// src/pages/conventions_views/visualisationConventions.jsx (Merged Version)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    // Combined Icons
    faSpinner, faExclamationTriangle, faTimes, faExternalLinkAlt,
    faCheckCircle, faTimesCircle, faInfoCircle, faFilePdf, faFileWord,
    faFileImage, faFileExcel, faFileAlt, faCommentDots,
    faPiggyBank, faHandHoldingUsd, faTasks,
    faUserTie, // Keep from V1
    faBuilding, // Keep from V2
    faMapMarkerAlt, faProjectDiagram, faClipboardList // Keep V1 detail icons
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
import Stack from 'react-bootstrap/Stack'; // Keep from V1
import ProgressBar from 'react-bootstrap/ProgressBar';
import './visualisation.css'; // Ensure this path is correct if used

// --- Helper Functions --- (Using V1's displayData, keeping others)
const formatCurrency = (cost) => { if (cost === 0 || cost === '0') { const options = { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 }; return (0).toLocaleString('fr-MA', options); } const number = parseFloat(cost); if (isNaN(number) || number === null || number === undefined) return '-'; const options = { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 }; return number.toLocaleString('fr-MA', options); };
const displayData = (data, fallback = '-') => (data !== null && data !== undefined && String(data).trim() !== '') ? data : fallback; // V1 version
const STATUT_OPTIONS = [ { value: "non approuvé", label: "Non Approuvé", color: "danger" }, { value: "en cours d'approbation", label: "En Cours d'Approbation", color: "warning" }, { value: "approuvé", label: "Approuvé", color: "success" }, { value: "non visé", label: "Non Visé", color: "danger" }, { value: "en cours de visa", label: "En Cours de Visa", color: "warning" }, { value: "visé", label: "Visé", color: "info" }, { value: "non signé", label: "Non Signé", color: "secondary"}, { value: "en cours de signature", label: "En Cours de Signature", color: "warning" }, { value: "signé", label: "Signé", color: "primary" } ];
const getStatusColor = (statusValue) => { const option = STATUT_OPTIONS.find(opt => opt.value === statusValue); return option ? option.color : "light"; };
const getFileIcon = (mimeTypeOrName) => { if (!mimeTypeOrName) return faFileAlt; const lowerCase = String(mimeTypeOrName).toLowerCase(); if (lowerCase.includes('pdf')) return faFilePdf; if (lowerCase.includes('doc') || lowerCase.includes('word')) return faFileWord; if (lowerCase.includes('xls') || lowerCase.includes('excel') || lowerCase.includes('spreadsheetml')) return faFileExcel; if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage; return faFileAlt; };

// --- Component Definition ---
const ConventionVisualisation = ({
    itemId,
    onClose,
    baseApiUrl = 'http://localhost:8000/api' // Default API Base URL
}) => {
    // --- State (Including fonctionnairesList from V1) ---
    const [conventionData, setConventionData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [provincesList, setProvincesList] = useState([]);
    const [fonctionnairesList, setFonctionnairesList] = useState([]); // Keep from V1

    // --- Derive App Base URL (Using V1's logic) ---
    const appBaseUrl = useMemo(() => {
        if (!baseApiUrl) { console.error("ConventionVisualisation: baseApiUrl prop is missing!"); return ''; }
        try { return baseApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, ''); }
        catch (e) { console.error("ConventionVisualisation: Error processing baseApiUrl:", e); return ''; }
    }, [baseApiUrl]);

    // --- Data Fetching Logic (Using V1's Promise.allSettled structure, adding baseApiUrl check from V2) ---
    const fetchData = useCallback(async () => {
        // Checks from V2
        if (!itemId || !baseApiUrl) {
            const missing = [];
            if (!itemId) missing.push("ID de convention");
            if (!baseApiUrl) missing.push("URL d'API (baseApiUrl)");
            setError(`Informations manquantes pour charger les données: ${missing.join(', ')}.`);
            setLoading(false);
            return;
        }

        setLoading(true); setError(null); setConventionData(null);
        setProvincesList([]); setFonctionnairesList([]); // Reset lists

        console.log(`Visualisation: Fetching convention ${itemId}`);
        try {
            // 1. Fetch Main Convention Data
            const conventionRes = await axios.get(`${baseApiUrl}/conventions/${itemId}`, { withCredentials: true });
            const convention = conventionRes.data.convention || conventionRes.data;

            if (convention && typeof convention === 'object' && Object.keys(convention).length > 0) {
                console.log("Visualisation: Convention data received:", convention);
                 // Ensure partner_commitments exists for safety
                 convention.partner_commitments = convention.partner_commitments || [];
                 convention.documents = convention.documents || [];
                setConventionData(convention);

                // 2. Fetch Auxiliary Lists using Promise.allSettled (V1 structure)
                const auxiliaryFetches = await Promise.allSettled([
                    axios.get(`${baseApiUrl}/provinces`, { withCredentials: true }),
                    axios.get(`${baseApiUrl}/fonctionnaires`, { withCredentials: true }) // Fetch fonctionnaires
                ]);

                // Process Provinces
                if (auxiliaryFetches[0].status === 'fulfilled') {
                    const provincesRes = auxiliaryFetches[0].value;
                    const provData = provincesRes.data.provinces || provincesRes.data || [];
                    setProvincesList(provData.map(p => ({ value: p.Id, label: p.Description || p.Code })));
                    console.log(`Visualisation: Fetched ${provData.length} provinces.`);
                } else { console.warn("Could not fetch provinces list:", auxiliaryFetches[0].reason?.message); }

                // Process Fonctionnaires
                if (auxiliaryFetches[1].status === 'fulfilled') {
                    const foncRes = auxiliaryFetches[1].value;
                    const foncData = foncRes.data.fonctionnaires || foncRes.data || [];
                    setFonctionnairesList(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID: ${f.id}` })));
                    console.log(`Visualisation: Fetched ${foncData.length} fonctionnaires.`);
                } else { console.warn("Could not fetch fonctionnaires list:", auxiliaryFetches[1].reason?.message); }

            } else { throw new Error(`Aucune donnée trouvée ou format invalide pour la convention ID ${itemId}.`); }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.statusText || err.message || `Erreur de chargement (ID: ${itemId}).`;
            setError(errorMsg + (err.response ? ` (Status: ${err.response.status})` : ''));
            console.error("Visualisation: Fetch error:", err.response || err);
        } finally { setLoading(false); }
    }, [itemId, baseApiUrl]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- Helper Function for Rendering Province Names (Keep V1/V2 logic) ---
    const getProvinceNames = useCallback((localisationString) => {
        if (!localisationString || typeof localisationString !== 'string' || !Array.isArray(provincesList) || provincesList.length === 0) return displayData(null);
        const ids = localisationString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) return displayData(null);
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const province = provincesList.find(p => String(p.value).toLowerCase() === String(id).toLowerCase());
                    return (<Badge key={id} pill bg="light" text="dark" className="border me-1 mb-1">{province?.label || `ID ${id}`}</Badge>);
                })}
            </Stack>
        );
    }, [provincesList]);

    // --- Helper Function for Rendering Fonctionnaire Names (Keep V1 logic) ---
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) return displayData(null);
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) return displayData(null);
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (<Badge key={id} pill bg="info" text="dark" className="border me-1 mb-1">{fonctionnaire?.label || `ID ${id}`}</Badge>);
                })}
             </Stack>
        );
    }, [fonctionnairesList]);

    // --- Calculate Global Financial Summary (Keep V1/V2 logic) ---
    const globalFinancialSummary = useMemo(() => {
        if (!conventionData) return { coutGlobal: 0, totalMontantVerse: 0, resteAFinancer: 0, progression: 0, isComplete: false };
        const coutGlobal = parseFloat(conventionData.Cout_Global) || 0;
        const totalMontantVerse = (conventionData.partner_commitments || []).reduce((sum, p) => sum + (parseFloat(p.Montant_Verse) || 0), 0);
        const resteAFinancer = coutGlobal - totalMontantVerse;
        const progression = coutGlobal > 0 ? Math.min(100, (totalMontantVerse / coutGlobal) * 100) : (totalMontantVerse > 0 ? 100 : 0);
        const isComplete = totalMontantVerse >= coutGlobal;
        return { coutGlobal, totalMontantVerse, resteAFinancer, progression, isComplete };
    }, [conventionData]);

    // --- Render Logic ---
    if (loading) { return ( <div className="text-center p-5 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}> <Spinner animation="border" variant="primary" className="me-3"/> <span className="text-muted">Chargement...</span> </div> ); }
    if (error) { return ( <Alert variant="danger" className="m-3 m-md-4"><Alert.Heading><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> Erreur</Alert.Heading><p>{error}</p><hr /><div className="d-flex justify-content-end"><Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button></div></Alert> ); }
    if (!conventionData) { return ( <Alert variant="secondary" className="m-3 m-md-4">Aucune donnée disponible.<Button variant="link" size="sm" onClick={onClose} className="float-end">Fermer</Button></Alert> ); }

    const { coutGlobal, totalMontantVerse, resteAFinancer, progression, isComplete } = globalFinancialSummary;

    return (
        // V1 Container Style
        <div className="p-3 p-md-4 convention-visualisation-container bg-light" style={{ borderRadius: '15px', maxHeight: '90vh', overflowY: 'auto', fontSize:'15px' }}>

            {/* Header (Using V2 Button Style) */}
             <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-2">
                <h3 className="mb-0 fw-bold text-dark">Détails Convention: {displayData(conventionData.Code)}</h3>
                <Button variant="light" size="sm" onClick={onClose} className="btn rounded-pill px-4 py-2 bg-light shadow-sm border" aria-label="Fermer"> <FontAwesomeIcon icon={faTimes} className="me-2"/> Fermer </Button>
            </div>

            {/* Row 1: General Info & Status/Finance (V1 Structure) */}
             <Row className="g-3 mb-4">
                <Col md={6} lg={7}> <Card className="h-100 border-light shadow-sm"> <Card.Header className="bg-white py-2 border-bottom-0"><Card.Title as="h6" className="mb-0 fw-semibold text-secondary text-uppercase small">Informations Générales</Card.Title></Card.Header> <Card.Body className="pt-2"> <dl className="row mb-0 dl-compact"> <dt className="col-sm-4">Code:</dt><dd className="col-sm-8 fw-bold">{displayData(conventionData.Code)}</dd> <dt className="col-sm-4">Intitulé:</dt><dd className="col-sm-8">{displayData(conventionData.Intitule)}</dd> <dt className="col-sm-4">Référence:</dt><dd className="col-sm-8">{displayData(conventionData.Reference)}</dd> <dt className="col-sm-4">Année Conv:</dt><dd className="col-sm-8">{displayData(conventionData.Annee_Convention)}</dd> <dt className="col-sm-4">Catégorie:</dt><dd className="col-sm-8">{displayData(conventionData.Categorie)}</dd> <dt className="col-sm-4">Class. Prov:</dt><dd className="col-sm-8">{displayData(conventionData.Classification_prov)}</dd> <dt className="col-sm-4">Maitre Ouvrage:</dt><dd className="col-sm-8">{displayData(conventionData.Maitre_Ouvrage)}</dd> </dl> </Card.Body> </Card> </Col>
                <Col md={6} lg={5}> <Card className="h-100 border-light shadow-sm"> <Card.Header className="bg-white py-2 border-bottom-0"><Card.Title as="h6" className="mb-0 fw-semibold text-secondary text-uppercase small">Statut & Groupe</Card.Title></Card.Header> <Card.Body className="pt-2"> <dl className="row mb-0 dl-compact"> <dt className="col-sm-5">Statut:</dt> <dd className="col-sm-7"><Badge bg={getStatusColor(conventionData.Statut)} text={['warning', 'light'].includes(getStatusColor(conventionData.Statut)) ? 'dark' : 'white'}>{displayData(conventionData.Statut)}</Badge></dd> <dt className="col-sm-5">Operation.:</dt><dd className="col-sm-7">{displayData(conventionData.Operationalisation)}</dd> <dt className="col-sm-5">Groupe:</dt><dd className="col-sm-7">{displayData(conventionData.Groupe)}</dd> <dt className="col-sm-5">Rang:</dt><dd className="col-sm-7">{displayData(conventionData.Rang)}</dd> </dl> </Card.Body> </Card> </Col>
            </Row>

            {/* Row 2: Objet, Objectifs, Observations, Localisation, Rattachements (V1 structure with added Fonctionnaire) */}
            <Row className="g-3 mb-4">
                <Col lg={6}> <Card className="h-100 border-light shadow-sm"> <Card.Header className="bg-white py-2 border-bottom-0"><Card.Title as="h6" className="mb-0 fw-semibold text-secondary text-uppercase small">Objet, Objectifs & Observations</Card.Title></Card.Header> <Card.Body className="pt-2"> <h6 className="fw-semibold">Objet:</h6><p className="mb-3 text-muted">{displayData(conventionData.Objet)}</p> <h6 className="fw-semibold">Objectifs:</h6><p className="mb-2 text-muted">{displayData(conventionData.Objectifs)}</p> <div className="border-top mt-3 pt-2"> <h6 className="fw-semibold"><FontAwesomeIcon icon={faCommentDots} className='me-2 text-secondary' />Observations:</h6> <p className="mb-0 text-muted fst-italic">{displayData(conventionData.observations, 'Aucune observation.')}</p> </div> </Card.Body> </Card> </Col>
                <Col lg={6}> <Card className="h-100 border-light shadow-sm"> <Card.Header className="bg-white py-2 border-bottom-0"><Card.Title as="h6" className="mb-0 fw-semibold text-secondary text-uppercase small">Localisation & Rattachements</Card.Title></Card.Header> <Card.Body className="pt-2"> <dl className="row mb-0 dl-compact"> <dt className="col-sm-4"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-1 text-secondary"/> Localisation:</dt> <dd className="col-sm-8">{getProvinceNames(conventionData.localisation)}</dd> <div className="w-100 my-2 border-top"></div> <dt className="col-sm-4 pt-2"><FontAwesomeIcon icon={faClipboardList} className="me-1 text-secondary"/> Programme:</dt> <dd className="col-sm-8 pt-2 fw-medium">{displayData(conventionData.programme?.Description)}</dd> <dt className="col-sm-4">Code Prg:</dt> <dd className="col-sm-8 text-muted">{displayData(conventionData.programme?.Code_Programme)}</dd> <div className="w-100 my-2 border-top"></div> <dt className="col-sm-4 pt-2"><FontAwesomeIcon icon={faProjectDiagram} className="me-1 text-secondary"/> Projet:</dt> <dd className="col-sm-8 pt-2 fw-medium">{displayData(conventionData.projet?.Nom_Projet)}</dd> <dt className="col-sm-4">Code Projet:</dt> <dd className="col-sm-8 text-muted">{displayData(conventionData.projet?.Code_Projet)}</dd> {/* Fonctionnaire Display (from V1) */} <div className="w-100 my-2 border-top"></div> <dt className="col-sm-4 pt-2"><FontAwesomeIcon icon={faUserTie} className="me-1 text-secondary"/> Points Focaux:</dt> <dd className="col-sm-8 pt-2">{getFonctionnaireNames(conventionData.id_fonctionnaire)}</dd> </dl> </Card.Body> </Card> </Col>
            </Row>

            {/* Row 3: Documents List (Using V1 link logic & styling) */}
            <Row className="g-3 mb-4">
                <Col> <Card className="border-light shadow-sm"> <Card.Header className="bg-white py-2 border-bottom-0"><Card.Title as="h6" className="mb-0 fw-semibold text-secondary text-uppercase small">Fichiers Associés</Card.Title></Card.Header> <Card.Body className="pt-2"> {conventionData.documents && conventionData.documents.length > 0 ? ( <ListGroup className='d-flex flex-row flex-wrap justify-content-start'> {conventionData.documents.map((doc) => { const fileDisplayUrl = appBaseUrl && doc.file_path ? `${appBaseUrl}/${doc.file_path.replace(/^\//, '')}` : doc.url; const fileIcon = getFileIcon(doc.file_type || doc.file_name); const fileSizeMB = doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) : null; return ( <ListGroup.Item key={doc.Id_Doc} className="px-2 py-2 m-1 rounded-3 d-flex align-items-center bg-dark text-white flex-grow-0" style={{ minWidth: '250px', maxWidth: '45%' }}> {/* V1 Style */} <FontAwesomeIcon icon={fileIcon} className="me-3 text-warning fa-lg flex-shrink-0" style={{width: '20px'}} title={doc.file_type || 'Type inconnu'}/> <div className="flex-grow-1 text-truncate me-2"> {fileDisplayUrl ? ( <a href={fileDisplayUrl} target="_blank" rel="noopener noreferrer" className="link-light text-decoration-none fw-medium stretched-link" title={`Ouvrir: ${displayData(doc.file_name, 'Fichier')}`}> {displayData(doc.file_name, 'Fichier sans nom')} </a> ) : ( <span className="text-white fw-medium" title={displayData(doc.file_name, '')}>{displayData(doc.file_name, 'Fichier (lien indisponible)')}</span> )} <small className="d-block text-secondary"> {displayData(doc.Intitule, '')} {doc.Intitule && fileSizeMB ? ' - ' : ''} {fileSizeMB ? `${fileSizeMB} Mo` : ''} </small> </div> {fileDisplayUrl && ( <a href={fileDisplayUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-warning ms-2 flex-shrink-0" title="Ouvrir dans un nouvel onglet"> <FontAwesomeIcon icon={faExternalLinkAlt} /> </a> )} </ListGroup.Item> ); })} </ListGroup> ) : ( <p className="text-muted mb-0 fst-italic">Aucun fichier associé.</p> )} </Card.Body> </Card> </Col>
             </Row>

            {/* Row 4: Partenaires & Engagements + Global Summary (Merged: V2 icon & label fallback, V1 styling) */}
            <Row className="g-3">
                <Col> <Card className="border-light shadow-sm"> <Card.Header className="bg-white py-2 border-bottom-0"><Card.Title as="h6" className="mb-0 fw-semibold text-secondary text-uppercase small">Engagements Partenaires</Card.Title></Card.Header> <Card.Body className="pt-2"> {conventionData.partner_commitments && conventionData.partner_commitments.length > 0 ? ( <div className="partner-list-container" style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '10px' }}> <ListGroup variant="flush"> {conventionData.partner_commitments.map((p, index) => { const montantConvenu = parseFloat(p.Montant_Convenu) || 0; const montantVerse = parseFloat(p.Montant_Verse) || 0; const solde = montantConvenu - montantVerse; return ( <ListGroup.Item key={p.Id_Partenaire || p.Id_CP || index} className="px-0 py-3 border-bottom"> {/* V1 Border */} <Row className="align-items-center mb-2"> <Col md={8}><strong className='text-primary fs-6'> {/* V1 Text Style */} <FontAwesomeIcon icon={faBuilding} className="me-2 text-secondary"/> {/* V2 Icon */} {displayData(p.label)} {/* Use pre-formatted label which includes fallback */} </strong></Col> <Col md={4} className="text-md-end"> {p.is_signatory ? ( <Badge bg="success" pill className='px-2 py-1'> <FontAwesomeIcon icon={faCheckCircle} className="me-1"/> Signataire </Badge> ) : ( <Badge bg="secondary" pill className='px-2 py-1'> <FontAwesomeIcon icon={faTimesCircle} className="me-1"/> Non Signataire </Badge> )} </Col> </Row> <Row className="mb-1 text-muted small"> <Col xs={5} md={3} className="text-end pe-0">Montant Convenu:</Col> <Col xs={7} md={9} className="fw-semibold text-dark">{formatCurrency(montantConvenu)}</Col> </Row> <Row className="mb-1 text-muted small"> <Col xs={5} md={3} className="text-end pe-0">Montant Versé:</Col> <Col xs={7} md={9} className="text-success">{formatCurrency(montantVerse)}</Col> </Row> <Row className="mb-1 small"> <Col xs={5} md={3} className="text-end pe-0 fw-semibold">Solde:</Col> <Col xs={7} md={9}> {montantVerse < montantConvenu ? ( solde > 0.01 ? ( <span className="text-danger fw-bold">Reste: {formatCurrency(solde)}</span> ) : ( <span className="text-success fw-bold">Soldé <FontAwesomeIcon icon={faCheckCircle} /></span> ) ) : ( <span className="text-success fw-bold">Soldé <FontAwesomeIcon icon={faCheckCircle} /></span> )} </Col> </Row> {p.is_signatory && (p.date_signature || p.details_signature) && ( <Row className="mt-2 text-muted small"> <Col xs={12} md={{ span: 9, offset: 3 }}> <span title='Date de signature'>Date: {displayData(p.date_signature)}</span> {p.date_signature && p.details_signature && <span className="mx-2">|</span>} <span title='Détails de signature'>Détails: {displayData(p.details_signature)}</span> </Col> </Row> )} </ListGroup.Item> ); })} </ListGroup> </div> ) : ( <p className="text-muted mb-0 fst-italic">Aucun engagement partenaire associé.</p> )} </Card.Body> {/* Global Financial Summary (V1 Structure) */} <Card.Body className="pt-3 border-top bg-light rounded-bottom"> <h6 className="mb-3 fw-semibold text-secondary text-uppercase small"> Synthèse Financière Globale </h6> <Row> <Col md={6}> <dl className="row dl-compact mb-0"> <dt className="col-sm-6"><FontAwesomeIcon icon={faPiggyBank} className="me-2 text-primary"/> Coût Global Conv.:</dt> <dd className="col-sm-6 fw-bold">{formatCurrency(coutGlobal)}</dd> <dt className="col-sm-6"><FontAwesomeIcon icon={faHandHoldingUsd} className="me-2 text-success"/> Total Versé:</dt> <dd className="col-sm-6 fw-bold">{formatCurrency(totalMontantVerse)}</dd> </dl> </Col> <Col md={6} className="d-flex align-items-center"> {isComplete ? ( <Alert variant="success" className="w-100 text-center py-2 mb-0 small"> <FontAwesomeIcon icon={faCheckCircle} className="me-2" /> <strong>Financement Atteint!</strong> </Alert> ) : ( <div className="w-100"> <div className="d-flex justify-content-between small mb-1"> <span> <FontAwesomeIcon icon={faTasks} className="me-1 text-danger"/> Reste: <strong className='ms-1'>{formatCurrency(resteAFinancer)}</strong> </span> <span>{progression.toFixed(1)}%</span> </div> <ProgressBar now={progression} variant="success" style={{ height: '10px' }} visuallyHidden title={`Progression: ${progression.toFixed(1)}%`} /> </div> )} </Col> </Row> </Card.Body> </Card> </Col>
            </Row>

        </div> // End Main Container
    );
};

// --- PropTypes ---
ConventionVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string // Kept optional as V2 had it
};

// --- Default Props ---
ConventionVisualisation.defaultProps = {
    baseApiUrl: 'http://localhost:8000/api' // Sensible default
};

export default ConventionVisualisation;