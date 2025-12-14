// src/gestion_conventions/communes_views/CommuneForm.jsx (Example Path)

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';

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

const CommuneForm = ({
    itemId = null, // Use 'Id' from DB as the identifier
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl = 'http://localhost:8000/api'
}) => {
    const isEditing = itemId !== null;

    // --- State uses PascalCase keys matching DB/Model ---
    const [formData, setFormData] = useState({
        Code: '',          // Matches DB 'Code' column
        Description: '',   // Matches DB 'Description' column
        Description_Arr: '', // Matches DB 'Description_Arr' column
        province_id: null, // Province selection
    });
    // --- End State Name Change ---

    const [loadingData, setLoadingData] = useState(isEditing);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [provinceOptions, setProvinceOptions] = useState([]);
    const [loadingProvinces, setLoadingProvinces] = useState(true);
    
    const selectStyles = {
        control: (provided, state) => ({
            ...provided,
            backgroundColor: '#f8f9fa',
            borderRadius: '1.5rem',
            border: state.selectProps.className?.includes('is-invalid') ? '1px solid #dc3545' : (state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'),
            boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
            minHeight: '38px',
            fontSize: '0.875rem',
        }),
        valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem' }),
        input: (provided) => ({ ...provided, margin: '0px', fontSize: '0.875rem' }),
        indicatorSeparator: () => ({ display: 'none' }),
        indicatorsContainer: (provided) => ({ ...provided, padding: '1px' }),
        placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }),
        menu: (provided) => ({ ...provided, borderRadius: '0.5rem', zIndex: 1055 }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : 'white',
            color: state.isSelected ? 'white' : 'black',
            fontSize: '0.875rem',
        }),
    };

    // Fetch Province Options
    useEffect(() => {
        const fetchProvinces = async () => {
            setLoadingProvinces(true);
            try {
                const response = await axios.get(`${baseApiUrl}/options/provinces`, { withCredentials: true });
                const provinces = Array.isArray(response.data) ? response.data : (response.data.data || []);
                setProvinceOptions(provinces);
            } catch (err) {
                console.error("Erreur chargement provinces:", err);
            } finally {
                setLoadingProvinces(false);
            }
        };
        fetchProvinces();
    }, [baseApiUrl]);

    // Fetch Existing Data for Editing
    useEffect(() => {
        if (!isEditing) {
             setFormData({ Code: '', Description: '', Description_Arr: '', province_id: null }); // Reset with PascalCase
             setFormErrors({}); setLoadingData(false); setSubmissionStatus({loading:false, error:null, success:false});
             return;
        }

        let isMounted = true;
        const fetchCommuneData = async () => {
            console.log(`[CommuneForm] Fetching data for editing ID: ${itemId}`);
            setLoadingData(true); setSubmissionStatus({loading:false, error:null, success:false}); setFormErrors({});
            try {
                // await axios.get(`${baseApiUrl}/sanctum/csrf-cookie`, { withCredentials: true }).catch(()=>{});
                const response = await axios.get(`${baseApiUrl}/communes/${itemId}`, { withCredentials: true }); // API endpoint for communes
                const data = response.data.commune || response.data; // Adjust based on API response structure
                console.log("[CommuneForm] Fetched Data:", data);

                if (!data) throw new Error("Commune non trouvée pour modification.");

                if (isMounted) {
                    // Populate state using PascalCase keys from API response/DB
                    setFormData({
                        Code: data.Code ?? '',
                        Description: data.Description ?? '',
                        Description_Arr: data.Description_Arr ?? '',
                        province_id: data.province_id || null,
                    });
                }
            } catch (err) {
                console.error("Erreur chargement données commune:", err);
                if (isMounted) setSubmissionStatus({ loading: false, error: err.message || "Erreur chargement des données.", success: false });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };

        fetchCommuneData();
        return () => { isMounted = false };

    }, [itemId, isEditing, baseApiUrl]);

    // --- Frontend Validation ---
    const validateForm = () => {
        const errors = {};
        // Validate against formData state keys (PascalCase)
        if (!formData.Code) errors.Code = "Le code est requis."; else if (isNaN(parseInt(formData.Code))) errors.Code = "Le code doit être un nombre.";
        if (!formData.Description?.trim()) errors.Description = "La description FR est requise.";
        if (!formData.Description_Arr?.trim()) errors.Description_Arr = "La description AR est requise."; // Assuming required

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        // Update state using the name from the form control (PascalCase)
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

        // --- Prepare data object with keys expected by the BACKEND ---
        // *** IMPORTANT: Assuming backend validation now expects PascalCase ***
        const dataToSubmit = {
            Code: formData.Code,                // Keep PascalCase if backend expects it
            Description: formData.Description,      // Keep PascalCase if backend expects it
            Description_Arr: formData.Description_Arr ?? '', // Keep PascalCase if backend expects it
            province_id: formData.province_id || null
        };
        // --- End data preparation ---

        const url = isEditing ? `${baseApiUrl}/communes/${itemId}` : `${baseApiUrl}/communes`;
        const method = isEditing ? 'put' : 'post';

        console.log(`Submitting ${method.toUpperCase()} to ${url}`, dataToSubmit);

        try {
            await axios.get(`${baseApiUrl}/sanctum/csrf-cookie`, { withCredentials: true }).catch(()=>{});

            let response;
            // Send the dataToSubmit object (Axios sends as JSON)
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
            if (err.response) {
                 if (err.response.status === 422 && typeof err.response.data.errors === 'object') {
                     // Map backend keys (assumed PascalCase now) back to state keys (PascalCase)
                     errorMsg = Object.values(err.response.data.errors).flat().join(' ');
                     setFormErrors(err.response.data.errors); // Directly set errors if keys match state
                 }
                 else if (err.response.data?.message) { errorMsg = err.response.data.message; }
                 else if (typeof err.response.data === 'string') { errorMsg = err.response.data; }
                 errorMsg += ` (Status: ${err.response.status})`;
            } else { errorMsg = err.message; }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    // Render Loading State for Edit
    if (isEditing && loadingData) { /* ... loading indicator ... */ }

    // --- Main Form Render ---
    return (<div className='px-5'>
     <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5>
                        <h2 className="mb-0 fw-bold">Commune {isEditing ? `(ID: ${itemId})` : ''}</h2>
                    </div>
                     <Button variant="warning" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm' onClick={onClose} size="sm" title="Retour">
                        <b>Revenir a la liste</b>
                     </Button>
                </div>

<Form noValidate onSubmit={handleSubmit} className='p-2'>
            {submissionStatus.error && ( <Alert variant="danger" className="mb-3 py-2"><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}</Alert> )}
            {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2">Opération réussie !</Alert> )}

            <Row className="mb-3">
                <Form.Group as={Col} md={4} controlId="communeCode">
                    <Form.Label className="small mb-1 w-100">{bilingualLabel("Code", "الرمز", true)}</Form.Label>
                    <Form.Control
                      className="p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light "

                        type="number"
                        name="Code" // <<< Use PascalCase
                        value={formData.Code}
                        onChange={handleChange}
                        isInvalid={!!formErrors.Code} // <<< Use PascalCase
                        required
                        size="sm"
                    />
                    <Form.Control.Feedback type="invalid">{formErrors.Code}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group as={Col} md={8} controlId="communeProvince">
                    <Form.Label className="small mb-1 w-100">{bilingualLabel("Province", "الإقليم")}</Form.Label>
                    <Select
                        styles={selectStyles}
                        options={provinceOptions}
                        value={provinceOptions.find(opt => opt.value === formData.province_id) || null}
                        onChange={(selected) => {
                            setFormData(prev => ({ ...prev, province_id: selected ? selected.value : null }));
                            if (formErrors.province_id) {
                                setFormErrors(prev => ({ ...prev, province_id: undefined }));
                            }
                        }}
                        isClearable
                        isLoading={loadingProvinces}
                        placeholder="Sélectionner une province..."
                        isDisabled={loadingProvinces || submissionStatus.loading}
                        className={formErrors.province_id ? 'is-invalid' : ''}
                    />
                    {formErrors.province_id && (
                        <div className="invalid-feedback d-block">{formErrors.province_id}</div>
                    )}
                </Form.Group>
            </Row>
            <Row className="mb-3">
                 <Form.Group as={Col} md={12} controlId="communeDescription">
                    <Form.Label className="small mb-1 w-100">{bilingualLabel("Description (Français)", "الوصف (بالفرنسية)", true)}</Form.Label>
                    <Form.Control
                        className="p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light "
                        type="text"
                        name="Description" // <<< Use PascalCase
                        value={formData.Description}
                        onChange={handleChange}
                        isInvalid={!!formErrors.Description} // <<< Use PascalCase
                        required
                        size="sm"
                    />
                     <Form.Control.Feedback type="invalid">{formErrors.Description}</Form.Control.Feedback>
                </Form.Group>
            </Row>
             <Row className="mb-4">
                 <Form.Group as={Col} md={12} controlId="communeDescriptionArr">
                    <Form.Label className="small mb-1 w-100">{bilingualLabel("Description (Arabe)", "الوصف (بالعربية)", true)}</Form.Label>
                    <Form.Control
                        className=" text-right-arabic p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light "

                        type="text"
                        name="Description_Arr" // <<< Use PascalCase
                        value={formData.Description_Arr}
                        onChange={handleChange}
                        isInvalid={!!formErrors.Description_Arr} // <<< Use PascalCase
                        required
                        size="sm"
                        dir="rtl"
                    />
                    <Form.Control.Feedback type="invalid">{formErrors.Description_Arr}</Form.Control.Feedback>
                </Form.Group>
            </Row>

            {/* Action Buttons */}
            <div className="d-flex justify-content-center border-top pt-3 mt-3">
                <Button variant="danger" onClick={onClose} className="me-2 rounded-5 px-5" disabled={submissionStatus.loading}> Annuler </Button>
                <Button variant="primary" type="submit" className="px-5 rounded-5" disabled={submissionStatus.loading}>
                    {submissionStatus.loading ? <Spinner as="span" animation="border" size="sm" className="me-2"/> : null}
                    {isEditing ? 'Enregistrer' : 'Créer'}
                </Button>
            </div>
        </Form></div>
    );
};

// PropTypes
CommuneForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};

CommuneForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {},
    onItemUpdated: () => {},
    baseApiUrl: 'http://localhost:8000', // Ensure default is set
};


export default CommuneForm;