// src/pages/programmes_views/ProgrammeForm.jsx

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

// Styles for react-select (Copied from ConventionForm for consistency)
const selectStyles = {
    control: (provided, state) => ({
        ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da', boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px',
    }), valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', }), input: (provided) => ({ ...provided, margin: '0px', padding: '0px', }), indicatorSeparator: () => ({ display: 'none', }), indicatorsContainer: (provided) => ({ ...provided, padding: '1px', }), placeholder: (provided) => ({ ...provided, color: '#6c757d', }), menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1050 }), option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', }),
};

// Placeholder CSS classes (Define these in your CSS file based on ConventionForm styles)
const FORM_CONTAINER_CLASS = "p-3 p-md-4"; // Base padding
const FORM_CONTROL_CLASS = "p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light "; // Pill style for inputs
const FORM_TEXTAREA_CLASS = "p-2 mt-1 mb-3 rounded-4 shadow-sm bg-light "; // Slightly different for textarea
const FORM_ACTIONS_ROW_CLASS = "mt-4 pt-2 justify-content-center";
const FORM_CANCEL_BUTTON_CLASS = "btn px-5 rounded-5 py-1 bg-danger border-0"; // Match cancel button style
const FORM_SUBMIT_BUTTON_CLASS = "btn rounded-5 px-5 py-1 align-items-center d-flex justify-content-evenly bg-primary border-0"; // Match submit button style
const FORM_HEADER_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm'; // Match header close button

const ProgrammeForm = ({
    itemId = null,
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl = 'http://localhost:8000/api'
}) => {
    const [formData, setFormData] = useState({
        Code_Programme: '',
        Description: '',
        Domaine: null, // For react-select object { value, label }
    });
    const isEditing = itemId !== null;
    const [domaineOptions, setDomaineOptions] = useState([]); // NEW
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(isEditing);

const fetchDomaines = useCallback(async () => { // Renamed
    setLoadingOptions(true);
    try {
        // Use the new, correct endpoint that you created
        const response = await axios.get(`${baseApiUrl}/options/domaines`, { withCredentials: true });
        // The getOptions method already returns the correct {value, label} format
        setDomaineOptions(response.data || []);
    } catch (err) {
        console.error("Erreur chargement Axe stratégique:", err);
        setFormErrors(prev => ({ ...prev, domaines: "Erreur chargement des Axes stratégiques." }));
    }
    finally { setLoadingOptions(false); }
}, [baseApiUrl]);

useEffect(() => { fetchDomaines(); }, [fetchDomaines]); // Call the renamed function

    useEffect(() => {
        if (!isEditing || loadingOptions) {
             if (!isEditing) { setFormData({ Code_Programme: '', Description: '', Domaine: null }); setFormErrors({}); setSubmissionStatus({}); setLoadingData(false); }
            return;
        }
        let isMounted = true;
        const fetchProgrammeData = async () => {
            setLoadingData(true); setSubmissionStatus({}); setFormErrors({});
            try {
                const response = await axios.get(`${baseApiUrl}/programmes/${itemId}`, { withCredentials: true });
                const data = response.data.programme || response.data;
                if (!data) throw new Error("Programme non trouvé.");
                if (isMounted) {
                    const selectedDomaine = domaineOptions.find(opt => opt.value === data.domaine_id) || null;
                    setFormData({
                    Code_Programme: String(data.Code_Programme ?? ''),
                    Description: String(data.Description ?? ''),
                    Domaine: selectedDomaine,
                                });
                }
            } catch (err) { if (isMounted) setSubmissionStatus({ loading: false, error: err.message || "Erreur chargement.", success: false }); }
            finally { if (isMounted) setLoadingData(false); }
        };
        fetchProgrammeData();
        return () => { isMounted = false };
    }, [itemId, isEditing, baseApiUrl, loadingOptions, domaineOptions]);

    const validateForm = () => {
        const errors = {};
        if (!formData.Code_Programme?.trim()) errors.Code_programme = "Le code programme est requis.";
        if (!formData.Description?.trim()) errors.Description = "La description est requise.";
        if (!formData.Domaine) errors.Domaine = "L'axe stratégique est requis."; // Corrected check
    setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
    };

const handleDomaineChange = (selectedOption) => {
    setFormData(prev => ({ ...prev, Domaine: selectedOption }));
    if (formErrors.Domaine) setFormErrors(prev => ({ ...prev, Domaine: undefined }));
};
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) { setSubmissionStatus({ loading: false, error: "Veuillez corriger.", success: false }); return; }
        setSubmissionStatus({ loading: true, error: null, success: false }); setFormErrors({});

        const dataToSubmit = new FormData();
        dataToSubmit.append('Code_Programme', formData.Code_Programme);
        dataToSubmit.append('Description', formData.Description);
dataToSubmit.append('domaine_id', formData.Domaine.value); // <-- Correct field name and source

        const url = isEditing ? `${baseApiUrl}/programmes/${itemId}` : `${baseApiUrl}/programmes`;
        const httpMethodConfig = { headers: { 'Accept': 'application/json' }, withCredentials: true };
        if (isEditing) dataToSubmit.append('_method', 'PUT');

        try {
            await axios.post(url, dataToSubmit, httpMethodConfig);
            setSubmissionStatus({ loading: false, error: null, success: true });
            if (isEditing) onItemUpdated?.(); else onItemCreated?.();
        } catch (err) {
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
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5>
                    <h2 className="mb-0 fw-bold">Programme {isEditing ? `(ID: ${itemId})` : ''}</h2>
                </div>
                <Button variant="light" className={FORM_HEADER_CLOSE_BUTTON_CLASS} onClick={onClose} size="sm"><b>Revenir à la liste</b></Button>
            </div>
            {/* Form */}
            <div className="flex-grow-1">
                {submissionStatus.error && <Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({...prev, error: null}))}><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}</Alert>}
                {submissionStatus.success && <Alert variant="success" className="mb-3 py-2">Programme {isEditing ? 'modifié' : 'créé'}!</Alert>}
                <Form noValidate onSubmit={handleSubmit}>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formCodeProgramme">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Code Programme", "رمز البرنامج", true)}</Form.Label>
                            <Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.Code_Programme} required type="text" name="Code_Programme" value={formData.Code_Programme} onChange={handleChange} size="sm"/>
                            <Form.Control.Feedback type="invalid">{formErrors.Code_programme}</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Control.Feedback type="invalid">{formErrors.Code_Programme}</Form.Control.Feedback>
                        <Form.Group as={Col} md={6} controlId="formDomaine">
    <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Axe stratégique", "المحور الاستراتيجي", true)}</Form.Label>
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
        className={formErrors.Domaine ? 'is-invalid' : ''}
    />
    {formErrors.Domaine && <div className="invalid-feedback d-block small mt-1">{formErrors.Domaine}</div>}
    {formErrors.domaines && !loadingOptions && <div className="text-danger small mt-1">{formErrors.domaines}</div>}
</Form.Group>

                    </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={12} controlId="formDescription">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Description", "الوصف", true)}</Form.Label>
                            {/* Use different style class for textarea if needed */}
                            <Form.Control className={FORM_TEXTAREA_CLASS} style={{borderRadius: '1rem'}} as="textarea" rows={3} isInvalid={!!formErrors.Description} required name="Description" value={formData.Description} onChange={handleChange} size="sm"/>
                            <Form.Control.Feedback type="invalid">{formErrors.Description}</Form.Control.Feedback>
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

ProgrammeForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};
ProgrammeForm.defaultProps = {
    itemId: null, onItemCreated: ()=>{}, onItemUpdated: ()=>{}
}

export default ProgrammeForm;