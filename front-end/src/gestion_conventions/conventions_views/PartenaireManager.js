import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import CreatableSelect from 'react-select/creatable';
import { Form, Button, Modal, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faHandshake, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';

const selectStyles = {
    control: (provided, state) => ({
        ...provided, width: '100%', maxWidth: '100%', backgroundColor: '#f8f9fa',
        borderRadius: '1.5rem',
        border: state.selectProps.className?.includes('is-invalid') ? '1px solid #dc3545' : (state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'),
        boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
        minHeight: '38px', fontSize: '0.875rem',
    }),
    valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden' }),
    input: (provided) => ({ ...provided, margin: '0px', padding: '0px', fontSize: '0.875rem' }),
    indicatorSeparator: () => ({ display: 'none' }),
    indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }),
    placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }),
    menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : 'white', color: state.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e0e0e0', borderRadius: '0.5rem' }),
    multiValueLabel: (provided) => ({ ...provided, color: '#333', fontSize: '0.8rem', paddingRight: '6px' }),
    multiValueRemove: (provided) => ({ ...provided, color: '#555', ':hover': { backgroundColor: '#c0c0c0', color: 'white' } }),
    noOptionsMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    loadingMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
};

const PartenaireManager = ({ 
    selectedPartenaires, 
    onSelectionChange, 
    baseApiUrl,
}) => {
    const [options, setOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createFormData, setCreateFormData] = useState({ Code: '', Description: '', Description_Arr: '' });
    const [createError, setCreateError] = useState(null);
    const [createLoading, setCreateLoading] = useState(false);

    const fetchOptions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${baseApiUrl}/options/partenaires`, { withCredentials: true });
            const data = response.data.partenaires || response.data || [];
            if (Array.isArray(data)) {
                setOptions(data);
            } else {
                throw new Error("Format de réponse invalide pour les partenaires");
            }
        } catch (err) {
            console.error('Error fetching Partenaire options:', err);
            setError(err.response?.data?.message || err.message || "Erreur chargement des partenaires.");
        } finally {
            setIsLoading(false);
        }
    }, [baseApiUrl]);

    useEffect(() => {
        fetchOptions();
    }, [fetchOptions]);

    const handleCreateNew = (inputValue) => {
        setCreateFormData({ Code: '', Description: inputValue, Description_Arr: '' });
        setShowCreateModal(true);
    };
    
    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation(); // Add this line to prevent event bubbling
        setCreateLoading(true);
        setCreateError(null);
        try {
            const response = await axios.post(`${baseApiUrl}/partenaires`, createFormData, { withCredentials: true });
            const newPartenaire = response.data.partenaire || response.data;
            const newOption = {
                value: newPartenaire.Id,
                label: newPartenaire.Description || newPartenaire.Description_Arr || `ID: ${newPartenaire.Id}`
            };
            setOptions(prev => [...prev, newOption]);
            onSelectionChange([...selectedPartenaires, newOption]);
            handleCreateCancel();
        } catch (err) {
            console.error('Error creating Partenaire:', err);
            setCreateError(err.response?.data?.message || 'Échec de la création du partenaire.');
        } finally {
            setCreateLoading(false);
        }
    };
    
    const handleCreateCancel = () => {
        setShowCreateModal(false);
        setCreateFormData({ Code: '', Description: '', Description_Arr: '' });
        setCreateError(null);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setCreateFormData(prev => ({ ...prev, [name]: value }));
        if (createError) setCreateError(null);
    };

    if (error) {
        return (
            <Alert variant="warning" className="py-2">
                <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" />
                {error}
                <Button variant="link" size="sm" className="ms-2 p-0" onClick={fetchOptions}>Réessayer</Button>
            </Alert>
        );
    }
    
    return (
        <>
            <Form.Group controlId="formPartenaires">
                <div className="d-flex justify-content-between align-items-center mb-1">
                    <Form.Label className="fw-medium mb-0">
                        <FontAwesomeIcon icon={faHandshake} className="me-2 text-muted" />
                        Partenaires
                    </Form.Label>
                     <Button variant="outline-primary" size="sm" className="rounded-pill px-3" onClick={() => setShowCreateModal(true)}>
                        <FontAwesomeIcon icon={faPlus} className="me-1" /> Créer
                    </Button>
                </div>
                <CreatableSelect
                    isMulti
                    isClearable
                    closeMenuOnSelect={false} // <-- KEEPS MENU OPEN
                    options={options}
                    value={selectedPartenaires}
                    onChange={(newValue) => onSelectionChange(newValue || [])}
                    onCreateOption={handleCreateNew}
                    placeholder="Sélectionner ou créer..."
                    styles={selectStyles}
                    isLoading={isLoading}
                    classNamePrefix="react-select"
                    formatCreateLabel={(inputValue) => `Créer "${inputValue}"`}
                    loadingMessage={() => 'Chargement...'}
                    noOptionsMessage={() => "Aucun partenaire. Tapez pour créer."}
                />
            </Form.Group>

            <Modal 
                show={showCreateModal} 
                onHide={handleCreateCancel} 
                centered 
                backdrop="static"
                onClick={e => e.stopPropagation()} // Add this line
            >
                <Modal.Header closeButton>
                    <Modal.Title as="h6">
                        <FontAwesomeIcon icon={faHandshake} className="me-2" />
                        Créer un nouveau Partenaire
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateSubmit} onClick={e => e.stopPropagation()}> {/* Add onClick here too */}
                    <Modal.Body>
                        {createError && <Alert variant="danger" className="py-2">{createError}</Alert>}
                        <Row>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Description (Nom complet) <span className="text-danger">*</span></Form.Label>
                                    <Form.Control type="text" name="Description" value={createFormData.Description} onChange={handleFormChange} required placeholder="Ex: Ministère de l'Éducation Nationale" autoFocus />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                             <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Code (Acronyme)</Form.Label>
                                    <Form.Control type="text" name="Code" value={createFormData.Code} onChange={handleFormChange} placeholder="Ex: MEN" />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Description (Arabe)</Form.Label>
                                    <Form.Control type="text" name="Description_Arr" value={createFormData.Description_Arr} onChange={handleFormChange} placeholder="... وزارة التربية الوطنية" />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCreateCancel} disabled={createLoading}>Annuler</Button>
                        <Button variant="primary" type="submit" disabled={createLoading || !createFormData.Description}>
                            {createLoading ? (<><Spinner as="span" size="sm" animation="border" className="me-2" />Création...</>) : "Valider"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
};

PartenaireManager.propTypes = {
    selectedPartenaires: PropTypes.array.isRequired,
    onSelectionChange: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

export default PartenaireManager;