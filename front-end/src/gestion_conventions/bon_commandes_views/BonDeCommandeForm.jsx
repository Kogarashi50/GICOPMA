// src/gestion_conventions/bons_de_commande_views/BonDeCommandeForm.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // Added useMemo
import axios from 'axios';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { Form, Button, Row, Col, Alert, Spinner, Card, Stack, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faTrashAlt, faFileAlt, faPaperclip, faPlus,
    faUsers, faUserTie // <-- Added icons for fonctionnaire
} from '@fortawesome/free-solid-svg-icons';

// --- Styles and CSS Classes (Using provided style object for react-select) ---
const selectStyles = {
    control: (provided, state) => ({ ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da', boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', }), valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden', }), input: (provided) => ({ ...provided, margin: '0px', padding: '0px', }), indicatorSeparator: () => ({ display: 'none', }), indicatorsContainer: (provided) => ({ ...provided, padding: '1px', }), placeholder: (provided) => ({ ...provided, color: '#6c757d', }), menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1050 }), menuPortal: base => ({ ...base, zIndex: 9999 }), option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', }),
    // Styles for multi-select tags
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px', }),
    multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', }),
    multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white', }, }),
};
// --- Using original provided class names ---
const FORM_CONTAINER_CLASS = "p-3 p-md-4 bc-form-container";
const FORM_CONTROL_CLASS = "p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light border-1";
const FORM_SELECT_CLASS = "px-3 py-2 mt-1 rounded-5  border mb-3 shadow-sm bg-light "; // For standard select
const FORM_TEXTAREA_CLASS = "p-3 mt-1 mb-3 rounded-5  shadow-sm bg-light border-1 ";
const FORM_ACTIONS_ROW_CLASS = "mt-4 pt-2 justify-content-center flex-shrink-0";
const FORM_CANCEL_BUTTON_CLASS = "btn px-5 rounded-5 py-1 bg-danger border-0 text-white";
const FORM_SUBMIT_BUTTON_CLASS = "btn rounded-5 px-5 py-1 align-items-center d-flex justify-content-evenly bg-primary border-0";
const FORM_HEADER_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold';

// --- Environment Variables ---
const BASE_API_URL = 'http://localhost:8000/api'; // Default value, adjust if needed
const STORAGE_URL = 'http://localhost:8000/storage'; // Default value, adjust if needed

// --- Helper: Parse Multi-Select String ---
const findMultiOptions = (options, valuesString, separator = ';') => {
    if (!valuesString || typeof valuesString !== 'string' || !Array.isArray(options) || options.length === 0) return [];
    const selectedValues = valuesString.split(separator)
        .map(v => String(v).trim().toLowerCase())
        .filter(v => v);
    return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase()));
};
// --- End Helper ---


// --- Component Definition ---
const BonDeCommandeForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated }) => {
    const isEditing = useMemo(() => itemId !== null, [itemId]);

    // --- Initial State ---
    const initialState = useMemo(() => ({ // Wrap initialState in useMemo
        numero_bc: '', date_emission: '', objet: '', montant_total: '',
        fournisseur_nom: '', mode_paiement: '', etat: 'en préparation',
        marche: null, // For react-select { value, label }
        contrat: null, // For react-select { value, label }
        fonctionnaires: [], // <-- ADDED: For fonctionnaire multi-select
        existingFiles: [], // Files already saved
        filesToDelete: [], // IDs of existing files marked for deletion
    }), []); // Empty dependency array ensures it's only created once

    // --- State ---
    const [formData, setFormData] = useState(initialState);
    const [selectedFiles, setSelectedFiles] = useState([]); // Holds NEW File objects
    const [marcheOptions, setMarcheOptions] = useState([]);
    const [contratOptions, setContratOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]); // <-- ADDED
    const [loadingOptions, setLoadingOptions] = useState({ marches: false, contrats: false, fonctionnaires: true }); // <-- ADDED fonctionnaires
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(isEditing);
    const fileInputRef = useRef(null);

    const apiPrefix = ''; // Assuming Laravel handles /api prefix automatically

    // --- Fetch Options (Marches, Contrats, Fonctionnaires) ---
    const fetchMarcheOptions = useCallback(async () => {
        setLoadingOptions(prev => ({ ...prev, marches: true }));
        try {
            const response = await axios.get(`${BASE_API_URL}${apiPrefix}/marches-publics`, { params: { per_page: 1000 }, withCredentials: true });
            const data = response.data.marches_publics || response.data.data || response.data || [];
            const options = data.map(m => ({ value: m.id, label: `${m.numero_marche || m.intitule || `ID: ${m.id}`}` }));
            setMarcheOptions(options);
            setFormErrors(prev => ({ ...prev, marche_id: undefined }));
        } catch (err) {
            console.error("Error loading Marche options:", err);
            setFormErrors(prev => ({ ...prev, marche_id: "Erreur chargement Marchés" }));
        } finally {
            setLoadingOptions(prev => ({ ...prev, marches: false }));
        }
    }, [apiPrefix]); // Removed BASE_API_URL from deps if it's constant

    const fetchContratOptions = useCallback(async () => {
        setLoadingOptions(prev => ({ ...prev, contrats: true }));
        try {
            const response = await axios.get(`${BASE_API_URL}${apiPrefix}/contrat-droit-commun`, { params: { per_page: 1000 }, withCredentials: true });
            const data = response.data.contrats || response.data.data || response.data || [];
            const options = data.map(c => ({ value: c.id, label: `${c.numero_contrat || c.objet || `ID: ${c.id}`}` }));
            setContratOptions(options);
            setFormErrors(prev => ({ ...prev, contrat_id: undefined }));
        } catch (err) {
            console.error("Error loading Contrat options:", err);
            setFormErrors(prev => ({ ...prev, contrat_id: "Erreur chargement Contrats" }));
        } finally {
            setLoadingOptions(prev => ({ ...prev, contrats: false }));
        }
    }, [apiPrefix]); // Removed BASE_API_URL from deps if it's constant

    // <-- ADDED: Fetch Fonctionnaires -->
    const fetchFonctionnaires = useCallback(async () => {
        setLoadingOptions(prev => ({ ...prev, fonctionnaires: true }));
        try {
            const response = await axios.get(`${BASE_API_URL}${apiPrefix}/fonctionnaires`, { withCredentials: true });
            const foncData = response.data.fonctionnaires || response.data || [];
            setFonctionnairesOptions(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` }))
                .sort((a, b) => a.label.localeCompare(b.label)));
            console.log("Fonctionnaires options loaded.");
        } catch (err) {
            console.error("Error loading fonctionnaires options:", err);
            setFormErrors(prev => ({ ...prev, id_fonctionnaire: "Erreur chargement Fonctionnaires" })); // Set potential error
            setFonctionnairesOptions([]); // Ensure empty array on error
        } finally {
            setLoadingOptions(prev => ({ ...prev, fonctionnaires: false }));
        }
    }, [apiPrefix]); // Removed BASE_API_URL from deps if it's constant

    useEffect(() => {
        fetchMarcheOptions();
        fetchContratOptions();
        fetchFonctionnaires(); // <-- Call fetch fonctionnaires
    }, [fetchMarcheOptions, fetchContratOptions, fetchFonctionnaires]); // <-- Add to dependency array

    // --- Check if all options are loaded ---
    const allOptionsLoaded = useMemo(() =>
        !loadingOptions.marches && !loadingOptions.contrats && !loadingOptions.fonctionnaires,
        [loadingOptions]
    );

    // --- Fetch Existing Data When Editing ---
    useEffect(() => {
        if (!isEditing) {
            // Reset form state if switching to create mode
            if (formData.numero_bc || formData.existingFiles.length > 0 || selectedFiles.length > 0) {
                 setFormData(initialState); setSelectedFiles([]); setFormErrors({});
                 setSubmissionStatus({ loading: false, error: null, success: false });
            }
             setLoadingData(false); // Ensure loading data is false for create mode
             return; // Exit if not editing
        }

        // Wait until all options are loaded before fetching item data
        if (!allOptionsLoaded) {
            console.log("[BC Form Edit] Waiting for all options to load...");
            setLoadingData(true); // Keep showing loader if options aren't ready
            return;
        }

        // Proceed to fetch BC data
        setLoadingData(true); setSubmissionStatus({ loading: false, error: null, success: false }); setFormErrors({});
        let isMounted = true;
        const fetchBonDeCommandeData = async () => {
            console.log(`[BC Form Edit] Fetching data for ID: ${itemId}`);
            try {
                const response = await axios.get(`${BASE_API_URL}${apiPrefix}/bon-de-commande/${itemId}`, { withCredentials: true });
                const data = response.data.bon_de_commande;
                console.log("[BC Form Edit] Fetched Data:", data);
                if (!data) throw new Error("Bon de commande non trouvé pour modification.");
                if (isMounted) {
                    const findOption = (options, valueToFind) => options?.find(opt => String(opt.value) === String(valueToFind)) || null;

                    // <-- ADDED: Parse fonctionnaire IDs -->
                    const matchedFonctionnaires = findMultiOptions(fonctionnairesOptions, data.id_fonctionnaire, ';');
                    console.log("[BC Form Edit] Matched Fonctionnaires:", matchedFonctionnaires);

                    setFormData({
                        // Keep original field mapping
                        numero_bc: data.numero_bc ?? '', date_emission: data.date_emission ? data.date_emission.split('T')[0] : '',
                        objet: data.objet ?? '', montant_total: data.montant_total ?? '', fournisseur_nom: data.fournisseur_nom ?? '',
                        mode_paiement: data.mode_paiement ?? '', etat: data.etat ?? 'en préparation',
                        marche: findOption(marcheOptions, data.marche_id), contrat: findOption(contratOptions, data.contrat_id),
                        fonctionnaires: matchedFonctionnaires, // <-- Set the parsed array
                        existingFiles: data.fichiers || [], filesToDelete: [],
                    });
                    setSelectedFiles([]); // Clear any previously selected new files
                }
            } catch (err) {
                console.error("[BC Form Edit] Error loading data:", err.response || err);
                if (isMounted) { const errorMsg = err.response?.data?.failed || err.response?.data?.message || "Erreur chargement données BC."; setSubmissionStatus({ loading: false, error: errorMsg, success: false }); }
            } finally { if (isMounted) setLoadingData(false); }
        };
        fetchBonDeCommandeData();
        return () => { isMounted = false; };
    // Depend on itemId, editing status, and whether options are loaded
    }, [itemId, isEditing, allOptionsLoaded, marcheOptions, contratOptions, fonctionnairesOptions, apiPrefix, initialState]); // Added fonctionnairesOptions, apiPrefix, initialState


    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleSelectChange = (name, selectedOption) => {
         setFormData(prev => ({ ...prev, [name]: selectedOption }));
         // Clear potential validation errors for the related ID field
         if (formErrors[`${name}_id`]) setFormErrors(prev => ({ ...prev, [`${name}_id`]: undefined }));
    };

    // <-- ADDED: Handler for Fonctionnaire Change -->
    const handleFonctionnaireChange = useCallback((selectedOptions) => {
        setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] }));
        if (formErrors.id_fonctionnaire) {
            setFormErrors(prev => ({ ...prev, id_fonctionnaire: undefined }));
        }
    }, [formErrors.id_fonctionnaire]);

    // --- File Handlers (Keep original logic) ---
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        if (!newFiles.length) return;
        // Basic validation example (optional, backend validation is primary)
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        const validFiles = newFiles.filter(file => {
             if (!allowedTypes.includes(file.type)) {
                 console.warn(`File type not allowed: ${file.name} (${file.type})`);
                 setFormErrors(prev => ({...prev, fichiers: `Type de fichier non autorisé pour ${file.name}`}));
                 return false;
             }
             if (file.size > maxSize) {
                 console.warn(`File too large: ${file.name} (${file.size} bytes)`);
                 setFormErrors(prev => ({...prev, fichiers: `Fichier trop volumineux: ${file.name} (max 10MB)`}));
                 return false;
             }
             return true;
         });

        if (validFiles.length !== newFiles.length) {
             // Only add valid files if some were invalid
             setSelectedFiles(prev => [...prev, ...validFiles]);
        } else {
             // Add all if all were valid
             setSelectedFiles(prev => [...prev, ...newFiles]);
             if (formErrors.fichiers) setFormErrors(prev => ({ ...prev, fichiers: undefined })); // Clear error if new valid files added
        }

        if (fileInputRef.current) { fileInputRef.current.value = ""; } // Reset input to allow selecting the same file again
    };

    const removeNewSelectedFile = useCallback((indexToRemove) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    const handleMarkFileForDeletion = useCallback((fileIdToDelete) => {
         setFormData(prev => ({
             ...prev,
             filesToDelete: [...prev.filesToDelete, fileIdToDelete],
             existingFiles: prev.existingFiles.filter(f => f.id !== fileIdToDelete)
         }));
    }, []);
    // --- End File Handlers ---

    // --- Validation ---
    const validateForm = () => {
        // Keep original validation logic
        const errors = {};
        if (!formData.numero_bc?.trim()) errors.numero_bc = "Numéro BC requis.";
        if (!formData.date_emission) errors.date_emission = "Date d'émission requise.";
        if (!formData.objet?.trim()) errors.objet = "Objet requis.";
        if (formData.montant_total === '' || formData.montant_total === null || isNaN(parseFloat(formData.montant_total)) || parseFloat(formData.montant_total) < 0) { errors.montant_total = "Montant total (nombre positif) requis."; }
        if (!formData.fournisseur_nom?.trim()) errors.fournisseur_nom = "Nom du fournisseur requis.";
        // Add validation for id_fonctionnaire if needed (e.g., required)
        // if (!formData.fonctionnaires || formData.fonctionnaires.length === 0) {
        //    errors.id_fonctionnaire = "Au moins un fonctionnaire requis.";
        // }
        setFormErrors(errors);
        console.log("[BC Form] Validation Errors:", errors);
        return Object.keys(errors).length === 0;
    };

    // --- Submit Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) { setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs dans le formulaire.", success: false }); return; }
        setSubmissionStatus({ loading: true, error: null, success: false });
        setFormErrors({});

        const dataToSubmit = new FormData();

        // Append standard fields
        dataToSubmit.append('numero_bc', formData.numero_bc);
        dataToSubmit.append('date_emission', formData.date_emission);
        dataToSubmit.append('objet', formData.objet);
        dataToSubmit.append('montant_total', formData.montant_total);
        dataToSubmit.append('fournisseur_nom', formData.fournisseur_nom);
        dataToSubmit.append('etat', formData.etat || 'en préparation');
        if (formData.mode_paiement) dataToSubmit.append('mode_paiement', formData.mode_paiement);
        if (formData.marche?.value) dataToSubmit.append('marche_id', formData.marche.value);
        if (formData.contrat?.value) dataToSubmit.append('contrat_id', formData.contrat.value);

        // <-- ADDED: Append fonctionnaire IDs -->
        const fonctionnaireIdsString = formData.fonctionnaires.map(f => f.value).join(';');
        if (fonctionnaireIdsString) { // Only append if not empty
            dataToSubmit.append('id_fonctionnaire', fonctionnaireIdsString);
        }

        // Append new files
        selectedFiles.forEach((file, index) => { dataToSubmit.append(`fichiers[${index}]`, file, file.name); });

        // Append files marked for deletion (only in edit mode)
        if (isEditing && formData.filesToDelete.length > 0) {
             formData.filesToDelete.forEach((fileId, index) => { dataToSubmit.append(`fichiers_a_supprimer[${index}]`, fileId); });
        }

        // Determine URL and Method
        const url = isEditing ? `${BASE_API_URL}${apiPrefix}/bon-de-commande/${itemId}` : `${BASE_API_URL}${apiPrefix}/bon-de-commande`;
        const httpMethod = 'POST'; // Always POST for FormData, use _method for PUT/PATCH
        if (isEditing) {
            dataToSubmit.append('_method', 'PUT'); // Method spoofing
            console.log(`[BC Form] Submitting PUT (via POST) to ${url}`);
        } else {
            console.log(`[BC Form] Submitting POST to ${url}`);
        }

        // Log FormData contents (for debugging)
        // for (let pair of dataToSubmit.entries()) { console.log(pair[0]+ ': ', pair[1]); }

        try {
            // Make API Request
            const response = await axios({
                method: httpMethod,
                url: url,
                data: dataToSubmit,
                headers: { 'Content-Type': 'multipart/form-data', 'Accept': 'application/json' },
                withCredentials: true
             });

            console.log(`[BC Form] API ${isEditing ? 'Update' : 'Create'} Response:`, response.data);
            setSubmissionStatus({ loading: false, error: null, success: true });
            const responseData = response.data.bon_de_commande;

            // Trigger callbacks
            if (isEditing && onItemUpdated) { console.log("[BC Form] Calling onItemUpdated callback"); onItemUpdated(responseData); }
            else if (!isEditing && onItemCreated) { console.log("[BC Form] Calling onItemCreated callback"); onItemCreated(responseData); }

            // Close form after a short delay to show success message
             setTimeout(onClose, 1500);

        } catch (err) {
            // Keep original error handling logic
            console.error(`[BC Form] Erreur lors de ${isEditing ? 'la modification' : 'la création'}:`, err.response || err);
            let errorMsg = `Une erreur s'est produite lors de la sauvegarde.`; const backendErrors = {};
            if (err.response) {
                 console.error("Backend Error Response:", err.response.data);
                 if (err.response.status === 422 && typeof err.response.data.errors === 'object') { const validationErrors = err.response.data.errors; let messages = []; for (const key in validationErrors) { const cleanKey = key.split('.')[0]; backendErrors[cleanKey] = validationErrors[key]?.[0] || "Erreur inconnue."; messages.push(backendErrors[cleanKey]); } setFormErrors(backendErrors); errorMsg = messages.length > 0 ? messages.join(' ') : "Erreurs de validation."; }
                 else if (err.response.data?.failed) { errorMsg = err.response.data.failed; } else if (err.response.data?.message) { errorMsg = err.response.data.message; }
                 else if (err.message?.includes('Network Error')) { errorMsg = "Erreur réseau. Impossible de joindre le serveur."; } else { errorMsg = `Erreur serveur (${err.response.status})`; }
             } else if (err.request) { errorMsg = "Aucune réponse reçue du serveur."; } else { errorMsg = `Erreur de configuration: ${err.message}`; }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    // --- Render Logic ---
    // Combined loading state
    const isSubmitDisabled = submissionStatus.loading || loadingOptions.marches || loadingOptions.contrats || loadingOptions.fonctionnaires || loadingData;

    // State 1: Loading data for editing
    if (isEditing && loadingData) {
         return (<div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '300px' }}><Spinner animation="border" variant="primary" /><span className='ms-3 text-muted'>Chargement des données...</span></div>);
     }
     // State 2: Loading options (show only on create if data loading isn't active)
     if (!loadingData && (loadingOptions.marches || loadingOptions.contrats || loadingOptions.fonctionnaires)) {
          return (<div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '300px' }}><Spinner animation="border" variant="secondary" /><span className='ms-3 text-muted'>Chargement des options...</span></div>);
      }

    // State 3: Render the form
    const etatOptions = [ { value: 'en préparation', label: 'En préparation' }, { value: 'validé', label: 'Validé' }, { value: 'envoyé', label: 'Envoyé' }, { value: 'reçu', label: 'Reçu' }, { value: 'annulé', label: 'Annulé' }, ];

    return (
        // Keep original container styling
        <div className={FORM_CONTAINER_CLASS} style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
            {/* Header - Keep original */}
             <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0 border-bottom pb-3">
                 <div>
                     <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5>
                     <h2 className="mb-0 fw-bold">Bon de Commande {isEditing ? `(${formData.numero_bc || itemId})` : ''}</h2>
                 </div>
                 <Button variant="warning" className={FORM_HEADER_CLOSE_BUTTON_CLASS} onClick={onClose} size="sm">Revenir à la liste</Button>
             </div>

             {/* Form Content */}
             <div className="flex-grow-1 px-md-3">
                 {/* Feedback Area - Keep original */}
                 {submissionStatus.error && (<Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({ ...prev, error: null }))}><FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> {submissionStatus.error}</Alert>)}
                 {submissionStatus.success && (<Alert variant="success" className="mb-3 py-2">Bon de Commande {isEditing ? 'modifié' : 'créé'} avec succès!</Alert>)}

                <Form noValidate onSubmit={handleSubmit}>
                    {/* Row 1: Numero BC, Date Emission - Keep original */}
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formNumeroBc">
                            <Form.Label className="small mb-1 fw-medium">Numéro BC <span className="text-danger">*</span></Form.Label>
                            <Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.numero_bc} required type="text" name="numero_bc" value={formData.numero_bc} onChange={handleChange} size="sm" />
                            <Form.Control.Feedback type="invalid">{formErrors.numero_bc}</Form.Control.Feedback>
                        </Form.Group>
                         <Form.Group as={Col} md={6} controlId="formDateEmission">
                            <Form.Label className="small mb-1 fw-medium">Date Émission <span className="text-danger">*</span></Form.Label>
                            <Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.date_emission} required type="date" name="date_emission" value={formData.date_emission} onChange={handleChange} size="sm" />
                            <Form.Control.Feedback type="invalid">{formErrors.date_emission}</Form.Control.Feedback>
                        </Form.Group>
                    </Row>
                    {/* Row 2: Objet - Keep original */}
                     <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={12} controlId="formObjet">
                             <Form.Label className="small mb-1 fw-medium">Objet <span className="text-danger">*</span></Form.Label>
                             <Form.Control as="textarea" rows={3} className={FORM_TEXTAREA_CLASS} style={{ borderRadius: '1rem' }} isInvalid={!!formErrors.objet} required name="objet" value={formData.objet} onChange={handleChange} size="sm" />
                             <Form.Control.Feedback type="invalid">{formErrors.objet}</Form.Control.Feedback>
                        </Form.Group>
                     </Row>
                     {/* Row 3: Fournisseur, Montant Total - Keep original */}
                     <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formFournisseurNom">
                            <Form.Label className="small mb-1 fw-medium">Fournisseur <span className="text-danger">*</span></Form.Label>
                            <Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.fournisseur_nom} required type="text" name="fournisseur_nom" value={formData.fournisseur_nom} onChange={handleChange} size="sm" />
                            <Form.Control.Feedback type="invalid">{formErrors.fournisseur_nom}</Form.Control.Feedback>
                         </Form.Group>
                         <Form.Group as={Col} md={6} controlId="formMontantTotal">
                            <Form.Label className="small mb-1 fw-medium">Montant Total TTC <span className="text-danger">*</span></Form.Label>
                            <Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.montant_total} required type="number" step="0.01" min="0" name="montant_total" value={formData.montant_total} onChange={handleChange} size="sm" placeholder="0.00" />
                            <Form.Control.Feedback type="invalid">{formErrors.montant_total}</Form.Control.Feedback>
                        </Form.Group>
                     </Row>
                     {/* Row 4: Marche, Contrat - Keep original */}
                     <Row className="mb-3 g-3">
                          <Form.Group as={Col} md={6} controlId="formMarche">
                            <Form.Label className="small mb-1 fw-medium">Marché Associé</Form.Label>
                             <Select name="marche" inputId="marche" options={marcheOptions} value={formData.marche} onChange={(selectedOption) => handleSelectChange('marche', selectedOption)} styles={selectStyles} placeholder={loadingOptions.marches ? "Chargement..." : "- Sélectionner Marché -"} isClearable isLoading={loadingOptions.marches} isDisabled={loadingOptions.marches} classNamePrefix="react-select" className={formErrors.marche_id ? 'is-invalid' : ''} aria-label="Sélectionner Marché Associé" menuPlacement="auto" menuPortalTarget={document.body}/>
                             {formErrors.marche_id && <div className="invalid-feedback d-block ps-2 small mt-1">{formErrors.marche_id}</div>}
                          </Form.Group>
                          <Form.Group as={Col} md={6} controlId="formContrat">
                             <Form.Label className="small mb-1 fw-medium">Contrat Associé</Form.Label>
                             <Select name="contrat" inputId="contrat" options={contratOptions} value={formData.contrat} onChange={(selectedOption) => handleSelectChange('contrat', selectedOption)} styles={selectStyles} placeholder={loadingOptions.contrats ? "Chargement..." : "- Sélectionner Contrat -"} isClearable isLoading={loadingOptions.contrats} isDisabled={loadingOptions.contrats} classNamePrefix="react-select" className={formErrors.contrat_id ? 'is-invalid' : ''} aria-label="Sélectionner Contrat Associé" menuPlacement="auto" menuPortalTarget={document.body}/>
                             {formErrors.contrat_id && <div className="invalid-feedback d-block ps-2 small mt-1">{formErrors.contrat_id}</div>}
                          </Form.Group>
                     </Row>

                     {/* --- ADDED: Fonctionnaire Row --- */}
                      <Row className="mb-3 g-3">
                         <Form.Group as={Col} md={12} controlId="formFonctionnaire">
                             <Form.Label className="small mb-1 fw-medium">
                                 <FontAwesomeIcon icon={faUsers} className="me-1" /> Points Focaux
                             </Form.Label>
                             <Select
                                 inputId="fonctionnaires" name="fonctionnaires" // Different name from form state key
                                 options={fonctionnairesOptions}
                                 value={formData.fonctionnaires} // Bind to the array in formData
                                 onChange={handleFonctionnaireChange} // Use specific handler
                                 placeholder={loadingOptions.fonctionnaires ? "Chargement..." : "Sélectionner Fonctionnaire(s) (Optionnel)..."}
                                 isClearable closeMenuOnSelect={false}
                                 isMulti // Enable multi-select
                                 isLoading={loadingOptions.fonctionnaires}
                                 isDisabled={loadingOptions.fonctionnaires}
                                 styles={selectStyles} // Use the defined style object
                                 className={formErrors.id_fonctionnaire ? 'is-invalid' : ''}
                                 menuPortalTarget={document.body} // Prevent cutoff
                             />
                             {/* Manual feedback display for react-select */}
                             {formErrors.id_fonctionnaire &&
                                <div className="invalid-feedback d-block ps-2 small mt-1">{formErrors.id_fonctionnaire}</div>
                             }
                         </Form.Group>
                      </Row>
                     {/* --- END ADDED ROW --- */}

                      {/* Row 5 (now 6): Etat, Mode Paiement - Keep original */}
                     <Row className="mb-3 g-3">
                          <Form.Group as={Col} md={6} controlId="formEtat">
                              <Form.Label className="small mb-1 fw-medium">État</Form.Label>
                              {/* Use original standard Form.Select */}
                              <Form.Select className={FORM_SELECT_CLASS} name="etat" value={formData.etat} onChange={handleChange} isInvalid={!!formErrors.etat} aria-label="Sélectionner État" >
                                  {etatOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </Form.Select>
                               <Form.Control.Feedback type="invalid">{formErrors.etat}</Form.Control.Feedback>
                          </Form.Group>
                           <Form.Group as={Col} md={6} controlId="formModePaiement">
                              <Form.Label className="small mb-1 fw-medium">Mode Paiement</Form.Label>
                              <Form.Control className={FORM_CONTROL_CLASS} type="text" name="mode_paiement" value={formData.mode_paiement} onChange={handleChange} size="sm" placeholder="Ex: Virement, Chèque"/>
                              {/* No validation feedback shown for this optional field in original */}
                           </Form.Group>
                     </Row>

                     {/* File Upload Section - Keep original */}
                    <Row className="mb-3 g-3">
                        <Col md={12}>
                             <Card className="border shadow-sm">
                                 <Card.Body className='p-3'>
                                     <Form.Group controlId="bonCommandeFileGroup">
                                         <Form.Label className="small mb-1 fw-medium">
                                             <FontAwesomeIcon icon={faPaperclip} className="me-2"/>Joindre Fichiers
                                         </Form.Label>
                                         {/* Keep original hidden input + button trigger */}
                                         <Form.Control ref={fileInputRef} id="bonCommandeFileInput" className='d-none' type="file" multiple onChange={handleFileChange} isInvalid={!!formErrors.fichiers} aria-hidden="true"/>
                                         <Button variant="outline-primary" size="sm" className="d-inline-block ms-2 rounded-5" onClick={() => fileInputRef.current?.click()} title="Sélectionner des fichiers à ajouter">
                                             <FontAwesomeIcon icon={faPlus} className="me-1" /> Ajouter Fichier(s)
                                         </Button>
                                         {formErrors.fichiers && (<div className="d-block invalid-feedback small mt-1 ms-1">{formErrors.fichiers}</div> )}

                                          {/* Keep original Existing Files display */}
                                          {isEditing && formData.existingFiles?.length > 0 && (
                                             <Stack direction="horizontal" gap={1} className="mt-2 pt-2 border-top flex-wrap" style={{fontSize: '0.8em'}}>
                                                 <span className="me-2 small text-muted fw-bold">Actuels:</span>
                                                 {formData.existingFiles.map((file) => (
                                                     <Badge key={`existing-bc-file-${file.id}`} pill bg="light" text="dark" className="d-flex p-2 align-items-center fw-normal border shadow-sm">
                                                          <FontAwesomeIcon icon={faFileAlt} className="me-2 text-secondary"/>
                                                         <a href={`${STORAGE_URL}/${file.chemin_fichier}`} target="_blank" rel="noopener noreferrer" className='me-1 text-truncate text-decoration-none text-primary' style={{maxWidth: '150px'}} title={`Voir/Télécharger: ${file.nom_fichier}`}>{file.nom_fichier}</a>
                                                         <Button variant="link" size="sm" aria-label="Marquer pour suppression" className="p-0 ms-1 text-danger" style={{fontSize: '1em', lineHeight: 1}} onClick={() => handleMarkFileForDeletion(file.id)} title="Marquer pour suppression lors de la sauvegarde"><FontAwesomeIcon icon={faTrashAlt}/></Button>
                                                     </Badge>
                                                 ))}
                                             </Stack>
                                          )}

                                          {/* Keep original Newly Selected Files display */}
                                          {selectedFiles.length > 0 && (
                                             <Stack direction="horizontal" gap={1} className={`${(isEditing && formData.existingFiles?.length > 0) ? 'mt-1 pt-1 border-top' : 'mt-2'} flex-wrap`} style={{fontSize: '0.8em'}}>
                                                 <span className="me-2 small text-muted fw-bold">Nouveaux:</span>
                                                 {selectedFiles.map((file, index) => (
                                                     <Badge key={`new-bc-file-${file.name}-${index}-${Date.now()}`} pill bg="success" className="d-flex align-items-center fw-normal p-2 shadow-sm">
                                                          <FontAwesomeIcon icon={faFileAlt} className="me-2"/>
                                                         <span className='me-1 text-truncate' style={{maxWidth: '150px'}} title={file.name}>{file.name}</span>
                                                         <Button variant="close" size="sm" aria-label="Retirer ce fichier" className="btn-close-white p-0 ms-1" style={{fontSize: '0.6em', filter: 'invert(1) grayscale(100%) brightness(200%)'}} onClick={() => removeNewSelectedFile(index)}/>
                                                     </Badge>
                                                 ))}
                                             </Stack>
                                          )}

                                          {/* Keep original placeholder */}
                                          {selectedFiles.length === 0 && (!isEditing || !formData.existingFiles || formData.existingFiles.length === 0) && (
                                              <div className="mt-2 small text-muted fst-italic">Aucun fichier joint.</div>
                                          )}
                                     </Form.Group>
                                 </Card.Body>
                             </Card>
                        </Col>
                    </Row>

                    {/* Action Buttons - Keep original */}
                    <Row className={FORM_ACTIONS_ROW_CLASS}>
                        <Col xs="auto" className="pe-2">
                            <Button onClick={onClose} variant="secondary" className={FORM_CANCEL_BUTTON_CLASS} disabled={submissionStatus.loading}>Annuler</Button>
                        </Col>
                        <Col xs="auto" className="ps-2">
                              <Button type="submit" className={FORM_SUBMIT_BUTTON_CLASS} disabled={isSubmitDisabled}>
                                 {submissionStatus.loading ? <><Spinner as="span" animation="border" size="sm" className="me-2"/> Sauvegarde...</> : (isEditing ? 'Enregistrer Modifications' : 'Créer Bon de Commande')}
                             </Button>
                        </Col>
                    </Row>
                </Form>
            </div>
        </div>
    );
};

// --- PropTypes (Keep original) ---
BonDeCommandeForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
};

// --- Default Props (Keep original) ---
BonDeCommandeForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {},
    onItemUpdated: () => {},
};

export default BonDeCommandeForm;