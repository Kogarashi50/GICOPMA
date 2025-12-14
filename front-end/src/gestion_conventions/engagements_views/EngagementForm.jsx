// src/pages/engagements_views/EngagementForm.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import PropTypes from 'prop-types';

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

// Styles for react-select (Copied for consistency)
const selectStyles = {
    control: (provided, state) => ({
        ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da', boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px',
    }), valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', }), input: (provided) => ({ ...provided, margin: '0px', padding: '0px', }), indicatorSeparator: () => ({ display: 'none', }), indicatorsContainer: (provided) => ({ ...provided, padding: '1px', }), placeholder: (provided) => ({ ...provided, color: '#6c757d', }), menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1050 }), option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', }),
};

// Placeholder CSS classes (Copied for consistency)
const FORM_CONTAINER_CLASS = "p-3 p-md-4";
const FORM_CONTROL_CLASS = "p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light border-0";
const FORM_TEXTAREA_CLASS = "p-2 mt-1 mb-3 rounded shadow-sm bg-light border-0";
const FORM_ACTIONS_ROW_CLASS = "mt-4 pt-2 justify-content-center";
const FORM_CANCEL_BUTTON_CLASS = "btn px-5 rounded-5 py-1 bg-danger border-0";
const FORM_SUBMIT_BUTTON_CLASS = "btn rounded-5 px-5 py-1 align-items-center d-flex justify-content-evenly bg-primary border-0";
const FORM_HEADER_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm';

const EngagementForm = ({
    itemId = null,
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl = 'http://localhost:8000'
}) => {
    // State using EXACT casing from schema
    const [formData, setFormData] = useState({
        Code_Engag: '',
        Description: '',
        Cout: '',
        Montant_CRO: '',
        Montant_Hors_CRO: '',
        Rang: '',
        Programme: null, // For react-select object { value, label }
    });
    const isEditing = itemId !== null;
    const [programmeOptions, setProgrammeOptions] = useState([]); // Changed from chantierOptions
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(isEditing);

    // Fetch Programmes for Select
    const fetchProgrammes = useCallback(async () => { // Renamed function
        setLoadingOptions(true);
        try {
            const response = await axios.get(`${baseApiUrl}/programmes`); // Fetch programmes
            const data = response.data.programmes || []; // Adjust key if needed
            setProgrammeOptions(data.map(p => ({
                value: p.Code_Programme, // Use Code_Programme as value (FK reference)
                label: `${p.Code_Programme} - ${p.Description}` // Combine for display
            })));
        } catch (err) { setFormErrors(prev => ({ ...prev, programmes: "Err chrgmt programmes." })); }
        finally { setLoadingOptions(false); }
    }, [baseApiUrl]);

    useEffect(() => { fetchProgrammes(); }, [fetchProgrammes]); // Call fetchProgrammes

    // Fetch Existing Data for Editing
    useEffect(() => {
        if (!isEditing || loadingOptions) {
            // Reset form if switching to create mode
             if (!isEditing) { setFormData({ Code_Engag: '', Description: '', Cout: '', Montant_CRO: '', Montant_Hors_CRO: '', Rang: '', Programme: null }); setFormErrors({}); setSubmissionStatus({}); setLoadingData(false); }
            return;
        }
        let isMounted = true;
        const fetchEngagementData = async () => { // Renamed function
            setLoadingData(true); setSubmissionStatus({}); setFormErrors({});
            try {
                const response = await axios.get(`${baseApiUrl}/engagements/${itemId}`, { withCredentials: true }); // Fetch engagement
                const data = response.data.engagement || response.data; // Adjust key based on API
                if (!data) throw new Error("Engagement non trouvé.");
                if (isMounted) {
                    // Find matching programme using the 'Programme' field from data (which holds Code_Programme)
                    const selectedProgramme = programmeOptions.find(opt => opt.value === data.Programme) || null;
                    setFormData({
                        // Use Exact Casing from schema, ensure string where needed
                        Code_Engag: String(data.Code_Engag ?? ''),
                        Description: String(data.Description ?? ''),
                        Cout: data.Cout ?? '', // Keep as number/string from API for number input
                        Montant_CRO: data.Montant_CRO ?? '',
                        Montant_Hors_CRO: data.Montant_Hors_CRO ?? '',
                        Rang: String(data.Rang ?? ''),
                        Programme: selectedProgramme, // Set the selected object
                    });
                }
            } catch (err) { if (isMounted) setSubmissionStatus({ loading: false, error: err.message || "Erreur chargement.", success: false }); }
            finally { if (isMounted) setLoadingData(false); }
        };
        fetchEngagementData(); // Call fetchEngagementData
        return () => { isMounted = false };
    }, [itemId, isEditing, baseApiUrl, loadingOptions, programmeOptions]); // Depend on programmeOptions

    // Frontend Validation
    const validateForm = () => {
        const errors = {};
        // Use Exact Casing for checks
        if (!formData.Code_Engag?.trim()) errors.Code_Engag = "Le code engagement est requis.";
        if (!formData.Description?.trim()) errors.Description = "La description est requise.";
        // Check numeric fields (allow 0, but require value)
        if (formData.Cout === '' || formData.Cout === null || isNaN(parseFloat(formData.Cout))) errors.Cout = "Le coût est requis et doit être un nombre.";
        if (formData.Montant_CRO === '' || formData.Montant_CRO === null || isNaN(parseFloat(formData.Montant_CRO))) errors.Montant_CRO = "Le montant CRO est requis et doit être un nombre.";
        if (formData.Montant_Hors_CRO === '' || formData.Montant_Hors_CRO === null || isNaN(parseFloat(formData.Montant_Hors_CRO))) errors.Montant_Hors_CRO = "Le montant Hors CRO est requis et doit être un nombre.";
        if (!formData.Rang?.trim()) errors.Rang = "Le rang est requis."; // Assuming Rang is text/string
        if (!formData.Programme) errors.Programme = "Le programme est requis.";
        setFormErrors(errors);
        console.log("Validation Errors:", errors); // Log errors for debugging
        return Object.keys(errors).length === 0;
    };

    // Handlers
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleProgrammeChange = (selectedOption) => { // Renamed handler
        setFormData(prev => ({ ...prev, Programme: selectedOption })); // Update Programme state
        if (formErrors.Programme) setFormErrors(prev => ({ ...prev, Programme: undefined }));
    };

    // Submit Handler
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) { setSubmissionStatus({ loading: false, error: "Veuillez corriger.", success: false }); return; }
        setSubmissionStatus({ loading: true, error: null, success: false }); setFormErrors({});

        const dataToSubmit = new FormData();
        // Append using EXACT casing expected by backend validation
        dataToSubmit.append('Code_Engag', formData.Code_Engag);
        dataToSubmit.append('Description', formData.Description);
        dataToSubmit.append('Cout', formData.Cout);
        dataToSubmit.append('Montant_CRO', formData.Montant_CRO);
        dataToSubmit.append('Montant_Hors_CRO', formData.Montant_Hors_CRO);
        dataToSubmit.append('Rang', formData.Rang);
        // Send the selected Programme's value (Code_Programme) as 'Programme'
        dataToSubmit.append('Programme', formData.Programme.value);

        const url = isEditing ? `${baseApiUrl}/engagements/${itemId}` : `${baseApiUrl}/engagements`;
        const httpMethodConfig = { headers: { 'Accept': 'application/json' }, withCredentials: true };
        if (isEditing) dataToSubmit.append('_method', 'PUT');

        console.log("Submitting data:", Object.fromEntries(dataToSubmit.entries())); // Log data being sent

        try {
            await axios.post(url, dataToSubmit, httpMethodConfig);
            setSubmissionStatus({ loading: false, error: null, success: true });
            if (isEditing) onItemUpdated?.(); else onItemCreated?.();
        } catch (err) {
             // Replicate error handling from ProgrammeForm
             let errorMsg = `Une erreur s'est produite.`;
             if (err.response) {
                 if (err.response.status === 422) errorMsg = Object.values(err.response.data.errors).flat().join(' ');
                 else errorMsg = err.response.data?.message || err.message;
                 errorMsg += ` (Status: ${err.response.status})`;
             } else { errorMsg = err.message; }
             setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    const isSubmitDisabled = submissionStatus.loading || loadingOptions || loadingData;
    if (isEditing && loadingData) { return <div className="text-center p-5"><Spinner animation="border" /> Chargement...</div>; }

    return (
        // Apply container styling
        <div className={FORM_CONTAINER_CLASS} style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier l\'' : 'Créer un nouvel'}</h5>
                    <h2 className="mb-0 fw-bold">Engagement {isEditing ? `(ID: ${itemId})` : ''}</h2>
                </div>
                <Button variant="light" className={FORM_HEADER_CLOSE_BUTTON_CLASS} onClick={onClose} size="sm"><b>Revenir à la liste</b></Button>
            </div>
            {/* Form */}
            <div className="flex-grow-1">
                {submissionStatus.error && <Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({...prev, error: null}))}><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}</Alert>}
                {submissionStatus.success && <Alert variant="success" className="mb-3 py-2">Engagement {isEditing ? 'modifié' : 'créé'}!</Alert>}
                <Form noValidate onSubmit={handleSubmit}>
                    {/* Row 1: Code_Engag, Rang */}
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formCodeEngag">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Code Engagement", "رمز الالتزام", true)}</Form.Label>
                            <Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.Code_Engag} required type="text" name="Code_Engag" value={formData.Code_Engag} onChange={handleChange} size="sm"/>
                            <Form.Control.Feedback type="invalid">{formErrors.Code_Engag}</Form.Control.Feedback>
                        </Form.Group>
                         <Form.Group as={Col} md={6} controlId="formRang">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Rang", "الرتبة", true)}</Form.Label>
                            <Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.Rang} required type="text" name="Rang" value={formData.Rang} onChange={handleChange} size="sm"/>
                            <Form.Control.Feedback type="invalid">{formErrors.Rang}</Form.Control.Feedback>
                        </Form.Group>
                    </Row>
                    {/* Row 2: Programme */}
                     <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={12} controlId="formProgramme">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Programme", "البرنامج", true)}</Form.Label>
                            <Select name="Programme" menuPlacement="auto" options={programmeOptions} value={formData.Programme} onChange={handleProgrammeChange} styles={selectStyles} placeholder="- Sélectionner Programme -" isClearable isLoading={loadingOptions} className={formErrors.Programme ? 'is-invalid' : ''} />
                            {formErrors.Programme && <div className="invalid-feedback d-block small mt-1">{formErrors.Programme}</div>}
                            {formErrors.programmes && !loadingOptions && <div className="text-danger small mt-1">{formErrors.programmes}</div>}
                        </Form.Group>
                    </Row>
                     {/* Row 3: Description */}
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={12} controlId="formDescription">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Description", "الوصف", true)}</Form.Label>
                            <Form.Control className={FORM_TEXTAREA_CLASS} style={{borderRadius: '1rem'}} as="textarea" rows={3} isInvalid={!!formErrors.Description} required name="Description" value={formData.Description} onChange={handleChange} size="sm"/>
                            <Form.Control.Feedback type="invalid">{formErrors.Description}</Form.Control.Feedback>
                        </Form.Group>
                    </Row>
                     {/* Row 4: Costs */}
                     <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={4} controlId="formCout">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Coût", "التكلفة", true)}</Form.Label>
                            <Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.Cout} required type="number" name="Cout" value={formData.Cout} onChange={handleChange} size="sm" step="0.01" min="0"/>
                            <Form.Control.Feedback type="invalid">{formErrors.Cout}</Form.Control.Feedback>
                        </Form.Group>
                         <Form.Group as={Col} md={4} controlId="formMontantCRO">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Montant CRO", "مبلغ CRO", true)}</Form.Label>
                            <Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.Montant_CRO} required type="number" name="Montant_CRO" value={formData.Montant_CRO} onChange={handleChange} size="sm" step="0.01" min="0"/>
                            <Form.Control.Feedback type="invalid">{formErrors.Montant_CRO}</Form.Control.Feedback>
                        </Form.Group>
                         <Form.Group as={Col} md={4} controlId="formMontantHorsCRO">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Montant Hors CRO", "المبلغ خارج CRO", true)}</Form.Label>
                            <Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.Montant_Hors_CRO} required type="number" name="Montant_Hors_CRO" value={formData.Montant_Hors_CRO} onChange={handleChange} size="sm" step="0.01" min="0"/>
                            <Form.Control.Feedback type="invalid">{formErrors.Montant_Hors_CRO}</Form.Control.Feedback>
                        </Form.Group>
                    </Row>

                    {/* Actions */}
                    <Row className={FORM_ACTIONS_ROW_CLASS}>
                        <Col xs="auto" className="pe-2"><Button onClick={onClose} variant="secondary" className={FORM_CANCEL_BUTTON_CLASS} disabled={submissionStatus.loading}>Annuler</Button></Col>
                        <Col xs="auto" className="ps-2"><Button type="submit" className={FORM_SUBMIT_BUTTON_CLASS} disabled={isSubmitDisabled}>{submissionStatus.loading ? <><Spinner as="span" animation="border" size="sm" className="me-2"/>...</> : (isEditing ? 'Enregistrer' : 'Créer')}</Button></Col>
                    </Row>
                </Form>
            </div>
        </div>
    );
};

EngagementForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};
EngagementForm.defaultProps = {
    itemId: null, onItemCreated: ()=>{}, onItemUpdated: ()=>{}
}

export default EngagementForm;