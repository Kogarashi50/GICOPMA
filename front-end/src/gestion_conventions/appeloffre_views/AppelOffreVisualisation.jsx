import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Spinner, Alert, Badge, Button, Row, Col, Stack, Card, Popover, OverlayTrigger } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faToggleOn, faToggleOff, faInfoCircle, faCalendarAlt, faTag, faMoneyBillWave,
    faClock, faMapMarkedAlt, faUsers, faUserTie, faPaperclip, faFilePdf,
    faFileWord, faFileExcel, faFileImage, faFileAlt, faExternalLinkAlt
} from '@fortawesome/free-solid-svg-icons';
import '../marches_views/marche.css';

// --- Helpers (unchanged) ---
const formatDate = (dateString) => {
    if (!dateString) return '-';
    const datePart = dateString.split(' ')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return dateString;
    return new Date(datePart + 'T00:00:00Z').toLocaleDateString('fr-CA');
};
const formatCurrency = (value) => {
    if (value == null || isNaN(Number(value))) return '-';
    return parseFloat(value).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' });
};
const renderBooleanStatus = (value) => {
    return value ?
        <Badge bg="success" text="white"><FontAwesomeIcon icon={faToggleOn} className="me-1" /> Oui</Badge> :
        <Badge bg="secondary" text="white"><FontAwesomeIcon icon={faToggleOff} className="me-1" /> Non</Badge>;
};
const displayData = (data, fallback = '-') => data ?? fallback;
const getFileIcon = (filename) => {
    if (!filename) return faFileAlt;
    const lowerCase = String(filename).toLowerCase();
    if (lowerCase.endsWith('.pdf')) return faFilePdf;
    if (lowerCase.endsWith('.doc') || lowerCase.endsWith('.docx')) return faFileWord;
    if (lowerCase.endsWith('.xls') || lowerCase.endsWith('.xlsx')) return faFileExcel;
    if (['.jpg', '.jpeg', '.png', '.gif'].some(ext => lowerCase.endsWith(ext))) return faFileImage;
    return faFileAlt;
};
// --- End Helpers ---

const AppelOffreVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [appelOffreData, setAppelOffreData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]);

    const fetchAppelOffreAndFonctionnaires = useCallback(async () => {
        if (!itemId) { setError("ID manquant."); setLoading(false); return; }
        setLoading(true); setError(null);
        try {
            const [aoRes, foncRes] = await Promise.all([
                axios.get(`${baseApiUrl}/appel-offres/${itemId}`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true })
            ]);
            setAppelOffreData(aoRes.data);
            setFonctionnairesList(foncRes.data.fonctionnaires || foncRes.data || []);
        } catch (err) {
            setError(err.response?.data?.message || err.message || "Erreur de chargement.");
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]);

    useEffect(() => {
        fetchAppelOffreAndFonctionnaires();
    }, [fetchAppelOffreAndFonctionnaires]);

    const fonctionnaireMap = useMemo(() => {
        return new Map(fonctionnairesList.map(f => [String(f.id), f.nom_complet]));
    }, [fonctionnairesList]);

    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString) return <span className="value fst-italic text-muted">-</span>;
        const ids = String(fonctionnaireIdString).split(';').map(id => id.trim()).filter(Boolean);
        if (ids.length === 0) return <span className="value fst-italic text-muted">-</span>;
        return (
            <Stack direction="horizontal" gap={1} className="flex-wrap">
                {ids.map(id => (
                    <Badge key={id} pill bg="light" text="dark" className="border">
                        <FontAwesomeIcon icon={faUserTie} className="me-1" />
                        {fonctionnaireMap.get(id) || `ID ${id} inconnu`}
                    </Badge>
                ))}
            </Stack>
        );
    }, [fonctionnaireMap]);

    const renderDetail = (label, value, formatter, icon) => {
        const hasValue = value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0);
        if (!hasValue && value !== 0) return null;

        return (
            <Col xs={12} md={6} lg={4} className="mb-3 data-point">
                <strong className="text-dark d-block label">
                    {icon && <FontAwesomeIcon icon={icon} className="me-2 text-secondary" />}
                    {label}
                </strong>
                <div className="value mt-1">
                    {formatter ? formatter(value) : (Array.isArray(value) ? value.map((v, i) => <Badge key={i} pill bg="light" text="dark" className="me-1 border">{v}</Badge>) : displayData(value))}
                </div>
            </Col>
        );
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /><span> Chargement des détails...</span></div>;
    if (error) return <Alert variant="danger" className="m-3">Erreur: {error}</Alert>;
    if (!appelOffreData) return <Alert variant="warning" className="m-3">Aucune donnée trouvée (ID: {itemId}).</Alert>;

    const filePopover = (file) => (
        <Popover id={`popover-file-${file.id}`} style={{ maxWidth: '350px' }}>
            <Popover.Header as="h3" className='small fw-bold'>{displayData(file.intitule, "Détails du Fichier")}</Popover.Header>
            <Popover.Body>
                <p className='small mb-1'><strong>Fichier Original:</strong> <span className='text-muted'>{displayData(file.nom_fichier)}</span></p>
                {/* --- THIS IS THE FIX --- */}
                <p className='small mb-0'><strong>Catégorie:</strong> <Badge bg="secondary" pill>{displayData(file.categorie?.label, 'Non classé')}</Badge></p>
            </Popover.Body>
        </Popover>
    );

    return (
        <div className='px-4'>
            <div className="d-flex justify-content-between align-items-start mb-4 px-5 pt-5 border-bottom holder pb-1">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">Détails</h5>
                    <h2 className="mb-1 fw-bold text-dark">Appel d'Offre : {appelOffreData.numero}</h2>
                </div>
                {onClose && <Button variant="warning" onClick={onClose} title="Fermer" className="px-5 border-0 rounded-5 shadow-sm"><b>Revenir a la liste</b></Button>}
            </div>
            <div className="px-5 pb-3 holder">
                <Row className="mb-4 pb-3 border-bottom data-section">
                    <Col xs={12} className="data-point text-center bg-light shadow-sm p-3 rounded-pill">
                        <strong className="text-dark d-block label">Intitulé</strong>
                        <p className="value lead mb-0">{appelOffreData.intitule || '-'}</p>
                    </Col>
                </Row>
                <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Informations Clés</h5>
                <Row className="mb-4 pb-3 border-bottom data-section">
                    {renderDetail("Catégorie", appelOffreData.categorie, null, faTag)}
                    {renderDetail("Province(s)", appelOffreData.provinces, null, faMapMarkedAlt)}
                    {renderDetail("Estimation TTC", appelOffreData.estimation, formatCurrency, faMoneyBillWave)}
                    {renderDetail("Estimation HT", appelOffreData.estimation_HT, formatCurrency, faMoneyBillWave)}
                    {renderDetail("Montant TVA", appelOffreData.montant_TVA, formatCurrency, faMoneyBillWave)}
                    {renderDetail("Durée Exécution (jours)", appelOffreData.duree_execution, null, faClock)}
                </Row>
                <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Dates Importantes</h5>
                <Row className="mb-4 pb-3 border-bottom data-section">
                    {renderDetail("Date Publication", appelOffreData.date_publication, formatDate, faCalendarAlt)}
                    {renderDetail("Date Vérification", appelOffreData.date_verification, formatDate, faCalendarAlt)}
                    {renderDetail("Date Ouverture Plis", appelOffreData.date_ouverture, formatDate, faCalendarAlt)}
                    {renderDetail("Dernière Session OP", appelOffreData.last_session_op, formatDate, faCalendarAlt)}
                </Row>
                <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Statut & Points Focaux</h5>
                <Row className="mb-3 pb-3 border-bottom data-section align-items-center">
                    {renderDetail("Lancé sur Portail", appelOffreData.lancement_portail, renderBooleanStatus)}
                    {appelOffreData.lancement_portail && renderDetail("Date Lancement Portail", appelOffreData.date_lancement_portail, formatDate, faCalendarAlt)}
                    <Col xs={12} lg={8} className="mb-3 data-point">
                        <strong className="text-dark d-block label"><FontAwesomeIcon icon={faUsers} className="me-2 text-secondary" />Points Focaux</strong>
                        <div className="value mt-1">{getFonctionnaireNames(appelOffreData.id_fonctionnaire)}</div>
                    </Col>
                </Row>
                <h5 className="mb-3 mt-4 section-title text-uppercase fw-bold text-secondary"><FontAwesomeIcon icon={faPaperclip} className="me-2" />Pièces Jointes</h5>
                {appelOffreData.fichiers?.length > 0 ? (
                    <Card><Card.Body><div className="d-flex flex-wrap" style={{ gap: '0.75rem' }}>
                        {appelOffreData.fichiers.map(file => (
                            <OverlayTrigger trigger={['hover', 'focus']} placement="top" overlay={filePopover(file)} key={file.id}>
                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                    <div className="border rounded p-2 d-flex align-items-center bg-dark text-white shadow-sm" style={{ minWidth: '220px', cursor: 'pointer' }}>
                                        <FontAwesomeIcon icon={getFileIcon(file.nom_fichier)} className="me-2 fa-lg text-warning" />
                                        <span className="me-auto small text-truncate" title={file.intitule}>{displayData(file.intitule, 'Fichier')}</span>
                                        {file.url && <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" className="ms-2" />}
                                    </div>
                                </a>
                            </OverlayTrigger>
                        ))}
                    </div></Card.Body></Card>
                ) : (
                    <Alert variant='secondary' className='small py-2'><FontAwesomeIcon icon={faInfoCircle} className="me-2" /> Aucune pièce jointe.</Alert>
                )}
            </div>
        </div>
    );
};

AppelOffreVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func,
    baseApiUrl: PropTypes.string.isRequired,
};

export default AppelOffreVisualisation;