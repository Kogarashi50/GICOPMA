import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    // Combined Icons
    faSpinner, faExclamationTriangle, faTimes, faTrashAlt, faUndo,
    faFilePdf, faFileWord, faFileExcel, faFileImage, faFileAlt,
    faPlusCircle, faExternalLinkAlt, faUsers 
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import {
    Form, Button, Row, Col, Card, Alert, Spinner,
    ToggleButton, ToggleButtonGroup,
    InputGroup, FormCheck, ListGroup, Badge, Stack, Modal
} from 'react-bootstrap';
import PropTypes from 'prop-types';

// Styles for react-select
const selectStyles = {
    control: (provided, state) => ({
        ...provided, width: '100%', maxWidth: '100%', backgroundColor: '#f8f9fa',
        borderRadius: '1.5rem',
        
        border: state.selectProps.className?.includes('is-invalid') ? '1px solid #dc3545' : (state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'),
        boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
        minHeight: '38px', fontSize: '0.875rem',
    }),
    valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden' }),
    input: (provided) => ({ ...provided, margin: '0px', padding: '0px', fontSize: '0.875rem' }),
    indicatorSeparator: () => ({ display: 'none', }),
    indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }),
    placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }),
    menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e0e0e0', borderRadius: '0.5rem' }),
    multiValueLabel: (provided) => ({ ...provided, color: '#333', fontSize: '0.8rem', paddingRight: '6px' }),
    multiValueRemove: (provided) => ({ ...provided, color: '#555', ':hover': { backgroundColor: '#c0c0c0', color: 'white' } }),
    noOptionsMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    loadingMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
};
const inputClass = "form-control form-control-sm rounded-pill shadow-sm bg-light border";
const textareaClass = "form-control form-control-sm rounded-3 shadow-sm bg-light border";

// --- Helpers ---
const parseCurrency = (value) => { if (typeof value !== 'string') return Number(value) || 0; const cleaned = value.replace(/[\s\u00A0]/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.'); const number = parseFloat(cleaned); return isNaN(number) ? 0 : number; };
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
const safeParseInt = (value) => { if (value === null || value === undefined) return null; const parsed = parseInt(String(value), 10); return Number.isInteger(parsed) ? parsed : null; };
const getFileIcon = (filenameOrMimeType) => { if (!filenameOrMimeType) return faFileAlt; const lowerCase = String(filenameOrMimeType).toLowerCase(); if (lowerCase.includes('pdf')) return faFilePdf; if (lowerCase.includes('doc')) return faFileWord; if (lowerCase.includes('xls')) return faFileExcel; if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage; return faFileAlt; };

// --- Component ---
const ConventionForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated, baseApiUrl = 'http://localhost:8000/api' }) => {
    const [formData, setFormData] = useState({
        Code: '', Classification_prov: '', Categorie: '', Intitule: '', Reference: '',
        Annee_Convention: '', Objet: '', Objectifs: '', provinces: [], Maitre_Ouvrage: '',
        Cout_Global: '', Statut: null, Operationalisation: 'Non', Groupe: '', Rang: '',
        programmeId: null, projetId: null, observations: '',
        fonctionnaires: [],
        type: 'specifique', 
        date_reception_vise: '',
        duree_convention: '',
        maitre_ouvrage_delegue: '',
        membres_comite_technique: [],
        membres_comite_pilotage: [],        
        numero_approbation: '',
        session: '',
        date_visa: '',
    });
    const [selectedPartnerDetails, setSelectedPartnerDetails] = useState([]);
    const [programmesOptions, setProgrammesOptions] = useState([]);
    const [provincesOptions, setProvincesOptions] = useState([]);
    const [allPartenairesOptions, setAllPartenairesOptions] = useState([]);
    const [projetsOptions, setProjetsOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState({ programmes: true, partenaires: true, provinces: true, projets: true, fonctionnaires: true });
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(!!itemId);
    const [existingDocuments, setExistingDocuments] = useState([]);
    const [newFiles, setNewFiles] = useState([]);
    const [documentsToDelete, setDocumentsToDelete] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState({ message: '', details: [] });
    const [dataToResubmit, setDataToResubmit] = useState(null);

    const isEditing = useMemo(() => itemId !== null, [itemId]);
    const optionsFinishedLoading = useMemo(() => !loadingOptions.programmes && !loadingOptions.partenaires && !loadingOptions.provinces && !loadingOptions.projets && !loadingOptions.fonctionnaires, [loadingOptions]);
    const storageBaseUrl = useMemo(() => baseApiUrl.replace('/api', ''), [baseApiUrl]);
    const STATUT_OPTIONS = useMemo(() => [  { value: "en cours d'approbation", label: "En Cours d'Approbation", color: "warning" }, { value: "approuvé", label: "Approuvé", color: "success" }, { value: "non visé", label: "Non Visé", color: "danger" }, { value: "en cours de visa", label: "En Cours de Visa", color: "warning" }, { value: "visé", label: "Visé", color: "info" }, { value: "non signé", label: "Non Signé", color: "secondary"}, { value: "en cours de signature", label: "En Cours de Signature", color: "warning" }, { value: "signé", label: "Signé", color: "primary" } ], []);
    const groupedStatutOptions = useMemo(() => { const groups = []; const groupLabels = ["Approbation", "Visa", "Signature"]; const groupSize = 3; for (let i = 0; i < STATUT_OPTIONS.length; i += groupSize) { groups.push({ label: groupLabels[Math.floor(i / groupSize)], options: STATUT_OPTIONS.slice(i, i + groupSize) }); } return groups; }, [STATUT_OPTIONS]);

    const fetchOptions = useCallback(async () => {
        console.log("Fetching options using /api/options/...");
        setLoadingOptions({ programmes: true, partenaires: true, provinces: true, projets: true, fonctionnaires: true });
        try {
            const [progRes, partRes, provRes, projRes, foncRes] = await Promise.all([
                axios.get(`${baseApiUrl}/options/programmes`, { withCredentials: true }),    // MODIFIED URL
                axios.get(`${baseApiUrl}/options/partenaires`, { withCredentials: true }),   // MODIFIED URL
                axios.get(`${baseApiUrl}/options/provinces`, { withCredentials: true }),     // MODIFIED URL
                axios.get(`${baseApiUrl}/options/projets`, { withCredentials: true }),       // MODIFIED URL
                axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true }) // MODIFIED URL
            ]);

            // This mapping assumes backend /options routes might return data nested (e.g. { "programmes": [...]})
            // OR directly as an array. The `|| res.data || []` handles both.
            // If ALL /options routes CONSISTENTLY return the array directly, you can simplify
            // e.g., setProgrammesOptions(progRes.data || []);
            setProgrammesOptions((progRes.data.programmes || progRes.data || []).map(p => ({ value: p.Id || p.id || p.value , label: p.Description || p.label })));
            setAllPartenairesOptions((partRes.data.partenaires || partRes.data || []).map(p => ({ value: p.Id || p.value, label: p.Description_Arr || p.Description || p.label || `Partenaire ID ${p.Id || p.value}` })));
            
            // For provinces, if your ProvinceController::getOptions returns [{value,label}] directly:
            setProvincesOptions(provRes.data || []); 
            // If ProvinceController::getOptions returns { "provinces": [...] }:
            // setProvincesOptions((provRes.data.provinces || provRes.data || []).map(p => ({ value: p.Id || p.value, label: p.Description || p.Code || p.label })));

            setProjetsOptions((projRes.data.projets || projRes.data || []).map(p => ({ value: p.ID_Projet || p.value, label: (p.Code_Projet ? `${p.Code_Projet} - ` : '') + (p.Nom_Projet || p.label || 'N/A') })));
            setFonctionnairesOptions((foncRes.data.fonctionnaires || foncRes.data || []).map(f => ({ value: f.id || f.value, label: f.nom_complet || f.label || `ID ${f.id || f.value}` })));
            
            console.log("Options loaded via /api/options/.");
        } catch (err) { 
            console.error("Erreur chargement options via /api/options/:", err); 
            setSubmissionStatus(prev => ({ ...prev, error: "Erreur chargement des listes pour le formulaire." })); 
        }
        finally { setLoadingOptions({ programmes: false, partenaires: false, provinces: false, projets: false, fonctionnaires: false }); }
    }, [baseApiUrl]);

    useEffect(() => { fetchOptions(); }, [fetchOptions]);

    useEffect(() => {
        if (!itemId || !optionsFinishedLoading) { if (!itemId) setLoadingData(false); return; }
        let isMounted = true;
        const fetchConventionData = async () => {
            console.log(`[Form Edit Load] Fetching data ID: ${itemId}`);
            setLoadingData(true);
            setSubmissionStatus({ loading: false, error: null, success: false });
            setFormErrors({}); setExistingDocuments([]); setNewFiles([]); setDocumentsToDelete([]);
            setDataToResubmit(null); setShowConfirmModal(false);
            try {
                const response = await axios.get(`${baseApiUrl}/conventions/${itemId}`, { withCredentials: true });
                const data = response.data.convention || response.data;
                console.log(data)
                if (!isMounted) return;
                if (!data || typeof data !== 'object') throw new Error(`Format de réponse invalide ID ${itemId}.`);
                
                const findOption = (options, valueToFind, valueKey = 'value') => options?.find(opt => String(opt[valueKey]).toLowerCase() === String(valueToFind).toLowerCase()) || null;
                const findMultiOptions = (options, valuesString, valueKey = 'value') => { if (!valuesString || typeof valuesString !== 'string' || !options?.length) return []; const selectedValues = valuesString.split(';').map(v => String(v).trim().toLowerCase()).filter(v => v); return options.filter(opt => selectedValues.includes(String(opt[valueKey]).toLowerCase())); };

                const selectedStatutOption = findOption(STATUT_OPTIONS, data.Statut, 'value');
                const selectedProgrammeOption = findOption(programmesOptions, data.Id_Programme || data.id_programme || data.programme?.Id);
                const selectedProjetOption = findOption(projetsOptions, data.id_projet || data.ID_Projet || data.projet?.ID_Projet); // Corrected key
                const selectedProvinceOptions = findMultiOptions(provincesOptions, data.localisation);
                const selectedFonctionnaireOptions = findMultiOptions(fonctionnairesOptions, data.id_fonctionnaire);

                setFormData({
                    Code: String(data.Code ?? ''), 
                    // === ADD THESE TWO LINES ===
                    numero_approbation: String(data.numero_approbation ?? ''),
                    date_reception_vise: data.date_reception_vise || '',
                    duree_convention: String(data.duree_convention ?? ''),
                    maitre_ouvrage_delegue: String(data.maitre_ouvrage_delegue ?? ''),
                    session: String(data.session ?? ''),
                    type: String(data.type ?? ''), 
                    membres_comite_technique: (data.membres_comite_technique || []).map(member => ({ value: member, label: member })),
                    membres_comite_pilotage: (data.membres_comite_pilotage || []).map(member => ({ value: member, label: member })),
                    // === END OF ADDITION ===
                    Classification_prov: String(data.Classification_prov ?? ''), 
                    Categorie: String(data.Categorie ?? ''), 
                    Intitule: String(data.Intitule ?? ''), 
                    Reference: String(data.Reference ?? ''), 
                    Annee_Convention: String(data.Annee_Convention ?? ''), 
                    Objet: String(data.Objet ?? ''), 
                    Objectifs: String(data.Objectifs ?? ''), 
                    Maitre_Ouvrage: String(data.Maitre_Ouvrage ?? ''), 
                    Cout_Global: String(data.Cout_Global ?? ''), 
                    Statut: selectedStatutOption, 
                    date_visa: data.date_visa || '', // <-- ADD THIS LINE
                    Operationalisation: String(data.Operationalisation ?? ''), 
                    Groupe: String(data.Groupe ?? ''), Rang: String(data.Rang ?? ''), observations: String(data.observations ?? ''), provinces: selectedProvinceOptions, programmeId: selectedProgrammeOption, projetId: selectedProjetOption, fonctionnaires: selectedFonctionnaireOptions
                });

                const commitmentsArray = data.partner_commitments || [];
                setSelectedPartnerDetails(commitmentsArray.map(commit => ({
                     tempId: generateTempId(), 
                     id: commit.Id_Partenaire, 
                     Id_CP: safeParseInt(commit.Id_CP), 
                     label: commit.label || `Partenaire ID ${commit.Id_Partenaire}`,
                    engagement_type: (commit.autre_engagement) ? 'autre' : 'financier',
                    montant: String(commit.Montant_Convenu ?? ''),
                    autre_engagement: commit.autre_engagement || '',                      is_signatory: !!commit.is_signatory,
                     date_signature: commit.date_signature || '',
                     details_signature: commit.details_signature || '',
                })));
                
                const fetchedDocs = data.documents || [];
                setExistingDocuments(fetchedDocs.map(doc => ({ id: doc.Id_Doc, name: doc.file_name || `Document ${doc.Id_Doc}`, url: doc.url || null, type: doc.file_type, })));
                
            } catch (err) { console.error("Erreur chargement données convention:", err); if (isMounted) setSubmissionStatus({ loading: false, error: err.response?.data?.message || err.message || "Erreur chargement données.", success: false }); }
            finally { if (isMounted) setLoadingData(false); }
        };
        fetchConventionData();
        return () => { isMounted = false; };
    }, [itemId, baseApiUrl, optionsFinishedLoading, allPartenairesOptions, programmesOptions, provincesOptions, projetsOptions, STATUT_OPTIONS, storageBaseUrl, fonctionnairesOptions]);

    useEffect(() => {
        if (!isEditing && optionsFinishedLoading) {
            setFormData({ Code: '', Classification_prov: '',type: 'specifique', Categorie: '', Intitule: '', Reference: '', Annee_Convention: '', Objet: '', Objectifs: '', provinces: [], Maitre_Ouvrage: '', Cout_Global: '', date_reception_vise: '', duree_convention: '', maitre_ouvrage_delegue: '' , Statut: null, Operationalisation: 'Non', Groupe: '', Rang: '', programmeId: null, projetId: null, observations: '', fonctionnaires: [], numero_approbation: '', session: '', date_visa: '' , membres_comite_technique: [], membres_comite_pilotage: []}); // <-- ADD NEW FIELDS TO RESET
            setSelectedPartnerDetails([]); setFormErrors({}); setSubmissionStatus({ loading: false, error: null, success: false }); setLoadingData(false);
            setExistingDocuments([]); setNewFiles([]); setDocumentsToDelete([]);
            setDataToResubmit(null); setShowConfirmModal(false);
        }
    }, [isEditing, optionsFinishedLoading]);

    const validateForm = () => {
        const errors = {};
        if (!formData.Intitule?.trim()) errors.Intitule = "Intitulé requis.";
        if (!formData.Annee_Convention) errors.Annee_Convention = "Année requise.";
       else if (isNaN(parseInt(formData.Annee_Convention)) || String(formData.Annee_Convention).length !== 4) errors.Annee_Convention = "Année invalide (YYYY).";
        if (!formData.type) errors.type = "Le type de convention est requis."; 
        if (!formData.numero_approbation?.trim()) errors.numero_approbation = "Le numéro d'approbation est requis.";
        if (!formData.session) errors.session = "La session est requise.";
        if (!formData.Statut) errors.Statut = "Statut requis.";
        if (formData.Cout_Global && isNaN(parseCurrency(formData.Cout_Global))) errors.Cout_Global = "Coût Global doit être un nombre.";
        if (formData.Groupe && isNaN(parseInt(formData.Groupe))) errors.Groupe = "Groupe doit être un nombre entier.";
        if (selectedPartnerDetails.length > 0) {
            selectedPartnerDetails.forEach((p) => {
                const amount = parseCurrency(p.montant);
                if (p.montant !== '' && (isNaN(amount) || amount < 0)) errors[`montant_${p.id}`] = `Montant invalide pour ${p.label}.`;
                if (p.is_signatory && !p.date_signature) errors[`date_sig_${p.id}`] = `Date signature requise pour ${p.label} (signataire).`;
            });
        }
        if (formData.observations && formData.observations.length > 20000) errors.observations = "Observations max 20000 caractères.";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
     };

    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: undefined })); };
    const handleProgrammeChange = (selectedOption) => { setFormData(prev => ({ ...prev, programmeId: selectedOption })); if (formErrors.Id_Programme) setFormErrors(prev => ({ ...prev, Id_Programme: undefined })); };
    // Add these new handlers to ConventionForm.jsx

const handleEngagementTypeChange = (tempId, type) => {
    setSelectedPartnerDetails(prevDetails =>
        prevDetails.map(p => {
            if (p.tempId === tempId) {
                // When switching, clear the other field's value
                const updatedPartner = { ...p, engagement_type: type };
                if (type === 'financier') {
                    updatedPartner.autre_engagement = '';
                } else {
                    updatedPartner.montant = '';
                }
                return updatedPartner;
            }
            return p;
        })
    );
};

const handleAutreEngagementChange = (tempId, value) => {
    setSelectedPartnerDetails(prevDetails =>
        prevDetails.map(p => (p.tempId === tempId ? { ...p, autre_engagement: value } : p))
    );
};
const handleTypeToggleChange = (value) => {
    // Create a copy of the previous state to modify
    let updatedFormData = { ...formData, type: value };

    // If the type changes, reset the non-relevant field
    if (value === 'cadre') {
        updatedFormData.projetId = null; // Clear projet
    } else if (value === 'specifique') {
        updatedFormData.programmeId = null; // Clear programme
    }

    setFormData(updatedFormData);

    // Clear any potential validation errors
    if (formErrors.type) setFormErrors(prev => ({ ...prev, type: undefined }));
    if (formErrors.Id_Programme) setFormErrors(prev => ({ ...prev, Id_Programme: undefined }));
    if (formErrors.Id_Projet) setFormErrors(prev => ({ ...prev, Id_Projet: undefined }));
};
    const handleProvinceChange = (selectedOptions) => { setFormData(prev => ({ ...prev, provinces: selectedOptions || [] })); if (formErrors.Province) setFormErrors(prev => ({ ...prev, Province: undefined })); };
    const handleStatutChange = (selectedOption) => { setFormData(prev => ({ ...prev, Statut: selectedOption , date_visa: selectedOption?.value === 'visé' ? prev.date_visa : '' })); if (formErrors.Statut) setFormErrors(prev => ({ ...prev, Statut: undefined })); };
    const handleProjetChange = (selectedOption) => { setFormData(prev => ({ ...prev, projetId: selectedOption })); if (formErrors.Id_Projet) { setFormErrors(prev => ({ ...prev, Id_Projet: undefined })); } };
    const handleFonctionnaireChange = (selectedOptions) => { setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] })); if (formErrors.id_fonctionnaire) { setFormErrors(prev => ({ ...prev, id_fonctionnaire: undefined })); } };
    const handleFileChange = (e) => { const files = Array.from(e.target.files); if (files.length > 0) { setNewFiles(prev => { const currentIdentifiers = new Set(prev.map(f => `${f.name}_${f.size}`)); const newlyAdded = files.filter(f => !currentIdentifiers.has(`${f.name}_${f.size}`)); return [...prev, ...newlyAdded]; }); if (formErrors.fichiers) setFormErrors(prev => ({ ...prev, fichiers: undefined })); } e.target.value = null; };
    const handleRemoveNewFile = (indexToRemove) => { setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove)); };
    const handleMarkForDeletion = (docId) => { setDocumentsToDelete(prev => [...new Set([...prev, docId])]); };
    const handleUnmarkForDeletion = (docId) => { setDocumentsToDelete(prev => prev.filter(id => id !== docId)); if (formErrors.fichiers_delete) setFormErrors(prev => ({ ...prev, fichiers_delete: undefined })); };
    const handlePartnerSelectionChange = (selectedOptions) => { const newSelectedPartnersOptions = selectedOptions || []; setSelectedPartnerDetails(prevDetails => { const keptDetails = prevDetails.filter(detail => newSelectedPartnersOptions.some(opt => opt.value === detail.id)); 
        const addedDetails = newSelectedPartnersOptions.filter(option => !prevDetails.some(detail => detail.id === option.value)).map(option => ({ tempId: generateTempId(), id: option.value, Id_CP: null, label: option.label, montant: '',engagement_type: 'financier',autre_engagement: '', is_signatory: false, date_signature: '', details_signature: '', })); return [...keptDetails, ...addedDetails]; }); if (formErrors.partenaires) setFormErrors(prev => ({ ...prev, partenaires: undefined })); if (formErrors.signatories) setFormErrors(prev => ({ ...prev, signatories: undefined })); const newPartnerIds = newSelectedPartnersOptions.map(opt => opt.value); setFormErrors(prev => { const nextErrors = { ...prev }; Object.keys(nextErrors).forEach(key => { const matchAmount = key.match(/^montant_(\d+)$/); const matchDate = key.match(/^date_sig_(\d+)$/); const matchDetails = key.match(/^details_sig_(\d+)$/); const partnerIdStr = matchAmount?.[1] || matchDate?.[1] || matchDetails?.[1]; if (partnerIdStr && !newPartnerIds.includes(parseInt(partnerIdStr, 10))) delete nextErrors[key]; }); return nextErrors; }); };
    const handleCommitmentChange = (tempId, value) => { setSelectedPartnerDetails(prevDetails => prevDetails.map(p => p.tempId === tempId ? { ...p, montant: value } : p)); const partnerId = selectedPartnerDetails.find(p=>p.tempId === tempId)?.id; if(partnerId) { const errorKey = `montant_${partnerId}`; if (formErrors[errorKey]) setFormErrors(prev => ({ ...prev, [errorKey]: undefined })); } };
    const handleSignatoryChange = (tempId, isChecked) => { setSelectedPartnerDetails(prevDetails => prevDetails.map(p => p.tempId === tempId ? { ...p, is_signatory: isChecked, date_signature: isChecked ? p.date_signature : '', details_signature: isChecked ? p.details_signature : '' } : p)); const partnerId = selectedPartnerDetails.find(p=>p.tempId === tempId)?.id; if(partnerId){ if (isChecked && formErrors.signatories) setFormErrors(prev => ({ ...prev, signatories: undefined })); const dateErrorKey = `date_sig_${partnerId}`; const detailsErrorKey = `details_sig_${partnerId}`; if (!isChecked && formErrors[dateErrorKey]) setFormErrors(prev => ({ ...prev, [dateErrorKey]: undefined })); if (!isChecked && formErrors[detailsErrorKey]) setFormErrors(prev => ({ ...prev, [detailsErrorKey]: undefined })); } };
    const handleSignatureDateChange = (tempId, value) => { setSelectedPartnerDetails(prevDetails => prevDetails.map(p => p.tempId === tempId ? { ...p, date_signature: value } : p)); const partnerId = selectedPartnerDetails.find(p=>p.tempId === tempId)?.id; if(partnerId) { const errorKey = `date_sig_${partnerId}`; if (formErrors[errorKey]) setFormErrors(prev => ({ ...prev, [errorKey]: undefined })); } };
    const handleSignatureDetailsChange = (tempId, value) => { setSelectedPartnerDetails(prevDetails => prevDetails.map(p => p.tempId === tempId ? { ...p, details_signature: value } : p)); const partnerId = selectedPartnerDetails.find(p=>p.tempId === tempId)?.id; if(partnerId) { const errorKey = `details_sig_${partnerId}`; if (formErrors[errorKey]) setFormErrors(prev => ({ ...prev, [errorKey]: undefined })); } };
    const handleModalConfirm = () => { setShowConfirmModal(false); if (dataToResubmit) { executeSubmit(dataToResubmit, true); } else { setSubmissionStatus({ loading: false, error: "Erreur interne: Impossible de confirmer.", success: false }); } };
    const handleModalCancel = () => { setShowConfirmModal(false); setDataToResubmit(null); setSubmissionStatus({ loading: false, error: "Mise à jour annulée par l'utilisateur après demande de confirmation.", success: false }); };

    const executeSubmit = async (formDataPayload, confirmDelete = false) => {
        setSubmissionStatus({ loading: true, error: null, success: false });
        setFormErrors({}); 
        setDataToResubmit(null); 

        if (confirmDelete) {
            formDataPayload.append('confirm_delete_commitments', '1');
        } else {
            if(formDataPayload.has('confirm_delete_commitments')) {
                 formDataPayload.delete('confirm_delete_commitments');
            }
        }

        const url = isEditing ? `${baseApiUrl}/conventions/${itemId}` : `${baseApiUrl}/conventions`;
        const config = { headers: { 'Accept': 'application/json' }, withCredentials: true };
        if (isEditing) formDataPayload.append('_method', 'PUT');

        try {
            const response = await axios.post(url, formDataPayload, config);
            setSubmissionStatus({ loading: false, error: null, success: true });
            const returnedConvention = response.data.convention;
            if (isEditing) { onItemUpdated?.(returnedConvention); } 
            else { onItemCreated?.(returnedConvention); }
            setTimeout(onClose, 1500); 
        } catch (err) {
            let errorMsg = `Une erreur s'est produite lors de la soumission.`;
            if (err.response) {
                if (err.response.status === 409 && err.response.data?.requires_confirmation) {
                    setSubmissionStatus({ loading: false, error: null, success: false }); 
                    setConfirmModalData({ message: err.response.data.message || "Confirmation requise.", details: err.response.data.details || [] });
                    setDataToResubmit(formDataPayload); 
                    setShowConfirmModal(true); 
                    return; 
                }
                errorMsg = err.response.data?.message || `Erreur serveur (${err.response.status})`;
                 if (err.response.status === 422 && typeof err.response.data.errors === 'object') {
                       const serverErrors = err.response.data.errors;
                       const mappedErrors = {}; 
                       const partnerCommitmentsPayload = JSON.parse(formDataPayload.get('partner_commitments') || '[]');
                       Object.keys(serverErrors).forEach(key => {
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
                                        else if (field === 'id_cp') mappedErrors['partenaires'] = (mappedErrors['partenaires'] || '') + ` Err Eng P.${partnerId}: ${serverErrors[key].join(' ')}`;
                                        else mappedErrors['partenaires'] = (mappedErrors['partenaires'] || '') + serverErrors[key].join(' ');
                                    } else { mappedErrors['partenaires'] = (mappedErrors['partenaires'] || '') + ` Err eng #${index+1}: ` + serverErrors[key].join(' '); }
                                } else { mappedErrors['partenaires'] = (mappedErrors['partenaires'] || '') + serverErrors[key].join(' '); }
                            } else if (key === 'partner_commitments') { mappedErrors['partenaires'] = serverErrors[key].join(' '); }
                            else if (key.startsWith('fichiers.') || key === 'fichiers') { mappedErrors.fichiers = (mappedErrors.fichiers || '') + serverErrors[key].join(' ') + ' '; }
                            else if (key.startsWith('deleted_document_ids.') || key === 'deleted_document_ids') { mappedErrors.fichiers_delete = (mappedErrors.fichiers_delete || '') + serverErrors[key].join(' ') + ' '; }
                            else if (key === 'id_fonctionnaire') mappedErrors['id_fonctionnaire'] = serverErrors[key].join(' ');
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
    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("DEBUG: State on Submit:", formData);
        setShowConfirmModal(false); 
        if (!validateForm()) {
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs indiquées.", success: false });
             const firstErrorKey = Object.keys(formErrors)[0]; let errorElementId = `form${firstErrorKey}`; if (firstErrorKey?.startsWith('montant_') || firstErrorKey?.startsWith('date_sig_') || firstErrorKey?.startsWith('details_sig_')) { errorElementId = `formDetail_${firstErrorKey.split('_').pop()}`; } else if (['Province', 'Id_Programme', 'Id_Projet', 'partenaires', 'Statut', 'id_fonctionnaire'].includes(firstErrorKey)) { errorElementId = `form${firstErrorKey}`; } else if (firstErrorKey === 'fichiers' || firstErrorKey === 'fichiers_delete') { errorElementId = 'file-management-card'; } const elementToScroll = document.getElementById(errorElementId); if (elementToScroll) { elementToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' }); } else { window.scrollTo({ top: 0, behavior: 'smooth' }); }
            return;
        }
        const dataPayload = new FormData();
        const comiteTechnique = formData.membres_comite_technique.map(member => member.value);
dataPayload.append('membres_comite_technique', JSON.stringify(comiteTechnique));
const comitePilotage = formData.membres_comite_pilotage.map(member => member.value);
dataPayload.append('membres_comite_pilotage', JSON.stringify(comitePilotage));
        dataPayload.append('code', formData.Code);
        dataPayload.append('type', formData.type); // Add this line

        dataPayload.append('intitule', formData.Intitule);
        dataPayload.append('annee_convention', formData.Annee_Convention);
        dataPayload.append('statut', formData.Statut?.value ?? '');
        dataPayload.append('classification_prov', formData.Classification_prov ?? '');
        dataPayload.append('categorie', formData.Categorie ?? '');
        dataPayload.append('reference', formData.Reference ?? '');
        dataPayload.append('objet', formData.Objet ?? '');
        dataPayload.append('date_visa', formData.date_visa ?? ''); // <-- ADD THIS LINE
        dataPayload.append('date_reception_vise', formData.date_reception_vise ?? '');
        dataPayload.append('duree_convention', formData.duree_convention ?? '');
        dataPayload.append('maitre_ouvrage_delegue', formData.maitre_ouvrage_delegue ?? '');
        dataPayload.append('objectifs', formData.Objectifs ?? '');
        dataPayload.append('maitre_ouvrage', formData.Maitre_Ouvrage ?? '');
        const partenaireIdsString = selectedPartnerDetails.map(p => p.id).join(';');
        dataPayload.append('partenaire', partenaireIdsString);
        dataPayload.append('operationalisation', formData.Operationalisation ?? '');
        dataPayload.append('groupe', formData.Groupe ?? '');
        dataPayload.append('rang', formData.Rang ?? '');
        dataPayload.append('observations', formData.observations ?? '');
        dataPayload.append('cout_global', formData.Cout_Global ? parseCurrency(formData.Cout_Global) : '');
        dataPayload.append('Id_Programme', formData.programmeId?.value ?? '');
        dataPayload.append('id_projet', formData.projetId?.value ?? '');
        dataPayload.append('session', formData.session ?? '');
        dataPayload.append('numero_approbation', formData.numero_approbation ?? '');

        const provinceIds = formData.provinces.map(p => p.value).join(';');
        dataPayload.append('localisation', provinceIds);
        const fonctionnaireIds = formData.fonctionnaires.map(f => f.value).join(';');
        dataPayload.append('id_fonctionnaire', fonctionnaireIds);
        const partnerCommitmentsPayload = selectedPartnerDetails.map(p => {
            let commitment = {
                Id_Partenaire: p.id,
Montant_Convenu: p.engagement_type === 'financier' && p.montant ? parseCurrency(p.montant) : null,
        autre_engagement: p.engagement_type === 'autre' && p.autre_engagement ? p.autre_engagement : null,                is_signatory: p.is_signatory,
                date_signature: p.is_signatory && p.date_signature ? p.date_signature : null,
                details_signature: p.is_signatory && p.details_signature ? p.details_signature : null,
            };
            if (isEditing && p.Id_CP !== null && p.Id_CP !== undefined) {
                commitment.id_cp = p.Id_CP;
            }
            return commitment;
        });
        dataPayload.append('partner_commitments', JSON.stringify(partnerCommitmentsPayload));
        if (newFiles.length > 0) { newFiles.forEach((file) => dataPayload.append('fichiers[]', file)); }
        if (isEditing && documentsToDelete.length > 0) { dataPayload.append('deleted_document_ids', JSON.stringify(documentsToDelete)); }
        executeSubmit(dataPayload, false);
    };

    const isSubmitDisabled = submissionStatus.loading || loadingData || Object.values(loadingOptions).some(l => l);
    if (loadingOptions.programmes || loadingOptions.partenaires || loadingOptions.provinces || loadingOptions.projets || loadingOptions.fonctionnaires || (isEditing && loadingData)) {
        return ( <div className="d-flex justify-content-center align-items-center p-5" style={{minHeight: '400px'}}> <Spinner animation="border" variant="primary" /> <span className='ms-3 text-muted'>Chargement...</span> </div> );
    }

    return (
        <>
            <div className="p-4" style={{ backgroundColor: '#fff', borderRadius: '15px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto'}}>
                 <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0 border-bottom pb-2">
                    <div><h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier la' : 'Créer une nouvelle'}</h5><h2 className="mb-0 fw-bold">Convention {isEditing ? `(Code: ${formData.Code})` : ''}</h2></div>
                    <Button variant="light" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold' onClick={onClose} size="sm" title="Retour">Revenir a la liste</Button>
                </div>
                <div className="flex-grow-1">
                     {submissionStatus.error && <Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({...prev, error: null}))}><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}</Alert>}
                     {submissionStatus.success && <Alert variant="success" className="mb-3 py-2">Convention {isEditing ? 'modifiée' : 'créée'} avec succès !</Alert>}
                    <Form noValidate onSubmit={handleSubmit}>
                      {/* === REPLACE THE OLD CARD WITH THIS NEW, IMPROVED VERSION === */}
<Card className=" shadow-none border-0">
    <Card.Body  style={{ paddingInline: '0.75rem' }}>
        <Row className="align-items-center text-center">
            
            <Col>
                <ToggleButtonGroup
                    type="radio"
                    name="type"
                    value={formData.type}
                    onChange={handleTypeToggleChange}
                    className="w-50 "
                >
                    <ToggleButton
                        id="type-toggle-cadre"
                        value="cadre"
                        variant="outline-warning"
                        className="w-20 rounded m-3 shadow-sm"
                    >
                        <span className='text-dark'>Convention Cadre</span>
                    </ToggleButton>
                    <div className="w-20"></div>
                    <ToggleButton
                        id="type-toggle-specifique"
                        value="specifique"
                        variant="outline-warning"
                        className="w-20 rounded m-3 shadow-sm"
                    >
                        <span className='text-dark'>Convention Spécifique</span>
                    </ToggleButton>
                </ToggleButtonGroup>
                 {formErrors.type && (
                     <div className="d-block invalid-feedback text-white mt-2 text-center">
                        {formErrors.type}
                    </div>
                )}
            </Col>
        </Row>
    </Card.Body>
</Card>
                         <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={8} controlId="formIntitule"><Form.Label className="small mb-1 fw-medium">Intitule <span className="text-danger">*</span></Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Intitule} required as="textarea" rows={1} name="Intitule" value={formData.Intitule} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Intitule}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={4} controlId="formAnnee_Convention"><Form.Label className="small mb-1 fw-medium">Annee Convention <span className="text-danger">*</span></Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Annee_Convention} required type="number" name="Annee_Convention" value={formData.Annee_Convention} onChange={handleChange} size="sm" placeholder="YYYY" min="1900" max={new Date().getFullYear() + 10}/><Form.Control.Feedback type="invalid">{formErrors.Annee_Convention}</Form.Control.Feedback></Form.Group>
                        </Row>
                                            
                                                <Row className="mb-3 g-3">
                                                    <Form.Group as={Col} md={6} controlId="formNumeroApprobation">
                                                        <Form.Label className="small mb-1 fw-medium">Numéro d'approbation <span className="text-danger">*</span></Form.Label>
                                                        <Form.Control 
                                                            className={inputClass} 
                                                            isInvalid={!!formErrors.numero_approbation} 
                                                            type="text" 
                                                            name="numero_approbation" 
                                                            value={formData.numero_approbation} 
                                                            onChange={handleChange} 
                                                            size="sm"
                                                        />
                                                        <Form.Control.Feedback type="invalid">{formErrors.numero_approbation}</Form.Control.Feedback>
                                                    </Form.Group>
                                                    <Form.Group as={Col} md={6} controlId="formSession">
                                                        <Form.Label className="small mb-1 fw-medium">Session (Mois) <span className="text-danger">*</span></Form.Label>
                                                        <Form.Select
                                                            className={inputClass}
                                                            name="session"
                                                            value={formData.session}
                                                            onChange={handleChange}
                                                            isInvalid={!!formErrors.session}
                                                            size="sm"
                                                        >
                                                            <option value="">Sélectionner un mois</option>
                                                            <option value="1">Janvier</option>
                                                            <option value="2">Février</option>
                                                            <option value="3">Mars</option>
                                                            <option value="4">Avril</option>
                                                            <option value="5">Mai</option>
                                                            <option value="6">Juin</option>
                                                            <option value="7">Juillet</option>
                                                            <option value="8">Août</option>
                                                            <option value="9">Septembre</option>
                                                            <option value="10">Octobre</option>
                                                            <option value="11">Novembre</option>
                                                            <option value="12">Décembre</option>
                                                        </Form.Select>
                                                        <Form.Control.Feedback type="invalid">{formErrors.session}</Form.Control.Feedback>
                                                    </Form.Group>
                                                </Row>
                                 
                                                   
                        <Card className="mb-4 shadow-sm border-light ">
                            <Card.Header className='bg-light py-2'><h6 className='mb-0 fw-semibold text-secondary '>Partenaires & Engagements</h6></Card.Header>
                            <Card.Body className="pb-2 pt-3">
                                <Form.Group as={Row} className="mb-3" id="formPartenaires">
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
    {/* Column for Engagement Type Switch */}
    <Col sm={12} md={4} className="mb-2 mb-md-0">
        <Form.Group>
            <Form.Label className="small mb-1 fw-medium text-muted">Type d'engagement</Form.Label>
            <ToggleButtonGroup
                type="radio"
                name={`engagement-type-${partner.tempId}`}
                value={partner.engagement_type}
                onChange={(type) => handleEngagementTypeChange(partner.tempId, type)}
                size="sm"
                className="d-flex"
            >
                <ToggleButton id={`type-financier-${partner.tempId}`} value="financier" variant="outline-secondary" className="w-100">
                    Financier
                </ToggleButton>
                <ToggleButton id={`type-autre-${partner.tempId}`} value="autre" variant="outline-secondary" className="w-100">
                    Autre Nature
                </ToggleButton>
            </ToggleButtonGroup>
        </Form.Group>
    </Col>

    {/* Column for the Conditional Input (Montant or Autre Engagement) */}
    <Col sm={12} md={5} className="mb-2 mb-md-0">
        {partner.engagement_type === 'financier' ? (
            <Form.Group>
                <Form.Label className="small mb-1 fw-medium text-muted">Montant (MAD)</Form.Label>
                <InputGroup size="sm" className="flex-nowrap">
                    <Form.Control
                        type="number" step="0.01" min="0"
                        value={partner.montant}
                        onChange={(e) => handleCommitmentChange(partner.tempId, e.target.value)}
                        placeholder="Montant convenu"
                        className="form-control-sm rounded-start-pill shadow-sm bg-white border-1"
                        isInvalid={!!formErrors[`montant_${partner.id}`]}
                    />
                    <InputGroup.Text className="rounded-end-pill">MAD</InputGroup.Text>
                    <Form.Control.Feedback type="invalid">{formErrors[`montant_${partner.id}`]}</Form.Control.Feedback>
                </InputGroup>
            </Form.Group>
        ) : (
            <Form.Group>
                <Form.Label className="small mb-1 fw-medium text-muted">Description de l'engagement</Form.Label>
                <Form.Control
                    as="textarea" rows={1}
                    value={partner.autre_engagement}
                    onChange={(e) => handleAutreEngagementChange(partner.tempId, e.target.value)}
                    placeholder="Ex: Mise à disposition du terrain..."
                    className="form-control-sm rounded-3 shadow-sm bg-white border-1"
                    isInvalid={!!formErrors[`autre_engagement_${partner.id}`]}
                />
                <Form.Control.Feedback type="invalid">{formErrors[`autre_engagement_${partner.id}`]}</Form.Control.Feedback>
            </Form.Group>
        )}
    </Col>

    {/* Column for Signatory Switch */}
    <Col sm={12} md={3} className="d-flex align-items-end justify-content-center pt-1">
        <FormCheck
            type="switch"
            id={`signatory-check-${partner.tempId}`}
            label="Signataire?"
            checked={partner.is_signatory}
            onChange={(e) => handleSignatoryChange(partner.tempId, e.target.checked)}
            className="form-check-lg small"
        />
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
                        <Card className="mb-4 shadow-sm border-light">
    <Card.Header className='bg-light py-2'>
        <h6 className='mb-0 fw-semibold text-secondary'>Comités de Suivi</h6>
    </Card.Header>
    <Card.Body className="pb-3 pt-3">
        <Row>
            <Col md={12} className="mb-3">
                <Form.Group controlId="formMembresTechnique">
                    <Form.Label className="small mb-1 fw-medium">Membres du Comité Technique</Form.Label>
                    <CreatableSelect
                        isMulti

                        isClearable
                        components={{ DropdownIndicator: null }} 
                        value={formData.membres_comite_technique}
                        onChange={(newValue) => setFormData(prev => ({ ...prev, membres_comite_technique: newValue || [] }))}
                        placeholder="Saisir un nom et appuyer sur Entrée..."
                        styles={{
                            ...selectStyles, // Inherit your base styles
                            menu: () => ({ display: 'none' }) // Add this rule to hide the menu
                        }}                        noOptionsMessage={() => "Saisir un nom pour l'ajouter"}
                        formatCreateLabel={(inputValue) => `Ajouter "${inputValue}"`}
                    />
                </Form.Group>
            </Col>
            <Col md={12}>
                <Form.Group controlId="formMembresPilotage">
                    <Form.Label className="small mb-1 fw-medium">Membres du Comité de Pilotage</Form.Label>
                     <CreatableSelect
                        isMulti
                        isClearable
                        components={{ DropdownIndicator: null }} 
                        value={formData.membres_comite_pilotage}
                        onChange={(newValue) => setFormData(prev => ({ ...prev, membres_comite_pilotage: newValue || [] }))}
                        placeholder="Saisir un nom et appuyer sur Entrée..."
                        styles={{
                            ...selectStyles, // Inherit your base styles
                            menu: () => ({ display: 'none' }) // Add this rule to hide the menu
                        }}                        noOptionsMessage={() => "Saisir un nom pour l'ajouter"}
                        formatCreateLabel={(inputValue) => `Ajouter "${inputValue}"`}
                    />
                </Form.Group>
            </Col>
        </Row>
    </Card.Body>
</Card>
                        <Row className="mb-3 g-3">
                             <Form.Group as={Col} md={4} lg={4} controlId="formMaitre_Ouvrage"><Form.Label className="small mb-1 fw-medium">Maitre Ouvrage</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Maitre_Ouvrage} type="text" name="Maitre_Ouvrage" value={formData.Maitre_Ouvrage} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Maitre_Ouvrage}</Form.Control.Feedback></Form.Group>
                             

                            {formData.type === 'cadre' && (<Form.Group as={Col} md={4} lg={4} controlId="formId_Programme"><Form.Label className="small mb-1 fw-medium">Programme</Form.Label><Select inputId='programme-select-input' name="programmeId" menuPlacement="auto" options={programmesOptions} value={formData.programmeId} onChange={handleProgrammeChange} styles={selectStyles} placeholder="- Selectionner -" isClearable isLoading={loadingOptions.programmes} className={formErrors.Id_Programme ? 'is-invalid' : ''} classNamePrefix="react-select" isMulti={false}/><Form.Control.Feedback type="invalid" style={{ display: formErrors.Id_Programme ? 'block' : 'none'}}>{formErrors.Id_Programme}</Form.Control.Feedback></Form.Group>)}
                             {formData.type === 'specifique' && (<Form.Group as={Col} md={4} lg={4} controlId="formId_Projet"><Form.Label className="small mb-1 fw-medium">Projet</Form.Label><Select inputId='projet-select-input' name="projetId" menuPlacement="auto" options={projetsOptions} value={formData.projetId} onChange={handleProjetChange} styles={selectStyles} placeholder="- Selectionner -" isClearable isLoading={loadingOptions.projets} className={formErrors.Id_Projet ? 'is-invalid' : ''} classNamePrefix="react-select" isMulti={false}/><Form.Control.Feedback type="invalid" style={{ display: formErrors.Id_Projet ? 'block' : 'none'}}>{formErrors.Id_Projet}</Form.Control.Feedback></Form.Group>)}<Form.Group as={Col} md={4} lg={4} controlId="formProvince"><Form.Label className="small mb-1 fw-medium">Localisation (Provinces)</Form.Label><Select inputId='province-select-input' name="provinces" menuPlacement="auto" options={provincesOptions} value={formData.provinces} onChange={handleProvinceChange} styles={selectStyles} placeholder="- Selectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.provinces} className={formErrors.Province ? 'is-invalid' : ''} classNamePrefix="react-select"/><Form.Control.Feedback type="invalid" style={{ display: formErrors.Province ? 'block' : 'none'}}>{formErrors.Province}</Form.Control.Feedback></Form.Group>
                        </Row>
                        <Row className="mb-3 g-3">
    <Form.Group as={Col} md={6} controlId="formMaitreOuvrageDelegue">
        <Form.Label className="small mb-1 fw-medium">Maitre d'ouvrage délégué</Form.Label>
        <Form.Control 
            className={inputClass} 
            isInvalid={!!formErrors.maitre_ouvrage_delegue} 
            type="text" 
            name="maitre_ouvrage_delegue" 
            value={formData.maitre_ouvrage_delegue} 
            onChange={handleChange} 
            size="sm"
        />
        <Form.Control.Feedback type="invalid">{formErrors.maitre_ouvrage_delegue}</Form.Control.Feedback>
    </Form.Group>
    <Form.Group as={Col} md={6} controlId="formDureeConvention">
        <Form.Label className="small mb-1 fw-medium">Durée de la convention (mois)</Form.Label>
        <Form.Control 
            className={inputClass} 
            isInvalid={!!formErrors.duree_convention} 
            type="number" 
            name="duree_convention" 
            placeholder="ex: 36"
            value={formData.duree_convention} 
            onChange={handleChange} 
            size="sm"
        />
        <Form.Control.Feedback type="invalid">{formErrors.duree_convention}</Form.Control.Feedback>
    </Form.Group>
</Row>
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={4} controlId="formStatut"><Form.Label className="small mb-1 fw-medium">Statut <span className="text-danger">*</span></Form.Label><Select inputId='statut-select-input' name="Statut" options={groupedStatutOptions} value={formData.Statut} onChange={handleStatutChange} styles={selectStyles} placeholder="- Sélectionner Statut -" isClearable formatGroupLabel={(group) => (<div style={{ fontWeight: 'bold', color: '#555', borderTop: '1px solid #eee', paddingTop: '5px', marginTop:'5px' }}>{group.label}</div>)} className={formErrors.Statut ? 'is-invalid' : ''} classNamePrefix="react-select"/><Form.Control.Feedback type="invalid" style={{ display: formErrors.Statut ? 'block' : 'none'}}>{formErrors.Statut}</Form.Control.Feedback></Form.Group>
                            {formData.Statut?.value === 'visé' && (
                                <><Form.Group as={Col} md={4} controlId="formDateVisa">
                                    <Form.Label className="small mb-1 fw-medium">Date de visa</Form.Label>
                                    <Form.Control 
                                        className={inputClass} 
                                        isInvalid={!!formErrors.date_visa} 
                                        required 
                                        type="date" 
                                        name="date_visa" 
                                        value={formData.date_visa} 
                                        onChange={handleChange} 
                                        size="sm"
                                    />
                                    <Form.Control.Feedback type="invalid">{formErrors.date_visa}</Form.Control.Feedback>
                                </Form.Group>
                                <Form.Group as={Col} md={4} controlId="formDateReceptionVise">
                               <Form.Label className="small mb-1 fw-medium">Date de réception de convention visée</Form.Label>
                              <Form.Control 
                              className={inputClass} 
                              isInvalid={!!formErrors.date_reception_vise} 
                              required type="date" name="date_reception_vise" 
                              value={formData.date_reception_vise} onChange={handleChange} size="sm" />
                                <Form.Control.Feedback type="invalid">{formErrors.date_reception_vise}</Form.Control.Feedback>
                             </Form.Group></>
                            )}
                            <Form.Group as={Col} md={4} controlId="formOperationalisation"><Form.Label className="small mb-1 fw-medium">Opérationnel</Form.Label>
                                <div> 
                                        <Form.Check
                                            inline
                                            type="radio"
                                            label="Oui"
                                            name="Operationalisation"
                                            id="operationalisation-operationnel"
                                            value="Oui"
                                            checked={formData.Operationalisation === 'Oui'}
                                            onChange={handleChange}
                                            isInvalid={!!formErrors.Operationalisation} // Apply to group or individual for styling
                                        />
                                        <Form.Check
                                            inline
                                            type="radio"
                                            label="Non"
                                            name="Operationalisation"
                                            id="operationalisation-non-operationnel"
                                            value="Non"
                                            checked={formData.Operationalisation === 'Non'}
                                            onChange={handleChange}
                                            isInvalid={!!formErrors.Operationalisation}
                                        />
                                        {formErrors.Operationalisation && (
                                            <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                                {formErrors.Operationalisation}
                                            </Form.Control.Feedback>
                                        )}
                                    </div>                                    </Form.Group>
                            <Form.Group as={Col} md={4} controlId="formId_Fonctionnaire">
                                <Form.Label className="small mb-1 fw-medium"><FontAwesomeIcon icon={faUsers} className="me-1" /> Points Focaux</Form.Label>
                                <Select inputId='fonctionnaire-select-input' name="fonctionnaires" menuPlacement="auto" options={fonctionnairesOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder="- Selectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.fonctionnaires} className={formErrors.id_fonctionnaire ? 'is-invalid' : ''} classNamePrefix="react-select"/>
                                <Form.Control.Feedback type="invalid" style={{ display: formErrors.id_fonctionnaire ? 'block' : 'none'}}>{formErrors.id_fonctionnaire}</Form.Control.Feedback>
                            </Form.Group>
                        </Row>
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={6} controlId="formReference"><Form.Label className="small mb-1 fw-medium">Reference</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Reference} type="text" name="Reference" value={formData.Reference} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Reference}</Form.Control.Feedback></Form.Group>

                            {/* <Form.Group as={Col} md={6} controlId="formClassification_prov"><Form.Label className="small mb-1 fw-medium">Classification Prov</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Classification_prov} type="text" name="Classification_prov" value={formData.Classification_prov} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Classification_prov}</Form.Control.Feedback></Form.Group> */}
                            <Form.Group as={Col} md={6} controlId="formCategorie"><Form.Label className="small mb-1 fw-medium">Categorie</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Categorie} type="text" name="Categorie" value={formData.Categorie} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Categorie}</Form.Control.Feedback></Form.Group>
                        </Row>
                         {/* <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={4} controlId="formGroupe"><Form.Label className="small mb-1 fw-medium">Groupe</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Groupe} type="number" name="Groupe" value={formData.Groupe} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Groupe}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={4} controlId="formRang"><Form.Label className="small mb-1 fw-medium">Rang</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Rang} type="text" name="Rang" value={formData.Rang} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Rang}</Form.Control.Feedback></Form.Group>
                        </Row> */}
                         <Card className="mb-4 shadow-sm border-light" id="file-management-card">
                            <Card.Header className='bg-light py-2'><h6 className='mb-0 fw-semibold text-secondary'>Gestion des Fichiers</h6></Card.Header>
                            <Card.Body className="pb-3 pt-3">
                                 {isEditing && existingDocuments.length > 0 && ( <> <h6 className="small text-muted mb-2">Fichiers Actuels :</h6> <ListGroup variant="flush" className="mb-3 existing-files-list border rounded-3"> {existingDocuments.map((doc) => ( <ListGroup.Item key={doc.id} className={`d-flex justify-content-between align-items-center px-2 py-1 border-bottom ${documentsToDelete.includes(doc.id) ? 'bg-light text-muted text-decoration-line-through' : ''}`} style={{ transition: 'background-color 0.3s ease' }}> <div className="d-flex align-items-center text-truncate me-2"> <FontAwesomeIcon icon={getFileIcon(doc.type || doc.name)} className="me-2 text-secondary" fixedWidth title={doc.type || 'Type inconnu'}/> {doc.url ? ( <a href={doc.url} target="_blank" rel="noopener noreferrer" title={`Voir ${doc.name}`} className={`text-truncate me-2 small fw-medium ${documentsToDelete.includes(doc.id) ? 'text-muted' : 'link-primary'}`} style={{ maxWidth: '250px' }}> {doc.name} <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" className="ms-1"/> </a> ) : ( <span title={doc.name} className={`text-truncate me-2 small fw-medium ${documentsToDelete.includes(doc.id) ? 'text-muted' : ''}`} style={{ maxWidth: '250px' }}>{doc.name}</span> )} </div> {documentsToDelete.includes(doc.id) ? ( <Button variant="outline-secondary" size="sm" className="flex-shrink-0" onClick={() => handleUnmarkForDeletion(doc.id)} title="Annuler la suppression"><FontAwesomeIcon icon={faUndo} /></Button> ) : ( <Button variant="outline-danger" size="sm" className="flex-shrink-0" onClick={() => handleMarkForDeletion(doc.id)} title="Marquer pour suppression"><FontAwesomeIcon icon={faTrashAlt} /></Button> )} </ListGroup.Item> ))} </ListGroup> {formErrors.fichiers_delete && <Form.Text className="text-danger small d-block mb-2">{formErrors.fichiers_delete}</Form.Text>} </> )}
                                {newFiles.length > 0 && ( <> <h6 className="small text-muted mb-2 mt-3">Nouveaux Fichiers à Ajouter :</h6> <ListGroup variant="flush" className="mb-3 new-files-list border rounded-3"> {newFiles.map((file, index) => ( <ListGroup.Item key={`${file.name}-${file.size}-${index}`} className="d-flex justify-content-between align-items-center px-2 py-1 border-bottom"> <div className="d-flex align-items-center text-truncate me-2"> <FontAwesomeIcon icon={getFileIcon(file.type || file.name)} className="me-2 text-secondary" fixedWidth /> <span className="text-truncate me-2 small" title={file.name} style={{ maxWidth: '250px' }}>{file.name}</span> </div> <Stack direction="horizontal" gap={2} className="align-items-center flex-shrink-0"> <Badge bg="light" text="dark" pill className="small fw-normal">{(file.size / 1024 / 1024).toFixed(2)} Mo</Badge> <Button variant="outline-warning" size="sm" onClick={() => handleRemoveNewFile(index)} title="Retirer ce fichier"><FontAwesomeIcon icon={faTimes} /></Button> </Stack> </ListGroup.Item> ))} </ListGroup> </> )}
                                <Form.Group id="formFichiers" className={`mt-3 text-center ${formErrors.fichiers ? 'is-invalid' : ''}`}>
                                    <Form.Label htmlFor="file-upload-input" className="btn btn-outline-secondary rounded-pill shadow-sm px-4 py-2"> <FontAwesomeIcon icon={faPlusCircle} className="me-2" /> {isEditing ? 'Ajouter Fichiers' : 'Sélectionner Fichiers'} </Form.Label>
                                    <Form.Control type="file" id="file-upload-input" multiple onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.doc,.docx,image/*,.xls,.xlsx"/>
                                    <Form.Control.Feedback type="invalid" className="d-block text-center mt-1 small">{formErrors.fichiers}</Form.Control.Feedback>
                                </Form.Group>
                            </Card.Body>
                        </Card>
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={6} controlId="formObjet"><Form.Label className="small mb-1 fw-medium">Objet</Form.Label><Form.Control className={textareaClass} isInvalid={!!formErrors.Objet} as="textarea" rows={1} name="Objet" value={formData.Objet} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Objet}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={6} controlId="formObjectifs"><Form.Label className="small mb-1 fw-medium">Objectifs</Form.Label><Form.Control className={textareaClass} isInvalid={!!formErrors.Objectifs} as="textarea" rows={1} name="Objectifs" value={formData.Objectifs} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Objectifs}</Form.Control.Feedback></Form.Group>
                        </Row>
                        <Row className="mb-4 g-3">
                            <Form.Group as={Col} md={12} controlId="formCout_Global"><Form.Label className="small mb-1 fw-medium">Cout Global (MAD)</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Cout_Global} type="number" step="0.01" min="0" name="Cout_Global" value={formData.Cout_Global} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Cout_Global}</Form.Control.Feedback></Form.Group>
                        </Row>
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} controlId="formObservations"><Form.Label className="small mb-1 fw-medium">Observations</Form.Label><Form.Control className={textareaClass} style={{borderRadius: '1rem'}} isInvalid={!!formErrors.observations} as="textarea" rows={3} name="observations" value={formData.observations} onChange={handleChange} size="sm" placeholder="Ajouter des observations ou remarques..."/><Form.Control.Feedback type="invalid">{formErrors.observations}</Form.Control.Feedback></Form.Group>
                        </Row>
                        <Row className="mt-4 pt-2 justify-content-center flex-shrink-0">
                            <Col xs="auto"> <Button variant="danger" onClick={onClose} className="btn px-5 rounded-5 py-2 shadow-sm" disabled={submissionStatus.loading}> Annuler </Button> </Col>
                            <Col xs="auto"> <Button type="submit" className="btn rounded-5 px-5 py-2 align-items-center d-flex justify-content-evenly bg-primary border-0 shadow-sm" style={{ backgroundColor: '#5cacee', borderColor: '#5cacee'}} disabled={isSubmitDisabled}> {submissionStatus.loading ? ( <><Spinner as="span" animation="border" size="sm" className="me-2"/> {isEditing ? 'Modification...' : 'Validation...'}</> ) : ( isEditing ? 'Enregistrer Modifications' : 'Valider et Créer' )} </Button> </Col>
                        </Row>
                    </Form>
                </div>
            </div>
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
        </>
    );
};

ConventionForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};

ConventionForm.defaultProps = {
    itemId: null,
    onItemCreated: (createdItem) => { console.log('Convention Created:', createdItem); },
    onItemUpdated: (updatedItem) => { console.log('Convention Updated:', updatedItem); },
    baseApiUrl: 'http://localhost:8000/api',
};

export default ConventionForm;