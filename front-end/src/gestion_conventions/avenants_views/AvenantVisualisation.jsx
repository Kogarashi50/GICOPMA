// src/pages/conventions_views/AvenantVisualisation.jsx (Merged)

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // Keep useMemo from V1
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    // Combined Icons from both versions
    faSpinner, faExclamationTriangle, faTimes, faFilePdf, faFileWord,
    faFileExcel, faFileImage, faFileAlt, faCalendarAlt, faInfoCircle,
    faEdit, faTags, faMoneyBillWave, faClock, faFileSignature, faListAlt,
    faAlignLeft, faComments, faPaperclip, faDownload, faBuilding, // Keep faBuilding
    faCheckCircle, faTimesCircle,
    faUserTie, faUsers // Keep faUserTie & faUsers
} from '@fortawesome/free-solid-svg-icons';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import PropTypes from 'prop-types';
import Spinner from 'react-bootstrap/Spinner';
import Badge from 'react-bootstrap/Badge';
import ListGroup from 'react-bootstrap/ListGroup';
import Stack from 'react-bootstrap/Stack'; // Keep Stack from V1 for fonctionnaire badges

// --- Helper Functions --- (Using V1 versions, adding Desc_Arr fallback where needed)
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString + 'T00:00:00Z');
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('fr-CA');
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString;
    }
};
const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '-';
    const number = parseFloat(amount);
    return number.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
// Use V1's displayData with trim check
const displayData = (data, fallback = '-') => (data !== null && data !== undefined && String(data).trim() !== '') ? data : fallback;
const getStatusColor = (statusValue) => {
    // This can be a shared helper file
    const statuses = {
        "en cours d'approbation": "warning", "approuvé": "success", "non visé": "danger",
        "en cours de visa": "warning", "visé": "info", "signé": "primary"
    };
    return statuses[statusValue] || "light";
};
const STATUT_OPTIONS = [
    { value: "en cours d'approbation", label: "En Cours d'Approbation" },
    { value: "approuvé", label: "Approuvé" },
    { value: "non visé", label: "Non Visé" },
    { value: "en cours de visa", label: "En Cours de Visa" },
    { value: "visé", label: "Visé" },
    { value: "signé", label: "Signé" },
];
// Define Type Modification Options (needed for label lookup)
const typeModificationOptions = [
    { value: 'montant', label: 'Modification Montant' },
    { value: 'durée', label: 'Modification Durée' },
    { value: 'partenaire', label: 'Modification Partenaire(s)' },
    { value: 'autre', label: 'Autre Modification' },
];
const getTypeModificationInfo = (typeValue) => {
    const option = typeModificationOptions.find(opt => opt.value === typeValue);
    const label = option ? option.label : typeValue;
    let color = 'light';
    switch (typeValue) {
        case 'montant': color = 'success'; break;
        case 'durée': color = 'info'; break;
        case 'partenaire': color = 'warning'; break;
        case 'autre': color = 'secondary'; break;
    }
    const textColor = ['warning', 'light'].includes(color) ? 'dark' : 'white';
    return { label: displayData(label), color, textColor };
};
const getFileIcon = (filename) => {
    if (!filename) return faFileAlt;
    const lowerCase = String(filename).toLowerCase();
    if (lowerCase.includes('.pdf')) return faFilePdf;
    if (lowerCase.includes('.doc')) return faFileWord;
    if (lowerCase.includes('.xls')) return faFileExcel;
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].some(ext => lowerCase.endsWith(ext))) return faFileImage;
    return faFileAlt;
};
// --- End Helpers ---


// --- Component ---
const AvenantVisualisation = ({
    itemId,
    onClose,
    baseApiUrl = 'http://localhost:8000/api'
}) => {
    // --- State ---
    const [avenantData, setAvenantData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]); // Keep from V1
const statusLabel = STATUT_OPTIONS.find(opt => opt.value === avenantData?.statut)?.label || avenantData?.statut;
    const statusInfo = { // You can create a helper for this
        label: displayData(statusLabel),
        color: getStatusColor(avenantData?.statut),
        textColor: ['warning', 'light'].includes(getStatusColor(avenantData?.statut)) ? 'dark' : 'white'
    };
    // --- Derive App Base URL (Using V1 approach) ---
    const appBaseUrl = useMemo(() => {
        if (!baseApiUrl) { console.error("AvenantVisualisation: baseApiUrl prop is missing!"); return ''; }
        try { return baseApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, ''); }
        catch (e) { console.error("AvenantVisualisation: Error processing baseApiUrl:", e); return ''; }
    }, [baseApiUrl]);

    // --- Data Fetching Logic (Using V1 - includes Fonctionnaires) ---
    const fetchData = useCallback(async () => {
        if (!itemId) { setError("ID d'avenant manquant."); setLoading(false); return; }
        if (!baseApiUrl) { setError("URL d'API (baseApiUrl) manquante."); setLoading(false); return; }

        setLoading(true); setError(null); setAvenantData(null);
        setFonctionnairesList([]); // Reset list

        console.log(`[Avenant Visu] Fetching ID ${itemId}...`);
        try {
            // 1. Fetch Avenant Data
            const avenantRes = await axios.get(`${baseApiUrl}/avenants/${itemId}`, {
                 params: { include: 'convention,documents,partnerCommitments.partenaire' }, // Use correct include
                 withCredentials: true
            });
            const data = avenantRes.data.avenant || avenantRes.data;
            console.log("[Avenant Visu] Raw Data Received:", data);

            if (data && typeof data === 'object' && data.id) {
                 data.documents = Array.isArray(data.documents) ? data.documents : [];
                 // Ensure correct partner key is used based on API response
                 data.partnerCommitments = data.partner_commitments || [];
                 setAvenantData(data);
                 console.log("[Avenant Visu] Processed Avenant Data Set:", data);

                 // 2. Fetch Fonctionnaires (from V1)
                 try {
                     console.log("[Avenant Visu] Fetching fonctionnaires list...");
                     const foncRes = await axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true })
                     const foncData = foncRes.data.fonctionnaires || foncRes.data || [];
                     console.log(foncData)

                     setFonctionnairesList(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID: ${f.id}` })));
                     console.log(`[Avenant Visu] Fetched ${foncData.length} fonctionnaires.`); // Log actual count fetched
                 } catch (foncError) {
                     console.warn("[Avenant Visu] Could not fetch fonctionnaires list:", foncError.message);
                     // Don't block main display if this fails
                 }

            } else {
                throw new Error(`Aucune donnée trouvée ou format invalide pour l'avenant ID ${itemId}.`);
            }
        } catch (err) {
             console.error(`[Avenant Visu] API Error fetching ID ${itemId}:`, err.response || err);
             const errorMsg = err.response?.data?.message || err.response?.statusText || err.message || `Erreur de chargement (ID: ${itemId}).`;
             setError(errorMsg + (err.response ? ` (Status: ${err.response?.status})` : ''));
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- Helper Function for Rendering Fonctionnaire Names (from V1) ---
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) {
            return displayData(null);
        }
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) { return displayData(null); }

        return (
            // Use Stack for inline badges (from V1)
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        <Badge key={id} pill bg="warning" text="dark" className="border me-1 mb-1 fw-normal">
                            {fonctionnaire?.label || `ID ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]); // Dependency


    // --- Render Helpers (Using V1 versions) ---
    const renderDetail = (label, value, icon = faInfoCircle, options = {}) => {
        const { formatFunc, conditionalCheck = () => true, highlight = false, isRawHtml = false } = options;
        if (!conditionalCheck(value)) return null; // Use value in check
        const displayValueRaw = formatFunc ? formatFunc(value) : displayData(value);
        const valueElement = React.isValidElement(displayValueRaw) ? displayValueRaw : (
            isRawHtml ? (
                 <span className={`text-dark text-start ${highlight ? 'text-success' : ''}`} style={{wordBreak: 'break-word'}} dangerouslySetInnerHTML={{ __html: displayValueRaw }} />
            ) : (
                 <span className={`text-dark text-start ${highlight ? 'text-success' : ''}`} style={{wordBreak: 'break-word'}}>
                     {displayValueRaw}
                 </span>
            )
        );
        return (
            <ListGroup.Item className="px-0 py-2 border-0 d-flex flex-wrap justify-content-between align-items-center">
                <span className="fw-medium text-secondary small me-2" style={{ flexShrink: 0 }}>
                    <FontAwesomeIcon icon={icon} className="me-2 text-warning" style={{width: '16px'}} /> <b>{label}</b>
                </span>
                {valueElement}
            </ListGroup.Item>
        );
     };

    const renderTextBlock = (label, value, icon = faAlignLeft) => {
         if (!value) return null;
         return (
             <Col xs={12} className="mb-3">
                 <Card className="border-light shadow-sm"> {/* V1 Card Style */}
                     <Card.Header className="bg-light py-2 border-bottom-0">
                        <Card.Title as="h6" className="mb-0 fw-semibold text-secondary small text-uppercase">
                             <FontAwesomeIcon icon={icon} className="me-2"/> {label}
                        </Card.Title>
                     </Card.Header>
                     <Card.Body className="pt-2">
                        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{displayData(value)}</p>
                     </Card.Body>
                 </Card>
             </Col>
         );
     };

    // --- Render Logic ---
    if (loading) {
        return ( <div className="text-center p-5"><Spinner animation="border" variant="primary" /> <span className="ms-3 text-muted">Chargement...</span></div> );
    }
    if (error) {
         return ( <Alert variant="danger" className="m-3 m-md-4"><Alert.Heading><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> Erreur</Alert.Heading><p>{error}</p><hr /><div className="d-flex justify-content-end"><Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button></div></Alert> );
    }
    if (!avenantData) {
         return ( <Alert variant="secondary" className="m-3 m-md-4">Aucune donnée disponible pour cet avenant.<Button variant="link" size="sm" onClick={onClose} className="float-end">Fermer</Button></Alert> );
    }

    const typeModifInfo = getTypeModificationInfo(avenantData.type_modification);

    // --- Main Content Render ---
    return (
        // V1 Container Style
        <div className="p-3 p-md-4 avenant-visualisation-container bg-light" style={{ borderRadius: '15px', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>

            {/* Header Section (V1 Style) */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-2">
                <h2 className="mb-0 fw-bold text-dark">
                     Détails Avenant: {displayData(avenantData.numero_avenant)}
                     {avenantData.convention && <small className='ms-2 fs-6 text-muted'> (Convention: {avenantData.convention.Code})</small>}
                </h2>
                <Button variant="warning" onClick={onClose} className="btn rounded-5 px-5 fw-bold py-1 bg-warning shadow-sm" aria-label="Fermer">
                     Revenir a la liste
                </Button>
            </div>

            {/* Main Info Row (Using V1 conditional column sizing) */}
            <Row className="g-3 mb-4">
                <Col md={avenantData.type_modification === 'partenaire' ? 12 : 6} lg={avenantData.type_modification === 'partenaire' ? 12 : 7}>
                    <Card className="h-100 border-light shadow-sm">
                        <Card.Header className="bg-light py-2 border-bottom-0">
                            <Card.Title as="h6" className="mb-0 fw-semibold text-secondary small text-uppercase">
                                <FontAwesomeIcon icon={faInfoCircle} className="me-2"/> Informations Générales
                            </Card.Title>
                        </Card.Header>
                        <Card.Body className="pt-2">
                            <ListGroup variant="flush">
                                {renderDetail("Code Avenant", avenantData.code, faInfoCircle)}
                            {renderDetail("N° Approbation", avenantData.numero_approbation, faInfoCircle)}
                            {renderDetail("Session", new Date(0, avenantData.session - 1).toLocaleString('fr', { month: 'long' }), faCalendarAlt)}
                            {renderDetail("Année", avenantData.annee_avenant, faCalendarAlt)}
                            {renderDetail("Statut", <Badge bg={statusInfo.color} text={statusInfo.textColor} pill>{statusInfo.label}</Badge>, faCheckCircle)}
                            {/* Conditionally render date_visa */}
                            {renderDetail("Date Visa", avenantData.date_visa, faCalendarAlt, { formatFunc: formatDate, conditionalCheck: () => avenantData?.statut === 'visé', highlight: true })}
                            <hr className="my-2"/>
                                {renderDetail("Convention Parent", avenantData.convention ? `${avenantData.convention?.Code} - ${avenantData.convention?.Intitule}` : '-', faFileSignature)}
                                {renderDetail("N° Avenant", avenantData.numero_avenant, faListAlt)}
                                {renderDetail("Date Signature", avenantData.date_signature, faCalendarAlt, { formatFunc: formatDate })}
                                {renderDetail("Type Modification", <Badge bg={typeModifInfo.color} text={typeModifInfo.textColor} pill>{typeModifInfo.label}</Badge>, faEdit)}
                                {/* --- ADDED: Fonctionnaire Display (from V1) --- */}
                                {renderDetail("Points Focaux", getFonctionnaireNames(avenantData.id_fonctionnaire), faUserTie)}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Conditional "Specific Modifications" Column (Using V1 logic) */}
                {avenantData.type_modification !== 'partenaire' && (
                    <Col md={6} lg={5}>
                        <Card className="h-100 border-light shadow-sm">
                             <Card.Header className="bg-light py-2 border-bottom-0">
                                 <Card.Title as="h6" className="mb-0 fw-semibold text-secondary small text-uppercase">
                                    <FontAwesomeIcon icon={faTags} className="me-2"/> Modifications Spécifiques
                                 </Card.Title>
                             </Card.Header>
                            <Card.Body className="pt-2">
                                <ListGroup variant="flush">
                                    {renderDetail("Montant Modifié", avenantData.montant_modifie, faMoneyBillWave, { formatFunc: formatCurrency, conditionalCheck: (v) => avenantData.type_modification === 'montant', highlight: true })}
                                    {renderDetail("Nouvelle Date Fin", avenantData.nouvelle_date_fin, faClock, { formatFunc: formatDate, conditionalCheck: (v) => avenantData.type_modification === 'durée', highlight: true })}
                                    {avenantData.type_modification !== 'montant' && avenantData.type_modification !== 'durée' && (
                                        <ListGroup.Item className="px-0 py-2 border-0">
                                            <span className="text-muted fst-italic small">Aucune modification spécifique de montant ou durée pour ce type.</span>
                                        </ListGroup.Item>
                                    )}
                                </ListGroup>
                            </Card.Body>
                        </Card>
                    </Col>
                )}
            </Row>

             {/* Row 2: Objet & Remarques (Using V1 renderTextBlock) */}
            <Row className="g-3 mb-4">
                 {renderTextBlock("Objet de l'Avenant", avenantData.objet, faAlignLeft)}
                 {renderTextBlock("Remarques", avenantData.remarques, faComments)}
            </Row>

            {/* Row 3: Partenaires Section (Merged Logic & Style) */}
             {(avenantData.partnerCommitments && avenantData.partnerCommitments.length > 0) && (
                 <Row className="mt-4 pt-3 border-top mx-md-3">
                    <Col xs={12}>
                        <h5 className="text-uppercase text-secondary fs-6 fw-semibold mb-3">
                            <FontAwesomeIcon icon={faUsers} className='me-2 text-secondary'/>
                            {/* V1 Title Logic */}
                            {avenantData.type_modification === 'partenaire'
                                ? `Partenaires Concernés par la Modification (${avenantData.partnerCommitments.length})`
                                : `Détails Partenaires Associés (${avenantData.partnerCommitments.length})`
                            }
                        </h5>
                        <ListGroup variant="flush" className='partner-details-list'>
                            {avenantData.partnerCommitments.map((commit, index) => (
                                <ListGroup.Item key={commit.Id_CP || `commit-${index}`} className="px-0 py-3 border-bottom-dashed"> {/* V1 dashed border */}
                                     <Row className="g-2 align-items-center">
                                         {/* Partner Name (Added faBuilding from V2, added Desc_Arr fallback from V2) */}
                                         <Col xs={12} md={5} className="fw-bold text-dark">
                                             <FontAwesomeIcon icon={faBuilding} className="me-2 text-warning"/>
                                             {commit.partenaire?.Description || commit.partenaire?.Description_Arr || `ID Partenaire: ${commit.Id_Partenaire}`}
                                         </Col>
                                         {/* Montant Convenu */}
                                         <Col xs={6} md={3}>
                                              <span className='text-muted small d-block'>Montant Convenu:</span>
                                              {formatCurrency(commit.Montant_Convenu)}
                                         </Col>
                                         {/* Signatory Status & Date */}
                                         <Col xs={6} md={4}>
                                            <span className='text-muted small d-block'>Signataire:</span>
                                            <FontAwesomeIcon
                                                icon={commit.is_signatory ? faCheckCircle : faTimesCircle}
                                                className={`me-1 ${commit.is_signatory ? 'text-success' : 'text-danger'}`}
                                                title={commit.is_signatory ? 'Signataire' : 'Non Signataire'}
                                            />
                                            {commit.is_signatory ? 'Oui' : 'Non'}
                                            {commit.is_signatory && commit.date_signature && (
                                                <span className='text-muted small ms-2'>({formatDate(commit.date_signature)})</span>
                                            )}
                                         </Col>
                                         {/* Signature Details */}
                                         {commit.is_signatory && commit.details_signature && (
                                             <Col xs={12} className='mt-1'>
                                                <p className='mb-0 text-muted small fst-italic'>
                                                    <span className='fw-medium'>Détails Signature:</span> {commit.details_signature}
                                                </p>
                                             </Col>
                                         )}
                                     </Row>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Col>
                </Row>
             )}

            {/* Row 4: Fichiers Section (Using V1 structure & styling) */}
            <Row className="mt-4 pt-3 border-top mx-md-3">
                <Col xs={12}>
                    <h5 className="text-uppercase text-secondary fs-6 fw-semibold mb-3">
                        <FontAwesomeIcon icon={faPaperclip} className='me-2 text-secondary'/>
                        Fichiers Associés ({avenantData.documents.length})
                    </h5>
                    {avenantData.documents.length > 0 ? (
                        <ListGroup variant="" className=" d-flex flex-row flex-wrap justify-content-center">
                            {avenantData.documents.map(doc => {
                                // Use V1's appBaseUrl logic
                                const fileUrl = appBaseUrl && doc.file_path ? `${appBaseUrl}/${doc.file_path.replace(/^\//, '')}` : doc.fichier_url;
                                const filename = doc.file_name || 'Fichier sans nom';
                                const fileIcon = getFileIcon(filename);
                                return (
                                     <ListGroup.Item key={doc.Id_Doc} className="px-3 rounded-4 m-2 py-2 d-flex justify-content-between align-items-center bg-dark text-white"> {/* V1 Style */}
                                         <div>
                                             <FontAwesomeIcon icon={fileIcon} className='me-2 text-warning'/>
                                             <span className="text-truncate" title={filename} style={{maxWidth: 'calc(100% - 50px)'}}>{filename}</span>
                                         </div>
                                         {fileUrl ? (
                                             <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-warning ms-2 py-0 px-2" title={`Voir / Télécharger ${filename}`}>
                                                 <FontAwesomeIcon icon={faDownload} />
                                             </a>
                                         ) : <Badge bg="light" text="muted" className='border'>(Lien Indisponible)</Badge>}
                                     </ListGroup.Item>
                                );
                             })}
                        </ListGroup>
                    ) : (
                       <p className="text-muted fst-italic small">Aucun fichier associé à cet avenant.</p>
                    )}
                </Col>
            </Row>

        </div> // End Main Container
    );
};

// --- PropTypes (Add baseApiUrl) ---
AvenantVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string, // Add prop type
};

// Default Props (Add baseApiUrl)
AvenantVisualisation.defaultProps = {
     baseApiUrl: 'http://localhost:8000/api',
};

export default AvenantVisualisation;