// src/gestion_conventions/secteurs_views/SecteurForm.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const bilingualLabel = (fr, ar, required = false) => (
    <div className="d-flex justify-content-between align-items-center w-100">
        <span>
            {fr}
            {required && <span className="text-danger ms-1">*</span>}
        </span>
        <span className="text-muted" style={{ fontSize: '0.9em', marginRight: '8px' }}>
            {required && <span className="text-danger me-1">*</span>}
            {ar}
        </span>
    </div>
);

const SecteurForm = ({
    itemId = null,
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl = 'http://localhost:8000/api'
}) => {
    const isEditing = itemId !== null;

    const [formData, setFormData] = useState({
        description_fr: '',
        description_ar: '',
    });

    const [loadingData, setLoadingData] = useState(isEditing);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (!isEditing) {
             setFormData({ description_fr: '', description_ar: '' });
             setFormErrors({}); setLoadingData(false); setSubmissionStatus({loading:false, error:null, success:false});
             return;
        }

        let isMounted = true;
        const fetchSecteurData = async () => {
            setLoadingData(true);
            try {
                const response = await axios.get(`${baseApiUrl}/secteurs/${itemId}`);
                if (isMounted) {
                    const data = response.data.secteur || response.data;
                    setFormData({
                        description_fr: data.description_fr ?? '',
                        description_ar: data.description_ar ?? '',
                    });
                }
            } catch (err) {
                if (isMounted) setSubmissionStatus({ loading: false, error: "Erreur chargement des données.", success: false });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };

        fetchSecteurData();
        return () => { isMounted = false };
    }, [itemId, isEditing, baseApiUrl]);

    const validateForm = () => {
        const errors = {};
        if (!formData.description_fr?.trim()) errors.description_fr = "La description FR est requise.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) { setFormErrors(prev => ({ ...prev, [name]: undefined })); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs.", success: false });
            return;
        }
        
        setSubmissionStatus({ loading: true, error: null, success: false });
        const url = isEditing ? `${baseApiUrl}/secteurs/${itemId}` : `${baseApiUrl}/secteurs`;
        const method = isEditing ? 'put' : 'post';

        try {
            const response = await axios[method](url, formData);
            setSubmissionStatus({ loading: false, error: null, success: true });
            
            if (isEditing) { onItemUpdated(response.data.secteur); }
            else { onItemCreated(response.data.secteur); }

        } catch (err) {
            let errorMsg = `Une erreur s'est produite.`;
            if (err.response) {
                 if (err.response.status === 422) {
                     errorMsg = "Données invalides. Veuillez vérifier les champs.";
                     setFormErrors(err.response.data.errors || {});
                 } else {
                     errorMsg = err.response.data.message || `Erreur serveur (${err.response.status}).`;
                 }
            } else { errorMsg = err.message; }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    if (isEditing && loadingData) {
        return <div className="text-center p-5"><Spinner animation="border" /></div>;
    }

    return (
        <div className='px-5'>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5>
                    <h2 className="mb-0 fw-bold">Secteur</h2>
                </div>
                <Button variant="warning" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm' onClick={onClose} size="sm" title="Retour">
                    <b>Revenir à la liste</b>
                </Button>
            </div>

            <Form noValidate onSubmit={handleSubmit} className='p-2'>
                {submissionStatus.error && ( <Alert variant="danger" className="mb-3 py-2"><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}</Alert> )}
                {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2">Opération réussie !</Alert> )}

                <Row className="mb-3">
                    <Form.Group as={Col} md={12} controlId="secteurDescriptionFr">
                        <Form.Label className="small mb-1 w-100">{bilingualLabel("Description (Français)", "الوصف (بالفرنسية)", true)}</Form.Label>
                        <Form.Control
                            className="p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light"
                            type="text"
                            name="description_fr"
                            value={formData.description_fr}
                            onChange={handleChange}
                            isInvalid={!!formErrors.description_fr}
                            required
                        />
                        <Form.Control.Feedback type="invalid">{formErrors.description_fr}</Form.Control.Feedback>
                    </Form.Group>
                </Row>
                <Row className="mb-4">
                    <Form.Group as={Col} md={12} controlId="secteurDescriptionAr">
                        <Form.Label className="small mb-1 w-100">{bilingualLabel("Description (Arabe)", "الوصف (بالعربية)")}</Form.Label>
                        <Form.Control
                            className="text-right-arabic p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light"
                            type="text"
                            name="description_ar"
                            value={formData.description_ar}
                            onChange={handleChange}
                            isInvalid={!!formErrors.description_ar}
                            dir="rtl"
                        />
                        <Form.Control.Feedback type="invalid">{formErrors.description_ar}</Form.Control.Feedback>
                    </Form.Group>
                </Row>

                <div className="d-flex justify-content-center border-top pt-3 mt-3">
                    <Button variant="danger" onClick={onClose} className="me-2 rounded-5 px-5" disabled={submissionStatus.loading}>Annuler</Button>
                    <Button variant="primary" type="submit" className="px-5 rounded-5" disabled={submissionStatus.loading}>
                        {submissionStatus.loading && <Spinner as="span" animation="border" size="sm" className="me-2"/>}
                        {isEditing ? 'Enregistrer' : 'Créer'}
                    </Button>
                </div>
            </Form>
        </div>
    );
};

SecteurForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func.isRequired,
    onItemUpdated: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string,
};

export default SecteurForm;