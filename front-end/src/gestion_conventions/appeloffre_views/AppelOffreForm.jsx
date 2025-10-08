import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Form, Button, Row, Col, Spinner, Alert, InputGroup, Card, Badge, Modal, Stack } from 'react-bootstrap';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faPaperclip, faPlus, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

// --- Constants ---
const CATEGORIE_OPTIONS = [
    { value: 'Travaux', label: 'Travaux' },
    { value: 'Etudes', label: 'Etudes' },
    { value: 'Services', label: 'Services' },
    { value: 'Fournitures', label: 'Fournitures' }
];

const PROVINCE_OPTIONS = [
    { value: 'Berkane', label: 'Berkane' },
    { value: 'Driouch', label: 'Driouch' },
    { value: 'Figuig', label: 'Figuig' },
    { value: 'Guercif', label: 'Guercif' },
    { value: 'Jerada', label: 'Jerada' },
    { value: 'Nador', label: 'Nador' },
    { value: 'Oujda-Angad', label: 'Oujda-Angad' },
    { value: 'Taourirt', label: 'Taourirt' }
];

export const FICHIER_CATEGORIES = [
    { value: 'cps', label: 'CPS (Cahier des Prescriptions Spéciales)' },
    { value: 'rc', label: 'RC (Règlement de Consultation)' },
    { value: 'estimation', label: 'Estimation Détaillée' },
    { value: 'autre', label: 'Autre Document' }
];

const initialFormData = {
    categorie: '',
    provinces: null,
    numero: '',
    intitule: '',
    estimation: '',
    estimation_HT: '',
    montant_TVA: '',
    duree_execution: '',
    date_verification: '',
    date_ouverture: '',
    last_session_op: '',
    date_publication: '',
    lancement_portail: false,
    date_lancement_portail: '',
    fonctionnaires: [],
};

// --- Helpers & Styles ---

const findMultiOptions = (options, valuesString, separator = ';') => {
    if (!valuesString || typeof valuesString !== 'string' || !Array.isArray(options) || options.length === 0) return [];
    const selectedValues = valuesString.split(separator).map(v => String(v).trim()).filter(Boolean);
    return options.filter(opt => selectedValues.includes(String(opt.value)));
};

const getReactSelectStyles = (hasError) => ({
    control: (base, state) => ({
        ...base, backgroundColor: '#f8f9fa', borderRadius: '50px',
        borderColor: hasError ? '#dc3545' : (state.isFocused ? '#86b7fe' : '#ced4da'),
        boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : '0 .125rem .25rem rgba(0,0,0,.075)',
        minHeight: '38px', '&:hover': { borderColor: hasError ? '#dc3545' : (state.isFocused ? '#86b7fe' : '#adb5bd') }
    }),
    valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden' }),
    input: (provided) => ({ ...provided, margin: '0px', padding: '0px' }),
    indicatorSeparator: () => ({ display: 'none' }),
    placeholder: (provided) => ({ ...provided, color: '#6c757d' }),
    menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1050 }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black' }),
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px' }),
    multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px' }),
    multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', borderRadius: '0 0.5rem 0.5rem 0', ':hover': { backgroundColor: '#dc3545', color: 'white' } }),
});

// --- Main Form Component ---
const AppelOffreForm = ({ itemId, onClose, onItemCreated, onItemUpdated, baseApiUrl }) => {
    const isEditMode = useMemo(() => !!itemId, [itemId]);

    // --- State Management ---
    const [formData, setFormData] = useState(initialFormData);
    const [selectedProvinceOptions, setSelectedProvinceOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState({ fonctionnaires: true });
    const [loadingData, setLoadingData] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // File-related states
    const [newFiles, setNewFiles] = useState([]); // { file: File, intitule: string, categorie: string }
    const [existingFiles, setExistingFiles] = useState([]);
    const [filesToDelete, setFilesToDelete] = useState([]);
    const [editingFile, setEditingFile] = useState(null); // { isExisting: bool, data: fileObject, location: { index: num } }
    const FORM_HEADER_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold border-0';

    // --- Data Fetching ---
    const fetchFonctionnaires = useCallback(async () => {
        setLoadingOptions(prev => ({ ...prev, fonctionnaires: true }));
        try {
            const response = await axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true });
            const foncData = response.data.fonctionnaires || response.data || [];
            setFonctionnairesOptions(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` }))
                .sort((a, b) => a.label.localeCompare(b.label)));
        } catch (err) {
            setError("Erreur chargement de la liste des fonctionnaires.");
        } finally {
            setLoadingOptions(prev => ({ ...prev, fonctionnaires: false }));
        }
    }, [baseApiUrl]);

    useEffect(() => {
        fetchFonctionnaires();
    }, [fetchFonctionnaires]);

    useEffect(() => {
        let isMounted = true;
        if (isEditMode && !loadingOptions.fonctionnaires) {
            setLoadingData(true);
            axios.get(`${baseApiUrl}/appel-offres/${itemId}`, { withCredentials: true })
                .then(response => {
                    if (!isMounted) return;
                    const itemData = response.data?.appel_offre || response.data || {};
                    
                    const matchedProvinces = Array.isArray(itemData.provinces)
                        ? itemData.provinces.map(p => PROVINCE_OPTIONS.find(opt => opt.value === p)).filter(Boolean)
                        : [];
                    setSelectedProvinceOptions(matchedProvinces);

                    const matchedFonctionnaires = findMultiOptions(fonctionnairesOptions, itemData.id_fonctionnaire, ';');
                    
                    setFormData({
                        categorie: itemData.categorie || '',
                        provinces: itemData.provinces || null,
                        numero: itemData.numero || '',
                        intitule: itemData.intitule || '',
                        estimation: itemData.estimation ?? '',
                        estimation_HT: itemData.estimation_HT ?? '',
                        montant_TVA: itemData.montant_TVA ?? '',
                        duree_execution: itemData.duree_execution ?? '',
                        date_verification: itemData.date_verification?.split(' ')[0] ?? '',
                        date_ouverture: itemData.date_ouverture?.split(' ')[0] ?? '',
                        last_session_op: itemData.last_session_op?.split(' ')[0] ?? '',
                        date_publication: itemData.date_publication?.split(' ')[0] ?? '',
                        lancement_portail: !!itemData.lancement_portail,
                        date_lancement_portail: itemData.date_lancement_portail?.split(' ')[0] ?? '',
                        fonctionnaires: matchedFonctionnaires,
                    });
                    
                    // Populate existing files
                    setExistingFiles(itemData.fichiers || []);
                    setFilesToDelete([]); // Reset on load
                })
                .catch(err => {
                    if (!isMounted) return;
                    setError(err.response?.data?.message || "Erreur de chargement des données.");
                    setFormData(initialFormData);
                    setExistingFiles([]);
                })
                .finally(() => {
                    if (isMounted) setLoadingData(false);
                });
        } else if (!isEditMode) {
            setFormData(initialFormData);
            setSelectedProvinceOptions([]);
            setExistingFiles([]);
            setNewFiles([]);
            setFilesToDelete([]);
            setLoadingData(false);
        }
        return () => { isMounted = false; };
    }, [itemId, isEditMode, baseApiUrl, fonctionnairesOptions, loadingOptions.fonctionnaires]);


    // --- Handlers ---
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setFormData(prev => ({ ...prev, [name]: val }));
        if (validationErrors[name]) {
            setValidationErrors(prev => { const next = {...prev}; delete next[name]; return next; });
        }
    };

    const handleProvinceMultiSelectChange = (options) => {
        setSelectedProvinceOptions(options || []);
        setFormData(prev => ({ ...prev, provinces: options ? options.map(o => o.value) : null }));
        if (validationErrors.provinces) {
            setValidationErrors(prev => { const next = {...prev}; delete next.provinces; return next; });
        }
    };

    const handleFonctionnaireChange = useCallback((options) => {
        setFormData(prev => ({ ...prev, fonctionnaires: options || [] }));
        if (validationErrors.id_fonctionnaire) {
            setValidationErrors(prev => { const next = {...prev}; delete next.id_fonctionnaire; return next; });
        }
    }, [validationErrors.id_fonctionnaire]);
    
    // --- File Handlers ---
    const handleFileChange = (e) => {
        // This is a simplified version compared to Marche. No metadata modal on add.
        const filesToUpload = Array.from(e.target.files).map(file => ({
            file: file,
            // Set initial metadata
            intitule: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
            categorie: FICHIER_CATEGORIES.find(c => c.value === 'autre') // Default category object
        }));
        setNewFiles(prev => [...prev, ...filesToUpload]);
        e.target.value = null; // Allow re-selecting the same file
    };

    const removeNewFile = (index) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingFile = (fileId) => {
        if (!window.confirm("Supprimer ce fichier ? Il sera effacé lors de la sauvegarde.")) return;
        setExistingFiles(prev => prev.filter(f => f.id !== fileId));
        setFilesToDelete(prev => [...prev, fileId]);
    };
    const openFileEditModal = (fileData, index, isExisting) => {
        setEditingFile({
            isExisting,
            data: {
                ...fileData,
                // Ensure the category is an object for react-select
                categorie: isExisting
                    ? FICHIER_CATEGORIES.find(c => c.value === fileData.categorie) || FICHIER_CATEGORIES.find(c => c.value === 'autre')
                    : fileData.categorie,
            },
            location: { index }
        });
    };

    // Updates the state of the file being edited in the modal
    const handleEditingFileChange = (field, value) => {
        setEditingFile(prev => ({
            ...prev,
            data: { ...prev.data, [field]: value }
        }));
    };

    // Handles saving the changes from the modal
    const handleSaveFileMetadata = async () => {
        if (!editingFile) return;

        const { index } = editingFile.location;
        const updatedFileData = editingFile.data;

        if (editingFile.isExisting) {
            // Logic for EXISTING files: make an API call to update
            const url = `${baseApiUrl}/fichiers-joints/${updatedFileData.id}`;
            const payload = {
                intitule: updatedFileData.intitule,
                categorie: updatedFileData.categorie.value
            };

            try {
                const response = await axios.put(url, payload, { withCredentials: true });
                const updatedFileFromServer = response.data.fichier_joint;
                
                // Update the `existingFiles` state with the fresh data
                setExistingFiles(prev => {
                    const updatedFiles = [...prev];
                    updatedFiles[index] = updatedFileFromServer;
                    return updatedFiles;
                });
            } catch (error) {
                console.error("Error updating file metadata:", error);
                alert("Une erreur est survenue lors de la mise à jour du fichier.");
            }
        } else {
            // Logic for NEW files: just update local state
            setNewFiles(prev => {
                const updatedFiles = [...prev];
                updatedFiles[index] = updatedFileData;
                return updatedFiles;
            });
        }

        setEditingFile(null); // Close the modal
    };

    const mapServerErrors = useCallback((serverErrors) => {
        const formErrors = {};
        if (!serverErrors || typeof serverErrors !== 'object') return formErrors;
        for (const key in serverErrors) {
            formErrors[key] = serverErrors[key]?.[0] || "Erreur inconnue";
        }
        return formErrors;
     }, []);

    // --- Form Submission ---
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setValidationErrors({});

        const submissionPayload = new FormData();

        // 1. Append regular form data
        const fonctionnaireIdsString = formData.fonctionnaires.map(f => f.value).join(';');
        const dataToAppend = {
            ...formData,
            provinces: null, // handle array separately
            fonctionnaires: null, // handle object array separately
            id_fonctionnaire: fonctionnaireIdsString || ''
        };

        Object.entries(dataToAppend).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                submissionPayload.append(key, typeof value === 'boolean' ? (value ? 1 : 0) : value);
            }
        });

        // Handle provinces array
        (formData.provinces || []).forEach(p => submissionPayload.append('provinces[]', p));

        // 2. Append file data
        newFiles.forEach((fileWrapper, index) => {
            submissionPayload.append('files[]', fileWrapper.file);
            submissionPayload.append(`intitule_file[${index}]`, fileWrapper.intitule);
            submissionPayload.append(`categorie_file[${index}]`, fileWrapper.categorie.value);
        });
        
        // 3. Append data for edit mode
        if (isEditMode) {
            submissionPayload.append('fichiers_a_supprimer', JSON.stringify(filesToDelete));
            submissionPayload.append('_method', 'PUT'); // CORRECTED: Use 'PUT' for updates
        }
        
        const url = isEditMode ? `${baseApiUrl}/appel-offres/${itemId}` : `${baseApiUrl}/appel-offres`;
        
        try {
            const response = await axios.post(url, submissionPayload, { 
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true 
            });
            const returnedData = response.data.appel_offre || response.data;
            if (isEditMode) onItemUpdated(returnedData);
            else onItemCreated(returnedData);
            onClose();
        } catch (err) {
            const message = err.response?.data?.message || "Erreur de soumission.";
            if (err.response?.status === 422) {
                setValidationErrors(mapServerErrors(err.response.data.errors || {}));
                setError("Veuillez corriger les erreurs.");
            } else {
                setError(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, newFiles, filesToDelete, isEditMode, baseApiUrl, itemId, onItemUpdated, onItemCreated, onClose, mapServerErrors]);

    // --- Render Logic ---
    const isOverallLoading = loadingOptions.fonctionnaires || loadingData || isSubmitting;
    const inputClass = 'shadow-sm rounded-pill bg-light form-control';
    const inputGroupTextClass = 'rounded-pill bg-light';
    const selectClass = 'shadow-sm rounded-pill bg-light form-select';
    const textareaClass = 'shadow-sm rounded-3 bg-light form-control';

    if (isEditMode && loadingData) return <div className="text-center p-5"><Spinner animation="border" /> Chargement...</div>;
    if (!isEditMode && loadingOptions.fonctionnaires) return <div className="text-center p-5"><Spinner animation="border" /> Chargement...</div>;

    return (
        <Form onSubmit={handleSubmit} noValidate className='px-md-4 py-4 px-2' style={{ maxHeight: 'calc(90vh - 100px)', overflowY: 'auto', backgroundColor: '#fff', borderRadius: '15px' }}>
            {error && !Object.keys(validationErrors).length && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
            {Object.keys(validationErrors).length > 0 && <Alert variant="warning" className="small py-2">Veuillez corriger les erreurs.</Alert>}

            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditMode ? 'Modifier' : 'Nouvel'}</h5>
                    <h2 className="mb-0 fw-bold">Appel d'Offre {isEditMode ? `(${formData.numero || '...'})` : ''}</h2>
                </div>
                <Button variant="warning" className={FORM_HEADER_CLOSE_BUTTON_CLASS} onClick={onClose} size="sm">Revenir à la liste</Button>

            </div>

            <h5 className="mb-3 mt-2 text-primary">Détails de l'Appel d'Offre</h5>
             <Row className="g-3">
                 <Form.Group as={Col} md="6" className="mb-3">
                    <Form.Label htmlFor="numero">Numéro AO <span className="text-danger">*</span></Form.Label>
                    <Form.Control id="numero" className={inputClass} type="text" name="numero" value={formData.numero} onChange={handleChange} isInvalid={!!validationErrors.numero} required/>
                    <Form.Control.Feedback type="invalid">{validationErrors.numero}</Form.Control.Feedback>
                </Form.Group>
                {/* Catégorie */}
                <Form.Group as={Col} md="6" className="mb-3">
                    <Form.Label htmlFor="categorie">Catégorie <span className="text-danger">*</span></Form.Label>
                    <Form.Select id="categorie" className={selectClass} name="categorie" value={formData.categorie} onChange={handleChange} isInvalid={!!validationErrors.categorie} required>
                        <option value="" disabled>-- Sélectionner --</option>
                        {CATEGORIE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{validationErrors.categorie}</Form.Control.Feedback>
                </Form.Group>
            </Row>

            {/* Intitule */}
            <Form.Group className="mb-3">
               <Form.Label htmlFor="intitule">Intitulé <span className="text-danger">*</span></Form.Label>
               <Form.Control id="intitule" className={textareaClass} as="textarea" rows={2} name="intitule" value={formData.intitule} onChange={handleChange} isInvalid={!!validationErrors.intitule} required/>
               <Form.Control.Feedback type="invalid">{validationErrors.intitule}</Form.Control.Feedback>
           </Form.Group>

            {/* Province Multi-Select */}
            <Form.Group className="mb-3">
                 <Form.Label htmlFor="provinces_select">Province(s) Affectée(s)</Form.Label>
                 <Select
                     inputId="provinces_select" isMulti name="provinces_select" options={PROVINCE_OPTIONS}
                     value={selectedProvinceOptions} onChange={handleProvinceMultiSelectChange}
                     placeholder={"Sélectionner Province(s) (Optionnel)..."}
                     isClearable closeMenuOnSelect={false} noOptionsMessage={() => 'Aucune province définie'}
                     styles={getReactSelectStyles(!!validationErrors.provinces || !!validationErrors['provinces.*'])}
                     className={(validationErrors.provinces || validationErrors['provinces.*']) ? 'is-invalid' : ''}
                     menuPortalTarget={document.body}
                 />
                 {(validationErrors.provinces || validationErrors['provinces.*']) &&
                    <div className="invalid-feedback d-block ps-2 small mt-1"> {validationErrors.provinces || validationErrors['provinces.*']} </div>
                 }
            </Form.Group>

            {/* Fonctionnaire Multi-Select */}
            <Form.Group className="mb-3">
                 <Form.Label htmlFor="fonctionnaires_select">
                     <FontAwesomeIcon icon={faUsers} className="me-2" /> Points Focaux Affecté(s)
                 </Form.Label>
                 <Select
                     inputId="fonctionnaires_select" isMulti name="fonctionnaires_select"
                     options={fonctionnairesOptions} value={formData.fonctionnaires}
                     onChange={handleFonctionnaireChange}
                     placeholder={loadingOptions.fonctionnaires ? "Chargement..." : "Sélectionner Fonctionnaire(s) (Optionnel)..."}
                     isClearable closeMenuOnSelect={false} noOptionsMessage={() => 'Aucun fonctionnaire trouvé'}
                     isLoading={loadingOptions.fonctionnaires} isDisabled={loadingOptions.fonctionnaires}
                     styles={getReactSelectStyles(!!validationErrors.id_fonctionnaire)}
                     className={validationErrors.id_fonctionnaire ? 'is-invalid' : ''}
                     menuPortalTarget={document.body}
                 />
                 {validationErrors.id_fonctionnaire &&
                    <div className="invalid-feedback d-block ps-2 small mt-1">{validationErrors.id_fonctionnaire}</div>
                 }
            </Form.Group>
            <h5 className="mb-3 mt-4 pt-3 border-top text-primary">Informations Financières et Délais</h5>
            {/* --- Estimations Section --- */}
            <Row className="g-3">
                <Form.Group as={Col} md="4" className="mb-3">
                    <Form.Label htmlFor="estimation_HT">Estimation HT <span className="text-danger">*</span></Form.Label>
                     <InputGroup>
                        <Form.Control id="estimation_HT" className={inputClass + ' ps-3 border-end-0'} type="number" step="0.01" name="estimation_HT" value={formData.estimation_HT} onChange={handleChange} isInvalid={!!validationErrors.estimation_HT} placeholder="0.00" required/>
                        <InputGroup.Text className={inputGroupTextClass + ' border-start-0'}>MAD</InputGroup.Text>
                        <Form.Control.Feedback type="invalid">{validationErrors.estimation_HT}</Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
                <Form.Group as={Col} md="4" className="mb-3">
                    <Form.Label htmlFor="montant_TVA">Montant TVA <span className="text-danger">*</span></Form.Label>
                     <InputGroup>
                        <Form.Control id="montant_TVA" className={inputClass + ' ps-3 border-end-0'} type="number" step="0.01" name="montant_TVA" value={formData.montant_TVA} onChange={handleChange} isInvalid={!!validationErrors.montant_TVA} placeholder="0.00" required/>
                        <InputGroup.Text className={inputGroupTextClass + ' border-start-0'}>MAD</InputGroup.Text>
                        <Form.Control.Feedback type="invalid">{validationErrors.montant_TVA}</Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
                <Form.Group as={Col} md="4" className="mb-3">
                    <Form.Label htmlFor="estimation">Estimation TTC</Form.Label>
                    <InputGroup>
                        <Form.Control id="estimation" className={inputClass + ' ps-3 border-end-0'} type="number" step="0.01" name="estimation" value={formData.estimation} onChange={handleChange} isInvalid={!!validationErrors.estimation} placeholder="Optionnel"/>
                        <InputGroup.Text className={inputGroupTextClass + ' border-start-0'}>MAD</InputGroup.Text>
                        <Form.Control.Feedback type="invalid">{validationErrors.estimation}</Form.Control.Feedback>
                    </InputGroup>
                </Form.Group>
            </Row>

            {/* --- Duration & Dates Section --- */}
            <Row className="g-3">
                <Form.Group as={Col} md="6" lg="3" className="mb-3">
                    <Form.Label htmlFor="duree_execution">Durée Exécution (jours)</Form.Label>
                    <Form.Control id="duree_execution" className={inputClass} type="number" step="1" min="0" name="duree_execution" value={formData.duree_execution} onChange={handleChange} isInvalid={!!validationErrors.duree_execution} placeholder="Optionnel"/>
                    <Form.Control.Feedback type="invalid">{validationErrors.duree_execution}</Form.Control.Feedback>
                </Form.Group>
                 <Form.Group as={Col} md="6" lg="3" className="mb-3">
                    <Form.Label htmlFor="date_verification">Date Vérification</Form.Label>
                    <Form.Control id="date_verification" className={inputClass} type="date" name="date_verification" value={formData.date_verification} onChange={handleChange} isInvalid={!!validationErrors.date_verification} />
                    <Form.Control.Feedback type="invalid">{validationErrors.date_verification}</Form.Control.Feedback>
                 </Form.Group>
                 <Form.Group as={Col} md="6" lg="3" className="mb-3">
                    <Form.Label htmlFor="date_ouverture">Date Ouverture Plis</Form.Label>
                    <Form.Control id="date_ouverture" className={inputClass} type="date" name="date_ouverture" value={formData.date_ouverture} onChange={handleChange} isInvalid={!!validationErrors.date_ouverture} />
                    <Form.Control.Feedback type="invalid">{validationErrors.date_ouverture}</Form.Control.Feedback>
                 </Form.Group>
                 <Form.Group as={Col} md="6" lg="3" className="mb-3">
                     <Form.Label htmlFor="last_session_op">Dernière Session OP</Form.Label>
                     <Form.Control id="last_session_op" className={inputClass} type="date" name="last_session_op" value={formData.last_session_op} onChange={handleChange} isInvalid={!!validationErrors.last_session_op} />
                     <Form.Control.Feedback type="invalid">{validationErrors.last_session_op}</Form.Control.Feedback>
                 </Form.Group>
            </Row>

            {/* --- Publication Section --- */}
            <h5 className="mb-3 mt-4 pt-3 border-top text-primary">Publication</h5>
             <Row className="g-3 align-items-center">
                <Form.Group as={Col} md="4" className="mb-3">
                    <Form.Label htmlFor="date_publication">Date Publication</Form.Label>
                    <Form.Control
                        id="date_publication" className={inputClass} type="date"
                        name="date_publication" value={formData.date_publication}
                        onChange={handleChange} isInvalid={!!validationErrors.date_publication}
                     />
                    <Form.Control.Feedback type="invalid">{validationErrors.date_publication}</Form.Control.Feedback>
                </Form.Group>

                <Form.Group as={Col} md={4} className="mb-3 d-flex align-items-end pb-1 pt-4">
                     <Form.Check
                         type="switch"
                         id="lancement_portail"
                         label="Publié sur Portail Achats"
                         name="lancement_portail"
                         checked={formData.lancement_portail}
                         onChange={handleChange}
                         isInvalid={!!validationErrors.lancement_portail}
                         className="mb-0"
                     />
                 </Form.Group>

                {/* Conditionally render Date Lancement Portail field */}
                {formData.lancement_portail && (
                    <Form.Group as={Col} md="4" className="mb-3">
                        <Form.Label htmlFor="date_lancement_portail">Date Lancement Portail <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                            id="date_lancement_portail" className={inputClass} type="date"
                            name="date_lancement_portail" value={formData.date_lancement_portail}
                            onChange={handleChange} isInvalid={!!validationErrors.date_lancement_portail}
                            required={formData.lancement_portail}
                         />
                        <Form.Control.Feedback type="invalid">{validationErrors.date_lancement_portail}</Form.Control.Feedback>
                    </Form.Group>
                )}
            </Row>
            {/* --- File Management Section --- */}
            <h5 className="mt-4 mb-3 text-primary">Pièces Jointes</h5>
            <Card className="mb-3">
                <Card.Body>
                    {isEditMode && existingFiles.length > 0 && (
                        <>
                            <h5>Fichiers Actuels</h5>
                            <Stack direction="horizontal" gap={2} className="flex-wrap mb-3">
                                {existingFiles.map((file, index) => (
                                    <Badge
                                        key={file.id}
                                        as={Button}
                                        bg="info"
                                        text="dark"
                                        pill
                                        className="d-flex align-items-center p-2 fw-normal"
                                        onClick={() => openFileEditModal(file, index, true)}
                                        title={`Modifier: ${file.intitule || file.nom_fichier}`}
                                    >
                                        <FontAwesomeIcon icon={faPaperclip} className="me-2"/>
                                        <span className="text-truncate" style={{maxWidth: '150px'}}>{file.intitule || file.nom_fichier}</span>
                                        <Button
                                            variant="close"
                                            size="sm"
                                            className="p-0 ms-2"
                                            style={{fontSize: '0.6em'}}
                                            onClick={(e) => { e.stopPropagation(); removeExistingFile(file.id); }}
                                        />
                                    </Badge>
                                ))}
                            </Stack>
                        </>
                    )}

                    {newFiles.length > 0 && (
                        <>
                            <h5 className={isEditMode && existingFiles.length > 0 ? 'mt-3' : ''}>Nouveaux Fichiers</h5>
                            <Stack direction="horizontal" gap={2} className="flex-wrap">
                                {newFiles.map((fileWrapper, index) => (
                                    <Badge
                                        key={index}
                                        as={Button}
                                        bg="success"
                                        pill
                                        className="d-flex align-items-center p-2 fw-normal"
                                        onClick={() => openFileEditModal(fileWrapper, index, false)}
                                        title={`Modifier: ${fileWrapper.intitule || fileWrapper.file.name}`}
                                    >
                                        <FontAwesomeIcon icon={faPaperclip} className="me-2"/>
                                        <span className="text-truncate" style={{maxWidth: '150px'}}>{fileWrapper.intitule || fileWrapper.file.name}</span>
                                        <Button
                                            variant="close"
                                            size="sm"
                                            className="p-0 ms-2 btn-close-white"
                                            style={{fontSize: '0.8em', filter: 'invert(1) grayscale(100%) brightness(200%)'}}
                                            onClick={(e) => { e.stopPropagation(); removeNewFile(index); }}
                                        />
                                    </Badge>
                                ))}
                            </Stack>
                        </>
                    )}
                    
                    {(existingFiles.length === 0 && newFiles.length === 0) && (
                        <p className="text-muted small fst-italic">Aucun fichier joint.</p>
                    )}

                    <Form.Group className="mt-3">
                        <Form.Control type="file" multiple onChange={handleFileChange} id="appel-offre-file-input" style={{ display: 'none' }} disabled={isOverallLoading} />
                        <Button variant="outline-primary" size="sm" onClick={() => document.getElementById('appel-offre-file-input').click()} disabled={isOverallLoading}>
                            <FontAwesomeIcon icon={faPlus} className="me-2"/> Ajouter des fichiers
                        </Button>
                    </Form.Group>
                </Card.Body>
            </Card>
            {/* --- Submit/Cancel Buttons --- */}
            <div className="text-center mt-4 pt-3 border-top">
                <Button variant="danger" onClick={onClose} className="me-3 rounded-pill px-5" disabled={isOverallLoading}>
                    Annuler
                </Button>
                <Button variant="primary" type="submit" className="rounded-pill px-5" disabled={isOverallLoading}>
                    {isSubmitting ? <Spinner as="span" animation="border" size="sm" className="me-2"/> : null}
                    {isSubmitting ? 'Enregistrement...' : (isEditMode ? 'Enregistrer Modifications' : 'Créer Appel d\'Offre')}
                </Button>
            </div>
            {editingFile && (
                <Modal show={!!editingFile} onHide={() => setEditingFile(null)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Modifier les informations du fichier</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p className="text-muted small text-truncate">
                            Fichier: {editingFile.data.nom_fichier || editingFile.data.file?.name}
                        </p>
                        <Form.Group className="mb-3">
                            <Form.Label>Intitulé</Form.Label>
                            <Form.Control
                                type="text"
                                value={editingFile.data.intitule || ''}
                                onChange={(e) => handleEditingFileChange('intitule', e.target.value)}
                            />
                        </Form.Group>
                        <Form.Group>
                            <Form.Label>Catégorie</Form.Label>
                            <Select
                                options={FICHIER_CATEGORIES}
                                value={editingFile.data.categorie}
                                onChange={(opt) => handleEditingFileChange('categorie', opt)}
                                styles={getReactSelectStyles(false)}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setEditingFile(null)}>Annuler</Button>
                        <Button variant="primary" onClick={handleSaveFileMetadata}>Enregistrer</Button>
                    </Modal.Footer>
                </Modal>
            )}
        </Form>
    );
};

// --- PropTypes and DefaultProps ---
AppelOffreForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string.isRequired,
};

AppelOffreForm.defaultProps = {
    itemId: null,
    onItemCreated: (item) => console.log("Created:", item),
    onItemUpdated: (item) => console.log("Updated:", item),
};

export default AppelOffreForm;