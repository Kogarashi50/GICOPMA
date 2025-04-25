// src/gestion_conventions/ordres_service_views/OrdreServiceForm.jsx (adjust path if needed)

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios'; // Assuming you have a configured axios instance
import { Form, Button, Row, Col, Spinner, Alert, Badge, Stack } from 'react-bootstrap';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faTrashAlt, faUpload, faFileContract, faEye } from '@fortawesome/free-solid-svg-icons';

// --- Constants ---
const TYPE_OPTIONS = [
    { value: 'commencement', label: 'Ordre de Commencement' },
    { value: 'arret', label: 'Ordre d\'Arrêt' }
];
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// --- Helper Function ---
const getPublicFileUrl = (baseApiUrl, relativePath) => {
    if (!relativePath || !baseApiUrl) return '#';
    try {
        const url = new URL(baseApiUrl);
        let baseUrl = url.origin;
        if (url.pathname.includes('/api')) {
            baseUrl += url.pathname.substring(0, url.pathname.indexOf('/api'));
        }
        baseUrl = baseUrl.replace(/\/$/, '');
        return `${baseUrl}/storage/${relativePath.replace(/^\//, '')}`;
    } catch (e) {
        console.error("Error constructing public URL:", e);
        return '#';
    }
};
// --- End Helper Function ---

// --- Custom Styles for React-Select ---
const customSelectStyles = (hasError) => ({
  control: (provided, state) => ({
    ...provided,
    borderRadius: '50px', // Rounded corners
    backgroundColor: '#f8f9fa', // Light background
    borderColor: hasError ? '#dc3545' : state.isFocused ? '#86b7fe' : '#ced4da', // Error/Focus/Default border
    boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : hasError ? '0 0 0 0.25rem rgba(220, 53, 69, 0.25)' : 'none', // Focus/Error shadow
    '&:hover': {
      borderColor: hasError ? '#dc3545' : '#adb5bd' // Hover border
    },
    paddingTop: '0.1rem', // Adjust vertical padding slightly if needed
    paddingBottom: '0.1rem',
    minHeight: 'calc(1.5em + 0.75rem + 2px)', // Match Bootstrap input height
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0.375rem 0.75rem', // Match Bootstrap input padding
  }),
  input: (provided) => ({
    ...provided,
    margin: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
  }),
  indicatorSeparator: () => ({
    display: 'none', // Hide separator
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    paddingRight: '0.5rem',
  }),
  placeholder: (provided) => ({
      ...provided,
      color: '#6c757d', // Bootstrap placeholder color
      marginLeft: '2px', // Slight adjustments if needed
  }),
  singleValue: (provided) => ({
      ...provided,
      marginLeft: '2px',
      marginRight: '2px',
  }),
  menu: (provided) => ({
      ...provided,
      borderRadius: '0.5rem', // Rounded menu
      boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',
  }),
  menuList: (provided) => ({
      ...provided,
      paddingTop: '0.25rem',
      paddingBottom: '0.25rem',
  }),
  option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : 'white',
      color: state.isSelected ? 'white' : '#212529',
      '&:active': {
          backgroundColor: !state.isDisabled ? (state.isSelected ? '#0b5ed7' : '#dde0e3') : undefined,
      },
      padding: '0.5rem 0.75rem',
  }),
});
// --- End Custom Styles ---


// --- Component Definition ---
const OrdreServiceForm = ({ itemId, onClose, onItemCreated, onItemUpdated, baseApiUrl }) => {
    const isEditMode = !!itemId;

    // --- State Initialization ---
    const initialFormData = {
        marche_id: null,
        type: null,
        numero: '',
        date_emission: '',
        description: '',
    };
    const [formData, setFormData] = useState(initialFormData);
    const [selectedFile, setSelectedFile] = useState(null);
    const [existingFileInfo, setExistingFileInfo] = useState(null);
    const [deleteExistingFile, setDeleteExistingFile] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditMode);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [marcheOptions, setMarcheOptions] = useState([]);
    const [loadingMarcheOptions, setLoadingMarcheOptions] = useState(true);

    // --- API Endpoint Determination ---
    const apiEndpoint = isEditMode
        ? `${baseApiUrl}/ordres-service/${itemId}`
        : `${baseApiUrl}/ordres-service`;

    // --- Effect to Fetch Marche Public Options ---
    useEffect(() => {
        let isMounted = true;
        setLoadingMarcheOptions(true);
        setError(null);
        console.log("OrdreServiceForm: Fetching Marche options...");
        const marcheListUrl = `${baseApiUrl}/marches-publics?fields=id,numero_marche,intitule`;
        console.log("Requesting Marche list from:", marcheListUrl);

        axios.get(marcheListUrl)
            .then(response => {
                if (!isMounted) return;
                console.log("Received Marche options response:", response.data);
                const marcheList = response.data?.marches_publics || response.data?.data || response.data || [];

                if (!Array.isArray(marcheList)) {
                    console.error("Marche list data received is not an array:", marcheList);
                    setError("Format de données invalide pour la liste des marchés.");
                    setMarcheOptions([]);
                    return;
                }

                const options = marcheList.map(m => {
                    if (m.id === undefined || m.numero_marche === undefined || m.intitule === undefined) {
                        console.warn("Skipping invalid Marche option:", m);
                        return null;
                    }
                    return {
                        value: m.id,
                        label: `${m.numero_marche} - ${m.intitule}`.substring(0, 100) + (m.intitule.length > 100 ? '...' : '')
                    };
                }).filter(opt => opt !== null);

                setMarcheOptions(options);
                console.log(`Processed ${options.length} valid Marche options.`);
            })
            .catch(err => {
                if (!isMounted) return;
                console.error("Error fetching Marche Public options:", err.response || err);
                setError(prev => prev ? `${prev}\nErreur chargement de la liste des marchés.` : "Erreur chargement de la liste des marchés.");
                setMarcheOptions([]);
            })
            .finally(() => {
                if (isMounted) setLoadingMarcheOptions(false);
            });
        return () => { isMounted = false; };
    }, [baseApiUrl]); // Fetch only once


    // --- Effect to Fetch Existing OrdreService Data (Edit Mode) ---
    useEffect(() => {
        let isMounted = true;
        if (isEditMode && itemId && !loadingMarcheOptions) { // Wait for options to load
            setIsLoading(true);
            setError(null);
            setValidationErrors({});
            setExistingFileInfo(null);
            setSelectedFile(null);
            setDeleteExistingFile(false);
            console.log(`OrdreServiceForm (Edit): Fetching data for ID: ${itemId} after options loaded.`);

            axios.get(`${baseApiUrl}/ordres-service/${itemId}`)
                .then(response => {
                    if (!isMounted) return;
                    const itemData = response.data?.ordre_service || response.data || null;
                    console.log("Fetched OrdreService data for edit:", itemData);

                    if (!itemData) {
                        setError("Données de l'ordre de service non trouvées pour modification.");
                        setIsLoading(false);
                        return;
                    }

                    // --- Find the Marche Public option ---
                    // Ensure itemData contains marche_id or a nested marche_public object with an id
                    const currentMarcheId = itemData.marche_id || itemData.marche_public?.id;
                    const selectedMarcheOption = marcheOptions.find(opt => opt.value === currentMarcheId) || null;
                    console.log("Current Marche ID:", currentMarcheId, "Selected Option:", selectedMarcheOption);

                    setFormData({
                        marche_id: selectedMarcheOption, // Set the {value, label} object
                        type: TYPE_OPTIONS.find(opt => opt.value === itemData.type) || null,
                        numero: itemData.numero || '',
                        date_emission: itemData.date_emission ? itemData.date_emission.split(' ')[0] : '',
                        description: itemData.description || '',
                    });

                    if (itemData.fichier_joint) {
                        const fileName = itemData.fichier_joint.split('/').pop();
                        setExistingFileInfo({ name: fileName, path: itemData.fichier_joint });
                    } else {
                        setExistingFileInfo(null);
                    }
                })
                .catch(err => {
                    if (!isMounted) return;
                    console.error("Error fetching OrdreService data for edit:", err);
                    setError(err.response?.data?.message || err.message || "Erreur de chargement des données pour modification.");
                    setFormData(initialFormData); // Reset form state on error
                })
                .finally(() => {
                    if (isMounted) setIsLoading(false);
                });
        } else if (!isEditMode) {
            // Only reset form data if not editing
             setFormData(initialFormData);
             setSelectedFile(null);
             setExistingFileInfo(null);
             setDeleteExistingFile(false);
             // Don't set isLoading here; let options loading control the initial state
        }

        return () => { isMounted = false; };
    }, [itemId, isEditMode, baseApiUrl, loadingMarcheOptions, marcheOptions]); // Dependencies


    // --- Input Handlers ---
    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name]) {
            setValidationErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
        }
    }, [validationErrors]);

    const handleSelectChange = useCallback((selectedOption, actionMeta) => {
        const { name } = actionMeta;
        setFormData(prev => ({ ...prev, [name]: selectedOption }));
        if (validationErrors[name]) {
            setValidationErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
        }
    }, [validationErrors]);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setDeleteExistingFile(true);
            setExistingFileInfo(null);
             if (validationErrors.fichier_joint) {
                setValidationErrors(prev => { const next = { ...prev }; delete next.fichier_joint; return next; });
            }
        }
        e.target.value = null;
    }, [validationErrors]);

    const removeNewFile = useCallback(() => {
        setSelectedFile(null);
        setDeleteExistingFile(false);
    }, []);

    const markExistingFileForDeletion = useCallback(() => {
        if (!window.confirm("Supprimer le fichier joint existant lors de la sauvegarde ?")) return;
        setSelectedFile(null);
        setDeleteExistingFile(true);
        setExistingFileInfo(null);
    }, []);

    // --- Server Validation Error Mapping ---
    const mapServerErrors = useCallback((serverErrors) => {
        const formErrors = {};
        if (!serverErrors || typeof serverErrors !== 'object') return formErrors;
        for (const key in serverErrors) {
            formErrors[key] = Array.isArray(serverErrors[key]) ? serverErrors[key] : [serverErrors[key]];
        }
        console.log("Mapped validation errors:", formErrors);
        return formErrors;
    }, []);


    // --- Form Submission Handler ---
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!formData.marche_id || !formData.marche_id.value) {
            setValidationErrors({ marche_id: ["Le marché public est requis."] });
            return;
        }
        setIsLoading(true);
        setError(null);
        setValidationErrors({});

        const submissionPayload = new FormData();
        submissionPayload.append('marche_id', formData.marche_id.value);
        submissionPayload.append('numero', formData.numero || '');
        submissionPayload.append('date_emission', formData.date_emission || '');
        submissionPayload.append('description', formData.description || '');
        if (formData.type && formData.type.value) {
            submissionPayload.append('type', formData.type.value);
        } else {
             submissionPayload.append('type', '');
        }
        if (selectedFile instanceof File) {
            submissionPayload.append('fichier_joint', selectedFile, selectedFile.name);
        }
        if (deleteExistingFile && !(selectedFile instanceof File)) {
            submissionPayload.append('delete_fichier_joint', '1');
        }
        if (isEditMode) {
            submissionPayload.append('_method', 'POST');
        }

        console.log("Submitting FormData to:", apiEndpoint);

        try {
            const config = { headers: { 'Accept': 'application/json', 'Content-Type': 'multipart/form-data' } };
            const response = await axios.post(apiEndpoint, submissionPayload, config);

            console.log(`API Response (${isEditMode ? 'Update' : 'Create'}):`, response.data);
            setError(null);
            setValidationErrors({});
            const responseData = response.data.ordre_service || response.data;
            if (isEditMode && onItemUpdated) {
                onItemUpdated(responseData);
            } else if (!isEditMode && onItemCreated) {
                onItemCreated(responseData);
            }
            onClose();

        } catch (err) {
             console.error(`Error submitting OrdreService form (${isEditMode ? 'Update' : 'Create'}):`, err.response || err);
             const message = err.response?.data?.message || err.message || "Erreur lors de la sauvegarde.";
             if (err.response && err.response.status === 422) {
                 const serverErrors = err.response.data.errors || {};
                 setValidationErrors(mapServerErrors(serverErrors));
                 setError("Veuillez corriger les erreurs indiquées dans le formulaire.");
             } else {
                 setError(message);
                 setValidationErrors({});
             }
        } finally {
            setIsLoading(false);
        }
    }, [
        formData, selectedFile, deleteExistingFile, isEditMode, apiEndpoint, baseApiUrl,
        onItemUpdated, onItemCreated, onClose, mapServerErrors
    ]);

    // --- Render Logic ---
    // Spinner shown when loading options OR loading edit data
    const showOverallLoading = loadingMarcheOptions || (isEditMode && isLoading);

    if (showOverallLoading && !error) {
        return <div className="text-center p-5"><Spinner animation="border" /> Chargement...</div>;
    }

    return (
        <div className='p-5'><div className="d-flex justify-content-between  align-items-center mb-4 flex-shrink-0">
                         <div>
                             <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditMode ? 'Modifier le' : 'Créer un nouveau'}</h5>
                             <h2 className="mb-0 fw-bold">Ordre de Service {isEditMode ? `(${formData.numero || '...'})` : ''}</h2>
                         </div>
                         <Button variant="light" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm' onClick={onClose} size="sm" title="Retour">
                              <b>Revenir a la liste</b>
                         </Button>
                     </div>
     
        <Form onSubmit={handleSubmit} noValidate className='p-4 holder'>
            {/* Error Alerts */}
            {error && !Object.keys(validationErrors).length && <Alert variant="danger">{error}</Alert>}
            {Object.keys(validationErrors).length > 0 && <Alert variant="warning" className="small py-2">Veuillez corriger les erreurs.</Alert>}

            {/* --- Marche Public Selection (ALWAYS VISIBLE NOW) --- */}
            <Form.Group className="mb-3">
                <Form.Label htmlFor="marche_id_select">
                    <FontAwesomeIcon icon={faFileContract} className="me-1" /> Marché Public Associé <span className="text-danger">*</span>
                </Form.Label>
                <Select
                    inputId="marche_id_select"
                    name="marche_id"
                    options={marcheOptions}
                    value={formData.marche_id}
                    onChange={handleSelectChange}
                    placeholder={loadingMarcheOptions ? "Chargement..." : "Sélectionner un marché..."}
                    isLoading={loadingMarcheOptions}
                    isDisabled={loadingMarcheOptions} // Disable while loading options
                    isClearable={false} // Cannot clear required field
                    styles={customSelectStyles(!!validationErrors.marche_id)} // Apply custom styles
                    aria-invalid={!!validationErrors.marche_id}
                    aria-describedby="marche_id_feedback"
                />
                {/* Display validation error for marche_id */}
                {validationErrors.marche_id && <div id="marche_id_feedback" className="d-block invalid-feedback">{validationErrors.marche_id[0]}</div>}
            </Form.Group>

             {/* --- Common Fields --- */}
             <Row>
                 {/* Type */}
                 <Form.Group as={Col} md="6" className="mb-3">
                     <Form.Label htmlFor="type_ordre_select">Type <span className="text-danger">*</span></Form.Label>
                     <Select
                         inputId="type_ordre_select"
                         name="type"
                         options={TYPE_OPTIONS}
                         value={formData.type}
                         onChange={handleSelectChange}
                         placeholder="Sélectionner type..."
                         isClearable={false}
                         styles={customSelectStyles(!!validationErrors.type)} // Apply custom styles
                         aria-invalid={!!validationErrors.type}
                         aria-describedby="type_feedback"
                     />
                     {validationErrors.type && <div id="type_feedback" className="d-block invalid-feedback">{validationErrors.type[0]}</div>}
                 </Form.Group>

                  {/* Numero */}
                 <Form.Group as={Col} md="6" className="mb-3">
                     <Form.Label htmlFor="numero_ordre">Numéro/Référence <span className="text-danger">*</span></Form.Label>
                     <Form.Control
                         id="numero_ordre"
                         type="text"
                         name="numero"
                         value={formData.numero}
                         onChange={handleChange}
                         isInvalid={!!validationErrors.numero}
                         required
                         className='form-control-style shadow-sm form-control-rounded' // Apply rounded style
                         aria-describedby="numero_feedback"
                     />
                     <Form.Control.Feedback id="numero_feedback" type="invalid">{validationErrors.numero?.[0]}</Form.Control.Feedback>
                 </Form.Group>
             </Row>

              {/* Date Emission */}
             <Form.Group className="mb-3">
                 <Form.Label htmlFor="date_emission">Date d'Émission <span className="text-danger">*</span></Form.Label>
                 <Form.Control
                     id="date_emission"
                     type="date"
                     name="date_emission"
                     value={formData.date_emission}
                     onChange={handleChange}
                     isInvalid={!!validationErrors.date_emission}
                     required
                     className='form-control-style shadow-sm form-control-rounded' // Apply rounded style
                     aria-describedby="date_emission_feedback"
                 />
                 <Form.Control.Feedback id="date_emission_feedback" type="invalid">{validationErrors.date_emission?.[0]}</Form.Control.Feedback>
             </Form.Group>

              {/* Description */}
             <Form.Group className="mb-3">
                 <Form.Label htmlFor="description">Description</Form.Label>
                 <Form.Control
                     id="description"
                     as="textarea"
                     rows={3}
                     name="description"
                     value={formData.description}
                     onChange={handleChange}
                     isInvalid={!!validationErrors.description}
                     className='form-control-style shadow-sm form-control-rounded' // Apply rounded style
                     aria-describedby="description_feedback"
                 />
                 <Form.Control.Feedback id="description_feedback" type="invalid">{validationErrors.description?.[0]}</Form.Control.Feedback>
             </Form.Group>

              {/* Fichier Joint */}
             <Form.Group className="mb-3">
                  <Form.Label htmlFor="fichier_joint_input">
                      <FontAwesomeIcon icon={faPaperclip} className="me-1"/> Fichier Joint
                  </Form.Label>
                  <Form.Control
                      id="fichier_joint_input"
                      type="file"
                      onChange={handleFileChange}
                      isInvalid={!!validationErrors.fichier_joint}
                      className="d-none" // Hide default input
                      aria-describedby="fichier_joint_feedback"
                  />
                  {/* Custom File Display Area */}
                  <div className="border p-2 rounded bg-light form-control-style">
                      {/* Display Existing File Info */}
                      {isEditMode && existingFileInfo && !deleteExistingFile && !selectedFile && (
                           <Stack direction="horizontal" gap={2} className="align-items-center">
                               <Badge pill bg="info" text="dark" className="d-flex align-items-center p-2 shadow-sm">
                                  <span className='me-2 text-truncate' style={{ maxWidth: '250px' }} title={existingFileInfo.name}>
                                       {existingFileInfo.name}
                                   </span>
                                   <a href={getPublicFileUrl(baseApiUrl, existingFileInfo.path)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary border-0 p-0 px-1 me-1" title="Voir le fichier actuel">
                                       <FontAwesomeIcon icon={faEye} size="xs"/>
                                   </a>
                                   <Button variant="close" size="sm" aria-label="Supprimer existant" className="p-0" onClick={markExistingFileForDeletion} title="Marquer pour suppression"></Button>
                               </Badge>
                           </Stack>
                      )}
                       {/* Display Newly Selected File Info */}
                       {selectedFile && (
                           <Stack direction="horizontal" gap={2} className="align-items-center">
                                <Badge pill bg="success" className="d-flex align-items-center p-2 shadow-sm">
                                   <span className='me-2 text-truncate' style={{ maxWidth: '250px' }} title={selectedFile.name}>
                                       {selectedFile.name}
                                   </span>
                                   <Button variant="close" size="sm" aria-label="Retirer nouveau" className="btn-close-white p-0" onClick={removeNewFile} title="Retirer ce fichier"></Button>
                               </Badge>
                           </Stack>
                       )}
                       {/* Show Upload Button */}
                       {!selectedFile && (!existingFileInfo || deleteExistingFile) && (
                            // Apply button styling similar to your example
                           <Button variant="outline-warning" size="sm" className="rounded-5" onClick={() => document.getElementById('fichier_joint_input')?.click()}>
                              <FontAwesomeIcon icon={faUpload} className="me-2"/> Choisir un fichier...
                           </Button>
                       )}
                        {/* Display validation error */}
                        {validationErrors.fichier_joint && <div id="fichier_joint_feedback" className="d-block invalid-feedback mt-1">{validationErrors.fichier_joint[0]}</div>}
                  </div>
                   {/* Helper text */}
                  <Form.Text className='d-block mt-1'>Formats autorisés: PDF, DOC(X), XLS(X), Images, ZIP, etc. (Max 20Mo)</Form.Text>
              </Form.Group>


             {/* --- Submit/Cancel Buttons --- */}
             <div className="text-center mt-4 pt-3 border-top">
                  {/* Apply rounded button style */}
                 <Button variant="danger" onClick={onClose} className="me-3 rounded-5 px-5">
                     Annuler
                 </Button>
                 {/* Apply rounded button style */}
                 <Button variant="primary" type="submit" disabled={isLoading} className="rounded-5 px-5">
                     {/* Spinner during actual submission */}
                     {isLoading && !showOverallLoading ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1"/> : null}
                     {isLoading && !showOverallLoading ? 'Sauvegarde...' : (isEditMode ? 'Enregistrer Modifications' : 'Créer Ordre')}
                 </Button>
             </div>
         </Form>   </div>
     );
 };

 // --- PropTypes ---
 OrdreServiceForm.propTypes = {
     itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), // ID is present for edit mode
     onClose: PropTypes.func.isRequired,
     onItemCreated: PropTypes.func,
     onItemUpdated: PropTypes.func,
     baseApiUrl: PropTypes.string.isRequired,
 };

 export default OrdreServiceForm;