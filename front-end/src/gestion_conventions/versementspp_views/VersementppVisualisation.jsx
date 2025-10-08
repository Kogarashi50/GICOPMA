import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faCalendarAlt, faEuroSign, faProjectDiagram, // Using faEuroSign for MAD consistency
    faUsers, faReceipt, faInfoCircle, faStickyNote, faCreditCard // Added icons
} from '@fortawesome/free-solid-svg-icons';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import PropTypes from 'prop-types';
import Spinner from 'react-bootstrap/Spinner';

// --- Helpers (Reuse or centralize) ---
const formatCurrency = (value) => { const n = parseFloat(value); return isNaN(n)?'-':n.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const displayData = (data, fallback = '-') => data ?? fallback;
const formatDateSimple = (dateString) => { if (!dateString) return '-'; try { if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) { return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' }); } const d=new Date(dateString); return isNaN(d.getTime())?dateString:d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' }); } catch (e) { return dateString; } };
// --- End Helpers ---

// --- Styles/Classes (Reuse or define consistent ones) ---
const VISUALISATION_CONTAINER_CLASS = "p-3 p-md-4 versement-visualisation-container";
const VISUALISATION_CLOSE_BUTTON_CLASS = 'float-end py-2 rounded-5 shadow fw-bold px-5';
const CARD_CLASS = "h-100 border-light shadow-sm";
const CARD_TITLE_CLASS = "mb-3 fw-semibold text-secondary text-uppercase small";
const DL_CLASS = "row mb-0 dl-compact";
const DT_CLASS = "col-sm-5 fw-bold text-dark";
const DD_CLASS = "col-sm-7";
// --- End Styles/Classes ---


const VersementPPVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [versementData, setVersementData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchVersement = useCallback(async () => {
        if (!itemId || !baseApiUrl) {
            setError("ID Versement ou URL API manquant.");
            setLoading(false);
            return;
        }
        setLoading(true); setError(null); setVersementData(null);

        // Ensure the controller's `show` method eager loads relationships
        const fetchUrl = `${baseApiUrl}/versementspp/${itemId}`;
        try {
            console.log(`Fetching versement data from: ${fetchUrl}`);
            const response = await axios.get(fetchUrl, { withCredentials: true });
            const data = response.data.versement || response.data;
            console.log("Received versement data:", data);

            if (data && typeof data === 'object' && data.engagement_financier?.projet && data.engagement_financier?.partenaire) {
                 setVersementData(data);
            } else {
                 console.error("Format de données invalide reçu ou relations manquantes pour ID", itemId, data);
                 setError(`Format de données invalide ou relations (engagement, projet, partenaire) manquantes pour ID ${itemId}.`);
            }
        } catch (err) {
            console.error("Error fetching versement:", err.response || err);
            const eMsg = err.response?.data?.message || err.message || 'Erreur inconnue';
            setError(`Erreur chargement: ${eMsg} (Status: ${err.response?.status})`);
        }
        finally { setLoading(false); }
    }, [itemId, baseApiUrl]);

    useEffect(() => { fetchVersement(); }, [fetchVersement]);

    // --- Render Logic ---
    if (loading) { return <div className="text-center p-5 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}><Spinner animation="border" variant="primary" className="me-3"/><span className="text-muted">Chargement du versement...</span></div>; }
    if (error) { return <Alert variant="danger" className="m-3 m-md-4"><Alert.Heading><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> Erreur</Alert.Heading><p>{error}</p><hr/><Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button></Alert>; }
    if (!versementData) { return <Alert variant="warning" className="m-3 m-md-4">Aucune donnée disponible pour ce versement (ID: {itemId}).<Button variant="link" size="sm" onClick={onClose} className="float-end">Fermer</Button></Alert>; }

    const { engagement_financier } = versementData;
    const { projet, partenaire } = engagement_financier;

    return (
        <div className={VISUALISATION_CONTAINER_CLASS}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">Détails du Versement</h5>
                    <h2 className="mb-0 fw-bold">Versement ID: {displayData(versementData.id)}</h2>
                 </div>
                 <Button variant="warning" size="sm" onClick={onClose} className={VISUALISATION_CLOSE_BUTTON_CLASS} aria-label="Fermer">Revenir à la liste</Button>
             </div>

            {/* Main Content Grid */}
            <Row className="g-3">

                {/* Card 1: Versement Details */}
                <Col md={6} lg={6}>
                    <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}><FontAwesomeIcon icon={faReceipt} className="me-2"/> Informations Versement</Card.Title>
                            <dl className={DL_CLASS}>
                                 <dt className={DT_CLASS}><FontAwesomeIcon icon={faCalendarAlt} className="me-1 text-muted"/> Date Versement:</dt>
                                 <dd className={DD_CLASS}>{formatDateSimple(versementData.date_versement)}</dd>

                                 <dt className={DT_CLASS}><FontAwesomeIcon icon={faEuroSign} className="me-1 text-muted"/> Montant Versé:</dt>
                                 <dd className={`${DD_CLASS} fw-bold text-success`}>{formatCurrency(versementData.montant_verse)}</dd>

                                </dl>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Card 2: Associated Engagement/Project/Partner */}
                <Col md={6} lg={6}>
                     <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}><FontAwesomeIcon icon={faProjectDiagram} className="me-2"/> Contexte</Card.Title>
                             <dl className={DL_CLASS}>
                                <dt className={DT_CLASS}><FontAwesomeIcon icon={faProjectDiagram} className="me-1 text-muted"/> Projet:</dt>
                                <dd className={DD_CLASS} title={projet?.Nom_Projet}>{displayData(projet?.Code_Projet)} - {displayData(projet?.Nom_Projet)}</dd>

                                 <dt className={DT_CLASS}><FontAwesomeIcon icon={faUsers} className="me-1 text-muted"/> Partenaire:</dt>
                                 <dd className={DD_CLASS} title={partenaire?.Description||partenaire?.Description_Arr}>{displayData(partenaire?.Code)} - {displayData(partenaire?.Description||partenaire?.Description_Arr)}</dd>

                                 <dt className={DT_CLASS}><FontAwesomeIcon icon={faEuroSign} className="me-1 text-muted"/> Montant Engagé:</dt>
                                 <dd className={`${DD_CLASS} text-info`}>{formatCurrency(engagement_financier?.montant_engage)}</dd>

                                 <dt className={DT_CLASS}><FontAwesomeIcon icon={faStickyNote} className="me-1 text-muted"/> Engagement ID:</dt>
                                 <dd className={DD_CLASS}>{displayData(engagement_financier?.id)}</dd>
                             </dl>
                        </Card.Body>
                    </Card>
                </Col>

                 {/* Card 3: Commentaire */}
                 <Col md={12}>
                    <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}><FontAwesomeIcon icon={faStickyNote} className="me-2"/> Commentaire</Card.Title>
                            <p className="small mb-0">{displayData(versementData.commentaire, "Aucun commentaire.")}</p>
                        </Card.Body>
                    </Card>
                 </Col>

            </Row>
        </div>
    );
};

// --- Proptypes ---
VersementPPVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, // Versement ID
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

export default VersementPPVisualisation;