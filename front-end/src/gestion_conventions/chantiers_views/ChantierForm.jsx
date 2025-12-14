// src/pages/ChantierForm.jsx (Adjust path if needed)
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';
import '../components/form.css' // Assuming shared form styles

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

// Styles for react-select (can be shared or defined here)
const selectStyles = {
    control: (provided, state) => ({
        ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da', boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px',
    }), valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', }), input: (provided) => ({ ...provided, margin: '0px', padding: '0px', }), indicatorSeparator: () => ({ display: 'none', }), indicatorsContainer: (provided) => ({ ...provided, padding: '1px', }), placeholder: (provided) => ({ ...provided, color: '#6c757d', }), menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1050 }), option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', }),
};

// --- Component ---
const ChantierForm = ({
    itemId = null,
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl = 'http://localhost:8000/api'
}) => {
    // --- State ---
    const [formData, setFormData] = useState({
        Code_Chantier: '',
        Description: '',
        Domaine: null, // Holds the selected { value: domaine.Code, label: domaine.Description } object
    });
    const isEditing = itemId !== null;
    const [domaineOptions, setDomaineOptions] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(isEditing);

    // --- Fetch Domaines for Select ---
    const fetchDomaines = useCallback(async () => {
        setLoadingOptions(true);
        try {
            const response = await axios.get(`${baseApiUrl}/domaines`); // Use your actual endpoint
            const data = response.data.domaines || response.data || [];
            // IMPORTANT: Use Domaine.Code as value because Chantier.id_domaine links to it
            setDomaineOptions(data.map(d => ({ value: d.Code, label: d.Description })));
        } catch (err) {
            console.error("Erreur chargement domaines:", err);
            setFormErrors(prev => ({ ...prev, domaines: "Err chargement domaines." }));
        } finally {
            setLoadingOptions(false);
        }
    }, [baseApiUrl]);

    useEffect(() => {
        fetchDomaines();
    }, [fetchDomaines]);

    // --- Fetch Existing Data for Editing ---
    useEffect(() => {
        // Only fetch if editing and domaine options are loaded
        if (!isEditing || loadingOptions) {
            // Reset form if switching to create mode
             if (!isEditing && (formData.Code_Chantier || formData.Description || formData.Domaine)) {
                 setFormData({ Code_Chantier: '', Description: '', Domaine: null });
                 setFormErrors({}); setSubmissionStatus({ loading: false, error: null, success: false }); setLoadingData(false);
             }
            return;
        }

        let isMounted = true;
        const fetchChantierData = async () => {
            console.log(`[Form] Fetching chantier data for editing ID: ${itemId}`);
            setLoadingData(true);
            setSubmissionStatus({ loading: false, error: null, success: false });
            setFormErrors({});
            try {
                // Ensure CSRF token if needed by backend session/auth
                // await axios.get(`${baseApiUrl}/sanctum/csrf-cookie`, { withCredentials: true });

                const response = await axios.get(`${baseApiUrl}/chantiers/${itemId}`, { withCredentials: true }); // Add credentials if needed
                const data = response.data.chantier || response.data; // Adjust based on your API response structure

                if (!data) throw new Error("Chantier non trouvé pour modification.");

                if (isMounted) {
                    // Find the correct domaine option based on the CODE stored in id_domaine
                    const selectedDomaine = domaineOptions.find(opt => opt.value === data.Id_Domaine) || null;

                    setFormData({
                        Code_Chantier: String(data.Code_Chantier ?? ''),
                        Description: data.Description ?? '',
                        Domaine: selectedDomaine, // Set the selected object for the Select component
                    });
                }
            } catch (err) {
                console.error("Erreur chargement données chantier:", err);
                if (isMounted) setSubmissionStatus({ loading: false, error: err.message || "Erreur chargement données.", success: false });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };

        fetchChantierData();

        return () => { isMounted = false };

    }, [itemId, isEditing, baseApiUrl, loadingOptions, domaineOptions]); // Depend on options being loaded

    // --- Frontend Validation ---
    const validateForm = () => {
        const errors = {};
        if (!formData.Code_Chantier?.trim()) errors.Code_Chantier = "Le code chantier est requis.";
        if (!formData.Description?.trim()) errors.Description = "La description est requise.";
        if (!formData.Domaine) {
            errors.Domaine = "Le domaine est requis.";
        }
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

    const handleDomaineChange = (selectedOption) => {
        setFormData(prev => ({ ...prev, Domaine: selectedOption }));
        if (formErrors.Domaine) { setFormErrors(prev => ({ ...prev, Domaine: undefined })); }
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

        // Prepare data (using FormData for consistency, though not strictly needed without files)
        const dataToSubmit = new FormData();
        dataToSubmit.append('Code_Chantier', formData.Code_Chantier);
        dataToSubmit.append('Description', formData.Description);
        // IMPORTANT: Send the 'value' (which is the Domaine.Code) as 'id_domaine'
        dataToSubmit.append('Id_Domaine', formData.Domaine.value);

        // --- Determine URL and Method ---
        const url = isEditing
            ? `${baseApiUrl}/chantiers/${itemId}`
            : `${baseApiUrl}/chantiers`;

        const httpMethodConfig = {
            headers: {
                // 'Content-Type': 'multipart/form-data', // Not strictly needed if no file, but often okay
                'Accept': 'application/json',
            },
            withCredentials: true, // If using session/cookie auth
        };

        if (isEditing) {
            dataToSubmit.append('_method', 'PUT'); // Laravel method spoofing
            console.log(`Submitting PUT (via POST) to ${url}`);
        } else {
            console.log(`Submitting POST to ${url}`);
        }

        // Log data before sending
        console.log("Submitting data:");
        for (let pair of dataToSubmit.entries()) { console.log(pair[0] + ': ', pair[1]); }

        // --- API Call ---
        try {
            // Refresh CSRF cookie if needed
            // await axios.get(`${baseApiUrl}/sanctum/csrf-cookie`, { withCredentials: true });

            const response = await axios.post(url, dataToSubmit, httpMethodConfig);
            console.log(`API ${isEditing ? 'Update' : 'Create'} Response:`, response.data);
            setSubmissionStatus({ loading: false, error: null, success: true });

            if (isEditing && onItemUpdated) {
                onItemUpdated();
            } else if (!isEditing && onItemCreated) {
                onItemCreated();
            }
            // Optional: Close form automatically after success
            // setTimeout(onClose, 1500);

        } catch (err) {
            console.error(`Erreur lors de ${isEditing ? 'la modification' : 'la création'}:`, err.response || err);
            let errorMsg = `Une erreur s'est produite.`;
             if (err.response) {
                 if (err.response.status === 422 && typeof err.response.data.errors === 'object') {
                     errorMsg = Object.values(err.response.data.errors).flat().join(' ');
                     // Map backend errors to frontend fields if possible (optional)
                     // const backendErrors = err.response.data.errors;
                     // const clientErrors = {};
                     // if (backendErrors.code_chantier) clientErrors.code_chantier = backendErrors.code_chantier.join(', ');
                     // // ... map other fields ...
                     // setFormErrors(clientErrors);
                 } else if (err.response.data?.message) {
                    errorMsg = err.response.data.message;
                 } else {
                     errorMsg = err.message;
                 }
                 errorMsg += ` (Status: ${err.response.status})`;
            } else {
                 errorMsg = err.message;
            }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    // --- Render Logic ---
    const isSubmitDisabled = submissionStatus.loading || loadingOptions || loadingData;

    if (isEditing && loadingData) {
        return (
            <div className="d-flex justify-content-center align-items-center p-5">
                <Spinner animation="border" variant="primary" />
                <span className='ms-3 text-muted'>Chargement des données...</span>
            </div>
        );
    }

    return (
        <div className="p-3 p-md-4 chantier-form-container" // Apply specific class if needed
             style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5>
                    <h2 className="mb-0 fw-bold">Chantier {isEditing ? `(ID: ${itemId})` : ''}</h2>
                </div>
                 <Button variant="warning" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm' onClick={onClose} size="sm" title="Retour">
                    <b>Revenir a la liste</b>
                 </Button>
            </div>

            {/* Form Content */}
            <div className="flex-grow-1">
                {submissionStatus.error && (
                    <Alert variant="danger" className="mb-3 py-2" onClose={() => setSubmissionStatus(prev => ({ ...prev, error: null }))} dismissible>
                        <FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}
                    </Alert>
                )}
                {submissionStatus.success && (
                    <Alert variant="success" className="mb-3 py-2">
                        Chantier {isEditing ? 'modifié' : 'créé'} avec succès !
                    </Alert>
                )}

                <Form noValidate onSubmit={handleSubmit}>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formCodeChantier">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Code Chantier", "رمز الورشة", true)}</Form.Label>
                            <Form.Control
                                className="p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light "
                                isInvalid={!!formErrors.Code_Chantier}
                                required
                                type="text"
                                name="Code_Chantier"
                                value={formData.Code_Chantier}
                                onChange={handleChange}
                                size="sm"
                            />
                            <Form.Control.Feedback type="invalid">{formErrors.Code_Chantier}</Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group as={Col} md={6} controlId="formDomaine">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Domaine", "المحور الاستراتيجي", true)}</Form.Label>
                            <Select
                                name="Domaine"
                                menuPlacement="auto"
                                options={domaineOptions}
                                value={formData.Domaine}
                                onChange={handleDomaineChange}
                                styles={selectStyles}
                                placeholder="- Sélectionner Domaine -"
                                isClearable
                                isLoading={loadingOptions}
                                className={formErrors.Domaine ? 'is-invalid' : ''} // Apply invalid class to wrapper
                            />
                            {/* Display error message below Select */}
                            {formErrors.Domaine && <div className="invalid-feedback d-block small mt-1">{formErrors.Domaine}</div>}
                             {formErrors.domaines && !loadingOptions && <div className="text-danger small mt-1">{formErrors.domaines}</div>} {/* Error fetching options */}
                         </Form.Group>
                    </Row>

                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={12} controlId="formDescription">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Description", "الوصف", true)}</Form.Label>
                            <Form.Control
                                className="p-2 mt-1 mb-3 rounded-5 shadow-sm bg-light" // Standard rounded, not pill for textarea
                                style={{ borderRadius: '1.5rem'}} // Custom radius if needed
                                isInvalid={!!formErrors.Description}
                                required
                                as="textarea"
                                rows={3}
                                name="Description"
                                value={formData.Description}
                                onChange={handleChange}
                                size="sm"
                            />
                            <Form.Control.Feedback type="invalid">{formErrors.Description}</Form.Control.Feedback>
                        </Form.Group>
                    </Row>

                    {/* Action Buttons */}
                     <Row className="mt-4 pt-2 justify-content-center">
                         <Col xs="auto" className="pe-2"> {/* Adjust padding/margin */}
                             <Button onClick={onClose} variant="danger" className="btn px-5 rounded-5 py-1 border-0" disabled={submissionStatus.loading}>
                                 Annuler
                             </Button>
                         </Col>
                         <Col xs="auto" className="ps-2"> {/* Adjust padding/margin */}
                            <Button type="submit" className="btn rounded-5 px-5 py-1 align-items-center d-flex justify-content-evenly bg-primary border-0" disabled={isSubmitDisabled}>
                                {submissionStatus.loading ? (
                                    <><Spinner as="span" animation="border" size="sm" className="me-2"/> {isEditing ? 'Modification...' : 'Création...'}</>
                                ) : (
                                    isEditing ? 'Enregistrer Modifications' : 'Créer Chantier'
                                )}
                             </Button>
                         </Col>
                     </Row>
                </Form>
            </div>
        </div>
    );
};

// --- PropTypes ---
ChantierForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};
ChantierForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {},
    onItemUpdated: () => {},
};

export default ChantierForm;