import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faTimes, faFilePdf, faFileWord,
    faFileExcel, faFileImage, faFileAlt, faCalendarAlt, faInfoCircle,
    faEdit, faTags, faMoneyBillWave, faClock, faFileSignature, faListAlt,
    faAlignLeft, faComments, faPaperclip, faDownload, faBuilding,
    faCheckCircle, faTimesCircle,
    faUserTie, faUsers, faChevronUp, faChevronDown, faGift,
    faCalculator // ADDED ICON
} from '@fortawesome/free-solid-svg-icons';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Collapse from 'react-bootstrap/Collapse';
import Alert from 'react-bootstrap/Alert';
import PropTypes from 'prop-types';
import Spinner from 'react-bootstrap/Spinner';
import Badge from 'react-bootstrap/Badge';
import ListGroup from 'react-bootstrap/ListGroup';
import Stack from 'react-bootstrap/Stack';

// --- Helper Functions ---
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
const formatCurrency = (amount, showSign = false) => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '-';
    const number = parseFloat(amount);
    const options = { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 };
    // MODIFIED: Logic to show a plus sign for positive numbers if requested
    if (showSign && number > 0) {
        return `+${number.toLocaleString('fr-MA', options)}`;
    }
    return number.toLocaleString('fr-MA', options);
};

const displayData = (data, fallback = '-') => (data !== null && data !== undefined && String(data).trim() !== '') ? data : fallback;
const getStatusColor = (statusValue) => {
    const statuses = {
         "approuvé": "success", "non visé": "danger",
        "en cours de visa": "warning", "visé": "info", "signé": "primary"
    };
    return statuses[statusValue] || "light";
};
const STATUT_OPTIONS = [
    { value: "approuvé", label: "Approuvé" },
    { value: "non visé", label: "Non Visé" },
    { value: "en cours de visa", label: "En Cours de Visa" },
    { value: "visé", label: "Visé" },
    { value: "signé", label: "Signé" },
];
const typeModificationOptions = [
    { value: 'montant', label: 'Modification Montant' },
    { value: 'durée', label: 'Modification Durée' },
    { value: 'partenaire', label: 'Modification Partenaire(s)' },
    { value: 'technique_administratif', label: 'Technique Administratif' },
    { value: 'autre', label: 'Autre Modification' },
];

const renderMultipleTypeModifications = (typeValue) => {
    const typeArray = Array.isArray(typeValue) ? typeValue : [typeValue];
    if (!typeArray || typeArray.length === 0) {
        return <Badge bg="light" text="dark" pill>Non défini</Badge>;
    }
    return (
        <div className="d-flex flex-wrap gap-1">
            {typeArray.map((type, index) => {
                const option = typeModificationOptions.find(opt => opt.value === type);
                const label = option ? option.label : type;
                let color = 'light';
                switch (type) {
                    case 'montant': color = 'success'; break;
                    case 'durée': color = 'info'; break;
                    case 'partenaire': color = 'warning'; break;
                    case 'autre': color = 'secondary'; break;
                    case 'technique_administratif': color = 'primary'; break;
                }
                const textColor = ['warning', 'light'].includes(color) ? 'dark' : 'white';
                return ( <Badge key={index} bg={color} text={textColor} pill>{label}</Badge> );
            })}
        </div>
    );
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
const AvenantVisualisation = ({ itemId, onClose, baseApiUrl = 'http://localhost:8000/api' }) => {
    const [avenantData, setAvenantData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]);
    const [openPartnerId, setOpenPartnerId] = useState(null);

    const handleTogglePartner = (partnerId) => {
        setOpenPartnerId(currentOpenId => (currentOpenId === partnerId ? null : partnerId));
    };

    const statusLabel = STATUT_OPTIONS.find(opt => opt.value === avenantData?.statut)?.label || avenantData?.statut;
    const statusInfo = {
        label: displayData(statusLabel),
        color: getStatusColor(avenantData?.statut),
        textColor: ['warning', 'light'].includes(getStatusColor(avenantData?.statut)) ? 'dark' : 'white'
    };
    const appBaseUrl = useMemo(() => {
        if (!baseApiUrl) { console.error("AvenantVisualisation: baseApiUrl prop is missing!"); return ''; }
        try { return baseApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, ''); }
        catch (e) { console.error("AvenantVisualisation: Error processing baseApiUrl:", e); return ''; }
    }, [baseApiUrl]);

    const fetchData = useCallback(async () => {
        if (!itemId) { setError("ID d'avenant manquant."); setLoading(false); return; }
        if (!baseApiUrl) { setError("URL d'API (baseApiUrl) manquante."); setLoading(false); return; }

        setLoading(true); setError(null); setAvenantData(null);
        setFonctionnairesList([]);

        try {
            const avenantRes = await axios.get(`${baseApiUrl}/avenants/${itemId}`, {
                 params: { include: 'convention,documents,partnerCommitments.partenaire,partnerCommitments.engagementsAnnuels' },
                 withCredentials: true
            });
            const data = avenantRes.data.avenant || avenantRes.data;

            if (data && typeof data === 'object' && data.id) {
                 data.documents = Array.isArray(data.documents) ? data.documents : [];
                 data.partnerCommitments = data.partner_commitments || [];
                 setAvenantData(data);

                 try {
                     const foncRes = await axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true })
                     const foncData = foncRes.data.fonctionnaires || foncRes.data || [];
                     setFonctionnairesList(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID: ${f.id}` })));
                 } catch (foncError) {
                     console.warn("[Avenant Visu] Could not fetch fonctionnaires list:", foncError.message);
                 }

            } else {
                throw new Error(`Aucune donnée trouvée ou format invalide pour l'avenant ID ${itemId}.`);
            }
        } catch (err) {
             const errorMsg = err.response?.data?.message || err.response?.statusText || err.message || `Erreur de chargement (ID: ${itemId}).`;
             setError(errorMsg + (err.response ? ` (Status: ${err.response?.status})` : ''));
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) {
            return displayData(null);
        }
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) { return displayData(null); }

        return (
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
    }, [fonctionnairesList]);


    const renderYearlyBreakdown = (engagements) => {
        if (!engagements || engagements.length === 0) {
            return ( <div className="text-center text-muted fst-italic small py-2"> Aucune répartition annuelle prévisionnelle n'a été fournie.</div> );
        }
        const sortedEngagements = [...engagements].sort((a, b) => a.annee - b.annee);
        return (
           <div className="mt-2 yearly-breakdown-container pt-3">
            <div className="d-flex justify-content-between border border-light border-1 px-3 py-2 mb-2 rounded-5 bg-white">
                <h6 className="text-secondary small fw-bold mb-0">Année</h6>
                <h6 className="text-secondary small fw-bold mb-0">Montant Prévisionnel</h6>
            </div>
            <div className=" rounded-4 border border-light bg-white ">
                {sortedEngagements.map(({ annee, montant_prevu }, index) => (
                    <React.Fragment key={annee}>
                        <div className={`d-flex justify-content-between m-2 align-items-center px-2`}>
                            <span className="fw-medium text-dark">{annee}</span>
                            <span className="fw-bold text-dark">{formatCurrency(montant_prevu)}</span>
                        </div>
                        {index < sortedEngagements.length - 1 && <hr className="py-0 my-0 mx-4 px-2 text-light"/>}
                    </React.Fragment>
                ))}
            </div>
        </div>
        );
    };

    const renderDetail = (label, value, icon = faInfoCircle, options = {}) => {
        const { formatFunc, conditionalCheck = () => true, highlight = false, isRawHtml = false, rawValue = null } = options;
        const valueToCheck = rawValue !== null ? rawValue : value;
        if (!conditionalCheck(valueToCheck)) return null;

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
                 <Card className="border-light shadow-sm">
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

    if (loading) { return ( <div className="text-center p-5"><Spinner animation="border" variant="primary" /> <span className="ms-3 text-muted">Chargement...</span></div> ); }
    if (error) { return ( <Alert variant="danger" className="m-3 m-md-4"><Alert.Heading><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> Erreur</Alert.Heading><p>{error}</p><hr /><div className="d-flex justify-content-end"><Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button></div></Alert> ); }
    if (!avenantData) { return ( <Alert variant="secondary" className="m-3 m-md-4">Aucune donnée disponible pour cet avenant.<Button variant="link" size="sm" onClick={onClose} className="float-end">Fermer</Button></Alert> ); }

    // --- Main Content Render ---
    return (
        <div className="p-3 p-md-4 avenant-visualisation-container bg-light" style={{ borderRadius: '15px', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>

            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-2">
                <h2 className="mb-0 fw-bold text-dark">
                     Détails Avenant: {displayData(avenantData.numero_avenant)}
                     {avenantData.convention && <small className='ms-2 fs-6 text-muted'> (Convention: {avenantData.convention.Code})</small>}
                </h2>
                <Button variant="warning" onClick={onClose} className="btn rounded-5 px-5 fw-bold py-1 bg-warning shadow-sm" aria-label="Fermer">
                     Revenir a la liste
                </Button>
            </div>
            
            <Row className="g-3 mb-4">
                <Col>
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
                                {renderDetail("Session", avenantData.session ? new Date(0, avenantData.session - 1).toLocaleString('fr', { month: 'long' }) : '-', faCalendarAlt)}
                                {renderDetail("Année", avenantData.annee_avenant, faCalendarAlt)}
                                {renderDetail("Statut", <Badge bg={statusInfo.color} text={statusInfo.textColor} pill>{statusInfo.label}</Badge>, faCheckCircle)}
                                {renderDetail("Date Visa", avenantData.date_visa, faCalendarAlt, { formatFunc: formatDate, conditionalCheck: (val) => val && avenantData?.statut === 'visé', highlight: true, rawValue: avenantData.date_visa })}
                                <hr className="my-2"/>
                                {renderDetail("Convention Parent", avenantData.convention ? `${avenantData.convention?.Code} - ${avenantData.convention?.Intitule}` : '-', faFileSignature)}
                                {renderDetail("N° Avenant", avenantData.numero_avenant, faListAlt)}
                                {renderDetail("Date Signature", avenantData.date_signature, faCalendarAlt, { formatFunc: formatDate })}
                                {renderDetail("Type Modification", renderMultipleTypeModifications(avenantData.type_modification), faEdit)}
                                {renderDetail("Points Focaux", getFonctionnaireNames(avenantData.id_fonctionnaire), faUserTie, { conditionalCheck: (val) => val && val.length > 0, rawValue: avenantData.id_fonctionnaire })}
                            </ListGroup>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* --- MODIFIED: Specific Modifications Section with Financial Breakdown --- */}
            <Row className="g-3 mb-4">
                {((Array.isArray(avenantData.type_modification) && (avenantData.type_modification.includes('montant') || avenantData.type_modification.includes('durée')))) && (
                    <Col>
                        <Card className="h-100 border-light shadow-sm">
                             <Card.Header className="bg-light py-2 border-bottom-0">
                                 <Card.Title as="h6" className="mb-0 fw-semibold text-secondary small text-uppercase">
                                    <FontAwesomeIcon icon={faTags} className="me-2"/> Modifications Spécifiques
                                 </Card.Title>
                             </Card.Header>
                            <Card.Body className="pt-2">
                                <ListGroup variant="flush">
                                    {/* Montant Breakdown */}
                                    {renderDetail("Montant Initial Convention", formatCurrency(avenantData.convention?.Cout_Global), faMoneyBillWave, { conditionalCheck: () => Array.isArray(avenantData.type_modification) && avenantData.type_modification.includes('montant') })}
                                    {renderDetail("Variation de l'Avenant", formatCurrency(avenantData.montant_avenant, true), faCalculator, { conditionalCheck: () => Array.isArray(avenantData.type_modification) && avenantData.type_modification.includes('montant'), highlight: true })}
                                    {renderDetail(<b>Nouveau Montant Global</b>, <b>{formatCurrency(avenantData.montant_modifie)}</b>, faMoneyBillWave, { conditionalCheck: () => Array.isArray(avenantData.type_modification) && avenantData.type_modification.includes('montant') })}
                                    
                                    {/* Separator if both types exist */}
                                    {(avenantData.type_modification.includes('montant') && avenantData.type_modification.includes('durée')) && <hr className="my-2"/>}

                                    {/* Duration Modification */}
                                    {renderDetail("Nouvelle Date Fin", avenantData.nouvelle_date_fin, faClock, { formatFunc: formatDate, conditionalCheck: () => Array.isArray(avenantData.type_modification) && avenantData.type_modification.includes('durée'), highlight: true })}
                                </ListGroup>
                            </Card.Body>
                        </Card>
                    </Col>
                )}
            </Row>

            <Row className="g-3 mb-4">
                 {renderTextBlock("Objet de l'Avenant", avenantData.objet, faAlignLeft)}
                 {renderTextBlock("Remarques", avenantData.remarques, faComments)}
            </Row>

            {(avenantData.partnerCommitments && avenantData.partnerCommitments.length > 0) && (
                 <Row className="mt-4 pt-3 border-top mx-md-3">
                    <Col xs={12}>
                        <h5 className="text-uppercase text-secondary fs-6 fw-semibold mb-3 ">
                            <FontAwesomeIcon icon={faUsers} className='me-2 text-secondary'/>
                            { (Array.isArray(avenantData.type_modification) && avenantData.type_modification.includes('partenaire'))
                                ? `Partenaires Concernés par la Modification (${avenantData.partnerCommitments.length})`
                                : `Détails Partenaires Associés (${avenantData.partnerCommitments.length})`
                            }
                        </h5>
                        <ListGroup variant="flush" className=' p-2 d-flex flex-column align-items-between'>
                            {avenantData.partnerCommitments.map((commit, index) => (
                                <ListGroup.Item key={commit.Id_CP || `commit-${index}`} className="px-2 py-3 m-2  border border-1 rounded-3">
                                     <Row className="g-2 align-items-center p-2">
                                         <Col xs={12} md={5} className="fw-bold text-dark">
                                             <FontAwesomeIcon icon={faBuilding} className="me-2 text-warning"/>
                                             {commit.partenaire?.Description || commit.partenaire?.Description_Arr || `ID Partenaire: ${commit.Id_Partenaire}`}
                                         </Col>
                                         <Col xs={12} md={7}>
                                            {commit.autre_engagement ? (
                                                <div className="p-2 rounded-3 bg-light shadow-sm">
                                                    <div className="d-flex align-items-center">
                                                        <FontAwesomeIcon icon={faGift} className="me-2 text-info" />
                                                        <span className="mb-0 fw-medium fst-italic text-dark">{commit.autre_engagement}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Row>
                                                    <Col xs={6}>
                                                        <span className='text-muted small d-block'>Montant Convenu:</span>
                                                        {formatCurrency(commit.Montant_Convenu)}
                                                    </Col>
                                                    <Col xs={6}>
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
                                                </Row>
                                            )}
                                         </Col>
                                         
                                         {commit.is_signatory && commit.details_signature && (
                                             <Col xs={12} className='mt-2'>
                                                <p className='mb-0 text-muted small fst-italic bg-light p-2 rounded'>
                                                    <span className='fw-medium'>Détails Signature:</span> {commit.details_signature}
                                                </p>
                                             </Col>
                                         )}

                                        {commit.engagements_annuels && commit.engagements_annuels.length > 0 && (
                                            <Col xs={12} className="mt-3 border-top pt-2">
                                                <Button
                                                    onClick={() => handleTogglePartner(commit.Id_CP)}
                                                    variant="link"
                                                    className="d-flex justify-content-between align-items-center w-100 text-decoration-none p-0"
                                                    aria-controls={`collapse-partner-${commit.Id_CP}`}
                                                    aria-expanded={openPartnerId === commit.Id_CP}
                                                >
                                                    <h6 className="small fw-bold text-dark  mb-0">
                                                        Répartition Annuelle
                                                    </h6>
                                                    <FontAwesomeIcon
                                                        icon={openPartnerId === commit.Id_CP ? faChevronUp : faChevronDown}
                                                        className="text-muted"
                                                    />
                                                </Button>
                                                <Collapse in={openPartnerId === commit.Id_CP}>
                                                    <div id={`collapse-partner-${commit.Id_CP}`}>
                                                        {renderYearlyBreakdown(commit.engagements_annuels)}
                                                    </div>
                                                </Collapse>
                                            </Col>
                                        )}
                                     </Row>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Col>
                </Row>
             )}

            <Row className="mt-4 pt-3 border-top mx-md-3">
                <Col xs={12}>
                    <h5 className="text-uppercase text-secondary fs-6 fw-semibold mb-3">
                        <FontAwesomeIcon icon={faPaperclip} className='me-2 text-secondary'/>
                        Fichiers Associés ({avenantData.documents.length})
                    </h5>
                    {avenantData.documents.length > 0 ? (
                        <ListGroup variant="" className=" d-flex flex-row flex-wrap justify-content-center">
                            {avenantData.documents.map(doc => {
                                const fileUrl = appBaseUrl && doc.file_path ? `${appBaseUrl}/storage/${doc.file_path.replace(/^\//, '')}` : doc.fichier_url;
                                const filename =doc.Intitule || doc.file_name ||  'Fichier sans nom';
                                const fileIcon = getFileIcon(filename);
                                return (
                                     <ListGroup.Item key={doc.Id_Doc} className="px-3 rounded-4 m-2 py-2 d-flex justify-content-between align-items-center bg-dark text-white">
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

        </div>
    );
};

AvenantVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string,
};

AvenantVisualisation.defaultProps = {
     baseApiUrl: 'http://localhost:8000/api',
};

export default AvenantVisualisation;