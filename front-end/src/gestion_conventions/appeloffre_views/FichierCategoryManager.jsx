import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Modal, Button, Form, Alert, Spinner, Row, Col, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrashAlt } from '@fortawesome/free-solid-svg-icons';

const FichierCategoryManager = ({ show, onHide, baseApiUrl, onCategoriesChange }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newCategory, setNewCategory] = useState({ label: '', value: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${baseApiUrl}/fichier-categories`, { withCredentials: true });
            setCategories(response.data || []);
        } catch (err) {
            setError("Erreur lors du chargement des catégories.");
        } finally {
            setLoading(false);
        }
    }, [baseApiUrl]);

    useEffect(() => {
        if (show) {
            fetchCategories();
        }
    }, [show, fetchCategories]);

    const handleAdd = async (e) => {
        // The event object might not be present if called from onClick without passing it,
        // but it's good practice to keep it for potential future use.
        if (e) e.preventDefault();
        
        if (!newCategory.label || !newCategory.value) {
            setError("Le libellé et la valeur sont requis.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const response = await axios.post(`${baseApiUrl}/fichier-categories`, newCategory, { withCredentials: true });
            setNewCategory({ label: '', value: '' }); // Reset form
            
            // Update local state and notify parent
            const newCategoriesList = [...categories, response.data];
            setCategories(newCategoriesList);
            onCategoriesChange(newCategoriesList); // Notify parent component

        } catch (err)
        {
            const message = err.response?.data?.message || "Une erreur est survenue.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (categoryId) => {
        if (!window.confirm("Supprimer cette catégorie ?")) return;
        setError(null);
        try {
            await axios.delete(`${baseApiUrl}/fichier-categories/${categoryId}`, { withCredentials: true });
            
            // Update local state and notify parent
            const newCategoriesList = categories.filter(c => c.id !== categoryId);
            setCategories(newCategoriesList);
            onCategoriesChange(newCategoriesList); // Notify parent component

        } catch (err) {
            const message = err.response?.data?.message || "Une erreur est survenue.";
            setError(message);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Gérer les Catégories de Fichiers</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
                
                <h5>Catégories Existantes</h5>
                <ListGroup className="mb-4">
                    {loading ? <ListGroup.Item className="text-center"><Spinner size="sm" /></ListGroup.Item>
                     : categories.map(cat => (
                        <ListGroup.Item key={cat.id} className="d-flex justify-content-between align-items-center">
                            <div><strong>{cat.label}</strong> <small className="text-muted">({cat.value})</small></div>
                            <Button variant="outline-danger" size="sm" onClick={() => handleDelete(cat.id)}>
                                <FontAwesomeIcon icon={faTrashAlt} />
                            </Button>
                        </ListGroup.Item>
                    ))}
                </ListGroup>

                <h5>Ajouter une Nouvelle Catégorie</h5>
                
                <Form>
                    <Row>
                        <Col md={6}>
                            <Form.Control type="text" placeholder="Libellé (Ex: Plan d'Exécution)" value={newCategory.label}
                                onChange={(e) => setNewCategory(p => ({ ...p, label: e.target.value }))} required />
                        </Col>
                        <Col md={6}>
                            <Form.Control type="text" placeholder="Valeur (Ex: plan_execution)" value={newCategory.value}
                                onChange={(e) => setNewCategory(p => ({ ...p, value: e.target.value.toLowerCase().replace(/\s+/g, '_') }))} required />
                        </Col>
                    </Row>
                    
                    <Button type="button" onClick={handleAdd} variant="primary" className="mt-3" disabled={isSubmitting}>
                        {isSubmitting ? 'Ajout...' : 'Ajouter Catégorie'}
                    </Button>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

FichierCategoryManager.propTypes = {
    show: PropTypes.bool.isRequired,
    onHide: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
    onCategoriesChange: PropTypes.func.isRequired,
};

export default FichierCategoryManager;