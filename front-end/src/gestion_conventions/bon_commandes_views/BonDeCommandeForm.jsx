// src/gestion_conventions/bons_de_commande_views/BonDeCommandeForm.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { Form, Button, Row, Col, Alert, Spinner, Card, Stack, Badge, Modal, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faTrashAlt, faFileAlt, faPaperclip, faPlus,
    faUsers, faUserTie, faTimes
} from '@fortawesome/free-solid-svg-icons';

// --- Styles and CSS Classes ---
const selectStyles = {
    control: (provided, state) => ({ ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.selectProps.className?.includes('is-invalid') ? '#dc3545' : (state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'), boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', fontSize: '0.875rem', }), valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden', }), input: (provided) => ({ ...provided, margin: '0px', padding: '0px', fontSize: '0.875rem' }), indicatorSeparator: () => ({ display: 'none', }), indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }), placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }), menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }), menuPortal: base => ({ ...base, zIndex: 9999 }), option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }), multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px', }), multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', fontSize: '0.8rem' }), multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white', }, }), noOptionsMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }), loadingMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),};
const FORM_CONTAINER_CLASS = "p-3 p-md-4 bc-form-container";
const FORM_CONTROL_CLASS = "p-2 mt-1 mb-3 rounded-pill shadow-sm bg-light border-1";
const FORM_SELECT_CLASS = "px-3 py-2 mt-1 rounded-5  border mb-3 shadow-sm bg-light ";
const FORM_TEXTAREA_CLASS = "p-3 mt-1 mb-3 rounded-5  shadow-sm bg-light border-1 ";
const FORM_ACTIONS_ROW_CLASS = "mt-4 pt-2 justify-content-center flex-shrink-0";
const FORM_CANCEL_BUTTON_CLASS = "btn px-5 rounded-5 py-1 bg-danger border-0 text-white";
const FORM_SUBMIT_BUTTON_CLASS = "btn rounded-5 px-5 py-1 align-items-center d-flex justify-content-evenly bg-primary border-0";
const FORM_HEADER_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold';

// --- Environment Variables & Helpers ---
const STORAGE_URL = process.env.REACT_APP_STORAGE_URL || 'http://localhost:8000/storage';

const findMultiOptions = (options, valuesString, separator = ';') => {
    if (!valuesString || typeof valuesString !== 'string' || !Array.isArray(options) || options.length === 0) return [];
    const selectedValues = valuesString.split(separator).map(v => String(v).trim().toLowerCase()).filter(v => v);
    return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase()));
};

const getPublicFileUrl = (appBaseUrl, relativePath) => {
    if (!relativePath || !appBaseUrl) return '#';
    try {
        const url = new URL(appBaseUrl.endsWith('/api') ? appBaseUrl.substring(0, appBaseUrl.length - 4) : appBaseUrl);
        let rootUrl = url.origin;
        return `${rootUrl}/${relativePath.replace(/^\//, '')}`;
    } catch (e) { console.error("BonDeCommandeForm: Error constructing public URL:", e); return '#'; }
};

const etatOptions = [
    { value: 'en préparation', label: 'En préparation' },
    { value: 'validé', label: 'Validé' },
    { value: 'envoyé', label: 'Envoyé' },
    { value: 'reçu', label: 'Reçu' },
    { value: 'annulé', label: 'Annulé' },
];
// --- End Helpers & Constants ---

const BonDeCommandeForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated, baseApiUrl }) => {
    const isEditing = useMemo(() => itemId !== null, [itemId]);

    const initialState = useMemo(() => ({
        numero_bc: '', date_emission: '', objet: '', montant_total: '',
        fournisseur_nom: '', mode_paiement: '', etat: 'en préparation',
        marche: null, contrat: null,
        fonctionnaires: [], 
        existingFiles: [], filesToDelete: [],
    }), []);

    const [formData, setFormData] = useState(initialState);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [marcheOptions, setMarcheOptions] = useState([]);
    const [contratOptions, setContratOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState({ marches: true, contrats: true, fonctionnaires: true });
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(isEditing);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState({ message: '', details: [] });
    const [dataToResubmit, setDataToResubmit] = useState(null);

    const apiPrefix = '';

    // --- Fetch Options ---
    const fetchAllOptions = useCallback(async () => {
        console.log("[BC FORM] Fetching all options...");
        setLoadingOptions({ marches: true, contrats: true, fonctionnaires: true });
        let componentError = null;
        try {
            const [marcheRes, contratRes, foncRes] = await Promise.allSettled([
                axios.get(`${baseApiUrl}${apiPrefix}/options/marches-publics`, { withCredentials: true }),
                axios.get(`${baseApiUrl}${apiPrefix}/contrat-droit-commun`, { params: { per_page: 1000 }, withCredentials: true }),
                axios.get(`${baseApiUrl}${apiPrefix}/options/fonctionnaires`, { withCredentials: true })
            ]);

            if (marcheRes.status === 'fulfilled' && marcheRes.value.data) {
            const dataArray = Array.isArray(marcheRes.value.data) ? marcheRes.value.data : [];
            setMarcheOptions(
                dataArray.sort((a,b) => String(a.label || '').localeCompare(String(b.label || '')))
            );
            console.log("[BC FORM OPTIONS] Set marcheOptions directly from API response:", dataArray.slice(0,5));
}
            if (contratRes.status === 'fulfilled' && contratRes.value.data) {
                const dataArray = contratRes.value.data.contrats || contratRes.value.data.data || contratRes.value.data || [];
                setContratOptions(dataArray.map(c => ({ value: c.id, label: `${c.numero_contrat || c.objet || `ID: ${c.id}`}` })).sort((a,b)=>String(a.label||'').localeCompare(String(b.label||''))));
            } else { console.error("[BC FORM] Failed to fetch contrats:", contratRes.reason?.message || "Err"); componentError = (componentError ? componentError + "\n" : "") + "Err. Listes Contrats"; setContratOptions([]); }
            
            if (foncRes.status === 'fulfilled' && foncRes.value.data) {
                const foncApiResponseData = foncRes.value.data;
                console.log("[BC FORM] Raw response for /options/fonctionnaires:", foncApiResponseData);
                const foncDataPayload = foncApiResponseData?.fonctionnaires; 
                if (Array.isArray(foncDataPayload)) {
                    const mappedFoncOptions = foncDataPayload.map(f => {
                        if (f.id === undefined || (f.nom_complet === undefined && f.Nom_Fonctionnaire === undefined && f.nom === undefined && f.name === undefined)) {
                             console.warn("[BC FORM] Skipping invalid Fonctionnaire option:", f); return null;
                        }
                        return { value: f.id, label: f.nom_complet || f.Nom_Fonctionnaire || f.nom || f.name || `ID ${f.id}` };
                    }).filter(opt => opt !== null).sort((a,b) => String(a.label || '').localeCompare(String(b.label || '')));
                    setFonctionnairesOptions(mappedFoncOptions);
                    console.log(`[BC FORM] Processed ${mappedFoncOptions.length} fonctionnaire options.`);
                } else {
                    console.error("[BC FORM] Fonctionnaire list payload (from .fonctionnaires key) is NOT an array:", foncDataPayload);
                    componentError = (componentError ? componentError + "\n" : "") + "Format Points Focaux invalide.";
                    setFonctionnairesOptions([]);
                }
            } else {
                console.error("[BC FORM] Failed to fetch fonctionnaires:", foncRes.reason?.message || "Err");
                componentError = (componentError ? componentError + "\n" : "") + "Err. Listes Points Focaux";
                setFonctionnairesOptions([]);
            }
            if (componentError) { setError(componentError); } 
        } catch (err) {
            console.error("[BC FORM] Critical error in fetchAllOptions:", err);
            setError("Erreur critique chargement des options.");
            setMarcheOptions([]); setContratOptions([]); setFonctionnairesOptions([]);
        } finally {
            setLoadingOptions({ marches: false, contrats: false, fonctionnaires: false });
        }
    }, [baseApiUrl, apiPrefix]);

    useEffect(() => { fetchAllOptions(); }, [fetchAllOptions]);

    const allOptionsLoaded = useMemo(() =>
        !loadingOptions.marches && !loadingOptions.contrats && !loadingOptions.fonctionnaires,
        [loadingOptions]
    );

    useEffect(() => { 
        let isMounted = true;
        if (isEditing && itemId && allOptionsLoaded) {
            setLoadingData(true); setError(null); setFormErrors({});
            console.log(`[BC FORM EDIT] Fetching data for BC ID: ${itemId}`);
            axios.get(`${baseApiUrl}${apiPrefix}/bon-de-commande/${itemId}`, { withCredentials: true })
                .then(response => {
                    if (!isMounted) return;
                    const data = response.data.bon_de_commande || response.data;
                    console.log("[BC FORM EDIT] Fetched Data:", data);
                    if (!data) { setError("Bon de commande non trouvé."); setLoadingData(false); return; }
                    const findOption = (options, valueToFind) => options?.find(opt => String(opt.value) === String(valueToFind)) || null;
                    const matchedFonctionnaires = findMultiOptions(fonctionnairesOptions, data.id_fonctionnaire, ';');
                    setFormData({
                        numero_bc: data.numero_bc ?? '',
                        date_emission: data.date_emission ? data.date_emission.split('T')[0].split(' ')[0] : '',
                        objet: data.objet ?? '',
                        montant_total: data.montant_total ?? '',
                        fournisseur_nom: data.fournisseur_nom ?? '',
                        mode_paiement: data.mode_paiement ?? '',
                        etat: data.etat ?? 'en préparation',
                        marche: findOption(marcheOptions, data.marche_id),
                        contrat: findOption(contratOptions, data.contrat_id),
                        fonctionnaires: matchedFonctionnaires,
                        existingFiles: (data.fichiers || []).map(f => ({ ...f, url: getPublicFileUrl(baseApiUrl, f.chemin_fichier) })),
                        filesToDelete: [],
                    });
                    setSelectedFiles([]);
                })
                .catch(err => { if(isMounted) { console.error("[BC FORM EDIT] Error loading BC data:", err.response || err); setError(err.response?.data?.message || err.message || "Erreur chargement BC."); setFormData(initialState); }})
                .finally(() => { if(isMounted) setLoadingData(false); });
        } else if (!isEditing && allOptionsLoaded) {
            if (formData.numero_bc || (formData.existingFiles && formData.existingFiles.length > 0) || selectedFiles.length > 0) {
                 setFormData(initialState); setSelectedFiles([]);
            }
            setLoadingData(false);
        }
        return () => { isMounted = false; };
    }, [itemId, isEditing, allOptionsLoaded, marcheOptions, contratOptions, fonctionnairesOptions, baseApiUrl, apiPrefix, initialState]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
    };

    const handleSelectChange = (name, selectedOption) => {
         setFormData(prev => ({ ...prev, [name]: selectedOption }));
         if (formErrors[name] || formErrors[`${name}_id`]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined, [`${name}_id`]: undefined }));
         } else if (formErrors[name]) { 
             setFormErrors(prev => ({...prev, [name]: undefined}));
         }
    };
    
    const handleFonctionnaireChange = useCallback((selectedOptions) => {
        setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] }));
        if (formErrors.id_fonctionnaire) {
            setFormErrors(prev => {
                const nextErrors = { ...prev };
                delete nextErrors.id_fonctionnaire;
                return nextErrors;
            });
        }
    }, [formErrors, setFormErrors]);

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        if (!newFiles.length) return;
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png'];
        const maxSize = 10 * 1024 * 1024;
        const validFiles = newFiles.filter(file => {
             if (!allowedTypes.includes(file.type)) {
                 setFormErrors(prev => ({...prev, fichiers: `Type de fichier non autorisé pour ${file.name}`})); return false;
             }
             if (file.size > maxSize) {
                 setFormErrors(prev => ({...prev, fichiers: `Fichier trop volumineux: ${file.name} (max 10MB)`})); return false;
             }
             return true;
         });
        if (validFiles.length !== newFiles.length) { setSelectedFiles(prev => [...prev, ...validFiles]); }
        else { setSelectedFiles(prev => [...prev, ...newFiles]); if (formErrors.fichiers) setFormErrors(prev => ({ ...prev, fichiers: undefined })); }
        if (fileInputRef.current) { fileInputRef.current.value = ""; }
    };

    const removeNewSelectedFile = useCallback((indexToRemove) => {
        setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    const handleMarkFileForDeletion = useCallback((fileIdToDelete) => {
         setFormData(prev => ({ ...prev, filesToDelete: [...(prev.filesToDelete || []), fileIdToDelete], existingFiles: (prev.existingFiles || []).filter(f => f.id !== fileIdToDelete) }));
    }, []);
    
    const mapServerErrors = useCallback((serverErrors) => {
        const errors = {};
        if (!serverErrors || typeof serverErrors !== 'object') return errors;
        for (const key in serverErrors) {
            const simpleKey = key.includes('.') ? key.split('.')[0] : key;
            errors[simpleKey] = Array.isArray(serverErrors[key]) ? serverErrors[key].join(' ') : String(serverErrors[key]);
        }
        console.log("[BC Form] Mapped server validation errors:", errors);
        return errors;
    }, []);

    const validateForm = () => {
        const errors = {};
        if (!formData.numero_bc?.trim()) errors.numero_bc = "Numéro BC requis.";
        if (!formData.date_emission) errors.date_emission = "Date d'émission requise.";
        if (!formData.objet?.trim()) errors.objet = "Objet requis.";
        if (formData.montant_total === '' || formData.montant_total === null || isNaN(parseFloat(String(formData.montant_total).replace(',','.'))) || parseFloat(String(formData.montant_total).replace(',','.')) < 0) { errors.montant_total = "Montant total (nombre positif) requis."; }
        if (!formData.fournisseur_nom?.trim()) errors.fournisseur_nom = "Nom du fournisseur requis.";
        setFormErrors(errors);
        console.log("[BC Form] Validation Errors:", errors);
        return Object.keys(errors).length === 0;
    };
    
    const handleModalConfirm = () => {
        setShowConfirmModal(false);
        if (dataToResubmit) {
            console.log("[BC FORM MODAL] Confirmed. Would resubmit data:", dataToResubmit);
            // If BonDeCommandeForm needs delete confirmation for related items,
            // you'd call a function similar to executeSubmit here, e.g.:
            // handleSubmit(null, dataToResubmit, true); // Passing a synthetic event or null
        }
        setDataToResubmit(null);
    };
    const handleModalCancel = () => {
        setShowConfirmModal(false);
        setDataToResubmit(null);
        console.log("[BC FORM MODAL] Cancelled by user.");
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault(); // Allow calling without event for modal resubmission
        if (!validateForm()) { setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs.", success: false }); return; }
        setSubmissionStatus({ loading: true, error: null, success: false });
        setFormErrors({});

        const dataToSubmit = new FormData();
        dataToSubmit.append('numero_bc', formData.numero_bc);
        dataToSubmit.append('date_emission', formData.date_emission);
        dataToSubmit.append('objet', formData.objet);
        dataToSubmit.append('montant_total', String(formData.montant_total).replace(',','.'));
        dataToSubmit.append('fournisseur_nom', formData.fournisseur_nom);
        dataToSubmit.append('etat', formData.etat || 'en préparation');
        if (formData.mode_paiement) dataToSubmit.append('mode_paiement', formData.mode_paiement);
        
        if (formData.marche?.value) dataToSubmit.append('marche_id', formData.marche.value);
        else dataToSubmit.append('marche_id', ''); 
        
        if (formData.contrat?.value) dataToSubmit.append('contrat_id', formData.contrat.value);
        else dataToSubmit.append('contrat_id', '');

        const fonctionnaireIdsString = (formData.fonctionnaires || []).map(f => f.value).join(';');
        dataToSubmit.append('id_fonctionnaire', fonctionnaireIdsString);
        console.log("[BC FORM SUBMIT] Appending id_fonctionnaire as string:", fonctionnaireIdsString);
        
        selectedFiles.forEach((file, index) => { dataToSubmit.append(`fichiers[${index}]`, file, file.name); });
        if (isEditing && formData.filesToDelete.length > 0) {
             formData.filesToDelete.forEach((fileId, index) => { dataToSubmit.append(`fichiers_a_supprimer[${index}]`, fileId); });
        } else if (isEditing) { 
            dataToSubmit.append('fichiers_a_supprimer', JSON.stringify([]));
        }

        const url = isEditing ? `${baseApiUrl}${apiPrefix}/bon-de-commande/${itemId}` : `${baseApiUrl}${apiPrefix}/bon-de-commande`;
        const httpMethod = 'POST';
        if (isEditing) { dataToSubmit.append('_method', 'PUT'); }

        console.log("[BC FORM SUBMIT] Final FormData to be sent:");
        // for (let pair of dataToSubmit.entries()) { console.log(pair[0]+ ': ' + (pair[1] instanceof File ? `File: ${pair[1].name}` : pair[1])); }

        try {
            const config = { headers: { 'Content-Type': 'multipart/form-data', 'Accept': 'application/json' }, withCredentials: true };
            const response = await axios({ method: httpMethod, url: url, data: dataToSubmit, headers: config.headers, withCredentials: config.withCredentials });
            setSubmissionStatus({ loading: false, error: null, success: true });
            const responseData = response.data.bon_de_commande || response.data;
            if (isEditing && onItemUpdated) onItemUpdated(responseData);
            else if (!isEditing && onItemCreated) onItemCreated(responseData);
            setTimeout(onClose, 1500);
        } catch (err) {
            console.error(`[BC FORM SUBMIT] Erreur:`, err.response || err);
            let errorMsg = `Une erreur s'est produite.`;
            if (err.response) {
                 if (err.response.status === 422 && typeof err.response.data.errors === 'object') {
                     const serverErrors = err.response.data.errors;
                     const mappedErrors = mapServerErrors(serverErrors);
                     setFormErrors(mappedErrors);
                     errorMsg = "Veuillez corriger les erreurs de validation.";
                 } else if (err.response.data?.message) { errorMsg = err.response.data.message; }
                 else { errorMsg = `Erreur serveur (${err.response.status})`;}
            } else if (err.request) { errorMsg = "Aucune réponse du serveur."; }
            else { errorMsg = err.message; }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };
    
    const isSubmitDisabled = submissionStatus.loading || loadingOptions.marches || loadingOptions.contrats || loadingOptions.fonctionnaires || loadingData;

    if (loadingData && isEditing) { return (<div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '300px' }}><Spinner animation="border" variant="primary" /><span className='ms-3 text-muted'>Chargement des données...</span></div>); }
    if (!loadingData && (loadingOptions.marches || loadingOptions.contrats || loadingOptions.fonctionnaires)) { return (<div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '300px' }}><Spinner animation="border" variant="secondary" /><span className='ms-3 text-muted'>Chargement des options...</span></div>); }
    
    return (
        <>
            <div className={FORM_CONTAINER_CLASS} style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
                 <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0 border-bottom pb-3">
                    <div><h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5><h2 className="mb-0 fw-bold">Bon de Commande {isEditing && formData.numero_bc ? `(${formData.numero_bc})` : (isEditing ? `(ID: ${itemId})` : '')}</h2></div>
                    <Button variant="warning" className={FORM_HEADER_CLOSE_BUTTON_CLASS} onClick={onClose} size="sm">Revenir à la liste</Button>
                </div>
                <div className="flex-grow-1 px-md-3">
                    {submissionStatus.error && ( <Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({...prev, error: null}))}> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2 flex-shrink-0"/> <div>{submissionStatus.error}</div> </Alert> )}
                    {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2"> Bon de Commande {isEditing ? 'modifié' : 'créé'} avec succès ! </Alert> )}
                    <Form noValidate onSubmit={handleSubmit}>
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
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={12} controlId="formObjet">
                                <Form.Label className="small mb-1 fw-medium">Objet <span className="text-danger">*</span></Form.Label>
                                <Form.Control as="textarea" rows={3} className={FORM_TEXTAREA_CLASS} style={{ borderRadius: '1rem' }} isInvalid={!!formErrors.objet} required name="objet" value={formData.objet} onChange={handleChange} size="sm" />
                                <Form.Control.Feedback type="invalid">{formErrors.objet}</Form.Control.Feedback>
                            </Form.Group>
                        </Row>
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
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={6} controlId="formMarcheBC">
                                <Form.Label className="small mb-1 fw-medium">Marché Associé</Form.Label>
                                <Select inputId="marche_bc_select" name="marche" options={marcheOptions} value={formData.marche} onChange={(opt) => handleSelectChange('marche', opt)} styles={selectStyles} placeholder={loadingOptions.marches ? "Chargement..." : "- Sélectionner Marché -"} isClearable isLoading={loadingOptions.marches} isDisabled={loadingOptions.marches} classNamePrefix="react-select" className={formErrors.marche_id ? 'is-invalid' : ''} menuPortalTarget={document.body}/>
                                {formErrors.marche_id && <div className="invalid-feedback d-block ps-2 small mt-1">{formErrors.marche_id}</div>}
                            </Form.Group>
                            <Form.Group as={Col} md={6} controlId="formContratBC">
                                <Form.Label className="small mb-1 fw-medium">Contrat Associé</Form.Label>
                                <Select inputId="contrat_bc_select" name="contrat" options={contratOptions} value={formData.contrat} onChange={(opt) => handleSelectChange('contrat', opt)} styles={selectStyles} placeholder={loadingOptions.contrats ? "Chargement..." : "- Sélectionner Contrat -"} isClearable isLoading={loadingOptions.contrats} isDisabled={loadingOptions.contrats} classNamePrefix="react-select" className={formErrors.contrat_id ? 'is-invalid' : ''} menuPortalTarget={document.body}/>
                                {formErrors.contrat_id && <div className="invalid-feedback d-block ps-2 small mt-1">{formErrors.contrat_id}</div>}
                            </Form.Group>
                        </Row>
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={12} controlId="formFonctionnaireBC">
                                <Form.Label className="small mb-1 fw-medium">
                                    <FontAwesomeIcon icon={faUsers} className="me-1" /> Points Focaux
                                </Form.Label>
                                <Select inputId="fonctionnaires_bc_select" name="fonctionnaires" options={fonctionnairesOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder={loadingOptions.fonctionnaires ? "Chargement..." : "Sélectionner Fonctionnaire(s) (Optionnel)..."} isClearable closeMenuOnSelect={false} isMulti isLoading={loadingOptions.fonctionnaires} isDisabled={loadingOptions.fonctionnaires} className={formErrors.id_fonctionnaire ? 'is-invalid' : ''} menuPortalTarget={document.body}/>
                                {formErrors.id_fonctionnaire && <div className="invalid-feedback d-block ps-2 small mt-1">{formErrors.id_fonctionnaire}</div>}
                            </Form.Group>
                        </Row>
                        <Row className="mb-3 g-3">
                            <Form.Group as={Col} md={6} controlId="formEtatBC">
                                <Form.Label className="small mb-1 fw-medium">État</Form.Label>
                                <Form.Select className={FORM_SELECT_CLASS} name="etat" value={formData.etat} onChange={handleChange} isInvalid={!!formErrors.etat} aria-label="Sélectionner État" >
                                    {etatOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </Form.Select>
                                <Form.Control.Feedback type="invalid">{formErrors.etat}</Form.Control.Feedback>
                            </Form.Group>
                            <Form.Group as={Col} md={6} controlId="formModePaiementBC">
                                <Form.Label className="small mb-1 fw-medium">Mode Paiement</Form.Label>
                                <Form.Control className={FORM_CONTROL_CLASS} type="text" name="mode_paiement" value={formData.mode_paiement} onChange={handleChange} size="sm" placeholder="Ex: Virement, Chèque"/>
                            </Form.Group>
                        </Row>
                        <Row className="mb-3 g-3">
                            <Col md={12}>
                                <Card className="border shadow-sm">
                                    <Card.Body className='p-3'>
                                        <Form.Group controlId="bonCommandeFileGroupBC">
                                            <Form.Label className="small mb-1 fw-medium">
                                                <FontAwesomeIcon icon={faPaperclip} className="me-2"/>Joindre Fichiers
                                            </Form.Label>
                                            <Form.Control ref={fileInputRef} id="bonCommandeFileInputBC" className='d-none' type="file" multiple onChange={handleFileChange} isInvalid={!!formErrors.fichiers} aria-hidden="true"/>
                                            <Button variant="outline-primary" size="sm" className="d-inline-block ms-2 rounded-5" onClick={() => fileInputRef.current?.click()} title="Sélectionner des fichiers à ajouter">
                                                <FontAwesomeIcon icon={faPlus} className="me-1" /> Ajouter Fichier(s)
                                            </Button>
                                            {formErrors.fichiers && (<div className="d-block invalid-feedback small mt-1 ms-1">{formErrors.fichiers}</div> )}
                                            {isEditing && formData.existingFiles?.length > 0 && ( <Stack direction="horizontal" gap={1} className="mt-2 pt-2 border-top flex-wrap" style={{fontSize: '0.8em'}}> <span className="me-2 small text-muted fw-bold">Actuels:</span> {formData.existingFiles.map((file) => ( <Badge key={`existing-bc-file-${file.id}`} pill bg="light" text="dark" className="d-flex p-2 align-items-center fw-normal border shadow-sm"> <FontAwesomeIcon icon={faFileAlt} className="me-2 text-secondary"/> <a href={file.url || `${STORAGE_URL}/${file.chemin_fichier.replace(/^\//, '')}`} target="_blank" rel="noopener noreferrer" className='me-1 text-truncate text-decoration-none text-primary' style={{maxWidth: '150px'}} title={`Voir/Télécharger: ${file.nom_fichier}`}>{file.nom_fichier}</a> <Button variant="link" size="sm" aria-label="Marquer pour suppression" className="p-0 ms-1 text-danger" style={{fontSize: '1em', lineHeight: 1}} onClick={() => handleMarkFileForDeletion(file.id)} title="Marquer pour suppression lors de la sauvegarde"><FontAwesomeIcon icon={faTrashAlt}/></Button> </Badge> ))} </Stack> )}
                                            {selectedFiles.length > 0 && ( <Stack direction="horizontal" gap={1} className={`${(isEditing && formData.existingFiles?.length > 0) ? 'mt-1 pt-1 border-top' : 'mt-2'} flex-wrap`} style={{fontSize: '0.8em'}}> <span className="me-2 small text-muted fw-bold">Nouveaux:</span> {selectedFiles.map((file, index) => ( <Badge key={`new-bc-file-${file.name}-${index}-${Date.now()}`} pill bg="success" className="d-flex align-items-center fw-normal p-2 shadow-sm"> <FontAwesomeIcon icon={faFileAlt} className="me-2"/> <span className='me-1 text-truncate' style={{maxWidth: '150px'}} title={file.name}>{file.name}</span> <Button variant="close" size="sm" aria-label="Retirer ce fichier" className="btn-close-white p-0 ms-1" style={{fontSize: '0.6em', filter: 'invert(1) grayscale(100%) brightness(200%)'}} onClick={() => removeNewSelectedFile(index)}/> </Badge> ))} </Stack> )}
                                            {selectedFiles.length === 0 && (!isEditing || !formData.existingFiles || formData.existingFiles.length === 0) && ( <div className="mt-2 small text-muted fst-italic">Aucun fichier joint.</div> )}
                                        </Form.Group>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                        <Row className={FORM_ACTIONS_ROW_CLASS}>
                            <Col xs="auto" className="pe-2"><Button onClick={onClose} variant="secondary" className={FORM_CANCEL_BUTTON_CLASS} disabled={submissionStatus.loading}>Annuler</Button></Col>
                            <Col xs="auto" className="ps-2"><Button type="submit" className={FORM_SUBMIT_BUTTON_CLASS} disabled={isSubmitDisabled} style={{ backgroundColor: '#0d6efd', borderColor: '#0d6efd'}}> {submissionStatus.loading ? <><Spinner as="span" animation="border" size="sm" className="me-2"/> Sauvegarde...</> : (isEditing ? 'Enregistrer Modifications' : 'Créer Bon de Commande')} </Button></Col>
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

BonDeCommandeForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string, // Prop for baseApiUrl
};
BonDeCommandeForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {},
    onItemUpdated: () => {},
    baseApiUrl: 'http://localhost:8000/api', // Default for baseApiUrl prop
};

export default BonDeCommandeForm;