// src/pages/provinces_views/ProvinceForm.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';
import '../components/form.css'

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

const ProvinceForm = ({
    itemId = null,
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl = 'http://localhost:8000/api'
}) => {
    // --- State ---
    const [formData, setFormData] = useState({
        Code: '',
        Description: '',
        Description_Arr: '', // Arabic Description
    });
    const isEditing = itemId !== null;
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(isEditing);

    // --- Fetch Existing Data for Editing ---
    useEffect(() => {
        if (!isEditing) {
             // Optional: Reset form if switching back to create mode
             if (formData.Code || formData.Description || formData.Description_Arr) {
                 setFormData({ Code: '', Description: '', Description_Arr: '' });
                 setFormErrors({}); setSubmissionStatus({ loading: false, error: null, success: false }); setLoadingData(false);
             }
            return;
        }

        let isMounted = true;
        const fetchProvinceData = async () => {
            console.log(`[Form] Fetching province data for editing ID: ${itemId}`);
            setLoadingData(true);
            setSubmissionStatus({ loading: false, error: null, success: false });
            setFormErrors({});
            try {
                const response = await axios.get(`${baseApiUrl}/provinces/${itemId}`, { withCredentials: true });
                const data = response.data.province || response.data;

                if (!data) throw new Error("Province non trouvée pour modification.");

                if (isMounted) {
                    setFormData({
                        Code: String(data.Code ?? ''), // Ensure string for trim()
                        Description: String(data.Description ?? ''), // Ensure string
                        Description_Arr: data.Description_Arr ?? '', // Keep as is, likely string or null
                    });
                }
            } catch (err) {
                console.error("Erreur chargement données province:", err);
                if (isMounted) setSubmissionStatus({ loading: false, error: err.message || "Erreur chargement données.", success: false });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };

        fetchProvinceData();

        return () => { isMounted = false };

    }, [itemId, isEditing, baseApiUrl]); // No options dependency needed

    // --- Frontend Validation ---
    const validateForm = () => {
        const errors = {};
        // Use optional chaining with trim() after ensuring string state
        if (!formData.Code?.trim()) errors.Code = "Le code est requis.";
        if (!formData.Description?.trim()) errors.Description = "La description est requise.";
        // Add validation for Description_Arr if it's required

        setFormErrors(errors);
        console.log("Validation Errors:", errors);
        return Object.keys(errors).length === 0;
    };

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) { setFormErrors(prev => ({ ...prev, [name]: undefined })); }
    };

    // --- Submit Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmissionStatus({ loading: true, error: null, success: false });
        setFormErrors({});

        if (!validateForm()) {
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs dans le formulaire.", success: false });
            return;
        }

        const dataToSubmit = new FormData();
        dataToSubmit.append('Code', formData.Code);
        dataToSubmit.append('Description', formData.Description);
        // Only append if it has a value, or send empty string if backend expects it
        if (formData.Description_Arr) {
            dataToSubmit.append('Description_Arr', formData.Description_Arr);
        } else {
             dataToSubmit.append('Description_Arr', ''); // Or handle as null on backend
        }


        const url = isEditing
            ? `${baseApiUrl}/provinces/${itemId}`
            : `${baseApiUrl}/provinces`;

        const httpMethodConfig = {
            headers: { 'Accept': 'application/json' },
            withCredentials: true,
        };

        if (isEditing) {
            dataToSubmit.append('_method', 'PUT');
        }

        console.log("Submitting data:", Object.fromEntries(dataToSubmit.entries())); // Log form data object

        try {
            const response = await axios.post(url, dataToSubmit, httpMethodConfig);
            console.log(`API ${isEditing ? 'Update' : 'Create'} Response:`, response.data);
            setSubmissionStatus({ loading: false, error: null, success: true });

            if (isEditing && onItemUpdated) onItemUpdated();
            else if (!isEditing && onItemCreated) onItemCreated();

        } catch (err) {
            console.error(`Erreur lors de ${isEditing ? 'la modification' : 'la création'}:`, err.response || err);
            let errorMsg = `Une erreur s'est produite.`;
             if (err.response) {
                 if (err.response.status === 422 && typeof err.response.data.errors === 'object') {
                     errorMsg = Object.values(err.response.data.errors).flat().join(' ');
                 } else {
                     errorMsg = err.response.data?.message || err.message;
                 }
                 errorMsg += ` (Status: ${err.response.status})`;
            } else {
                 errorMsg = err.message;
            }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    // --- Render Logic ---
    const isSubmitDisabled = submissionStatus.loading || loadingData;

    if (isEditing && loadingData) {
        return ( <div className="text-center p-5"><Spinner animation="border" variant="primary" /><span> Chargement...</span></div> );
    }

    return (
        <div className="px-5 py-3 p-md-4 form-container-style"> {/* Add consistent styling class */}
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                 <div>
                     <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier la' : 'Créer une nouvelle'}</h5>
                     <h2 className="mb-0 fw-bold">Province {isEditing ? `(ID: ${itemId})` : ''}</h2>
                 </div>
                 <Button variant="warning" className='btn rounded-pill px-5 py-2 shadow-sm form-close-button' onClick={onClose} size="sm" title="Retour">
                    <b>Revenir à la liste</b>
                 </Button>
            </div>

            {/* Form Content */}
            <div className="flex-grow-1">
                {submissionStatus.error && ( <Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({...prev, error: null}))}> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error} </Alert> )}
                {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2"> Province {isEditing ? 'modifiée' : 'créée'} avec succès ! </Alert> )}

                <Form noValidate onSubmit={handleSubmit}>
                     <Row className="mb-3 g-3">
                         <Form.Group as={Col} md={6} controlId="formCode">
                             <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Code", "الرمز", true)}</Form.Label>
                             <Form.Control className="form-control-style p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light" isInvalid={!!formErrors.Code} required type="text" name="Code" value={formData.Code} onChange={handleChange} size="sm" />
                             <Form.Control.Feedback type="invalid">{formErrors.Code}</Form.Control.Feedback>
                         </Form.Group>
                     </Row>
                     <Row className="mb-3 g-3">
                         <Form.Group as={Col} md={12} controlId="formDescription">
                             <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Description", "الوصف", true)}</Form.Label>
                             <Form.Control className="form-control-style p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light" isInvalid={!!formErrors.Description} required type="text" name="Description" value={formData.Description} onChange={handleChange} size="sm" />
                             <Form.Control.Feedback type="invalid">{formErrors.Description}</Form.Control.Feedback>
                         </Form.Group>
                     </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={12} controlId="formDescriptionArr">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Description (Arabe)", "الوصف (بالعربية)")}</Form.Label>
                            {/* Add isInvalid={!!formErrors.Description_Arr} if validation added */}
                            <Form.Control className="form-control-style p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light" style={{direction: 'rtl', textAlign: 'right'}} type="text" name="Description_Arr" value={formData.Description_Arr} onChange={handleChange} size="sm" />
                            {/* <Form.Control.Feedback type="invalid">{formErrors.Description_Arr}</Form.Control.Feedback> */}
                        </Form.Group>
                    </Row>

                    {/* Action Buttons */}
                     <Row className="mt-4 pt-2 justify-content-center form-actions-row">
                         <Col xs="auto" className="pe-2">
                             <Button onClick={onClose} variant="danger" className="btn rounded-pill px-5 py-2 border-0 form-cancel-button" disabled={submissionStatus.loading}> Annuler </Button>
                         </Col>
                         <Col xs="auto" className="ps-2">
                            <Button type="submit" className="btn rounded-pill px-5 py-2 form-submit-button" disabled={isSubmitDisabled}>
                                {submissionStatus.loading ? ( <><Spinner as="span" animation="border" size="sm" className="me-2"/> Chargement...</> ) : ( isEditing ? 'Enregistrer' : 'Créer' )}
                             </Button>
                         </Col>
                     </Row>
                </Form>
            </div>
        </div>
    );
};

ProvinceForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};

export default ProvinceForm;