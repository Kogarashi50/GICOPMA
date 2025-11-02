import React, { useState, useEffect, useCallback,useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faPlus, faBuilding, faUserTie
} from '@fortawesome/free-solid-svg-icons';
import CreatableSelect from 'react-select/creatable';
import {
    Form, Button, Row, Col, Alert, Spinner, Modal
} from 'react-bootstrap';
import PropTypes from 'prop-types';

// Styles for react-select (can be moved to a shared file if used elsewhere)
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

const MaitreOuvrageManager = ({ 
    selectedMaitresOuvrage = [], 
    onSelectionChange, 
    baseApiUrl = 'http://localhost:8000/api',
    type = 'maitre_ouvrage',
    excludedOptions = [],
    isMulti = true 
}) => {
    const [options, setOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createFormData, setCreateFormData] = useState({ nom: '', description: '', contact: '', email: '', telephone: '', adresse: '' });
    const [createLoading, setCreateLoading] = useState(false);
    const [createError, setCreateError] = useState(null);

    const isDelegue = type === 'maitre_ouvrage_delegue';
    const apiEndpoint = isDelegue ? 'maitre-ouvrage-delegue' : 'maitre-ouvrage';
    const title = isDelegue ? "Maîtres d'Ouvrage Délégués" : "Maîtres d'Ouvrage";
    const icon = isDelegue ? faUserTie : faBuilding;

    const fetchOptions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${baseApiUrl}/options/${apiEndpoint}`, { withCredentials: true });
            if (Array.isArray(response.data)) {
                setOptions(response.data);
            } else {
                throw new Error("Format de réponse invalide");
            }
        } catch (err) {
            console.error(`Error fetching ${title} options:`, err);
            setError(err.response?.data?.message || err.message || `Erreur chargement des ${title}`);
        } finally {
            setLoading(false);
        }
    }, [baseApiUrl, apiEndpoint, title]);

    useEffect(() => {
        fetchOptions();
    }, [fetchOptions]);

    const handleCreateNew = (inputValue) => {
        setCreateFormData(prev => ({ ...prev, nom: inputValue }));
        setShowCreateModal(true);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation(); // Add this line to prevent event bubbling
        setCreateLoading(true);
        setCreateError(null);
        try {
            const response = await axios.post(`${baseApiUrl}/${apiEndpoint}`, createFormData, { withCredentials: true });
            const newItem = response.data[isDelegue ? 'maitre_ouvrage_delegue' : 'maitre_ouvrage'];
            const newOption = {
                value: newItem.id,
                label: newItem.nom + (newItem.description ? ` - ${newItem.description.substring(0, 60)}` : '')
            };
            setOptions(prev => [...prev, newOption]);
            onSelectionChange([...selectedMaitresOuvrage, newOption]);
            handleCreateCancel();
        } catch (err) {
            console.error(`Error creating ${title}:`, err);
            setCreateError(err.response?.data?.message || err.message || `Erreur création ${title}`);
        } finally {
            setCreateLoading(false);
        }
    };
    
    const handleCreateCancel = () => {
        setShowCreateModal(false);
        setCreateFormData({ nom: '', description: '', contact: '', email: '', telephone: '', adresse: '' });
        setCreateError(null);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setCreateFormData(prev => ({ ...prev, [name]: value }));
        if (createError) setCreateError(null);
    };
     const filteredOptions = useMemo(() => {
        if (excludedOptions.length === 0) {
            return options; // If there's nothing to exclude, return the original list
        }
        const excludedValues = new Set(excludedOptions.map(opt => opt?.value));
        return options.filter(opt => !excludedValues.has(opt.value));
    }, [options, excludedOptions]);

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
            <Form.Group>
                <div className="d-flex justify-content-between align-items-center mb-1">
                    
                    <Button variant="outline-primary" size="sm" className="rounded-pill px-3" onClick={() => setShowCreateModal(true)}>
                        <FontAwesomeIcon icon={faPlus} className="me-1" /> Créer
                    </Button>
                </div>
                <CreatableSelect
                    isMulti={isMulti} 
                    isClearable
                    closeMenuOnSelect={false} // <-- KEEPS MENU OPEN
                    options={filteredOptions} // <-- USE THE NEW FILTERED LIST
                    value={selectedMaitresOuvrage}
                    onChange={onSelectionChange}
                    onCreateOption={handleCreateNew}
                    placeholder={`Sélectionner ou créer...`}
                    styles={selectStyles}
                    isLoading={loading}
                    classNamePrefix="react-select"
                    formatCreateLabel={(inputValue) => `Créer "${inputValue}"`}
                    loadingMessage={() => 'Chargement...'}
                    noOptionsMessage={() => `Aucune option. Tapez pour créer.`}
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
                        <FontAwesomeIcon icon={icon} className="me-2" />
                        Créer: {title.slice(0,-1)}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCreateSubmit} onClick={e => e.stopPropagation()}> {/* Add onClick here too */}
                    <Modal.Body>
                        {createError && <Alert variant="danger" className="py-2">{createError}</Alert>}
                        <Form.Group className="mb-3">
                            <Form.Label>Nom <span className="text-danger">*</span></Form.Label>
                            <Form.Control type="text" name="nom" value={createFormData.nom} onChange={handleFormChange} required placeholder="Nom de l'entité" autoFocus />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={2} name="description" value={createFormData.description} onChange={handleFormChange} placeholder="Description (optionnel)" />
                        </Form.Group>
                        <Row>
                            <Col md={6}><Form.Group className="mb-3"><Form.Label>Contact</Form.Label><Form.Control type="text" name="contact" value={createFormData.contact} onChange={handleFormChange} placeholder="Personne de contact" /></Form.Group></Col>
                            <Col md={6}><Form.Group className="mb-3"><Form.Label>Téléphone</Form.Label><Form.Control type="tel" name="telephone" value={createFormData.telephone} onChange={handleFormChange} placeholder="N° de téléphone" /></Form.Group></Col>
                        </Row>
                        <Form.Group className="mb-3"><Form.Label>Email</Form.Label><Form.Control type="email" name="email" value={createFormData.email} onChange={handleFormChange} placeholder="Adresse email" /></Form.Group>
                        <Form.Group><Form.Label>Adresse</Form.Label><Form.Control as="textarea" rows={2} name="adresse" value={createFormData.adresse} onChange={handleFormChange} placeholder="Adresse complète" /></Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCreateCancel} disabled={createLoading}>Annuler</Button>
                        <Button variant="primary" type="submit" disabled={createLoading}>
                            {createLoading ? (<><Spinner as="span" size="sm" animation="border" className="me-2" />Création...</>) : "Valider"}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </>
    );
};

MaitreOuvrageManager.propTypes = {
    selectedMaitresOuvrage: PropTypes.array,
    onSelectionChange: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string,
    type: PropTypes.oneOf(['maitre_ouvrage', 'maitre_ouvrage_delegue']),
};

export default MaitreOuvrageManager;