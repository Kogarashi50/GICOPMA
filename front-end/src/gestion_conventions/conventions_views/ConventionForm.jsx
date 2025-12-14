import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faExclamationTriangle, faTimes, faTrashAlt, faUndo, faFilePdf, faFileWord,
    faFileExcel, faFileImage, faFileAlt, faPlusCircle, faExternalLinkAlt, faUsers,
    faHandshake, faUserShield, faFolderOpen, faSpinner, faBuilding, faUserTie, faClock,faClipboardCheck
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import {
    Form, Button, Row, Col, Card, Alert, Spinner,
    ToggleButton, ToggleButtonGroup, ListGroup, Badge, Modal
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import MaitreOuvrageManager from './MaitreOuvrageManager';
import PartenaireManager from './PartenaireManager';
import PartenaireEngagementManager from './PartenaireEngagementManager';


// --- Styles and Helpers ---
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
    indicatorSeparator: () => ({ display: 'none' }),
    indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }),
    placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }),
    menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : 'white', color: state.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e0e0e0', borderRadius: '0.5rem' }),
    multiValueLabel: (provided) => ({ ...provided, color: '#333', fontSize: '0.8rem', paddingRight: '6px' }),
    multiValueRemove: (provided) => ({ ...provided, color: '#555', ':hover': { backgroundColor: '#c0c0c0', color: 'white' } }),
    noOptionsMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    loadingMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
};
const inputClass = "form-control form-control-sm rounded-pill shadow-sm bg-light border";
const textareaClass = "form-control form-control-sm rounded-3 shadow-sm bg-light border";
const parseCurrency = (value) => { if (typeof value !== 'string') return Number(value) || 0; const cleaned = value.replace(/[\s\u00A0]/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.'); const number = parseFloat(cleaned); return isNaN(number) ? 0 : number; };
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
const getFileIcon = (filenameOrMimeType) => { if (!filenameOrMimeType) return faFileAlt; const lowerCase = String(filenameOrMimeType).toLowerCase(); if (lowerCase.includes('pdf')) return faFilePdf; if (lowerCase.includes('doc')) return faFileWord; if (lowerCase.includes('xls')) return faFileExcel; if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage; return faFileAlt; };
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

// --- Component ---
const ConventionForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated, baseApiUrl = 'http://localhost:8000/api' }) => {
    const intituleRef = useRef(null);
    const INTITULE_MAX = 250;
    const FILE_INTITULE_MAX = 120;
    const [formData, setFormData] = useState({
        Code: '',
        code_provisoire: '',
        Intitule: '',
        Annee_Convention: '',
        type: 'specifique',
        indicateur_suivi: '', // <--- AJOUTEZ CETTE LIGNE
        sous_type: '', // <-- ADD THIS
        requires_council_approval: true,
        numero_approbation: '',
        session: '',
        Statut: null,
        Cout_Global: '',
        duree_convention: '',
        date_visa: '',
        date_reception_vise: '',
        conventionCadreId: null,
        projetId: null,
        programmeId: null,
        observations: '',
        provinces: [],
        communes: [], // --- ADD THIS LINE ---
        fonctionnaires: [],
        maitresOuvrage: [],
        maitresOuvrageDelegues: [],
        membres_comite_technique: [],
        membres_comite_pilotage: [],
        Classification_prov: '',
        secteurId: null, // <-- ADD THIS LINE
        Reference: '',
        date_envoi_visa_mi: '', // Add new date field to state
        Objet: '',
        Objectifs: '',
        Maitre_Ouvrage: null,
        maitre_ouvrage_delegue:null,
        Operationalisation: 'Non',
        Groupe: '',
        Rang: '',
        has_audit: false,
        audit_text: '',
        cadence_reunion: '',
    });
    const [selectedPartenaires, setSelectedPartenaires] = useState([]);
    const [partnerEngagements, setPartnerEngagements] = useState([]);
    const [engagementTypes, setEngagementTypes] = useState([]);
    const [programmesOptions, setProgrammesOptions] = useState([]);
    const [provincesOptions, setProvincesOptions] = useState([]);
const [communesOptions, setCommunesOptions] = useState([]); // --- ADD THIS LINE ---

    const [projetsOptions, setProjetsOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
    const [conventionCadreOptions, setConventionCadreOptions] = useState([]);
    const [secteursOptions, setSecteursOptions] = useState([]); // <-- ADD THIS LINE
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [maitresOuvrageOptions, setMaitresOuvrageOptions] = useState([]); // <-- ADD THIS
    const [maitresOuvrageDeleguesOptions, setMaitresOuvrageDeleguesOptions] = useState([]);
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
    const SOUS_TYPE_OPTIONS = useMemo(() => ({
        'convention': [
            { value: 'Convention de partenariat', label: 'Convention de partenariat' },
            { value: 'Protocole d\'accord', label: 'Protocole d\'accord' },
            { value: 'Accord', label: 'Accord' },
            { value: 'Contrat', label: 'Contrat' },
                    { value: 'Maitrise d\'ouvrage delegue', label: 'Maitrise d\'ouvrage delegue' },

        ],
        
        'cadre': [
             { value: 'Convention de partenariat', label: 'Convention de partenariat' },
            { value: 'Protocole d\'accord', label: 'Protocole d\'accord' },
            { value: 'Accord', label: 'Accord' },
            { value: 'Contrat', label: 'Contrat' },
                    { value: 'Maitrise d\'ouvrage delegue', label: 'Maitrise d\'ouvrage delegue' },

        ],
        'specifique': [
             { value: 'Convention de partenariat', label: 'Convention de partenariat' },
            { value: 'Protocole d\'accord', label: 'Protocole d\'accord' },
            { value: 'Accord', label: 'Accord' },
            { value: 'Contrat', label: 'Contrat' },
                    { value: 'Maitrise d\'ouvrage delegue', label: 'Maitrise d\'ouvrage delegue' },

        ]
    }), []);
    const STATUT_OPTIONS = useMemo(() => [
        { value: "approuvé", label: "Approuvé", color: "success" },
        { value: "non visé", label: "Non Visé", color: "danger" },
        { value: "en cours de visa", label: "En Cours de Visa", color: "warning" },
        { value: "visé", label: "Visé", color: "info" },
        { value: "non signé", label: "Non Signé", color: "secondary" },
        { value: "en cours de signature", label: "En Cours de Signature", color: "warning" },
        { value: "signé", label: "Signé", color: "primary" }
    ], []);
    const groupedStatutOptions = useMemo(() => [{ label: "Approbation", options: STATUT_OPTIONS.slice(0, 1) }, { label: "Visa", options: STATUT_OPTIONS.slice(1, 4) }, { label: "Signature", options: STATUT_OPTIONS.slice(4, 7) }], [STATUT_OPTIONS]);

    const autosizeIntitule = useCallback(() => {
        if (intituleRef.current) {
            intituleRef.current.style.height = 'auto';
            intituleRef.current.style.height = Math.min(intituleRef.current.scrollHeight, 200) + 'px';
        }
    }, []);
    useEffect(() => { autosizeIntitule(); }, [formData.Intitule, autosizeIntitule]);

    const fetchOptions = useCallback(async () => {
        setLoadingOptions(true);
        const get = (url, params = {}) => axios.get(url, { ...params, withCredentials: true });
        const getArray = (res) => (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []));

        try {
            const cadreParams = isEditing ? { params: { exclude: itemId } } : {};
            const results = await Promise.allSettled([
                get(`${baseApiUrl}/options/programmes`),
                get(`${baseApiUrl}/options/partenaires`),
                get(`${baseApiUrl}/options/provinces`),
                get(`${baseApiUrl}/options/projets`),
                get(`${baseApiUrl}/options/fonctionnaires`),
                get(`${baseApiUrl}/conventions/options/cadre`, cadreParams),
                get(`${baseApiUrl}/options/engagement-types`),
                get(`${baseApiUrl}/options/secteurs`), // <-- ADD THIS API CALL
                get(`${baseApiUrl}/options/maitre-ouvrage`), // <-- ADD THIS
                get(`${baseApiUrl}/options/maitre-ouvrage-delegue`),
                get(`${baseApiUrl}/options/communes`), // --- ADD THIS LINE ---


            ]);

const [progRes, partRes, provRes, projRes, foncRes, cadreRes, engTypeRes, sectRes, moRes, modRes,comRes] = results            
            if (progRes.status === 'fulfilled') setProgrammesOptions(getArray(progRes.value));
            if (provRes.status === 'fulfilled') setProvincesOptions(getArray(provRes.value));
            if (comRes.status === 'fulfilled') {
    setCommunesOptions(getArray(comRes.value));
}
            if (projRes.status === 'fulfilled') setProjetsOptions(getArray(projRes.value));
            if (foncRes.status === 'fulfilled') setFonctionnairesOptions(foncRes.value.data.fonctionnaires.map(opt=>({value:opt.id,label:opt.nom_complet})));
            if (cadreRes.status === 'fulfilled') setConventionCadreOptions(getArray(cadreRes.value));
            if (engTypeRes.status === 'fulfilled') setEngagementTypes(getArray(engTypeRes.value));
            if (moRes.status === 'fulfilled') setMaitresOuvrageOptions(getArray(moRes.value));
            if (modRes.status === 'fulfilled') setMaitresOuvrageDeleguesOptions(getArray(modRes.value));
           if (sectRes.status === 'fulfilled') {
 const rawSecteurs = getArray(sectRes.value);
                const normalized = rawSecteurs.map(s => ({
                    value: s.id,
                    label: s.description_fr ?? s.description_ar ?? `Secteur ${s.id}`,
                    // keep original fields in case some code relies on them
                    id: s.id,
                    description_fr: s.description_fr,
                    description_ar: s.description_ar
                }));
                setSecteursOptions(normalized);
            }
        } catch (err) {
            setSubmissionStatus(prev => ({ ...prev, error: "Erreur de chargement des listes pour le formulaire." }));
        } finally {
            setLoadingOptions(false);
        }
    }, [baseApiUrl, isEditing, itemId]);

    useEffect(() => { fetchOptions(); }, [fetchOptions]);

  useEffect(() => {
    // If no itemId -> nothing to load
    if (!itemId) {
        setLoadingData(false);
        return;
    }

    // Avoid starting the fetch while options are still loading:
    if (loadingOptions) {
        // keep loadingData true until options finish
        return;
    }

    let isMounted = true;
    const fetchConventionData = async () => {
        setLoadingData(true);
        try {
            const response = await axios.get(`${baseApiUrl}/conventions/${itemId}`, { withCredentials: true });
            if (!isMounted) return;

            const data = response.data.convention || response.data;
            // helper to find single option by value (case-insensitive)
            const findOption = (opts, val) => (Array.isArray(opts) ? opts.find(opt => String(opt.value).toLowerCase() === String(val).toLowerCase()) : null);

            // helpers used below
            const parseMultiFromSemicolonString = (opts, str) => {
                if (!str || !Array.isArray(opts) || opts.length === 0) return [];
                try {
                    // try JSON first
                    if (String(str).trim().startsWith('[')) {
                        const parsed = JSON.parse(str);
                        if (Array.isArray(parsed)) {
                            const ids = new Set(parsed.map(x => String(x)));
                            return opts.filter(o => ids.has(String(o.value)));
                        }
                    }
                } catch (e) { /* ignore */ }
                // fallback to semicolon-separated
                const ids = new Set(String(str || '').split(';').map(x => x.trim()).filter(Boolean).map(x => x.toLowerCase()));
                return opts.filter(o => ids.has(String(o.value).toLowerCase()));
            };

            const findMultiOptionsById = (opts, items) => {
                if (!items || !Array.isArray(items) || !Array.isArray(opts)) return [];
                const ids = new Set(items.map(it => String(it.Id ?? it.id ?? it)));
                return opts.filter(opt => ids.has(String(opt.value)));
            };

            // Map response into formData (keep same keys you used previously)
            setFormData(prev => ({
                ...prev,
                Code: data.Code || prev.Code,
                code_provisoire: data.code_provisoire || prev.code_provisoire,
                Intitule: data.Intitule || prev.Intitule,
                indicateur_suivi: data.indicateur_suivi || prev.indicateur_suivi,
                Annee_Convention: data.Annee_Convention || prev.Annee_Convention,
                type: data.type || prev.type || 'specifique',
                numero_approbation: data.numero_approbation || prev.numero_approbation,
                session: data.session || prev.session,
                Statut: findOption(STATUT_OPTIONS, data.Statut),
                Cout_Global: data.Cout_Global ?? prev.Cout_Global,
                requires_council_approval: !!data.requires_council_approval,
                sous_type: data.sous_type || prev.sous_type || '',
                Maitre_Ouvrage: findOption(maitresOuvrageOptions, data.Maitre_Ouvrage),
                maitre_ouvrage_delegue: findOption(maitresOuvrageDeleguesOptions, data.maitre_ouvrage_delegue),
                duree_convention: data.duree_convention || prev.duree_convention,
                date_visa: data.date_visa || prev.date_visa,
                date_reception_vise: data.date_reception_vise || prev.date_reception_vise,
                date_envoi_visa_mi: data.date_envoi_visa_mi || prev.date_envoi_visa_mi,
                conventionCadreId: findOption(conventionCadreOptions, data.convention_cadre_id),
                projetId: findOption(projetsOptions, data.id_projet),
                programmeId: findOption(programmesOptions, data.Id_Programme),
                observations: data.observations || prev.observations,
                provinces: parseMultiFromSemicolonString(provincesOptions, data.localisation),
                communes: findMultiOptionsById(communesOptions, data.communes || []),
                fonctionnaires: parseMultiFromSemicolonString(fonctionnairesOptions, data.id_fonctionnaire),
                maitresOuvrage: (data.maitres_ouvrage || []).map(mo => ({ value: mo.id, label: mo.nom })),
                maitresOuvrageDelegues: (data.maitres_ouvrage_delegues || []).map(mod => ({ value: mod.id, label: mod.nom })),
                membres_comite_technique: (data.membres_comite_technique || []).map(m => ({ value: m, label: m })),
                membres_comite_pilotage: (data.membres_comite_pilotage || []).map(m => ({ value: m, label: m })),
                Classification_prov: data.Classification_prov || prev.Classification_prov,
                Reference: data.Reference || prev.Reference,
                Objet: data.Objet || prev.Objet,
                secteurId: findOption(secteursOptions, data.secteur_id),
                Objectifs: data.Objectifs || prev.Objectifs,
                Operationalisation: data.Operationalisation ?? prev.Operationalisation,
                Groupe: data.Groupe || prev.Groupe,
                Rang: data.Rang || prev.Rang,
                has_audit: !!data.has_audit,
                audit_text: data.audit_text || prev.audit_text,
                cadence_reunion: data.cadence_reunion || prev.cadence_reunion
            }));

            // commitments and partners (unchanged logic)
            const commitments = data.partner_commitments || [];
            const uniquePartnerIds = [...new Set(commitments.map(c => c.Id_Partenaire))];
            setSelectedPartenaires(uniquePartnerIds.map(id => {
                const c = commitments.find(item => item.Id_Partenaire === id);
                return { value: id, label: c?.label || `ID: ${id}` };
            }));
            setPartnerEngagements(commitments.map(c => ({
                id: c.Id_CP ?? generateTempId(),
                partenaire_id: c.Id_Partenaire,
                partenaire_label: c.label || `Partenaire ID ${c.Id_Partenaire}`,
                engagement_type_id: c.engagement_type_id,
                engagement_type_label: c.engagement_type_label,
                montant_convenu: c.Montant_Convenu || '',
                autre_engagement: c.autre_engagement || '',
                engagement_description: c.engagement_description || '',
                is_signatory: !!c.is_signatory,
                date_signature: c.date_signature || '',
                details_signature: c.details_signature || '',
                engagements_annuels: c.engagements_annuels || []
            })));
            setExistingDocuments((data.documents || []).map(doc => ({ id: doc.Id_Doc, name: doc.file_name, url: doc.url, type: doc.file_type, intitule: doc.Intitule || '' })));

        } catch (err) {
            if (isMounted) setSubmissionStatus({ loading: false, error: err.response?.data?.message || "Erreur chargement des données.", success: false });
        } finally {
            if (isMounted) setLoadingData(false);
        }
    };

    fetchConventionData();
    return () => { isMounted = false; };
}, [
    // make dependency array stable and explicit (same number of entries every render)
    itemId,
    loadingOptions,
    baseApiUrl,
    communesOptions,
    conventionCadreOptions,
    programmesOptions,
    projetsOptions,
    provincesOptions,
    fonctionnairesOptions,
    STATUT_OPTIONS,
    secteursOptions
]);
    const validateForm = () => {
        const errors = {};
        if (!formData.Intitule?.trim()) {
            errors.intitule = "Intitulé requis.";
        }
        if (!formData.Annee_Convention) {
            errors.annee_convention = "Année requise.";
        }
        if (formData.type === 'specifique' && !formData.conventionCadreId) {
            errors.convention_cadre_id = "La convention cadre est requise.";
        }
        if (!String(formData.numero_approbation || '').trim()) {
            errors.numero_approbation = "N° d'approbation requis.";
        }
        if (!formData.session) {
            errors.session = "Session requise.";
        }
        if (!formData.Statut) {
            errors.statut = "Statut requis.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (name === 'Intitule') {
            requestAnimationFrame(autosizeIntitule);
        }
    };
    
    const handleTypeToggleChange = (value) => {
        setFormData(prev => ({ ...prev, type: value,sous_type: '', // Reset sous_type
projetId: value === 'cadre' ? null : prev.projetId, conventionCadreId: value === 'cadre' ? null : prev.conventionCadreId, programmeId: value === 'specifique' ? null : prev.programmeId }));
    };


    const handleEngagementsChange = useCallback((engagements) => {
        setPartnerEngagements(engagements.map(eng => ({
            ...eng,
            id: eng.id || generateTempId()
        })));
    }, []);
    
    const handlePartenairesChange = (selectedOptions) => { setSelectedPartenaires(selectedOptions || []); };
    const handleMaitresOuvrageChange = (selectedOptions) => { setFormData(prev => ({ ...prev, maitresOuvrage: selectedOptions || [] })); };
    const handleMaitresOuvrageDeleguesChange = (selectedOptions) => { setFormData(prev => ({ ...prev, maitresOuvrageDelegues: selectedOptions || [] })); };
    const handleMaitreOuvragePrincipalChange = (selectedOption) => { setFormData(prev => ({ ...prev, Maitre_Ouvrage: selectedOption })); };
const handleMaitreOuvrageDeleguePrincipalChange = (selectedOption) => { setFormData(prev => ({ ...prev, maitre_ouvrage_delegue: selectedOption })); };

    // State to track filtered commune options based on selected provinces
const [filteredCommuneOptions, setFilteredCommuneOptions] = useState([]);
const [provincesChanged, setProvincesChanged] = useState(false);
  const [loading, setLoading] = useState(false);
const [optionsLoading, setOptionsLoading] = useState(false);
useEffect(() => {
    // client-side filter of communesOptions by selected provinces
    const allCommunes = Array.isArray(communesOptions) ? communesOptions : [];

    // no provinces selected -> show all communes
    if (!Array.isArray(formData.provinces) || formData.provinces.length === 0) {
        setFilteredCommuneOptions(allCommunes);
        // only clear selected communes if the user explicitly changed provinces
        if (provincesChanged) {
            setFormData(prev => ({ ...prev, communes: [], communesIds: [] }));
        }
        return;
    }

    const selectedProvinceIds = new Set(formData.provinces.map(p => String(p?.value ?? p)));

    const filtered = allCommunes.filter(c => {
        const prov = c.province_id ?? c.provinceId ?? c.province ?? c.Id_Province ?? c.provinceCode ?? c.region;
        if (prov === undefined || prov === null || prov === '') {
            // keep communes without a province key (safer)
            return true;
        }
        return selectedProvinceIds.has(String(prov));
    });

    setFilteredCommuneOptions(filtered);

    // if user changed provinces, prune selected communes to valid ones
    if (provincesChanged && Array.isArray(formData.communes) && formData.communes.length > 0) {
        const validValues = new Set(filtered.map(x => String(x.value ?? x.id ?? x)));
        const remaining = formData.communes.filter(s => validValues.has(String(s?.value ?? s)));
        if (remaining.length !== formData.communes.length) {
            setFormData(prev => ({ ...prev, communes: remaining, communesIds: remaining.map(r => r.value) }));
        }
    }
}, [formData.provinces, communesOptions, provincesChanged]);
    // Initialize filtered communes when communesOptions are loaded or when editing
    useEffect(() => {
        // When editing and provinces are loaded, filter communes
        if (isEditing && communesOptions.length > 0 && formData.provinces && formData.provinces.length > 0) {
            // This will be handled by the main useEffect above
            return;
        }
        // When no provinces selected or initial load, show all communes
        if (communesOptions.length > 0 && (!formData.provinces || formData.provinces.length === 0)) {
            setFilteredCommuneOptions(communesOptions);
        }
    }, [communesOptions, isEditing]);

const handleProvinceChange = (selectedOptions) => {
    setFormData(prev => ({ ...prev, provinces: Array.isArray(selectedOptions) ? selectedOptions : (selectedOptions ? [selectedOptions] : []) }));
    // mark that user changed provinces (enables pruning behavior)
    setProvincesChanged(true);
};

    const handleFonctionnaireChange = (selectedOptions) => { setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] })); };
    const handleCommuneChange = (selectedOptions) => { setFormData(prev => ({ ...prev, communes: selectedOptions || [] })); }; 
    const handleStatutChange = (selectedOption) => { setFormData(prev => ({ ...prev, Statut: selectedOption })); };
    const handleProgrammeChange = (selectedOption) => { setFormData(prev => ({ ...prev, programmeId: selectedOption })); };
const handleSecteurChange = (selectedOption) => { setFormData(prev => ({ ...prev, secteurId: selectedOption })); };
    const handleProjetChange = (selectedOption) => { setFormData(prev => ({ ...prev, projetId: selectedOption })); };
    const handleConventionCadreChange = (selectedOption) => { setFormData(prev => ({ ...prev, conventionCadreId: selectedOption })); };


    const executeSubmit = async (formDataPayload, confirmDelete = false) => {
        setSubmissionStatus({ loading: true, error: null, success: false });
        if (confirmDelete) formDataPayload.append('confirm_delete_commitments', '1');
        if (isEditing) formDataPayload.append('_method', 'PUT');

        const url = isEditing ? `${baseApiUrl}/conventions/${itemId}` : `${baseApiUrl}/conventions`;

        try {
            const response = await axios.post(url, formDataPayload, { headers: { 'Accept': 'application/json' }, withCredentials: true });
            setSubmissionStatus({ loading: false, error: null, success: true });
            const cb = isEditing ? onItemUpdated : onItemCreated;
            cb?.(response.data.convention);
            setTimeout(onClose, 1200);
        } catch (err) {
            const error = err.response;
            if (error?.status === 409 && error.data?.requires_confirmation) {
                setConfirmModalData({ message: error.data.message, details: error.data.details });
                setDataToResubmit(formDataPayload);
                setShowConfirmModal(true);
                setSubmissionStatus({ loading: false, error: null, success: false });
                return;
            }
            if (error?.status === 422) setFormErrors(error.data.errors || {});
            setSubmissionStatus({ loading: false, error: error?.data?.message || "Une erreur est survenue.", success: false });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateForm()) {
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs indiquées.", success: false });
            return;
        }

        const dataPayload = new FormData();
        
        // Map form fields to backend field names
        const fieldMappings = {
            'Intitule': 'intitule',
            'sous_type': 'sous_type', // <-- ADD THIS
    'requires_council_approval': 'requires_council_approval' ,
            'Annee_Convention': 'annee_convention',
            'conventionCadreId': 'convention_cadre_id',
            'projetId': 'id_projet',
            'programmeId': 'Id_Programme',
            'Statut': 'statut',
            'secteurId': 'secteur_id', // <-- ADD THIS MAPPING
            'type': 'type',
            'numero_approbation': 'numero_approbation',
            'session': 'session',
            'Cout_Global': 'cout_global',
            'observations': 'observations',
             'Maitre_Ouvrage': 'maitre_ouvrage',
            'maitre_ouvrage_delegue': 'maitre_ouvrage_delegue',
             'date_envoi_visa_mi': 'date_envoi_visa_mi', // Map the new field
            'has_audit': 'has_audit',
            'audit_text': 'audit_text',
            'cadence_reunion': 'cadence_reunion',
};
        if (formData.type === ('maitrise d\'ouvrage delegue' || formData.type === 'convention' )&& !formData.requires_council_approval) {
    dataPayload.append('code', formData.Code || '');
}

        // Process form data with correct field names
        Object.entries(formData).forEach(([key, value]) => {
            const backendKey = fieldMappings[key] || key.toLowerCase();
            let processedValue = value;

            // --- START OF MODIFICATION ---

            // Define all keys that hold a single react-select object
            const singleSelectKeys = [
                'Statut', 'conventionCadreId', 'projetId', 'programmeId', 
                'secteurId', 'Maitre_Ouvrage', 'maitre_ouvrage_delegue'
            ];
        if (key === 'requires_council_approval'|| key === 'has_audit') {
                // Convert boolean to 1 or 0 for the backend validator
                processedValue = value ? '1' : '0';
            } 
           else if (singleSelectKeys.includes(key)) {
                // For all single-select fields, extract the 'value' property
                processedValue = value?.value || '';
            } else if (Array.isArray(value)) {
                // This correctly handles multi-select fields
                processedValue = JSON.stringify(value.map(v => v.value));
            } else if (key === 'Cout_Global') {
                processedValue = value ? parseCurrency(value) : '';
            }


            dataPayload.append(backendKey, processedValue ?? '');
        });

        // Handle special fields
        dataPayload.set('localisation', JSON.stringify(formData.provinces.map(p => p.value)));
        formData.communes.forEach(item => dataPayload.append('communes[]', item.value));
        dataPayload.set('maitres_ouvrage_ids', JSON.stringify(formData.maitresOuvrage.map(mo => mo.value)));
        dataPayload.set('maitres_ouvrage_delegues_ids', JSON.stringify(formData.maitresOuvrageDelegues.map(mod => mod.value)));
        dataPayload.set('id_fonctionnaire', JSON.stringify(formData.fonctionnaires.map(f => f.value)));

        // Handle partner commitments
const partnerCommitmentsPayload = partnerEngagements.map(eng => ({
    id_cp: typeof eng.id === 'number' ? eng.id : null,
    Id_Partenaire: eng.partenaire_id,
    engagement_type_id: eng.engagement_type_id,
    Montant_Convenu: eng.montant_convenu ? parseCurrency(eng.montant_convenu) : null,
    autre_engagement: eng.autre_engagement || null,
    engagement_description: eng.engagement_description || null,
    is_signatory: eng.is_signatory,
    date_signature: eng.is_signatory ? eng.date_signature : null,
    details_signature: eng.is_signatory ? eng.details_signature : null,
    // --- FIX: Add the yearly breakdown data to the payload ---
    engagements_annuels: Array.isArray(eng.engagements_annuels) 
        ? eng.engagements_annuels.map(y => ({
            annee: y.annee,
            montant_prevu: y.montant_prevu ? parseCurrency(y.montant_prevu) : 0
        })) 
        : []
}));
        dataPayload.append('partner_commitments', JSON.stringify(partnerCommitmentsPayload));

        // Handle files
        newFiles.forEach((fw, i) => {
            dataPayload.append('fichiers[]', fw.file);
            dataPayload.append(`intitules[${i}]`, fw.intitule);
        });

        if (isEditing) {
            dataPayload.append('_method', 'PUT');
            dataPayload.append('documents_existants_meta', JSON.stringify(existingDocuments.map(d => ({ 
                id: d.id, 
                intitule: d.intitule 
            }))));
            dataPayload.append('deleted_document_ids', JSON.stringify(documentsToDelete));
        }

        executeSubmit(dataPayload, false);
    };

    const handleFileChange = (e) => { setNewFiles(prev => [...prev, ...Array.from(e.target.files).map(f => ({ file: f, intitule: '' }))]); e.target.value = null; };
    const handleRemoveNewFile = (index) => { setNewFiles(prev => prev.filter((_, i) => i !== index)); };
    const handleMarkForDeletion = (id) => { setDocumentsToDelete(prev => [...new Set([...prev, id])]); };
    const handleUnmarkForDeletion = (id) => { setDocumentsToDelete(prev => prev.filter(docId => docId !== id)); };
    const handleModalConfirm = () => { if(dataToResubmit) executeSubmit(dataToResubmit, true); setShowConfirmModal(false); };
    const handleModalCancel = () => setShowConfirmModal(false);

    if (loadingOptions || loadingData) {
        return <div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '400px' }}><Spinner animation="border" variant="primary" /><span className='ms-3 text-muted'>Chargement du formulaire...</span></div>;
    }
    const isSpecialType = ['convention'].includes(formData.type); // 'maitrise...' removed
const showAutoGeneratedCodeFields = !isSpecialType || formData.requires_council_approval;
const showManualCodeField = isSpecialType && !formData.requires_council_approval;
const availableSousTypes = SOUS_TYPE_OPTIONS[formData.type] || [];
const showSousTypeField = availableSousTypes.length > 0;
// --- ADD THESE TWO LINES ---
const showProgrammeField = ['cadre', 'convention'].includes(formData.type);
const showProjetField = ['specifique', 'convention'].includes(formData.type);
    return (
        <>
            <div className='p-4'  style={{
    backgroundColor: '#fff', 
    borderRadius: '15px',
    ...(isEditing ? {
        boxShadow: 'none'
    } : {
        boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
        height: 'calc(100vh - 110px)',
        display: 'flex',
        flexDirection: 'column'
    })
}}>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0 border-bottom pb-2">
                    <div><h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier la' : 'Créer une nouvelle'}</h5><h2 className="mb-0 fw-bold">Convention {isEditing ? `(Code: ${formData.Code})` : ''}</h2></div>
                    <Button variant="light" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold' onClick={onClose} size="sm" title="Retour">Revenir a la liste</Button>
                </div>
                <div className="flex-grow-1 px-2" style={{ overflowY: 'auto', scrollBehavior: 'smooth' }}>
                    {submissionStatus.error && <Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({ ...prev, error: null }))}><FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> {submissionStatus.error}</Alert>}
                    {submissionStatus.success && <Alert variant="success" className="mb-3 py-2">Convention {isEditing ? 'modifiée' : 'créée'} avec succès !</Alert>}
    <div className="container-fluid"> {/* <-- Add this wrapper */}

                    <Form noValidate onSubmit={handleSubmit} id="convention-main-form">
                        
                        <Card className="shadow-none border-0">
    
    <Card.Body className="d-flex justify-content-center" style={{ paddingInline: '0.75rem' }}>
        <ToggleButtonGroup 
            type="radio" 
            name="type" 
            value={formData.type} 
            onChange={handleTypeToggleChange} 
            className='d-flex flex-wrap justify-content-center gap-3'
        >
            {/* Using padding for button size and rounded-pill for style */}
            <ToggleButton id="type-toggle-cadre" value="cadre" variant="outline-warning" className="rounded-pill shadow-sm px-4 py-2">
                <span className='text-dark'>Convention Cadre</span>
            </ToggleButton>
            <ToggleButton id="type-toggle-specifique" value="specifique" variant="outline-warning" className="rounded-pill shadow-sm px-4 py-2">
                <span className='text-dark'>Convention Spécifique</span>
            </ToggleButton>
            <ToggleButton id="type-toggle-convention" value="convention" variant="outline-warning" className="rounded-pill shadow-sm px-4 py-2">
        <span className='text-dark'>Convention</span>
    </ToggleButton>
    
        </ToggleButtonGroup>
        
        {/* Note: The error message will now appear below the centered buttons, which is fine. */}
        {formErrors.type && <div className="d-block invalid-feedback text-white mt-2 text-center">{formErrors.type}</div>}
    </Card.Body>
</Card>

                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={6} controlId="formIntitule">
                                <Form.Label className=" w-100  mb-1 fw-medium">
                                    {bilingualLabel("Intitulé", "العنوان", true)}
                                </Form.Label>
                                <Form.Control ref={intituleRef} className={textareaClass} isInvalid={!!formErrors.Intitule} required as="textarea" rows={1} name="Intitule" value={formData.Intitule} onChange={handleChange} size="sm" placeholder="Saisir l'intitulé..." maxLength={INTITULE_MAX} onFocus={autosizeIntitule} />
                                <div className="form-text d-flex justify-content-between"><span>Utilisez des termes clairs et précis.</span><span>{(formData.Intitule || '').length}/{INTITULE_MAX}</span></div>
                                <Form.Control.Feedback type="invalid">{formErrors.Intitule}</Form.Control.Feedback>
                            </Form.Group>
                            
<Form.Group as={Col}  controlId="formSecteur">
        <Form.Label className="w-100 mb-1 fw-medium">
            {bilingualLabel("Secteur", "القطاع")}
        </Form.Label>
        <Select
            inputId='secteur-select-input'
            name="secteurId"
            options={secteursOptions}
            value={formData.secteurId}
            onChange={handleSecteurChange}
            styles={selectStyles}
            placeholder="- Selectionner -"
            isClearable
            isLoading={loadingOptions}
            /* options are normalized to { value, label } so no need for custom getters */
            className={formErrors.secteur_id ? 'is-invalid' : ''}
        />
        <Form.Control.Feedback type="invalid" style={{ display: formErrors.secteur_id ? 'block' : 'none' }}>
            {formErrors.secteur_id}
        </Form.Control.Feedback>
    </Form.Group>
                            
                            <Form.Group as={Col} controlId="formAnnee_Convention">
                                <Form.Label className=" w-100  mb-1 fw-medium">
                                    {bilingualLabel("Année De Session", "سنة الدورة", formData.requires_council_approval)}
                                </Form.Label>
                                <Form.Control className={inputClass} isInvalid={!!formErrors.Annee_Convention} required type="number" name="Annee_Convention" value={formData.Annee_Convention} onChange={handleChange} size="sm" placeholder="YYYY" min="1900" max={new Date().getFullYear() + 10} />
                                <Form.Control.Feedback type="invalid">{formErrors.Annee_Convention}</Form.Control.Feedback>
                            </Form.Group>
                        </Row>
{isSpecialType && (
    <Row className="mb-3 g-3 justify-content-center">
        <Col md={8}>
            <Card className="shadow-sm border-2 border-primary">
                <Card.Body className="text-center">
                    <Form.Group controlId="formRequiresCouncilApproval">
                        <Form.Check 
                            type="switch"
                            id="requires-approval-switch"
                            label="Cette convention requiert-elle l'approbation du conseil ? / تحتاج للمصادقة من طرف المجلس"
                            checked={formData.requires_council_approval}
                            onChange={(e) => setFormData(prev => ({ ...prev, requires_council_approval: e.target.checked }))}
                        />
                    </Form.Group>
                </Card.Body>
            </Card>
        </Col>
    </Row>
)}
{showAutoGeneratedCodeFields && (
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={4} controlId="formDureeConvention">
                                <Form.Label className=" w-100  mb-1 fw-medium">
                                    {bilingualLabel("Durée (mois)", "المدة (بالأشهر)")}
                                </Form.Label>
                                <Form.Control className={inputClass} isInvalid={!!formErrors.duree_convention} type="number" name="duree_convention" placeholder="ex: 36" value={formData.duree_convention} onChange={handleChange} size="sm" />
                                <Form.Control.Feedback type="invalid">{formErrors.duree_convention}</Form.Control.Feedback>
                            </Form.Group>
                            
                            <Form.Group as={Col} md={4} controlId="formNumeroApprobation">
                                <Form.Label className=" w-100  mb-1 fw-medium">
                                    {bilingualLabel("N° approbation", "رقم الموافقة",true)} 
                                </Form.Label>
                                <Form.Control className={inputClass} isInvalid={!!formErrors.numero_approbation} type="text" name="numero_approbation" value={formData.numero_approbation} onChange={handleChange} size="sm" />
                                <Form.Control.Feedback type="invalid">{formErrors.numero_approbation}</Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group as={Col} md={4} controlId="formSession">
                                <Form.Label className=" w-100  mb-1 fw-medium">
                                    {bilingualLabel("Session (Mois)", "الدورة (الشهر)",true)} 
                                </Form.Label>
                                <Form.Select className={inputClass} name="session" value={formData.session} onChange={handleChange} isInvalid={!!formErrors.session} size="sm">
                                    <option value="">Sélectionner un mois</option>
                                    {[...Array(12).keys()].map(i => (<option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('fr', { month: 'long' })}</option>))}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">{formErrors.session}</Form.Control.Feedback>
                            </Form.Group>
                        </Row>
)}
{showManualCodeField && (
    <Row className="mb-3 g-3">
        <Form.Group as={Col} md={4} controlId="formDureeConvention">
                                <Form.Label className=" w-100  mb-1 fw-medium">
                                    {bilingualLabel("Durée (mois)", "المدة (بالأشهر)")}
                                </Form.Label>
                                <Form.Control className={inputClass} isInvalid={!!formErrors.duree_convention} type="number" name="duree_convention" placeholder="ex: 36" value={formData.duree_convention} onChange={handleChange} size="sm" />
                                <Form.Control.Feedback type="invalid">{formErrors.duree_convention}</Form.Control.Feedback>
                            </Form.Group>

        <Form.Group as={Col} md={8} controlId="formManualCode">
            <Form.Label className=" w-100  mb-1 fw-medium">
                {bilingualLabel("Code Convention (Manuel)", "رمز الاتفاقية (يدوي)", true)} 
            </Form.Label>
            <Form.Control 
                className={inputClass} 
                isInvalid={!!formErrors.code} 
                required 
                type="text" 
                name="Code" // Use 'Code' to match existing state property
                value={formData.Code} 
                onChange={handleChange} 
                size="sm"
                placeholder="Saisir le code manuellement..."
            />
            <Form.Control.Feedback type="invalid">{formErrors.code}</Form.Control.Feedback>
        </Form.Group>
    </Row>
)}
           

     {/* --- REPLACE THE ENTIRE ROW WITH THIS BLOCK --- */}
<Row className="mb-3 g-3">
    {showProgrammeField && (
        <Form.Group as={Col} md={showProjetField ? 4 : 6} controlId="formId_Programme">
            <Form.Label className=" w-100 mb-1 fw-medium">{bilingualLabel("Programme", "البرنامج")}</Form.Label>
            <Select inputId='programme-select-input' name="programmeId" menuPlacement="auto" options={programmesOptions} value={formData.programmeId} onChange={handleProgrammeChange} styles={selectStyles} placeholder="- Selectionner -" isClearable isLoading={loadingOptions} className={formErrors.Id_Programme ? 'is-invalid' : ''} />
            <Form.Control.Feedback type="invalid" style={{ display: formErrors.Id_Programme ? 'block' : 'none' }}>{formErrors.Id_Programme}</Form.Control.Feedback>
        </Form.Group>
    )}
    
    {formData.type === 'specifique' && (
        <Form.Group as={Col}  controlId="formconvention_cadre_id">
            <Form.Label className=" w-100 mb-1 fw-medium">{bilingualLabel("Convention Cadre", "الاتفاقية الإطار")}</Form.Label>
            <Select inputId='convention-cadre-select-input' name="conventionCadreId" options={conventionCadreOptions} value={formData.conventionCadreId} onChange={handleConventionCadreChange} styles={selectStyles} placeholder="- Selectionner -" isClearable isLoading={loadingOptions} className={formErrors.convention_cadre_id ? 'is-invalid' : ''} />
            <Form.Control.Feedback type="invalid" style={{ display: formErrors.convention_cadre_id ? 'block' : 'none' }}>{formErrors.convention_cadre_id}</Form.Control.Feedback>
        </Form.Group>
    )}

    {showProjetField && (
        <Form.Group as={Col}  controlId="formId_Projet">
            <Form.Label className=" w-100 mb-1 fw-medium">{bilingualLabel("Projet", "المشروع")}</Form.Label>
            <Select inputId='projet-select-input' name="projetId" menuPlacement="auto" options={projetsOptions} value={formData.projetId} onChange={handleProjetChange} styles={selectStyles} placeholder="- Selectionner -" isClearable isLoading={loadingOptions} className={formErrors.id_projet ? 'is-invalid' : ''} />
            <Form.Control.Feedback type="invalid" style={{ display: formErrors.id_projet ? 'block' : 'none' }}>{formErrors.id_projet}</Form.Control.Feedback>
        </Form.Group>
    )}
    
    <Form.Group as={Col} controlId="formCout_Global"><Form.Label className=" w-100  mb-1 fw-medium">{bilingualLabel("Cout Global (MAD)", "التكلفة الإجمالية (درهم)")}</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Cout_Global} type="number" step="0.01" min="0" name="Cout_Global" value={formData.Cout_Global} onChange={handleChange} size="sm" /><Form.Control.Feedback type="invalid">{formErrors.Cout_Global}</Form.Control.Feedback></Form.Group>
</Row>
<Row className="mb-3 g-3">
    {showSousTypeField && (
                                <Form.Group as={Col}  controlId="formSousType">
                                    <Form.Label className="w-100 mb-1 fw-medium">
                                        {bilingualLabel("Sous-type", "النوع الفرعي")}
                                    </Form.Label>
                                    <Select
                                        name="sous_type"
                                        options={availableSousTypes}
                                        value={availableSousTypes.find(opt => opt.value === formData.sous_type) || null}
                                        onChange={(option) => setFormData(prev => ({...prev, sous_type: option ? option.value : ''}))}
                                        styles={selectStyles}
                                        placeholder="- Selectionner -"
                                        isClearable
                                        className={formErrors.sous_type ? 'is-invalid' : ''}
                                    />
                                    <Form.Control.Feedback type="invalid" style={{ display: formErrors.sous_type ? 'block' : 'none' }}>
                                        {formErrors.sous_type}
                                    </Form.Control.Feedback>
                                </Form.Group>
                            )}
                            <Form.Group as={Col} controlId="formProvince">
                                <Form.Label className=" w-100  mb-1 fw-medium">
                                    {bilingualLabel("Localisation", "الموقع")}
                                </Form.Label>
                                <Select inputId='province-select-input' name="provinces" menuPlacement="auto" options={provincesOptions} value={formData.provinces} onChange={handleProvinceChange} styles={selectStyles} placeholder="- Selectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions} className={formErrors.Province ? 'is-invalid' : ''} />
                                <Form.Control.Feedback type="invalid" style={{ display: formErrors.Province ? 'block' : 'none' }}>{formErrors.Province}</Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group as={Col} controlId="formCommune">
    <Form.Label className=" w-100 mb-1 fw-medium">{bilingualLabel("Communes", "الجماعات")}</Form.Label>
   <Select
    inputId="communes-select"
    isMulti
    options={filteredCommuneOptions}
      styles={selectStyles}
    value={Array.isArray(formData.communes) ? formData.communes : []}
    onChange={(selected) => {
        const arr = Array.isArray(selected) ? selected : [];
        setFormData(prev => ({ ...prev, communes: arr, communesIds: arr.map(s => s.value) }));
    }}
    placeholder="Sélectionner les communes"
    isClearable
    isSearchable
    isLoading={optionsLoading}
    classNamePrefix="react-select"
/>
    {(!formData.provinces || formData.provinces.length === 0) && (
        <Form.Text className="text-muted">Veuillez d'abord sélectionner au moins une province</Form.Text>
    )}
    <Form.Control.Feedback type="invalid" style={{ display: formErrors.communes ? 'block' : 'none' }}>{formErrors.communes}</Form.Control.Feedback>
</Form.Group>
</Row>
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} controlId="formStatut"><Form.Label className=" w-100  mb-1 fw-medium">
                                {bilingualLabel("Statut", "الحالة",true)} 
                            </Form.Label><Select inputId='statut-select-input' name="Statut" options={groupedStatutOptions} value={formData.Statut} onChange={handleStatutChange} styles={selectStyles} placeholder="- Sélectionner Statut -" isClearable formatGroupLabel={(group) => (<div style={{ fontWeight: 'bold', color: '#555', borderTop: '1px solid #eee', paddingTop: '5px', marginTop: '5px' }}>{group.label}</div>)} className={formErrors.Statut ? 'is-invalid' : ''} /><Form.Control.Feedback type="invalid" style={{ display: formErrors.Statut ? 'block' : 'none' }}>{formErrors.Statut}</Form.Control.Feedback></Form.Group>
                            {formData.Statut?.value === 'en cours de visa' && (
                                    <Form.Group as={Col} md={4} controlId="formDateEnvoiVisaMi">
                                        <Form.Label className=" w-100  mb-1 fw-medium">
                                            {bilingualLabel("Date d'envoi visa MI", "تاريخ الإرسال للتأشيرة", true)}
                                        </Form.Label>
                                        <Form.Control 
                                            className={inputClass} 
                                            isInvalid={!!formErrors.date_envoi_visa_mi} 
                                            required 
                                            type="date" 
                                            name="date_envoi_visa_mi" 
                                            value={formData.date_envoi_visa_mi} 
                                            onChange={handleChange} 
                                            size="sm" 
                                        />
                                        <Form.Control.Feedback type="invalid">{formErrors.date_envoi_visa_mi}</Form.Control.Feedback>
                                    </Form.Group>
                                )}
                            {formData.Statut?.value === 'visé' && (
                                <>
                                <Form.Group as={Col} md={4} controlId="formDateVisa">
                                    <Form.Label className=" w-100  mb-1 fw-medium">
                                        {bilingualLabel("Date de visa", "تاريخ التأشيرة")}
                                    </Form.Label>
                                    <Form.Control className={inputClass} isInvalid={!!formErrors.date_visa} required type="date" name="date_visa" value={formData.date_visa} onChange={handleChange} size="sm" />
                                    <Form.Control.Feedback type="invalid">{formErrors.date_visa}</Form.Control.Feedback>
                                </Form.Group>
                                <Form.Group as={Col} md={4} controlId="formDateReceptionVise">
                                    <Form.Label className=" w-100  mb-1 fw-medium">
                                        {bilingualLabel("Date de réception", "تاريخ الاستلام")}
                                    </Form.Label>
                                    <Form.Control className={inputClass} isInvalid={!!formErrors.date_reception_vise} required type="date" name="date_reception_vise" value={formData.date_reception_vise} onChange={handleChange} size="sm" />
                                    <Form.Control.Feedback type="invalid">{formErrors.date_reception_vise}</Form.Control.Feedback>
                                </Form.Group>
                                </>
                            )}
                            <Form.Group as={Col} md={4} controlId="formCodeProvisoire">
                                <Form.Label className=" w-100  mb-1 fw-medium">
                                    {bilingualLabel("Code Provisoire", "الرمز المؤقت")}
                                </Form.Label>
                                <Form.Control className={inputClass} isInvalid={!!formErrors.code_provisoire} type="text" name="code_provisoire" value={formData.code_provisoire} onChange={handleChange} size="md" placeholder="Optionnel..." />
                                <Form.Control.Feedback type="invalid">{formErrors.code_provisoire}</Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group as={Col} md={4} controlId="formOperationalisation"><Form.Label className=" w-100  mb-1 fw-medium">
                                {bilingualLabel("Opérationnel", "تشغيلي")}
                            </Form.Label>
                                <div>
                                    <Form.Check inline type="radio" label="Oui" name="Operationalisation" id="operationalisation-oui" value="Oui" checked={formData.Operationalisation === 'Oui'} onChange={handleChange} isInvalid={!!formErrors.Operationalisation} />
                                    <Form.Check inline type="radio" label="Non" name="Operationalisation" id="operationalisation-non" value="Non" checked={formData.Operationalisation === 'Non'} onChange={handleChange} isInvalid={!!formErrors.Operationalisation} />
                                    {formErrors.Operationalisation && (<Form.Control.Feedback type="invalid" style={{ display: 'block' }}>{formErrors.Operationalisation}</Form.Control.Feedback>)}
                                </div>
                            </Form.Group>
                        </Row>
                        <br/>
<hr/>
            
 <Row className="mb-3 g-3 mt-3">
<Form.Group as={Col} md={6} controlId="formMaitre_Ouvrage">
        <Form.Label className=" w-100  mb-1 fw-medium">
            {bilingualLabel("Maitre d'Ouvrage (Principal)", "صاحب المشروع (الرئيسي)")}
        </Form.Label>
        <MaitreOuvrageManager 
                        isMulti={false} // Use the manager for consistency (we'll adapt it soon)
                        selectedMaitresOuvrage={formData.Maitre_Ouvrage} 
                        onSelectionChange={handleMaitreOuvragePrincipalChange} 
                        baseApiUrl={baseApiUrl} 
                        type="maitre_ouvrage"
                        // No exclusions needed for the principal
                    />

        <Form.Control.Feedback type="invalid">{formErrors.Maitre_Ouvrage}</Form.Control.Feedback>
    </Form.Group>
    <Form.Group as={Col} md={6} controlId="formMaitreOuvrageDelegue">
        <Form.Label className=" w-100  mb-1 fw-medium">
            {bilingualLabel("Maitre d'Ouvrage Délégué (Principal)", "صاحب المشروع المنتدب (الرئيسي)")}
        </Form.Label>
         <MaitreOuvrageManager 
                        isMulti={false} // Use the manager for consistency (we'll adapt it soon)
                        selectedMaitresOuvrage={formData.maitre_ouvrage_delegue} 
                        onSelectionChange={handleMaitreOuvrageDeleguePrincipalChange} 
                        baseApiUrl={baseApiUrl} 
                        type="maitre_ouvrage_delegue"
                        // No exclusions needed for the principal
        />

        <Form.Control.Feedback type="invalid">{formErrors.maitre_ouvrage_delegue}</Form.Control.Feedback>
    </Form.Group>
    

                        </Row>

<Card className="mb-4 shadow-sm" style={{ borderLeft: '4px solid #6f42c1' }}>
    <Card.Header className='bg-white py-2'><h6 className='mb-0 fw-bold text-purple'><FontAwesomeIcon icon={faBuilding} className="me-2" />Maîtres d'Ouvrage</h6></Card.Header>
    <Card.Body className="pb-3 pt-3" style={{ backgroundColor: '#f8f9fa' }}>

        <div className="d-md-flex gap-3">
            <div className="flex-fill mb-3 mb-md-0">
                <MaitreOuvrageManager 
                    selectedMaitresOuvrage={formData.maitresOuvrage} 
                    onSelectionChange={handleMaitresOuvrageChange} 
                    baseApiUrl={baseApiUrl} 
                    excludedOptions={formData.Maitre_Ouvrage ? [formData.Maitre_Ouvrage] : []}
                    type="maitre_ouvrage" 
                />
            </div>
            <div className="flex-fill">
                <MaitreOuvrageManager 

                    selectedMaitresOuvrage={formData.maitresOuvrageDelegues} 
                    onSelectionChange={handleMaitresOuvrageDeleguesChange} 
                    baseApiUrl={baseApiUrl}
                    excludedOptions={formData.maitre_ouvrage_delegue ? [formData.maitre_ouvrage_delegue] : []}
                    type="maitre_ouvrage_delegue" 
                />
            </div>
        </div>
    </Card.Body>
</Card>
                        <Card className="mb-4 shadow-sm" style={{ borderLeft: '4px solid #198754' }}>
                            <Card.Header className='bg-white py-2'><h6 className='mb-0 fw-bold text-success'><FontAwesomeIcon icon={faHandshake} className="me-2" />Partenaires & Engagements</h6></Card.Header>
                            <Card.Body className="pb-3 pt-3" style={{ backgroundColor: '#f8f9fa' }}>
                                <PartenaireManager 
                                    selectedPartenaires={selectedPartenaires} 
                                    onSelectionChange={setSelectedPartenaires} 
                                    baseApiUrl={baseApiUrl} 
                                />
                                {selectedPartenaires.length > 0 && (
                                    <div className="mt-4">
                                        <PartenaireEngagementManager
    selectedPartenaires={selectedPartenaires}
    onEngagementsChange={handleEngagementsChange}
    engagementTypes={engagementTypes}
    initialEngagements={partnerEngagements}
    // --- ADD THESE TWO PROPS ---
    conventionYear={formData.Annee_Convention}
    conventionDuration={formData.duree_convention}
    conventionCoutGlobal={formData.Cout_Global} // <--- AJOUTEZ CETTE LIGNE

/>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>

                        <Card className="mb-4 shadow-sm" style={{ borderLeft: '4px solid #0dcaf0' }}>
                            <Card.Header className='bg-white py-2'><h6 className='mb-0 fw-bold text-info'><FontAwesomeIcon icon={faUserShield} className="me-2" />Comités de Suivi</h6></Card.Header>
                            <Card.Body className="pb-3 pt-3" style={{ backgroundColor: '#f8f9fa' }}>
                                <Row>
                                    <Col md={12} className="mb-3">
                                        <Form.Group controlId="formMembresTechnique">
                                            <Form.Label className=" w-100   w-100 mb-1 fw-medium">Membres Comité Technique</Form.Label>
                                            <CreatableSelect isMulti isClearable components={{ DropdownIndicator: null }} value={formData.membres_comite_technique} onChange={(newValue) => setFormData(prev => ({ ...prev, membres_comite_technique: newValue || [] }))} placeholder="Saisir un nom et appuyer sur Entrée..." styles={{ ...selectStyles, menu: () => ({ display: 'none' }) }} noOptionsMessage={() => "Saisir un nom pour l'ajouter"} formatCreateLabel={(inputValue) => `Ajouter "${inputValue}"`} />
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group controlId="formMembresPilotage">
                                            <Form.Label className=" w-100   w-100 mb-1 fw-medium">Membres Comité de Pilotage</Form.Label>
                                            <CreatableSelect isMulti isClearable components={{ DropdownIndicator: null }} value={formData.membres_comite_pilotage} onChange={(newValue) => setFormData(prev => ({ ...prev, membres_comite_pilotage: newValue || [] }))} placeholder="Saisir un nom et appuyer sur Entrée..." styles={{ ...selectStyles, menu: () => ({ display: 'none' }) }} noOptionsMessage={() => "Saisir un nom pour l'ajouter"} formatCreateLabel={(inputValue) => `Ajouter "${inputValue}"`} />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Card.Body>
                        </Card>

                        <Card className="mb-4 shadow-sm" id="file-management-card" style={{ borderLeft: '4px solid #fd7e14' }}>
                            <Card.Header className='bg-white py-2'><h6 className='mb-0 fw-bold text-warning'><FontAwesomeIcon icon={faFolderOpen} className="me-2" />Gestion des Fichiers</h6></Card.Header>
                            <Card.Body className="pb-3 pt-3" style={{ backgroundColor: '#f8f9fa' }}>
                                {isEditing && existingDocuments.length > 0 && (
                                    <>
                                        <h6 className="text-muted mb-2">Fichiers Actuels :</h6>
                                        <ListGroup variant="flush" className="mb-3 border rounded-3">
                                            {existingDocuments.map((doc) => (
                                                <ListGroup.Item key={doc.id} className={`px-2 py-2 border-bottom ${documentsToDelete.includes(doc.id) ? 'bg-light text-muted text-decoration-line-through' : ''}`}>
                                                    <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                                        <div className="d-flex align-items-center text-truncate me-2">
                                                            <FontAwesomeIcon icon={getFileIcon(doc.type || doc.name)} className="me-2 text-secondary" fixedWidth />
                                                            {doc.url ? (<a href={doc.url} target="_blank" rel="noopener noreferrer" className={`text-truncate me-2 fw-medium ${documentsToDelete.includes(doc.id) ? 'text-muted' : 'link-primary'}`}>{doc.name}<FontAwesomeIcon icon={faExternalLinkAlt} size="xs" className="ms-1" /></a>) : (<span className={`text-truncate me-2 fw-medium ${documentsToDelete.includes(doc.id) ? 'text-muted' : ''}`}>{doc.name}</span>)}
                                                        </div>
                                                        <div className="flex-grow-1 d-flex align-items-center gap-2">
                                                            <div className="flex-grow-1">
                                                                <Form.Control type="text" size="sm" placeholder={`Intitulé...`} value={doc.intitule || ''} onChange={(e) => setExistingDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, intitule: e.target.value } : d))} className="form-control-sm rounded-3 shadow-sm" disabled={documentsToDelete.includes(doc.id)} maxLength={FILE_INTITULE_MAX} />
                                                                <div className="form-text text-muted d-flex justify-content-end mt-1">{(doc.intitule || '').length}/{FILE_INTITULE_MAX}</div>
                                                            </div>
                                                            {documentsToDelete.includes(doc.id) ? (<Button variant="outline-secondary" size="sm" onClick={() => handleUnmarkForDeletion(doc.id)}><FontAwesomeIcon icon={faUndo} /></Button>) : (<Button variant="outline-danger" size="sm" onClick={() => handleMarkForDeletion(doc.id)}><FontAwesomeIcon icon={faTrashAlt} /></Button>)}
                                                        </div>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                        {formErrors.fichiers_delete && <Form.Text className="text-danger d-block mb-2">{formErrors.fichiers_delete}</Form.Text>}
                                    </>
                                )}
                                {newFiles.length > 0 && (
                                    <>
                                        <h6 className="text-muted mb-2 mt-3">Nouveaux Fichiers :</h6>
                                        <ListGroup variant="flush" className="mb-3 border rounded-3">
                                            {newFiles.map((fw, index) => (
                                                <ListGroup.Item key={`${fw.file.name}-${fw.file.size}-${index}`} className="px-2 py-2 border-bottom">
                                                    <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
                                                        <div className="d-flex align-items-center text-truncate me-2">
                                                            <FontAwesomeIcon icon={getFileIcon(fw.file.type || fw.file.name)} className="me-2 text-secondary" fixedWidth />
                                                            <span className="text-truncate me-2">{fw.file.name}</span>
                                                        </div>
                                                        <div className="flex-grow-1 d-flex align-items-center gap-2">
                                                            <div className="flex-grow-1">
                                                                <Form.Control type="text" size="sm" placeholder={`Intitulé...`} value={fw.intitule} onChange={(e) => setNewFiles(prev => prev.map((item, idx) => idx === index ? { ...item, intitule: e.target.value } : item))} className="form-control-sm rounded-3 shadow-sm" maxLength={FILE_INTITULE_MAX} />
                                                                <div className="form-text text-muted d-flex justify-content-end mt-1">{(fw.intitule || '').length}/{FILE_INTITULE_MAX}</div>
                                                            </div>
                                                            <Badge bg="light" text="dark" pill>{(fw.file.size / 1024 / 1024).toFixed(2)} Mo</Badge>
                                                            <Button variant="outline-warning" size="sm" onClick={() => handleRemoveNewFile(index)}><FontAwesomeIcon icon={faTimes} /></Button>
                                                        </div>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    </>
                                )}
                                <Form.Group id="formFichiers" className={`mt-3 text-center ${formErrors.fichiers ? 'is-invalid' : ''}`}>
                                    <Form.Label htmlFor="file-upload-input" className="btn btn-outline-secondary rounded-pill shadow-sm px-4 py-2"><FontAwesomeIcon icon={faPlusCircle} className="me-2" /> {isEditing ? 'Ajouter' : 'Sélectionner'} Fichiers</Form.Label>
                                    <Form.Control type="file" id="file-upload-input" multiple onChange={handleFileChange} style={{ display: 'none' }} accept=".pdf,.doc,.docx,image/*,.xls,.xlsx" />
                                    <Form.Control.Feedback type="invalid" className="d-block text-center mt-1">{formErrors.fichiers}</Form.Control.Feedback>
                                </Form.Group>
                            </Card.Body>
                        </Card>

                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} controlId="formId_Fonctionnaire">
                                <Form.Label className=" w-100  mb-1 fw-medium">
                                    {bilingualLabel("Points Focaux", "نقاط الاتصال")}
                                </Form.Label>
                                <Select inputId='fonctionnaire-select-input' name="fonctionnaires" menuPlacement="auto" options={fonctionnairesOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder="- Selectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions} className={formErrors.id_fonctionnaire ? 'is-invalid' : ''} />
                                <Form.Control.Feedback type="invalid" style={{ display: formErrors.id_fonctionnaire ? 'block' : 'none' }}>{formErrors.id_fonctionnaire}</Form.Control.Feedback>
                            </Form.Group>
                            
                        
    <Form.Group as={Col} controlId="formReference">
        <Form.Label className=" w-100  mb-1 fw-medium">
            {bilingualLabel("Reference", "المرجع")}
        </Form.Label>
        <Form.Control className={inputClass} isInvalid={!!formErrors.Reference} type="text" name="Reference" value={formData.Reference} onChange={handleChange} size="sm" />
        <Form.Control.Feedback type="invalid">{formErrors.Reference}</Form.Control.Feedback>
    </Form.Group>

</Row>
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} controlId="formObjet"><Form.Label className=" w-100  mb-1 fw-medium">
                                {bilingualLabel("Objet", "الموضوع")}
                            </Form.Label><Form.Control className={textareaClass} isInvalid={!!formErrors.Objet} as="textarea" rows={1} name="Objet" value={formData.Objet} onChange={handleChange} size="sm" /><Form.Control.Feedback type="invalid">{formErrors.Objet}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} controlId="formObjectifs"><Form.Label className=" w-100  mb-1 fw-medium">
                                {bilingualLabel("Objectifs", "الأهداف")}
                            </Form.Label><Form.Control className={textareaClass} isInvalid={!!formErrors.Objectifs} as="textarea" rows={1} name="Objectifs" value={formData.Objectifs} onChange={handleChange} size="sm" /><Form.Control.Feedback type="invalid">{formErrors.Objectifs}</Form.Control.Feedback></Form.Group>
                        </Row>
                        <Row className="mb-3 g-3">
    <Form.Group as={Col} controlId="formIndicateurSuivi">
        <Form.Label className=" w-100  mb-1 fw-medium">
            {bilingualLabel("Indicateur d’évaluation / de suivi", "مؤشر التقييم / المتابعة")}
        </Form.Label>
        <Form.Control 
            className={textareaClass} 
            style={{ borderRadius: '1rem' }} 
            isInvalid={!!formErrors.indicateur_suivi} 
            as="textarea" 
            rows={3} 
            name="indicateur_suivi" 
            value={formData.indicateur_suivi} 
            onChange={handleChange} 
            size="sm" 
            placeholder="Décrire les indicateurs de suivi..." 
        />
        <Form.Control.Feedback type="invalid">{formErrors.indicateur_suivi}</Form.Control.Feedback>
    </Form.Group>
</Row>
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} controlId="formObservations"><Form.Label className=" w-100  mb-1 fw-medium">
                                {bilingualLabel("Observations", "ملاحظات")}
                            </Form.Label><Form.Control className={textareaClass} style={{ borderRadius: '1rem' }} isInvalid={!!formErrors.observations} as="textarea" rows={3} name="observations" value={formData.observations} onChange={handleChange} size="sm" placeholder="Ajouter des observations..." /><Form.Control.Feedback type="invalid">{formErrors.observations}</Form.Control.Feedback></Form.Group>
                        </Row>
<Card className="mb-4 shadow-sm" style={{ borderLeft: '4px solid #6c757d' }}>
    <Card.Header className='bg-white py-2'><h6 className='mb-0 fw-bold text-secondary'><FontAwesomeIcon icon={faClipboardCheck} className="me-2" />Détails Additionnels</h6></Card.Header>
    <Card.Body className="pb-3 pt-3" style={{ backgroundColor: '#f8f9fa' }}>
        <Row className="g-3">
            <Form.Group as={Col} md={6} controlId="formCadenceReunion">
                <Form.Label className="w-100 mb-1 d-flex fw-medium">
                    <FontAwesomeIcon icon={faClock} className="text-muted m-2" />
                   <div className='m-2 w-100'> {bilingualLabel("Cadence de Réunion", "وتيرة الاجتماعات")}</div>
                </Form.Label>
                <Form.Control className={inputClass} isInvalid={!!formErrors.cadence_reunion} type="text" name="cadence_reunion" value={formData.cadence_reunion} onChange={handleChange} size="sm" placeholder="ex: Trimestrielle..."/>
                <Form.Control.Feedback type="invalid">{formErrors.cadence_reunion}</Form.Control.Feedback>
            </Form.Group>
            <Col md={6} className='w-50 '>
                                
                <Form.Group controlId="formHasAudit" className="mb-2 ">
                    <Form.Check 
                        type="switch"
                        id="has-audit-switch"
                        checked={formData.has_audit}
                        onChange={(e) => setFormData(prev => ({ ...prev, has_audit: e.target.checked, audit_text: e.target.checked ? prev.audit_text : '' }))}
                    />
                    {bilingualLabel("Activer le suivi par Audit", "تفعيل المتابعة عبر التدقيق")}

                </Form.Group>
                {formData.has_audit && (
                    <Form.Group controlId="formAuditText">
                        <Form.Control className={textareaClass} isInvalid={!!formErrors.audit_text} as="textarea" rows={2} name="audit_text" value={formData.audit_text} onChange={handleChange} size="sm" placeholder="Saisir les détails de l'audit..."/>
                        <Form.Control.Feedback type="invalid">{formErrors.audit_text}</Form.Control.Feedback>
                    </Form.Group>
                )}
            </Col>
        </Row>
    </Card.Body>
</Card>

                        <Row className="mt-4 pt-2 justify-content-center flex-shrink-0">
                            <Col xs="auto"> <Button variant="secondary" onClick={onClose} className="btn px-5 rounded-5 py-2 shadow-sm" disabled={submissionStatus.loading}> Annuler </Button> </Col>
                            <Col xs="auto"> <Button  form="convention-main-form"  type="submit" className="btn rounded-5 px-5 py-2 bg-primary border-0 shadow-sm" disabled={submissionStatus.loading || loadingData || loadingOptions}> {submissionStatus.loading ? (<><Spinner as="span" animation="border" size="sm" className="me-2" /> Enregistrement...</>) : (isEditing ? 'Enregistrer Modifications' : 'Valider et Créer')} </Button> </Col>
                        </Row>
                    </Form>
                    </div>
                </div>
            </div>

            <Modal show={showConfirmModal} onHide={handleModalCancel} centered backdrop="static" keyboard={false}>
                <Modal.Header closeButton><Modal.Title><FontAwesomeIcon icon={faExclamationTriangle} className="text-warning me-2" /> Confirmation Requise</Modal.Title></Modal.Header>
                <Modal.Body style={{boxShadow:'none'}}>
                    <p>{confirmModalData.message || "Confirmer la suppression des engagements partenaires (et versements associés) ?"}</p>
                    {confirmModalData.details?.length > 0 && (<div className='mb-3'><p className="mb-1 text-muted">Engagements concernés :</p><ListGroup variant="flush" style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '0.8rem' }}>{confirmModalData.details.map((detail, index) => (<ListGroup.Item key={index} className="px-2 py-1">{detail}</ListGroup.Item>))}</ListGroup></div>)}
                    <p className="fw-bold text-danger mt-3">Cette action est irréversible.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleModalCancel} disabled={submissionStatus.loading}>Annuler</Button>
                    <Button variant="danger" onClick={handleModalConfirm} disabled={submissionStatus.loading}>{submissionStatus.loading ? <Spinner as="span" size="sm" animation="border" className="me-2" /> : null} Confirmer</Button>
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