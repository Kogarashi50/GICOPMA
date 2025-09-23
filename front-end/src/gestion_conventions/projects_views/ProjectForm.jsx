// src/gestion_conventions/projects_views/ProjectForm.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faTimes, faTrashAlt, faPlusCircle,
    faUsers,faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import {
    Form, Button, Row, Col, Alert, Spinner, Card, InputGroup, FormCheck, ListGroup, Modal,
    Badge
} from 'react-bootstrap';
import PropTypes from 'prop-types';

// --- Styles & Classes ---
const selectStyles = {  control: (provided, state) => ({ ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.selectProps.className?.includes('is-invalid') ? '#dc3545' : (state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'), boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', fontSize: '0.875rem', }), valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden', }), input: (provided) => ({ ...provided, margin: '0px', padding: '0px', fontSize: '0.875rem' }), indicatorSeparator: () => ({ display: 'none', }), indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }), placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }), menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }), menuPortal: base => ({ ...base, zIndex: 9999 }), option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }), multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px', }), multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', fontSize: '0.8rem' }), multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white', }, }), noOptionsMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }), loadingMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),};
const FORM_CONTAINER_CLASS = "p-3 p-md-4 projet-form-container";
const inputClass = "form-control form-control-sm rounded-pill shadow-sm bg-light border";
const textareaClass = "form-control form-control-sm rounded-3 shadow-sm bg-light border";
const FORM_ACTIONS_ROW_CLASS = "mt-4 pt-2 justify-content-center flex-shrink-0";
const FORM_CANCEL_BUTTON_CLASS = "btn px-5 rounded-5 py-2 shadow-sm";
const FORM_SUBMIT_BUTTON_CLASS = "btn rounded-5 px-5 py-2 align-items-center d-flex justify-content-evenly border-0 shadow-sm";
const FORM_HEADER_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold';

const parseCurrency = (value) => { if (typeof value !== 'string') return Number(value) || 0; const cleaned = value.replace(/[\s\u00A0]/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.'); const number = parseFloat(cleaned); return isNaN(number) ? 0 : number; };
// Corrected line:
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
const safeParseInt = (value) => { if (value === null || value === undefined) return null; const parsed = parseInt(String(value), 10); return Number.isInteger(parsed) ? parsed : null; };

const ProjetForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated, baseApiUrl = 'http://localhost:8000/api' }) => {
    const initialFormData = useMemo(() => ({
        Code_Projet: '', Nom_Projet: '', Cout_CRO: '', Date_Debut: '', Observations: '',
        Etat_Avan_Physi: '', Date_Fin: '', Cout_Projet: ''
        , programme: null, convention: null ,
        fonctionnaires: [],
        maitre_ouvrage: '',
        provinces: [],
        communes: [], 
        Etat_Avan_Finan: '',
    maitre_ouvrage_delegue: '',
    duree_projet_mois: '',
    date_debut_prevue: '',
    date_fin_prevue: '',
    }), []);
    const [formData, setFormData] = useState(initialFormData);
    const [programmeOptions, setProgrammeOptions] = useState([]);
    const [conventionOptions, setConventionOptions] = useState([]);
    const [partenaireOptions, setPartenaireOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
      const [provinceOptions, setProvinceOptions] = useState([]); // NEW
    const [communeOptions, setCommuneOptions] = useState([]);   // NEW
    const [currentEngagement, setCurrentEngagement] = useState({ partenaire: null, montant_engage: '', date_engagement: '', est_formalise: false, commentaire: '' });
    const [engagementsList, setEngagementsList] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState({  programmes: true, conventions: true, partenaires: true, fonctionnaires: true , provinces: true, communes: true });/** removed chantiers and domain     */
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [engagementErrors, setEngagementErrors] = useState({});
    const [loadingData, setLoadingData] = useState(!!itemId);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState({ message: '', details: [] });
    const [dataToResubmit, setDataToResubmit] = useState(null);

    const isEditing = useMemo(() => itemId !== null, [itemId]);
    const optionsFinishedLoading = useMemo(() =>
        !loadingOptions.programmes &&
        !loadingOptions.conventions && !loadingOptions.partenaires && !loadingOptions.fonctionnaires
        &&!loadingOptions.provinces &&
        !loadingOptions.communes,
        [loadingOptions]
    ); /*!loadingOptions.domaines &&  !loadingOptions.chantiers*/

    const fetchOptions = useCallback(async () => {
        console.log("[ProjectForm] Fetching options using /api/options/...");
        setLoadingOptions({  programmes: true,  conventions: true, partenaires: true, fonctionnaires: true , provinces: true, communes: true });/**domaines: true,chantiers: true */
        let overallError = null;
        try {
            const [ progRes, convRes, partRes, foncRes, provRes, comRes] = await Promise.allSettled([
                /** axios.get(${baseApiUrl}/options/domaines, { withCredentials: true }),*/
                axios.get(`${baseApiUrl}/options/programmes`, { withCredentials: true }),
                /** axios.get(${baseApiUrl}/options/chantiers, { withCredentials: true }),*/ 
                axios.get(`${baseApiUrl}/options/conventions`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/partenaires`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/provinces`, { withCredentials: true }), // NEW
                axios.get(`${baseApiUrl}/options/communes`, { withCredentials: true })  
            ]);
const extractArray = (response, key) => {
                if (response.status === 'fulfilled' && response.value.data) {
                    const data = response.value.data;
                    if (Array.isArray(data)) return data;
                    if (data && Array.isArray(data[key])) return data[key];
                    if (data && Array.isArray(data['data'])) return data['data']; // For paginated results
                    return [];
                }
                return [];
            };
            const rawFonctionnaires = extractArray(foncRes, 'fonctionnaires');
            const formattedFonctionnaires = rawFonctionnaires.map(user => ({
                value: user.id,       // Use 'id' as the value
                label: user.nom_complet // Use 'nom_complet' as the label
            }));          
            setProgrammeOptions(extractArray(progRes, 'programmes'));
            setConventionOptions(extractArray(convRes, 'conventions'));
            setPartenaireOptions(extractArray(partRes, 'partenaires'));
            setFonctionnairesOptions(formattedFonctionnaires);
            
            // *** FIX 2: Use the robust `extractArray` helper ***
            setProvinceOptions(extractArray(provRes, 'provinces'));
            setCommuneOptions(extractArray(comRes, 'communes'));
            if (overallError) {
                setSubmissionStatus(prev => ({ ...prev, error: `Erreur chargement des listes (${overallError}). Vérifiez la console.`, loading: false }));
            }

        } catch (err) { // Catch for Promise.allSettled itself or pre-request setup error
            console.error("ProjectForm: Erreur globale critique dans fetchOptions:", err);
            setSubmissionStatus(prev => ({ ...prev, error: "Erreur critique chargement des options.", loading: false }));
           /*setDomaineOptions([]); setProgrammeOptions([]); setChantierOptions([]);*/
            setConventionOptions([]); setPartenaireOptions([]); setFonctionnairesOptions([]);
        } finally {
            setLoadingOptions({  programmes: false, conventions: false, partenaires: false, fonctionnaires: false , provinces: false, communes: false});
            console.log("[ProjectForm] END fetchOptions.");
        }
    }, [baseApiUrl]);

    
    useEffect(() => { fetchOptions(); }, [fetchOptions]);

    useEffect(() => {
        if (!isEditing || !optionsFinishedLoading) {
            setLoadingData(false); 
            return; 
        }
        let isMounted = true;
        const fetchProjetData = async () => {
            setLoadingData(true);
            setSubmissionStatus({}); 
            setFormErrors({}); 
            setEngagementErrors({}); 
            setEngagementsList([]);
            setCurrentEngagement({partenaire: null, montant_engage: '', date_engagement: '', est_formalise: false, commentaire: ''});
            setDataToResubmit(null); 
            setShowConfirmModal(false);
            setFormData(prev => ({ ...prev, fonctionnaires: [] }));
            try {
                const response = await axios.get(`${baseApiUrl}/projets/${itemId}`, { withCredentials: true });
                const data = response.data?.projet || response.data;
                if (!data || !isMounted) return;

                const findOptionByValue = (options, valueToFind) => { // Searches by the 'value' prop of the option
                    if (valueToFind === null || valueToFind === undefined || !options || !Array.isArray(options)) return null;
                    return options.find(opt => String(opt.value) === String(valueToFind)) || null;
                };
                
                const mapIdsToOptions = (options, items) => {
                    if (!Array.isArray(items) || items.length === 0) return [];
                    const itemIds = items.map(item => String(item.id ?? item.Id));
                    return options.filter(opt => itemIds.includes(String(opt.value)));
                };
                 const findOptionByValueProgramme = (options, valueToFind) => { // Searches by the 'value' prop of the option
                    if (valueToFind === null || valueToFind === undefined || !options || !Array.isArray(options)) return null;

                    return options.find(opt =>String(opt.label.split('-')[0].trim())===String(valueToFind))  || null;
                };
                const findMultiOptionsByValue = (options, valuesString) => { // Searches by the 'value' prop
                    if (!valuesString || typeof valuesString !== 'string' || !options || !Array.isArray(options) || options.length === 0) return [];
                    const selectedValues = valuesString.split(';').map(v => String(v).trim().toLowerCase()).filter(v => v);
                    return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase()));
                };
                    
                setFormData({
                    Code_Projet: data.Code_Projet ?? '',
                    Nom_Projet: String(data.Nom_Projet ?? ''),
                    Cout_CRO: data.Cout_CRO ?? '', 
                    Date_Debut: data.Date_Debut?.split('T')[0] ?? '',
                    Observations: data.Observations ?? '', 
                    Etat_Avan_Physi: data.Etat_Avan_Physi ?? '',
                    Etat_Avan_Finan: data.Etat_Avan_Finan ?? '', 
                    Date_Fin: data.Date_Fin?.split('T')[0] ?? '', 
                    Cout_Projet: data.Cout_Projet ?? '',
                    maitre_ouvrage: data.maitre_ouvrage ?? '',
                    maitre_ouvrage_delegue: data.maitre_ouvrage_delegue ?? '',
                    duree_projet_mois: data.duree_projet_mois ?? '',
                    date_debut_prevue: data.date_debut_prevue?.split('T')[0] ?? '',
                    date_fin_prevue: data.date_fin_prevue?.split('T')[0] ?? '',
                    /**domaine: findOptionByValue(domaineOptions, data.Id_Domaine), */
                    programme: findOptionByValueProgramme(programmeOptions, data.Id_Programme), 
                    /**chantier: findOptionByValue(chantierOptions, data.Id_Chantier),   */
                    convention: findOptionByValue(conventionOptions, data.Convention_Code), 
                    fonctionnaires: findMultiOptionsByValue(fonctionnairesOptions, data.id_fonctionnaire), 
                    provinces: mapIdsToOptions(provinceOptions, data.provinces),
                    communes: mapIdsToOptions(communeOptions, data.communes),
                });
                const fetchedEngagements = data.engagements_financiers || [];
                setEngagementsList(fetchedEngagements.map(eng => ({
                    id: safeParseInt(eng.id), 
                    tempId: generateTempId(), 
                    partenaire: findOptionByValue(partenaireOptions, eng.partenaire_id), 
                    montant_engage: String(eng.montant_engage ?? ''), 
                    date_engagement: eng.date_engagement?.split('T')[0] ?? '', 
                    est_formalise: !!eng.est_formalise, 
                    commentaire: eng.commentaire ?? '' })));
            } catch (err) { if (isMounted) setSubmissionStatus({ loading: false, error: err.response?.data?.message || err.message || "Erreur chargement projet.", success: false }); }
            finally { if (isMounted) setLoadingData(false); }
        };
        fetchProjetData();
        return () => { isMounted = false; };
    }, [
        itemId, 
        isEditing, 
        baseApiUrl, 
        optionsFinishedLoading, 
        /*domaineOptions,*/
        programmeOptions, 
        /*hantierOptions,*/
        provinceOptions, 
        communeOptions ,
        conventionOptions, 
        partenaireOptions, 
        fonctionnairesOptions]);

    
    useEffect(() => { 
        if (!isEditing && optionsFinishedLoading) {
            setFormData(initialFormData); 
            setEngagementsList([]); 
            setCurrentEngagement({ partenaire: null, montant_engage: '', date_engagement: '', est_formalise: false, commentaire: '' }); 
            setFormErrors({}); 
            setEngagementErrors({}); 
            setSubmissionStatus({}); 
            setLoadingData(false); 
            setDataToResubmit(null); 
            setShowConfirmModal(false); } 
        }, [isEditing, optionsFinishedLoading, initialFormData]);

    const validateForm = () => {
        const errors = {}; 
        if (!formData.Code_Projet || String(formData.Code_Projet).trim() === '') errors.Code_Projet = "Code Projet requis."; 
        if (!formData.Nom_Projet?.trim()) errors.Nom_Projet = "Nom Projet requis."; 
        /**if (!formData.domaine) errors.Id_Domaine = "Domaine requis."; */
        if (!formData.programme) errors.Id_Programme = "Programme requis."; 
        /**if (!formData.chantier) errors.Id_Chantier = "Chantier requis."; */
        if (formData.Date_Fin && formData.Date_Debut && formData.Date_Fin < formData.Date_Debut) errors.Date_Fin = "Date fin doit être après date début."; 
        
    const checkNumeric = (field, name) => { const v = formData[field]; if (v !== '' && v !== null && (isNaN(parseCurrency(v)) || parseCurrency(v) < 0)) errors[field] = `${name} doit être numérique positif.`; }; checkNumeric('Cout_CRO', 'Coût CRO'); checkNumeric('Cout_Projet', 'Coût Projet');
     const checkPercent = (field, name) => { const v = formData[field]; if (v !== '' && v !== null && (isNaN(parseCurrency(v)) || parseCurrency(v) < 0 || parseCurrency(v) > 100)) errors[field] = `${name} doit être entre 0-100.`; }; 
     checkPercent('Etat_Avan_Physi', '% Av. Physique'); 
     checkPercent('Etat_Avan_Finan', '% Av. Financier'); 
     setFormErrors(errors); return Object.keys(errors).length === 0;};

    const validateCurrentEngagement = () => { const errors = {}; if (!currentEngagement.partenaire) errors.partenaire = "Partenaire requis."; if (!currentEngagement.montant_engage || isNaN(parseCurrency(currentEngagement.montant_engage)) || parseCurrency(currentEngagement.montant_engage) <= 0) errors.montant_engage = "Montant valide (positif) requis."; if (!currentEngagement.date_engagement) errors.date_engagement = "Date engagement requise."; setEngagementErrors(errors); return Object.keys(errors).length === 0; };
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: undefined })); };
    /*const handleDomaineChange = (selectedOption) => { setFormData(prev => ({ ...prev, domaine: selectedOption })); if (formErrors.Id_Domaine) setFormErrors(prev => ({ ...prev, Id_Domaine: undefined })); };*/
    const handleProgrammeChange = (selectedOption) => { setFormData(prev => {
        return { ...prev, programme: selectedOption }
}); if (formErrors.Id_Programme) setFormErrors(prev => ({ ...prev, Id_Programme: undefined })); };
    /** 
    const handleChantierChange = (selectedOption) => { setFormData(prev => ({ ...prev, chantier: selectedOption })); if (formErrors.Id_Chantier) setFormErrors(prev => ({ ...prev, Id_Chantier: undefined })); };
    */
    const handleProvinceChange = (selectedOptions) => setFormData(prev => ({ ...prev, provinces: selectedOptions || [] }));
    const handleCommuneChange = (selectedOptions) => setFormData(prev => ({ ...prev, communes: selectedOptions || [] }));
    const handleConventionChange = (selectedOption) => { setFormData(prev => ({ ...prev, convention: selectedOption })); if (formErrors.Convention_Code) setFormErrors(prev => ({ ...prev, Convention_Code: undefined })); };
    const handleFonctionnaireChange = useCallback((selectedOptions) => { setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] })); if (formErrors.id_fonctionnaire) { setFormErrors(prev => ({ ...prev, id_fonctionnaire: undefined })); } }, [formErrors.id_fonctionnaire]);
    const handleEngagementChange = (e) => { const { name, value, type, checked } = e.target; setCurrentEngagement(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); if (engagementErrors[name]) setEngagementErrors(prev => ({ ...prev, [name]: undefined })); };
    const handleEngagementPartnerChange = (selectedOption) => { setCurrentEngagement(prev => ({ ...prev, partenaire: selectedOption })); if (engagementErrors.partenaire) setEngagementErrors(prev => ({ ...prev, partenaire: undefined })); };
    const handleAddEngagement = () => { if (!validateCurrentEngagement()) return; if (currentEngagement.partenaire && engagementsList.some(eng => eng.partenaire?.value === currentEngagement.partenaire?.value)) { setEngagementErrors(prev => ({ ...prev, partenaire: "Partenaire déjà ajouté." })); return; } setEngagementsList(prev => [...prev, { id: null, tempId: generateTempId(), ...currentEngagement }]); setCurrentEngagement({ partenaire: null, montant_engage: '', date_engagement: '', est_formalise: false, commentaire: '' }); setEngagementErrors({}); if (formErrors.engagements) setFormErrors(prev => ({ ...prev, engagements: undefined })); };
    const handleRemoveEngagement = (tempIdToRemove) => { setEngagementsList(prev => prev.filter(eng => eng.tempId !== tempIdToRemove)); };
    const handleModalConfirm = () => { setShowConfirmModal(false); if (dataToResubmit) { executeSubmit(dataToResubmit, true); } else { console.error("Cannot resubmit confirmation."); setSubmissionStatus({ loading: false, error: "Erreur interne.", success: false }); } };
    const handleModalCancel = () => { setShowConfirmModal(false); setDataToResubmit(null); console.log("User cancelled cascade delete."); };
    const executeSubmit = async (dataPayload, confirmDelete = false) => { setSubmissionStatus({ loading: true, error: null, success: false }); setFormErrors({}); setDataToResubmit(null); const url = isEditing ? `${baseApiUrl}/projets/${itemId}` : `${baseApiUrl}/projets`; const method = isEditing ? 'put' : 'post'; const finalPayload = { ...dataPayload, ...(confirmDelete && { confirm_cascade_delete: true }) }; const config = { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, withCredentials: true }; try { const response = await axios({ method: method, url: url, data: finalPayload, headers: config.headers, withCredentials: config.withCredentials }); setSubmissionStatus({ loading: false, error: null, success: true }); const returnedProjet = response.data.projet; if (isEditing) onItemUpdated?.(returnedProjet); else onItemCreated?.(returnedProjet); setTimeout(onClose, 1500); } catch (err) { let errorMsg = `Une erreur s'est produite.`; if (err.response) { if (err.response.status === 409 && err.response.data?.requires_confirmation) { setSubmissionStatus({ loading: false }); setConfirmModalData({ message: err.response.data.message || "Conf. requise.", details: err.response.data.details || [] }); setDataToResubmit(dataPayload); setShowConfirmModal(true); return; } errorMsg = err.response.data?.message || `Erreur ${err.response.status}`; if (err.response.status === 422 && typeof err.response.data.errors === 'object') { const serverErrors = err.response.data.errors; const mapped = {}; let engErr = ''; Object.keys(serverErrors).forEach(k => { const msg = serverErrors[k].join(' '); if(k.startsWith('engagements.')) engErr += msg + ' '; else if (k === 'id_fonctionnaire') mapped['id_fonctionnaire'] = msg; else mapped[k] = msg; }); if(engErr) mapped['engagements'] = engErr.trim(); setFormErrors(mapped); errorMsg = "Erreurs de validation."; } } else if (err.request) { errorMsg = "Pas de réponse serveur."; } else { errorMsg = err.message; } setSubmissionStatus({ loading: false, error: errorMsg, success: false }); }};
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        setShowConfirmModal(false); 
        if (!validateForm()) { 
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs.", success: false }); 
            return; 
        } 
        const fonctionnaireIdsString = formData.fonctionnaires.map(f => f.value).join(';'); 
        const dataToSubmit = { 
            Code_Projet: formData.Code_Projet, 
            Nom_Projet: formData.Nom_Projet, 
            Cout_CRO: formData.Cout_CRO ? parseCurrency(formData.Cout_CRO) : null, 
            Date_Debut: formData.Date_Debut || null, 
            Observations: formData.Observations ?? '', 
            Etat_Avan_Physi: formData.Etat_Avan_Physi ? parseCurrency(formData.Etat_Avan_Physi) : null, 
            Etat_Avan_Finan: formData.Etat_Avan_Finan ? parseCurrency(formData.Etat_Avan_Finan) : null,
            Date_Fin: formData.Date_Fin || null,
            maitre_ouvrage: formData.maitre_ouvrage || null,
            maitre_ouvrage_delegue: formData.maitre_ouvrage_delegue || null,
            duree_projet_mois: formData.duree_projet_mois || null,
            date_debut_prevue: formData.date_debut_prevue || null,
            date_fin_prevue: formData.date_fin_prevue || null, 
            Cout_Projet: formData.Cout_Projet ? parseCurrency(formData.Cout_Projet) : null, 
            // Id_Domaine: formData.domaine?.value ?? null, //
            Id_Programme: formData.programme?.label.split('-')[0] ?? null, 
             province_ids: formData.provinces.map(p => p.value), // NEW
            commune_ids: formData.communes.map(c => c.value),   // NEW
            // Id_Chantier: formData.chantier?.value ?? null, 
            Convention_Code: formData.convention?.value ?? null, id_fonctionnaire: fonctionnaireIdsString || null, engagements: engagementsList.map(eng => { let obj = { partenaire_id: safeParseInt(eng.partenaire?.value), montant_engage: eng.montant_engage ? parseCurrency(eng.montant_engage) : null, date_engagement: eng.date_engagement || null, est_formalise: eng.est_formalise, commentaire: eng.commentaire ?? '' }; const pId = safeParseInt(eng.id); if(isEditing && pId !== null) obj.id = pId; return obj; }) }; executeSubmit(dataToSubmit, false); };

    const areOptionsLoading = Object.values(loadingOptions).some(isLoading => isLoading === true);
    const isSubmitDisabled = submissionStatus.loading || areOptionsLoading || loadingData;
    if (loadingData && isEditing) return <div className="text-center p-5"><Spinner animation="border" variant="primary" /><span className='ms-3 text-muted'>Chargement du projet...</span></div>;
    if (areOptionsLoading) return <div className={FORM_CONTAINER_CLASS} style={{ minHeight: '400px', display:'flex', justifyContent: 'center', alignItems: 'center' }}><Spinner animation="border" variant="primary" /><span className='ms-3 text-muted'>Chargement des options...</span></div>;

    return (
        <> {/* Changed from Fragment to <> for brevity, functional equivalence */}
            <div className={FORM_CONTAINER_CLASS} style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
                 <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0 border-bottom pb-2">
                    <div><h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5><h2 className="mb-0 fw-bold">Projet {isEditing && formData.Code_Projet ? `(Code: ${formData.Code_Projet})` : ''}</h2></div>
                    <Button variant="light" className={FORM_HEADER_CLOSE_BUTTON_CLASS} onClick={onClose} size="sm"><b>Revenir à la liste</b></Button>
                </div>
                <div className="flex-grow-1">
                    {submissionStatus.error && ( <Alert variant="danger" className="mb-3 py-2 d-flex align-items-center" dismissible onClose={() => setSubmissionStatus(prev => ({...prev, error: null}))}> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 flex-shrink-0"/> <div>{submissionStatus.error}</div> </Alert> )}
                    {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2"> Projet {isEditing ? 'modifié' : 'créé'} avec succès ! </Alert> )}
                    <Form noValidate onSubmit={handleSubmit}>
                        <Row className="mb-1 g-3">
                            <Form.Group as={Col} md={6} controlId="formCodeProjet"><Form.Label className="small mb-1 fw-medium">Code <span className="text-danger">*</span></Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Code_Projet} required type="text" name="Code_Projet" value={formData.Code_Projet} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Code_Projet}</Form.Control.Feedback></Form.Group>
                            <Form.Group as={Col} md={6} controlId="formNomProjet"><Form.Label className="small mb-1 fw-medium">Nom <span className="text-danger">*</span></Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Nom_Projet} required type="text" name="Nom_Projet" value={formData.Nom_Projet} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Nom_Projet}</Form.Control.Feedback></Form.Group>
                        </Row>
                        
                        <Row className="mb-1 g-3">
    <Form.Group as={Col} md={6} controlId="formMaitreOuvrage">
        <Form.Label className="small mb-1 fw-medium">Maitre d'ouvrage</Form.Label>
        <Form.Control
            className={inputClass}
            type="text"
            name="maitre_ouvrage"
            value={formData.maitre_ouvrage}
            onChange={handleChange}
            size="sm"
        />
    </Form.Group>
    <Form.Group as={Col} md={6} controlId="formMaitreOuvrageDelegue">
        <Form.Label className="small mb-1 fw-medium">Maitre d'ouvrage délégué</Form.Label>
        <Form.Control
            className={inputClass}
            type="text"
            name="maitre_ouvrage_delegue"
            value={formData.maitre_ouvrage_delegue}
            onChange={handleChange}
            size="sm"
        />
    </Form.Group>
</Row>

{/* --- ADD THIS ENTIRE NEW ROW --- */}
<Row className="mb-1 g-3">
    <Form.Group as={Col} md={4} controlId="formDureeProjet">
        <Form.Label className="small mb-1 fw-medium">Durée du projet (mois)</Form.Label>
        <Form.Control
            className={inputClass}
            type="number"
            name="duree_projet_mois"
            value={formData.duree_projet_mois}
            onChange={handleChange}
            size="sm"
            min="0"
        />
    </Form.Group>
    <Form.Group as={Col} md={4} controlId="formDateDebutPrevue">
        <Form.Label className="small mb-1 fw-medium">Date début prévue</Form.Label>
        <Form.Control
            className={inputClass}
            type="date"
            name="date_debut_prevue"
            value={formData.date_debut_prevue}
            onChange={handleChange}
            size="sm"
        />
    </Form.Group>
    <Form.Group as={Col} md={4} controlId="formDateFinPrevue">
        <Form.Label className="small mb-1 fw-medium">Date fin prévue</Form.Label>
        <Form.Control
            className={inputClass}
            type="date"
            name="date_fin_prevue"
            value={formData.date_fin_prevue}
            onChange={handleChange}
            size="sm"
            min={formData.date_debut_prevue || undefined}
        />
    </Form.Group>
</Row>


                        <Row className="mb-1 g-3">
                            <Form.Group as={Col} md={12} controlId="formProgramme"><Form.Label className="small mb-1 fw-medium">Programme <span className="text-danger">*</span></Form.Label><Select inputId="programme-select" name="programme" options={programmeOptions} value={formData.programme} onChange={handleProgrammeChange} styles={selectStyles} placeholder="- Sélectionner -" isClearable isDisabled={loadingOptions.programmes} className={formErrors.Id_Programme ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body}/>{formErrors.Id_Programme && <div className="invalid-feedback d-block ps-1 small">{formErrors.Id_Programme}</div>}</Form.Group>
                         </Row>
                         <Row className="mb-1 g-3">
                             <Form.Group as={Col} md={12} controlId="formId_FonctionnaireProjet" id="formId_FonctionnaireProjet"> {/* Unique ID */}
                                 <Form.Label className="small mb-1 fw-medium"> <FontAwesomeIcon icon={faUsers} className="me-1 text-secondary"/> Points Focaux </Form.Label>
                                 <Select inputId='projet-fonctionnaire-select' name="fonctionnaires" menuPlacement="auto" options={fonctionnairesOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder="- Sélectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.fonctionnaires} className={formErrors.id_fonctionnaire ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body}/>
                                 <Form.Control.Feedback type="invalid" style={{ display: formErrors.id_fonctionnaire ? 'block' : 'none'}}> {formErrors.id_fonctionnaire} </Form.Control.Feedback>
                             </Form.Group>
                        </Row>
                         <Row className="mb-1 g-3">
                             <Form.Group as={Col} md={6} controlId="formDateDebut"><Form.Label className="small mb-1 fw-medium">Date début réelle</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Date_Debut} type="date" name="Date_Debut" value={formData.Date_Debut} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Date_Debut}</Form.Control.Feedback></Form.Group>
                             <Form.Group as={Col} md={6} controlId="formDateFin"><Form.Label className="small mb-1 fw-medium">Date fin réelle</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Date_Fin} type="date" name="Date_Fin" value={formData.Date_Fin} onChange={handleChange} size="sm" min={formData.Date_Debut || undefined}/><Form.Control.Feedback type="invalid">{formErrors.Date_Fin}</Form.Control.Feedback></Form.Group>
                         </Row>
                         <h5 className="mb-3 mt-4 fw-semibold text-warning border-bottom pb-2">
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2"/> Localisation
                    </h5>
                    <Row className="mb-1 g-3">
                        <Form.Group as={Col} md={6} controlId="formProvinces">
                            <Form.Label className="small mb-1 fw-medium">Provinces</Form.Label>
                            <Select inputId="provinces-select" name="provinces" options={provinceOptions} value={formData.provinces} onChange={handleProvinceChange} styles={selectStyles} placeholder="- Sélectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.provinces} menuPortalTarget={document.body}/>
                        </Form.Group>
                        <Form.Group as={Col} md={6} controlId="formCommunes">
                            <Form.Label className="small mb-1 fw-medium">Communes</Form.Label>
                            <Select inputId="communes-select" name="communes" options={communeOptions} value={formData.communes} onChange={handleCommuneChange} styles={selectStyles} placeholder="- Sélectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.communes} menuPortalTarget={document.body}/>
                        </Form.Group>
                    </Row>
                        
                         <Row className="mb-1 g-3">
                              <Form.Group as={Col} md={3} controlId="formEtatAvanPhysi"><Form.Label className="small mb-1 fw-medium">Av. Physi (%)</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Etat_Avan_Physi} type="number" name="Etat_Avan_Physi" value={formData.Etat_Avan_Physi} onChange={handleChange} size="sm" step="0.01" min="0" max="100"/><Form.Control.Feedback type="invalid">{formErrors.Etat_Avan_Physi}</Form.Control.Feedback></Form.Group>
                              <Form.Group as={Col} md={3} controlId="formEtatAvanFinan">
                    <Form.Label className="small mb-1 fw-medium">Av. Finan (%)</Form.Label>
                    <Form.Control className={inputClass} isInvalid={!!formErrors.Etat_Avan_Finan} type="number" name="Etat_Avan_Finan" value={formData.Etat_Avan_Finan} onChange={handleChange} size="sm" step="0.01" min="0" max="100"/>
                    <Form.Control.Feedback type="invalid">{formErrors.Etat_Avan_Finan}</Form.Control.Feedback>
                </Form.Group>
                              <Form.Group as={Col} md={3} controlId="formCoutProjet"><Form.Label className="small mb-1 fw-medium">Coût Projet (MAD)</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Cout_Projet} type="number" name="Cout_Projet" value={formData.Cout_Projet} onChange={handleChange} size="sm" step="0.01" min="0"/><Form.Control.Feedback type="invalid">{formErrors.Cout_Projet}</Form.Control.Feedback></Form.Group>
                              <Form.Group as={Col} md={3} controlId="formCoutCRO"><Form.Label className="small mb-1 fw-medium">Coût Part CRO (MAD)</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Cout_CRO} type="number" name="Cout_CRO" value={formData.Cout_CRO} onChange={handleChange} size="sm" step="0.01" min="0"/><Form.Control.Feedback type="invalid">{formErrors.Cout_CRO}</Form.Control.Feedback></Form.Group>
                         </Row>
                         <Row className="mb-3 g-3">
                              <Form.Group as={Col} md={12} controlId="formObservations"><Form.Label className="small mb-1 fw-medium">Observations</Form.Label><Form.Control className={textareaClass} style={{borderRadius: '1rem'}} as="textarea" rows={3} name="Observations" value={formData.Observations} onChange={handleChange} size="sm"/><Form.Control.Feedback type="invalid">{formErrors.Observations}</Form.Control.Feedback></Form.Group>
                         </Row>
                        <h5 className="mb-3 mt-4 fw-semibold text-warning border-bottom pb-2">Engagements Financiers</h5>
                         {engagementsList.length > 0 && ( <Card className="mb-4 border-light shadow-sm"> <Card.Header className="bg-light py-2"><h6 className='mb-0 fw-semibold text-secondary'>Engagements Ajoutés</h6></Card.Header> <ListGroup variant="flush"> {engagementsList.map((eng) => ( <ListGroup.Item key={eng.tempId} className="px-3 py-2"> <Row className="align-items-center g-2"> <Col md={3} className="text-truncate"><strong title={eng.partenaire?.label}>{eng.partenaire?.label || 'Partenaire?'}</strong></Col> <Col md={2} xs={6}><Badge bg="info" pill className="px-2 py-1">{parseCurrency(eng.montant_engage).toLocaleString('fr-FR', {minimumFractionDigits: 2})} MAD</Badge></Col> <Col md={2} xs={6}><Badge bg="secondary" pill className="px-2 py-1">{eng.date_engagement}</Badge></Col> <Col md={2} xs={6}><FormCheck type="switch" readOnly checked={eng.est_formalise} label="Formalisé" id={`formalise-read-${eng.tempId}`} bsPrefix="form-check form-switch form-check-inline form-check-sm mb-0"/></Col> <Col md={2} className="d-none d-md-block text-truncate" title={eng.commentaire}><small className="text-muted">{eng.commentaire || '-'}</small></Col> <Col md={1} xs={12} className="text-end"><Button variant="outline-danger" size="sm" onClick={() => handleRemoveEngagement(eng.tempId)} title="Retirer"><FontAwesomeIcon icon={faTrashAlt} /></Button></Col> </Row> <Row className="d-md-none mt-1"><Col xs={12}> <small className="text-muted">{eng.commentaire || '-'}</small> </Col></Row> </ListGroup.Item> ))} </ListGroup> {formErrors.engagements && <Alert variant="danger" size="sm" className="mt-2 mx-3 mb-2 py-1 small">{formErrors.engagements}</Alert>} </Card> )}
                         {engagementsList.length === 0 && ( <Alert variant='secondary' className='text-center py-2 small'>Aucun engagement ajouté.</Alert> )}
                         <Card className="border-light shadow-sm"> <Card.Header className="bg-white py-2"><Row className="align-items-center"><Col><h6 className='mb-0 fw-semibold text-secondary'><FontAwesomeIcon icon={faPlusCircle} className="me-2"/>Ajouter Engagement</h6></Col><Col xs="auto"><Button variant="success" onClick={handleAddEngagement} size="sm" className="px-3" title="Ajouter à la liste"><FontAwesomeIcon icon={ faPlusCircle} className="me-1" /> Ajouter</Button></Col></Row></Card.Header> <Card.Body className="p-3"> <Row className="g-3 align-items-start"> <Col md={6} lg={3}><Form.Group controlId="formEngagementPartenaire"><Form.Label className="small mb-1 fw-medium">Partenaire <span className="text-danger"></span></Form.Label><Select inputId="engagement-partenaire-select" name="partenaire" options={partenaireOptions} value={currentEngagement.partenaire} onChange={handleEngagementPartnerChange} styles={selectStyles} placeholder="- Sélectionner -" isClearable isDisabled={loadingOptions.partenaires} isMulti={false} className={engagementErrors.partenaire ? 'is-invalid' : ''} classNamePrefix="react-select" menuPortalTarget={document.body}/><Form.Control.Feedback type="invalid" style={{ display: engagementErrors.partenaire ? 'block' : 'none'}}>{engagementErrors.partenaire}</Form.Control.Feedback></Form.Group></Col> <Col md={6} lg={2}><Form.Group controlId="formEngagementMontant"><Form.Label className="small mb-1 fw-medium">Montant (MAD)<span className="text-danger"></span></Form.Label><Form.Control type="number" step="0.01" min="0" name="montant_engage" size="sm" value={currentEngagement.montant_engage} onChange={handleEngagementChange} className={inputClass.replace('mb-3', '')} isInvalid={!!engagementErrors.montant_engage}/><Form.Control.Feedback type="invalid">{engagementErrors.montant_engage}</Form.Control.Feedback></Form.Group></Col> <Col md={4} lg={2}><Form.Group controlId="formEngagementDate"><Form.Label className="small mb-1 fw-medium">Date </Form.Label><Form.Control type="date" name="date_engagement" size="sm" value={currentEngagement.date_engagement} onChange={handleEngagementChange} className={inputClass.replace('mb-3', '')} isInvalid={!!engagementErrors.date_engagement}/><Form.Control.Feedback type="invalid">{engagementErrors.date_engagement}</Form.Control.Feedback></Form.Group></Col> <Col md={4} lg={3}><Form.Group controlId="formEngagementCommentaire"><Form.Label className="small mb-1 fw-medium">Commentaire</Form.Label><Form.Control type="text" name="commentaire" size="sm" value={currentEngagement.commentaire} onChange={handleEngagementChange} className={inputClass.replace('mb-3', '')} isInvalid={!!engagementErrors.commentaire}/><Form.Control.Feedback type="invalid">{engagementErrors.commentaire}</Form.Control.Feedback></Form.Group></Col> <Col md={4} lg={2} className="d-flex align-items-center pt-md-4"><Form.Group controlId="formEngagementFormalise" className="mt-2 mt-md-0"><FormCheck type="switch" name="est_formalise" id="engagement-formalise-switch" checked={currentEngagement.est_formalise} onChange={handleEngagementChange} label="Formalisé"/></Form.Group></Col> </Row> </Card.Body> </Card>
                        <Row className={FORM_ACTIONS_ROW_CLASS}>
                            <Col xs="auto" className="pe-2"><Button onClick={onClose} variant="danger" className={`${FORM_CANCEL_BUTTON_CLASS}`} disabled={submissionStatus.loading}>Annuler</Button></Col>
                            <Col xs="auto" className="ps-2"><Button type="submit" variant="primary" className={`${FORM_SUBMIT_BUTTON_CLASS}`} style={{ backgroundColor: '#5cacee', borderColor: '#5cacee'}} disabled={isSubmitDisabled}>{submissionStatus.loading ? <><Spinner as="span" animation="border" size="sm" className="me-2"/> Enreg...</> : (isEditing ? 'Enregistrer' : 'Valider')}</Button></Col>
                        </Row>
                    </Form>
                </div>
            </div>
            <Modal show={showConfirmModal} onHide={handleModalCancel} centered backdrop="static" keyboard={false}>
                <Modal.Header closeButton><Modal.Title><FontAwesomeIcon icon={faExclamationTriangle} className="text-warning me-2" /> Confirmation Requise</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>{confirmModalData.message}</p>
                    {confirmModalData.details && confirmModalData.details.length > 0 && ( <div className='mb-3'><p className="mb-1 small text-muted">Affectera :</p><ListGroup variant="flush" style={{ maxHeight: '150px', overflowY: 'auto' }}>{confirmModalData.details.map((detail, index) => ( <ListGroup.Item key={index} className="px-2 py-1 small">{detail}</ListGroup.Item> ))}</ListGroup></div> )}
                    <p className="fw-bold text-danger">Action irréversible.</p><p>Voulez-vous vraiment continuer ?</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleModalCancel} disabled={submissionStatus.loading}>Annuler</Button>
                    <Button variant="danger" onClick={handleModalConfirm} disabled={submissionStatus.loading}> {submissionStatus.loading ? <Spinner as="span" size="sm" animation="border" className="me-2" /> : null} Confirmer </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

ProjetForm.propTypes = { itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), onClose: PropTypes.func.isRequired, onItemCreated: PropTypes.func, onItemUpdated: PropTypes.func, baseApiUrl: PropTypes.string, };
ProjetForm.defaultProps = { itemId: null, onItemCreated: (createdItem)=>{console.log("Projet Created:",createdItem);}, onItemUpdated: (updatedItem)=>{console.log("Projet Updated:",updatedItem);}, baseApiUrl: 'http://localhost:8000/api', };

export default ProjetForm;