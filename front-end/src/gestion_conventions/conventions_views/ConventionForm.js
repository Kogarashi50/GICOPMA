// ConventionForm.jsx (Merged - Favoring Nullable, Combining Features)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    // Combined Icons
    faSpinner, faExclamationTriangle, faTimes, faTrashAlt, faUndo,
    faFilePdf, faFileWord, faFileExcel, faFileImage, faFileAlt,
    faPlusCircle, faExternalLinkAlt, faUsers // Keep faUsers for Fonctionnaire
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import {
    Form, Button, Row, Col, Card, Alert, Spinner,
    InputGroup, FormCheck, ListGroup, Badge, Stack, Modal // Added Modal from V2
} from 'react-bootstrap';
import PropTypes from 'prop-types';

// Styles for react-select (Using V1's definition)
const selectStyles = {
    control: (provided, state) => ({
        ...provided, width: '100%', maxWidth: '100%', backgroundColor: '#f8f9fa',
        borderRadius: '1.5rem', // Rounded pill equivalent
        border: state.selectProps.className?.includes('is-invalid') ? '#dc3545' : (state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'),
        boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
        minHeight: '38px', fontSize: '0.875rem',
    }),
    valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden' }),
    input: (provided) => ({ ...provided, margin: '0px', padding: '0px', fontSize: '0.875rem' }),
    indicatorSeparator: () => ({ display: 'none', }),
    indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }),
    placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }),
    menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }), // Increased zIndex
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e0e0e0', borderRadius: '0.5rem' }),
    multiValueLabel: (provided) => ({ ...provided, color: '#333', fontSize: '0.8rem', paddingRight: '6px' }),
    multiValueRemove: (provided) => ({ ...provided, color: '#555', ':hover': { backgroundColor: '#c0c0c0', color: 'white' } }),
    noOptionsMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    loadingMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
};
// Other Class Constants (Using V1's approach)
const inputClass = "form-control form-control-sm rounded-pill shadow-sm bg-light border";
const textareaClass = "form-control form-control-sm rounded-3 shadow-sm bg-light border"; // Slightly less round

// --- Helpers ---
const parseCurrency = (value) => { /* ... V1 implementation ... */ if (typeof value !== 'string') return Number(value) || 0; const cleaned = value.replace(/[\s\u00A0]/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.'); const number = parseFloat(cleaned); return isNaN(number) ? 0 : number; };
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`; // From V2
const safeParseInt = (value) => { /* ... V2 implementation ... */ if (value === null || value === undefined) return null; const parsed = parseInt(String(value), 10); return Number.isInteger(parsed) ? parsed : null; };
const getFileIcon = (filenameOrMimeType) => { /* ... V1 implementation ... */ if (!filenameOrMimeType) return faFileAlt; const lowerCase = String(filenameOrMimeType).toLowerCase(); if (lowerCase.includes('pdf')) return faFilePdf; if (lowerCase.includes('doc')) return faFileWord; if (lowerCase.includes('xls')) return faFileExcel; if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage; return faFileAlt; };

// --- Component ---
const ConventionForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated, baseApiUrl = 'http://localhost:8000/api' }) => {
    // --- State (Combined & using V1 granular loading) ---
    const [formData, setFormData] = useState({
        Code: '', Classification_prov: '', Categorie: '', Intitule: '', Reference: '',
        Annee_Convention: '', Objet: '', Objectifs: '', provinces: [], Maitre_Ouvrage: '',
        Cout_Global: '', Cout_CR: '', Statut: null, Operationalisation: '', Groupe: '', Rang: '',
        programmeId: null, projetId: null, observations: '',
        fonctionnaires: [], // Keep from V1
    });
    const [selectedPartnerDetails, setSelectedPartnerDetails] = useState([]); // Using V2's approach with tempId/Id_CP
    const [programmesOptions, setProgrammesOptions] = useState([]);
    const [provincesOptions, setProvincesOptions] = useState([]);
    const [allPartenairesOptions, setAllPartenairesOptions] = useState([]);
    const [projetsOptions, setProjetsOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]); // Keep from V1
    const [loadingOptions, setLoadingOptions] = useState({ programmes: true, partenaires: true, provinces: true, projets: true, fonctionnaires: true }); // V1 granular
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(!!itemId); // V1 granular
    const [existingDocuments, setExistingDocuments] = useState([]); // V1 file state
    const [newFiles, setNewFiles] = useState([]); // V1 file state
    const [documentsToDelete, setDocumentsToDelete] = useState([]); // V1 file state
    // Confirmation Modal State (from V2)
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState({ message: '', details: [] });
    const [dataToResubmit, setDataToResubmit] = useState(null);

    // --- Derived State ---
    const isEditing = useMemo(() => itemId !== null, [itemId]);
    const optionsFinishedLoading = useMemo(() => !loadingOptions.programmes && !loadingOptions.partenaires && !loadingOptions.provinces && !loadingOptions.projets && !loadingOptions.fonctionnaires, [loadingOptions]); // V1 granular check
    const storageBaseUrl = useMemo(() => baseApiUrl.replace('/api', ''), [baseApiUrl]);
    const STATUT_OPTIONS = useMemo(() => [ /* ... V1/V2 options ... */ { value: "non approuvé", label: "Non Approuvé", color: "danger" }, { value: "en cours d'approbation", label: "En Cours d'Approbation", color: "warning" }, { value: "approuvé", label: "Approuvé", color: "success" }, { value: "non visé", label: "Non Visé", color: "danger" }, { value: "en cours de visa", label: "En Cours de Visa", color: "warning" }, { value: "visé", label: "Visé", color: "info" }, { value: "non signé", label: "Non Signé", color: "secondary"}, { value: "en cours de signature", label: "En Cours de Signature", color: "warning" }, { value: "signé", label: "Signé", color: "primary" } ], []);
    const groupedStatutOptions = useMemo(() => { /* ... V1/V2 grouping ... */ const groups = []; const groupLabels = ["Approbation", "Visa", "Signature"]; const groupSize = 3; for (let i = 0; i < STATUT_OPTIONS.length; i += groupSize) { groups.push({ label: groupLabels[Math.floor(i / groupSize)], options: STATUT_OPTIONS.slice(i, i + groupSize) }); } return groups; }, [STATUT_OPTIONS]);

    // --- Fetch Options (Including Fonctionnaires - V1 structure) ---
    const fetchOptions = useCallback(async () => {
        console.log("Fetching options...");
        setLoadingOptions({ programmes: true, partenaires: true, provinces: true, projets: true, fonctionnaires: true }); // V1 granular
        try {
            const [progRes, partRes, provRes, projRes, foncRes] = await Promise.all([
                axios.get(`${baseApiUrl}/programmes`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/partenaires`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/provinces`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/projets`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/fonctionnaires`, { withCredentials: true }) // Fetch Fonctionnaires
            ]);
            // Process responses (using V1/V2 combined logic for labels)
            setProgrammesOptions((progRes.data.programmes || progRes.data || []).map(p => ({ value: p.Id, label: p.Description })));
            setAllPartenairesOptions((partRes.data.partenaires || partRes.data || []).map(p => ({ value: p.Id, label: p.Description_Arr || p.Description || `Partenaire ID ${p.Id}` }))); // V2 label logic
            setProvincesOptions((provRes.data.provinces || provRes.data || []).map(p => ({ value: p.Id, label: p.Description || p.Code })));
            setProjetsOptions((projRes.data.projets || projRes.data || []).map(p => ({ value: p.ID_Projet, label: `${p.Code_Projet || 'N/A'} - ${p.Nom_Projet || 'N/A'}` })));
            setFonctionnairesOptions((foncRes.data.fonctionnaires || foncRes.data || []).map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` }))); // V1 fonctionnaire logic
            console.log("Options loaded.");
        } catch (err) { console.error("Erreur chargement options:", err); setSubmissionStatus(prev => ({ ...prev, error: "Erreur chargement des listes." })); }
        finally { setLoadingOptions({ programmes: false, partenaires: false, provinces: false, projets: false, fonctionnaires: false }); } // V1 granular
    }, [baseApiUrl]);

    useEffect(() => { fetchOptions(); }, [fetchOptions]);

    // --- Fetch Existing Data (Edit Mode - Combined Logic) ---
    useEffect(() => {
        if (!itemId || !optionsFinishedLoading) { if (!itemId) setLoadingData(false); return; }
        let isMounted = true;
        const fetchConventionData = async () => {
            console.log(`[Form Edit Load] Fetching data ID: ${itemId}`);
            setLoadingData(true);
            setSubmissionStatus({ loading: false, error: null, success: false });
            setFormErrors({}); setExistingDocuments([]); setNewFiles([]); setDocumentsToDelete([]);
            setDataToResubmit(null); setShowConfirmModal(false); // Reset modal state too
            try {
                const response = await axios.get(`${baseApiUrl}/conventions/${itemId}`, { withCredentials: true });
                const data = response.data.convention || response.data;
                if (!isMounted) return;
                if (!data || typeof data !== 'object') throw new Error(`Format de réponse invalide ID ${itemId}.`);
                console.log("[Form Edit Load] Raw Data Received:", data);

                // Helpers from V1/V2
                const findOption = (options, valueToFind, valueKey = 'value') => options?.find(opt => String(opt[valueKey]).toLowerCase() === String(valueToFind).toLowerCase()) || null;
                const findMultiOptions = (options, valuesString, valueKey = 'value') => { if (!valuesString || typeof valuesString !== 'string' || !options?.length) return []; const selectedValues = valuesString.split(';').map(v => String(v).trim().toLowerCase()).filter(v => v); return options.filter(opt => selectedValues.includes(String(opt[valueKey]).toLowerCase())); };

                // Find options (including fonctionnaires from V1)
                const selectedStatutOption = findOption(STATUT_OPTIONS, data.Statut, 'value');
                const selectedProgrammeOption = findOption(programmesOptions, data.programme?.Id ?? data.Id_Programme);
                const selectedProjetOption = findOption(projetsOptions, data.projet?.ID_Projet ?? data.id_projet);
                const selectedProvinceOptions = findMultiOptions(provincesOptions, data.localisation);
                const selectedFonctionnaireOptions = findMultiOptions(fonctionnairesOptions, data.id_fonctionnaire); // V1 fonctionnaire logic

                // Set formData (including observations & fonctionnaires)
                setFormData({
                    Code: String(data.Code ?? ''), Classification_prov: String(data.Classification_prov ?? ''), Categorie: String(data.Categorie ?? ''), Intitule: String(data.Intitule ?? ''), Reference: String(data.Reference ?? ''), Annee_Convention: String(data.Annee_Convention ?? ''), Objet: String(data.Objet ?? ''), Objectifs: String(data.Objectifs ?? ''), Maitre_Ouvrage: String(data.Maitre_Ouvrage ?? ''), Cout_Global: String(data.Cout_Global ?? ''), Cout_CR: String(data.Cout_CR ?? ''), Statut: selectedStatutOption, Operationalisation: String(data.Operationalisation ?? ''), Groupe: String(data.Groupe ?? ''), Rang: String(data.Rang ?? ''), observations: String(data.observations ?? ''), provinces: selectedProvinceOptions, programmeId: selectedProgrammeOption, projetId: selectedProjetOption, fonctionnaires: selectedFonctionnaireOptions // Include fonctionnaires
                });

                // Set partner details (Using V2's tempId/Id_CP logic)
                const commitmentsArray = data.partner_commitments || [];
                console.log("[Form Edit Load] Raw Partner Commitments:", commitmentsArray);
                setSelectedPartnerDetails(commitmentsArray.map(commit => ({
                     tempId: generateTempId(), // Assign tempId for list management
                     id: commit.Id_Partenaire, // Actual Partenaire ID
                     Id_CP: safeParseInt(commit.Id_CP), // Keep original ConvPart ID if available
                     label: commit.label || `Partenaire ID ${commit.Id_Partenaire}`,
                     montant: String(commit.Montant_Convenu ?? ''),
                     is_signatory: !!commit.is_signatory,
                     date_signature: commit.date_signature || '',
                     details_signature: commit.details_signature || '',
                })));
                console.log("[Form Edit Load] Processed Partner Details State:", selectedPartnerDetails.length);

                // Set existing documents (Using V1 file logic)
                const fetchedDocs = data.documents || [];
                setExistingDocuments(fetchedDocs.map(doc => ({ id: doc.Id_Doc, name: doc.file_name || `Document ${doc.Id_Doc}`, url: doc.url || null, type: doc.file_type, })));
                console.log("[Form Edit Load] Processed Existing Documents State:", existingDocuments.length);

            } catch (err) { console.error("Erreur chargement données convention:", err); if (isMounted) setSubmissionStatus({ loading: false, error: err.response?.data?.message || err.message || "Erreur chargement données.", success: false }); }
            finally { if (isMounted) setLoadingData(false); }
        };
        fetchConventionData();
        return () => { isMounted = false; };
    }, [itemId, baseApiUrl, optionsFinishedLoading, allPartenairesOptions, programmesOptions, provincesOptions, projetsOptions, STATUT_OPTIONS, storageBaseUrl, fonctionnairesOptions]); // Added fonctionnairesOptions

    // --- EFFECT 2: Reset Form (Using V1/V2 logic) ---
    useEffect(() => {
        if (!isEditing && optionsFinishedLoading) {
            console.log("Resetting form for Create mode.");
            setFormData({ Code: '', Classification_prov: '', Categorie: '', Intitule: '', Reference: '', Annee_Convention: '', Objet: '', Objectifs: '', provinces: [], Maitre_Ouvrage: '', Cout_Global: '', Cout_CR: '', Statut: null, Operationalisation: '', Groupe: '', Rang: '', programmeId: null, projetId: null, observations: '', fonctionnaires: [] }); // Reset fonctionnaires
            setSelectedPartnerDetails([]); setFormErrors({}); setSubmissionStatus({ loading: false, error: null, success: false }); setLoadingData(false);
            setExistingDocuments([]); setNewFiles([]); setDocumentsToDelete([]);
            setDataToResubmit(null); setShowConfirmModal(false); // Reset modal state
        }
    }, [isEditing, optionsFinishedLoading]);

    // --- Frontend Validation (Merged: Based on nullable approach) ---
    const validateForm = () => {
        const errors = {};
        // REQUIRED fields (ensure these match the final decision)
        if (!formData.Code?.trim()) errors.Code = "Code requis.";
        if (!formData.Intitule?.trim()) errors.Intitule = "Intitulé requis.";
        if (!formData.Annee_Convention) errors.Annee_Convention = "Année requise.";
        else if (isNaN(parseInt(formData.Annee_Convention)) || String(formData.Annee_Convention).length !== 4) errors.Annee_Convention = "Année invalide (YYYY).";
        if (!formData.Statut) errors.Statut = "Statut requis.";
        // Optional but must be numeric if provided
        if (formData.Cout_Global && isNaN(parseCurrency(formData.Cout_Global))) errors.Cout_Global = "Coût Global doit être un nombre.";
        if (formData.Cout_CR && isNaN(parseCurrency(formData.Cout_CR))) errors.Cout_CR = "Coût CR doit être un nombre.";
        if (formData.Groupe && isNaN(parseInt(formData.Groupe))) errors.Groupe = "Groupe doit être un nombre entier.";
        // Partner Validation (allow empty list if not required by backend, check details if list not empty)
        if (selectedPartnerDetails.length > 0) {
            selectedPartnerDetails.forEach((p) => {
                const amount = parseCurrency(p.montant);
                if (p.montant !== '' && (isNaN(amount) || amount < 0)) errors[`montant_${p.id}`] = `Montant invalide pour ${p.label}.`; // Only error if non-empty but invalid
                if (p.is_signatory && !p.date_signature) errors[`date_sig_${p.id}`] = `Date signature requise pour ${p.label} (signataire).`;
            });
        }
        if (formData.observations && formData.observations.length > 20000) errors.observations = "Observations max 20000 caractères.";

        setFormErrors(errors);
        console.log("Frontend Validation Errors:", errors);
        return Object.keys(errors).length === 0;
     };

    // --- Handlers (Combined) ---
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: undefined })); };
    const handleProgrammeChange = (selectedOption) => { setFormData(prev => ({ ...prev, programmeId: selectedOption })); if (formErrors.Id_Programme) setFormErrors(prev => ({ ...prev, Id_Programme: undefined })); };
    const handleProvinceChange = (selectedOptions) => { setFormData(prev => ({ ...prev, provinces: selectedOptions || [] })); if (formErrors.Province) setFormErrors(prev => ({ ...prev, Province: undefined })); };
    const handleStatutChange = (selectedOption) => { setFormData(prev => ({ ...prev, Statut: selectedOption })); if (formErrors.Statut) setFormErrors(prev => ({ ...prev, Statut: undefined })); };
    const handleProjetChange = (selectedOption) => { setFormData(prev => ({ ...prev, projetId: selectedOption })); if (formErrors.Id_Projet) { setFormErrors(prev => ({ ...prev, Id_Projet: undefined })); } };
    const handleFonctionnaireChange = (selectedOptions) => { setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] })); if (formErrors.id_fonctionnaire) { setFormErrors(prev => ({ ...prev, id_fonctionnaire: undefined })); } }; // Keep from V1
    const handleFileChange = (e) => { /* ... V1 implementation ... */ const files = Array.from(e.target.files); if (files.length > 0) { setNewFiles(prev => { const currentIdentifiers = new Set(prev.map(f => `${f.name}_${f.size}`)); const newlyAdded = files.filter(f => !currentIdentifiers.has(`${f.name}_${f.size}`)); return [...prev, ...newlyAdded]; }); if (formErrors.fichiers) setFormErrors(prev => ({ ...prev, fichiers: undefined })); } e.target.value = null; };
    const handleRemoveNewFile = (indexToRemove) => { setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove)); };
    const handleMarkForDeletion = (docId) => { setDocumentsToDelete(prev => [...new Set([...prev, docId])]); };
    const handleUnmarkForDeletion = (docId) => { setDocumentsToDelete(prev => prev.filter(id => id !== docId)); if (formErrors.fichiers_delete) setFormErrors(prev => ({ ...prev, fichiers_delete: undefined })); };
    const handlePartnerSelectionChange = (selectedOptions) => { /* ... V2 implementation ... */ const newSelectedPartnersOptions = selectedOptions || []; setSelectedPartnerDetails(prevDetails => { const keptDetails = prevDetails.filter(detail => newSelectedPartnersOptions.some(opt => opt.value === detail.id)); const addedDetails = newSelectedPartnersOptions.filter(option => !prevDetails.some(detail => detail.id === option.value)).map(option => ({ tempId: generateTempId(), id: option.value, Id_CP: null, label: option.label, montant: '', is_signatory: false, date_signature: '', details_signature: '', })); return [...keptDetails, ...addedDetails]; }); if (formErrors.partenaires) setFormErrors(prev => ({ ...prev, partenaires: undefined })); if (formErrors.signatories) setFormErrors(prev => ({ ...prev, signatories: undefined })); const newPartnerIds = newSelectedPartnersOptions.map(opt => opt.value); setFormErrors(prev => { const nextErrors = { ...prev }; Object.keys(nextErrors).forEach(key => { const matchAmount = key.match(/^montant_(\d+)$/); const matchDate = key.match(/^date_sig_(\d+)$/); const matchDetails = key.match(/^details_sig_(\d+)$/); const partnerIdStr = matchAmount?.[1] || matchDate?.[1] || matchDetails?.[1]; if (partnerIdStr && !newPartnerIds.includes(parseInt(partnerIdStr, 10))) delete nextErrors[key]; }); return nextErrors; }); };
    const handleCommitmentChange = (tempId, value) => { /* ... V2 implementation ... */ setSelectedPartnerDetails(prevDetails => prevDetails.map(p => p.tempId === tempId ? { ...p, montant: value } : p)); const partnerId = selectedPartnerDetails.find(p=>p.tempId === tempId)?.id; if(partnerId) { const errorKey = `montant_${partnerId}`; if (formErrors[errorKey]) setFormErrors(prev => ({ ...prev, [errorKey]: undefined })); } };
    const handleSignatoryChange = (tempId, isChecked) => { /* ... V2 implementation ... */ setSelectedPartnerDetails(prevDetails => prevDetails.map(p => p.tempId === tempId ? { ...p, is_signatory: isChecked, date_signature: isChecked ? p.date_signature : '', details_signature: isChecked ? p.details_signature : '' } : p)); const partnerId = selectedPartnerDetails.find(p=>p.tempId === tempId)?.id; if(partnerId){ if (isChecked && formErrors.signatories) setFormErrors(prev => ({ ...prev, signatories: undefined })); const dateErrorKey = `date_sig_${partnerId}`; const detailsErrorKey = `details_sig_${partnerId}`; if (!isChecked && formErrors[dateErrorKey]) setFormErrors(prev => ({ ...prev, [dateErrorKey]: undefined })); if (!isChecked && formErrors[detailsErrorKey]) setFormErrors(prev => ({ ...prev, [detailsErrorKey]: undefined })); } };
    const handleSignatureDateChange = (tempId, value) => { /* ... V2 implementation ... */ setSelectedPartnerDetails(prevDetails => prevDetails.map(p => p.tempId === tempId ? { ...p, date_signature: value } : p)); const partnerId = selectedPartnerDetails.find(p=>p.tempId === tempId)?.id; if(partnerId) { const errorKey = `date_sig_${partnerId}`; if (formErrors[errorKey]) setFormErrors(prev => ({ ...prev, [errorKey]: undefined })); } };
    const handleSignatureDetailsChange = (tempId, value) => { /* ... V2 implementation ... */ setSelectedPartnerDetails(prevDetails => prevDetails.map(p => p.tempId === tempId ? { ...p, details_signature: value } : p)); const partnerId = selectedPartnerDetails.find(p=>p.tempId === tempId)?.id; if(partnerId) { const errorKey = `details_sig_${partnerId}`; if (formErrors[errorKey]) setFormErrors(prev => ({ ...prev, [errorKey]: undefined })); } };
    const handleModalConfirm = () => { /* ... V2 implementation ... */ setShowConfirmModal(false); if (dataToResubmit) { console.log("User confirmed partner deletion. Resubmitting..."); executeSubmit(dataToResubmit, true); } else { console.error("Cannot resubmit confirmation, dataToResubmit is null."); setSubmissionStatus({ loading: false, error: "Erreur interne: Impossible de confirmer.", success: false }); } };
    const handleModalCancel = () => { /* ... V2 implementation ... */ setShowConfirmModal(false); setDataToResubmit(null); setSubmissionStatus({ loading: false, error: "Mise à jour annulée par l'utilisateur après demande de confirmation.", success: false }); console.log("User cancelled partner deletion."); };

    // --- Submit Handler (Using V2's executeSubmit structure) ---
    const executeSubmit = async (formDataPayload, confirmDelete = false) => {
        setSubmissionStatus({ loading: true, error: null, success: false });
        setFormErrors({}); // Clear previous form errors
        setDataToResubmit(null); // Clear resubmit data

        if (confirmDelete) {
            formDataPayload.append('confirm_delete_commitments', '1'); // '1' for true
        } else {
            // Ensure it's not present if not confirming
            if(formDataPayload.has('confirm_delete_commitments')) {
                 formDataPayload.delete('confirm_delete_commitments');
            }
        }

        const url = isEditing ? `${baseApiUrl}/conventions/${itemId}` : `${baseApiUrl}/conventions`;
        const config = { headers: { 'Accept': 'application/json' }, withCredentials: true };
        if (isEditing) formDataPayload.append('_method', 'PUT');

        console.log(`Submitting ${isEditing ? 'PUT (via POST)' : 'POST'} to ${url}. Confirmation: ${confirmDelete}`);
        // for (let pair of formDataPayload.entries()) { console.log(pair[0]+ ': ', pair[1]); } // Debug FormData

        try {
            const response = await axios.post(url, formDataPayload, config);
            console.log("API Response:", response.data);
            setSubmissionStatus({ loading: false, error: null, success: true });
            const returnedConvention = response.data.convention;

            if (isEditing) {
                 onItemUpdated?.(returnedConvention);
                 // Re-sync state only needed if you stay on the form, which we don't here.
            } else {
                onItemCreated?.(returnedConvention);
            }
             setTimeout(onClose, 1500); // Close form after success delay

        } catch (err) {
            console.error(`Erreur lors de ${isEditing ? 'la modification' : 'la création'}:`, err.response || err);
            let errorMsg = `Une erreur s'est produite lors de la soumission.`;
            let serverErrors = {};

            if (err.response) {
                // *** Handle 409 Conflict (from V2) ***
                if (err.response.status === 409 && err.response.data?.requires_confirmation) {
                    console.log("Confirmation required from backend.");
                    setSubmissionStatus({ loading: false, error: null, success: false }); // Reset loading, no error message needed here
                    setConfirmModalData({ message: err.response.data.message || "Confirmation requise.", details: err.response.data.details || [] });
                    setDataToResubmit(formDataPayload); // Keep the data
                    setShowConfirmModal(true); // Show the modal
                    return; // Stop further error processing for 409
                }
                // --- End 409 Handling ---

                errorMsg = err.response.data?.message || `Erreur serveur (${err.response.status})`;
                 if (err.response.status === 422 && typeof err.response.data.errors === 'object') {
                       serverErrors = err.response.data.errors;
                       const mappedErrors = {}; // Using V1's error mapping approach
                       const partnerCommitmentsPayload = JSON.parse(formDataPayload.get('partner_commitments') || '[]'); // Need payload context
                       Object.keys(serverErrors).forEach(key => {
                           // ... (Mapping logic from V1, adapted for V2 partner payload if needed) ...
                            if (key.startsWith('partner_commitments.')) {
                                const parts = key.split('.');
                                if(parts.length > 1 && !isNaN(parseInt(parts[1]))) {
                                    const index = parseInt(parts[1]); const field = parts.slice(2).join('.');
                                    const partnerWithError = partnerCommitmentsPayload[index];
                                    if(partnerWithError && partnerWithError.Id_Partenaire) {
                                        const partnerId = partnerWithError.Id_Partenaire;
                                        if(field === 'Montant_Convenu') mappedErrors[`montant_${partnerId}`] = serverErrors[key].join(' ');
                                        else if(field === 'date_signature') mappedErrors[`date_sig_${partnerId}`] = serverErrors[key].join(' ');
                                        else if(field === 'details_signature') mappedErrors[`details_sig_${partnerId}`] = serverErrors[key].join(' ');
                                        else if (field === 'id_cp') mappedErrors['partenaires'] = (mappedErrors['partenaires'] || '') + ` Err Eng P.${partnerId}: ${serverErrors[key].join(' ')}`; // Map id_cp error
                                        else mappedErrors['partenaires'] = (mappedErrors['partenaires'] || '') + serverErrors[key].join(' ');
                                    } else { mappedErrors['partenaires'] = (mappedErrors['partenaires'] || '') + ` Err eng #${index+1}: ` + serverErrors[key].join(' '); }
                                } else { mappedErrors['partenaires'] = (mappedErrors['partenaires'] || '') + serverErrors[key].join(' '); }
                            } else if (key === 'partner_commitments') { mappedErrors['partenaires'] = serverErrors[key].join(' '); }
                            else if (key.startsWith('fichiers.') || key === 'fichiers') { mappedErrors.fichiers = (mappedErrors.fichiers || '') + serverErrors[key].join(' ') + ' '; }
                            else if (key.startsWith('deleted_document_ids.') || key === 'deleted_document_ids') { mappedErrors.fichiers_delete = (mappedErrors.fichiers_delete || '') + serverErrors[key].join(' ') + ' '; }
                            else if (key === 'id_fonctionnaire') mappedErrors['id_fonctionnaire'] = serverErrors[key].join(' '); // V1 fonctionnaire error
                            else { const formKey = Object.keys(formData).find(fk => fk.toLowerCase() === key.toLowerCase()) || key; if (key === 'id_projet') mappedErrors['Id_Projet'] = serverErrors[key].join(' '); else if (key === 'id_programme') mappedErrors['Id_Programme'] = serverErrors[key].join(' '); else if (key === 'localisation') mappedErrors['Province'] = serverErrors[key].join(' '); else mappedErrors[formKey] = serverErrors[key].join(' '); }
                       });
                       setFormErrors(mappedErrors);
                       errorMsg = "Erreurs de validation (serveur).";
                  }
            } else if (err.request) { errorMsg = "Aucune réponse reçue du serveur."; }
            else { errorMsg = `Erreur JavaScript: ${err.message}`; }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };
    // Main submit handler (prepares data and calls executeSubmit)
    const handleSubmit = (e) => {
        e.preventDefault();
        setShowConfirmModal(false); // Ensure modal is closed if open
        if (!validateForm()) {
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs indiquées.", success: false });
            // ... (scroll logic from V1) ...
             const firstErrorKey = Object.keys(formErrors)[0]; let errorElementId = `form${firstErrorKey}`; if (firstErrorKey?.startsWith('montant_') || firstErrorKey?.startsWith('date_sig_') || firstErrorKey?.startsWith('details_sig_')) { errorElementId = `formDetail_${firstErrorKey.split('_').pop()}`; } else if (['Province', 'Id_Programme', 'Id_Projet', 'partenaires', 'Statut', 'id_fonctionnaire'].includes(firstErrorKey)) { errorElementId = `form${firstErrorKey}`; } else if (firstErrorKey === 'fichiers' || firstErrorKey === 'fichiers_delete') { errorElementId = 'file-management-card'; } const elementToScroll = document.getElementById(errorElementId); if (elementToScroll) { elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' }); } else { window.scrollTo({ top: 0, behavior: 'smooth' }); }
            return;
        }

        const dataPayload = new FormData(); // Using FormData from V1

        // Append standard fields (prioritizing nullable)
        dataPayload.append('code', formData.Code);
        dataPayload.append('intitule', formData.Intitule);
        dataPayload.append('annee_convention', formData.Annee_Convention);
        dataPayload.append('statut', formData.Statut?.value ?? '');
        // Nullable fields (send empty string if null/undefined)
        dataPayload.append('classification_prov', formData.Classification_prov ?? '');
        dataPayload.append('categorie', formData.Categorie ?? '');
        dataPayload.append('reference', formData.Reference ?? '');
        dataPayload.append('objet', formData.Objet ?? '');
        dataPayload.append('objectifs', formData.Objectifs ?? '');
        dataPayload.append('maitre_ouvrage', formData.Maitre_Ouvrage ?? '');
        dataPayload.append('operationalisation', formData.Operationalisation ?? '');
        dataPayload.append('groupe', formData.Groupe ?? '');
        dataPayload.append('rang', formData.Rang ?? '');
        dataPayload.append('observations', formData.observations ?? '');
        dataPayload.append('cout_global', formData.Cout_Global ? parseCurrency(formData.Cout_Global) : ''); // Send number or empty
        dataPayload.append('cout_cr', formData.Cout_CR ? parseCurrency(formData.Cout_CR) : '');       // Send number or empty
        dataPayload.append('id_programme', formData.programmeId?.value ?? '');
        dataPayload.append('id_projet', formData.projetId?.value ?? '');
        // Multi-selects
        const provinceIds = formData.provinces.map(p => p.value).join(';');
        dataPayload.append('localisation', provinceIds);
        const fonctionnaireIds = formData.fonctionnaires.map(f => f.value).join(';'); // V1 fonctionnaire logic
        dataPayload.append('id_fonctionnaire', fonctionnaireIds); // V1 fonctionnaire key

        // Partner Commitments (using V2 structure with Id_CP)
        const partnerCommitmentsPayload = selectedPartnerDetails.map(p => {
            let commitment = {
                Id_Partenaire: p.id,
                Montant_Convenu: p.montant ? parseCurrency(p.montant) : null, // Send number or null
                is_signatory: p.is_signatory,
                date_signature: p.is_signatory && p.date_signature ? p.date_signature : null,
                details_signature: p.is_signatory && p.details_signature ? p.details_signature : null,
            };
            // Include 'id_cp' ONLY for existing commitments being updated
            if (isEditing && p.Id_CP !== null && p.Id_CP !== undefined) {
                commitment.id_cp = p.Id_CP; // Use the key backend expects
            }
            return commitment;
        });
        dataPayload.append('partner_commitments', JSON.stringify(partnerCommitmentsPayload));
        // Append simple 'partenaire' string if needed by backend (less ideal)
        // dataPayload.append('partenaire', selectedPartnerDetails.map(p => p.id).join(';'));

        // Files (V1 logic)
        if (newFiles.length > 0) { newFiles.forEach((file) => dataPayload.append('fichiers[]', file)); }
        if (isEditing && documentsToDelete.length > 0) { dataPayload.append('deleted_document_ids', JSON.stringify(documentsToDelete)); }

        executeSubmit(dataPayload, false); // Initial submit without confirmation
    };

    // --- Render Logic ---
    const isSubmitDisabled = submissionStatus.loading || loadingData || Object.values(loadingOptions).some(l => l); // V1 loading check
    if (loadingOptions.programmes || loadingOptions.partenaires || loadingOptions.provinces || loadingOptions.projets || loadingOptions.fonctionnaires || (isEditing && loadingData)) {
        return ( <div className="d-flex justify-content-center align-items-center p-5" style={{minHeight: '400px'}}> <Spinner animation="border" variant="primary" /> <span className='ms-3 text-muted'>Chargement...</span> </div> );
    }

    return (
        <> {/* V2 Fragment for Modal */}
            {/* V1 Main Container Style */}
            <div className="p-4" style={{ backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto'}}>

                 {/* Header (V1 Style) */}
                 <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0 border-bottom pb-2">
                    <div><h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier la' : 'Créer une nouvelle'}</h5><h2 className="mb-0 fw-bold">Convention {isEditing ? `(Code: ${formData.Code})` : ''}</h2></div>
                    <Button variant="light" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold' onClick={onClose} size="sm" title="Retour">Revenir a la liste</Button>
                </div>

                {/* Form Content */}
                <div className="flex-grow-1">
                     {/* Alerts (V1 Style) */}
                     {submissionStatus.error && <Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({...prev, error: null}))}><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}</Alert>}
                     {submissionStatus.success && <Alert variant="success" className="mb-3 py-2">Convention {isEditing ? 'modifiée' : 'créée'} avec succès !</Alert>}

                    {/* Form Start */}
                    <Form noValidate onSubmit={handleSubmit}>
                        {/* --- Row 1: Intitule, Annee_Convention (V1 Style) --- */}
                         <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={8} controlId="formIntitule"><Form.Label className="small mb-1 fw-medium">Intitule <span className="text-danger">*</span></Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Intitule} required as="textarea" rows={1} name="Intitule" value={formData.Intitule} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Intitule}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={4} controlId="formAnnee_Convention"><Form.Label className="small mb-1 fw-medium">Annee Convention <span className="text-danger">*</span></Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Annee_Convention} required type="number" name="Annee_Convention" value={formData.Annee_Convention} onChange={handleChange} size="sm" placeholder="YYYY" min="1900" max={new Date().getFullYear() + 10}/><Form.Control.Feedback type="invalid">{formErrors.Annee_Convention}</Form.Control.Feedback></Form.Group>
                        </Row>

                        {/* --- Row 2: Partenaires Section (Using V2 tempId/Id_CP logic) --- */}
                        <Card className="mb-4 shadow-sm border-light">
                            <Card.Header className='bg-light py-2'><h6 className='mb-0 fw-semibold text-secondary'>Partenaires & Engagements</h6></Card.Header>
                            <Card.Body className="pb-2 pt-3">
                                <Form.Group as={Row} className="mb-3" id="formPartenaires"> {/* id for scrolling */}
                                    <Form.Label column sm={3} className="small pt-1 fw-medium text-sm-end">Sélection Partenaires</Form.Label>
                                    <Col sm={9}>
                                        <Select inputId='partenaire-select-input' name="partenaireSelector" options={allPartenairesOptions} value={allPartenairesOptions.filter(opt => selectedPartnerDetails.some(p => p.id === opt.value))} onChange={handlePartnerSelectionChange} styles={selectStyles} placeholder="- Choisir ou ajouter -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.partenaires} className={formErrors.partenaires || formErrors.signatories ? 'is-invalid' : ''} classNamePrefix="react-select"/>
                                        {(formErrors.partenaires || formErrors.signatories) && <div className="invalid-feedback d-block ps-1 small">{formErrors.partenaires} {formErrors.signatories}</div>}
                                    </Col>
                                </Form.Group>
                                {selectedPartnerDetails.length > 0 && ( <div className="mt-3 border-top pt-3">
                                    {selectedPartnerDetails.map((partner, index) => (
                                        <div key={partner.tempId} id={`formDetail_${partner.id}`} className={`mb-3 ${index < selectedPartnerDetails.length - 1 ? 'border-bottom pb-3' : ''}`}>
                                            <Row className="mb-2 align-items-center px-sm-3">
                                                <Form.Label column sm={5} md={4} className="small pt-1 fw-bold text-break">{partner.label}</Form.Label>
                                                <Col sm={4} md={5}>
                                                    <InputGroup size="sm" className="flex-nowrap">
                                                        <Form.Control type="number" step="0.01" min="0" value={partner.montant} onChange={(e) => handleCommitmentChange(partner.tempId, e.target.value)} placeholder="Montant (MAD)" className="form-control-sm rounded-start-pill shadow-sm bg-white border-1" isInvalid={!!formErrors[`montant_${partner.id}`]}/>
                                                        <InputGroup.Text className="rounded-end-pill">MAD</InputGroup.Text>
                                                        <Form.Control.Feedback type="invalid" className="small w-100">{formErrors[`montant_${partner.id}`]}</Form.Control.Feedback>
                                                    </InputGroup>
                                                </Col>
                                                <Col sm={3} md={3} className="d-flex justify-content-center align-items-center pt-1">
                                                    <FormCheck type="switch" id={`signatory-check-${partner.tempId}`} label="Signataire?" checked={partner.is_signatory} onChange={(e) => handleSignatoryChange(partner.tempId, e.target.checked)} className="form-check-lg small" title={partner.is_signatory ? "Signataire" : "Non Signataire"}/>
                                                </Col>
                                            </Row>
                                            {partner.is_signatory && ( <Row className="mt-2 mb-1 px-sm-3">
                                                <Col sm={5} md={4} className="d-none d-sm-block"></Col>
                                                <Col xs={12} sm={4} md={4} className="mb-2 mb-sm-0"> <Form.Group controlId={`formDateSig_${partner.id}`}><Form.Label className="small mb-0 fw-medium text-muted">Date Signature</Form.Label><Form.Control type="date" size="sm" value={partner.date_signature} onChange={(e) => handleSignatureDateChange(partner.tempId, e.target.value)} className="form-control-sm rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors[`date_sig_${partner.id}`]} required={partner.is_signatory}/><Form.Control.Feedback type="invalid" className="small">{formErrors[`date_sig_${partner.id}`]}</Form.Control.Feedback></Form.Group> </Col>
                                                <Col xs={12} sm={3} md={4}> <Form.Group controlId={`formDetailsSig_${partner.id}`}><Form.Label className="small mb-0 fw-medium text-muted">Détails Signature</Form.Label><Form.Control type="text" size="sm" value={partner.details_signature} onChange={(e) => handleSignatureDetailsChange(partner.tempId, e.target.value)} placeholder="Lieu, observations..." className="form-control-sm rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors[`details_sig_${partner.id}`]}/><Form.Control.Feedback type="invalid" className="small">{formErrors[`details_sig_${partner.id}`]}</Form.Control.Feedback></Form.Group> </Col>
                                            </Row> )}
                                        </div>
                                    ))}
                                </div> )}
                            </Card.Body>
                        </Card>

                        {/* --- Row 3: Maitre_Ouvrage, Programme, Projet, Localisation (V1 Style) --- */}
                        <Row className="mb-3 g-3">
                             <Form.Group as={Col} md={3} lg={3} controlId="formMaitre_Ouvrage"><Form.Label className="small mb-1 fw-medium">Maitre Ouvrage</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Maitre_Ouvrage} type="text" name="Maitre_Ouvrage" value={formData.Maitre_Ouvrage} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Maitre_Ouvrage}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={3} lg={3} controlId="formId_Programme"><Form.Label className="small mb-1 fw-medium">Programme</Form.Label><Select inputId='programme-select-input' name="programmeId" menuPlacement="auto" options={programmesOptions} value={formData.programmeId} onChange={handleProgrammeChange} styles={selectStyles} placeholder="- Selectionner -" isClearable isLoading={loadingOptions.programmes} className={formErrors.Id_Programme ? 'is-invalid' : ''} classNamePrefix="react-select" isMulti={false}/><Form.Control.Feedback type="invalid" style={{ display: formErrors.Id_Programme ? 'block' : 'none'}}>{formErrors.Id_Programme}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={3} lg={3} controlId="formId_Projet"><Form.Label className="small mb-1 fw-medium">Projet</Form.Label><Select inputId='projet-select-input' name="projetId" menuPlacement="auto" options={projetsOptions} value={formData.projetId} onChange={handleProjetChange} styles={selectStyles} placeholder="- Selectionner -" isClearable isLoading={loadingOptions.projets} className={formErrors.Id_Projet ? 'is-invalid' : ''} classNamePrefix="react-select" isMulti={false}/><Form.Control.Feedback type="invalid" style={{ display: formErrors.Id_Projet ? 'block' : 'none'}}>{formErrors.Id_Projet}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={3} lg={3} controlId="formProvince"><Form.Label className="small mb-1 fw-medium">Localisation (Provinces)</Form.Label><Select inputId='province-select-input' name="provinces" menuPlacement="auto" options={provincesOptions} value={formData.provinces} onChange={handleProvinceChange} styles={selectStyles} placeholder="- Selectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.provinces} className={formErrors.Province ? 'is-invalid' : ''} classNamePrefix="react-select"/><Form.Control.Feedback type="invalid" style={{ display: formErrors.Province ? 'block' : 'none'}}>{formErrors.Province}</Form.Control.Feedback></Form.Group>
                        </Row>

                         {/* --- Row 4: Statut, Operationalisation, Fonctionnaire (V1 structure) --- */}
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={4} controlId="formStatut"><Form.Label className="small mb-1 fw-medium">Statut <span className="text-danger">*</span></Form.Label><Select inputId='statut-select-input' name="Statut" options={groupedStatutOptions} value={formData.Statut} onChange={handleStatutChange} styles={selectStyles} placeholder="- Sélectionner Statut -" isClearable formatGroupLabel={(group) => (<div style={{ fontWeight: 'bold', color: '#555', borderTop: '1px solid #eee', paddingTop: '5px', marginTop:'5px' }}>{group.label}</div>)} className={formErrors.Statut ? 'is-invalid' : ''} classNamePrefix="react-select"/><Form.Control.Feedback type="invalid" style={{ display: formErrors.Statut ? 'block' : 'none'}}>{formErrors.Statut}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={4} controlId="formOperationalisation"><Form.Label className="small mb-1 fw-medium">Operationalisation</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Operationalisation} type="text" name="Operationalisation" value={formData.Operationalisation} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Operationalisation}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={4} controlId="formId_Fonctionnaire"> {/* V1 Fonctionnaire Select */}
                                <Form.Label className="small mb-1 fw-medium"><FontAwesomeIcon icon={faUsers} className="me-1" /> Points Focaux</Form.Label>
                                <Select inputId='fonctionnaire-select-input' name="fonctionnaires" menuPlacement="auto" options={fonctionnairesOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder="- Selectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.fonctionnaires} className={formErrors.id_fonctionnaire ? 'is-invalid' : ''} classNamePrefix="react-select"/>
                                <Form.Control.Feedback type="invalid" style={{ display: formErrors.id_fonctionnaire ? 'block' : 'none'}}>{formErrors.id_fonctionnaire}</Form.Control.Feedback>
                            </Form.Group>
                        </Row>

                        {/* --- Row 5: Code, Classification_prov, Categorie (V1 Style) --- */}
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={4} controlId="formCode"><Form.Label className="small mb-1 fw-medium">Code <span className="text-danger">*</span></Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Code} required type="number" name="Code" value={formData.Code} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Code}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={4} controlId="formClassification_prov"><Form.Label className="small mb-1 fw-medium">Classification Prov</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Classification_prov} type="text" name="Classification_prov" value={formData.Classification_prov} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Classification_prov}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={4} controlId="formCategorie"><Form.Label className="small mb-1 fw-medium">Categorie</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Categorie} type="text" name="Categorie" value={formData.Categorie} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Categorie}</Form.Control.Feedback></Form.Group>
                        </Row>

                         {/* --- Row 6: Groupe, Rang, Reference (V1 Style) --- */}
                         <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={4} controlId="formGroupe"><Form.Label className="small mb-1 fw-medium">Groupe</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Groupe} type="number" name="Groupe" value={formData.Groupe} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Groupe}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={4} controlId="formRang"><Form.Label className="small mb-1 fw-medium">Rang</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Rang} type="text" name="Rang" value={formData.Rang} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Rang}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={4} controlId="formReference"><Form.Label className="small mb-1 fw-medium">Reference</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Reference} type="text" name="Reference" value={formData.Reference} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Reference}</Form.Control.Feedback></Form.Group>
                        </Row>

                        {/* --- Row 7: File Management (V1 Structure) --- */}
                         <Card className="mb-4 shadow-sm border-light" id="file-management-card">
                            <Card.Header className='bg-light py-2'><h6 className='mb-0 fw-semibold text-secondary'>Gestion des Fichiers</h6></Card.Header>
                            <Card.Body className="pb-3 pt-3">
                                 {isEditing && existingDocuments.length > 0 && ( <> <h6 className="small text-muted mb-2">Fichiers Actuels :</h6> <ListGroup variant="flush" className="mb-3 existing-files-list border rounded-3"> {existingDocuments.map((doc) => ( <ListGroup.Item key={doc.id} className={`d-flex justify-content-between align-items-center px-2 py-1 border-bottom ${documentsToDelete.includes(doc.id) ? 'bg-light text-muted text-decoration-line-through' : ''}`} style={{ transition: 'background-color 0.3s ease' }}> <div className="d-flex align-items-center text-truncate me-2"> <FontAwesomeIcon icon={getFileIcon(doc.type || doc.name)} className="me-2 text-secondary" fixedWidth title={doc.type || 'Type inconnu'}/> {doc.url ? ( <a href={doc.url} target="_blank" rel="noopener noreferrer" title={`Voir ${doc.name}`} className={`text-truncate me-2 small fw-medium ${documentsToDelete.includes(doc.id) ? 'text-muted' : 'link-primary'}`} style={{ maxWidth: '250px' }}> {doc.name} <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" className="ms-1"/> </a> ) : ( <span title={doc.name} className={`text-truncate me-2 small fw-medium ${documentsToDelete.includes(doc.id) ? 'text-muted' : ''}`} style={{ maxWidth: '250px' }}>{doc.name}</span> )} </div> {documentsToDelete.includes(doc.id) ? ( <Button variant="outline-secondary" size="sm" className="flex-shrink-0" onClick={() => handleUnmarkForDeletion(doc.id)} title="Annuler la suppression"><FontAwesomeIcon icon={faUndo} /></Button> ) : ( <Button variant="outline-danger" size="sm" className="flex-shrink-0" onClick={() => handleMarkForDeletion(doc.id)} title="Marquer pour suppression"><FontAwesomeIcon icon={faTrashAlt} /></Button> )} </ListGroup.Item> ))} </ListGroup> {formErrors.fichiers_delete && <Form.Text className="text-danger small d-block mb-2">{formErrors.fichiers_delete}</Form.Text>} </> )}
                                {newFiles.length > 0 && ( <> <h6 className="small text-muted mb-2 mt-3">Nouveaux Fichiers à Ajouter :</h6> <ListGroup variant="flush" className="mb-3 new-files-list border rounded-3"> {newFiles.map((file, index) => ( <ListGroup.Item key={`${file.name}-${file.size}-${index}`} className="d-flex justify-content-between align-items-center px-2 py-1 border-bottom"> <div className="d-flex align-items-center text-truncate me-2"> <FontAwesomeIcon icon={getFileIcon(file.type || file.name)} className="me-2 text-secondary" fixedWidth /> <span className="text-truncate me-2 small" title={file.name} style={{ maxWidth: '250px' }}>{file.name}</span> </div> <Stack direction="horizontal" gap={2} className="align-items-center flex-shrink-0"> <Badge bg="light" text="dark" pill className="small fw-normal">{(file.size / 1024 / 1024).toFixed(2)} Mo</Badge> <Button variant="outline-warning" size="sm" onClick={() => handleRemoveNewFile(index)} title="Retirer ce fichier"><FontAwesomeIcon icon={faTimes} /></Button> </Stack> </ListGroup.Item> ))} </ListGroup> </> )}
                                <Form.Group id="formFichiers" className={`mt-3 text-center ${formErrors.fichiers ? 'is-invalid' : ''}`}> {/* id for scrolling */}
                                    <Form.Label htmlFor="file-upload-input" className="btn btn-outline-secondary rounded-pill shadow-sm px-4 py-2"> <FontAwesomeIcon icon={faPlusCircle} className="me-2" /> {isEditing ? 'Ajouter Fichiers' : 'Sélectionner Fichiers'} </Form.Label>
                                    <Form.Control type="file" id="file-upload-input" multiple onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.doc,.docx,image/*,.xls,.xlsx"/>
                                    <Form.Control.Feedback type="invalid" className="d-block text-center mt-1 small">{formErrors.fichiers}</Form.Control.Feedback>
                                </Form.Group>
                            </Card.Body>
                        </Card>

                        {/* --- Row 8: Objet, Objectifs (V1 Style) --- */}
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={6} controlId="formObjet"><Form.Label className="small mb-1 fw-medium">Objet</Form.Label><Form.Control className={textareaClass} isInvalid={!!formErrors.Objet} as="textarea" rows={1} name="Objet" value={formData.Objet} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Objet}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={6} controlId="formObjectifs"><Form.Label className="small mb-1 fw-medium">Objectifs</Form.Label><Form.Control className={textareaClass} isInvalid={!!formErrors.Objectifs} as="textarea" rows={1} name="Objectifs" value={formData.Objectifs} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Objectifs}</Form.Control.Feedback></Form.Group>
                        </Row>

                        {/* --- Row 9: Costs (V1 Style) --- */}
                        <Row className="mb-4 g-3">
                            <Form.Group as={Col} md={6} controlId="formCout_Global"><Form.Label className="small mb-1 fw-medium">Cout Global (MAD)</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Cout_Global} type="number" step="0.01" min="0" name="Cout_Global" value={formData.Cout_Global} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Cout_Global}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={6} controlId="formCout_CR"><Form.Label className="small mb-1 fw-medium">Cout Part CR (MAD)</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Cout_CR} type="number" step="0.01" min="0" name="Cout_CR" value={formData.Cout_CR} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Cout_CR}</Form.Control.Feedback></Form.Group>
                        </Row>

                        {/* --- Row 10: Observations (V1 field, V2 styling) --- */}
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} controlId="formObservations"><Form.Label className="small mb-1 fw-medium">Observations</Form.Label><Form.Control className={textareaClass} style={{borderRadius: '1rem'}} isInvalid={!!formErrors.observations} as="textarea" rows={3} name="observations" value={formData.observations} onChange={handleChange} size="sm" placeholder="Ajouter des observations ou remarques..."/><Form.Control.Feedback type="invalid">{formErrors.observations}</Form.Control.Feedback></Form.Group>
                        </Row>

                        {/* --- Action Buttons (V1 Style) --- */}
                        <Row className="mt-4 pt-2 justify-content-center flex-shrink-0">
                            <Col xs="auto"> <Button variant="danger" onClick={onClose} className="btn px-5 rounded-5 py-2 shadow-sm" disabled={submissionStatus.loading}> Annuler </Button> </Col>
                            <Col xs="auto"> <Button type="submit" className="btn rounded-5 px-5 py-2 align-items-center d-flex justify-content-evenly bg-primary border-0 shadow-sm" style={{ backgroundColor: '#5cacee', borderColor: '#5cacee'}} disabled={isSubmitDisabled}> {submissionStatus.loading ? ( <><Spinner as="span" animation="border" size="sm" className="me-2"/> {isEditing ? 'Modification...' : 'Validation...'}</> ) : ( isEditing ? 'Enregistrer Modifications' : 'Valider et Créer' )} </Button> </Col>
                        </Row>

                    </Form> {/* --- End Form --- */}
                </div> {/* End Form Content */}
            </div> {/* End Main Container */}

            {/* --- Confirmation Modal (from V2) --- */}
            <Modal show={showConfirmModal} onHide={handleModalCancel} centered backdrop="static" keyboard={false}>
                <Modal.Header closeButton><Modal.Title><FontAwesomeIcon icon={faExclamationTriangle} className="text-warning me-2" /> Confirmation Requise</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>{confirmModalData.message || "Confirmer la suppression des engagements partenaires (et versements associés) ?"}</p>
                    {confirmModalData.details && confirmModalData.details.length > 0 && ( <div className='mb-3'> <p className="mb-1 small text-muted">Engagements concernés :</p> <ListGroup variant="flush" style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem' }}> {confirmModalData.details.map((detail, index) => ( <ListGroup.Item key={index} className="px-2 py-1">{detail}</ListGroup.Item> ))} </ListGroup> </div> )}
                    <p className="fw-bold text-danger mt-3">Cette action est irréversible.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleModalCancel} disabled={submissionStatus.loading}> Annuler </Button>
                    <Button variant="danger" onClick={handleModalConfirm} disabled={submissionStatus.loading}> {submissionStatus.loading ? <Spinner as="span" size="sm" animation="border" className="me-2" /> : null} Confirmer </Button>
                </Modal.Footer>
            </Modal>
            {/* --- End Confirmation Modal --- */}
        </> // End Fragment
    );
};

// --- PropTypes ---
ConventionForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};

// --- Default Props ---
ConventionForm.defaultProps = {
    itemId: null,
    onItemCreated: (createdItem) => { console.log('Convention Created:', createdItem); },
    onItemUpdated: (updatedItem) => { console.log('Convention Updated:', updatedItem); },
    baseApiUrl: 'http://localhost:8000/api',
};

export default ConventionForm;