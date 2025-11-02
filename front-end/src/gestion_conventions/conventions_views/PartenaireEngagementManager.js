import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Form, Button, Card, Row, Col, InputGroup, Badge, Collapse } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faChevronDown, faChevronUp, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';

const PartenaireEngagementManager = ({ 
    selectedPartenaires, 
    onEngagementsChange,
    engagementTypes,
    initialEngagements = []
}) => {
    const [engagementsByPartner, setEngagementsByPartner] = useState({});
    const [openPartnerId, setOpenPartnerId] = useState(null);
    const isInitialMount = useRef(true); // Ref to track initial mount

    // This effect now runs ONLY ONCE to set the initial state from props.
    useEffect(() => {
        if (isInitialMount.current && initialEngagements.length > 0) {
            const initialState = {};
            selectedPartenaires.forEach(partner => {
                const partnerId = partner.value;
                const partnerEngagements = initialEngagements.filter(e => e.partenaire_id === partnerId);
                
                // Use the first engagement to get partner-level signature info
                const signatureData = partnerEngagements[0] || {};

                initialState[partnerId] = {
                    label: partner.label,
                    is_signatory: signatureData.is_signatory || false,
                    date_signature: signatureData.date_signature || '',
                    details_signature: signatureData.details_signature || '',
                    engagements: partnerEngagements.map(e => ({
                        id: e.id, // Use the real ID from the database
                        engagement_type_id: e.engagement_type_id,
                        montant_convenu: e.montant_convenu || '',
                        autre_engagement: e.autre_engagement || '',
                        engagement_description: e.engagement_description || ''
                    }))
                };
            });
            setEngagementsByPartner(initialState);
            isInitialMount.current = false; // Mark initial setup as complete
        }
    }, [initialEngagements, selectedPartenaires]);


    // This effect handles changes when partners are added or removed from the main form.
    useEffect(() => {
        setEngagementsByPartner(prev => {
            const nextState = { ...prev };
            const selectedIds = new Set(selectedPartenaires.map(p => p.value));

            // Remove partners who are no longer selected
            for (const partnerId in nextState) {
                if (!selectedIds.has(parseInt(partnerId, 10))) {
                    delete nextState[partnerId];
                }
            }

            // Add new partners
            selectedPartenaires.forEach(partner => {
                if (!nextState[partner.value]) {
                    nextState[partner.value] = {
                        label: partner.label,
                        is_signatory: false,
                        date_signature: '',
                        details_signature: '',
                        engagements: []
                    };
                }
            });
            return nextState;
        });
    }, [selectedPartenaires]);


    // This effect correctly propagates changes up to the parent component.
    useEffect(() => {
        const flattenedEngagements = [];
        Object.entries(engagementsByPartner).forEach(([partnerId, partnerData]) => {
            if (partnerData.engagements.length > 0) {
                partnerData.engagements.forEach(eng => {
                    flattenedEngagements.push({
                        ...eng,
                        partenaire_id: parseInt(partnerId, 10),
                        label: partnerData.label,
                        is_signatory: partnerData.is_signatory,
                        date_signature: partnerData.date_signature,
                        details_signature: partnerData.details_signature,
                    });
                });
            } else {
                // If a partner is selected but has no engagements, we still need to send their signature data
                flattenedEngagements.push({
                    partenaire_id: parseInt(partnerId, 10),
                    label: partnerData.label,
                    is_signatory: partnerData.is_signatory,
                    date_signature: partnerData.date_signature,
                    details_signature: partnerData.details_signature,
                });
            }
        });
        onEngagementsChange(flattenedEngagements);
    }, [engagementsByPartner, onEngagementsChange]);
    
    const handlePartnerSignatureChange = (partnerId, field, value) => {
        setEngagementsByPartner(prev => ({
            ...prev,
            [partnerId]: {
                ...prev[partnerId],
                [field]: value,
                // If turning off signatory, clear the related fields
                ...(field === 'is_signatory' && !value && { date_signature: '', details_signature: '' })
            }
        }));
    };

    const handleAddEngagement = (partnerId) => {
        setEngagementsByPartner(prev => ({
            ...prev,
            [partnerId]: {
                ...prev[partnerId],
                engagements: [
                    ...prev[partnerId].engagements,
                    {
                        id: `temp_${Date.now()}_${Math.random()}`,
                        engagement_type_id: engagementTypes[0]?.value || '',
                        montant_convenu: '',
                        autre_engagement: '',
                        engagement_description: ''
                    }
                ]
            }
        }));
    };

    const handleEngagementChange = (partnerId, engagementId, field, value) => {
        setEngagementsByPartner(prev => {
            const updatedEngagements = prev[partnerId].engagements.map(eng => {
                if (eng.id === engagementId) {
                    const updatedEng = { ...eng, [field]: value };
                    if (field === 'engagement_type_id') {
                        const isFinancial = String(value) === String(engagementTypes.find(et => et.label.toLowerCase() === 'financier')?.value);
                        updatedEng.autre_engagement = isFinancial ? '' : updatedEng.autre_engagement;
                        updatedEng.montant_convenu = isFinancial ? updatedEng.montant_convenu : '';
                    }
                    return updatedEng;
                }
                return eng;
            });
            return { ...prev, [partnerId]: { ...prev[partnerId], engagements: updatedEngagements } };
        });
    };

    const handleRemoveEngagement = (partnerId, engagementId) => {
        setEngagementsByPartner(prev => ({
            ...prev,
            [partnerId]: {
                ...prev[partnerId],
                engagements: prev[partnerId].engagements.filter(eng => eng.id !== engagementId)
            }
        }));
    };

    const togglePartnerCard = (partnerId) => {
        setOpenPartnerId(prev => (prev === partnerId ? null : partnerId));
    };

    const partnerList = useMemo(() => {
        return selectedPartenaires.map(p => ({
            value: p.value,
            label: p.label,
            ...engagementsByPartner[p.value]
        }));
    }, [selectedPartenaires, engagementsByPartner]);

    if (selectedPartenaires.length === 0) return null;

    return (
        <div>
            {partnerList.map(partner => {
                if (!partner) return null; // Safety check
                const partnerId = partner.value;
                const isFinancialType = (typeId) => String(typeId) === String(engagementTypes.find(et => et.label.toLowerCase() === 'financier')?.value);
                const isOpen = openPartnerId === partnerId;

                return (
                    <Card key={partnerId} className="mb-3 shadow-sm">
                        <Card.Header onClick={() => togglePartnerCard(partnerId)} style={{ cursor: 'pointer' }} className="d-flex justify-content-between align-items-center bg-light">
                            <h6 className="mb-0 fw-bold">{partner.label}</h6>
                            <div>
                                {partner.is_signatory ? (
                                    <Badge pill bg="success" className="me-2 px-2 py-1"><FontAwesomeIcon icon={faCheckCircle} className="me-1" />Signé</Badge>
                                ) : (
                                    <Badge pill bg="secondary" className="me-2 px-2 py-1"><FontAwesomeIcon icon={faTimesCircle} className="me-1" />Non-Signé</Badge>
                                )}
                                <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} />
                            </div>
                        </Card.Header>
                        <Collapse in={isOpen}>
                            <div>
                                <Card.Body className="pb-2">
                                    <Row className="align-items-center gx-2 mb-3 pb-3 border-bottom">
                                        <Col xs="auto">
                                            <Form.Check
                                                type="switch"
                                                id={`signatory-switch-${partnerId}`}
                                                label="Signé ?"
                                                checked={partner.is_signatory || false}
                                                onChange={(e) => handlePartnerSignatureChange(partnerId, 'is_signatory', e.target.checked)}
                                            />
                                        </Col>
                                        {partner.is_signatory && (
                                            <>
                                                <Col><Form.Control type="date" size="sm" value={partner.date_signature || ''} onChange={(e) => handlePartnerSignatureChange(partnerId, 'date_signature', e.target.value)} /></Col>
                                                <Col><Form.Control type="text" size="sm" placeholder="Détails signature..." value={partner.details_signature || ''} onChange={(e) => handlePartnerSignatureChange(partnerId, 'details_signature', e.target.value)} /></Col>
                                            </>
                                        )}
                                    </Row>
                                    
                                    {partner.engagements?.map((engagement) => (
                                        <div key={engagement.id} className="p-2 mb-2 border rounded bg-white">
                                            <Row className="gx-2">
                                                <Col md={4} className="mb-2 mb-md-0">
                                                    <Form.Select size="sm" value={engagement.engagement_type_id} onChange={(e) => handleEngagementChange(partnerId, engagement.id, 'engagement_type_id', e.target.value)}>
                                                        {engagementTypes.map(type => (
                                                            <option key={type.value} value={type.value}>{type.label}</option>
                                                        ))}
                                                    </Form.Select>
                                                </Col>
                                                <Col md={8}>
                                                    {isFinancialType(engagement.engagement_type_id) ? (
                                                        <InputGroup size="sm">
                                                            <Form.Control type="number" placeholder="Montant" value={engagement.montant_convenu} onChange={(e) => handleEngagementChange(partnerId, engagement.id, 'montant_convenu', e.target.value)} />
                                                            <InputGroup.Text>MAD</InputGroup.Text>
                                                        </InputGroup>
                                                    ) : (
                                                        <Form.Control as="textarea" rows={1} size="sm" placeholder="Description de l'engagement..." value={engagement.autre_engagement} onChange={(e) => handleEngagementChange(partnerId, engagement.id, 'autre_engagement', e.target.value)} />
                                                    )}
                                                </Col>
                                            </Row>
                                            <Row className="mt-2 gx-2">
                                                <Col>
                                                    <InputGroup size="sm">
                                                        <Form.Control as="textarea" rows={1} placeholder="Détails supplémentaires (optionnel)" value={engagement.engagement_description} onChange={(e) => handleEngagementChange(partnerId, engagement.id, 'engagement_description', e.target.value)} />
                                                        <Button variant="outline-danger" size="sm" onClick={() => handleRemoveEngagement(partnerId, engagement.id)} title="Supprimer cet engagement">
                                                            <FontAwesomeIcon icon={faTrash} />
                                                        </Button>
                                                    </InputGroup>
                                                </Col>
                                            </Row>
                                        </div>
                                    ))}
                                </Card.Body>
                                <Card.Footer className="text-center bg-light">
                                    <Button variant="outline-primary" size="sm" onClick={() => handleAddEngagement(partnerId)}>
                                        <FontAwesomeIcon icon={faPlus} className="me-2" />
                                        Ajouter un engagement pour {partner.label}
                                    </Button>
                                </Card.Footer>
                            </div>
                        </Collapse>
                    </Card>
                );
            })}
        </div>
    );
};

PartenaireEngagementManager.propTypes = {
    selectedPartenaires: PropTypes.array.isRequired,
    onEngagementsChange: PropTypes.func.isRequired,
    engagementTypes: PropTypes.array.isRequired,
    initialEngagements: PropTypes.array,
};

export default PartenaireEngagementManager;