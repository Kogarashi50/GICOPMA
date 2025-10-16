// src/gestion_conventions/avenants_views/AvenantForm.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faTimes, faTrashAlt, faUndo,
    faFilePdf, faFileWord, faFileExcel, faFileImage, faFileAlt,
    faPlusCircle, faExternalLinkAlt, faPaperclip, faPlus,
    faUsers
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import {
    Form, Button, Row, Col, Card, Alert, Spinner,
    InputGroup, FormCheck, ListGroup, Badge, Stack,
    ToggleButtonGroup, ToggleButton, Modal
} from 'react-bootstrap';
import PropTypes from 'prop-types';

const STATUT_OPTIONS = [
    { value: "en cours d'approbation", label: "En Cours d'Approbation" },
    { value: "approuvé", label: "Approuvé" },
    { value: "non visé", label: "Non Visé" },
    { value: "en cours de visa", label: "En Cours de Visa" },
    { value: "visé", label: "Visé" },
    { value: "signé", label: "Signé" },
];

// Styles for react-select
const selectStyles = {
    control: (provided, state) => ({ ...provided, width: '100%', maxWidth: '100%', backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da', boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', fontSize: '0.875rem' }),
    valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden' }),
    input: (provided) => ({ ...provided, margin: '0px', padding: '0px', fontSize: '0.875rem' }),
    indicatorSeparator: () => ({ display: 'none' }),
    indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }),
    placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }),
    menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px' }),
    multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', fontSize: '0.8rem' }),
    multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white' } }),
    noOptionsMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    loadingMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
};

// --- Helper Functions ---
const calculateEngagementYears = (startYear, durationMonths) => {
    if (!startYear || !durationMonths) return [];
    const numYears = Math.ceil(durationMonths / 12);
    return Array.from({ length: numYears }, (_, i) => parseInt(startYear, 10) + i);
};
const parseCurrency = (value) => { 
    if (typeof value !== 'string') return Number(value) || null; 
    const cleaned = value.replace(/[\s\u00A0]/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.'); 
    const number = parseFloat(cleaned); 
    return isNaN(number) ? null : number; 
};
const getFileIcon = (filenameOrMimeType) => { 
    if (!filenameOrMimeType) return faFileAlt; 
    const lowerCase = String(filenameOrMimeType).toLowerCase(); 
    if (lowerCase.includes('pdf')) return faFilePdf; 
    if (lowerCase.includes('doc') || lowerCase.includes('word')) return faFileWord; 
    if (lowerCase.includes('xls') || lowerCase.includes('excel')) return faFileExcel; 
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage; 
    return faFileAlt; 
};

// MISSION 1: Updated the options array with new value and improved labels
const TYPE_MODIFICATION_OPTIONS = [ 
    { value: 'montant', label: 'Modification du Montant' }, 
    { value: 'durée', label: 'Prolongation de Durée' }, 
    { value: 'partenaire', label: 'Changement de Partenaire(s)' }, 
    { value: 'technique_administratif', label: 'Mise à Jour Technique/Administrative' }, 
    { value: 'autre', label: 'Autres Modifications' }, 
];

const AvenantForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated, initialConventionId = null, conventionCode = '', baseApiUrl = 'http://localhost:8000/api' }) => {
    const initialFormData = useMemo(() => ({ convention_id: initialConventionId || '', 
        numero_avenant: '', 
        date_signature: '', 
        objet: '', 
        type_modification: null, 
        montant_modifie: '',
        annee_avenant: new Date().getFullYear(),
        session: '',
        numero_approbation: '',
        statut: null,
        date_visa: '', 
        nouvelle_date_fin: '', 
        remarques: '', 
        fonctionnaires: [], }), [initialConventionId]);

    const [formData, setFormData] = useState(initialFormData);
    const [conventionOptions, setConventionOptions] = useState([]);
    const [partenaireOptions, setPartenaireOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
    const [avenantPartnerDetails, setAvenantPartnerDetails] = useState([]);
    const [typeModificationOptions] = useState(TYPE_MODIFICATION_OPTIONS);
    const [fichiers, setFichiers] = useState([]);
    const [existingFichiers, setExistingFichiers] = useState([]);
    const [fichiersToDelete, setFichiersToDelete] = useState([]);
    const [editingFile, setEditingFile] = useState(null);
    const [loadingOptions, setLoadingOptions] = useState({ conventions: true, partenaires: true, fonctionnaires: true });
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(!!itemId);
    const isEditing = useMemo(() => itemId !== null, [itemId]);
    const optionsFinishedLoading = useMemo(() => !loadingOptions.conventions && !loadingOptions.partenaires && !loadingOptions.fonctionnaires, [loadingOptions]);
    const storageBaseUrl = useMemo(() => baseApiUrl.replace('/api', ''), [baseApiUrl]);
    const [selectedConventionDetails, setSelectedConventionDetails] = useState(null);
const buttonCloseClass = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold border-0';

    const fetchOptions = useCallback(async () => {
        setLoadingOptions({ conventions: true, partenaires: true, fonctionnaires: true });
        try {
            const [convRes, partRes, foncRes] = await Promise.all([
                axios.get(`${baseApiUrl}/options/conventions`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/partenaires`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true })
            ]);

            const mappedConvOptions = (convRes.data || []).filter(c => c?.value !== undefined && c?.label !== undefined).sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' }));
            setConventionOptions(mappedConvOptions);

            const mappedPartOptions = (partRes.data || []).filter(p => p?.value !== undefined && p?.label !== undefined).sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' }));
            setPartenaireOptions(mappedPartOptions);
            
            const foncDataResponse = foncRes.data || {};
            let rawFoncData = foncDataResponse.fonctionnaires && Array.isArray(foncDataResponse.fonctionnaires) ? foncDataResponse.fonctionnaires : (Array.isArray(foncDataResponse) ? foncDataResponse : []);
            const mappedFoncOptions = rawFoncData.map(f => ({
                value: f.id || f.value,
                label: f.nom_complet || f.label || `Fonctionnaire ID ${f.id || f.value}`
            })).filter(f => f.value !== undefined && f.label !== undefined).sort((a, b) => String(a.label).localeCompare(String(b.label)));
            setFonctionnairesOptions(mappedFoncOptions);

        } catch (err) {
            console.error("AvenantForm: Erreur chargement options:", err.response || err);
            setSubmissionStatus(prev => ({ ...prev, error: "Erreur chargement des listes.", loading: false }));
        } finally {
            setLoadingOptions({ conventions: false, partenaires: false, fonctionnaires: false });
        }
    }, [baseApiUrl]);

    useEffect(() => { fetchOptions(); }, [fetchOptions]);

    useEffect(() => {
        if (!isEditing || !itemId || !optionsFinishedLoading) { setLoadingData(false); return; }
        let isMounted = true;
        const fetchAvenantData = async () => {
            setLoadingData(true);
            setSubmissionStatus({ loading: false, error: null, success: false });
            setFormErrors({});
            try {
                const response = await axios.get(`${baseApiUrl}/avenants/${itemId}`, { params: { include: 'convention,documents,partnerCommitments.partenaire,partnerCommitments.engagementsAnnuels' }, withCredentials: true });
                if (!isMounted) return;

                const data = response.data.avenant || response.data;
                if (data.convention) {
                    setSelectedConventionDetails({
                        Annee_Convention: data.convention.Annee_Convention,
                        duree_convention: data.convention.duree_convention
                    });
                } else if (data.convention_id) {
                    try {
                        const convResponse = await axios.get(`${baseApiUrl}/conventions/${data.convention_id}`, { withCredentials: true });
                        const details = convResponse.data.convention || convResponse.data;
                        setSelectedConventionDetails({
                            Annee_Convention: details.Annee_Convention,
                            duree_convention: details.duree_convention
                        });
                    } catch (convError) {
                        console.error("Fallback failed to fetch convention details:", convError);
                        setSelectedConventionDetails(null);
                    }
                }
                const findOption = (options, value) => options.find(opt => String(opt.value).toLowerCase() === String(value).toLowerCase()) || null;
                const findMultiOptions = (options, valuesStr) => {
                    if (!valuesStr || !options?.length) return [];
                    const selectedValues = String(valuesStr).split(';').map(v => v.trim().toLowerCase());
                    return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase()));
                };

                setFormData({
                    convention_id: data.convention_id || '',
                    numero_avenant: data.numero_avenant || '',
                    date_signature: data.date_signature || '',
                    objet: data.objet || '',
                    annee_avenant: data.annee_avenant || new Date().getFullYear(),
                    session: data.session || '',
                    numero_approbation: data.numero_approbation || '',
                    statut: findOption(STATUT_OPTIONS, data.statut),
                    date_visa: data.date_visa || '',
                    type_modification: findOption(TYPE_MODIFICATION_OPTIONS, data.type_modification),
                    montant_modifie: data.montant_modifie != null ? String(data.montant_modifie) : '',
                    nouvelle_date_fin: data.nouvelle_date_fin || '',
                    remarques: data.remarques || '',
                    fonctionnaires: findMultiOptions(fonctionnairesOptions, data.id_fonctionnaire),
                });

                const fetchedFiles = Array.isArray(data.documents) ? data.documents : [];
                setExistingFichiers(fetchedFiles.map(f => ({
                    id: f.id,
                    Id_Doc: f.Id_Doc,
                    file_name: f.file_name || f.nom_fichier,
                    fichier_url: f.fichier_url || `${storageBaseUrl}/${f.file_path}`,
                    intitule: f.Intitule || f.intitule || ''
                })));

                if (Array.isArray(data.partner_commitments) && data.type_modification === 'partenaire') {
                    const initialPartnerDetails = data.partner_commitments.map(commit => {
                        const partnerOption = partenaireOptions.find(opt => opt.value === commit.Id_Partenaire);
                        return {
                            id: commit.Id_Partenaire,
                            label: partnerOption?.label || `Partenaire ID ${commit.Id_Partenaire}`,
                            engagement_type: commit.autre_engagement ? 'autre' : 'financier',
                            montant: String(commit.Montant_Convenu ?? ''),
                            autre_engagement: commit.autre_engagement || '',
                            engagements_annuels: (commit.engagements_annuels || []).map(e => ({...e, montant_prevu: String(e.montant_prevu ?? '')})),
                            is_signatory: !!commit.is_signatory,
                            date_signature: commit.date_signature || '',
                            details_signature: commit.details_signature || ''
                        };
                    }).filter(p => p?.id);
                    setAvenantPartnerDetails(initialPartnerDetails);
                } else {
                    setAvenantPartnerDetails([]);
                }
                
                setFichiers([]);
                setFichiersToDelete([]);

            } catch (err) {
                if (isMounted) setSubmissionStatus({ loading: false, error: "Erreur chargement des données.", success: false });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };
        if (optionsFinishedLoading) fetchAvenantData();
        return () => { isMounted = false; };
    }, [itemId, isEditing, baseApiUrl, optionsFinishedLoading, partenaireOptions, fonctionnairesOptions]);

    useEffect(() => { if (!isEditing && optionsFinishedLoading) { setFormData(initialFormData); setFichiers([]); setExistingFichiers([]); setFichiersToDelete([]); setAvenantPartnerDetails([]); setFormErrors({}); setSubmissionStatus({ loading: false, error: null, success: false }); setLoadingData(false); } }, [isEditing, optionsFinishedLoading, initialFormData]);
    
    // MISSION 2: Updated validation logic for date_signature
    const validateForm = useCallback(() => { 
        const errors = {}; 
        if (!formData.convention_id) errors.convention_id = "Convention requise."; 
        if (!formData.numero_avenant?.trim()) errors.numero_avenant = "Numéro avenant requis."; 
        
        // Only require date_signature if status is 'signé'
        if (formData.statut?.value === 'signé' && !formData.date_signature) {
            errors.date_signature = "Date signature requise pour le statut 'Signé'.";
        }
        
        if (!formData.type_modification) errors.type_modification = "Type modification requis."; 
        const typeValue = formData.type_modification?.value; 
        if (typeValue === 'montant') { 
            const montant = parseCurrency(formData.montant_modifie); 
            if (montant === null || isNaN(montant) || montant < 0) errors.montant_modifie = "Montant modifié valide est requis.";
        } 
        if (typeValue === 'durée') { 
            if (!formData.nouvelle_date_fin) errors.nouvelle_date_fin = "Nouvelle date fin requise.";
        } 
        if (typeValue === 'partenaire') { 
            if (!avenantPartnerDetails || avenantPartnerDetails.length === 0) {
                errors.partenaires = "Au moins un partenaire requis.";
            } else { 
                avenantPartnerDetails.forEach((p) => { 
                    if (p.engagement_type === 'financier' && p.montant !== '' && p.montant !== null && p.montant !== undefined) { 
                        const amount = parseCurrency(String(p.montant)); 
                        if (amount === null || isNaN(amount) || amount < 0) errors[`montant_${p.id}`] = `Montant invalide pour ${p.label}.`;
                    }
                    if (p.engagement_type === 'autre' && !p.autre_engagement?.trim()) {
                        errors[`autre_engagement_${p.id}`] = `Description requise pour ${p.label}.`;
                    }
                    if (p.is_signatory && !p.date_signature) {
                        errors[`date_sig_${p.id}`] = `Date signature requise pour ${p.label}.`;
                    }
                });
            }
        } 
        setFormErrors(errors); 
        return Object.keys(errors).length === 0; 
    }, [formData, avenantPartnerDetails]);

    // MISSION 2: Automatically clear date_signature if status is not 'signé'
    const handleStatutChange = useCallback((selectedOption) => {
        setFormData(prev => ({
            ...prev,
            statut: selectedOption,
            date_visa: selectedOption?.value === 'visé' ? prev.date_visa : '',
            date_signature: selectedOption?.value === 'signé' ? prev.date_signature : '' // Keep date if 'signé', clear otherwise
        }));
        if (formErrors.statut) setFormErrors(prev => ({ ...prev, statut: undefined }));
        if (formErrors.date_signature) setFormErrors(prev => ({ ...prev, date_signature: undefined })); // Also clear validation error
    }, [formErrors.statut, formErrors.date_signature]);

    const handleChange = useCallback((e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); if (formErrors[name]) setFormErrors(prev => { const next = {...prev}; delete next[name]; return next; }); }, [formErrors]);
    
    const handleSelectChange = useCallback(async (selectedOption, actionMeta) => { 
        const { name } = actionMeta; 
        if (name === 'convention_id') { 
            const conventionIdValue = selectedOption ? selectedOption.value : ''; 
            setFormData(prev => ({ ...prev, convention_id: conventionIdValue }));
            if (conventionIdValue) {
            try {
                const response = await axios.get(`${baseApiUrl}/conventions/${conventionIdValue}`, { withCredentials: true });
                const details = response.data.convention || response.data;
                setSelectedConventionDetails({
                    Annee_Convention: details.Annee_Convention,
                    duree_convention: details.duree_convention
                });
            } catch (error) {
                console.error("Failed to fetch convention details on select:", error);
                setSelectedConventionDetails(null);
            }
        } else {
            setSelectedConventionDetails(null);
        }
            if (formErrors.convention_id) setFormErrors(prev => ({ ...prev, convention_id: undefined })); 
        } else if (name === 'type_modification') { 
            const typeValue = selectedOption; 
            setFormData(prev => ({ ...prev, type_modification: typeValue })); 
            const selectedTypeValue = selectedOption?.value; 
            setFormData(prevData => ({ ...prevData, montant_modifie: selectedTypeValue === 'montant' ? prevData.montant_modifie : '', nouvelle_date_fin: selectedTypeValue === 'durée' ? prevData.nouvelle_date_fin : '', })); 
            if (selectedTypeValue !== 'partenaire') { setAvenantPartnerDetails([]); } 
            setFormErrors(prev => { 
                const nextErrors = { ...prev }; 
                delete nextErrors.type_modification; 
                if (selectedTypeValue !== 'montant') delete nextErrors.montant_modifie; 
                if (selectedTypeValue !== 'durée') delete nextErrors.nouvelle_date_fin; 
                if (selectedTypeValue !== 'partenaire') { 
                    delete nextErrors.partenaires; 
                    Object.keys(nextErrors).forEach(key => { 
                        if (key.startsWith('montant_') || key.startsWith('date_sig_') || key.startsWith('autre_engagement_')) delete nextErrors[key]; 
                    }); 
                } 
                return nextErrors; 
            }); 
        } 
    }, [formErrors.convention_id, baseApiUrl]);

    const handleFonctionnaireChange = useCallback((selectedOptions) => { setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] })); }, []);
    
    const handleAvenantPartnerSelectionChange = useCallback((selectedOptions) => {
        const newSelectedPartners = selectedOptions || [];
        setAvenantPartnerDetails(prevDetails => {
            const prevMap = new Map(prevDetails.map(p => [p.id, p]));
            return newSelectedPartners.map(option => ({
                id: option.value,
                label: option.label,
                engagement_type: prevMap.get(option.value)?.engagement_type ?? 'financier',
                montant: prevMap.get(option.value)?.montant ?? '',
                autre_engagement: prevMap.get(option.value)?.autre_engagement ?? '',
                engagements_annuels: prevMap.get(option.value)?.engagements_annuels ?? [],
                is_signatory: prevMap.get(option.value)?.is_signatory ?? false,
                date_signature: prevMap.get(option.value)?.date_signature ?? '',
                details_signature: prevMap.get(option.value)?.details_signature ?? '',
            }));
        });
        if (formErrors.partenaires && newSelectedPartners.length > 0) setFormErrors(prev => ({ ...prev, partenaires: undefined }));
    }, [formErrors.partenaires]);

    const handleAvenantCommitmentChange = useCallback((partnerId, value) => { setAvenantPartnerDetails(prev => prev.map(p => (p.id === partnerId ? { ...p, montant: value } : p))); const key = `montant_${partnerId}`; if (formErrors[key]) setFormErrors(prev => { const next = {...prev}; delete next[key]; return next; }); }, [formErrors]);
    
    const handleAvenantSignatoryChange = useCallback((partnerId, isChecked) => { setAvenantPartnerDetails(prev => prev.map(p => (p.id === partnerId ? { ...p, is_signatory: isChecked, date_signature: isChecked ? p.date_signature : '', details_signature: isChecked ? p.details_signature : '' } : p))); const key = `date_sig_${partnerId}`; if (!isChecked && formErrors[key]) setFormErrors(prev => { const next = {...prev}; delete next[key]; return next; }); }, [formErrors]);
    
    const handleAvenantSignatureDateChange = useCallback((partnerId, value) => { setAvenantPartnerDetails(prev => prev.map(p => (p.id === partnerId ? { ...p, date_signature: value } : p))); const key = `date_sig_${partnerId}`; if (formErrors[key]) setFormErrors(prev => { const next = {...prev}; delete next[key]; return next; }); }, [formErrors]);
    
    const handleAvenantSignatureDetailsChange = useCallback((partnerId, value) => { setAvenantPartnerDetails(prev => prev.map(p => (p.id === partnerId ? { ...p, details_signature: value } : p))); }, []);
    
    const handleAvenantEngagementTypeChange = (partnerId, type) => {
        setAvenantPartnerDetails(prevDetails =>
            prevDetails.map(p => {
                if (p.id === partnerId) {
                    const updatedPartner = { ...p, engagement_type: type };
                    if (type === 'financier') {
                        updatedPartner.autre_engagement = '';
                    } else {
                        updatedPartner.montant = '';
                        updatedPartner.engagements_annuels = [];
                    }
                    return updatedPartner;
                }
                return p;
            })
        );
    };

    const handleAvenantAutreEngagementChange = (partnerId, value) => {
        setAvenantPartnerDetails(prevDetails =>
            prevDetails.map(p => (p.id === partnerId ? { ...p, autre_engagement: value } : p))
        );
    };

    const handleAvenantYearlyAmountChange = (partnerId, year, value) => {
        setAvenantPartnerDetails(prevDetails =>
            prevDetails.map(p => {
                if (p.id === partnerId) {
                    const updatedEngagements = p.engagements_annuels ? [...p.engagements_annuels] : [];
                    const yearIndex = updatedEngagements.findIndex(e => Number(e.annee) === year);
                    const numericValue = value.replace(/[^0-9.]/g, '');

                    if (yearIndex > -1) {
                        updatedEngagements[yearIndex].montant_prevu = numericValue;
                    } else {
                        updatedEngagements.push({ annee: year, montant_prevu: numericValue });
                    }
                    const finalEngagements = updatedEngagements.filter(e => e.montant_prevu && e.montant_prevu !== '');
                    return { ...p, engagements_annuels: finalEngagements };
                }
                return p;
            })
        );
    };
    const handleFileChange = useCallback((e) => {
        const filesToAdd = Array.from(e.target.files ?? []);
        if (!filesToAdd.length) return;
        setFichiers(prev => {
            const existingNames = new Set(prev.map(fw => fw.file.name));
            const newUniqueFiles = filesToAdd
                .filter(f => !existingNames.has(f.name))
                .map(f => ({ file: f, intitule: f.name.replace(/\.[^/.]+$/, "") }));
            return [...prev, ...newUniqueFiles];
        });
        e.target.value = null;
    }, []);
    
    const removeNewFile = useCallback((fileIndex) => { setFichiers(prev => prev.filter((_, idx) => idx !== fileIndex)); }, []);
    
    const removeExistingFile = useCallback((fileId) => { setFichiersToDelete(prev => [...new Set([...prev, fileId])]); }, []);
    
    const handleSubmit = useCallback(async (e) => { 
        e.preventDefault(); 
        if (!validateForm()) { 
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs.", success: false }); 
            const firstErrorEl = document.querySelector('.is-invalid');
            firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return; 
        } 
        setSubmissionStatus({ loading: true, error: null, success: false }); 
        const dataToSubmit = new FormData(); 

        Object.entries(formData).forEach(([key, value]) => {
            if (key === 'statut' || key === 'type_modification') {
                dataToSubmit.append(key, value?.value || '');
            } else if (key === 'fonctionnaires') {
                dataToSubmit.append('id_fonctionnaire', value.map(f => f.value).join(';'));
            } else {
                dataToSubmit.append(key, value);
            }
        });

        if (formData.type_modification?.value === 'montant') {
            dataToSubmit.set('montant_modifie', parseCurrency(formData.montant_modifie) ?? '');
        }

        fichiers.forEach((fileWrapper, index) => {
            dataToSubmit.append(`fichiers[${index}]`, fileWrapper.file);
            dataToSubmit.append(`intitules[${index}]`, fileWrapper.intitule);
        });

        if (isEditing) {
            const docsMeta = existingFichiers
                .map(d => ({ id: d.id, intitule: d.intitule.trim() }));
            if (docsMeta.length > 0) {
                dataToSubmit.append('existing_documents_meta', JSON.stringify(docsMeta));
            }
            if (fichiersToDelete.length > 0) {
                fichiersToDelete.forEach(id => dataToSubmit.append('fichiers_to_delete[]', id));
            }
        }
        
        if (formData.type_modification?.value === 'partenaire') {
            const partnerData = avenantPartnerDetails.map(p => ({
                id: p.id,
                montant: p.engagement_type === 'financier' && p.montant ? parseCurrency(String(p.montant)) : null,
                autre_engagement: p.engagement_type === 'autre' ? p.autre_engagement : null,
                is_signatory: p.is_signatory,
                date_signature: p.is_signatory ? p.date_signature : null,
                details_signature: p.is_signatory ? p.details_signature : null,
                engagements_annuels: p.engagements_annuels?.map(e => ({
                    annee: e.annee,
                    montant_prevu: parseCurrency(e.montant_prevu)
                })) || []
            }));
            dataToSubmit.append('avenant_partner_commitments', JSON.stringify(partnerData));
        }

        if (isEditing) { 
            dataToSubmit.append('_method', 'PUT'); 
        } 
        
        const url = isEditing ? `${baseApiUrl}/avenants/${itemId}` : `${baseApiUrl}/avenants`; 
        const config = { headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true }; 
        
        try { 
            const response = await axios.post(url, dataToSubmit, config); 
            setSubmissionStatus({ loading: false, error: null, success: true }); 
            if (isEditing) {
                onItemUpdated(response.data.avenant);
            } else {
                onItemCreated(response.data.avenant);
            }
            setTimeout(onClose, 1500); 
        } catch (err) { 
            const errorMsg = err.response?.data?.message || "Erreur serveur."; 
            const serverErrors = err.response?.data?.errors || {}; 
            setFormErrors(serverErrors); 
            setSubmissionStatus({ loading: false, error: errorMsg, success: false }); 
        } 
    }, [isEditing, itemId, baseApiUrl, formData, fichiers, fichiersToDelete, existingFichiers, avenantPartnerDetails, validateForm, onClose, onItemCreated, onItemUpdated]);

    const isSubmitDisabled = submissionStatus.loading || loadingData || !optionsFinishedLoading;

    if (loadingData || !optionsFinishedLoading) { return ( <div className="d-flex justify-content-center align-items-center p-5" style={{minHeight: '400px'}}> <Spinner animation="border" variant="primary" /> <span className='ms-3 text-muted'>Chargement du formulaire...</span> </div> ); }
    
    const visibleExistingFichiers = existingFichiers.filter(f => !fichiersToDelete.includes(f.id));

    return (
        <div className="p-3 p-md-4 avenant-form-container bg-white" style={{ borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto'}}>
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom"><div><h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier' : 'Ajouter un nouveau'}</h5><h2 className="mb-0 fw-bold">Avenant{conventionCode ? ` à la Convention ${conventionCode}` : ''}</h2></div>
                <Button variant="warning" onClick={onClose} size="sm" className={buttonCloseClass}><b>Revenir à la liste</b></Button>
            </div>

            <div className="flex-grow-1">
                 {submissionStatus.error && !submissionStatus.loading && ( <Alert variant="danger" className="mb-3"> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error} </Alert> )}
                 {submissionStatus.success && ( <Alert variant="success" className="mb-3">Avenant {isEditing ? 'modifié' : 'ajouté'} avec succès !</Alert> )}
                <Form noValidate onSubmit={handleSubmit} className='px-md-3'>
                    <Form.Group as={Row} className="mb-3 align-items-center" controlId="formConvention_id">
                        <Form.Label column sm={3} className="small fw-medium text-sm-end">Convention <span className="text-danger">*</span></Form.Label>
                        <Col sm={9}>
                            <Select inputId='convention-select-input' name="convention_id" options={conventionOptions} value={conventionOptions.find(opt => opt.value === formData.convention_id) || null} onChange={handleSelectChange} styles={selectStyles} placeholder="- Sélectionner Convention Parente -" isClearable={false} isDisabled={loadingOptions.conventions || isEditing} isLoading={loadingOptions.conventions} className={formErrors.convention_id ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body} menuPlacement="auto" />
                            {formErrors.convention_id && <div className="invalid-feedback d-block ps-1 small">{formErrors.convention_id}</div>}
                        </Col>
                    </Form.Group>
                    
                    <Row className="g-3 mb-3">
                        <Form.Group as={Col} md={4} controlId="formNumeroApprobation">
                            <Form.Label className="small mb-1 fw-medium">N° Approbation <span className="text-danger">*</span></Form.Label>
                            <Form.Control className="p-2 rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.numero_approbation} type="text" name="numero_approbation" value={formData.numero_approbation} onChange={handleChange} size="sm"/>
                            <Form.Control.Feedback type="invalid">{formErrors.numero_approbation}</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group as={Col} md={4} controlId="formSession">
                            <Form.Label className="small mb-1 fw-medium">Session (Mois) <span className="text-danger">*</span></Form.Label>
                            <Form.Select className="p-2 rounded-pill shadow-sm bg-white border-1" name="session" value={formData.session} onChange={handleChange} isInvalid={!!formErrors.session} size="sm">
                                <option value="">Sélectionner...</option>
                                {[...Array(12).keys()].map(i => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('fr', { month: 'long' })}</option>)}
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">{formErrors.session}</Form.Control.Feedback>
                        </Form.Group>
                        <Form.Group as={Col} md={4} controlId="formAnneeAvenant">
                            <Form.Label className="small mb-1 fw-medium">Année Avenant <span className="text-danger">*</span></Form.Label>
                            <Form.Control className="p-2 rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.annee_avenant} type="number" name="annee_avenant" value={formData.annee_avenant} onChange={handleChange} size="sm" placeholder="YYYY"/>
                            <Form.Control.Feedback type="invalid">{formErrors.annee_avenant}</Form.Control.Feedback>
                        </Form.Group>
                    </Row>
                    <Row className="g-3 mb-3">
                         <Form.Group as={Col}  controlId="formNumero_avenant"><Form.Label className="small mb-1 fw-medium">N° Avenant <span className="text-danger">*</span></Form.Label><Form.Control className="p-2 rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.numero_avenant} type="text" name="numero_avenant" value={formData.numero_avenant} onChange={handleChange} size="sm" placeholder="Ex: Avenant N°1"/><Form.Control.Feedback type="invalid">{formErrors.numero_avenant}</Form.Control.Feedback></Form.Group>
                         <Form.Group as={Col}  controlId="formStatut">
                            <Form.Label className="small mb-1 fw-medium">Statut <span className="text-danger">*</span></Form.Label>
                            <Select inputId='statut-select-input' name="statut" options={STATUT_OPTIONS} value={formData.statut} onChange={handleStatutChange} styles={selectStyles} placeholder="- Sélectionner Statut -" isClearable className={formErrors.statut ? 'is-invalid' : ''} classNamePrefix="react-select"/>
                            <Form.Control.Feedback type="invalid" style={{display: formErrors.statut ? 'block' : 'none'}}>{formErrors.statut}</Form.Control.Feedback>
                        </Form.Group>
                         {/* MISSION 2: Conditionally render the date_signature field */}
                         {formData.statut?.value === 'signé' && (
                             <Form.Group as={Col} md={4} controlId="formDate_signature">
                                 <Form.Label className="small mb-1 fw-medium">Date Signature<span className="text-danger">*</span></Form.Label>
                                 <Form.Control className="p-2 rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.date_signature} type="date" name="date_signature" value={formData.date_signature} onChange={handleChange} size="sm"/>
                                 <Form.Control.Feedback type="invalid">{formErrors.date_signature}</Form.Control.Feedback>
                             </Form.Group>
                         )}
                     </Row>
                     <Row className="g-3 mb-3">
                        <Form.Group as={Col}  controlId="formType_modification"><Form.Label className="small mb-1 fw-medium">Type Modification <span className="text-danger">*</span></Form.Label><Select inputId='type-modif-select-input' name="type_modification" options={typeModificationOptions} value={formData.type_modification} onChange={handleSelectChange} styles={selectStyles} placeholder="- Sélectionner Type -" isClearable className={formErrors.type_modification ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body} menuPlacement="auto"/><Form.Control.Feedback type="invalid" style={{display: formErrors.type_modification ? 'block' : 'none'}}>{formErrors.type_modification}</Form.Control.Feedback></Form.Group>
                        {formData.statut?.value === 'visé' && (
                            <Form.Group as={Col} md={4} controlId="formDateVisa">
                                <Form.Label className="small mb-1 fw-medium">Date de visa <span className="text-danger">*</span></Form.Label>
                                <Form.Control className="p-2 rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.date_visa} required type="date" name="date_visa" value={formData.date_visa} onChange={handleChange} size="sm"/>
                                <Form.Control.Feedback type="invalid">{formErrors.date_visa}</Form.Control.Feedback>
                            </Form.Group>
                        )}
                    </Row>
                     
                    <Row className="g-3 mb-3">{formData.type_modification?.value === 'montant' && ( <Form.Group as={Col} md={6} controlId="formMontant_modifie"><Form.Label className="small mb-1 fw-medium">Nouveau Montant <span className="text-danger">*</span></Form.Label><InputGroup size="sm"><Form.Control className="p-2 rounded-start-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.montant_modifie} type="number" step="0.01" min="0" name="montant_modifie" value={formData.montant_modifie} onChange={handleChange} placeholder="0.00"/><InputGroup.Text className="rounded-end-pill">MAD</InputGroup.Text><Form.Control.Feedback type="invalid">{formErrors.montant_modifie}</Form.Control.Feedback></InputGroup></Form.Group> )} {formData.type_modification?.value === 'durée' && ( <Form.Group as={Col} md={6} controlId="formNouvelle_date_fin"><Form.Label className="small mb-1 fw-medium">Nouvelle Date Fin <span className="text-danger">*</span></Form.Label><Form.Control className="p-2 rounded-pill shadow-sm bg-white border-1" isInvalid={!!formErrors.nouvelle_date_fin} type="date" name="nouvelle_date_fin" value={formData.nouvelle_date_fin} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.nouvelle_date_fin}</Form.Control.Feedback></Form.Group> )} </Row>
                    {formData.type_modification?.value === 'partenaire' && ( <Card className="mb-3 shadow-sm border-light"><Card.Header className='bg-light py-2'><h6 className='mb-0 fw-semibold text-secondary'>Détails Modification Partenaires</h6></Card.Header><Card.Body className="pb-2 pt-3"><Form.Group as={Row} className="mb-3" controlId="formPartenaireSelectConditional"><Form.Label column sm={3} className="small pt-1 fw-medium text-sm-end"> Sélection Partenaires <span className="text-danger">*</span></Form.Label><Col sm={9}><Select inputId='avenant-partenaire-select-conditional' name="partenaireSelector" options={partenaireOptions} value={partenaireOptions.filter(opt => avenantPartnerDetails.some(p => p.id === opt.value))} onChange={handleAvenantPartnerSelectionChange} styles={selectStyles} placeholder="- Choisir partenaires concernés -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.partenaires} className={formErrors.partenaires ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body} menuPlacement="auto"/><Form.Control.Feedback type="invalid" style={{display: formErrors.partenaires ? 'block' : 'none'}}>{formErrors.partenaires}</Form.Control.Feedback></Col></Form.Group>{avenantPartnerDetails.length > 0 && ( <div className="mt-3 border-top pt-3">{avenantPartnerDetails.map((partner, index) => (
                        <div key={partner.id} id={`formAvenantDetail_${partner.id}`} className={`mb-3 ${index < avenantPartnerDetails.length - 1 ? 'border-bottom pb-3' : ''}`}>
                            <Row className="mb-2 align-items-center px-sm-3">
                                <Col sm={12} md={4} className="small pt-1 fw-bold text-break">
                                    <Form.Label className="mb-0">{partner.label}</Form.Label>
                                </Col>
                                <Col sm={12} md={8}>
                                    <ToggleButtonGroup
                                        type="radio" name={`engagement-type-avenant-${partner.id}`}
                                        value={partner.engagement_type}
                                        onChange={(type) => handleAvenantEngagementTypeChange(partner.id, type)}
                                        size="sm" className="d-flex mb-2">
                                        <ToggleButton id={`type-financier-avenant-${partner.id}`} value="financier" variant="outline-secondary" className="w-100">Financier</ToggleButton>
                                        <ToggleButton id={`type-autre-avenant-${partner.id}`} value="autre" variant="outline-secondary" className="w-100">Autre Nature</ToggleButton>
                                    </ToggleButtonGroup>

                                    {partner.engagement_type === 'financier' ? (
                                        <InputGroup size="sm" className="flex-nowrap">
                                            <Form.Control type="number" step="0.01" min="0" value={partner.montant} onChange={(e) => handleAvenantCommitmentChange(partner.id, e.target.value)} placeholder="Montant" className="form-control-sm rounded-start-pill" isInvalid={!!formErrors[`montant_${partner.id}`]}/>
                                            <InputGroup.Text className="rounded-end-pill">MAD</InputGroup.Text>
                                            <Form.Control.Feedback type="invalid">{formErrors[`montant_${partner.id}`]}</Form.Control.Feedback>
                                        </InputGroup>
                                    ) : (
                                        <Form.Control as="textarea" rows={1} value={partner.autre_engagement} onChange={(e) => handleAvenantAutreEngagementChange(partner.id, e.target.value)} placeholder="Ex: Mise à disposition du terrain..." className="form-control-sm rounded-3" isInvalid={!!formErrors[`autre_engagement_${partner.id}`]}/>
                                    )}
                                    <Form.Control.Feedback type="invalid">{formErrors[`autre_engagement_${partner.id}`]}</Form.Control.Feedback>
                                </Col>
                            </Row>

                            {partner.engagement_type === 'financier' && selectedConventionDetails && (
                                (() => {
                                    let durationInMonths = selectedConventionDetails.duree_convention;
                                    if (!durationInMonths && formData.type_modification?.value === 'durée' && formData.nouvelle_date_fin && formData.annee_avenant) {
                                        const startYear = parseInt(formData.annee_avenant, 10);
                                        const endDate = new Date(formData.nouvelle_date_fin);
                                        const endYear = endDate.getFullYear();
                                        const endMonth = endDate.getMonth();
                                        durationInMonths = (endYear - startYear) * 12 + endMonth + 1;
                                    }

                                    const engagementYears = calculateEngagementYears(
                                        formData.annee_avenant,
                                        durationInMonths
                                    );

                                    if (engagementYears.length === 0) {
                                        return (
                                            <Row className="mt-2 mb-2 px-sm-3 justify-content-end">
                                                <Col sm={12}>
                                                    <div className="p-2 border rounded-3 bg-light">
                                                        <p className="small text-muted mb-0 fst-italic">
                                                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 text-warning"/>
                                                            La durée de la convention parente n'est pas définie. La répartition annuelle ne peut être affichée.
                                                        </p>
                                                    </div>
                                                </Col>
                                            </Row>
                                        );
                                    }
                                    const yearlyTotal = partner.engagements_annuels?.reduce((sum, item) => sum + parseCurrency(item.montant_prevu), 0) || 0;
                                    const totalCommitment = parseCurrency(partner.montant);
                                    const isTotalMismatch = yearlyTotal !== totalCommitment;

                                    return (
                                        <Row className="mt-2 mb-2 px-sm-3 justify-content-end">
                                            <Col sm={12}>
                                                <div className="p-2 border rounded-3 bg-light">
                                                    <p className="small fw-medium text-muted mb-2">Répartition annuelle prévisionnelle :</p>
                                                    <Row className="g-2">
                                                        {engagementYears.map(year => {
                                                            const engagementForYear = partner.engagements_annuels?.find(e => Number(e.annee) === year);
                                                            return (
                                                                <Col key={year} xs={6} sm={4} md={3}>
                                                                    <InputGroup size="sm">
                                                                        <InputGroup.Text>{year}</InputGroup.Text>
                                                                        <Form.Control
                                                                            type="number"
                                                                            step="0.01"
                                                                            placeholder="Montant"
                                                                            value={engagementForYear?.montant_prevu || ''}
                                                                            onChange={(e) => handleAvenantYearlyAmountChange(partner.id, year, e.target.value)}
                                                                        />
                                                                    </InputGroup>
                                                                </Col>
                                                            );
                                                        })}
                                                    </Row>
                                                    {isTotalMismatch && totalCommitment > 0 && (
                                                        <Alert variant="warning" className="mt-2 py-1 px-2 small mb-0">
                                                            <FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/>
                                                            La somme de la répartition ({yearlyTotal.toLocaleString('fr-MA')} MAD) ne correspond pas à l'engagement total ({totalCommitment.toLocaleString('fr-MA')} MAD).
                                                        </Alert>
                                                    )}
                                                </div>
                                            </Col>
                                        </Row>
                                    );
                                })()
                            )}
                            <Row className="mt-1 mb-1 px-sm-3 align-items-center">
                                <Col md={4} className="d-flex justify-content-start">
                                     <FormCheck type="switch" id={`avenant-signatory-check-${partner.id}`} label="Signataire?" checked={partner.is_signatory} onChange={(e) => handleAvenantSignatoryChange(partner.id, e.target.checked)} className="form-check-sm small"/>
                                </Col>
                                {partner.is_signatory && (
                                    <>
                                        <Col xs={12} sm={6} md={4} className="mt-2 mt-md-0"><Form.Group><Form.Control type="date" size="sm" value={partner.date_signature} onChange={(e) => handleAvenantSignatureDateChange(partner.id, e.target.value)} isInvalid={!!formErrors[`date_sig_${partner.id}`]}/><Form.Control.Feedback type="invalid">{formErrors[`date_sig_${partner.id}`]}</Form.Control.Feedback></Form.Group></Col>
                                        <Col xs={12} sm={6} md={4} className="mt-2 mt-md-0"><Form.Group><Form.Control type="text" size="sm" value={partner.details_signature} onChange={(e) => handleAvenantSignatureDetailsChange(partner.id, e.target.value)} placeholder="Détails signature..."/></Form.Group></Col>
                                    </>
                                )}
                            </Row>
                        </div>
                    ))}</div> )} </Card.Body></Card> )}
                    <Form.Group className="mb-3" controlId="formRemarques"><Form.Label className="small mb-1 fw-medium">Remarques</Form.Label><Form.Control className="p-3 rounded-5 shadow-sm bg-white border-1" as="textarea" rows={2} name="remarques" value={formData.remarques} onChange={handleChange} size="sm" placeholder="Observations diverses..."/></Form.Group>
                    <Form.Group className="mb-3" controlId="formObjet"><Form.Label className="small mb-1 fw-medium">Objet</Form.Label><Form.Control className="p-3 rounded-5 shadow-sm bg-white border-1" isInvalid={!!formErrors.objet} as="textarea" rows={2} name="objet" value={formData.objet} onChange={handleChange} size="sm" placeholder="Description modifications..."/><Form.Control.Feedback type="invalid">{formErrors.objet}</Form.Control.Feedback></Form.Group>
                    <Form.Group as={Row} className="mb-3 align-items-center" controlId="formId_FonctionnaireAvenant">
                        <Form.Label column sm={3} className="small fw-medium text-sm-end"> <FontAwesomeIcon icon={faUsers} className="me-1 text-secondary"/> Points Focaux </Form.Label>
                        <Col sm={9}>
                            <Select inputId='avenant-fonctionnaire-select' name="fonctionnaires" menuPlacement="auto" options={fonctionnairesOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder="- Sélectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.fonctionnaires} className={formErrors.id_fonctionnaire ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body}/>
                            <Form.Control.Feedback type="invalid" style={{ display: formErrors.id_fonctionnaire ? 'block' : 'none'}}> {formErrors.id_fonctionnaire} </Form.Control.Feedback>
                        </Col>
                     </Form.Group>
                    <Form.Group as={Row} className="mb-3" controlId="avenantFileGroup">
                        <Form.Label column sm={3} className="small fw-medium text-sm-end">Fichiers Joints</Form.Label>
                        <Col sm={9}>
                            <Card className="border-dashed">
                                <Card.Body className='p-3'>
                                    <div className='mb-2'>
                                        <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => document.getElementById('avenant_fichiers_hidden_input')?.click()}>
                                            <FontAwesomeIcon icon={faPlus} className="me-2" /> Ajouter un fichier
                                        </Button>
                                        <Form.Control id="avenant_fichiers_hidden_input" type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} isInvalid={!!formErrors.fichiers} />
                                        <Form.Control.Feedback type="invalid">{formErrors.fichiers}</Form.Control.Feedback>
                                    </div>
                                    
                                    {isEditing && visibleExistingFichiers.length > 0 && (
                                        <ListGroup variant="flush" className="mb-2">
                                            {visibleExistingFichiers.map(file => (
                                                <ListGroup.Item key={file.id} className="d-flex justify-content-between align-items-center p-2">
                                                    <span className="text-truncate" title={file.file_name}>
                                                        <FontAwesomeIcon icon={getFileIcon(file.file_name)} className="me-2 text-muted" />
                                                        {file.intitule || file.file_name}
                                                    </span>
                                                    <div>
                                                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => setEditingFile({ isExisting: true, data: { ...file } })}>Modifier</Button>
                                                        <Button variant="outline-danger" size="sm" onClick={() => removeExistingFile(file.id)}><FontAwesomeIcon icon={faTrashAlt} /></Button>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    )}

                                    {fichiers.length > 0 && (
                                        <ListGroup variant="flush">
                                            {fichiers.map((fw, index) => (
                                                <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center p-2">
                                                    <span className="text-truncate" title={fw.file.name}>
                                                        <FontAwesomeIcon icon={getFileIcon(fw.file.name)} className="me-2 text-success" />
                                                        {fw.intitule}
                                                    </span>
                                                    <div>
                                                        <Button variant="outline-primary" size="sm" className="me-2" onClick={() => setEditingFile({ isExisting: false, data: { ...fw }, index })}>Modifier</Button>
                                                        <Button variant="outline-danger" size="sm" onClick={() => removeNewFile(index)}><FontAwesomeIcon icon={faTrashAlt} /></Button>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Form.Group>
                    
                    <Modal show={!!editingFile} onHide={() => setEditingFile(null)} centered>
                        <Modal.Header closeButton><Modal.Title>Modifier l'intitulé</Modal.Title></Modal.Header>
                        <Modal.Body>
                            <p className="text-muted small text-truncate">Fichier: {editingFile?.data?.file_name || editingFile?.data?.file?.name}</p>
                            <Form.Group>
                                <Form.Label>Intitulé du fichier</Form.Label>
                                <Form.Control type="text" value={editingFile?.data?.intitule || ''} onChange={(e) => setEditingFile(prev => ({ ...prev, data: { ...prev.data, intitule: e.target.value } }))} autoFocus/>
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="danger" onClick={() => setEditingFile(null)}>Annuler</Button>
                            <Button variant="primary" onClick={() => {
                                if (!editingFile) return;
                                const { index, data, isExisting } = editingFile;
                                if (isExisting) {
                                    setExistingFichiers(prev => prev.map(f => f.id === data.id ? { ...f, intitule: data.intitule } : f));
                                } else {
                                    setFichiers(prev => prev.map((fw, i) => i === index ? { ...fw, intitule: data.intitule } : fw));
                                }
                                setEditingFile(null);
                            }}>Enregistrer</Button>
                        </Modal.Footer>
                    </Modal>

                    <Row className="mt-4 pt-3 border-top justify-content-center"><Col xs="auto"><Button variant="danger" onClick={onClose} className="px-5" disabled={submissionStatus.loading}>Annuler</Button></Col><Col xs="auto"><Button type="submit" variant="primary" className="px-5" disabled={isSubmitDisabled}>{submissionStatus.loading ? ( <><Spinner as="span" animation="border" size="sm" className="me-2"/> Enregistrement...</> ) : ( isEditing ? 'Enregistrer Modifications' : 'Ajouter Avenant' )}</Button></Col></Row>
                </Form>
            </div>
        </div>
    );
};

AvenantForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    initialConventionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    conventionCode: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};
AvenantForm.defaultProps = {
    itemId: null,
    initialConventionId: null,
    conventionCode: '',
    onItemCreated: () => {},
    onItemUpdated: () => {},
    baseApiUrl: 'http://localhost:8000/api',
};

export default AvenantForm;