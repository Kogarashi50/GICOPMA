// src/gestion_contrats_cdc_views/ContratDroitCommunForm.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'; // Added useMemo
import PropTypes from 'prop-types';
import axios from 'axios';
import Select from 'react-select'; // <-- Import react-select
import { Form, Button, Row, Col, Spinner, Alert, Card, Stack, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faTrashAlt, faPaperclip, faTimes,
    faUsers, faUserTie // <-- Added icons for fonctionnaire
} from '@fortawesome/free-solid-svg-icons';

// --- Constants ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const STORAGE_URL = process.env.REACT_APP_STORAGE_URL || 'http://localhost:8000/public'; // Added storage URL

const TYPE_CONTRAT_OPTIONS = [
    { value: 'Maintenance', label: 'Maintenance' },
    { value: 'Prestation de service', label: 'Prestation de service' },
    { value: 'Location', label: 'Location' },
    { value: 'Fourniture', label: 'Fourniture' },
    { value: 'Autre', label: 'Autre' },
];

// --- Helper: Parse Multi-Select String ---
const findMultiOptions = (options, valuesString, separator = ';') => {
    if (!valuesString || typeof valuesString !== 'string' || !Array.isArray(options) || options.length === 0) return [];
    const selectedValues = valuesString.split(separator)
        .map(v => String(v).trim().toLowerCase())
        .filter(v => v);
    return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase()));
};
// --- End Helper ---

// --- react-select Styles (Using provided style object) ---
const selectStyles = {
    control: (provided, state) => ({ ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da', boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', }), valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden', }), input: (provided) => ({ ...provided, margin: '0px', padding: '0px', }), indicatorSeparator: () => ({ display: 'none', }), indicatorsContainer: (provided) => ({ ...provided, padding: '1px', }), placeholder: (provided) => ({ ...provided, color: '#6c757d', }), menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1050 }), menuPortal: base => ({ ...base, zIndex: 9999 }), option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', }),
    // Styles for multi-select tags
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px', }),
    multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', }),
    multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white', }, }),
};

// --- Original CSS Class Names ---
// These will be used for standard Bootstrap form elements
const inputClass = 'form-control-style shadow-sm form-control-rounded'; // Original base class
const selectClass = 'form-control-style shadow-sm form-control-rounded form-select'; // Original select class
const textareaClass = 'form-control-style shadow-sm form-control-rounded'; // Original textarea class
const buttonCloseClass = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm'; // Original close button class

// --- Form Component ---
const ContratDroitCommunForm = ({ itemId, onClose, onItemCreated, onItemUpdated, baseApiUrl = BASE_API_URL }) => {
    const isEditMode = useMemo(() => !!itemId, [itemId]);

    // --- Initial State ---
    const initialFormData = useMemo(() => ({
        numero_contrat: '',
        objet: '',
        fournisseur_nom: '',
        date_signature: '',
        montant_total: '',
        duree_contrat: '',
        type_contrat: '', // Store simple value for standard select
        mode_paiement: '',
        observations: '',
        fonctionnaires: [], // <-- ADDED: Array for multi-select state
        fichiers: [],
        existing_fichiers: [],
        fichiers_to_delete: []
    }), []);

    const [formData, setFormData] = useState(initialFormData);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]); // <-- ADDED
    const [loadingOptions, setLoadingOptions] = useState({ fonctionnaires: true }); // <-- ADDED
    const [isLoading, setIsLoading] = useState(isEditMode); // Loading form data state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const fileInputRef = useRef(null); // Keep ref for file input

    const apiPrefix = ''; // Adjust if necessary

    // --- Fetch Fonctionnaires List ---
    const fetchFonctionnaires = useCallback(async () => {
        setLoadingOptions(prev => ({ ...prev, fonctionnaires: true }));
        try {
            const response = await axios.get(`${baseApiUrl}${apiPrefix}/fonctionnaires`, { withCredentials: true });
            const foncData = response.data.fonctionnaires || response.data || [];
            setFonctionnairesOptions(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` }))
                .sort((a, b) => a.label.localeCompare(b.label)));
            console.log("Fonctionnaires options loaded.");
        } catch (err) {
            console.error("Error loading fonctionnaires options:", err);
            setValidationErrors(prev => ({ ...prev, id_fonctionnaire: "Erreur chargement Fonctionnaires" }));
            setFonctionnairesOptions([]);
        } finally {
            setLoadingOptions(prev => ({ ...prev, fonctionnaires: false }));
        }
    }, [baseApiUrl, apiPrefix]);

    useEffect(() => {
        fetchFonctionnaires();
    }, [fetchFonctionnaires]);

    // --- Effect to Fetch Data (Edit Mode) ---
    useEffect(() => {
        let isMounted = true;
        if (isEditMode && !loadingOptions.fonctionnaires) { // Check if options are loaded
            setIsLoading(true);
            setError(null);
            setValidationErrors({});
            const apiEndpoint = `${baseApiUrl}${apiPrefix}/contrat-droit-commun/${itemId}`;
            console.log(`[CDC Form] Fetching edit data for Contrat ID: ${itemId} from ${apiEndpoint}`);

            axios.get(apiEndpoint, { params: { include: 'fichiers' }, withCredentials: true })
                .then(response => {
                    if (!isMounted) return;
                    const itemData = response.data?.contrat_droit_commun || response.data || {};
                    console.log("[CDC Form] Fetched item data:", itemData);

                    const formattedDate = itemData.date_signature ? itemData.date_signature.split(' ')[0] : '';
                    const existingFiles = (itemData.fichiers || []).map(f => ({ id: f.id, nom_fichier: f.nom_fichier, chemin_fichier: f.chemin_fichier }));

                    // <-- ADDED: Parse fonctionnaire IDs -->
                    const matchedFonctionnaires = findMultiOptions(fonctionnairesOptions, itemData.id_fonctionnaire, ';');
                    console.log("[CDC Form Edit] Matched Fonctionnaires:", matchedFonctionnaires);

                    setFormData(prev => ({
                        ...prev,
                        numero_contrat: itemData.numero_contrat || '',
                        objet: itemData.objet || '',
                        fournisseur_nom: itemData.fournisseur_nom || '',
                        date_signature: formattedDate,
                        montant_total: itemData.montant_total || '',
                        duree_contrat: itemData.duree_contrat || '',
                        type_contrat: itemData.type_contrat || '', // Keep simple value
                        mode_paiement: itemData.mode_paiement || '',
                        observations: itemData.observations || '',
                        fonctionnaires: matchedFonctionnaires, // <-- Set the parsed array
                        fichiers: [],
                        existing_fichiers: existingFiles,
                        fichiers_to_delete: [],
                    }));
                })
                .catch(err => {
                    if (!isMounted) return;
                    console.error("[CDC Form] Error fetching data:", err);
                    setError(err.response?.data?.message || err.message || "Erreur de chargement des données du contrat.");
                    setFormData(initialFormData);
                })
                .finally(() => {
                    if (isMounted) setIsLoading(false);
                });
        } else if (!isEditMode) {
            // Reset form for create mode only if needed (e.g., switching from edit)
             if (formData.numero_contrat || formData.existing_fichiers.length > 0) {
                setFormData(initialFormData);
             }
            setIsLoading(false); // Not loading item data
        }
        return () => { isMounted = false; };
    }, [itemId, isEditMode, baseApiUrl, apiPrefix, initialFormData, loadingOptions.fonctionnaires, fonctionnairesOptions]); // Added dependencies


    // --- Input Handlers ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name]) {
            setValidationErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // <-- ADDED: Handler for Fonctionnaire react-select -->
    const handleFonctionnaireChange = useCallback((selectedOptions) => {
        setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] }));
        if (validationErrors.id_fonctionnaire) {
            setValidationErrors(prev => ({ ...prev, id_fonctionnaire: undefined }));
        }
    }, [validationErrors.id_fonctionnaire]);

    // --- File Handlers (Keep original logic) ---
    const handleFileChange = useCallback((e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        setFormData(prev => ({ ...prev, fichiers: [...(prev.fichiers || []), ...files] }));
        e.target.value = null;
        if (validationErrors['fichiers'] || validationErrors['fichiers.*']) {
            setValidationErrors(prev => ({ ...prev, 'fichiers': null, 'fichiers.*': null }));
        }
    }, [validationErrors]);

    const removeNewFile = useCallback((fileIndex) => {
        setFormData(prev => ({ ...prev, fichiers: (prev.fichiers || []).filter((_, fIdx) => fIdx !== fileIndex) }));
    }, []);

    const removeExistingFile = useCallback((fileId) => {
        // Keep original confirm logic
        if (!window.confirm("Supprimer ce fichier existant ? Il sera effacé lors de la sauvegarde.")) return;
        setFormData(prev => ({
            ...prev,
            existing_fichiers: (prev.existing_fichiers || []).filter(f => f.id !== fileId),
            fichiers_to_delete: [...(prev.fichiers_to_delete || []), fileId]
        }));
    }, []);
    // --- End File Handlers ---

    // --- Server Error Mapping (Keep original) ---
    const mapServerErrors = useCallback((serverErrors) => {
        const formErrors = {};
        if (!serverErrors || typeof serverErrors !== 'object') return formErrors;
        for (const key in serverErrors) {
            if (key.startsWith('fichiers.')) {
                formErrors['fichiers.*'] = serverErrors[key];
            } else {
                formErrors[key] = serverErrors[key];
            }
        }
        console.warn("Mapped validation errors:", formErrors);
        return formErrors;
     }, []);

    // --- Form Submission ---
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setValidationErrors({});
        console.log("[CDC Form] Submitting data:", formData);

        const submissionPayload = new FormData();

        // Append standard fields (keep original loop)
        Object.entries(formData).forEach(([key, value]) => {
            // Exclude fields handled separately
            if (!['fichiers', 'existing_fichiers', 'fichiers_to_delete', 'fonctionnaires'].includes(key)) {
                 submissionPayload.append(key, value ?? '');
             }
        });

        // <-- ADDED: Append fonctionnaire IDs -->
        const fonctionnaireIdsString = formData.fonctionnaires.map(f => f.value).join(';');
        if (fonctionnaireIdsString) {
            submissionPayload.append('id_fonctionnaire', fonctionnaireIdsString);
        }

        // Append NEW files (keep original)
        (formData.fichiers || []).forEach((file, index) => {
             if (file instanceof File) { submissionPayload.append(`fichiers[${index}]`, file, file.name); }
        });

        // Append Files to Delete IDs (keep original)
        if (formData.fichiers_to_delete && formData.fichiers_to_delete.length > 0) {
            formData.fichiers_to_delete.forEach((id, index) => { submissionPayload.append(`fichiers_to_delete[${index}]`, id); });
        }

        // Add PUT method for updates (keep original)
        if (isEditMode) { submissionPayload.append('_method', 'PUT'); }

        console.log("[CDC Form] Sending Payload...");
        const apiEndpoint = isEditMode
             ? `${baseApiUrl}${apiPrefix}/contrat-droit-commun/${itemId}`
             : `${baseApiUrl}${apiPrefix}/contrat-droit-commun`;

        try {
            // Keep original axios config
            const config = { headers: { 'Content-Type': 'multipart/form-data', 'Accept': 'application/json' }, withCredentials: true };
            const response = await axios.post(apiEndpoint, submissionPayload, config);

            console.log(`[CDC Form] API Response (${isEditMode ? 'Update' : 'Create'}):`, response.data);
            setError(null);
            setValidationErrors({});
            if (isEditMode && onItemUpdated) onItemUpdated(response.data.contrat_droit_commun || response.data);
            else if (!isEditMode && onItemCreated) onItemCreated(response.data.contrat_droit_commun || response.data);
            onClose();

        } catch (err) {
            // Keep original error handling
            console.error("[CDC Form] Error submitting form:", err.response || err);
            const message = err.response?.data?.message || err.message || "Erreur de soumission.";
            if (err.response && err.response.status === 422) {
                 const serverErrors = err.response.data.errors || {};
                 console.error("Validation Errors from Server:", serverErrors);
                 setValidationErrors(mapServerErrors(serverErrors));
                 setError("Veuillez corriger les erreurs indiquées.");
             } else {
                setError(message);
                setValidationErrors({});
             }
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, isEditMode, apiPrefix, baseApiUrl, itemId, onItemUpdated, onItemCreated, onClose, mapServerErrors]); // Added apiPrefix

    // --- Render ---
    if (isLoading) { // Keep original loading check
        return <div className="text-center p-5"><Spinner animation="border" /> Chargement...</div>;
    }

    // Determine overall loading state for disabling submit button
    const isFormDisabled = isSubmitting || loadingOptions.fonctionnaires;

    return (
        // Keep original form container classes and style
        <Form onSubmit={handleSubmit} noValidate className='p-4 holder' style={{
            maxHeight: 'calc(90vh - 100px)',
            overflowY: 'auto',
        }}>
            {/* Keep original Error Alerts */}
            {error && !Object.keys(validationErrors).length && <Alert variant="danger" className="mt-3">{error}</Alert>}
            {Object.keys(validationErrors).length > 0 && <Alert variant="warning" className="mt-3 small py-2">Veuillez corriger les erreurs indiquées ci-dessous.</Alert>}

            {/* Form Header - Keep original */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                 <div>
                     <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditMode ? 'Modifier le' : 'Créer un nouveau'}</h5>
                     <h2 className="mb-0 fw-bold">Contrat Droit Commun {isEditMode ? `(${formData.numero_contrat || '...'})` : ''}</h2>
                 </div>
                 {/* Use original close button class */}
                 <Button variant="warning" onClick={onClose} size="sm" title="Annuler et fermer" className={buttonCloseClass}>
                     <b>Revenir a la liste</b>
                 </Button>
            </div>

            {/* Form Fields - Keep original structure and classes */}
            <h5 className="mb-3 mt-2">Détails du Contrat</h5>
            <Row>
                <Form.Group as={Col} md="6" className="mb-3">
                    <Form.Label htmlFor="numero_contrat">Numéro Contrat <span className="text-danger">*</span></Form.Label>
                    {/* Use original input class */}
                    <Form.Control id="numero_contrat" type="text" name="numero_contrat" value={formData.numero_contrat} onChange={handleChange} isInvalid={!!validationErrors.numero_contrat} className={inputClass} />
                    <Form.Control.Feedback type="invalid">{validationErrors.numero_contrat?.[0]}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group as={Col} md="6" className="mb-3">
                    <Form.Label htmlFor="fournisseur_nom">Fournisseur <span className="text-danger">*</span></Form.Label>
                    <Form.Control id="fournisseur_nom" type="text" name="fournisseur_nom" value={formData.fournisseur_nom} onChange={handleChange} isInvalid={!!validationErrors.fournisseur_nom} className={inputClass} />
                    <Form.Control.Feedback type="invalid">{validationErrors.fournisseur_nom?.[0]}</Form.Control.Feedback>
                </Form.Group>
            </Row>

            <Form.Group className="mb-3">
                <Form.Label htmlFor="objet">Objet <span className="text-danger">*</span></Form.Label>
                {/* Use original textarea class */}
                <Form.Control id="objet" as="textarea" rows={2} name="objet" value={formData.objet} onChange={handleChange} isInvalid={!!validationErrors.objet} className={textareaClass}/>
                <Form.Control.Feedback type="invalid">{validationErrors.objet?.[0]}</Form.Control.Feedback>
            </Form.Group>

            <Row>
                 <Form.Group as={Col} md="4" className="mb-3">
                    <Form.Label htmlFor="date_signature">Date Signature <span className="text-danger">*</span></Form.Label>
                    <Form.Control id="date_signature" type="date" name="date_signature" value={formData.date_signature} onChange={handleChange} isInvalid={!!validationErrors.date_signature} className={inputClass} />
                    <Form.Control.Feedback type="invalid">{validationErrors.date_signature?.[0]}</Form.Control.Feedback>
                 </Form.Group>
                 <Form.Group as={Col} md="4" className="mb-3">
                    <Form.Label htmlFor="montant_total">Montant Total TTC (MAD) <span className="text-danger">*</span></Form.Label>
                    <Form.Control id="montant_total" type="number" step="0.01" name="montant_total" value={formData.montant_total} onChange={handleChange} isInvalid={!!validationErrors.montant_total} placeholder="0.00" className={inputClass}/>
                    <Form.Control.Feedback type="invalid">{validationErrors.montant_total?.[0]}</Form.Control.Feedback>
                 </Form.Group>
                 <Form.Group as={Col} md="4" className="mb-3">
                     <Form.Label htmlFor="duree_contrat">Durée Contrat</Form.Label>
                     <Form.Control id="duree_contrat" type="text" name="duree_contrat" value={formData.duree_contrat} onChange={handleChange} isInvalid={!!validationErrors.duree_contrat} placeholder="Ex: 12 mois, 1 an..." className={inputClass}/>
                     <Form.Control.Feedback type="invalid">{validationErrors.duree_contrat?.[0]}</Form.Control.Feedback>
                 </Form.Group>
            </Row>

            {/* --- ADDED: Row for Fonctionnaire Select --- */}
             <Row className="mb-3 g-3">
                  <Form.Group as={Col} md={12} controlId="formFonctionnaire">
                     <Form.Label className="small mb-1 fw-medium">
                          <FontAwesomeIcon icon={faUsers} className="me-1" /> Points Focaux
                     </Form.Label>
                     <Select
                         inputId="fonctionnaires" name="fonctionnaires"
                         options={fonctionnairesOptions}
                         value={formData.fonctionnaires}
                         onChange={handleFonctionnaireChange}
                         placeholder={loadingOptions.fonctionnaires ? "Chargement..." : "Sélectionner Fonctionnaire(s) (Optionnel)..."}
                         isClearable closeMenuOnSelect={false}
                         isMulti
                         isLoading={loadingOptions.fonctionnaires}
                         isDisabled={loadingOptions.fonctionnaires}
                         styles={selectStyles} // Use the defined style object
                         className={validationErrors.id_fonctionnaire ? 'is-invalid' : ''}
                         menuPortalTarget={document.body}
                     />
                     {validationErrors.id_fonctionnaire &&
                        <div className="invalid-feedback d-block ps-2 small mt-1">{validationErrors.id_fonctionnaire}</div>
                     }
                  </Form.Group>
             </Row>
            {/* --- END ADDED ROW --- */}


            <Row>
                 <Form.Group as={Col} md="6" className="mb-3">
                    <Form.Label htmlFor="type_contrat">Type Contrat</Form.Label>
                    {/* Use original Form.Select with original class */}
                    <Form.Select
                        id="type_contrat" name="type_contrat" value={formData.type_contrat}
                        onChange={handleChange} isInvalid={!!validationErrors.type_contrat}
                        className={selectClass}
                        >
                        <option value="">-- Sélectionner --</option>
                        {TYPE_CONTRAT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{validationErrors.type_contrat?.[0]}</Form.Control.Feedback>
                 </Form.Group>
                 <Form.Group as={Col} md="6" className="mb-3">
                     <Form.Label htmlFor="mode_paiement">Mode Paiement</Form.Label>
                     <Form.Control id="mode_paiement" type="text" name="mode_paiement" value={formData.mode_paiement} onChange={handleChange} isInvalid={!!validationErrors.mode_paiement} placeholder="Virement, Chèque..." className={inputClass}/>
                     <Form.Control.Feedback type="invalid">{validationErrors.mode_paiement?.[0]}</Form.Control.Feedback>
                 </Form.Group>
            </Row>

             <Form.Group className="mb-3">
                <Form.Label htmlFor="observations">Observations</Form.Label>
                {/* Use original textarea class */}
                <Form.Control id="observations" as="textarea" rows={2} name="observations" value={formData.observations} onChange={handleChange} isInvalid={!!validationErrors.observations} className={textareaClass}/>
                <Form.Control.Feedback type="invalid">{validationErrors.observations?.[0]}</Form.Control.Feedback>
            </Form.Group>

            {/* --- Files Section (Keep original) --- */}
            <h5 className="mt-4 mb-3">Fichiers Joints</h5>
            <Card className="mb-3 border shadow-sm">
                <Card.Body className='p-3'>
                    <Form.Group controlId="cdcFileGroup">
                         <Form.Label className="small mb-1 text-muted"><FontAwesomeIcon icon={faPaperclip} className="me-1"/> Joindre Fichiers</Form.Label>
                         <Form.Control id="cdc_fichiers_hidden_input" type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} aria-hidden="true" isInvalid={!!validationErrors['fichiers.*'] || !!validationErrors['fichiers']}/>
                         <Button variant="outline-info" size="sm" className="d-inline-block ms-2 rounded-5" onClick={() => document.getElementById('cdc_fichiers_hidden_input')?.click()}> <FontAwesomeIcon icon={faPlus} className="me-1" /> Ajouter Fichier(s)</Button>
                         {(validationErrors['fichiers.*'] || validationErrors['fichiers']) && (<div className="d-block invalid-feedback small mt-1 ms-1">{validationErrors['fichiers.*']?.[0] || validationErrors['fichiers']?.[0]}</div>)}
                         {/* Display EXISTING files */}
                         {isEditMode && formData.existing_fichiers?.length > 0 && ( <Stack direction="horizontal" gap={1} className="mt-2 flex-wrap" style={{fontSize: '0.8em'}}><span className="me-2 small text-muted">Existants:</span>{formData.existing_fichiers.map((file) => ( <Badge key={`existing-cdc-file-${file.id}`} pill text="dark" bg='transparent' className="d-flex border p-2 align-items-center fw-normal"><span className='me-1 text-truncate' style={{maxWidth: '120px'}} title={file.nom_fichier}>{file.nom_fichier}</span><Button size="sm" aria-label="Supprimer existant" className="p-0 ms-1 px-2 btn text-danger bg-transparent border-danger" style={{fontSize:'10px'}} onClick={() => removeExistingFile(file.id)} title="Marquer pour suppression"><FontAwesomeIcon icon={faTrashAlt} /></Button></Badge> ))}</Stack> )}
                         {/* Display NEW files */}
                         {formData.fichiers?.length > 0 && ( <Stack direction="horizontal" gap={1} className={`${(isEditMode && formData.existing_fichiers?.length > 0) ? 'mt-1' : 'mt-2'} flex-wrap`} style={{fontSize: '0.8em'}}><span className="me-2 small text-muted">Nouveaux:</span>{formData.fichiers.map((file, fileIndex) => ( <Badge key={`new-cdc-file-${file.name}-${fileIndex}`} pill bg="success" className="d-flex align-items-center fw-normal"><span className='me-1 p-2 text-truncate' style={{maxWidth: '120px'}} title={file.name}>{file.name}</span><Button variant="close" size="sm" aria-label="Retirer nouveau" className="btn-close-white p-0 ms-1" style={{fontSize: '1em', filter: 'invert(1) grayscale(100%) brightness(200%)'}} onClick={() => removeNewFile(fileIndex)}></Button></Badge> ))}</Stack> )}
                         {/* Placeholder if no files */}
                         {!formData.fichiers?.length && !formData.existing_fichiers?.length && ( <div className="mt-2 small text-muted fst-italic">Aucun fichier joint.</div> )}
                    </Form.Group>
                </Card.Body>
            </Card>

            {/* Submit/Cancel Buttons (Keep original) */}
            <div className="text-center mt-4 pt-3 border-top">
                 <Button variant="danger" onClick={onClose} className="me-2 rounded-5 px-5">Annuler</Button>
                 {/* Disable button based on combined loading state */}
                 <Button variant="primary" type="submit" className="me-2 rounded-5 px-5" disabled={isFormDisabled}>
                    {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2"/> : null}
                    {isSubmitting ? 'Enregistrement...' : (isEditMode ? 'Enregistrer Modifications' : 'Créer Contrat')}
                </Button>
            </div>
        </Form>
    );
};

// --- PropTypes (Keep original) ---
ContratDroitCommunForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};

export default ContratDroitCommunForm;