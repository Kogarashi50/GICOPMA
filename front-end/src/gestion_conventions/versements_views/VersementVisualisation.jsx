import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Card, Row, Col, Spinner, Alert, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faFileContract, faHandshake, faCalendarAlt, faMoneyBillWave, faLandmark, faReceipt, faCommentDots } from '@fortawesome/free-solid-svg-icons';

// --- Helpers ---
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString + 'T00:00:00Z');
        if (isNaN(date.getTime())) return dateString;
        if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
             return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
        } else {
             return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
        }
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
        <div className="mb-2 d-flex"> {/* Use flex for alignment */}
            {icon && <FontAwesomeIcon icon={icon} className="text-secondary me-2 fa-fw mt-1" title={label} />}
            <div>
                <span className="fw-bold small d-block">{label}:</span>
                {isTextArea ? (
                     <span className="text-muted small" style={{ whiteSpace: 'pre-wrap' }}>{value}</span>
                 ) : (
                     <span className="text-muted small">{value}</span>
                 )}
            </div>
        </div>
    );
};
DetailItem.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), isTextArea: PropTypes.bool, icon: PropTypes.object };


const VersementVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [versement, setVersement] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // ... (keep existing fetch logic, ensuring nested data is loaded) ...
        if (!itemId) return; setIsLoading(true); setError(null);
        axios.get(`${baseApiUrl}/versements/${itemId}`)
            .then(response => {
                if (response.data?.versement) { setVersement(response.data.versement); }
                else { throw new Error("Format de réponse invalide."); }
            })
            .catch(err => { setError(err.response?.data?.message || err.message || "Erreur chargement détails."); setVersement(null); })
            .finally(() => setIsLoading(false));
    }, [itemId, baseApiUrl]);

    // Prepare data safely
    const convention = versement?.conv_part?.convention;
    const partenaire = versement?.conv_part?.partenaire;
    const conventionIntitule = convention?.Intitule || '(Sans intitulé)';
    const partenaireDescription = partenaire?.Description || partenaire?.Description_Arr;
    const montantConvenu = versement?.conv_part?.Montant_Convenu;

    const cardTitle = `Versement:  #${itemId}`;

    return (
        <Card className="shadow-sm border-0 h-100 more-rounded-modal-content">
             <Card.Header className="bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
                 <h5 className="mb-0 fw-bold"> {isLoading ? 'Chargement...' : cardTitle} </h5>
                 <Button variant="warning" size="sm" className="rounded-pill px-5 fw-bold text-dark" onClick={onClose} aria-label="Fermer"> Revenir a la liste </Button>
             </Card.Header>

            <Card.Body className="p-4" style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 120px)' }}>
                {isLoading && <div className="text-center p-5"><Spinner variant="primary" /></div>}
                {error && <Alert variant="danger">{error}</Alert>}

                {versement && !isLoading && !error && (
                    <>
                        {/* Section 1: Convention & Partenaire Info (Prominent) */}
                        <Row className="mb-4 pb-3 border-bottom"> {/* Add margin and border */}
                            <Col md={6} className="mb-3 mb-md-0">
                                <div className="d-flex align-items-start">
                                    <FontAwesomeIcon icon={faFileContract} className="text-primary fa-lg me-3 mt-1" /> {/* Larger icon */}
                                    <div>
                                        <h6 className="mb-0 text-primary">Convention</h6>
                                        <p className="mb-0 fw-bold">{conventionIntitule}</p>
                                    </div>
                                </div>
                            </Col>
                            <Col md={6}>
                                <div className="d-flex align-items-start">
                                    <FontAwesomeIcon icon={faHandshake} className="text-success fa-lg me-3 mt-1" /> {/* Larger icon */}
                                    <div>
                                        <h6 className="mb-0 text-success">Partenaire</h6>
                                        <p className="mb-0 fw-bold">{partenaireDescription}</p>
                                        {/* Optionally display Montant Convenu here or below */}

                                    </div>
                                </div>
                            </Col>
                        </Row>

                        {/* Section 2: Versement Details (Two Columns) */}
                        <Row>
                            <Col md={6}>
                                <h6 className="text-muted fw-bold mb-3">DÉTAILS VERSEMENT</h6>
                                <DetailItem icon={faCalendarAlt} label="Date Versement" value={formatDate(versement.date_versement)} />
                                <DetailItem icon={faMoneyBillWave} label="Montant Versé" value={formatCurrency(versement.montant_verse)} />
                            </Col>
                            <Col md={6}>
                                {/* Add a spacer or adjust if needed, or keep heading */}
                                <h6 className="text-muted fw-bold mb-3 visually-hidden">Autres Détails</h6> {/* Hidden heading for structure */}
                                <DetailItem icon={faCommentDots} label="Commentaire" value={versement.commentaire} isTextArea={true} />
                            </Col>
                        </Row>
                    </>
                )}
            </Card.Body>
            {/* Footer Removed */}
        </Card>
    );
};

// --- PropTypes ---
DetailItem.propTypes = { /* ... */ };
VersementVisualisation.propTypes = { /* ... */ };

export default VersementVisualisation;