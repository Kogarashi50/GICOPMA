// src/pages/sousprojets_views/SousProjetForm.jsx (Merged - V1 Structure + V2 Validation)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faUsers } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';

// Styles for react-select (Using V1 definition including multi-select)
const selectStyles = {
    control: (provided, state) => ({ ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.selectProps.className?.includes('is-invalid') ? '#dc3545' : (state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'), boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', fontSize: '0.875rem', }),
    valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden', }), // Allow wrap for multi
    input: (provided) => ({ ...provided, margin: '0px', padding: '0px', fontSize: '0.875rem' }),
    indicatorSeparator: () => ({ display: 'none', }),
    indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }),
    placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }),
    menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }), // Increased zIndex
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px', }),
    multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', fontSize: '0.8rem' }),
    multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white', }, }),
    noOptionsMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    loadingMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
};

// CSS Classes (Using V1 constants)
const FORM_CONTAINER_CLASS = "p-3 p-md-4 sousprojet-form-container";
const inputClass = "form-control form-control-sm rounded-pill shadow-sm bg-light border";
const textareaClass = "form-control form-control-sm rounded-3 shadow-sm bg-light border";
const FORM_ACTIONS_ROW_CLASS = "mt-4 pt-2 justify-content-center flex-shrink-0";
const FORM_CANCEL_BUTTON_CLASS = "btn px-5 rounded-5 py-2 shadow-sm"; // V1 button style
const FORM_SUBMIT_BUTTON_CLASS = "btn rounded-5 px-5 py-2 align-items-center d-flex justify-content-evenly border-0 shadow-sm"; // V1 button style
const FORM_HEADER_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold'; // V1 close button style

// --- Helper Function for Parsing Multi-Select String (From V1) ---
const findMultiOptions = (options, valuesString) => {
    if (!valuesString || typeof valuesString !== 'string' || !options?.length) return [];
    const selectedValues = valuesString.split(';').map(v => String(v).trim().toLowerCase()).filter(v => v);
    return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase()));
};
// --- End Helper ---

// --- Component Definition ---
const SousProjetForm = ({
    itemId = null, onClose, onItemCreated, onItemUpdated, baseApiUrl = 'http://localhost:8000/api' // Use /api default from V1
}) => {
    // --- State Definitions (Include fonctionnaires from V1) ---
    const initialFormData = useMemo(() => ({
        Code_Sous_Projet: '', Nom_Projet: '', Observations: '', Etat_Avan_Physi: '',
        Etat_Avan_Finan: '', Estim_Initi: '', Secteur: '', Localite: '', Centre: '',
        Site: '', Surface: '', Lineaire: '', Status: '', Douars_Desservis: '',
        Financement: '', Nature_Intervention: '', Benificiaire: '',
        projetMaitre: null, province: null, commune: null,
        fonctionnaires: [], // V1 state
    }), []);

    const [formData, setFormData] = useState(initialFormData);
    const isEditing = useMemo(() => itemId !== null, [itemId]);

    const [projetOptions, setProjetOptions] = useState([]);
    const [provinceOptions, setProvinceOptions] = useState([]);
    const [communeOptions, setCommuneOptions] = useState([]);
    const [fonctionnaireOptions, setFonctionnaireOptions] = useState([]); // V1 state

    const [loadingOptions, setLoadingOptions] = useState({ projets: true, provinces: true, communes: true, fonctionnaires: true }); // V1 granular loading
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(isEditing);

    const apiPrefix = ''; // V1 approach: keep prefix empty if baseApiUrl includes /api

    // --- Fetch Callbacks (Include fetchFonctionnaires from V1) ---
    const fetchProjets = useCallback(async () => { setLoadingOptions(prev => ({ ...prev, projets: true })); try { const response = await axios.get(`${baseApiUrl}${apiPrefix}/projets`, { params: { per_page: 1000 }, withCredentials: true }); const rawData = response.data.projets || response.data.data || response.data || []; if (!Array.isArray(rawData)) throw new Error("Format réponse API incorrect (projets)."); const mappedOptions = rawData.map(p => ({ value: p.Code_Projet, label: `${p.Code_Projet} - ${p.Nom_Projet}` })); setProjetOptions(mappedOptions); setFormErrors(prev => ({ ...prev, projets: undefined })); } catch (err) { console.error("Err loading projets:", err); setFormErrors(prev => ({ ...prev, projets: "Err chrgmt projets." })); setProjetOptions([]); } finally { setLoadingOptions(prev => ({ ...prev, projets: false })); } }, [baseApiUrl, apiPrefix]);
    const fetchProvinces = useCallback(async () => { setLoadingOptions(prev => ({ ...prev, provinces: true })); setProvinceOptions([]); try { const response = await axios.get(`${baseApiUrl}${apiPrefix}/provinces`, { withCredentials: true }); const rawData = response.data.provinces || response.data.data || response.data || []; if (!Array.isArray(rawData)) throw new Error("Format réponse API incorrect (provinces)."); const mappedOptions = rawData.map(p => ({ value: p.Id, label: p.Description })).filter(Boolean); setProvinceOptions(mappedOptions); setFormErrors(prev => ({ ...prev, provinces: undefined })); } catch (err) { console.error("Err loading provinces:", err); setFormErrors(prev => ({ ...prev, provinces: "Err chrgmt provinces." })); } finally { setLoadingOptions(prev => ({ ...prev, provinces: false })); } }, [baseApiUrl, apiPrefix]);
    const fetchCommunes = useCallback(async () => { setLoadingOptions(prev => ({ ...prev, communes: true })); setCommuneOptions([]); try { const response = await axios.get(`${baseApiUrl}${apiPrefix}/communes`, { withCredentials: true }); const rawData = response.data.communes || response.data.data || response.data || []; if (!Array.isArray(rawData)) throw new Error("Format réponse API incorrect (communes)."); const mappedOptions = rawData.map(c => ({ value: c.Id, label: c.Description })).filter(Boolean); setCommuneOptions(mappedOptions); setFormErrors(prev => ({ ...prev, communes: undefined })); } catch (err) { console.error("Err loading communes:", err); setFormErrors(prev => ({ ...prev, communes: "Err chrgmt communes." })); } finally { setLoadingOptions(prev => ({ ...prev, communes: false })); } }, [baseApiUrl, apiPrefix]);
    const fetchFonctionnaires = useCallback(async () => { setLoadingOptions(prev => ({ ...prev, fonctionnaires: true })); setFonctionnaireOptions([]); try { const response = await axios.get(`${baseApiUrl}${apiPrefix}/fonctionnaires`, { withCredentials: true }); const rawData = response.data.fonctionnaires || response.data.data || response.data || []; if (!Array.isArray(rawData)) throw new Error("Format réponse API incorrect (fonctionnaires)."); const mappedOptions = rawData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` })).sort((a, b) => a.label.localeCompare(b.label)); setFonctionnaireOptions(mappedOptions); setFormErrors(prev => ({ ...prev, fonctionnaires: undefined })); } catch (err) { console.error("Err loading fonctionnaires:", err); setFormErrors(prev => ({ ...prev, fonctionnaires: "Err chrgmt fonctionnaires." })); } finally { setLoadingOptions(prev => ({ ...prev, fonctionnaires: false })); } }, [baseApiUrl, apiPrefix]); // V1 Fonctionnaire Fetch

    // --- useEffect to run fetches on mount ---
    useEffect(() => {
        fetchProjets(); fetchProvinces(); fetchCommunes(); fetchFonctionnaires(); // Fetch all
    }, [fetchProjets, fetchProvinces, fetchCommunes, fetchFonctionnaires]);

    // --- optionsFinishedLoading (V1 includes fonctionnaires) ---
    const optionsFinishedLoading = useMemo(() =>
        !loadingOptions.projets && !loadingOptions.provinces && !loadingOptions.communes && !loadingOptions.fonctionnaires,
        [loadingOptions]
    );

    // --- useEffect to Fetch Existing Data (Includes Fonctionnaire logic from V1) ---
    useEffect(() => {
        if (!isEditing) { /* ... reset logic ... */ if (formData.Code_Sous_Projet) { setFormData(initialFormData); setFormErrors({}); setLoadingData(false); setSubmissionStatus({}); } return; }
        if (!optionsFinishedLoading) { /* ... wait logic ... */ setLoadingData(true); return; }

        let isMounted = true;
        const fetchSousProjetData = async () => {
            setLoadingData(true); setSubmissionStatus({}); setFormErrors({});
            console.log(`[SousProjetForm Edit] Fetching data for ID: ${itemId}`);
            try {
                const response = await axios.get(`${baseApiUrl}${apiPrefix}/sousprojets/${itemId}`, { withCredentials: true });
                const data = response.data.sousprojet || response.data.sous_projet || response.data;
                console.log("[SousProjetForm Edit] Fetched Data:", data);
                if (!data || !isMounted) return;

                const findOption = (options, valueToFind) => options?.find(opt => String(opt.value) === String(valueToFind)) || null;
                const selectedFonctionnaires = findMultiOptions(fonctionnaireOptions, data.id_fonctionnaire); // V1 logic

                if (isMounted) {
                    setFormData({
                        // ... other fields ...
                        Code_Sous_Projet: String(data.Code_Sous_Projet ?? ''), Nom_Projet: data.Nom_Projet ?? '', Observations: data.Observations ?? '', Etat_Avan_Physi: data.Etat_Avan_Physi ?? '', Etat_Avan_Finan: data.Etat_Avan_Finan ?? '', Estim_Initi: data.Estim_Initi ?? '', Secteur: data.Secteur ?? '', Localite: data.Localite ?? '', Centre: data.Centre ?? '', Site: data.Site ?? '', Surface: data.Surface ?? '', Lineaire: data.Lineaire ?? '', Status: data.Status ?? '', Douars_Desservis: data.Douars_Desservis ?? '', Financement: data.Financement ?? '', Nature_Intervention: data.Nature_Intervention ?? '', Benificiaire: data.Benificiaire ?? '',
                        projetMaitre: findOption(projetOptions, data.ID_Projet_Maitre),
                        province: findOption(provinceOptions, data.Id_Province),
                        commune: findOption(communeOptions, data.Id_Commune),
                        fonctionnaires: selectedFonctionnaires, // Set array for multi-select
                    });
                }
            } catch (err) { /* ... error handling ... */ console.error("[SousProjetForm Edit] Error loading data:", err.response || err); const errorMsg = err.response?.data?.message || err.response?.data?.failed || err.message || "Erreur chargement données."; if (isMounted) setSubmissionStatus({ loading: false, error: errorMsg + (err.response ? ` (Status: ${err.response.status})` : ''), success: false }); }
            finally { if (isMounted) setLoadingData(false); }
        };
        fetchSousProjetData();
        return () => { isMounted = false };
    }, [itemId, isEditing, baseApiUrl, apiPrefix, optionsFinishedLoading, projetOptions, provinceOptions, communeOptions, fonctionnaireOptions, initialFormData]); // Added fonctionnaireOptions


    // --- Validation (Using Code 2's less strict logic) ---
    const validateForm = () => {
        const errors = {};
        // Required text fields (from Code 2)
        if (!formData.Code_Sous_Projet?.trim() && !isEditing) errors.Code_Sous_Projet = "Code Sous-Projet requis."; // Only require on create
        if (!formData.Nom_Projet?.trim()) errors.Nom_Projet = "Nom Sous-Projet requis.";
        // Secteur, Status are NOT required here

        // Required Selects (from Code 2 - Commune NOT required)
        if (!formData.projetMaitre) errors.ID_Projet_Maitre = "Projet Maître requis.";
        if (!formData.province) errors.Id_Province = "Province requise.";
        // if (!formData.commune) errors.Id_Commune = "Commune requise."; // Commune is Optional

        // Numeric fields (from Code 2 - only checks 0-100 for avancements)
        const checkNumeric = (field, name) => {
            const value = formData[field];
             // Allow empty/null for optional fields unless specific range needed
             if (value !== '' && value !== null && value !== undefined) {
                 if ((field === 'Etat_Avan_Physi' || field === 'Etat_Avan_Finan') && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
                     errors[field] = `${name} doit être entre 0 et 100.`;
                 } else if (isNaN(parseFloat(value))) { // General numeric check for others if non-empty
                     errors[field] = `${name} doit être un nombre.`;
                 } else if (field !== 'Etat_Avan_Physi' && field !== 'Etat_Avan_Finan' && parseFloat(value) < 0) {
                     // Optional check for negativity on other fields if needed
                     // errors[field] = `${name} ne peut pas être négatif.`;
                 }
             }
             // Add back REQUIRED checks if needed based on actual requirements, e.g.:
             // else if (field === 'Etat_Avan_Physi') { errors[field] = `${name} requis.`; }
        };
        checkNumeric('Etat_Avan_Physi', 'Av. Physique (%)');
        checkNumeric('Etat_Avan_Finan', 'Av. Financier (%)');
        checkNumeric('Estim_Initi', 'Estimation Initiale');
        checkNumeric('Surface', 'Surface'); // Optional check
        checkNumeric('Lineaire', 'Linéaire'); // Optional check

        // Optional: Add frontend validation for fonctionnaires if needed
        // if (!formData.fonctionnaires || formData.fonctionnaires.length === 0) {
        //     errors.id_fonctionnaire = "Au moins un point focal est requis.";
        // }

        setFormErrors(errors);
        console.log("[SousProjetForm] Validation Errors (using Code 2 logic):", errors);
        return Object.keys(errors).length === 0;
    };

    // --- Handlers (Including Fonctionnaire Handler from V1) ---
    const handleChange = (e) => { /* ... V1 ... */ const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); if (formErrors[name]) { setFormErrors(prev => ({ ...prev, [name]: undefined })); } };
    const handleProjetMaitreChange = (selectedOption) => { /* ... V1 ... */ setFormData(prev => ({ ...prev, projetMaitre: selectedOption })); if (formErrors.ID_Projet_Maitre) setFormErrors(prev => ({ ...prev, ID_Projet_Maitre: undefined })); };
    const handleProvinceChange = (selectedOption) => { /* ... V1 ... */ setFormData(prev => ({ ...prev, province: selectedOption })); if (formErrors.Id_Province) setFormErrors(prev => ({ ...prev, Id_Province: undefined })); };
    const handleCommuneChange = (selectedOption) => { /* ... V1 ... */ setFormData(prev => ({ ...prev, commune: selectedOption })); if (formErrors.Id_Commune) setFormErrors(prev => ({ ...prev, Id_Commune: undefined })); };
    const handleFonctionnaireChange = useCallback((selectedOptions) => { /* V1 handler */ setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] })); if (formErrors.id_fonctionnaire) { setFormErrors(prev => ({ ...prev, id_fonctionnaire: undefined })); } }, [formErrors.id_fonctionnaire]);


    // --- Submit Handler (Includes Fonctionnaire logic from V1) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmissionStatus({ loading: true, error: null, success: false });
        setFormErrors({});

        if (!validateForm()) { // Uses the merged (Code 2 logic) validation
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs.", success: false });
            return;
        }

        const dataToSubmit = new FormData();
        // Append standard fields (sending empty strings for nullable based on V2 logic)
        if (!isEditing) dataToSubmit.append('Code_Sous_Projet', formData.Code_Sous_Projet);
        dataToSubmit.append('Nom_Projet', formData.Nom_Projet);
        dataToSubmit.append('Etat_Avan_Physi', formData.Etat_Avan_Physi ?? ''); // Send empty if null/undefined
        dataToSubmit.append('Etat_Avan_Finan', formData.Etat_Avan_Finan ?? ''); // Send empty if null/undefined
        dataToSubmit.append('Estim_Initi', formData.Estim_Initi ?? '');     // Send empty if null/undefined
        dataToSubmit.append('Secteur', formData.Secteur ?? '');
        dataToSubmit.append('Status', formData.Status ?? '');
        if (formData.projetMaitre?.value) dataToSubmit.append('ID_Projet_Maitre', formData.projetMaitre.value);
        if (formData.province?.value) dataToSubmit.append('Id_Province', formData.province.value);
        if (formData.commune?.value) dataToSubmit.append('Id_Commune', formData.commune.value); // Only send if selected
        dataToSubmit.append('Observations', formData.Observations ?? '');
        dataToSubmit.append('Localite', formData.Localite ?? '');
        dataToSubmit.append('Centre', formData.Centre ?? '');
        dataToSubmit.append('Site', formData.Site ?? '');
        dataToSubmit.append('Surface', formData.Surface ?? '');
        dataToSubmit.append('Lineaire', formData.Lineaire ?? '');
        dataToSubmit.append('Douars_Desservis', formData.Douars_Desservis ?? '');
        dataToSubmit.append('Financement', formData.Financement ?? '');
        dataToSubmit.append('Nature_Intervention', formData.Nature_Intervention ?? '');
        dataToSubmit.append('Benificiaire', formData.Benificiaire ?? '');

        // Prepare and append fonctionnaire string (V1 logic)
        const fonctionnaireIdsString = formData.fonctionnaires.map(f => f.value).join(';');
        dataToSubmit.append('id_fonctionnaire', fonctionnaireIdsString || ''); // Send empty string if none selected

        // API Call logic (V1 structure)
        const url = isEditing ? `${baseApiUrl}${apiPrefix}/sousprojets/${itemId}` : `${baseApiUrl}${apiPrefix}/sousprojets`;
        const httpMethodConfig = { headers: { 'Accept': 'application/json' }, withCredentials: true };
        if (isEditing) { dataToSubmit.append('_method', 'PUT'); console.log(`[SousProjetForm] Submitting PUT (via POST) to ${url}`); }
        else { console.log(`[SousProjetForm] Submitting POST to ${url}`); }

        try {
            const response = await axios.post(url, dataToSubmit, httpMethodConfig);
            console.log(`[SousProjetForm] API ${isEditing ? 'Update' : 'Create'} Response:`, response.data);
            setSubmissionStatus({ loading: false, error: null, success: true });

            const submittedData = response.data.sousprojet || Object.fromEntries(dataToSubmit.entries());
            if (submittedData._method) delete submittedData._method;

            if (isEditing && onItemUpdated) { onItemUpdated(submittedData); }
            else if (!isEditing && onItemCreated) { onItemCreated(submittedData); }
            // Close immediately on success
            onClose();

        } catch (err) {
            // Error handling from V1/V2 combined
            console.error(`[SousProjetForm] Erreur lors de ${isEditing ? 'la modification' : 'la création'}:`, err.response || err);
            let errorMsg = `Une erreur s'est produite.`; const backendErrors = {};
            if (err.response) { if (err.response.status === 422 && typeof err.response.data.errors === 'object') { const validationErrors = err.response.data.errors; let messages = []; for (const key in validationErrors) { backendErrors[key] = validationErrors[key]?.[0] || "Erreur inconnue."; messages.push(backendErrors[key]); } setFormErrors(backendErrors); errorMsg = messages.length > 0 ? messages.join(' ') : "Erreurs de validation."; } else if (err.response.status === 419) { errorMsg = "Session expirée ou formulaire invalide (CSRF). Veuillez rafraîchir et réessayer."; } else if (err.response.data?.failed) { errorMsg = err.response.data.failed; } else if (err.response.data?.message) { errorMsg = err.response.data.message; } else if (err.message?.includes('Network Error')) { errorMsg = "Erreur réseau."; } else if (err.response?.statusText) { errorMsg = `Erreur serveur (${err.response.status}): ${err.response.statusText}`; } else { errorMsg = `Erreur serveur (${err.response.status})`; } } else if (err.request) { errorMsg = "Pas de réponse serveur."; } else { errorMsg = `Erreur config requête: ${err.message}`; }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    // --- Render Logic ---
    const isLoadingAnything = loadingData || loadingOptions.projets || loadingOptions.provinces || loadingOptions.communes || loadingOptions.fonctionnaires; // Include fonctionnaires loading
    const isSubmitDisabled = submissionStatus.loading || isLoadingAnything;

    if (isEditing && loadingData) { return (<div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '300px' }}> <Spinner animation="border" variant="primary" /> <span className='ms-3 text-muted'>Chargement...</span> </div>); }
    if (isLoadingAnything && !loadingData) { return (<div className={FORM_CONTAINER_CLASS} style={{ minHeight: '400px', display:'flex', justifyContent: 'center', alignItems: 'center' }}><Spinner animation="border" variant="secondary" /><span className='ms-3 text-muted'>Chargement listes...</span></div>); } // Show option loading only on create


    return (
        // V1 Container Style
        <div className={FORM_CONTAINER_CLASS} style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
            {/* Header (V1 Style) */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0 border-bottom pb-3">
                <div><h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5><h2 className="mb-0 fw-bold">Sous-Projet {isEditing ? `(${itemId})` : ''}</h2></div>
                <Button variant="warning" className={FORM_HEADER_CLOSE_BUTTON_CLASS} onClick={onClose} size="sm"> Revenir à la liste </Button>
            </div>

            {/* Form Content */}
            <div className="flex-grow-1 px-md-3">
                {/* Feedback Area (V1 Style) */}
                {submissionStatus.error && (<Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({ ...prev, error: null }))}><FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> {submissionStatus.error}</Alert>)}
                {submissionStatus.success && (<Alert variant="success" className="mb-3 py-2">Sous-Projet {isEditing ? 'modifié' : 'créé'} avec succès!</Alert>)}

                <Form noValidate onSubmit={handleSubmit}>
                    {/* Rows 1-4 (Using V1 styling, Code 2 validation*) */}
                     <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formCodeSousProjet"><Form.Label className="small mb-1 fw-medium">Code {!isEditing && <span className="text-danger">*</span>}</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Code_Sous_Projet} required={!isEditing} type="text" name="Code_Sous_Projet" value={formData.Code_Sous_Projet} onChange={handleChange} size="sm" disabled={isEditing} title={isEditing ? "Non modifiable" : ""}/><Form.Control.Feedback type="invalid">{formErrors.Code_Sous_Projet}</Form.Control.Feedback></Form.Group>
                        <Form.Group as={Col} md={6} controlId="formNomProjet"><Form.Label className="small mb-1 fw-medium">Nom <span className="text-danger">*</span></Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Nom_Projet} required type="text" name="Nom_Projet" value={formData.Nom_Projet} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Nom_Projet}</Form.Control.Feedback></Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formProjetMaitre"><Form.Label className="small mb-1 fw-medium">Projet Maître <span className="text-danger">*</span></Form.Label><Select name="projetMaitre" options={projetOptions} value={formData.projetMaitre} onChange={handleProjetMaitreChange} styles={selectStyles} placeholder="- Sélectionner -" isClearable isLoading={loadingOptions.projets} isDisabled={loadingOptions.projets} className={formErrors.ID_Projet_Maitre ? 'is-invalid' : ''} menuPlacement="auto" menuPortalTarget={document.body}/>{formErrors.ID_Projet_Maitre && <div className="invalid-feedback d-block">{formErrors.ID_Projet_Maitre}</div>}</Form.Group>
                        <Form.Group as={Col} md={6} controlId="formProvince"><Form.Label className="small mb-1 fw-medium">Province <span className="text-danger">*</span></Form.Label><Select name="province" options={provinceOptions} value={formData.province} onChange={handleProvinceChange} styles={selectStyles} placeholder="- Sélectionner -" isClearable isLoading={loadingOptions.provinces} isDisabled={loadingOptions.provinces} className={formErrors.Id_Province ? 'is-invalid' : ''} menuPlacement="auto" menuPortalTarget={document.body}/>{formErrors.Id_Province && <div className="invalid-feedback d-block">{formErrors.Id_Province}</div>}</Form.Group>
                    </Row>
                     <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formCommune"><Form.Label className="small mb-1 fw-medium">Commune</Form.Label><Select name="commune" options={communeOptions} value={formData.commune} onChange={handleCommuneChange} styles={selectStyles} placeholder="- Sélectionner -" isClearable isLoading={loadingOptions.communes} isDisabled={loadingOptions.communes} className={formErrors.Id_Commune ? 'is-invalid' : ''} menuPlacement="auto" menuPortalTarget={document.body}/>{formErrors.Id_Commune && <div className="invalid-feedback d-block">{formErrors.Id_Commune}</div>}</Form.Group>
                        <Form.Group as={Col} md={6} controlId="formStatus"><Form.Label className="small mb-1 fw-medium">Statut</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Status} type="text" name="Status" value={formData.Status} onChange={handleChange} size="sm" placeholder="Ex: En cours"/><Form.Control.Feedback type="invalid">{formErrors.Status}</Form.Control.Feedback></Form.Group>
                    </Row>
                     <Row className="mb-3 g-3">
                         <Form.Group as={Col} md={3} controlId="formSecteur"> <Form.Label className="small mb-1 fw-medium">Secteur</Form.Label> <Form.Control className={inputClass} isInvalid={!!formErrors.Secteur} type="text" name="Secteur" value={formData.Secteur} onChange={handleChange} size="sm"/> <Form.Control.Feedback type="invalid">{formErrors.Secteur}</Form.Control.Feedback> </Form.Group>
                         <Form.Group as={Col} md={3} controlId="formLocalite"> <Form.Label className="small mb-1 fw-medium">Localité</Form.Label> <Form.Control className={inputClass} type="text" name="Localite" value={formData.Localite} onChange={handleChange} size="sm"/> </Form.Group>
                         <Form.Group as={Col} md={3} controlId="formCentre"> <Form.Label className="small mb-1 fw-medium">Centre</Form.Label> <Form.Control className={inputClass} type="text" name="Centre" value={formData.Centre} onChange={handleChange} size="sm"/> </Form.Group>
                          <Form.Group as={Col} md={3} controlId="formSite"> <Form.Label className="small mb-1 fw-medium">Site</Form.Label> <Form.Control className={inputClass} type="text" name="Site" value={formData.Site} onChange={handleChange} size="sm"/> </Form.Group>
                     </Row>

                     {/* Fonctionnaire Multi-Select (From V1) */}
                     <Row className="mb-3 g-3">
                         <Form.Group as={Col} md={12} controlId="formFonctionnaire" id="formId_Fonctionnaire">
                              <Form.Label className="small mb-1 fw-medium"><FontAwesomeIcon icon={faUsers} className="me-1 text-secondary"/> Points Focaux</Form.Label>
                              <Select inputId='sousprojet-fonctionnaire-select' name="fonctionnaires" options={fonctionnaireOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder="- Sélectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.fonctionnaires} isDisabled={loadingOptions.fonctionnaires} className={formErrors.id_fonctionnaire ? 'is-invalid' : ''} aria-label="Sélectionner Fonctionnaires" menuPlacement="auto" menuPortalTarget={document.body}/>
                              <Form.Control.Feedback type="invalid" style={{ display: formErrors.id_fonctionnaire ? 'block' : 'none'}}>{formErrors.id_fonctionnaire}</Form.Control.Feedback>
                         </Form.Group>
                     </Row>

                    {/* Rows 5+ (Using V1 styling, Code 2 validation*) */}
                    <Row className="mb-3 g-3">
                         <Form.Group as={Col} md={4} controlId="formEtatAvanPhysi"> <Form.Label className="small mb-1 fw-medium">Av. Physi (%)</Form.Label> <Form.Control className={inputClass} isInvalid={!!formErrors.Etat_Avan_Physi} type="number" name="Etat_Avan_Physi" value={formData.Etat_Avan_Physi} onChange={handleChange} size="sm" step="0.01" min="0" max="100" placeholder="0-100"/> <Form.Control.Feedback type="invalid">{formErrors.Etat_Avan_Physi}</Form.Control.Feedback> </Form.Group>
                         <Form.Group as={Col} md={4} controlId="formEtatAvanFinan"> <Form.Label className="small mb-1 fw-medium">Av. Finan (%)</Form.Label> <Form.Control className={inputClass} isInvalid={!!formErrors.Etat_Avan_Finan} type="number" name="Etat_Avan_Finan" value={formData.Etat_Avan_Finan} onChange={handleChange} size="sm" step="0.01" min="0" max="100" placeholder="0-100"/> <Form.Control.Feedback type="invalid">{formErrors.Etat_Avan_Finan}</Form.Control.Feedback> </Form.Group>
                         <Form.Group as={Col} md={4} controlId="formEstimIniti"> <Form.Label className="small mb-1 fw-medium">Estim. Initiale</Form.Label> <Form.Control className={inputClass} isInvalid={!!formErrors.Estim_Initi} type="number" name="Estim_Initi" value={formData.Estim_Initi} onChange={handleChange} size="sm" step="0.01" min="0" placeholder="Montant"/> <Form.Control.Feedback type="invalid">{formErrors.Estim_Initi}</Form.Control.Feedback> </Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                           <Form.Group as={Col} md={4} controlId="formSurface"> <Form.Label className="small mb-1 fw-medium">Surface</Form.Label> <Form.Control className={inputClass} isInvalid={!!formErrors.Surface} type="number" name="Surface" value={formData.Surface} onChange={handleChange} size="sm" step="any" min="0" placeholder="Nombre"/> <Form.Control.Feedback type="invalid">{formErrors.Surface}</Form.Control.Feedback> </Form.Group>
                           <Form.Group as={Col} md={4} controlId="formLineaire"> <Form.Label className="small mb-1 fw-medium">Linéaire</Form.Label> <Form.Control className={inputClass} isInvalid={!!formErrors.Lineaire} type="number" name="Lineaire" value={formData.Lineaire} onChange={handleChange} size="sm" step="any" min="0" placeholder="Nombre"/> <Form.Control.Feedback type="invalid">{formErrors.Lineaire}</Form.Control.Feedback> </Form.Group>
                           <Form.Group as={Col} md={4} controlId="formFinancement"> <Form.Label className="small mb-1 fw-medium">Financement</Form.Label> <Form.Control className={inputClass} type="text" name="Financement" value={formData.Financement} onChange={handleChange} size="sm"/> </Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                           <Form.Group as={Col} md={4} controlId="formNatureIntervention"> <Form.Label className="small mb-1 fw-medium">Nature Intervention</Form.Label> <Form.Control className={inputClass} type="text" name="Nature_Intervention" value={formData.Nature_Intervention} onChange={handleChange} size="sm"/> </Form.Group>
                           <Form.Group as={Col} md={4} controlId="formBenificiaire"> <Form.Label className="small mb-1 fw-medium">Bénéficiaire</Form.Label> <Form.Control className={inputClass} type="text" name="Benificiaire" value={formData.Benificiaire} onChange={handleChange} size="sm"/> </Form.Group>
                           <Form.Group as={Col} md={4} controlId="formDouarsDesservis"> <Form.Label className="small mb-1 fw-medium">Douars Desservis</Form.Label> <Form.Control className={inputClass} type="text" name="Douars_Desservis" value={formData.Douars_Desservis} onChange={handleChange} size="sm"/> </Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={12} controlId="formObservations"><Form.Label className="small mb-1 fw-medium">Observations</Form.Label><Form.Control className={textareaClass} style={{borderRadius: '1rem'}} as="textarea" rows={3} name="Observations" value={formData.Observations} onChange={handleChange} size="sm" isInvalid={!!formErrors.Observations}/><Form.Control.Feedback type="invalid">{formErrors.Observations}</Form.Control.Feedback></Form.Group>
                    </Row>

                    {/* Action Buttons (V1 Style) */}
                    <Row className={FORM_ACTIONS_ROW_CLASS}>
                         <Col xs="auto" className="pe-2"> <Button onClick={onClose} variant="danger" className={`${FORM_CANCEL_BUTTON_CLASS} bg-danger`} disabled={submissionStatus.loading}> Annuler </Button> </Col> {/* V1 Cancel Style */}
                         <Col xs="auto" className="ps-2"> <Button type="submit" className={`${FORM_SUBMIT_BUTTON_CLASS} bg-primary`} style={{ backgroundColor: '#5cacee', borderColor: '#5cacee'}} disabled={isSubmitDisabled}> {submissionStatus.loading ? <><Spinner as="span" animation="border" size="sm" className="me-2"/> {isEditing ? 'Enregistrement...' : 'Création...'}</> : (isEditing ? 'Enregistrer Modifications' : 'Créer Sous-Projet')} </Button> </Col>
                    </Row>
                </Form>
            </div>
        </div>
    );
};

// --- PropTypes & Default Props (From V1) ---
SousProjetForm.propTypes = { itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), onClose: PropTypes.func.isRequired, onItemCreated: PropTypes.func, onItemUpdated: PropTypes.func, baseApiUrl: PropTypes.string, };
SousProjetForm.defaultProps = { itemId: null, onItemCreated: (item) => console.log("Sous-Projet Created:", item), onItemUpdated: (item) => console.log("Sous-Projet Updated:", item), baseApiUrl: 'http://localhost:8000/api', }; // V1 default URL

export default SousProjetForm;