// src/gestion_conventions/ordres_service_views/OrdreServiceForm.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Form, Button, Row, Col, Spinner, Alert, Badge, Stack } from 'react-bootstrap';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faTrashAlt, faUpload, faFileContract, faEye, faUserTie, faTimes } from '@fortawesome/free-solid-svg-icons';

// --- Constants ---
const TYPE_OPTIONS = [
    { value: 'commencement', label: 'Ordre de Commencement' },
    { value: 'arret', label: 'Ordre d\'Arrêt' }
];
// baseApiUrl is a prop

// --- Helper Function ---
const findMultiOptions = (options, valuesString, separator = ';') => {
    if (!valuesString || typeof valuesString !== 'string' || !Array.isArray(options) || options.length === 0) return [];
    const selectedValues = valuesString.split(separator)
        .map(v => String(v).trim().toLowerCase())
        .filter(v => v);
    return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase()));
};

const getPublicFileUrl = (baseApiUrlProvided, relativePath) => {
    if (!relativePath || !baseApiUrlProvided) return '#';
    try {
        const urlObject = new URL(baseApiUrlProvided);
        let appRootUrl = urlObject.origin;
        return `${appRootUrl}/${relativePath.replace(/^\//, '')}`;
    } catch (e) {
        console.error("OrdreServiceForm: Error constructing public URL:", e);
        return '#';
    }
};
// --- End Helper Functions ---

// --- Custom Styles for React-Select (Your Original Styles) ---
const customSelectStyles = (hasError) => ({
  control: (provided, state) => ({
    ...provided,
    borderRadius: '50px',
    backgroundColor: '#f8f9fa',
    borderColor: hasError ? '#dc3545' : state.isFocused ? '#86b7fe' : '#ced4da',
    boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : hasError ? '0 0 0 0.25rem rgba(220, 53, 69, 0.25)' : 'none',
    '&:hover': {
      borderColor: hasError ? '#dc3545' : '#adb5bd'
    },
    paddingTop: '0.1rem',
    paddingBottom: '0.1rem',
    minHeight: 'calc(1.5em + 0.75rem + 2px)',
  }),
  valueContainer: (provided) => ({ ...provided, padding: '0.375rem 0.75rem', flexWrap: 'wrap', }),
  input: (provided) => ({ ...provided, margin: '0px', paddingTop: '0px', paddingBottom: '0px', }),
  indicatorSeparator: () => ({ display: 'none', }),
  indicatorsContainer: (provided) => ({ ...provided, paddingRight: '0.5rem', }),
  placeholder: (provided) => ({ ...provided, color: '#6c757d', marginLeft: '2px', }),
  singleValue: (provided) => ({ ...provided, marginLeft: '2px', marginRight: '2px', }),
  menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1050 }),
  menuList: (provided) => ({ ...provided, paddingTop: '0.25rem', paddingBottom: '0.25rem', }),
  menuPortal: base => ({ ...base, zIndex: 9999 }),
  option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : 'white', color: state.isSelected ? 'white' : '#212529', '&:active': { backgroundColor: !state.isDisabled ? (state.isSelected ? '#0b5ed7' : '#dde0e3') : undefined, }, padding: '0.5rem 0.75rem', }),
  multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px', }),
  multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', fontSize: '0.85em', }),
  multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white', }, }),
});
// --- End Custom Styles ---

const OrdreServiceForm = ({ itemId, onClose, onItemCreated, onItemUpdated, baseApiUrl }) => {
    const isEditMode = !!itemId;

    const initialFormData = useMemo(() => ({
        marche_id: null, type: null, id_fonctionnaire: [], numero: '', date_emission: '', description: '',
    }), []);

    const [formData, setFormData] = useState(initialFormData);
    const [selectedFile, setSelectedFile] = useState(null);
    const [existingFileInfo, setExistingFileInfo] = useState(null);
    const [deleteExistingFile, setDeleteExistingFile] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [marcheOptions, setMarcheOptions] = useState([]);
    const [loadingMarcheOptions, setLoadingMarcheOptions] = useState(true);
    const [fonctionnaireOptions, setFonctionnaireOptions] = useState([]);
    const [loadingFonctionnaireOptions, setLoadingFonctionnaireOptions] = useState(true);

    const apiEndpoint = isEditMode ? `${baseApiUrl}/ordres-service/${itemId}` : `${baseApiUrl}/ordres-service`;

    // Fetch Marche Public Options
    useEffect(() => {
        let isMounted = true;
        setLoadingMarcheOptions(true);
        console.log("OrdreServiceForm: Fetching Marche options...");
        const marcheListUrl = `${baseApiUrl}/marches-publics?fields=id,numero_marche,intitule`; // Your original URL

        axios.get(marcheListUrl, { withCredentials: true })
            .then(response => {
                if (!isMounted) return;
                console.log("OrdreServiceForm: Raw response for Marche options:", response.data);
                const marcheList = response.data?.marches_publics || response.data?.data || response.data || [];
                if (!Array.isArray(marcheList)) {
                    console.warn("OrdreServiceForm: Marche options data is not an array:", marcheList);
                    setMarcheOptions([]); return;
                }
                const options = marcheList.map(m => {
                    if (m.id === undefined || m.numero_marche === undefined || m.intitule === undefined) {
                        console.warn("OrdreServiceForm: Skipping invalid Marche option:", m); return null;
                    }
                    return { value: m.id, label: `${m.numero_marche} - ${m.intitule}`.substring(0, 100) + (m.intitule.length > 100 ? '...' : '') };
                }).filter(opt => opt !== null).sort((a,b) => String(a.label || '').localeCompare(String(b.label || '')));
                setMarcheOptions(options);
                console.log("OrdreServiceForm: Processed Marche options (count):", options.length);
            })
            .catch(err => { if (isMounted) { console.error("OrdreServiceForm: Error fetching Marche options:", err.response || err); setError(prev => prev ? `${prev}\nErreur chargement marchés (OSF).` : "Erreur chargement marchés (OSF)."); setMarcheOptions([]); } })
            .finally(() => { if (isMounted) setLoadingMarcheOptions(false); });
        return () => { isMounted = false; };
    }, [baseApiUrl]);

    // Fetch Fonctionnaire Options
    useEffect(() => {
        let isMounted = true;
        setLoadingFonctionnaireOptions(true);
        console.log("OrdreServiceForm: Fetching Fonctionnaire options from /options/fonctionnaires ...");
        const fonctionnaireListUrl = `${baseApiUrl}/options/fonctionnaires`; // <<< CORRECTED URL

        axios.get(fonctionnaireListUrl, { withCredentials: true })
            .then(response => {
                if (!isMounted) return;
                console.log("OrdreServiceForm: Raw response for /options/fonctionnaires:", response.data);
                const foncDataPayload = response.data?.fonctionnaires; // <<< CORRECTED EXTRACTION

                if (Array.isArray(foncDataPayload)) {
                    const options = foncDataPayload.map(f => {
                        if (f.id === undefined || (f.nom_complet === undefined && f.Nom_Fonctionnaire === undefined && f.nom === undefined && f.name === undefined)) {
                            console.warn("OrdreServiceForm: Skipping invalid Fonctionnaire option:", f); return null;
                        }
                        return { value: f.id, label: f.nom_complet || f.Nom_Fonctionnaire || f.nom || f.name || `ID ${f.id}` };
                    }).filter(opt => opt !== null).sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')));
                    setFonctionnaireOptions(options);
                    console.log("OrdreServiceForm: Processed Fonctionnaire options (count):", options.length);
                } else {
                    console.warn("OrdreServiceForm: Fonctionnaire list payload (from .fonctionnaires key) is not an array:", foncDataPayload);
                    setError(prev => prev ? `${prev}\nFormat Fonctionnaires invalide (OSF).` : "Format Fonctionnaires invalide (OSF).");
                    setFonctionnaireOptions([]);
                }
            })
            .catch(err => {
                if (isMounted) {
                    console.error("OrdreServiceForm: Error fetching Fonctionnaire options:", err.response || err);
                    setError(prev => prev ? `${prev}\nErreur chargement points focaux (OSF).` : "Erreur chargement points focaux (OSF).");
                    setFonctionnaireOptions([]);
                }
            })
            .finally(() => {
                if (isMounted) setLoadingFonctionnaireOptions(false);
            });
        return () => { isMounted = false; };
    }, [baseApiUrl]);
    
    const allOptionsLoaded = useMemo(() => !loadingMarcheOptions && !loadingFonctionnaireOptions, [loadingMarcheOptions, loadingFonctionnaireOptions]);

    // Fetch Existing OrdreService Data (Edit Mode)
    useEffect(() => {
        let isMounted = true;
        if (isEditMode && itemId && allOptionsLoaded) {
            setIsLoading(true); setError(null); setValidationErrors({});
            setExistingFileInfo(null); setSelectedFile(null); setDeleteExistingFile(false);
            console.log(`OrdreServiceForm (Edit): Fetching data for ID: ${itemId}`);

            axios.get(`${baseApiUrl}/ordres-service/${itemId}`, { withCredentials: true })
                .then(response => {
                    if (!isMounted) return;
                    const itemData = response.data?.ordre_service || response.data || null;
                    console.log("OrdreServiceForm (Edit): Fetched OS data:", itemData);

                    if (!itemData || !(itemData.id || itemData.ID_Ordre_Service)) {
                        setError("Données OS non trouvées."); setIsLoading(false); return;
                    }
                    
                    const findOptionByValue = (options, valueToFind) => options.find(opt => String(opt.value) === String(valueToFind)) || null;
                    const selectedMarcheOption = findOptionByValue(marcheOptions, itemData.marche_id);
                    const currentFonctionnaireIdsString = itemData.id_fonctionnaire || '';
                    const selectedFonctionnaireOptions = findMultiOptions(fonctionnaireOptions, currentFonctionnaireIdsString, ';');

                    setFormData({
                        marche_id: selectedMarcheOption,
                        type: TYPE_OPTIONS.find(opt => opt.value === itemData.type) || null,
                        id_fonctionnaire: selectedFonctionnaireOptions,
                        numero: itemData.numero || '',
                        date_emission: itemData.date_emission ? itemData.date_emission.split(' ')[0] : '',
                        description: itemData.description || '',
                    });

                    if (itemData.fichier_joint_url && itemData.fichier_joint_filename) {
                        setExistingFileInfo({ name: itemData.fichier_joint_filename, url: itemData.fichier_joint_url, path: itemData.fichier_joint });
                    } else if (itemData.fichier_joint) {
                        const fileNameFromPath = itemData.fichier_joint.substring(itemData.fichier_joint.lastIndexOf('/') + 1);
                        setExistingFileInfo({ name: fileNameFromPath, path: itemData.fichier_joint, url: getPublicFileUrl(baseApiUrl, itemData.fichier_joint) });
                    } else {
                        setExistingFileInfo(null);
                    }
                })
                .catch(err => { if (isMounted) { console.error("OrdreServiceForm (Edit): Error fetching OS:", err.response||err); setError(err.response?.data?.message || err.message || "Err. chargement OS."); setFormData(initialFormData); }})
                .finally(() => { if (isMounted) setIsLoading(false); });
        } else if (!isEditMode && allOptionsLoaded) {
             setFormData(initialFormData); setSelectedFile(null); setExistingFileInfo(null); setDeleteExistingFile(false); setIsLoading(false);
        }
        return () => { isMounted = false; };
    }, [itemId, isEditMode, baseApiUrl, allOptionsLoaded, marcheOptions, fonctionnaireOptions, initialFormData]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name]) { setValidationErrors(prev => { const next = { ...prev }; delete next[name]; return next; });}
    }, [validationErrors]);

    const handleSelectChange = useCallback((selectedOptionOrOptions, actionMeta) => {
        const { name } = actionMeta;
        setFormData(prev => ({ ...prev, [name]: selectedOptionOrOptions }));
        console.log(`[ORDRE SERVICE FORM] Select change for ${name}:`, selectedOptionOrOptions);
        if (validationErrors[name]) { setValidationErrors(prev => { const next = { ...prev }; delete next[name]; return next; });}
    }, [validationErrors]);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            if (isEditMode && existingFileInfo) { setDeleteExistingFile(true); }
            setExistingFileInfo(null);
             if (validationErrors.fichier_joint) { setValidationErrors(prev => ({ ...prev, fichier_joint: undefined })); }
        }
        e.target.value = null;
    }, [validationErrors, isEditMode, existingFileInfo]);

    const removeNewFile = useCallback(() => {
        setSelectedFile(null);
         if (isEditMode) { setDeleteExistingFile(false); }
    }, [isEditMode]);

    const markExistingFileForDeletion = useCallback(() => {
        if (!window.confirm("Supprimer le fichier joint existant lors de la sauvegarde ?")) return;
        setSelectedFile(null); setDeleteExistingFile(true); setExistingFileInfo(null);
    }, []);

    const mapServerErrors = useCallback((serverErrors) => {
        const formErrors = {};
        if (!serverErrors || typeof serverErrors !== 'object') return formErrors;
        for (const key in serverErrors) {
            const simpleKey = key.includes('.') ? key.split('.')[0] : key;
            formErrors[simpleKey] = Array.isArray(serverErrors[key]) ? serverErrors[key] : [serverErrors[key]];
        }
        console.log("OrdreServiceForm: Mapped server validation errors:", formErrors);
        return formErrors;
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        let localValidationErrors = {};
        if (!formData.marche_id?.value) localValidationErrors.marche_id = ["Le marché public est requis."];
        if (!formData.type?.value) localValidationErrors.type = ["Le type d'ordre est requis."];
        if (!formData.numero?.trim()) localValidationErrors.numero = ["Le numéro est requis."];
        if (!formData.date_emission) localValidationErrors.date_emission = ["La date d'émission est requise."];

        if (Object.keys(localValidationErrors).length > 0) {
            setValidationErrors(localValidationErrors); setError("Veuillez corriger les erreurs."); return;
        }

        setIsSubmitting(true); setError(null); setValidationErrors({});
        const submissionPayload = new FormData();

        submissionPayload.append('marche_id', formData.marche_id.value);
        submissionPayload.append('type', formData.type.value);
        submissionPayload.append('numero', formData.numero);
        submissionPayload.append('date_emission', formData.date_emission);
        submissionPayload.append('description', formData.description || '');

        const fonctionnaireIds = Array.isArray(formData.id_fonctionnaire)
            ? formData.id_fonctionnaire.map(opt => opt.value).join(';')
            : '';
        submissionPayload.append('id_fonctionnaire', fonctionnaireIds);
        console.log("OrdreServiceForm SUBMIT: Appending id_fonctionnaire as:", fonctionnaireIds);

        if (selectedFile instanceof File) { submissionPayload.append('fichier_joint', selectedFile, selectedFile.name); }
        else if (isEditMode && deleteExistingFile) { submissionPayload.append('delete_fichier_joint', '1'); }
        if (isEditMode) { submissionPayload.append('_method', 'PUT'); }

        console.log("OrdreServiceForm SUBMIT: Submitting FormData to:", apiEndpoint);
        // for (let [key, value] of submissionPayload.entries()) { console.log(`SUBMIT ${key}:`, (value instanceof File ? value.name : value)); }

        try {
            const config = { headers: { 'Accept': 'application/json' }, withCredentials: true };
            const response = await axios.post(apiEndpoint, submissionPayload, config);
            console.log(`OrdreServiceForm SUBMIT: API Response (${isEditMode ? 'Update':'Create'}):`, response.data);
            const responseData = response.data.ordre_service || response.data;
            if (isEditMode && onItemUpdated) { onItemUpdated(responseData); }
            else if (!isEditMode && onItemCreated) { onItemCreated(responseData); }
            onClose();
        } catch (err) {
             console.error(`OrdreServiceForm SUBMIT: Error (${isEditMode?'Update':'Create'}):`, err.response||err);
             const message = err.response?.data?.message || err.message || "Erreur sauvegarde.";
             if (err.response?.status === 422) {
                 setValidationErrors(mapServerErrors(err.response.data.errors || {}));
                 setError("Veuillez corriger les erreurs indiquées.");
             } else { setError(message); setValidationErrors({}); }
        } finally { setIsSubmitting(false); }
    }, [ formData, selectedFile, deleteExistingFile, isEditMode, apiEndpoint, onItemUpdated, onItemCreated, onClose, mapServerErrors ]);
    
    const showOverallLoading = loadingMarcheOptions || loadingFonctionnaireOptions || (isEditMode && isLoading);

    if (showOverallLoading && !error) {
        return <div className="text-center p-5"><Spinner animation="border" /> Chargement du formulaire...</div>;
    }
    if (error && Object.keys(validationErrors).length === 0 && !showOverallLoading) { // Only show general error if not validation error and not loading
        return <Alert variant="danger" className="m-4">{error}</Alert>;
    }

    return (
        <div className='p-4'>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditMode ? 'Modifier le' : 'Créer un nouveau'}</h5>
                    <h2 className="mb-0 fw-bold">Ordre de Service {isEditMode ? `(${formData.numero || '...'})` : ''}</h2>
                </div>
                <Button variant="light" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm' onClick={onClose} size="sm" title="Retour">
                     <FontAwesomeIcon icon={faTimes} className="me-1" /> Revenir a la liste
                </Button>
            </div>

            <Form onSubmit={handleSubmit} noValidate>
                <div style={{ maxHeight: 'calc(80vh - 160px)', overflowY: 'auto', padding: '1.5rem' }} className='holder border bg-white rounded-4 shadow-sm'>
                    {error && !Object.keys(validationErrors).length && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
                    {Object.keys(validationErrors).length > 0 && <Alert variant="warning" className="small py-2">Veuillez corriger les erreurs.</Alert>}

                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="marche_id_select_osf">
                            <FontAwesomeIcon icon={faFileContract} className="me-1" /> Marché Public Associé <span className="text-danger">*</span>
                        </Form.Label>
                        <Select
                            inputId="marche_id_select_osf"
                            name="marche_id"
                            options={marcheOptions}
                            value={formData.marche_id}
                            onChange={(opt) => handleSelectChange(opt, {name: 'marche_id'})}
                            placeholder="Sélectionner un marché..."
                            isDisabled={isSubmitting || loadingMarcheOptions}
                            isClearable={false} 
                            styles={customSelectStyles(!!validationErrors.marche_id)}
                            aria-invalid={!!validationErrors.marche_id}
                            aria-describedby="marche_id_feedback"
                            menuPortalTarget={document.body}
                        />
                        {validationErrors.marche_id && <div id="marche_id_feedback" className="d-block invalid-feedback ps-2 small mt-1">{validationErrors.marche_id[0]}</div>}
                    </Form.Group>

                    <Row>
                        <Form.Group as={Col} md="6" className="mb-3">
                            <Form.Label htmlFor="type_ordre_select_osf">Type <span className="text-danger">*</span></Form.Label>
                            <Select
                                inputId="type_ordre_select_osf"
                                name="type"
                                options={TYPE_OPTIONS}
                                value={formData.type}
                                onChange={(opt) => handleSelectChange(opt, {name: 'type'})}
                                placeholder="Sélectionner type..."
                                isDisabled={isSubmitting}
                                isClearable={false}
                                styles={customSelectStyles(!!validationErrors.type)}
                                aria-invalid={!!validationErrors.type}
                                aria-describedby="type_feedback"
                                menuPortalTarget={document.body}
                            />
                            {validationErrors.type && <div id="type_feedback" className="d-block invalid-feedback ps-2 small mt-1">{validationErrors.type[0]}</div>}
                        </Form.Group>
                        <Form.Group as={Col} md="6" className="mb-3">
                            <Form.Label htmlFor="numero_ordre_osf">Numéro/Référence <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                                id="numero_ordre_osf" type="text" name="numero"
                                value={formData.numero} onChange={handleChange}
                                isInvalid={!!validationErrors.numero} required disabled={isSubmitting}
                                className='form-control-style shadow-sm form-control-rounded'
                                aria-describedby="numero_feedback"
                            />
                            <Form.Control.Feedback id="numero_feedback" type="invalid">{validationErrors.numero?.[0]}</Form.Control.Feedback>
                        </Form.Group>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="date_emission_osf">Date d'Émission <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            id="date_emission_osf" type="date" name="date_emission"
                            value={formData.date_emission} onChange={handleChange}
                            isInvalid={!!validationErrors.date_emission} required disabled={isSubmitting}
                            className='form-control-style shadow-sm form-control-rounded'
                            aria-describedby="date_emission_feedback"
                        />
                        <Form.Control.Feedback id="date_emission_feedback" type="invalid">{validationErrors.date_emission?.[0]}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="fonctionnaire_select_osf_form"> 
                            <FontAwesomeIcon icon={faUserTie} className="me-1" /> Points Focaux
                        </Form.Label>
                        <Select
                            inputId="fonctionnaire_select_osf_form"
                            name="id_fonctionnaire" 
                            options={fonctionnaireOptions}
                            value={formData.id_fonctionnaire} 
                            onChange={(opts) => handleSelectChange(opts, {name: 'id_fonctionnaire'})}
                            placeholder={loadingFonctionnaireOptions ? "Chargement..." : "Sélectionner (Optionnel)..."}
                            isLoading={loadingFonctionnaireOptions}
                            isDisabled={loadingFonctionnaireOptions || isSubmitting}
                            isClearable={true} isSearchable={true} isMulti closeMenuOnSelect={false}
                            styles={customSelectStyles(!!validationErrors.id_fonctionnaire)}
                            aria-invalid={!!validationErrors.id_fonctionnaire}
                            aria-describedby="id_fonctionnaire_feedback"
                            menuPortalTarget={document.body}
                        />
                        {validationErrors.id_fonctionnaire && <div id="id_fonctionnaire_feedback" className="d-block invalid-feedback ps-2 small mt-1">{validationErrors.id_fonctionnaire[0]}</div>}
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="description_osf">Description</Form.Label>
                        <Form.Control
                            id="description_osf" as="textarea" rows={3} name="description"
                            value={formData.description} onChange={handleChange}
                            isInvalid={!!validationErrors.description} disabled={isSubmitting}
                            className='form-control-style shadow-sm form-control-rounded'
                            aria-describedby="description_feedback"
                        />
                        <Form.Control.Feedback id="description_feedback" type="invalid">{validationErrors.description?.[0]}</Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="fichier_joint_input_osf_form">
                            <FontAwesomeIcon icon={faPaperclip} className="me-1"/> Fichier Joint
                        </Form.Label>
                        <Form.Control
                            id="fichier_joint_input_osf_form" type="file"
                            onChange={handleFileChange}
                            isInvalid={!!validationErrors.fichier_joint} disabled={isSubmitting}
                            className="d-none" aria-describedby="fichier_joint_feedback"
                        />
                        <div className="border p-2 rounded bg-light form-control-style">
                            {isEditMode && existingFileInfo && !selectedFile && (
                                <Stack direction="horizontal" gap={2} className="align-items-center">
                                    <Badge pill bg="info" text="dark" className="d-flex align-items-center p-2 shadow-sm">
                                       <span className='me-2 text-truncate' style={{ maxWidth: '250px' }} title={existingFileInfo.name}>
                                           {existingFileInfo.name}
                                       </span>
                                       <a href={existingFileInfo.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary border-0 p-0 px-1 me-1" title="Voir le fichier actuel">
                                           <FontAwesomeIcon icon={faEye} size="xs"/>
                                       </a>
                                       <Button variant="close" size="sm" aria-label="Supprimer existant" className="p-0" onClick={markExistingFileForDeletion} title="Marquer pour suppression" disabled={isSubmitting}></Button>
                                   </Badge>
                                </Stack>
                            )}
                            {selectedFile && (
                                <Stack direction="horizontal" gap={2} className="align-items-center">
                                    <Badge pill bg="success" className="d-flex align-items-center p-2 shadow-sm">
                                       <span className='me-2 text-truncate' style={{ maxWidth: '250px' }} title={selectedFile.name}>
                                           {selectedFile.name}
                                       </span>
                                       <Button variant="close" size="sm" aria-label="Retirer nouveau" className="btn-close-white p-0" onClick={removeNewFile} title="Retirer ce fichier" disabled={isSubmitting}></Button>
                                    </Badge>
                                </Stack>
                            )}
                            {!selectedFile && (!isEditMode || !existingFileInfo) && (
                                <Button variant="outline-warning" size="sm" className="rounded-5" onClick={() => document.getElementById('fichier_joint_input_osf_form')?.click()} disabled={isSubmitting}>
                                    <FontAwesomeIcon icon={faUpload} className="me-2"/> Choisir un fichier...
                                </Button>
                            )}
                            {validationErrors.fichier_joint && <div id="fichier_joint_feedback" className="d-block invalid-feedback mt-1">{validationErrors.fichier_joint[0]}</div>}
                        </div>
                        <Form.Text className='d-block mt-1'>Formats autorisés: PDF, DOC(X), XLS(X), Images, ZIP, etc. (Max 20Mo)</Form.Text>
                    </Form.Group>
                </div>

                 <div className="text-center mt-4 pt-3 border-top">
                     <Button variant="danger" onClick={onClose} className="me-3 rounded-5 px-5" disabled={isSubmitting}>
                         Annuler
                     </Button>
                     <Button variant="primary" type="submit" disabled={isSubmitting || showOverallLoading} className="rounded-5 px-5">
                         {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1"/> : null}
                         {isSubmitting ? 'Sauvegarde...' : (isEditMode ? 'Enregistrer Modifications' : 'Créer Ordre')}
                     </Button>
                 </div>
            </Form>
        </div>
     );
};

OrdreServiceForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string.isRequired,
};

OrdreServiceForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {},
    onItemUpdated: () => {},
    // baseApiUrl is required via propTypes
};

export default OrdreServiceForm;