import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Card, Row, Col, Spinner, Alert, Button, ProgressBar, ListGroup, Form, Collapse } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTimes, faFileContract, faHandshake, faCalendarAlt, faReceipt, faCommentDots, 
    faPiggyBank, faBullseye, faListCheck, faMoneyBillWave, faLandmark 
} from '@fortawesome/free-solid-svg-icons';

// --- Helpers ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString + 'T00:00:00Z');
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
    } catch (e) { return dateString; }
};

const formatCurrency = (amount) => {
    const number = parseFloat(amount);
    if (isNaN(number)) return 'N/A';
    return number.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
};
// --- End Helpers ---

// Helper component for rendering Label-Value pairs
const DetailItem = ({ label, value, isTextArea = false, icon }) => {
    if (value == null || value === '' || value === 'N/A') return null;
    return (
        <div className="mb-3 d-flex">
            {icon && <FontAwesomeIcon icon={icon} className="text-secondary me-3 fa-fw mt-1" title={label} />}
            <div>
                <span className="fw-bold small d-block">{label}:</span>
                <span className="text-muted small" style={{ whiteSpace: isTextArea ? 'pre-wrap' : 'normal' }}>{value}</span>
            </div>
        </div>
    );
};
DetailItem.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), isTextArea: PropTypes.bool, icon: PropTypes.object };


const VersementVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    // States for data
    const [versement, setVersement] = useState(null);
    const [financialSummary, setFinancialSummary] = useState(null);
    
    // States for loading/error
    const [isLoading, setIsLoading] = useState(true);
    const [isSummaryLoading, setIsSummaryLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- NEW: State to toggle between views ---
    const [showDashboard, setShowDashboard] = useState(false);

    // Effect 1: Fetch the initial versement data
    useEffect(() => {
        if (!itemId) {
            setIsLoading(false);
            setIsSummaryLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        axios.get(`${baseApiUrl}/versements/${itemId}`)
            .then(response => {
                if (response.data?.versement) {
                    setVersement(response.data.versement);
                } else {
                    throw new Error("Format de réponse invalide pour le versement initial.");
                }
            })
            .catch(err => {
                setError(err.response?.data?.message || err.message || "Erreur chargement du détail du versement.");
                setVersement(null);
                setIsSummaryLoading(false);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [itemId, baseApiUrl]);

    // Effect 2: Fetch the financial summary once the convention ID is known
    useEffect(() => {
        const conventionId = versement?.conv_part?.convention?.id;
        if (!conventionId) {
            if(versement) setIsSummaryLoading(false); // Stop loading if versement is loaded but has no convention id
            return;
        }
        setIsSummaryLoading(true);
        setFinancialSummary(null);
        axios.get(`${baseApiUrl}/conventions/${conventionId}/financial-summary`)
            .then(response => {
                setFinancialSummary(response.data);
            })
            .catch(err => {
                setError(prevError => prevError || (err.response?.data?.message || "Erreur chargement du résumé financier."));
            })
            .finally(() => {
                setIsSummaryLoading(false);
            });
    }, [versement, baseApiUrl]);

    // Prepare data safely for both views
    const convention = versement?.conv_part?.convention;
    const partenaire = versement?.conv_part?.partenaire;
    const combinedLoading = isLoading || (showDashboard && isSummaryLoading);
console.log(convention)
    return (
        <Card className="shadow-sm border-0 h-100 more-rounded-modal-content">
            <Card.Header className="bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center flex-wrap">
                <div>
                    <h6 className="mb-0 text-muted">{showDashboard ? 'Tableau de Bord Financier' : 'Détail du Versement'}</h6>
                    <h5 className="mb-0 fw-bold">
                        {convention ? `Convention: ${convention.Code}` : `Versement #${itemId}`}
                    </h5>
                </div>
                <div className="d-flex align-items-center mt-2 mt-md-0">
                    <Form.Check
                        type="switch"
                        id="dashboard-toggle-switch"
                        label="Vue d'ensemble"
                        checked={showDashboard}
                        onChange={(e) => setShowDashboard(e.target.checked)}
                        disabled={!financialSummary && !isSummaryLoading}
                        className="me-3"
                    />
                    <Button variant="warning" size="sm" className="rounded-pill px-5 fw-bold text-dark" onClick={onClose} aria-label="Fermer"> Revenir </Button>
                </div>
            </Card.Header>

            <Card.Body className="p-4" style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 120px)' }}>
                {combinedLoading && <div className="text-center p-5"><Spinner variant="primary" /><span className="ms-3">Chargement...</span></div>}
                {error && !combinedLoading && <Alert variant="danger">{error}</Alert>}

                {!combinedLoading && !error && versement && (
                    <>
                        {/* --- VIEW 1: Simple Versement Details (Default View) --- */}
                        <Collapse in={!showDashboard}>
                            <div>
                                <Row className="mb-4 pb-3 border-bottom">
                                    <Col md={6} className="mb-3 mb-md-0">
                                        <div className="d-flex align-items-start">
                                            <FontAwesomeIcon icon={faFileContract} className="text-primary fa-lg me-3 mt-1" />
                                            <div>
                                                <h6 className="mb-0 text-primary">Convention</h6>
                                                <p className="mb-0 fw-bold">{convention?.Intitule || '(Sans intitulé)'}</p>
                                            </div>
                                        </div>
                                    </Col>
                                    <Col md={6}>
                                        <div className="d-flex align-items-start">
                                            <FontAwesomeIcon icon={faHandshake} className="text-success fa-lg me-3 mt-1" />
                                            <div>
                                                <h6 className="mb-0 text-success">Partenaire</h6>
                                                <p className="mb-0 fw-bold">{partenaire?.Description || partenaire?.Description_Arr || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={12}>
                                        <h6 className="text-muted fw-bold mb-3">DÉTAILS DU VERSEMENT #{itemId}</h6>
                                        <DetailItem icon={faCalendarAlt} label="Date Versement" value={formatDate(versement.date_versement)} />
                                        <DetailItem icon={faMoneyBillWave} label="Montant Versé" value={formatCurrency(versement.montant_verse)} />
                                        <DetailItem icon={faCommentDots} label="Commentaire" value={versement.commentaire} isTextArea={true} />
                                    </Col>
                                </Row>
                            </div>
                        </Collapse>

                        {/* --- VIEW 2: Financial Dashboard (Toggled View) --- */}
                        <Collapse in={showDashboard}>
                            <div>
                                {financialSummary ? (
                                    <>
                                        <Card className="mb-4 shadow-sm border-2 border-primary">
                                            <Card.Header className="bg-primary bg-gradient text-white"><h6 className="mb-0 fw-bold"><FontAwesomeIcon icon={faBullseye} className="me-2" /> Synthèse Globale</h6></Card.Header>
                                            <Card.Body>
                                                <Row className="align-items-center">
                                                    <Col md={5}><dl className="row mb-0 small">
                                                        <dt className="col-sm-6 text-muted">Coût Global</dt><dd className="col-sm-6 fw-bold">{formatCurrency(financialSummary.global_summary.cout_global)}</dd>
                                                        <dt className="col-sm-6 text-muted">Total Versé</dt><dd className="col-sm-6 fw-bold text-success">{formatCurrency(financialSummary.global_summary.total_verse)}</dd>
                                                        <dt className="col-sm-6 text-muted">Reste</dt><dd className="col-sm-6 fw-bold text-danger">{formatCurrency(financialSummary.global_summary.reste_a_financer)}</dd>
                                                    </dl></Col>
                                                    <Col md={7}>
                                                        <div className="d-flex justify-content-between mb-1 small"><span className="fw-bold">Progression</span><span>{financialSummary.global_summary.progression.toFixed(2)}%</span></div>
                                                        <ProgressBar now={financialSummary.global_summary.progression} variant="primary" style={{height: '1.2rem'}} className="shadow-sm"><strong className="text-white small">{financialSummary.global_summary.progression.toFixed(1)}%</strong></ProgressBar>
                                                    </Col>
                                                </Row>
                                            </Card.Body>
                                        </Card>

                                        <h5 className="mt-4 mb-3 fw-semibold text-warning border-bottom pb-2"><FontAwesomeIcon icon={faHandshake} className="me-2"/>Détail par Partenaire</h5>
                                        {financialSummary.commitments.length > 0 ? (
                                            financialSummary.commitments.map(c => (
                                                <Card key={c.commitment_id} className="mb-3 shadow-sm"><Card.Header className="bg-light"><h6 className="mb-0 fw-bold">{c.partner.name}</h6></Card.Header>
                                                    <Card.Body className="p-3">
                                                        <Row className="align-items-center mb-3">
                                                            <Col md={5}><dl className="row mb-0 small">
                                                                <dt className="col-sm-6 text-muted">Montant Convenu</dt><dd className="col-sm-6">{formatCurrency(c.montant_convenu)}</dd>
                                                                <dt className="col-sm-6 text-muted">Total Versé</dt><dd className="col-sm-6 text-success">{formatCurrency(c.total_verse)}</dd>
                                                            </dl></Col>
                                                            <Col md={7}>
                                                                <div className="d-flex justify-content-between mb-1 small"><span>Progression Partenaire</span><span>{c.progression.toFixed(2)}%</span></div>
                                                                <ProgressBar now={c.progression} variant="success" style={{height: '0.8rem'}}/>
                                                            </Col>
                                                        </Row>
                                                        <h6 className="small text-muted fw-bold mt-3 border-top pt-2"><FontAwesomeIcon icon={faListCheck} className="me-2"/>Versements ({c.versements.length})</h6>
                                                        <ListGroup variant="flush" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                            {c.versements.map(v => (
                                                                <ListGroup.Item key={v.id} className={`d-flex justify-content-between align-items-center small px-2 py-1 ${v.id === versement.id ? 'bg-warning bg-opacity-25 fw-bold' : ''}`}>
                                                                    <span><FontAwesomeIcon icon={faReceipt} className="me-2 text-secondary"/> Versement du {formatDate(v.date_versement)}</span>
                                                                    <span className={v.id === versement.id ? 'text-dark' : 'text-muted'}>{formatCurrency(v.montant_verse)}</span>
                                                                </ListGroup.Item>
                                                            ))}
                                                        </ListGroup>
                                                    </Card.Body>
                                                </Card>
                                            ))
                                        ) : (<Alert variant="info">Aucun engagement financier trouvé pour cette convention.</Alert>)}
                                    </>
                                ) : (
                                    <Alert variant="secondary">Les données du tableau de bord sont en cours de chargement ou non disponibles.</Alert>
                                )}
                            </div>
                        </Collapse>
                    </>
                )}
            </Card.Body>
        </Card>
    );
};

// --- PropTypes ---
VersementVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired
};

export default VersementVisualisation;