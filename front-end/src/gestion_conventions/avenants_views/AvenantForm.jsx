// AvenantForm.jsx (Merged - Adjusted 'required' behavior to match Code 2 pattern)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    // Combined Icons
    faSpinner, faExclamationTriangle, faTimes, faTrashAlt, faUndo,
    faFilePdf, faFileWord, faFileExcel, faFileImage, faFileAlt,
    faPlusCircle, faExternalLinkAlt, faPaperclip, faPlus, // Added faPaperclip, faPlus
    faUsers // Added for Fonctionnaire
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import {
    Form, Button, Row, Col, Card, Alert, Spinner,
    InputGroup, FormCheck, ListGroup, Badge, Stack
} from 'react-bootstrap';
import PropTypes from 'prop-types';

// Styles for react-select
const selectStyles = {
    control: (provided, state) => ({
        ...provided,
        width: '100%',
        maxWidth: '100%',
        backgroundColor: '#f8f9fa',
        borderRadius: '1.5rem',
        border: state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da',
        boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
        minHeight: '38px',
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: '0.25rem 0.8rem',
        flexWrap: 'wrap',
        maxWidth: '100%',
        overflow: 'hidden',
    }),
    input: (provided) => ({
        ...provided,
        margin: '0px',
        padding: '0px',
    }),
    indicatorSeparator: () => ({
        display: 'none',
    }),
    indicatorsContainer: (provided) => ({
        ...provided,
        padding: '1px',
    }),
    placeholder: (provided) => ({
        ...provided,
        color: '#6c757d',
    }),
    menu: (provided) => ({
        ...provided,
        borderRadius: '0.5rem',
        boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
        zIndex: 1050
    }),
    menuPortal: base => ({
        ...base,
        zIndex: 9999
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null,
        color: state.isSelected ? 'white' : 'black',
    }),
    multiValue: (provided) => ({
        ...provided,
        backgroundColor: '#e9ecef',
        borderRadius: '0.5rem',
        margin: '2px',
    }),
    multiValueLabel: (provided) => ({
        ...provided,
        color: '#495057',
        padding: '2px 5px',
    }),
    multiValueRemove: (provided) => ({
        ...provided,
        color: '#6c757d',
        ':hover': {
            backgroundColor: '#dc3545',
            color: 'white',
        },
    }),
};

// Helper to parse currency input back to number
const parseCurrency = (value) => {
    if (typeof value !== 'string') return Number(value) || null;
    const cleaned = value.replace(/[\s\u00A0]/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.');
    const number = parseFloat(cleaned);
    return isNaN(number) ? null : number;
};

// Helper to get file icon based on mime type or filename
const getFileIcon = (filenameOrMimeType) => {
    // ... (getFileIcon implementation remains the same)
    if (!filenameOrMimeType) return faFileAlt;
    const lowerCase = String(filenameOrMimeType).toLowerCase();
    if (lowerCase.includes('pdf')) return faFilePdf;
    if (lowerCase.includes('doc') || lowerCase.includes('word')) return faFileWord;
    if (lowerCase.includes('xls') || lowerCase.includes('excel')) return faFileExcel;
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage;
    return faFileAlt;
};

// Avenant Specific Options
const TYPE_MODIFICATION_OPTIONS = [
    { value: 'montant', label: 'Modification Montant' },
    { value: 'durée', label: 'Modification Durée' },
    { value: 'partenaire', label: 'Modification Partenaire(s)' },
    { value: 'autre', label: 'Autre Modification' },
];

// --- Component ---
const AvenantForm = ({
    itemId = null,
    onClose,
    onItemCreated,
    onItemUpdated,
    initialConventionId = null,
    conventionCode = '',
    baseApiUrl = 'http://localhost:8000/api'
}) => {
    // --- State ---
    const initialFormData = useMemo(() => ({
        convention_id: initialConventionId || '',
        numero_avenant: '',
        date_signature: '',
        objet: '', // Still present in state
        type_modification: null,
        montant_modifie: '',
        nouvelle_date_fin: '',
        remarques: '',
        fonctionnaires: [],
    }), [initialConventionId]);

    const [formData, setFormData] = useState(initialFormData);
    const [conventionOptions, setConventionOptions] = useState([]);
    const [partenaireOptions, setPartenaireOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
    const [avenantPartnerDetails, setAvenantPartnerDetails] = useState([]);
    const [typeModificationOptions] = useState(TYPE_MODIFICATION_OPTIONS);
    const [fichiers, setFichiers] = useState([]);
    const [existingFichiers, setExistingFichiers] = useState([]);
    const [fichiersToDelete, setFichiersToDelete] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState({ conventions: true, partenaires: true, fonctionnaires: true });
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(!!itemId);
    const isEditing = useMemo(() => itemId !== null, [itemId]);
    const optionsFinishedLoading = useMemo(() => !loadingOptions.conventions && !loadingOptions.partenaires && !loadingOptions.fonctionnaires, [loadingOptions]);
    const storageBaseUrl = useMemo(() => baseApiUrl.replace('/api', ''), [baseApiUrl]);

    // --- Fetch Options ---
    const fetchOptions = useCallback(async () => {
        // ... (fetchOptions implementation remains the same)
        console.log("AvenantForm: Fetching options...");
        setLoadingOptions({ conventions: true, partenaires: true, fonctionnaires: true });
        try {
            const [convRes, partRes, foncRes] = await Promise.all([
                axios.get(`${baseApiUrl}/conventions`, { params: { light: true }, withCredentials: true }),
                axios.get(`${baseApiUrl}/partenaires`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/fonctionnaires`, { withCredentials: true })
            ]);
            const conventions = Array.isArray(convRes.data?.conventions) ? convRes.data.conventions : [];
            const mappedConvOptions = conventions.filter(c => c?.id !== undefined && c?.Code !== undefined && c?.Intitule !== undefined).map(c => ({ value: c.id, label: `${c.Code} - ${c.Intitule}` })).sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' }));
            setConventionOptions(mappedConvOptions);
            const partenaires = Array.isArray(partRes.data?.partenaires) ? partRes.data.partenaires : [];
            const mappedPartOptions = partenaires.filter(p => p?.Id !== undefined).map(p => ({ value: p.Id, label: p.Description_Arr || p.Description || `Partenaire ID ${p.Id}` })).sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' }));
            setPartenaireOptions(mappedPartOptions);
            const foncData = foncRes.data.fonctionnaires || foncRes.data || [];
            const mappedFoncOptions = foncData.map(f => ({ value: f.id, label: f.nom_complet || `Fonctionnaire ID ${f.id}` })).sort((a, b) => a.label.localeCompare(b.label));
            setFonctionnairesOptions(mappedFoncOptions);
        } catch (err) {
            console.error("AvenantForm: Erreur chargement options:", err);
            setSubmissionStatus(prev => ({ ...prev, error: "Erreur chargement des listes." }));
            setConventionOptions([]); setPartenaireOptions([]); setFonctionnairesOptions([]);
        } finally {
            setLoadingOptions({ conventions: false, partenaires: false, fonctionnaires: false });
            console.log("AvenantForm: Finished fetching options.");
        }
    }, [baseApiUrl]);

    useEffect(() => { fetchOptions(); }, [fetchOptions]);

    // --- EFFECT 1: Fetch Avenant Data for Editing ---
    useEffect(() => {
        // ... (fetchAvenantData implementation remains the same)
        if (!isEditing || !itemId || !optionsFinishedLoading) { setLoadingData(false); return; }
        let isMounted = true;
        const fetchAvenantData = async () => {
            console.log(`[Avenant Form] Fetching edit data ID: ${itemId}`);
            setLoadingData(true);
            setSubmissionStatus({ loading: false, error: null, success: false });
            setFormErrors({});
            setExistingFichiers([]); setFichiers([]); setFichiersToDelete([]);
            setAvenantPartnerDetails([]);
            setFormData(prev => ({ ...prev, fonctionnaires: [] }));
            try {
                const response = await axios.get(`${baseApiUrl}/avenants/${itemId}`, { params: { include: 'convention,documents,partnerCommitments.partenaire' }, withCredentials: true });
                const data = response.data.avenant || response.data;
                if (!isMounted || !data) { if(isMounted) throw new Error("Avenant non trouvé ou données invalides."); return; }
                console.log("[Avenant Form Load] Raw Data Received:", data);
                const findOption = (options, valueToFind, valueKey = 'value') => { if (valueToFind === null || valueToFind === undefined || !options || options.length === 0) return null; const valueStr = String(valueToFind).toLowerCase(); return options.find(opt => String(opt[valueKey]).toLowerCase() === valueStr) || null; };
                const findMultiOptions = (options, valuesString) => { if (!valuesString || typeof valuesString !== 'string' || !options?.length) return []; const selectedValues = valuesString.split(';').map(v => String(v).trim().toLowerCase()).filter(v => v); return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase())); };
                const selectedTypeOption = findOption(typeModificationOptions, data.type_modification);
                const fonctionnaireIdString = data.id_fonctionnaire;
                const selectedFonctionnaireOptions = findMultiOptions(fonctionnairesOptions, fonctionnaireIdString);
                setFormData({
                    convention_id: data.convention_id || '',
                    numero_avenant: data.numero_avenant || '',
                    date_signature: data.date_signature || '',
                    objet: data.objet || '', // Still load objet data
                    type_modification: selectedTypeOption,
                    montant_modifie: data.montant_modifie != null ? String(data.montant_modifie) : '',
                    nouvelle_date_fin: data.nouvelle_date_fin || '',
                    remarques: data.remarques || '',
                    fonctionnaires: selectedFonctionnaireOptions,
                });
                const fetchedFiles = Array.isArray(data.documents) ? data.documents : [];
                setExistingFichiers(fetchedFiles.map(f => ({ id: f.Id_Doc, file_name: f.file_name, fichier_url: f.fichier_url })));
                const fetchedCommitments = data.partner_commitments || [];
                if (Array.isArray(fetchedCommitments) && selectedTypeOption?.value === 'partenaire') {
                    const initialPartnerDetails = fetchedCommitments.map((commit) => {
                        const partnerOption = partenaireOptions.find(opt => opt.value === commit.Id_Partenaire);
                        if (!partnerOption) { console.warn(`Partner option not found for ID ${commit.Id_Partenaire} during load.`); }
                        return { id: commit.Id_Partenaire, label: partnerOption?.label || `Partenaire ID ${commit.Id_Partenaire}`, montant: String(commit.Montant_Convenu ?? ''), is_signatory: !!commit.is_signatory, date_signature: commit.date_signature || '', details_signature: commit.details_signature || '' };
                    }).filter(p => p && p.id);
                    setAvenantPartnerDetails(initialPartnerDetails);
                } else { setAvenantPartnerDetails([]); }
                setFichiers([]); setFichiersToDelete([]);
            } catch (err) {
                console.error("Erreur chargement données avenant:", err.response?.data || err.message || err);
                if (isMounted) setSubmissionStatus({ loading: false, error: err.response?.data?.message || err.message || "Erreur chargement données.", success: false });
            } finally { if (isMounted) setLoadingData(false); }
        };
        fetchAvenantData();
        return () => { isMounted = false; };
    }, [itemId, isEditing, baseApiUrl, optionsFinishedLoading, partenaireOptions, fonctionnairesOptions, typeModificationOptions]);

    // --- EFFECT 2: Reset Form ---
    useEffect(() => {
        // ... (Reset logic remains the same)
        if (!isEditing && optionsFinishedLoading) {
            setFormData(initialFormData);
            setFichiers([]);
            setExistingFichiers([]);
            setFichiersToDelete([]);
            setAvenantPartnerDetails([]);
            setFormErrors({});
            setSubmissionStatus({ loading: false, error: null, success: false });
            setLoadingData(false);
        }
    }, [isEditing, optionsFinishedLoading, initialFormData]);

    // --- Frontend Validation (MODIFIED) ---
    const validateForm = useCallback(() => {
        const errors = {};
        // --- Required field checks (matching Code 2 pattern) ---
        if (!formData.convention_id) errors.convention_id = "Convention requise.";
        if (!formData.numero_avenant?.trim()) errors.numero_avenant = "Numéro avenant requis.";
        if (!formData.date_signature) errors.date_signature = "Date signature requise.";
        // REMOVED: objet is NOT required
        // if (!formData.objet?.trim()) errors.objet = "Objet requis.";
        if (!formData.type_modification) errors.type_modification = "Type modification requis.";

        // --- Conditional Validation ---
        const typeValue = formData.type_modification?.value;
        if (typeValue === 'montant') {
             const montant = parseCurrency(formData.montant_modifie);
             if (montant === null || isNaN(montant) || montant < 0) errors.montant_modifie = "Montant modifié valide est requis.";
        }
        if (typeValue === 'durée') {
             if (!formData.nouvelle_date_fin) errors.nouvelle_date_fin = "Nouvelle date fin requise.";
        }
        if (typeValue === 'partenaire') {
            if (!avenantPartnerDetails || avenantPartnerDetails.length === 0) errors.partenaires = "Au moins un partenaire requis.";
            else {
                avenantPartnerDetails.forEach((p) => {
                    if (p.montant !== '' && p.montant !== null && p.montant !== undefined) {
                       const amount = parseCurrency(String(p.montant));
                       if (amount === null || isNaN(amount) || amount < 0) errors[`montant_${p.id}`] = `Montant invalide pour ${p.label}.`;
                    }
                    if (p.is_signatory && !p.date_signature) errors[`date_sig_${p.id}`] = `Date signature requise pour ${p.label}.`;
                });
            }
        }

        // --- Fonctionnaire validation REMOVED ---
        // if (!formData.fonctionnaires || formData.fonctionnaires.length === 0) {
        //    errors.id_fonctionnaire = "Au moins un fonctionnaire doit être sélectionné.";
        // }

        // --- File validation (kept commented out) ---
        // const remainingFilesCount = existingFichiers.length - fichiersToDelete.length + fichiers.length;
        // if (remainingFilesCount === 0) {
        //     errors.fichiers = "Au moins un fichier doit être associé à l'avenant.";
        // }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    }, [formData, avenantPartnerDetails]); // Removed file/fonctionnaire dependencies

    // --- Handlers ---
    const handleChange = useCallback((e) => {
        // ... (handleChange implementation remains the same)
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => { const next = {...prev}; delete next[name]; return next; });
    }, [formErrors]);

    const handleSelectChange = useCallback((selectedOption, actionMeta) => {
        // ... (handleSelectChange implementation remains the same)
        const { name } = actionMeta;
        if (name === 'convention_id') {
            const conventionIdValue = selectedOption ? selectedOption.value : '';
            setFormData(prev => ({ ...prev, convention_id: conventionIdValue }));
            if (formErrors.convention_id) setFormErrors(prev => ({ ...prev, convention_id: undefined }));
        } else if (name === 'type_modification') {
            const typeValue = selectedOption;
            setFormData(prev => ({ ...prev, type_modification: typeValue }));
            const selectedTypeValue = selectedOption?.value;
            setFormData(prevData => ({
                ...prevData,
                montant_modifie: selectedTypeValue === 'montant' ? prevData.montant_modifie : '',
                nouvelle_date_fin: selectedTypeValue === 'durée' ? prevData.nouvelle_date_fin : '',
            }));
            if (selectedTypeValue !== 'partenaire') { setAvenantPartnerDetails([]); }
            setFormErrors(prev => {
                const nextErrors = { ...prev };
                delete nextErrors.type_modification;
                if (selectedTypeValue !== 'montant') delete nextErrors.montant_modifie;
                if (selectedTypeValue !== 'durée') delete nextErrors.nouvelle_date_fin;
                if (selectedTypeValue !== 'partenaire') {
                    delete nextErrors.partenaires;
                    Object.keys(nextErrors).forEach(key => { if (key.startsWith('montant_') || key.startsWith('date_sig_')) delete nextErrors[key]; });
                }
                return nextErrors;
            });
        }
     }, [formErrors.convention_id]);

    const handleFonctionnaireChange = useCallback((selectedOptions) => {
        // ... (handleFonctionnaireChange implementation remains the same)
        setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] }));
        // No need to clear error as it's not validated anymore
        // if (formErrors.id_fonctionnaire) {
        //     setFormErrors(prev => ({ ...prev, id_fonctionnaire: undefined }));
        // }
    }, []); // Removed formErrors dependency

    const handleAvenantPartnerSelectionChange = useCallback((selectedOptions) => {
        // ... (handleAvenantPartnerSelectionChange implementation remains the same)
        const newSelectedPartners = selectedOptions || [];
        setAvenantPartnerDetails(prevDetails => {
            const prevMap = new Map(prevDetails.map(p => [p.id, p]));
            return newSelectedPartners.map(option => ({ id: option.value, label: option.label, montant: prevMap.get(option.value)?.montant ?? '', is_signatory: prevMap.get(option.value)?.is_signatory ?? false, date_signature: prevMap.get(option.value)?.date_signature ?? '', details_signature: prevMap.get(option.value)?.details_signature ?? '', }));
        });
        if (formErrors.partenaires && newSelectedPartners.length > 0) setFormErrors(prev => ({ ...prev, partenaires: undefined }));
    }, [formErrors.partenaires]);

    const handleAvenantCommitmentChange = useCallback((partnerId, value) => {
        // ... (handleAvenantCommitmentChange implementation remains the same)
        setAvenantPartnerDetails(prev => prev.map(p => (p.id === partnerId ? { ...p, montant: value } : p)));
        const key = `montant_${partnerId}`; if (formErrors[key]) setFormErrors(prev => { const next = {...prev}; delete next[key]; return next; });
    }, [formErrors]);

    const handleAvenantSignatoryChange = useCallback((partnerId, isChecked) => {
        // ... (handleAvenantSignatoryChange implementation remains the same)
        setAvenantPartnerDetails(prev => prev.map(p => (p.id === partnerId ? { ...p, is_signatory: isChecked, date_signature: isChecked ? p.date_signature : '', details_signature: isChecked ? p.details_signature : '' } : p)));
        const key = `date_sig_${partnerId}`; if (!isChecked && formErrors[key]) setFormErrors(prev => { const next = {...prev}; delete next[key]; return next; });
    }, [formErrors]);

    const handleAvenantSignatureDateChange = useCallback((partnerId, value) => {
        // ... (handleAvenantSignatureDateChange implementation remains the same)
        setAvenantPartnerDetails(prev => prev.map(p => (p.id === partnerId ? { ...p, date_signature: value } : p)));
        const key = `date_sig_${partnerId}`; if (formErrors[key]) setFormErrors(prev => { const next = {...prev}; delete next[key]; return next; });
    }, [formErrors]);

    const handleAvenantSignatureDetailsChange = useCallback((partnerId, value) => {
        // ... (handleAvenantSignatureDetailsChange implementation remains the same)
        setAvenantPartnerDetails(prev => prev.map(p => (p.id === partnerId ? { ...p, details_signature: value } : p)));
     }, []);

    const handleFileChange = useCallback((e) => {
        // ... (handleFileChange implementation remains the same)
        const filesToAdd = Array.from(e.target.files ?? []); if (!filesToAdd.length) return;
        setFichiers(prev => { const names = new Set(prev.map(f => f.name)); return [...prev, ...filesToAdd.filter(f => !names.has(f.name))]; });
        e.target.value = null;
        if (formErrors.fichiers || formErrors['fichiers.*']) setFormErrors(prev => ({ ...prev, 'fichiers': undefined, 'fichiers.*': undefined }));
     }, [formErrors.fichiers, formErrors['fichiers.*']]);

    const removeNewFile = useCallback((fileIndex) => { setFichiers(prev => prev.filter((_, idx) => idx !== fileIndex)); }, []);
    const removeExistingFile = useCallback((fileId) => { setFichiersToDelete(prev => [...new Set([...prev, fileId])]); }, []);

    // --- Submit Handler ---
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!formData.convention_id) {
            setSubmissionStatus({ loading: false, error: "La sélection d'une convention parente est requise.", success: false });
            document.getElementById('formConvention_id')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        if (!validateForm()) { // Uses the MODIFIED validateForm
             setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs indiquées.", success: false });
             const firstErrorKey = Object.keys(formErrors)[0];
             let errorElementId = firstErrorKey ? `form${firstErrorKey.charAt(0).toUpperCase() + firstErrorKey.slice(1)}` : null;
             if (firstErrorKey?.startsWith('montant_') || firstErrorKey?.startsWith('date_sig_')) { errorElementId = `formAvenantDetail_${firstErrorKey.split('_').pop()}`; }
             else if (firstErrorKey === 'partenaires') { errorElementId = 'formPartenaireSelectConditional'; }
             else if (firstErrorKey === 'fichiers') { errorElementId = 'avenantFileGroup'; }
             // No need to scroll to fonctionnaire error as it's removed
             const elementToScroll = errorElementId ? document.getElementById(errorElementId) : document.querySelector('.is-invalid');
             elementToScroll?.scrollIntoView({ behavior: 'smooth', block: 'center' });
             console.log("Submit Validation failed, scrolling to:", errorElementId || '.is-invalid');
             return;
        }

        setSubmissionStatus({ loading: true, error: null, success: false });
        const dataToSubmit = new FormData();

        // --- Appending data (remains mostly the same, fonctionnaire is still appended but not required by frontend validation) ---
        dataToSubmit.append('convention_id', formData.convention_id);
        dataToSubmit.append('numero_avenant', formData.numero_avenant);
        dataToSubmit.append('date_signature', formData.date_signature);
        dataToSubmit.append('objet', formData.objet); // Still send objet
        dataToSubmit.append('type_modification', formData.type_modification?.value || '');
        if (formData.type_modification?.value === 'montant') { dataToSubmit.append('montant_modifie', parseCurrency(formData.montant_modifie) ?? ''); }
        if (formData.type_modification?.value === 'durée') { dataToSubmit.append('nouvelle_date_fin', formData.nouvelle_date_fin || ''); }
        dataToSubmit.append('remarques', formData.remarques || '');
        const fonctionnaireIds = formData.fonctionnaires.map(f => f.value).join(';');
        dataToSubmit.append('id_fonctionnaire', fonctionnaireIds); // Still send fonctionnaire IDs
        fichiers.forEach((file, index) => dataToSubmit.append(`fichiers[${index}]`, file, file.name));
        if (isEditing && fichiersToDelete.length > 0) { fichiersToDelete.forEach((id) => dataToSubmit.append(`fichiers_to_delete[]`, id)); }
        if (formData.type_modification?.value === 'partenaire') {
            const partnerData = avenantPartnerDetails.map(p => ({ id: p.id, montant: parseCurrency(String(p.montant)) ?? null, is_signatory: p.is_signatory, date_signature: p.is_signatory && p.date_signature ? p.date_signature : null, details_signature: p.is_signatory && p.details_signature ? p.details_signature : null, }));
            dataToSubmit.append('avenant_partner_commitments', JSON.stringify(partnerData));
        }
        if (isEditing) { dataToSubmit.append('_method', 'PUT'); }

        console.log("[Avenant Form] Submitting FormData...");

        // --- API Call ---
        const url = isEditing ? `${baseApiUrl}/avenants/${itemId}` : `${baseApiUrl}/avenants`;
        const config = { headers: { 'Content-Type': 'multipart/form-data', 'Accept': 'application/json' }, withCredentials: true };

        try {
            const response = await axios.post(url, dataToSubmit, config);
            setSubmissionStatus({ loading: false, error: null, success: true });
            if (isEditing && onItemUpdated) onItemUpdated(response.data.avenant);
            else if (!isEditing && onItemCreated) onItemCreated(response.data.avenant);
            setTimeout(onClose, 1500);
        } catch (err) {
             console.error(`Erreur soumission avenant:`, err.response || err);
             const errorMsg = err.response?.data?.message || err.message || "Erreur serveur.";
             let serverErrors = err.response?.data?.errors || {};
             const mappedErrors = {};
             if (err.response?.status === 422 && typeof serverErrors === 'object') {
                 // --- Mapping backend errors (remains the same, still maps id_fonctionnaire if backend sends it) ---
                 for (const key in serverErrors) {
                     if (key.startsWith('fichiers.')) mappedErrors['fichiers'] = (mappedErrors['fichiers'] || '') + serverErrors[key].join(' ');
                     else if (key === 'fichiers_to_delete' || key.startsWith('fichiers_to_delete.')) mappedErrors['fichiers_delete'] = (mappedErrors['fichiers_delete'] || '') + serverErrors[key].join(' ');
                     else if (key.startsWith('avenant_partner_commitments.')) {
                        const match = key.match(/\.(\d+)\.?(.*)?/);
                        const errMessage = serverErrors[key].join(' ');
                        if (match && avenantPartnerDetails[match[1]]) {
                            const partnerId = avenantPartnerDetails[match[1]].id;
                            const fieldName = match[2];
                            if (fieldName === 'montant' || errMessage.toLowerCase().includes('montant')) mappedErrors[`montant_${partnerId}`] = errMessage;
                            else if (fieldName === 'date_signature' || errMessage.toLowerCase().includes('date signature') || errMessage.toLowerCase().includes('date_signature')) mappedErrors[`date_sig_${partnerId}`] = errMessage;
                            else mappedErrors['partenaires'] = (mappedErrors['partenaires'] || '') + `Erreur Part. ${match[1]+1}: ${errMessage} `;
                        } else { mappedErrors['partenaires'] = (mappedErrors['partenaires'] || '') + errMessage + ' '; }
                     }
                     else if (key === 'id_fonctionnaire') mappedErrors['id_fonctionnaire'] = serverErrors[key].join(' '); // Still map if backend requires it
                     else {
                         const formKey = key === 'type_modification' ? 'type_modification' : (Object.keys(formData).find(fk => fk.toLowerCase() === key.toLowerCase()) || key);
                         mappedErrors[formKey] = serverErrors[key].join(' ');
                     }
                 }
                 setFormErrors(mappedErrors);
             } else { setFormErrors({}); }
             setSubmissionStatus({ loading: false, error: errorMsg, success: false });
         }
    }, [isEditing, itemId, baseApiUrl, formData, fichiers, fichiersToDelete, avenantPartnerDetails, validateForm, onClose, onItemCreated, onItemUpdated]);

    const isSubmitDisabled = submissionStatus.loading || loadingData || !optionsFinishedLoading;

    // --- Render Logic ---
    if (loadingData || !optionsFinishedLoading) {
         return ( <div className="d-flex justify-content-center align-items-center p-5" style={{minHeight: '400px'}}> <Spinner animation="border" variant="primary" /> <span className='ms-3 text-muted'>Chargement du formulaire...</span> </div> );
    }
    const visibleExistingFichiers = existingFichiers.filter(f => !fichiersToDelete.includes(f.id));

    // --- Main Form Render (with MODIFIED * indicators) ---
    return (
        <div className="p-3 p-md-4 avenant-form-container bg-white" style={{ borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto'}}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <div>
                     <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier' : 'Ajouter un nouveau'}</h5>
                     <h2 className="mb-0 fw-bold">Avenant{conventionCode ? ` à la Convention ${conventionCode}` : ''}</h2>
                </div>
                <Button variant="warning" className='btn rounded-5 fw-bold px-5 py-2 shadow-sm border' onClick={onClose} size="sm" title="Retour">Revenir à la liste</Button>
            </div>

            {/* Form Content */}
            <div className="flex-grow-1">
                 {submissionStatus.error && !submissionStatus.loading && ( <Alert variant="danger" className="mb-3 py-2 d-flex align-items-center"> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error} </Alert> )}
                 {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2">Avenant {isEditing ? 'modifié' : 'ajouté'} avec succès !</Alert> )}

                <Form noValidate onSubmit={handleSubmit} className='px-md-3'>
                    {/* Convention Select */}
                    <Form.Group as={Row} className="mb-3 align-items-center" controlId="formConvention_id">
                        <Form.Label column sm={3} className="small fw-medium text-sm-end">Convention <span className="text-danger">*</span></Form.Label> {/* Kept * */}
                        <Col sm={9}>
                            <Select inputId='convention-select-input' name="convention_id" options={conventionOptions} value={conventionOptions.find(opt => opt.value === formData.convention_id) || null} onChange={handleSelectChange} styles={selectStyles} placeholder="- Sélectionner Convention Parente -" isClearable={false} isDisabled={loadingOptions.conventions || isEditing} isLoading={loadingOptions.conventions} className={formErrors.convention_id ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body} menuPlacement="auto" />
                            {formErrors.convention_id && <div className="invalid-feedback d-block ps-1 small">{formErrors.convention_id}</div>}
                        </Col>
                    </Form.Group>

                    {/* Row for Numero, Date, Type */}
                    <Row className="g-3 mb-3">
                         <Form.Group as={Col} md={4} controlId="formNumero_avenant">
                            <Form.Label className="small mb-1 fw-medium">N° Avenant <span className="text-danger">*</span></Form.Label> {/* Kept * */}
                            <Form.Control className="p-2 rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.numero_avenant} type="text" name="numero_avenant" value={formData.numero_avenant} onChange={handleChange} size="sm" placeholder="Ex: Avenant N°1"/>
                            <Form.Control.Feedback type="invalid">{formErrors.numero_avenant}</Form.Control.Feedback>
                         </Form.Group>
                         <Form.Group as={Col} md={4} controlId="formDate_signature">
                            <Form.Label className="small mb-1 fw-medium">Date Signature<span className="text-danger">*</span></Form.Label> {/* Kept * */}
                            <Form.Control className="p-2 rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.date_signature} type="date" name="date_signature" value={formData.date_signature} onChange={handleChange} size="sm"/>
                            <Form.Control.Feedback type="invalid">{formErrors.date_signature}</Form.Control.Feedback>
                         </Form.Group>
                         <Form.Group as={Col} md={4} controlId="formType_modification">
                              <Form.Label className="small mb-1 fw-medium">Type Modification <span className="text-danger">*</span></Form.Label> {/* Kept * */}
                              <Select inputId='type-modif-select-input' name="type_modification" options={typeModificationOptions} value={formData.type_modification} onChange={handleSelectChange} styles={selectStyles} placeholder="- Sélectionner Type -" isClearable className={formErrors.type_modification ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body} menuPlacement="auto"/>
                              {formErrors.type_modification && <div className="invalid-feedback d-block ps-1 small">{formErrors.type_modification}</div>}
                         </Form.Group>
                     </Row>

                    {/* Objet */}
                     <Form.Group className="mb-3" controlId="formObjet">
                         <Form.Label className="small mb-1 fw-medium">Objet</Form.Label> {/* REMOVED * */}
                         <Form.Control className="p-3 rounded-5 shadow-sm bg-white border-1" isInvalid={!!formErrors.objet} as="textarea" rows={2} name="objet" value={formData.objet} onChange={handleChange} size="sm" placeholder="Description modifications..."/>
                         <Form.Control.Feedback type="invalid">{formErrors.objet}</Form.Control.Feedback>
                     </Form.Group>

                    {/* Fonctionnaire Select */}
                    <Form.Group as={Row} className="mb-3 align-items-center" controlId="formId_Fonctionnaire">
                        <Form.Label column sm={3} className="small fw-medium text-sm-end">
                            <FontAwesomeIcon icon={faUsers} className="me-1 text-secondary"/> Points Focaux
                        </Form.Label> {/* REMOVED * */}
                        <Col sm={9}>
                            <Select inputId='avenant-fonctionnaire-select' name="fonctionnaires" menuPlacement="auto" options={fonctionnairesOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder="- Sélectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.fonctionnaires} className={formErrors.id_fonctionnaire ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body}/>
                            <Form.Control.Feedback type="invalid" style={{ display: formErrors.id_fonctionnaire ? 'block' : 'none'}}> {formErrors.id_fonctionnaire} </Form.Control.Feedback>
                        </Col>
                     </Form.Group>

                    {/* Conditional Fields (Montant / Date) */}
                    <Row className="g-3 mb-3">
                        {formData.type_modification?.value === 'montant' && (
                            <Form.Group as={Col} md={6} controlId="formMontant_modifie">
                               <Form.Label className="small mb-1 fw-medium">Nouveau Montant <span className="text-danger">*</span></Form.Label> {/* Kept * */}
                                <InputGroup size="sm">
                                     <Form.Control className="p-2 rounded-start-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.montant_modifie} type="number" step="0.01" min="0" name="montant_modifie" value={formData.montant_modifie} onChange={handleChange} placeholder="0.00"/>
                                     <InputGroup.Text className="rounded-end-pill">MAD</InputGroup.Text>
                                     <Form.Control.Feedback type="invalid">{formErrors.montant_modifie}</Form.Control.Feedback>
                                </InputGroup>
                            </Form.Group>
                        )}
                        {formData.type_modification?.value === 'durée' && (
                            <Form.Group as={Col} md={6} controlId="formNouvelle_date_fin">
                               <Form.Label className="small mb-1 fw-medium">Nouvelle Date Fin <span className="text-danger">*</span></Form.Label> {/* Kept * */}
                                <Form.Control className="p-2 rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.nouvelle_date_fin} type="date" name="nouvelle_date_fin" value={formData.nouvelle_date_fin} onChange={handleChange} size="sm"/>
                                <Form.Control.Feedback type="invalid">{formErrors.nouvelle_date_fin}</Form.Control.Feedback>
                            </Form.Group>
                        )}
                    </Row>

                    {/* Conditional Partner Details Section */}
                     {formData.type_modification?.value === 'partenaire' && (
                         <Card className="mb-3 shadow-sm border-light">
                             <Card.Header className='bg-light py-2'><h6 className='mb-0 fw-semibold text-secondary'>Détails Modification Partenaires</h6></Card.Header>
                             <Card.Body className="pb-2 pt-3">
                                 <Form.Group as={Row} className="mb-3" controlId="formPartenaireSelectConditional">
                                     <Form.Label column sm={3} className="small pt-1 fw-medium text-sm-end"> Sélection Partenaires <span className="text-danger">*</span></Form.Label> {/* Kept * */}
                                     <Col sm={9}>
                                         <Select inputId='avenant-partenaire-select-conditional' name="partenaireSelector" options={partenaireOptions} value={partenaireOptions.filter(opt => avenantPartnerDetails.some(p => p.id === opt.value))} onChange={handleAvenantPartnerSelectionChange} styles={selectStyles} placeholder="- Choisir partenaires concernés -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.partenaires} className={formErrors.partenaires ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body} menuPlacement="auto"/>
                                         {formErrors.partenaires && <div className="invalid-feedback d-block ps-1 small">{formErrors.partenaires}</div>}
                                     </Col>
                                 </Form.Group>
                                 {/* Render details section */}
                                 {avenantPartnerDetails.length > 0 && (
                                     <div className="mt-3 border-top pt-3">
                                         {/* ... Partner detail rows remain the same ... */}
                                         {avenantPartnerDetails.map((partner, index) => (
                                             <div key={partner.id} id={`formAvenantDetail_${partner.id}`} className={`mb-3 ${index < avenantPartnerDetails.length - 1 ? 'border-bottom pb-3' : ''}`}>
                                                 {/* Partner Label, Montant, Signatory Switch */}
                                                 <Row className="mb-2 align-items-center px-sm-3">
                                                     <Col sm={12} md={4} className="small pt-1 fw-bold text-break"><Form.Label className="mb-0">{partner.label}</Form.Label></Col>
                                                     <Col sm={6} md={5} className="mt-2 mt-md-0"><InputGroup size="sm" className="flex-nowrap"><Form.Control type="number" step="0.01" min="0" value={partner.montant} onChange={(e) => handleAvenantCommitmentChange(partner.id, e.target.value)} placeholder="Montant" className="form-control-sm rounded-start-pill shadow-sm bg-white border-1" isInvalid={!!formErrors[`montant_${partner.id}`]}/><InputGroup.Text className="rounded-end-pill">MAD</InputGroup.Text><Form.Control.Feedback type="invalid" className="small w-100">{formErrors[`montant_${partner.id}`]}</Form.Control.Feedback></InputGroup></Col>
                                                     <Col sm={6} md={3} className="d-flex justify-content-start justify-content-md-center align-items-center pt-2 pt-md-1"><FormCheck type="switch" id={`avenant-signatory-check-${partner.id}`} label="Signataire?" checked={partner.is_signatory} onChange={(e) => handleAvenantSignatoryChange(partner.id, e.target.checked)} className="form-check-sm small" /></Col>
                                                 </Row>
                                                 {/* Conditional Signatory Date & Details */}
                                                 {partner.is_signatory && (
                                                     <Row className="mt-1 mb-1 px-sm-3">
                                                         <Col md={4} className="d-none d-md-block"></Col>
                                                         <Col xs={12} sm={6} md={4} className="mb-2 mb-sm-0"><Form.Group controlId={`formAvenantDateSig_${partner.id}`}><Form.Label className="small mb-0 fw-medium text-muted">Date Signature</Form.Label><Form.Control type="date" size="sm" value={partner.date_signature} onChange={(e) => handleAvenantSignatureDateChange(partner.id, e.target.value)} className="form-control-sm rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors[`date_sig_${partner.id}`]} /><Form.Control.Feedback type="invalid" className="small">{formErrors[`date_sig_${partner.id}`]}</Form.Control.Feedback></Form.Group></Col>
                                                         <Col xs={12} sm={6} md={4}><Form.Group controlId={`formAvenantDetailsSig_${partner.id}`}><Form.Label className="small mb-0 fw-medium text-muted">Détails Signature</Form.Label><Form.Control type="text" size="sm" value={partner.details_signature} onChange={(e) => handleAvenantSignatureDetailsChange(partner.id, e.target.value)} placeholder="Lieu, obs..." className="form-control-sm rounded-pill shadow-sm bg-white border-1" /></Form.Group></Col>
                                                     </Row>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </Card.Body>
                         </Card>
                     )}

                    {/* Remarques */}
                     <Form.Group className="mb-3" controlId="formRemarques">
                         <Form.Label className="small mb-1 fw-medium">Remarques</Form.Label>
                         <Form.Control className="p-3 rounded-5 shadow-sm bg-white border-1" as="textarea" rows={2} name="remarques" value={formData.remarques} onChange={handleChange} size="sm" placeholder="Observations diverses..."/>
                     </Form.Group>

                    {/* Multi-File Upload Section */}
                    <Form.Group as={Row} className="mb-3" controlId="avenantFileGroup">
                         <Form.Label column sm={3} className="small fw-medium text-sm-end"> Fichiers Joints </Form.Label> {/* No * */}
                         <Col sm={9}>
                             {/* ... File upload Card and logic remains the same ... */}
                             <Card className="border-dashed rounded-3">
                                 <Card.Body className='p-3'>
                                     <div className='mb-2'>
                                         <Button variant="outline-warning" size="sm" className="me-2 rounded-pill px-3" onClick={() => document.getElementById('avenant_fichiers_hidden_input')?.click()}><FontAwesomeIcon icon={faPlus} className="me-1" /> Ajouter</Button>
                                         <span className='small text-muted fst-italic'>Ajouter un ou plusieurs fichiers</span>
                                         <Form.Control id="avenant_fichiers_hidden_input" type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} isInvalid={!!formErrors.fichiers || !!formErrors['fichiers.*']} accept=".pdf,.doc,.docx,image/*,.xls,.xlsx" />
                                         {(formErrors.fichiers || formErrors['fichiers.*']) && (<div className="d-block invalid-feedback small mt-1">{formErrors.fichiers || formErrors['fichiers.*']}</div>)}
                                     </div>
                                     {isEditing && visibleExistingFichiers.length > 0 && (<div className='mt-2 pt-2 border-top'><span className="me-2 small text-muted fw-bold">Fichiers Actuels:</span><Stack direction="horizontal" gap={1} className="mt-1 flex-wrap" style={{fontSize: '0.85em'}}>{visibleExistingFichiers.map((file) => (<Badge key={`existing-av-file-${file.id}`} pill bg='light' text='dark' className="d-flex border p-1 pe-2 align-items-center fw-normal shadow-sm"><FontAwesomeIcon icon={faPaperclip} className='me-1 ms-1 text-secondary'/><a href={file.fichier_url || '#'} target="_blank" rel="noopener noreferrer" className='me-1 text-truncate text-decoration-none link-primary' style={{maxWidth: '180px'}} title={file.file_name}>{file.file_name || 'Fichier inconnu'}</a><Button variant='link' size="sm" aria-label="Supprimer existant" className="p-0 m-0 ms-1 lh-1 text-danger" onClick={() => removeExistingFile(file.id)} title="Marquer pour suppression"><FontAwesomeIcon icon={faTrashAlt} /></Button></Badge>))}</Stack></div>)}
                                     {isEditing && fichiersToDelete.length > 0 && existingFichiers.some(f => fichiersToDelete.includes(f.id)) && (<div className='mt-2 pt-2 border-top border-danger border-opacity-25'><span className="me-2 small text-danger fw-bold">Fichiers Marqués pour Suppression:</span><Stack direction="horizontal" gap={1} className="mt-1 flex-wrap" style={{fontSize: '0.85em'}}>{existingFichiers.filter(f => fichiersToDelete.includes(f.id)).map((file) => (<Badge key={`deleted-av-file-${file.id}`} pill bg='danger' text='white' className="d-flex border p-1 pe-2 align-items-center fw-normal shadow-sm text-decoration-line-through"><FontAwesomeIcon icon={faTrashAlt} className='me-1 ms-1'/><span className='me-1 text-truncate' style={{maxWidth: '180px'}} title={file.file_name}>{file.file_name || 'Fichier inconnu'}</span></Badge>))}</Stack></div>)}
                                     {fichiers.length > 0 && (<div className={`mt-2 pt-2 ${visibleExistingFichiers.length > 0 || fichiersToDelete.length > 0 ? 'border-top' : ''}`}><span className="me-2 small text-muted fw-bold">Nouveaux Fichiers:</span><Stack direction="horizontal" gap={1} className="mt-1 flex-wrap" style={{fontSize: '0.85em'}}>{fichiers.map((file, fileIndex) => (<Badge key={`new-av-file-${file.name}-${fileIndex}`} pill bg="success" text="white" className="d-flex align-items-center fw-normal p-1 pe-2 shadow-sm"><FontAwesomeIcon icon={faPaperclip} className='me-1 ms-1'/><span className='me-1 text-truncate' style={{maxWidth: '180px'}} title={file.name}>{file.name}</span><Button variant="close" size="sm" aria-label="Retirer nouveau" className="p-0 m-0 ms-1 lh-1 btn-close-white" onClick={() => removeNewFile(fileIndex)}></Button></Badge>))}</Stack></div>)}
                                     {fichiers.length === 0 && visibleExistingFichiers.length === 0 && (<div className="mt-2 pt-2 small text-muted fst-italic border-top">Aucun fichier joint.</div>)}
                                 </Card.Body>
                             </Card>
                         </Col>
                     </Form.Group>

                    {/* Action Buttons */}
                    <Row className="mt-4 pt-3 border-top justify-content-center">
                         <Col xs="auto">
                             <Button variant="danger" onClick={onClose} className="btn px-5 rounded-pill shadow-sm" disabled={submissionStatus.loading}>Annuler</Button>
                         </Col>
                         <Col xs="auto">
                             <Button type="submit" variant="primary" className="btn px-4 rounded-pill align-items-center d-flex justify-content-center shadow-sm" disabled={isSubmitDisabled}>
                                 {submissionStatus.loading ? ( <><Spinner as="span" animation="border" size="sm" className="me-2"/> Enregistrement...</> ) : ( isEditing ? 'Enregistrer Modifications' : 'Ajouter Avenant' )}
                             </Button>
                         </Col>
                    </Row>
                </Form>
            </div>
        </div>
    );
};

// --- PropTypes ---
AvenantForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    initialConventionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    conventionCode: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};

// --- Default Props ---
AvenantForm.defaultProps = {
    itemId: null,
    initialConventionId: null,
    conventionCode: '',
    onItemCreated: (createdItem) => console.log('Avenant Created:', createdItem),
    onItemUpdated: (updatedItem) => console.log('Avenant Updated:', updatedItem),
    baseApiUrl: 'http://localhost:8000/api',
};

export default AvenantForm;