// src/gestion_conventions/marches_publics_views/MarchePublicForm.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // Added useMemo
import PropTypes from 'prop-types';
import axios from 'axios';
import { Form, Button, Row, Col, Spinner, Alert, Card, Stack, Badge } from 'react-bootstrap'; // Removed FormSelect (not used)
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faTrashAlt, faPaperclip,
    faUsers, faUserTie // <-- Added icons for fonctionnaire
} from '@fortawesome/free-solid-svg-icons';

// --- Constants ---
const TYPE_OPTIONS = [ { value: 'Travaux', label: 'Travaux' }, { value: 'Fournitures', label: 'Fournitures' }, { value: 'Services', label: 'Services' }, { value: 'Etudes', label: 'Etudes' }];
const MODE_PASSATION_OPTIONS = [ { value: "Appel d’offres ouvert", label: "Appel d’offres ouvert"}, { value: "Appel d’offres restreint", label: "Appel d’offres restreint"}, { value: "Marché négocié avec mise en concurrence", label: "Marché négocié avec mise en concurrence"}, { value: "Marché négocié sans mise en concurrence", label: "Marché négocié sans mise en concurrence"}, { value: "Concours", label: "Concours"}, { value: "Marché de gré à gré", label: "Marché de gré à gré"}, { value: "Système d’acquisition dynamique", label: "Système d’acquisition dynamique"}, { value: "Accord-cadre", label: "Accord-cadre"}, ];
const STATUT_OPTIONS = [ { value: 'En préparation', label: 'En préparation' }, { value: 'En cours', label: 'En cours' }, { value: 'Terminé', label: 'Terminé' }, { value: 'Résilié', label: 'Résilié' } ];
// --- End Constants ---

// --- Date Formatter ---
const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const datePart = dateString.split(' ')[0];
         if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) { return datePart; }
    } catch (e) { console.error("Error formatting date for input:", dateString, e); }
    return '';
};
// --- End Date Formatter ---

// --- react-select Styles (Provided object, kept original) ---
const selectStyles = {
    control: (provided, state) => ({ ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da', boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', }), valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden', }), input: (provided) => ({ ...provided, margin: '0px', padding: '0px', }), indicatorSeparator: () => ({ display: 'none', }), indicatorsContainer: (provided) => ({ ...provided, padding: '1px', }), placeholder: (provided) => ({ ...provided, color: '#6c757d', }), menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1050 }), menuPortal: base => ({ ...base, zIndex: 9999 }), option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', }),
    // Styles for multi-select tags
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px', }),
    multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', }),
    multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white', }, }),
};
// --- End react-select Styles ---

// --- Original CSS Class Names ---
const inputClass = 'form-control-style shadow-sm form-control-rounded';
const selectClass = 'form-control-style shadow-sm form-control-rounded form-select'; // For standard Select
const textareaClass = 'form-control-style shadow-sm form-control-rounded';
const buttonCloseClass = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm';
// --- End Original CSS Class Names ---

// --- Helper: Parse Multi-Select String ---
const findMultiOptions = (options, valuesString, separator = ';') => {
    if (!valuesString || typeof valuesString !== 'string' || !Array.isArray(options) || options.length === 0) return [];
    const selectedValues = valuesString.split(separator)
        .map(v => String(v).trim().toLowerCase())
        .filter(v => v);
    return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase()));
};
// --- End Helper ---

const MarchePublicForm = ({ itemId, onClose, onItemCreated, onItemUpdated, baseApiUrl }) => {
    const isEditMode = useMemo(() => !!itemId, [itemId]);

    // --- State for Options ---
    const [conventionOptions, setConventionOptions] = useState([]);
    const [AoOptions, setAoOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]); // <-- ADDED
    const [loadingOptions, setLoadingOptions] = useState({ conventions: true, aos: true, fonctionnaires: true }); // <-- UPDATED

    // --- State for Selected UI Options ---
    const [selectedConventionOption, setSelectedConventionOption] = useState(null);
    const [selectedAoOption, setSelectedAoOption] = useState(null);

    // --- Initial State for a single lot ---
    const initialLotState = useMemo(() => ({ // Memoize lot state
        id: null, numero_lot: '', objet: '', montant_attribue: '', attributaire: '',
        fichiers: [], existing_fichiers: [], fichiers_to_delete: []
    }), []);

    // --- Initial State for the form ---
    const initialFormData = useMemo(() => ({ // Memoize form state
        numero_marche: '', intitule: '', id_convention: null, ref_appelOffre: null,
        date_ouverture_plis: '', date_fin_ouverture: '', avancement_physique: '0',
        avancement_financier: '0', date_engagement_tresorerie: '', type_marche: null,
        procedure_passation: '', mode_passation: null, budget_previsionnel: '',
        montant_attribue: '', source_financement: '', attributaire: '',
        date_publication: '', date_limite_offres: '', date_notification: '',
        date_debut_execution: '', duree_marche: '',
        statut: STATUT_OPTIONS.find(opt => opt.value === 'En préparation') || null,
        fonctionnaires: [], // <-- ADDED: Array for multi-select state
        lots: [], general_fichiers: [], general_existing_fichiers: [],
        general_fichiers_to_delete: []
    }), []); // Dependencies match used constants

    // --- Form State ---
    const [formData, setFormData] = useState(initialFormData);
    const [isLoading, setIsLoading] = useState(isEditMode); // Loading form item data
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false); // Submission state
    const fileInputRef = useRef(null); // Keep refs if needed for file inputs
    const generalFileInputRef = useRef(null); // Ref for general files

    const apiPrefix = ''; // Assuming Laravel handles /api prefix

    // --- Fetch Options ---
    const fetchConventionOptions = useCallback(async () => {
        // Keep original convention fetching logic
        setLoadingOptions(prev => ({ ...prev, conventions: true }));
        try {
            const response = await axios.get(`${baseApiUrl}${apiPrefix}/conventions`, { params: { per_page: 1000 }, withCredentials: true });
            const conventionsList = response.data?.conventions || response.data || [];
            if (!Array.isArray(conventionsList)) { throw new Error("Format de données de convention invalide reçu."); }
            const formattedOptions = conventionsList.map(opt => ({ value: opt.id, label: opt.Intitule })).filter(Boolean);
            setConventionOptions(formattedOptions);
        } catch (error) { console.error("Error fetching convention options:", error); setConventionOptions([]); }
        finally { setLoadingOptions(prev => ({ ...prev, conventions: false })); }
    }, [baseApiUrl, apiPrefix]);

    const fetchAoOptions = useCallback(async () => {
        // Keep original AO fetching logic
        setLoadingOptions(prev => ({ ...prev, aos: true }));
        try {
            const response = await axios.get(`${baseApiUrl}${apiPrefix}/appel-offres`, { params: { per_page: 1000 }, withCredentials: true });
            const aoList = response.data?.appel_offres || response.data || [];
            if (!Array.isArray(aoList)) { throw new Error("Format de données AO invalide reçu."); }
            const formattedOptions = aoList.map(opt => ({ value: opt.id, label: opt.intitule })).filter(Boolean);
            setAoOptions(formattedOptions);
        } catch (error) { console.error("Error fetching AO options:", error); setAoOptions([]); }
        finally { setLoadingOptions(prev => ({ ...prev, aos: false })); }
    }, [baseApiUrl, apiPrefix]);

    // <-- ADDED: Fetch Fonctionnaires -->
    const fetchFonctionnaires = useCallback(async () => {
        setLoadingOptions(prev => ({ ...prev, fonctionnaires: true }));
        try {
            const response = await axios.get(`${baseApiUrl}${apiPrefix}/fonctionnaires`, { withCredentials: true });
            const foncData = response.data.fonctionnaires || response.data || [];
            setFonctionnairesOptions(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` }))
                .sort((a, b) => a.label.localeCompare(b.label)));
        } catch (err) { console.error("Error loading fonctionnaires options:", err); setFonctionnairesOptions([]); }
        finally { setLoadingOptions(prev => ({ ...prev, fonctionnaires: false })); }
    }, [baseApiUrl, apiPrefix]);

    useEffect(() => {
        fetchConventionOptions();
        fetchAoOptions();
        fetchFonctionnaires(); // <-- Call fetch fonctionnaires
    }, [fetchConventionOptions, fetchAoOptions, fetchFonctionnaires]); // <-- Add to dependency array

    // --- Check if all options are loaded ---
    const allOptionsLoaded = useMemo(() =>
        !loadingOptions.conventions && !loadingOptions.aos && !loadingOptions.fonctionnaires, // <-- Include fonctionnaires
        [loadingOptions]
    );

    // --- Fetch Existing Data When Editing ---
    useEffect(() => {
        let isMounted = true;
        if (isEditMode && allOptionsLoaded) { // Wait for ALL options
            setIsLoading(true); setError(null); setValidationErrors({});
            const apiEndpoint = `${baseApiUrl}${apiPrefix}/marches-publics/${itemId}`;
            console.log(`Form: Fetching edit data for Marche ID: ${itemId} from ${apiEndpoint}`);

            axios.get(apiEndpoint, { params: { include: 'lots.fichiersJoints,fichiersJointsGeneraux,convention,appelOffre' }, withCredentials: true }) // Eager load all
                .then(response => {
                     if (!isMounted) return;
                     const itemData = response.data?.marche_public || response.data || {};
                     console.log("Fetched Marche Public item data:", itemData);

                     // Separate files
                     const lotFilesMap = {};
                     const generalFiles = [];
                     (itemData.fichiers_joints_generaux || []).forEach(f => generalFiles.push({ id: f.id, nom_fichier: f.nom_fichier, chemin_fichier: f.chemin_fichier }));
                     (itemData.lots || []).forEach(lot => { lotFilesMap[lot.id] = (lot.fichiers_joints || []).map(f => ({ id: f.id, nom_fichier: f.nom_fichier, chemin_fichier: f.chemin_fichier })); });

                     // Pre-select options
                     const matchedConvention = conventionOptions.find(opt => opt.value === itemData.id_convention);
                     const matchedAo = AoOptions.find(opt => opt.value === itemData.ref_appelOffre);
                     // <-- ADDED: Pre-select fonctionnaires -->
                     const matchedFonctionnaires = findMultiOptions(fonctionnairesOptions, itemData.id_fonctionnaire, ';');
                     console.log("[Marche Edit] Matched Fonctionnaires:", matchedFonctionnaires);


                     setSelectedConventionOption(matchedConvention || null);
                     setSelectedAoOption(matchedAo || null);

                     setFormData(prev => ({
                         ...prev,
                         numero_marche: itemData.numero_marche || '',
                         intitule: itemData.intitule || '',
                         id_convention: itemData.id_convention || null,
                         ref_appelOffre: itemData.ref_appelOffre || null,
                         date_ouverture_plis: formatDateForInput(itemData.date_ouverture_plis),
                         date_fin_ouverture: formatDateForInput(itemData.date_fin_ouverture),
                         avancement_physique: itemData.avancement_physique ?? '0',
                         avancement_financier: itemData.avancement_financier ?? '0',
                         date_engagement_tresorerie: formatDateForInput(itemData.date_engagement_tresorerie),
                         type_marche: TYPE_OPTIONS.find(opt => opt.value === itemData.type_marche) || null,
                         procedure_passation: itemData.procedure_passation || '',
                         mode_passation: MODE_PASSATION_OPTIONS.find(opt => opt.value === itemData.mode_passation) || null,
                         budget_previsionnel: itemData.budget_previsionnel || '',
                         montant_attribue: itemData.montant_attribue || '',
                         source_financement: itemData.source_financement || '',
                         attributaire: itemData.attributaire || '',
                         date_publication: formatDateForInput(itemData.date_publication),
                         date_limite_offres: formatDateForInput(itemData.date_limite_offres),
                         date_notification: formatDateForInput(itemData.date_notification),
                         date_debut_execution: formatDateForInput(itemData.date_debut_execution),
                         duree_marche: itemData.duree_marche || '',
                         statut: STATUT_OPTIONS.find(opt => opt.value === itemData.statut) || null,
                         fonctionnaires: matchedFonctionnaires, // <-- SET parsed array
                         lots: (itemData.lots || []).map(lot => ({
                             id: lot.id, numero_lot: lot.numero_lot || '', objet: lot.objet || '',
                             montant_attribue: lot.montant_attribue || '', attributaire: lot.attributaire || '',
                             fichiers: [], existing_fichiers: lotFilesMap[lot.id] || [], fichiers_to_delete: []
                         })),
                         general_fichiers: [],
                         general_existing_fichiers: generalFiles,
                         general_fichiers_to_delete: []
                     }));
                })
                .catch(err => {
                     if (!isMounted) return;
                     console.error("Error fetching Marche Public data for edit:", err);
                     setError(err.response?.data?.message || err.message || "Erreur de chargement des données.");
                     setFormData(initialFormData); setSelectedConventionOption(null); setSelectedAoOption(null);
                })
                .finally(() => { if (isMounted) setIsLoading(false); });

        } else if (!isEditMode) {
            // Reset form for create mode if needed
            if (formData.numero_marche || formData.lots.length > 0) { setFormData(initialFormData); }
            setSelectedConventionOption(null); setSelectedAoOption(null);
            setIsLoading(false); // Not loading item data
        }
        return () => { isMounted = false; };
    // Added allOptionsLoaded and option arrays as dependencies
    }, [itemId, isEditMode, baseApiUrl, apiPrefix, allOptionsLoaded, conventionOptions, AoOptions, fonctionnairesOptions, initialFormData]);


    // --- Input Handlers (Keep original handlers) ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name]) setValidationErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleReactSelectChange = (selectedOption, actionMeta) => {
         const { name } = actionMeta;
         setFormData(prev => ({ ...prev, [name]: selectedOption }));
         if (validationErrors[name]) setValidationErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleAoSelectChange = (selectedOption) => {
        setSelectedAoOption(selectedOption);
        setFormData(prev => ({ ...prev, ref_appelOffre: selectedOption ? selectedOption.value : null }));
        if (validationErrors.ref_appelOffre) setValidationErrors(prev => ({ ...prev, ref_appelOffre: null }));
    };

    const handleConventionSelectChange = (selectedOption) => {
        setSelectedConventionOption(selectedOption);
        setFormData(prev => ({ ...prev, id_convention: selectedOption ? selectedOption.value : null }));
        if (validationErrors.id_convention) setValidationErrors(prev => ({ ...prev, id_convention: null }));
    };
    // --- End Standard Handlers ---

    // --- Lot Handlers (Keep original) ---
    const handleLotChange = useCallback((index, e) => {
        const { name, value } = e.target;
        const updatedLots = formData.lots.map((lot, i) => i === index ? { ...lot, [name]: value } : lot);
        setFormData(prev => ({ ...prev, lots: updatedLots }));
        const errorKey = `lots.${index}.${name}`;
        if (validationErrors[errorKey]) setValidationErrors(prev => ({ ...prev, [errorKey]: null }));
    }, [formData.lots, validationErrors]);

    const handleLotFileChange = useCallback((index, e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const updatedLots = formData.lots.map((lot, i) => i === index ? { ...lot, fichiers: [...(lot.fichiers || []), ...files] } : lot);
        setFormData(prev => ({ ...prev, lots: updatedLots }));
        e.target.value = null;
        const errorKeyBaseExact = `lot_files.${index}`;
        const errorKeyBaseWildcard = `lot_files.${index}.*`;
        if (validationErrors[errorKeyBaseExact] || validationErrors[errorKeyBaseWildcard]) setValidationErrors(prev => ({ ...prev, [errorKeyBaseExact]: null, [errorKeyBaseWildcard]: null }));
    }, [formData.lots, validationErrors]);

    const removeNewLotFile = useCallback((lotIndex, fileIndex) => {
        const updatedLots = formData.lots.map((lot, i) => { if (i === lotIndex) { return { ...lot, fichiers: (lot.fichiers || []).filter((_, fIdx) => fIdx !== fileIndex) }; } return lot; });
        setFormData(prev => ({ ...prev, lots: updatedLots }));
    }, [formData.lots]);

    const removeExistingLotFile = useCallback((lotIndex, fileId) => {
        if (!window.confirm("Supprimer ce fichier de lot existant ? Il sera effacé lors de la sauvegarde.")) return;
        const updatedLots = formData.lots.map((lot, i) => { if (i === lotIndex) { return { ...lot, existing_fichiers: (lot.existing_fichiers || []).filter(f => f.id !== fileId), fichiers_to_delete: [...(lot.fichiers_to_delete || []), fileId] }; } return lot; });
        setFormData(prev => ({ ...prev, lots: updatedLots }));
    }, [formData.lots]);

    const addLot = useCallback(() => {
        setFormData(prev => ({ ...prev, lots: [...(prev.lots || []), { ...initialLotState }] }));
    }, [initialLotState]);

    const removeLot = useCallback((index) => {
        const lotNum = formData.lots?.[index]?.numero_lot || `(Lot ${index + 1})`;
        if (window.confirm(`Supprimer ${lotNum} et tous ses fichiers associés ?`)) {
             setFormData(prev => ({ ...prev, lots: (prev.lots || []).filter((_, i) => i !== index) }));
             // Error shifting logic would go here if complex validation keys needed update
        }
    }, [formData.lots]);
    // --- End Lot Handlers ---

    // --- General File Handlers (Keep original) ---
    const handleGeneralFileChange = useCallback((e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setFormData(prev => ({ ...prev, general_fichiers: [...(prev.general_fichiers || []), ...files] }));
        e.target.value = null;
        if (validationErrors['general_files.*']) setValidationErrors(prev => ({ ...prev, 'general_files.*': null }));
    }, [validationErrors]);

    const removeNewGeneralFile = useCallback((fileIndex) => {
        setFormData(prev => ({ ...prev, general_fichiers: (prev.general_fichiers || []).filter((_, fIdx) => fIdx !== fileIndex) }));
    }, []);

    const removeExistingGeneralFile = useCallback((fileId) => {
        if (!window.confirm("Supprimer ce fichier général existant ? Il sera effacé lors de la sauvegarde.")) return;
        setFormData(prev => ({ ...prev, general_existing_fichiers: (prev.general_existing_fichiers || []).filter(f => f.id !== fileId), general_fichiers_to_delete: [...(prev.general_fichiers_to_delete || []), fileId] }));
    }, []);
    // --- End General File Handlers ---

    // --- ADDED: Handler for Fonctionnaire Select ---
    const handleFonctionnaireChange = useCallback((selectedOptions) => {
        setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] }));
        if (validationErrors.id_fonctionnaire) {
            setValidationErrors(prev => ({ ...prev, id_fonctionnaire: undefined }));
        }
    }, [validationErrors.id_fonctionnaire]);

    // --- Server Error Mapping (Keep original) ---
    const mapServerErrors = useCallback((serverErrors) => {
        const formErrors = {};
        if (!serverErrors || typeof serverErrors !== 'object') return formErrors;
        for (const key in serverErrors) {
            const messages = Array.isArray(serverErrors[key]) ? serverErrors[key] : [serverErrors[key]];
            const lotFieldMatch = key.match(/^lots\.(\d+)\.(.+)$/);
            const lotFileMatch = key.match(/^lot_files\.(\d+)(?:\.(\d+|\*))?$/);
            const generalFileMatch = key.match(/^general_files(?:\.(\d+|\*))?$/);
            if (lotFieldMatch) formErrors[`lots.${lotFieldMatch[1]}.${lotFieldMatch[2]}`] = messages;
            else if (lotFileMatch) formErrors[`lot_files.${lotFileMatch[1]}.*`] = messages;
            else if (generalFileMatch) formErrors['general_files.*'] = messages;
            else formErrors[key] = messages; // Direct mapping
        }
        console.log("Mapped validation errors:", formErrors);
        return formErrors;
     }, []);

    // --- Form Submission ---
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!allOptionsLoaded && !isEditMode) { setError("Veuillez patienter..."); return; } // Prevent submit if options still loading on create
        setIsSubmitting(true); setError(null); setValidationErrors({});
        console.log("Form Data Before Submit:", JSON.stringify(formData, null, 2));

        const submissionPayload = new FormData();

        // Append Marche Public Data
        Object.entries(formData).forEach(([key, value]) => {
             if (['lots', 'general_fichiers', 'general_existing_fichiers', 'general_fichiers_to_delete', 'fonctionnaires'].includes(key)) return; // Exclude handled separately
             if ((key === 'type_marche' || key === 'mode_passation' || key === 'statut') && typeof value === 'object' && value !== null) { submissionPayload.append(key, value.value); } // Append value from select object
             else if (value !== null && value !== undefined) { submissionPayload.append(key, value); } // Append other fields
         });

        // <-- ADDED: Append fonctionnaire IDs -->
        const fonctionnaireIdsString = formData.fonctionnaires.map(f => f.value).join(';');
        if (fonctionnaireIdsString) { submissionPayload.append('id_fonctionnaire', fonctionnaireIdsString); }

        // Append Lots Data as JSON (keep original)
        const lotsJsonData = (formData.lots || []).map(lot => ({ id: lot.id || null, numero_lot: lot.numero_lot || null, objet: lot.objet || null, montant_attribue: (lot.montant_attribue !== '' && !isNaN(Number(lot.montant_attribue))) ? parseFloat(lot.montant_attribue) : null, attributaire: lot.attributaire || null, fichiers_to_delete: lot.fichiers_to_delete || [], }));
        if (lotsJsonData.length > 0) { submissionPayload.append('lots_data', JSON.stringify(lotsJsonData)); }

        // Append NEW Lot Files (keep original)
        (formData.lots || []).forEach((lot, index) => { if (lot.fichiers && lot.fichiers.length > 0) { lot.fichiers.forEach((file) => { if (file instanceof File) { submissionPayload.append(`lot_files[${index}][]`, file, file.name); } }); } });

        // Append NEW General Files (keep original)
        if (formData.general_fichiers && formData.general_fichiers.length > 0) { formData.general_fichiers.forEach((file) => { if (file instanceof File) { submissionPayload.append(`general_files[]`, file, file.name); } }); }

        // Append General Files to Delete IDs (keep original)
        if (formData.general_fichiers_to_delete && formData.general_fichiers_to_delete.length > 0) { submissionPayload.append('general_fichiers_to_delete_ids', JSON.stringify(formData.general_fichiers_to_delete)); }

        // Add PUT method for updates (keep original)
        if (isEditMode) { submissionPayload.append('_method', 'PUT'); }

        console.log("Submitting FormData...");
        const url = isEditMode ? `${baseApiUrl}${apiPrefix}/marches-publics/${itemId}` : `${baseApiUrl}${apiPrefix}/marches-publics`;

        try {
            // Keep original axios config
            const config = { headers: { 'Accept': 'application/json' }, withCredentials: true }; // Let Axios handle multipart
            const response = await axios.post(url, submissionPayload, config);

            console.log(`API Response (${isEditMode ? 'Update' : 'Create'}):`, response.data);
            setError(null); setValidationErrors({});
            if (isEditMode && onItemUpdated) onItemUpdated(response.data.marche_public || response.data);
            else if (!isEditMode && onItemCreated) onItemCreated(response.data.marche_public || response.data);
            onClose();

        } catch (err) {
            // Keep original error handling
             console.error("Error submitting form:", err.response || err);
             const message = err.response?.data?.message || err.message || "Erreur de soumission.";
             if (err.response && err.response.status === 422) {
                 const serverErrors = err.response.data.errors || {};
                 console.error("Validation Errors from Server:", serverErrors);
                 setValidationErrors(mapServerErrors(serverErrors));
                 setError("Veuillez corriger les erreurs.");
             } else { setError(message); setValidationErrors({}); }
        } finally { setIsSubmitting(false); }
    }, [formData, isEditMode, apiPrefix, baseApiUrl, itemId, onItemUpdated, onItemCreated, onClose, allOptionsLoaded, mapServerErrors]); // Added allOptionsLoaded

    // --- Render ---
    // Determine overall loading state for disabling submit button etc.
    const isOverallDisabled = isSubmitting || !allOptionsLoaded || (isEditMode && isLoading);

    // Show full screen spinner only when loading initial MARCHE data in edit mode
    if (isLoading && isEditMode) {
        return <div className="text-center p-5"><Spinner animation="border" variant="primary"/> Chargement des données du marché...</div>;
    }
     // Show spinner if options are loading (especially relevant in create mode)
     if (!allOptionsLoaded && !isEditMode) {
         return <div className="text-center p-5"><Spinner animation="border" variant="secondary" /> Chargement des options...</div>;
     }

     // --- Main Form Render ---
     // Use original CSS class names
     return (
        <Form onSubmit={handleSubmit} noValidate className='px-5 py-5' style={{ maxHeight: 'calc(90vh - 100px)', overflowY: 'auto', }}>
            {/* Keep original Error Alerts */}
            {error && !Object.keys(validationErrors).length && <Alert variant="danger" className="mt-3">{error}</Alert>}
            {Object.keys(validationErrors).length > 0 && <Alert variant="warning" className="mt-3 small py-2">Veuillez corriger les erreurs indiquées ci-dessous.</Alert>}

            {/* Header - Keep original */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0">
                 <div>
                     <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditMode ? 'Modifier le' : 'Créer un nouveau'}</h5>
                     <h2 className="mb-0 fw-bold">Marché Public {isEditMode ? `(${formData.numero_marche || '...'})` : ''}</h2>
                 </div>
                 {/* Keep original close button class */}
                 <Button variant="light" className={buttonCloseClass} onClick={onClose} size="sm" title="Retour">
                      <b>Revenir a la liste</b>
                 </Button>
             </div>

            {/* --- Marche Public Fields (Use original classes) --- */}
            <h5 className="mb-3 mt-2">Informations Générales</h5>
            <Row>
                <Form.Group as={Col} md={isEditMode ? "6" : "12"} className="mb-3">
                    <Form.Label htmlFor="numero_marche">Numéro Marché <span className="text-danger">*</span></Form.Label>
                    <Form.Control id="numero_marche" className={inputClass} type="text" name="numero_marche" value={formData.numero_marche || ''} onChange={handleChange} isInvalid={!!validationErrors.numero_marche} />
                    <Form.Control.Feedback type="invalid">{validationErrors.numero_marche?.[0]}</Form.Control.Feedback>
                </Form.Group>
                 {isEditMode && ( <Form.Group as={Col} md="6" className="mb-3"> <Form.Label htmlFor="statut_select">Statut</Form.Label> <Select id="statut_select" name="statut" options={STATUT_OPTIONS} value={formData.statut} onChange={handleReactSelectChange} styles={selectStyles} placeholder="Sélectionner statut..." className={validationErrors.statut ? 'is-invalid' : ''}/> {validationErrors.statut && <div className="invalid-feedback d-block ps-2 small mt-1">{validationErrors.statut[0]}</div>} </Form.Group> )}
            </Row>
             <Form.Group className="mb-3"> <Form.Label htmlFor="intitule">Intitulé du Marché <span className="text-danger">*</span></Form.Label> <Form.Control id="intitule" className={textareaClass} as="textarea" rows={1} name="intitule" value={formData.intitule || ''} onChange={handleChange} isInvalid={!!validationErrors.intitule} placeholder="Objet spécifique..." /> <Form.Control.Feedback type="invalid">{validationErrors.intitule?.[0]}</Form.Control.Feedback> </Form.Group>
             <Form.Group className="mb-3"> <Form.Label htmlFor="convention_select">Convention Associée</Form.Label> <Select id="convention_select" name="convention_select" options={conventionOptions} value={selectedConventionOption} onChange={handleConventionSelectChange} isLoading={loadingOptions.conventions} isDisabled={loadingOptions.conventions} placeholder={loadingOptions.conventions ? "Chargement..." : "Sélectionner (Optionnel)..."} isClearable styles={selectStyles} className={validationErrors.id_convention ? 'is-invalid' : ''} menuPortalTarget={document.body}/> {validationErrors.id_convention && <div className="invalid-feedback d-block ps-2 small mt-1">{validationErrors.id_convention[0]}</div>} </Form.Group>

            {/* --- ADDED: Row for Fonctionnaire --- */}
             <Row className="mb-3 g-3">
                  <Form.Group as={Col} md={12} controlId="formFonctionnaire">
                     <Form.Label className="small mb-1 fw-medium">
                          <FontAwesomeIcon icon={faUsers} className="me-1" /> Fonctionnaire(s) Associé(s)
                     </Form.Label>
                     <Select
                         inputId="fonctionnaires" name="fonctionnaires"
                         options={fonctionnairesOptions}
                         value={formData.fonctionnaires}
                         onChange={handleFonctionnaireChange}
                         placeholder={loadingOptions.fonctionnaires ? "Chargement..." : "Sélectionner (Optionnel)..."}
                         isClearable closeMenuOnSelect={false}
                         isMulti
                         isLoading={loadingOptions.fonctionnaires}
                         isDisabled={loadingOptions.fonctionnaires}
                         styles={selectStyles} // Use the defined style object
                         className={validationErrors.id_fonctionnaire ? 'is-invalid' : ''}
                         menuPortalTarget={document.body}
                     />
                     {validationErrors.id_fonctionnaire &&
                        <div className="invalid-feedback d-block ps-2 small mt-1">{validationErrors.id_fonctionnaire}</div>
                     }
                  </Form.Group>
             </Row>
             {/* --- END ADDED ROW --- */}

             {/* Keep original rows for other fields */}
             <Row> <Form.Group as={Col} md="4" className="mb-3"> <Form.Label htmlFor="type_marche_select">Type <span className="text-danger">*</span></Form.Label> <Select id="type_marche_select" name="type_marche" options={TYPE_OPTIONS} value={formData.type_marche} onChange={handleReactSelectChange} styles={selectStyles} placeholder="Sélectionner..." className={validationErrors.type_marche ? 'is-invalid' : ''}/> {validationErrors.type_marche && <div className="invalid-feedback d-block ps-2 small mt-1">{validationErrors.type_marche?.[0]}</div>} </Form.Group> <Form.Group as={Col} md="4" className="mb-3"> <Form.Label htmlFor="procedure_passation">Procédure Passation <span className="text-danger">*</span></Form.Label> <Form.Control id="procedure_passation"required className={inputClass} type="text" name="procedure_passation" value={formData.procedure_passation || ''} onChange={handleChange} isInvalid={!!validationErrors.procedure_passation} /> <Form.Control.Feedback type="invalid">{validationErrors.procedure_passation?.[0]}</Form.Control.Feedback> </Form.Group> <Form.Group as={Col} md="4" className="mb-3"> <Form.Label htmlFor="mode_passation">Mode Passation <span className="text-danger">*</span></Form.Label> <Select id="mode_passation_select" name="mode_passation" options={MODE_PASSATION_OPTIONS} value={formData.mode_passation} onChange={handleReactSelectChange} styles={selectStyles} placeholder="Sélectionner..." required className={validationErrors.mode_passation ? 'is-invalid' : ''}/> {validationErrors.mode_passation && <div className="invalid-feedback d-block ps-2 small mt-1">{validationErrors.mode_passation?.[0]}</div>} </Form.Group> </Row>
             <Row className="mb-3"> <Form.Group as={Col} md="6" controlId="ref_appelOffre"> <Form.Label>Appel d'Offre Associé </Form.Label> <Select id="ref_appelOffre" name="ref_appelOffre" options={AoOptions} value={selectedAoOption} onChange={handleAoSelectChange} styles={selectStyles} isLoading={loadingOptions.aos} isDisabled={loadingOptions.aos} placeholder={loadingOptions.aos ? "Chargement..." : "Sélectionner (Optionnel)..."} isClearable noOptionsMessage={() => 'Aucun AO trouvé'} loadingMessage={() => 'Chargement...'} className={validationErrors.ref_appelOffre ? 'is-invalid' : ''} menuPortalTarget={document.body}/> {validationErrors.ref_appelOffre && <div className="invalid-feedback d-block ps-2 small mt-1">{validationErrors.ref_appelOffre[0]}</div>} </Form.Group> <Form.Group as={Col} md="6" controlId="date_ouverture_plis"> <Form.Label>Date Ouverture des Plis </Form.Label> <Form.Control className={inputClass} type="date" name="date_ouverture_plis" value={formData.date_ouverture_plis} onChange={handleChange} isInvalid={!!validationErrors.date_ouverture_plis} /> <Form.Control.Feedback type="invalid">{validationErrors.date_ouverture_plis}</Form.Control.Feedback> </Form.Group> </Row>
             <Row className="mb-3"> <Form.Group as={Col} md="6" controlId="date_fin_ouverture"> <Form.Label>Date Fin Session Ouverture </Form.Label> <Form.Control className={inputClass} type="date" name="date_fin_ouverture" value={formData.date_fin_ouverture} onChange={handleChange} isInvalid={!!validationErrors.date_fin_ouverture} /> <Form.Control.Feedback type="invalid">{validationErrors.date_fin_ouverture}</Form.Control.Feedback> </Form.Group> <Form.Group as={Col} md="6" controlId="date_engagement_tresorerie"> <Form.Label>Date Engagement Trésorerie </Form.Label> <Form.Control className={inputClass} type="date" name="date_engagement_tresorerie" value={formData.date_engagement_tresorerie} onChange={handleChange} isInvalid={!!validationErrors.date_engagement_tresorerie} /> <Form.Control.Feedback type="invalid">{validationErrors.date_engagement_tresorerie}</Form.Control.Feedback> </Form.Group> </Row>
             <Row className="mb-3"> <Form.Group as={Col} md="6" controlId="avancement_physique"> <Form.Label>Avancement Physique (%) </Form.Label> <Form.Control className={inputClass} type="number" name="avancement_physique" value={formData.avancement_physique} onChange={handleChange} isInvalid={!!validationErrors.avancement_physique} min="0" max="100" step="0.01" /> <Form.Control.Feedback type="invalid">{validationErrors.avancement_physique}</Form.Control.Feedback> </Form.Group> <Form.Group as={Col} md="6" controlId="avancement_financier"> <Form.Label>Avancement Financier (%) </Form.Label> <Form.Control className={inputClass} type="number" name="avancement_financier" value={formData.avancement_financier} onChange={handleChange} isInvalid={!!validationErrors.avancement_financier} min="0" max="100" step="0.01" /> <Form.Control.Feedback type="invalid">{validationErrors.avancement_financier}</Form.Control.Feedback> </Form.Group> </Row>
             <Row> <Form.Group as={Col} md="6" className="mb-3"> <Form.Label htmlFor="budget_previsionnel">Budget Prévisionnel (MAD)</Form.Label> <Form.Control id="budget_previsionnel" className={inputClass} type="number" step="0.01" name="budget_previsionnel" value={formData.budget_previsionnel || ''} onChange={handleChange} isInvalid={!!validationErrors.budget_previsionnel} placeholder="0.00" /> <Form.Control.Feedback type="invalid">{validationErrors.budget_previsionnel?.[0]}</Form.Control.Feedback> </Form.Group> <Form.Group as={Col} md="6" className="mb-3"> <Form.Label htmlFor="montant_attribue">Montant Attribué (MAD)</Form.Label> <Form.Control id="montant_attribue" className={inputClass} type="number" step="0.01" name="montant_attribue" value={formData.montant_attribue || ''} onChange={handleChange} isInvalid={!!validationErrors.montant_attribue} placeholder="0.00" /> <Form.Control.Feedback type="invalid">{validationErrors.montant_attribue?.[0]}</Form.Control.Feedback> </Form.Group> </Row>
             <Row> <Form.Group as={Col} md="6" className="mb-3"> <Form.Label htmlFor="source_financement">Source Financement</Form.Label> <Form.Control id="source_financement" className={inputClass} type="text" name="source_financement" value={formData.source_financement || ''} onChange={handleChange} isInvalid={!!validationErrors.source_financement} /> <Form.Control.Feedback type="invalid">{validationErrors.source_financement?.[0]}</Form.Control.Feedback> </Form.Group> <Form.Group as={Col} md="6" className="mb-3"> <Form.Label htmlFor="attributaire">Attributaire</Form.Label> <Form.Control id="attributaire" className={textareaClass} as="textarea" rows={1} name="attributaire" value={formData.attributaire || ''} onChange={handleChange} isInvalid={!!validationErrors.attributaire} placeholder="Nom(s)..."/> <Form.Control.Feedback type="invalid">{validationErrors.attributaire?.[0]}</Form.Control.Feedback> </Form.Group> </Row>
             <Row> <Form.Group as={Col} md="6" lg="3" className="mb-3"> <Form.Label htmlFor="date_publication">Date Publication</Form.Label> <Form.Control id="date_publication" className={inputClass} type="date" name="date_publication" value={formData.date_publication || ''} onChange={handleChange} isInvalid={!!validationErrors.date_publication} /> <Form.Control.Feedback type="invalid">{validationErrors.date_publication?.[0]}</Form.Control.Feedback> </Form.Group> <Form.Group as={Col} md="6" lg="3" className="mb-3"> <Form.Label htmlFor="date_limite_offres">Date Limite Offres</Form.Label> <Form.Control className={inputClass} id="date_limite_offres" type="date" name="date_limite_offres" value={formData.date_limite_offres || ''} onChange={handleChange} isInvalid={!!validationErrors.date_limite_offres} /> <Form.Control.Feedback type="invalid">{validationErrors.date_limite_offres?.[0]}</Form.Control.Feedback> </Form.Group> <Form.Group as={Col} md="6" lg="3" className="mb-3"> <Form.Label htmlFor="date_notification">Date Notification</Form.Label> <Form.Control className={inputClass} id="date_notification" type="date" name="date_notification" value={formData.date_notification || ''} onChange={handleChange} isInvalid={!!validationErrors.date_notification} /> <Form.Control.Feedback type="invalid">{validationErrors.date_notification?.[0]}</Form.Control.Feedback> </Form.Group> <Form.Group as={Col} md="6" lg="3" className="mb-3"> <Form.Label htmlFor="date_debut_execution" >Date Début Exécution</Form.Label> <Form.Control className={inputClass} id="date_debut_execution" type="date" name="date_debut_execution" value={formData.date_debut_execution || ''} onChange={handleChange} isInvalid={!!validationErrors.date_debut_execution} /> <Form.Control.Feedback type="invalid">{validationErrors.date_debut_execution?.[0]}</Form.Control.Feedback> </Form.Group> </Row>
             <Row> <Form.Group as={Col} md="6" className="mb-3"> <Form.Label htmlFor="duree_marche">Durée (jours)</Form.Label> <Form.Control className={inputClass} id="duree_marche" type="number" step="1" min="0" name="duree_marche" value={formData.duree_marche || ''} onChange={handleChange} isInvalid={!!validationErrors.duree_marche} placeholder="Nombre entier" /> <Form.Control.Feedback type="invalid">{validationErrors.duree_marche?.[0]}</Form.Control.Feedback> </Form.Group> {!isEditMode && ( <Form.Group as={Col} md="6" className="mb-3"> <Form.Label htmlFor="statut_create">Statut Initial</Form.Label> <Select id="statut_create" name="statut" options={STATUT_OPTIONS} value={formData.statut} onChange={handleReactSelectChange} styles={selectStyles} placeholder="Sélectionner statut..." className={validationErrors.statut ? 'is-invalid' : ''}/> {validationErrors.statut && <div className="invalid-feedback d-block ps-2 small mt-1">{validationErrors.statut[0]}</div>} </Form.Group> )} </Row>

            {/* --- Lots Section (Keep original) --- */}
             <h5 className="mt-4 mb-3">Lots</h5>
             {(formData.lots || []).map((lot, index) => ( <Card key={`lot-card-${index}-${lot.id || `new-${index}`}`} className="mb-3 lot-card border shadow-sm"> <Card.Body className='p-3'> <Row className="align-items-center mb-2"> <Col><Card.Title className="h6 mb-0">Lot {index + 1} {lot.id ? `(ID: ${lot.id})` : '(Nouveau)'}</Card.Title></Col> <Col xs="auto"> <Button variant="outline-danger" size="sm" onClick={() => removeLot(index)} title="Supprimer ce lot" className='py-0 px-1 border-1'> <FontAwesomeIcon icon={faTrashAlt} size="md"/> </Button> </Col> </Row> <Row> <Form.Group as={Col} md="6" className="mb-2"> <Form.Label htmlFor={`lot_${index}_numero`} className="small text-muted">Numéro Lot</Form.Label> <Form.Control className={inputClass} id={`lot_${index}_numero`} size="sm" type="text" name="numero_lot" value={lot.numero_lot || ''} onChange={(e) => handleLotChange(index, e)} isInvalid={!!validationErrors[`lots.${index}.numero_lot`]}/> <Form.Control.Feedback type="invalid">{validationErrors[`lots.${index}.numero_lot`]?.[0]}</Form.Control.Feedback> </Form.Group> <Form.Group as={Col} md="6" className="mb-2"> <Form.Label htmlFor={`lot_${index}_montant`} className="small text-muted">Montant Attribué (MAD)</Form.Label> <Form.Control className={inputClass} id={`lot_${index}_montant`} size="sm" type="number" step="0.01" name="montant_attribue" value={lot.montant_attribue || ''} onChange={(e) => handleLotChange(index, e)} isInvalid={!!validationErrors[`lots.${index}.montant_attribue`]} placeholder="0.00"/> <Form.Control.Feedback type="invalid">{validationErrors[`lots.${index}.montant_attribue`]?.[0]}</Form.Control.Feedback> </Form.Group> </Row> <Form.Group className="mb-2"> <Form.Label htmlFor={`lot_${index}_objet`} className="small text-muted">Objet Lot</Form.Label> <Form.Control className={textareaClass} id={`lot_${index}_objet`} size="sm" as="textarea" rows={1} name="objet" value={lot.objet || ''} onChange={(e) => handleLotChange(index, e)} isInvalid={!!validationErrors[`lots.${index}.objet`]} /> <Form.Control.Feedback type="invalid">{validationErrors[`lots.${index}.objet`]?.[0]}</Form.Control.Feedback> </Form.Group> <Form.Group className="mb-2"> <Form.Label htmlFor={`lot_${index}_attributaire`} className="small text-muted">Attributaire(s) Lot</Form.Label> <Form.Control className={inputClass} id={`lot_${index}_attributaire`} size="sm" type="text" name="attributaire" value={lot.attributaire || ''} onChange={(e) => handleLotChange(index, e)} isInvalid={!!validationErrors[`lots.${index}.attributaire`]} /> <Form.Control.Feedback type="invalid">{validationErrors[`lots.${index}.attributaire`]?.[0]}</Form.Control.Feedback> </Form.Group> <Form.Group className="mt-3"> <Form.Label className="small mb-1 text-muted"> <FontAwesomeIcon icon={faPaperclip} className="me-1"/> Fichiers Joints (Lot)</Form.Label> <Form.Control className={inputClass} id={`lot_${index}_fichiers_hidden_input`} type="file" multiple onChange={(e) => handleLotFileChange(index, e)} style={{ display: 'none' }} aria-hidden="true" isInvalid={!!validationErrors[`lot_files.${index}.*`]}/> <Button size="sm" className="d-inline-block ms-2 btn bg-light outline-primary text-primary rounded-5" onClick={() => document.getElementById(`lot_${index}_fichiers_hidden_input`)?.click()} > <FontAwesomeIcon icon={faPlus} className="me-1" /> Ajouter</Button> {validationErrors[`lot_files.${index}.*`] && ( <div className="d-block invalid-feedback small mt-1 ms-1">{validationErrors[`lot_files.${index}.*`]?.[0]}</div> )} {isEditMode && lot.existing_fichiers?.length > 0 && ( <Stack direction="horizontal" gap={1} className="mt-2 flex-wrap" style={{fontSize: '0.8em'}}><span className="me-2 small text-muted">Existants:</span> {(lot.existing_fichiers || []).map((file) => ( <Badge key={`existing-lot-${index}-file-${file.id}`} pill bg="info" text="dark" className="d-flex p-2 align-items-center fw-normal"><span className='me-1 text-truncate' style={{maxWidth: '120px'}} title={file.nom_fichier}>{file.nom_fichier}</span><Button variant="close" size="sm" aria-label="Supprimer existant" className="p-0 ms-1" style={{fontSize: '0.6em'}} onClick={() => removeExistingLotFile(index, file.id)} title="Marquer pour suppression"></Button></Badge> ))} </Stack> )} {lot.fichiers?.length > 0 && ( <Stack direction="horizontal" gap={1} className={`${(isEditMode && lot.existing_fichiers?.length > 0) ? 'mt-1' : 'mt-2'} flex-wrap`} style={{fontSize: '0.8em'}}><span className="me-2 small text-muted">Nouveaux:</span> {(lot.fichiers || []).map((file, fileIndex) => ( <Badge key={`new-lot-${index}-file-${file.name}-${fileIndex}-${Date.now()}`} pill bg="success" className="d-flex align-items-center fw-normal"><span className='me-1 p-2 text-truncate' style={{maxWidth: '120px'}} title={file.name}>{file.name}</span><Button variant="close" size="sm" aria-label="Retirer nouveau" className="btn-close-white p-0 ms-1" style={{fontSize: '1em', filter: 'invert(1) grayscale(100%) brightness(200%)'}} onClick={() => removeNewLotFile(index, fileIndex)}></Button></Badge> ))} </Stack> )} {!lot.fichiers?.length && !lot.existing_fichiers?.length && ( <div className="mt-2 small text-muted fst-italic">Aucun fichier.</div> )} </Form.Group> </Card.Body> </Card> ))}
             <Button variant="outline-success" size="sm" onClick={addLot} className="rounded-5 d-flex align-items-center mb-3"> <FontAwesomeIcon icon={faPlus} className="me-2" /> Ajouter un Lot </Button>

             {/* --- General Files Section (Keep original) --- */}
            <h5 className="mt-4 mb-3">Fichiers Généraux du Marché</h5>
            <Card className="mb-3 border shadow-sm"> <Card.Body className='p-3'> <Form.Group controlId="generalFileGroup"> <Form.Label className="small mb-1 text-muted"> <FontAwesomeIcon icon={faPaperclip} className="me-1"/> Joindre Fichiers Généraux </Form.Label> <Form.Control ref={generalFileInputRef} className={inputClass} id="general_fichiers_hidden_input" type="file" multiple onChange={handleGeneralFileChange} style={{ display: 'none' }} aria-hidden="true" isInvalid={!!validationErrors['general_files.*']} /> <Button variant="outline-info" size="sm" className="d-inline-block ms-2 rounded-5" onClick={() => generalFileInputRef.current?.click()} > <FontAwesomeIcon icon={faPlus} className="me-1" /> Ajouter</Button> {validationErrors['general_files.*'] && ( <div className="d-block invalid-feedback small mt-1 ms-1">{validationErrors['general_files.*'][0]}</div> )} {isEditMode && formData.general_existing_fichiers?.length > 0 && ( <Stack direction="horizontal" gap={1} className="mt-2 flex-wrap" style={{fontSize: '0.8em'}}> <span className="me-2 small text-muted">Existants:</span> {(formData.general_existing_fichiers || []).map((file) => ( <Badge key={`existing-general-file-${file.id}`} pill bg="info" text="dark" className="d-flex p-2 align-items-center fw-normal"> <span className='me-1 text-truncate' style={{maxWidth: '120px'}} title={file.nom_fichier}>{file.nom_fichier}</span><Button variant="close" size="sm" aria-label="Supprimer général existant" className="p-0 ms-1" style={{fontSize: '0.6em'}} onClick={() => removeExistingGeneralFile(file.id)} title="Marquer pour suppression"></Button> </Badge> ))} </Stack> )} {formData.general_fichiers?.length > 0 && ( <Stack direction="horizontal" gap={1} className={`${(isEditMode && formData.general_existing_fichiers?.length > 0) ? 'mt-2' : 'mt-2'} flex-wrap`} style={{fontSize: '0.8em'}}> <span className="me-2 small text-muted">Nouveaux:</span> {(formData.general_fichiers || []).map((file, fileIndex) => ( <Badge key={`new-general-file-${file.name}-${fileIndex}-${Date.now()}`} pill bg="success" className="d-flex align-items-center fw-normal"> <span className='me-1 text-truncate my-2 ' style={{maxWidth: '120px'}} title={file.name}>{file.name}</span><Button variant="close" size="sm" aria-label="Retirer nouveau général" className="btn-close-white p-0 ms-1" style={{fontSize: '1em', filter: 'invert(1) grayscale(100%) brightness(200%)'}} onClick={() => removeNewGeneralFile(fileIndex)}></Button> </Badge> ))} </Stack> )} {!formData.general_fichiers?.length && !formData.general_existing_fichiers?.length && ( <div className="mt-2 small text-muted fst-italic">Aucun fichier général joint.</div> )} </Form.Group> </Card.Body> </Card>

            {/* Submit/Cancel Buttons (Keep original) */}
            <div className="text-center mt-4 pt-3 border-top">
                 <Button variant="danger" onClick={onClose} className="me-2 rounded-5 px-5">Annuler</Button>
                 <Button variant="primary" type="submit" className="me-2 rounded-5 px-5" disabled={isOverallDisabled}> {/* Use combined disable state */}
                    {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2"/> : null}
                    {isSubmitting ? 'Enregistrement...' : (isEditMode ? 'Enregistrer Modifications' : 'Créer Marché')}
                </Button>
            </div>
        </Form>
    );
};

// --- PropTypes (Keep original) ---
MarchePublicForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string.isRequired,
};

// --- Default Props (Keep original) ---
MarchePublicForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {},
    onItemUpdated: () => {},
};

export default MarchePublicForm;