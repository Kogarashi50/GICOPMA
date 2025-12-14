// src/gestion_conventions/ordres_service_views/OrdreServiceForm.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
// MERGED IMPORTS: Includes Modal from the multi-file version
import { Form, Button, Row, Col, Spinner, Alert, Badge, Stack, Modal } from 'react-bootstrap';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faTrashAlt, faUpload, faFileContract, faEye, faUserTie, faTimes } from '@fortawesome/free-solid-svg-icons';

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

// --- Constants ---
const TYPE_OPTIONS = [
    { value: 'commencement', label: 'Ordre de Commencement' },
    { value: 'arret', label: 'Ordre d\'Arrêt' },
    { value: 'reprise', label: 'Ordre de Service de Reprise' }
];

// --- Helper Functions (from the more robust version) ---
const findMultiOptions = (options, valuesString, separator = ';') => {
    if (!valuesString || typeof valuesString !== 'string' || !Array.isArray(options) || options.length === 0) return [];
    const selectedValues = valuesString.split(separator)
        .map(v => String(v).trim().toLowerCase())
        .filter(v => v);
    return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase()));
};

// --- Custom Styles for React-Select (from the more robust version) ---
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


const OrdreServiceForm = ({ itemId, onClose, onItemCreated, onItemUpdated, baseApiUrl }) => {
    const isEditMode = !!itemId;

    const initialFormData = useMemo(() => ({
        marche_id: null, type: null, id_fonctionnaire: [], numero: '', date_emission: '', description: '',
    }), []);

    const [formData, setFormData] = useState(initialFormData);
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});

    // --- MERGED STATE: Using state for multiple files ---
    const [newFiles, setNewFiles] = useState([]); // Array of { file: File, intitule: string }
    const [existingFiles, setExistingFiles] = useState([]); // Array of file objects from server
    const [filesToDelete, setFilesToDelete] = useState([]); // Array of file IDs to delete
    const [editingFile, setEditingFile] = useState(null); // State for the edit modal

    // --- State and fetching for options (from the more robust version) ---
    const [marcheOptions, setMarcheOptions] = useState([]);
    const [loadingMarcheOptions, setLoadingMarcheOptions] = useState(true);
    const [fonctionnaireOptions, setFonctionnaireOptions] = useState([]);
    const [loadingFonctionnaireOptions, setLoadingFonctionnaireOptions] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoadingMarcheOptions(true);
        axios.get(`${baseApiUrl}/marches-publics?fields=id,numero_marche,intitule`, { withCredentials: true })
            .then(response => {
                if (!isMounted) return;
                const marcheList = response.data?.marches_publics || response.data?.data || response.data || [];
                const options = marcheList.map(m => ({ value: m.id, label: `${m.numero_marche} - ${m.intitule}` })).filter(Boolean);
                setMarcheOptions(options);
            })
            .catch(err => { if (isMounted) console.error("Error fetching Marche options:", err); })
            .finally(() => { if (isMounted) setLoadingMarcheOptions(false); });
        return () => { isMounted = false; };
    }, [baseApiUrl]);

    useEffect(() => {
        let isMounted = true;
        setLoadingFonctionnaireOptions(true);
        axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true })
            .then(response => {
                if (!isMounted) return;
                const foncData = response.data?.fonctionnaires || [];
                const options = foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` })).filter(Boolean);
                setFonctionnaireOptions(options);
            })
            .catch(err => { if (isMounted) console.error("Error fetching Fonctionnaire options:", err); })
            .finally(() => { if (isMounted) setLoadingFonctionnaireOptions(false); });
        return () => { isMounted = false; };
    }, [baseApiUrl]);

    const allOptionsLoaded = useMemo(() => !loadingMarcheOptions && !loadingFonctionnaireOptions, [loadingMarcheOptions, loadingFonctionnaireOptions]);

    // --- MERGED useEffect for Edit Mode: Fetches data and handles the `fichiers` array ---
    useEffect(() => {
        let isMounted = true;
        if (isEditMode && itemId && allOptionsLoaded) {
            setIsLoading(true); setError(null); setValidationErrors({});
            setNewFiles([]); setExistingFiles([]); setFilesToDelete([]);

            axios.get(`${baseApiUrl}/ordres-service/${itemId}`, { withCredentials: true })
                .then(response => {
                    if (!isMounted) return;
                    const itemData = response.data?.ordre_service || response.data;
                    
                    const selectedMarcheOption = marcheOptions.find(opt => String(opt.value) === String(itemData.marche_id)) || null;
                    const selectedFonctionnaireOptions = findMultiOptions(fonctionnaireOptions, itemData.id_fonctionnaire, ';');

                    setFormData({
                        marche_id: selectedMarcheOption,
                        type: TYPE_OPTIONS.find(opt => opt.value === itemData.type) || null,
                        id_fonctionnaire: selectedFonctionnaireOptions,
                        numero: itemData.numero || '',
                        date_emission: itemData.date_emission ? itemData.date_emission.split(' ')[0] : '',
                        description: itemData.description || '',
                    });
                    
                    // Set the array of existing files
                    setExistingFiles(itemData.fichiers || []);
                })
                .catch(err => { if (isMounted) { setError("Erreur de chargement de l'ordre de service."); console.error(err); }})
                .finally(() => { if (isMounted) setIsLoading(false); });
        } else if (!isEditMode) {
            setFormData(initialFormData);
            setNewFiles([]); setExistingFiles([]); setFilesToDelete([]);
            setIsLoading(false);
        }
        return () => { isMounted = false; };
    }, [itemId, isEditMode, baseApiUrl, allOptionsLoaded, marcheOptions, fonctionnaireOptions, initialFormData]);

    // --- Basic handlers (from robust version) ---
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name]) { setValidationErrors(prev => { const next = { ...prev }; delete next[name]; return next; });}
    }, [validationErrors]);

    const handleSelectChange = useCallback((selectedOptionOrOptions, actionMeta) => {
        const { name } = actionMeta;
        setFormData(prev => ({ ...prev, [name]: selectedOptionOrOptions }));
        if (validationErrors[name]) { setValidationErrors(prev => { const next = { ...prev }; delete next[name]; return next; });}
    }, [validationErrors]);

    // --- MERGED File Handlers for multiple files and metadata editing ---
    const handleFileChange = useCallback((e) => {
        const filesToAdd = Array.from(e.target.files).map(file => ({
            file,
            intitule: file.name.replace(/\.[^/.]+$/, "") // Set default intitule
        }));
        setNewFiles(prev => [...prev, ...filesToAdd]);
        e.target.value = null; // Allow re-selecting the same file
    }, []);

    const removeNewFile = useCallback((indexToRemove) => {
        setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    }, []);

    const markExistingFileForDeletion = useCallback((fileId) => {
        if (!window.confirm("Supprimer ce fichier joint existant lors de la sauvegarde ?\nCette action est permanente.")) return;
        setExistingFiles(prev => prev.filter(f => f.id !== fileId));
        setFilesToDelete(prev => [...prev, fileId]);
    }, []);

    // Handlers for the editing modal
    const openFileEditModal = (fileData, index, isExisting) => {
        setEditingFile({
            isExisting,
            data: { ...fileData }, // Create a copy to edit
            location: { index }
        });
    };

    const handleEditingFileChange = (field, value) => {
        setEditingFile(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
    };

    const handleSaveFileMetadata = () => {
        if (!editingFile) return;
        const { index } = editingFile.location;
        const updatedFileData = editingFile.data;
    
        if (editingFile.isExisting) {
            // Update local state for existing files
            setExistingFiles(prev => prev.map((file, i) => i === index ? updatedFileData : file));
        } else {
            // Update local state for new files, preserving the File object
            setNewFiles(prev => prev.map((fileWrapper, i) => 
                i === index ? { ...fileWrapper, intitule: updatedFileData.intitule } : fileWrapper
            ));
        }
        setEditingFile(null); // Close modal
    };
    
    const mapServerErrors = useCallback((serverErrors) => {
        const formErrors = {};
        if (!serverErrors || typeof serverErrors !== 'object') return formErrors;
        for (const key in serverErrors) {
            const simpleKey = key.includes('.') ? key.split('.')[0] : key;
            formErrors[simpleKey] = Array.isArray(serverErrors[key]) ? serverErrors[key] : [serverErrors[key]];
        }
        return formErrors;
    }, []);

    // --- MERGED handleSubmit for multi-file upload ---
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
        submissionPayload.append('id_fonctionnaire', (formData.id_fonctionnaire || []).map(opt => opt.value).join(';'));

        // Append new files and their metadata
        newFiles.forEach((fileWrapper) => {
            submissionPayload.append('files[]', fileWrapper.file);
            submissionPayload.append('intitules[]', fileWrapper.intitule);
        });

        if (isEditMode) {
            submissionPayload.append('fichiers_a_supprimer', JSON.stringify(filesToDelete));
             // For existing files, you might need to send updates if their metadata changed
            const updatedExistingFiles = existingFiles.map(f => ({ id: f.id, intitule: f.intitule }));
            submissionPayload.append('fichiers_existants_meta', JSON.stringify(updatedExistingFiles));
            submissionPayload.append('_method', 'PUT');
        }

        const url = isEditMode ? `${baseApiUrl}/ordres-service/${itemId}` : `${baseApiUrl}/ordres-service`;
try {
    const response = await axios.post(url, submissionPayload, { 
        withCredentials: true 
    });

    const responseData = response.data.ordre_service || response.data;
    if (isEditMode) onItemUpdated(responseData); else onItemCreated(responseData);
    onClose();
        } catch (err) {
            const message = err.response?.data?.message || "Erreur de soumission.";
            if (err.response?.status === 422) {
                setValidationErrors(mapServerErrors(err.response.data.errors || {}));
                setError("Veuillez corriger les erreurs.");
            } else { setError(message); }
        } finally { setIsSubmitting(false); }
    }, [formData, newFiles, existingFiles, filesToDelete, isEditMode, itemId, baseApiUrl, onItemUpdated, onItemCreated, onClose, mapServerErrors]);
    
    const showOverallLoading = loadingMarcheOptions || loadingFonctionnaireOptions || (isEditMode && isLoading);

    if (showOverallLoading) {
        return <div className="text-center p-5"><Spinner animation="border" /> Chargement du formulaire...</div>;
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
                    {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
                    
                    {/* --- Form Fields (from robust version) --- */}
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="marche_id_select_osf" className="w-100">{bilingualLabel("Marché Public Associé", "السوق العام المرتبط", true)}</Form.Label>
                        <Select inputId="marche_id_select_osf" name="marche_id" options={marcheOptions} value={formData.marche_id} onChange={(opt) => handleSelectChange(opt, {name: 'marche_id'})} placeholder="Sélectionner un marché..." isDisabled={isSubmitting || loadingMarcheOptions} styles={customSelectStyles(!!validationErrors.marche_id)} menuPortalTarget={document.body} />
                        {validationErrors.marche_id && <div className="d-block invalid-feedback ps-2 small mt-1">{validationErrors.marche_id[0]}</div>}
                    </Form.Group>
                    <Row>
                        <Form.Group as={Col} md="6" className="mb-3">
                            <Form.Label htmlFor="type_ordre_select_osf" className="w-100">{bilingualLabel("Type", "النوع", true)}</Form.Label>
                            <Select inputId="type_ordre_select_osf" name="type" options={TYPE_OPTIONS} value={formData.type} onChange={(opt) => handleSelectChange(opt, {name: 'type'})} placeholder="Sélectionner type..." isDisabled={isSubmitting} styles={customSelectStyles(!!validationErrors.type)} menuPortalTarget={document.body} />
                            {validationErrors.type && <div className="d-block invalid-feedback ps-2 small mt-1">{validationErrors.type[0]}</div>}
                        </Form.Group>
                        <Form.Group as={Col} md="6" className="mb-3">
                            <Form.Label htmlFor="numero_ordre_osf" className="w-100">{bilingualLabel("Numéro/Référence", "الرقم/المرجع", true)}</Form.Label>
                            <Form.Control id="numero_ordre_osf" type="text" name="numero" value={formData.numero} onChange={handleChange} isInvalid={!!validationErrors.numero} required disabled={isSubmitting} className='form-control-style shadow-sm form-control-rounded' />
                            <Form.Control.Feedback type="invalid">{validationErrors.numero?.[0]}</Form.Control.Feedback>
                        </Form.Group>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="date_emission_osf" className="w-100">{bilingualLabel("Date d'Émission", "تاريخ الإصدار", true)}</Form.Label>
                        <Form.Control id="date_emission_osf" type="date" name="date_emission" value={formData.date_emission} onChange={handleChange} isInvalid={!!validationErrors.date_emission} required disabled={isSubmitting} className='form-control-style shadow-sm form-control-rounded' />
                        <Form.Control.Feedback type="invalid">{validationErrors.date_emission?.[0]}</Form.Control.Feedback>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="fonctionnaire_select_osf_form" className="w-100"><FontAwesomeIcon icon={faUserTie} className="me-1" /> {bilingualLabel("Points Focaux", "النقاط المحورية")}</Form.Label>
                        <Select inputId="fonctionnaire_select_osf_form" name="id_fonctionnaire" options={fonctionnaireOptions} value={formData.id_fonctionnaire} onChange={(opts) => handleSelectChange(opts, {name: 'id_fonctionnaire'})} placeholder={loadingFonctionnaireOptions ? "Chargement..." : "Sélectionner (Optionnel)..."} isLoading={loadingFonctionnaireOptions} isDisabled={isSubmitting} isClearable isMulti closeMenuOnSelect={false} styles={customSelectStyles(!!validationErrors.id_fonctionnaire)} menuPortalTarget={document.body} />
                        {validationErrors.id_fonctionnaire && <div className="d-block invalid-feedback ps-2 small mt-1">{validationErrors.id_fonctionnaire[0]}</div>}
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label htmlFor="description_osf" className="w-100">{bilingualLabel("Description", "الوصف")}</Form.Label>
                        <Form.Control id="description_osf" as="textarea" rows={3} name="description" value={formData.description} onChange={handleChange} disabled={isSubmitting} className='form-control-style shadow-sm form-control-rounded' />
                    </Form.Group>

                    {/* --- MERGED File Upload JSX for multiple files --- */}
                    <Form.Group className="mb-3">
                        <Form.Label><FontAwesomeIcon icon={faPaperclip} className="me-1"/> Fichiers Joints</Form.Label>
                        <div className="border p-2 rounded bg-light form-control-style">
                            {/* Display Existing Files */}
                            {existingFiles.length > 0 && (
                                <Stack direction="horizontal" gap={2} className="flex-wrap mb-2">
                                    {existingFiles.map((file, index) => (
                                       <Badge as={Button} variant="info" key={file.id} pill bg="info" text="dark" className="d-flex align-items-center p-2 fw-normal" onClick={() => openFileEditModal(file, index, true)}>
                                           <span className='me-2 text-truncate' title={file.intitule}>{file.intitule || file.nom_fichier}</span>
                                           <Button variant="close" size="sm" onClick={(e) => { e.stopPropagation(); markExistingFileForDeletion(file.id); }} aria-label="Supprimer"/>
                                       </Badge>
                                    ))}
                                </Stack>
                            )}
                            {/* Display New Files */}
                            {newFiles.length > 0 && (
                                <Stack direction="horizontal" gap={2} className="flex-wrap">
                                    {newFiles.map((fw, index) => (
                                       <Badge as={Button} variant="success" key={index} pill bg="success" className="d-flex align-items-center p-2 fw-normal" onClick={() => openFileEditModal(fw, index, false)}>
                                           <span className='me-2 text-truncate' title={fw.intitule}>{fw.intitule}</span>
                                           <Button variant="close" className="btn-close-white" size="sm" onClick={(e) => { e.stopPropagation(); removeNewFile(index); }} aria-label="Retirer"/>
                                       </Badge>
                                    ))}
                                </Stack>
                            )}
                            {/* Add Files Button */}
                            <Form.Control id="os-file-input" type="file" multiple onChange={handleFileChange} className="d-none" disabled={isSubmitting} />
                            <Button variant="outline-primary" size="sm" className="rounded-5 mt-2" onClick={() => document.getElementById('os-file-input')?.click()} disabled={isSubmitting}>
                                <FontAwesomeIcon icon={faUpload} className="me-2"/> Ajouter des fichiers...
                            </Button>
                        </div>
                        <Form.Text>Formats autorisés: PDF, DOC(X), Images, ZIP, etc. (Max 20Mo)</Form.Text>
                        {validationErrors.files && <div className="d-block invalid-feedback mt-1">{validationErrors.files[0]}</div>}
                    </Form.Group>
                </div>
                
                <div className="text-center mt-4 pt-3 border-top">
                     <Button variant="danger" onClick={onClose} className="me-3 rounded-5 px-5" disabled={isSubmitting}>Annuler</Button>
                     <Button variant="primary" type="submit" disabled={isSubmitting || showOverallLoading} className="rounded-5 px-5">
                         {isSubmitting && <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1"/>}
                         {isSubmitting ? 'Sauvegarde...' : (isEditMode ? 'Enregistrer Modifications' : 'Créer Ordre')}
                     </Button>
                </div>
            </Form>

            {/* --- MERGED Editing Modal --- */}
            {editingFile && (
                <Modal show={!!editingFile} onHide={() => setEditingFile(null)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Modifier l'intitulé du fichier</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p className="text-muted small text-truncate">Fichier: {editingFile.data.nom_fichier || editingFile.data.file?.name}</p>
                        <Form.Group>
                            <Form.Label>Intitulé</Form.Label>
                            <Form.Control
                                type="text"
                                value={editingFile.data.intitule || ''}
                                onChange={(e) => handleEditingFileChange('intitule', e.target.value)}
                                autoFocus
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setEditingFile(null)}>Annuler</Button>
                        <Button variant="primary" onClick={handleSaveFileMetadata}>Enregistrer</Button>
                    </Modal.Footer>
                </Modal>
            )}
        </div>
     );
};

// --- PropTypes and defaultProps (from robust version) ---
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
};

export default OrdreServiceForm;