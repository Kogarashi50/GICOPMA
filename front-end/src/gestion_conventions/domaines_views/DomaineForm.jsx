// src/gestion_conventions/domaines_views/DomaineForm.jsx (Example Path)

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons';

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

const DomaineForm = ({
    itemId = null,
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl = 'http://localhost:8000/api'
}) => {
    const isEditing = itemId !== null;

    // State keys match the form input names (using DB names for simplicity here)
    const [formData, setFormData] = useState({
        Code: '',       // Matches DB column
        Description: '',
        Description_Arr: '',
    });
    const [loadingData, setLoadingData] = useState(isEditing);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});

    // Fetch Existing Data for Editing
    useEffect(() => {
        if (!isEditing) {
             setFormData({ Code: '', Description: '', Description_Arr: '' });
             setFormErrors({}); setLoadingData(false); setSubmissionStatus({loading:false, error:null, success:false});
             return;
        }

        let isMounted = true;
        const fetchDomaineData = async () => {
            console.log(`[DomaineForm] Fetching data for editing ID: ${itemId}`);
            setLoadingData(true); setSubmissionStatus({loading:false, error:null, success:false}); setFormErrors({});
            try {
                // await axios.get(`${baseApiUrl}/sanctum/csrf-cookie`, { withCredentials: true }).catch(() => {});
                const response = await axios.get(`${baseApiUrl}/domaines/${itemId}`, { withCredentials: true }); // Endpoint for single domaine
                const data = response.data.domaine || response.data; // Adjust based on API response structure
                console.log("[DomaineForm] Fetched Data:", data);

                if (!data) throw new Error("Domaine non trouvé pour modification.");

                if (isMounted) {
                    // Populate state - keys MUST match the state definition above
                    setFormData({
                        Code: data.Code ?? '', // Match DB/API key casing
                        Description: data.Description ?? '',
                        Description_Arr: data.Description_Arr ?? '',
                    });
                }
            } catch (err) {
                console.error("Erreur chargement données domaine:", err);
                if (isMounted) setSubmissionStatus({ loading: false, error: err.message || "Erreur chargement des données.", success: false });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };

        fetchDomaineData();
        return () => { isMounted = false };

    }, [itemId, isEditing, baseApiUrl]);

    // --- Frontend Validation ---
    const validateForm = () => {
        const errors = {};
        // Validate against formData state keys
        if (!formData.Code) errors.Code = "Le code domaine est requis."; else if (isNaN(parseInt(formData.Code))) errors.Code = "Le code doit être un nombre.";
        if (!formData.Description?.trim()) errors.Description = "La description FR est requise.";
        if (!formData.Description_Arr?.trim()) errors.Description_Arr = "La description AR est requise."; // Assuming AR is required too

        setFormErrors(errors);
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
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs.", success: false });
            return;
        }

        // Prepare data with keys expected by the BACKEND (likely snake_case)
        // ** ADJUST these keys if your backend expects different names **
        const dataToSubmit = {
            Code: formData.Code, // Map state Code_Domaine -> backend code_domaine
            Description: formData.Description,
            Description_Arr: formData.Description_Arr ?? ''
        };

        const url = isEditing ? `${baseApiUrl}/domaines/${itemId}` : `${baseApiUrl}/domaines`;
        const method = isEditing ? 'put' : 'post';

        console.log(`Submitting ${method.toUpperCase()} to ${url}`, dataToSubmit);

        try {
            await axios.get(`${baseApiUrl}/sanctum/csrf-cookie`, { withCredentials: true }).catch(()=>{});

            let response;
            if (isEditing) {
                response = await axios.put(url, dataToSubmit, { withCredentials: true });
            } else {
                response = await axios.post(url, dataToSubmit, { withCredentials: true });
            }

            console.log(`API ${isEditing ? 'Update' : 'Create'} Response:`, response.data);
            setSubmissionStatus({ loading: false, error: null, success: true });

            if (isEditing && onItemUpdated) { onItemUpdated(); }
            else if (!isEditing && onItemCreated) { onItemCreated(); }

        } catch (err) {
            console.error(`Erreur lors de ${isEditing ? 'la modification' : 'la création'}:`, err.response || err);
            let errorMsg = `Une erreur s'est produite.`;
            // Extract error message
            if (err.response) {
                 if (err.response.status === 422 && typeof err.response.data.errors === 'object') { errorMsg = Object.values(err.response.data.errors).flat().join(' '); }
                 else if (err.response.data?.message) { errorMsg = err.response.data.message; }
                 else if (typeof err.response.data === 'string') { errorMsg = err.response.data; }
                 errorMsg += ` (Status: ${err.response.status})`;
            } else { errorMsg = err.message; }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    // Render Loading State for Edit
    if (isEditing && loadingData) {
         return ( <div className="text-center p-5"><Spinner animation="border" variant="primary" /> Chargement...</div> );
    }

    // --- Main Form Render ---
    return (
        <>
         <div className="d-flex justify-content-between align-items-center mb-4 px-4">
                        <div>
                            <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5>
                            <h2 className="mb-0 fw-bold">Axes stratégiques {isEditing ? `(ID: ${itemId})` : ''}</h2>
                        </div>
                         <Button variant="warning" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm' onClick={onClose} size="sm" title="Retour">
                            <b>Revenir a la liste</b>
                         </Button>
                    </div>
        <Form noValidate onSubmit={handleSubmit} className='m-5 '>
            {submissionStatus.error && ( <Alert variant="danger" className="mb-3 py-2 "><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}</Alert> )}
            {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2 ">Opération réussie !</Alert> )}

            <Row className="mb-3 ">
                <Form.Group as={Col} md={4} controlId="domaineCode">
                    <Form.Label className="small mb-1 w-100">{bilingualLabel("Code", "الرمز", true)}</Form.Label>
                    <Form.Control
                        className="p-2 mt-1 mb-3 rounded-5 shadow-sm bg-light" // Standard rounded, not pill for textarea

                        type="number"
                        name="Code" // <<< Name matches state key
                        value={formData.Code}
                        onChange={handleChange}
                        isInvalid={!!formErrors.Code}
                        required
                        size="sm"
                    />
                    <Form.Control.Feedback type="invalid">{formErrors.Code}</Form.Control.Feedback>
                </Form.Group>
            </Row>
            <Row className="mb-3">
                 <Form.Group as={Col} md={12} controlId="domaineDescription">
                    <Form.Label className="small mb-1 w-100">{bilingualLabel("Description (Français)", "الوصف (بالفرنسية)", true)}</Form.Label>
                    <Form.Control
                        className="p-2 mt-1 mb-3 rounded-5 shadow-sm bg-light" // Standard rounded, not pill for textarea

                        type="text"
                        name="Description" // <<< Name matches state key
                        value={formData.Description}
                        onChange={handleChange}
                        isInvalid={!!formErrors.Description}
                        required
                        size="sm"
                    />
                     <Form.Control.Feedback type="invalid">{formErrors.Description}</Form.Control.Feedback>
                </Form.Group>
            </Row>
             <Row className="mb-4">
                 <Form.Group as={Col} md={12} controlId="domaineDescriptionArr">
                    <Form.Label className="small mb-1 w-100">{bilingualLabel("Description (Arabe)", "الوصف (بالعربية)", true)}</Form.Label>
                    <Form.Control
                        className="p-2 text-right-arabic mt-1 mb-3 rounded-5 shadow-sm bg-light" // Standard rounded, not pill for textarea

                        type="text"
                        name="Description_Arr" // <<< Name matches state key
                        value={formData.Description_Arr}
                        onChange={handleChange}
                        isInvalid={!!formErrors.Description_Arr}
                        required
                        size="sm"
                        dir="rtl"
                    />
                    <Form.Control.Feedback type="invalid">{formErrors.Description_Arr}</Form.Control.Feedback>
                </Form.Group>
            </Row>

            {/* Action Buttons */}
            <div className="d-flex justify-content-center border-top pt-3 mt-3">
                <Button variant="danger" onClick={onClose} className="me-2 px-5 rounded-5" disabled={submissionStatus.loading}>
                    Annuler
                </Button>
                <Button variant="primary" type="submit" className="px-5 rounded-5" disabled={submissionStatus.loading}>
                    {submissionStatus.loading ? <Spinner as="span" animation="border" size="sm" className="me-2"/> : null}
                    {isEditing ? 'Enregistrer' : 'Créer'}
                </Button>
            </div>
        </Form>
    </>)
};

// PropTypes
DomaineForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};

// Default Props
DomaineForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {},
    onItemUpdated: () => {},
};

export default DomaineForm;