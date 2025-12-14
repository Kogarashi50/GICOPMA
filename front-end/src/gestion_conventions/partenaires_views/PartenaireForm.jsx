// src/gestion_conventions/partenaires_views/PartenaireForm.jsx (Corrected Version)

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

const PartenaireForm = ({
    itemId = null,
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl = 'http://localhost:8000/api' // Default base URL
}) => {
    const isEditing = itemId !== null;

    // Use state keys that match the form control names (PascalCase)
    const [formData, setFormData] = useState({
        Code: '',
        Description: '',
        Description_Arr: '', // Initialize as empty string
    });
    const [loadingData, setLoadingData] = useState(isEditing); // Initialize loading based on mode
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});

    // Fetch Existing Data for Editing
    useEffect(() => {
        // Reset form if switching from edit to create (itemId becomes null)
        if (!isEditing) {
             setFormData({ Code: '', Description: '', Description_Arr: '' });
             setFormErrors({});
             setLoadingData(false);
             setSubmissionStatus({ loading: false, error: null, success: false });
             return; // Exit effect
        }

        // Fetch data only when itemId is present (editing)
        let isMounted = true;
        const fetchPartenaireData = async () => {
            console.log(`[PartenaireForm] Fetching data for editing ID: ${itemId}`);
            setLoadingData(true);
            setSubmissionStatus({ loading: false, error: null, success: false });
            setFormErrors({});
            try {
                // Ensure CSRF cookie if necessary (using web routes)

                // Fetch data for the specific partner
                const response = await axios.get(`${baseApiUrl}/partenaires/${itemId}`, { withCredentials: true });
                const data = response.data.partenaire || response.data; // Handle potential nesting
                console.log("[PartenaireForm] Fetched Data:", data);

                if (!data) throw new Error("Partenaire non trouvé pour modification.");

                if (isMounted) {
                    // Populate form state, using ?? '' as fallback for null/undefined from DB
                    setFormData({
                        Code: data.Code ?? '',
                        Description: data.Description ?? '',
                        Description_Arr: data.Description_Arr ?? '', // Match the DB/Model case here
                    });
                }
            } catch (err) {
                console.error("Erreur chargement données partenaire:", err);
                if (isMounted) setSubmissionStatus({ loading: false, error: err.message || "Erreur chargement des données.", success: false });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };

        fetchPartenaireData();

        // Cleanup function to prevent state updates on unmounted component
        return () => { isMounted = false };

    }, [itemId, isEditing, baseApiUrl]); // Rerun when itemId changes

    // --- Frontend Validation ---
    const validateForm = () => {
        const errors = {};
        // Validate against formData state (which uses PascalCase keys)
        if (!formData.Code) { // Check for empty string or potentially 0 after parseInt
             errors.Code = "Le code est requis.";
        } else if (isNaN(parseInt(formData.Code))) {
            errors.Code = "Le code doit être un nombre.";
        }
        if (!formData.Description?.trim()) errors.Description = "La description FR est requise.";
        // --- Validate Description_arr as required ---
        if (!formData.Description_Arr?.trim()) errors.Description_Arr = "La description AR est requise.";
        // --- End validation change ---

        setFormErrors(errors);
        console.log("Validation Errors:", errors);
        return Object.keys(errors).length === 0; // True if no errors
    };

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        // Update state using the name from the form control (PascalCase)
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear the specific error for this field if it exists
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    // --- Submit Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmissionStatus({ loading: true, error: null, success: false });
        setFormErrors({});

        if (!validateForm()) {
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs.", success: false });
            return; // Stop if frontend validation fails
        }

        // --- Prepare data object with keys expected by the BACKEND (snake_case) ---
        const dataToSubmit = {
            Code: formData.Code,                // Map PascalCase state to snake_case request key
            Description: formData.Description,      // Map PascalCase state to snake_case request key
            Description_Arr: formData.Description_Arr ?? '' // Map PascalCase state to snake_case request key
        };
        // --- End data preparation correction ---

        const url = isEditing ? `${baseApiUrl}/partenaires/${itemId}` : `${baseApiUrl}/partenaires`;
        const method = isEditing ? 'put' : 'post'; // HTTP method

        console.log(`Submitting ${method.toUpperCase()} to ${url}`, dataToSubmit);

        try {
            // Ensure CSRF cookie is set if using web routes

            let response;
            // Use the correct Axios method with the data object
            if (isEditing) {
                response = await axios.put(url, dataToSubmit, { withCredentials: true });
            } else {
                response = await axios.post(url, dataToSubmit, { withCredentials: true });
            }

            console.log(`API ${isEditing ? 'Update' : 'Create'} Response:`, response.data);
            setSubmissionStatus({ loading: false, error: null, success: true });

            // Call the appropriate callback passed from DynamicTable
            if (isEditing && onItemUpdated) {
                onItemUpdated();
            } else if (!isEditing && onItemCreated) {
                onItemCreated();
            }

        } catch (err) {
            console.error(`Erreur lors de ${isEditing ? 'la modification' : 'la création'}:`, err.response || err);
            let errorMsg = `Une erreur s'est produite.`;
            // Extract error message (same logic as before)
            if (err.response) {
                 if (err.response.status === 422 && typeof err.response.data.errors === 'object') { errorMsg = Object.values(err.response.data.errors).flat().join(' '); }
                 else if (err.response.data?.message) { errorMsg = err.response.data.message; }
                 else if (typeof err.response.data === 'string') { errorMsg = err.response.data; }
                 errorMsg += ` (Status: ${err.response.status})`;
            } else { errorMsg = err.message; }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    // Render Loading State for Edit data fetch
    if (isEditing && loadingData) {
         return ( <div className="text-center p-5"><Spinner animation="border" variant="primary" /> Chargement...</div> );
    }

    // --- Main Form Render ---
    return (
        <div className="container-fluid p-5 ">
            <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0">
                            <div>
                                <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier la' : 'Créer un nouveau'}</h5>
                                <h2 className="mb-0 fw-bold">Partenaire {isEditing ? `(Code: ${formData.Code})` : ''}</h2>
                            </div>
                            <Button variant="light" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm' onClick={onClose} size="sm" title="Retour">
                                 <b>Revenir a la liste</b>
                            </Button>
                        </div>
            
        <Form noValidate onSubmit={handleSubmit}>
            {/* Alerts for submit status */}
            {submissionStatus.error && ( <Alert variant="danger" className="mb-3 py-2"><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}</Alert> )}
            {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2">Opération réussie !</Alert> )}

            {/* Form Fields */}
            <Row className="mb-3">
                <Form.Group as={Col} md={4} controlId="partenaireCode">
                    <Form.Label className="small mb-1 w-100">{bilingualLabel("Code", "الرمز", true)}</Form.Label>
                    <Form.Control
                        className='p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light'
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
                 <Form.Group as={Col} md={12} controlId="partenaireDescription">
                    <Form.Label className="small mb-1 w-100">{bilingualLabel("Description (Français)", "الوصف (بالفرنسية)", true)}</Form.Label>
                    <Form.Control
                        type="text"
                        className='p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light'
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
                 <Form.Group as={Col} md={12} controlId="partenaireDescriptionArr">
                    <Form.Label className="small mb-1 w-100">{bilingualLabel("Description (Arabe)", "الوصف (بالعربية)", true)}</Form.Label>
                    <Form.Control
                        className='p-2 mt-1 text-right-arabic" mb-3 rounded-pill shadow-sm bg-light'
                        type="text"
                        name="Description_Arr" // <<< Name matches state key
                        value={formData.Description_Arr}
                        onChange={handleChange}
                        isInvalid={!!formErrors.Description_Arr}
                        required // Make required as per validation change
                        size="sm"
                        dir="rtl" // Keep directionality
                    />
                    <Form.Control.Feedback type="invalid">{formErrors.Description_Arr}</Form.Control.Feedback>
                </Form.Group>
            </Row>

            {/* Action Buttons */}
            <div className="d-flex justify-content-end border-top pt-3 mt-3"> {/* Added mt-3 */}
                <Button variant="danger" onClick={onClose} className="me-2 px-5 rounded-5" disabled={submissionStatus.loading}>
                    Annuler
                </Button>
                <Button variant="primary" type="submit" className="px-5 rounded-5" disabled={submissionStatus.loading}>
                    {submissionStatus.loading ? <Spinner as="span" animation="border" size="sm" className="me-2"/> : null}
                    {isEditing ? 'Enregistrer' : 'Créer'}
                </Button>
            </div>
        </Form></div>
    );
};

// PropTypes
PartenaireForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};

// Default Props
PartenaireForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {},
    onItemUpdated: () => {},
    baseApiUrl: 'http://localhost:8000', // Ensure default is set
};

export default PartenaireForm;