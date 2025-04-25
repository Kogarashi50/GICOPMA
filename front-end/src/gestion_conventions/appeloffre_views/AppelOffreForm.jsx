// src/gestion_conventions/appel_offres_views/AppelOffreForm.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Form, Button, Row, Col, Spinner, Alert, InputGroup } from 'react-bootstrap';
import Select from 'react-select'; // Multi-select capable
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Keep from Code 1
import { faUsers } from '@fortawesome/free-solid-svg-icons'; // Keep from Code 1

// --- Constants ---
const CATEGORIE_OPTIONS = [
    { value: 'Travaux', label: 'Travaux' },
    { value: 'Etudes', label: 'Etudes' },
    { value: 'Services', label: 'Services' },
    { value: 'Fournitures', label: 'Fournitures' }
];

const PROVINCE_OPTIONS = [
    { value: 'Berkane', label: 'Berkane' },
    { value: 'Driouch', label: 'Driouch' },
    { value: 'Figuig', label: 'Figuig' },
    { value: 'Guercif', label: 'Guercif' },
    { value: 'Jerada', label: 'Jerada' },
    { value: 'Nador', label: 'Nador' },
    { value: 'Oujda-Angad', label: 'Oujda-Angad' },
    { value: 'Taourirt', label: 'Taourirt' }
];

// Merged initial form state
const initialFormData = {
    categorie: '', // Use empty string for standard select (Code 1 style)
    provinces: null, // For multi-select values
    numero: '',
    intitule: '',
    estimation: '',
    estimation_HT: '',
    montant_TVA: '',
    duree_execution: '',
    date_verification: '',
    date_ouverture: '',
    last_session_op: '',
    date_publication: '', // <<< ADDED from Code 2
    lancement_portail: false,
    date_lancement_portail: '',
    fonctionnaires: [], // For multi-select state (from Code 1)
};
// --- End Constants ---

// --- Helper: Parse Multi-Select String (from Code 1) ---
const findMultiOptions = (options, valuesString, separator = ';') => {
    if (!valuesString || typeof valuesString !== 'string' || !Array.isArray(options) || options.length === 0) return [];
    const selectedValues = valuesString.split(separator)
        .map(v => String(v).trim()) // Assuming IDs are strings/numbers, trim spaces
        .filter(v => v); // Remove empty strings resulting from split
    // Find options where the stringified value matches
    return options.filter(opt => selectedValues.includes(String(opt.value)));
};
// --- End Helper ---

// --- Inline Styles for React-Select (from Code 1) ---
const getReactSelectStyles = (hasError) => ({
    control: (base, state) => ({
        ...base,
        backgroundColor: '#f8f9fa', // bg-light
        borderRadius: '50px',       // rounded-pill
        borderColor: hasError ? '#dc3545' : (state.isFocused ? '#86b7fe' : '#ced4da'),
        boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : '0 .125rem .25rem rgba(0,0,0,.075)', // shadow-sm
        minHeight: '38px',
        '&:hover': { borderColor: hasError ? '#dc3545' : (state.isFocused ? '#86b7fe' : '#adb5bd') }
    }),
    valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden' }),
    input: (provided) => ({ ...provided, margin: '0px', padding: '0px' }),
    indicatorSeparator: () => ({ display: 'none' }),
    indicatorsContainer: (provided) => ({ ...provided, padding: '1px' }),
    placeholder: (provided) => ({ ...provided, color: '#6c757d' }), // text-muted
    menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1050 }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black' }),
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px' }),
    multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px' }),
    multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', borderRadius: '0 0.5rem 0.5rem 0', ':hover': { backgroundColor: '#dc3545', color: 'white' } }),
});
// --- End Inline Styles ---


const AppelOffreForm = ({ itemId, onClose, onItemCreated, onItemUpdated, baseApiUrl }) => {
    const isEditMode = useMemo(() => !!itemId, [itemId]);

    // --- State (Using Code 1's granular loading) ---
    const [formData, setFormData] = useState(initialFormData);
    const [selectedProvinceOptions, setSelectedProvinceOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]); // From Code 1
    const [loadingOptions, setLoadingOptions] = useState({ fonctionnaires: true }); // From Code 1
    const [loadingData, setLoadingData] = useState(isEditMode); // From Code 1
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false); // From Code 1

    const apiPrefix = ''; // Adjust if needed

    // --- Fetch Fonctionnaires List (from Code 1) ---
    const fetchFonctionnaires = useCallback(async () => {
        setLoadingOptions(prev => ({ ...prev, fonctionnaires: true }));
        try {
            // Assuming API endpoint returns { fonctionnaires: [...] } or just [...]
            const response = await axios.get(`${baseApiUrl}${apiPrefix}/fonctionnaires`, { withCredentials: true });
            const foncData = response.data.fonctionnaires || response.data || []; // Handle both response structures
            // Map to { value, label } and sort
            setFonctionnairesOptions(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` }))
                .sort((a, b) => a.label.localeCompare(b.label)));
            console.log("Fonctionnaires options loaded:", foncData.length);
        } catch (err) {
            console.error("Error loading fonctionnaires options:", err);
            setError("Erreur chargement de la liste des fonctionnaires.");
            setFonctionnairesOptions([]); // Ensure it's an array on error
        } finally {
            setLoadingOptions(prev => ({ ...prev, fonctionnaires: false }));
        }
    }, [baseApiUrl, apiPrefix]);

    // Fetch options on mount
    useEffect(() => {
        fetchFonctionnaires();
    }, [fetchFonctionnaires]);

    // --- Effect to Fetch Appel d'Offre Data (Merged) ---
    useEffect(() => {
        let isMounted = true;
        // Proceed only if editing AND fonctionnaire options are loaded
        if (isEditMode && !loadingOptions.fonctionnaires) {
            setLoadingData(true);
            setError(null);
            setValidationErrors({});
            const apiEndpoint = `${baseApiUrl}${apiPrefix}/appel-offres/${itemId}`;
            console.log(`Form: Fetching edit data for Appel d'Offre ID: ${itemId} from ${apiEndpoint}`);

            axios.get(apiEndpoint, { withCredentials: true })
                .then(response => {
                    if (!isMounted) return;
                    const itemData = response.data?.appel_offre || response.data || {};
                    console.log("Fetched Appel d'Offre item data:", itemData);

                    // Pre-select province options
                    const matchedProvinceOptions = Array.isArray(itemData.provinces)
                        ? itemData.provinces
                              .map(provName => PROVINCE_OPTIONS.find(opt => opt.value === provName))
                              .filter(Boolean)
                        : [];
                    setSelectedProvinceOptions(matchedProvinceOptions);

                    // Pre-select fonctionnaire options using helper (from Code 1)
                    // Expecting backend to send 'id_fonctionnaire' as a string like "1;3;5"
                    const matchedFonctionnaireOptions = findMultiOptions(fonctionnairesOptions, itemData.id_fonctionnaire, ';');
                    console.log("Matched fonctionnaires based on string '" + itemData.id_fonctionnaire + "':", matchedFonctionnaireOptions);

                    // Populate formData (including date_publication and fonctionnaires)
                    setFormData({
                        categorie: itemData.categorie || '',
                        provinces: itemData.provinces || null, // Store raw array
                        numero: itemData.numero || '',
                        intitule: itemData.intitule || '',
                        estimation: itemData.estimation ?? '',
                        estimation_HT: itemData.estimation_HT ?? '',
                        montant_TVA: itemData.montant_TVA ?? '',
                        duree_execution: itemData.duree_execution ?? '',
                        date_verification: itemData.date_verification?.split(' ')[0] ?? '',
                        date_ouverture: itemData.date_ouverture?.split(' ')[0] ?? '',
                        last_session_op: itemData.last_session_op?.split(' ')[0] ?? '',
                        date_publication: itemData.date_publication?.split(' ')[0] ?? '', // <<< ADDED handling
                        lancement_portail: !!itemData.lancement_portail,
                        date_lancement_portail: itemData.date_lancement_portail?.split(' ')[0] ?? '',
                        fonctionnaires: matchedFonctionnaireOptions, // Set the array for react-select
                    });

                })
                .catch(err => {
                    if (!isMounted) return;
                    console.error("Error fetching Appel d'Offre data for edit:", err);
                    setError(err.response?.data?.message || err.message || "Erreur de chargement des données.");
                    setFormData(initialFormData); // Reset form on error
                    setSelectedProvinceOptions([]);
                })
                .finally(() => {
                    if (isMounted) setLoadingData(false);
                });
        } else if (!isEditMode) {
            // Reset form for create mode
            setFormData(initialFormData);
            setSelectedProvinceOptions([]);
            setLoadingData(false); // Ensure loading is false for create mode
        }
        // Cleanup function
        return () => { isMounted = false; };
    }, [itemId, isEditMode, baseApiUrl, apiPrefix, fonctionnairesOptions, loadingOptions.fonctionnaires]); // Depend on fonctionnairesOptions and loadingOptions

    // --- Input Handlers (Merged) ---
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
        // Clear validation error for the specific field being changed
        if (validationErrors[name]) {
            setValidationErrors(prev => { const next = {...prev}; delete next[name]; return next; });
        }
    };

    const handleProvinceMultiSelectChange = (selectedOptionsArray) => {
        setSelectedProvinceOptions(selectedOptionsArray || []); // Update display state
        const provinceValues = selectedOptionsArray ? selectedOptionsArray.map(option => option.value) : null;
        setFormData(prev => ({ ...prev, provinces: provinceValues })); // Update form data state with values
        // Clear validation errors related to provinces
        if (validationErrors.provinces || validationErrors['provinces.*']) {
             setValidationErrors(prev => { const next = {...prev}; delete next.provinces; delete next['provinces.*']; return next; });
        }
    };

    // Handler for Fonctionnaire react-select (from Code 1)
    const handleFonctionnaireChange = useCallback((selectedOptions) => {
        setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] })); // Update form data state
        // Clear validation error for id_fonctionnaire
        if (validationErrors.id_fonctionnaire) {
            // Create a new object excluding the id_fonctionnaire key
            setValidationErrors(prev => {
                const { id_fonctionnaire, ...rest } = prev;
                return rest;
            });
        }
    }, [validationErrors.id_fonctionnaire]); // Dependency added
    // --- END Input Handlers ---

    // --- Server Error Mapping (from Code 1) ---
    const mapServerErrors = useCallback((serverErrors) => {
        const formErrors = {};
        if (!serverErrors || typeof serverErrors !== 'object') return formErrors;
        for (const key in serverErrors) {
            // Handle nested errors like 'provinces.*' if backend sends them
            if (key.includes('.')) {
                 formErrors[key] = serverErrors[key]?.[0] || "Erreur inconnue";
            } else {
                 formErrors[key] = serverErrors[key]?.[0] || "Erreur inconnue"; // Take first message
            }
        }
        console.log("Mapped validation errors:", formErrors);
        return formErrors;
     }, []);

    // --- Form Submission (Merged) ---
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true); // Use granular state
        setError(null);
        setValidationErrors({});

        // Construct fonctionnaire IDs string (from Code 1)
        const fonctionnaireIdsString = formData.fonctionnaires.map(f => f.value).join(';');

        // Prepare payload (using Code 1's explicit parsing, adding date_publication and fonctionnaires)
        const payload = {
            categorie: formData.categorie || null,
            provinces: formData.provinces && formData.provinces.length > 0 ? formData.provinces : null, // Send array or null
            numero: formData.numero,
            intitule: formData.intitule,
            estimation: formData.estimation !== '' ? parseFloat(formData.estimation) : null,
            estimation_HT: formData.estimation_HT !== '' ? parseFloat(formData.estimation_HT) : null,
            montant_TVA: formData.montant_TVA !== '' ? parseFloat(formData.montant_TVA) : null,
            duree_execution: formData.duree_execution !== '' ? parseInt(formData.duree_execution, 10) : null,
            date_verification: formData.date_verification || null,
            date_ouverture: formData.date_ouverture || null,
            last_session_op: formData.last_session_op || null,
            date_publication: formData.date_publication || null, // <<< ADDED
            lancement_portail: formData.lancement_portail,
            date_lancement_portail: formData.lancement_portail ? (formData.date_lancement_portail || null) : null,
            id_fonctionnaire: fonctionnaireIdsString || null, // <<< ADDED (send string or null)
        };

        // Basic frontend checks (from Code 1, adapted)
        const requiredFields = {
            numero: 'Numéro AO',
            intitule: 'Intitulé',
            categorie: 'Catégorie',
            estimation_HT: 'Estimation HT',
            montant_TVA: 'Montant TVA',
        };
        let hasFrontendError = false;
        const frontendErrors = {};
        for (const field in requiredFields) {
            // Check if null, undefined, or empty string (adjust check as needed)
             if (payload[field] === null || payload[field] === undefined || String(payload[field]).trim() === '') {
                 frontendErrors[field] = `${requiredFields[field]} requis.`;
                 hasFrontendError = true;
             }
        }
        if (payload.lancement_portail && !payload.date_lancement_portail) {
            frontendErrors.date_lancement_portail = 'Date requise si publié.';
            hasFrontendError = true;
        }

        if (hasFrontendError) {
             setError("Veuillez remplir tous les champs obligatoires (*).");
             setValidationErrors(frontendErrors);
             setIsSubmitting(false);
             return;
        }

        console.log("Submitting Payload:", payload);
        const apiEndpoint = isEditMode
            ? `${baseApiUrl}${apiPrefix}/appel-offres/${itemId}`
            : `${baseApiUrl}${apiPrefix}/appel-offres`;
        const method = isEditMode ? 'put' : 'post';

        try {
            const config = { headers: { 'Accept': 'application/json' }, withCredentials: true };
            const response = await axios[method](apiEndpoint, payload, config);

            console.log(`API Response (${isEditMode ? 'Update' : 'Create'}):`, response.data);
            setError(null);
            setValidationErrors({});
            const returnedData = response.data.appel_offre || response.data; // Adapt to your API response structure
            if (isEditMode && onItemUpdated) onItemUpdated(returnedData);
            else if (!isEditMode && onItemCreated) onItemCreated(returnedData);
            onClose(); // Close modal on success

        } catch (err) {
             console.error("Error submitting form:", err.response || err);
             const message = err.response?.data?.message || err.message || "Erreur de soumission.";
             if (err.response && err.response.status === 422) {
                 const serverErrors = err.response.data.errors || {};
                 console.error("Validation Errors from Server:", serverErrors);
                 setValidationErrors(mapServerErrors(serverErrors)); // Use the mapping function
                 setError("Veuillez corriger les erreurs indiquées.");
             } else {
                // General error
                setError(message + (err.response ? ` (Status: ${err.response.status})` : ''));
                setValidationErrors({}); // Clear specific field errors for general issues
             }
        } finally {
            setIsSubmitting(false); // Stop submitting state
        }
    }, [formData, isEditMode, apiPrefix, baseApiUrl, itemId, onItemUpdated, onItemCreated, onClose, mapServerErrors]); // Include mapServerErrors

    // Overall loading state (from Code 1)
    const isOverallLoading = loadingOptions.fonctionnaires || loadingData || isSubmitting;

    // --- Render Loading State (using Code 1's logic) ---
    if (isEditMode && loadingData) {
        return <div className="text-center p-5"><Spinner animation="border" variant="primary" /> Chargement des données...</div>;
    }
    if (!isEditMode && loadingOptions.fonctionnaires) {
        return <div className="text-center p-5"><Spinner animation="border" variant="secondary"/> Chargement des options...</div>;
    }

    // --- Main Form Render (Using Code 1's styling approach) ---
    const inputClass = 'shadow-sm rounded-pill bg-light form-control';
    const inputGroupTextClass = 'rounded-pill bg-light';
    const selectClass = 'shadow-sm rounded-pill bg-light form-select';
    const textareaClass = 'shadow-sm rounded-3 bg-light form-control'; // Slightly less round

    return (
        <Form onSubmit={handleSubmit} noValidate className='px-md-4 py-4 px-2' style={{ maxHeight: 'calc(90vh - 100px)', overflowY: 'auto', backgroundColor: '#fff', borderRadius: '15px' }}>
            {/* Error Alerts */}
            {error && !Object.keys(validationErrors).length && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
            {Object.keys(validationErrors).length > 0 && <Alert variant="warning" className="small py-2">Veuillez corriger les erreurs indiquées ci-dessous.</Alert>}

            {/* Header (Code 1 Style) */}
             <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                 <div>
                     <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditMode ? 'Modifier' : 'Nouvel'}</h5>
                     <h2 className="mb-0 fw-bold">Appel d'Offre {isEditMode ? `(${formData.numero || '...'})` : ''}</h2>
                 </div>
                 <Button variant="light" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold' onClick={onClose} size="sm" title="Retour à la liste">
                      Revenir à la liste
                 </Button>
             </div>

            {/* --- Form Fields (Merged structure with Code 1 styling) --- */}
            <h5 className="mb-3 mt-2 ">Détails de l'Appel d'Offre</h5>
            <Row className="g-3">
                {/* Numero AO */}
                <Form.Group as={Col} md="6" className="mb-3">
                    <Form.Label htmlFor="numero">Numéro AO <span className="text-danger">*</span></Form.Label>
                    <Form.Control id="numero" className={inputClass} type="text" name="numero" value={formData.numero} onChange={handleChange} isInvalid={!!validationErrors.numero} required/>
                    <Form.Control.Feedback type="invalid">{validationErrors.numero}</Form.Control.Feedback>
                </Form.Group>
                {/* Catégorie */}
                <Form.Group as={Col} md="6" className="mb-3">
                    <Form.Label htmlFor="categorie">Catégorie <span className="text-danger">*</span></Form.Label>
                    <Form.Select id="categorie" className={selectClass} name="categorie" value={formData.categorie} onChange={handleChange} isInvalid={!!validationErrors.categorie} required>
                        <option value="" disabled>-- Sélectionner --</option>
                        {CATEGORIE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{validationErrors.categorie}</Form.Control.Feedback>
                </Form.Group>
            </Row>

            {/* Intitule */}
            <Form.Group className="mb-3">
               <Form.Label htmlFor="intitule">Intitulé <span className="text-danger">*</span></Form.Label>
               <Form.Control id="intitule" className={textareaClass} as="textarea" rows={2} name="intitule" value={formData.intitule} onChange={handleChange} isInvalid={!!validationErrors.intitule} required/>
               <Form.Control.Feedback type="invalid">{validationErrors.intitule}</Form.Control.Feedback>
           </Form.Group>

            {/* Province Multi-Select (Code 1 styling) */}
            <Form.Group className="mb-3">
                 <Form.Label htmlFor="provinces_select">Province(s) Affectée(s)</Form.Label>
                 <Select
                     inputId="provinces_select" isMulti name="provinces_select" options={PROVINCE_OPTIONS}
                     value={selectedProvinceOptions} onChange={handleProvinceMultiSelectChange}
                     placeholder={"Sélectionner Province(s) (Optionnel)..."}
                     isClearable closeMenuOnSelect={false} noOptionsMessage={() => 'Aucune province définie'}
                     styles={getReactSelectStyles(!!validationErrors.provinces || !!validationErrors['provinces.*'])}
                     className={(validationErrors.provinces || validationErrors['provinces.*']) ? 'is-invalid' : ''}
                     menuPortalTarget={document.body}
                 />
                 {(validationErrors.provinces || validationErrors['provinces.*']) &&
                    <div className="invalid-feedback d-block ps-2 small mt-1"> {validationErrors.provinces || validationErrors['provinces.*']} </div>
                 }
            </Form.Group>

            {/* Fonctionnaire Multi-Select (from Code 1 with styling) */}
            <Form.Group className="mb-3">
                 <Form.Label htmlFor="fonctionnaires_select">
                     <FontAwesomeIcon icon={faUsers} className="me-2" /> Points Focaux Affecté(s)
                 </Form.Label>
                 <Select
                     inputId="fonctionnaires_select" isMulti name="fonctionnaires_select"
                     options={fonctionnairesOptions} value={formData.fonctionnaires}
                     onChange={handleFonctionnaireChange}
                     placeholder={loadingOptions.fonctionnaires ? "Chargement..." : "Sélectionner Fonctionnaire(s) (Optionnel)..."}
                     isClearable closeMenuOnSelect={false} noOptionsMessage={() => 'Aucun fonctionnaire trouvé'}
                     isLoading={loadingOptions.fonctionnaires} isDisabled={loadingOptions.fonctionnaires}
                     styles={getReactSelectStyles(!!validationErrors.id_fonctionnaire)}
                     className={validationErrors.id_fonctionnaire ? 'is-invalid' : ''}
                     menuPortalTarget={document.body}
                 />
                 {validationErrors.id_fonctionnaire &&
                    <div className="invalid-feedback d-block ps-2 small mt-1">{validationErrors.id_fonctionnaire}</div>
                 }
            </Form.Group>

            {/* Estimations (Code 1 styling) */}
            <Row className="g-3">
                <Form.Group as={Col} md="4" className="mb-3">
                    <Form.Label htmlFor="estimation">Estimation TTC</Form.Label>
                    <InputGroup>
                        <Form.Control id="estimation" className={inputClass + ' ps-3 border-end-0'} type="number" step="0.01" name="estimation" value={formData.estimation} onChange={handleChange} isInvalid={!!validationErrors.estimation} placeholder="Optionnel"/>
                        <InputGroup.Text className={inputGroupTextClass + ' border-start-0'}>MAD</InputGroup.Text>
                        <Form.Control.Feedback type="invalid">{validationErrors.estimation}</Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
                 <Form.Group as={Col} md="4" className="mb-3">
                    <Form.Label htmlFor="estimation_HT">Estimation HT <span className="text-danger">*</span></Form.Label>
                     <InputGroup>
                        <Form.Control id="estimation_HT" className={inputClass + ' ps-3 border-end-0'} type="number" step="0.01" name="estimation_HT" value={formData.estimation_HT} onChange={handleChange} isInvalid={!!validationErrors.estimation_HT} placeholder="0.00" required/>
                        <InputGroup.Text className={inputGroupTextClass + ' border-start-0'}>MAD</InputGroup.Text>
                        <Form.Control.Feedback type="invalid">{validationErrors.estimation_HT}</Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
                <Form.Group as={Col} md="4" className="mb-3">
                    <Form.Label htmlFor="montant_TVA">Montant TVA <span className="text-danger">*</span></Form.Label>
                     <InputGroup>
                        <Form.Control id="montant_TVA" className={inputClass + ' ps-3 border-end-0'} type="number" step="0.01" name="montant_TVA" value={formData.montant_TVA} onChange={handleChange} isInvalid={!!validationErrors.montant_TVA} placeholder="0.00" required/>
                        <InputGroup.Text className={inputGroupTextClass + ' border-start-0'}>MAD</InputGroup.Text>
                        <Form.Control.Feedback type="invalid">{validationErrors.montant_TVA}</Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
            </Row>

            {/* Durée & Dates (Code 1 styling) */}
            <Row className="g-3">
                <Form.Group as={Col} md="6" lg="3" className="mb-3">
                    <Form.Label htmlFor="duree_execution">Durée Exécution (jours)</Form.Label>
                    <Form.Control id="duree_execution" className={inputClass} type="number" step="1" min="0" name="duree_execution" value={formData.duree_execution} onChange={handleChange} isInvalid={!!validationErrors.duree_execution} placeholder="Optionnel"/>
                    <Form.Control.Feedback type="invalid">{validationErrors.duree_execution}</Form.Control.Feedback>
                </Form.Group>
                 <Form.Group as={Col} md="6" lg="3" className="mb-3">
                    <Form.Label htmlFor="date_verification">Date Vérification</Form.Label>
                    <Form.Control id="date_verification" className={inputClass} type="date" name="date_verification" value={formData.date_verification} onChange={handleChange} isInvalid={!!validationErrors.date_verification} />
                    <Form.Control.Feedback type="invalid">{validationErrors.date_verification}</Form.Control.Feedback>
                 </Form.Group>
                 <Form.Group as={Col} md="6" lg="3" className="mb-3">
                    <Form.Label htmlFor="date_ouverture">Date Ouverture Plis</Form.Label>
                    <Form.Control id="date_ouverture" className={inputClass} type="date" name="date_ouverture" value={formData.date_ouverture} onChange={handleChange} isInvalid={!!validationErrors.date_ouverture} />
                    <Form.Control.Feedback type="invalid">{validationErrors.date_ouverture}</Form.Control.Feedback>
                 </Form.Group>
                 <Form.Group as={Col} md="6" lg="3" className="mb-3">
                     <Form.Label htmlFor="last_session_op">Dernière Session OP</Form.Label>
                     <Form.Control id="last_session_op" className={inputClass} type="date" name="last_session_op" value={formData.last_session_op} onChange={handleChange} isInvalid={!!validationErrors.last_session_op} />
                     <Form.Control.Feedback type="invalid">{validationErrors.last_session_op}</Form.Control.Feedback>
                 </Form.Group>
            </Row>

            {/* Publication (Code 1 styling applied) */}
             <Row className="g-3">
                {/* Added date_publication field */}
                <Form.Group as={Col} md="6" className="mb-3">
                    <Form.Label htmlFor="date_publication">Date Publication</Form.Label>
                    <Form.Control
                        id="date_publication"
                        className={inputClass}
                        type="date"
                        name="date_publication"
                        value={formData.date_publication}
                        onChange={handleChange}
                        isInvalid={!!validationErrors.date_publication}
                     />
                    <Form.Control.Feedback type="invalid">{validationErrors.date_publication}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group as={Col} md={6} className="mb-3 d-flex align-items-end pb-1">
                     <Form.Check
                         type="switch"
                         id="lancement_portail"
                         label="Publié sur Portail Achats Publics"
                         name="lancement_portail"
                         checked={formData.lancement_portail}
                         onChange={handleChange}
                         isInvalid={!!validationErrors.lancement_portail}
                         className="mb-0"
                     />
                 </Form.Group>

                {/* Conditionally render Date Lancement Portail field */}
                {formData.lancement_portail && (
                    <Form.Group as={Col} md="6" className="mb-3">
                        <Form.Label htmlFor="date_lancement_portail">Date Lancement Portail <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            id="date_lancement_portail" className={inputClass} type="date"
                            name="date_lancement_portail" value={formData.date_lancement_portail}
                            onChange={handleChange} isInvalid={!!validationErrors.date_lancement_portail}
                            required={formData.lancement_portail}
                         />
                        <Form.Control.Feedback type="invalid">{validationErrors.date_lancement_portail}</Form.Control.Feedback>
                    </Form.Group>
                )}
                 {/* Optional: Add a balancing Col if the date field is not shown */}
                 {!formData.lancement_portail && <Col md="6" className="mb-3 d-none d-md-block"> </Col>}
            </Row>

            {/* Submit/Cancel Buttons (Code 1 style) */}
             <div className="text-center mt-4 pt-3 border-top">
                 <Button variant="secondary" onClick={onClose} className="me-3 rounded-pill px-5" disabled={isOverallLoading}>
                     Annuler
                 </Button>
                 <Button variant="primary" type="submit" className="rounded-pill px-5" disabled={isOverallLoading}>
                     {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2"/> : null}
                     {isSubmitting ? 'Enregistrement...' : (isEditMode ? 'Enregistrer Modifications' : 'Créer Appel d\'Offre')}
                 </Button>
             </div>
        </Form>
    );
};

// --- PropTypes (Merged) ---
AppelOffreForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string.isRequired,
};

// --- Default Props (from Code 1) ---
AppelOffreForm.defaultProps = {
    itemId: null,
    onItemCreated: (item) => console.log("Appel d'Offre Created:", item),
    onItemUpdated: (item) => console.log("Appel d'Offre Updated:", item),
};

export default AppelOffreForm;