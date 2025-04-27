// src/gestion_conventions/ordres_service_views/OrdreServiceForm.jsx (adjust path if needed)

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios'; // Assuming you have a configured axios instance
import { Form, Button, Row, Col, Spinner, Alert, Badge, Stack } from 'react-bootstrap';
import Select from 'react-select';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faTrashAlt, faUpload, faFileContract, faEye, faUserTie } from '@fortawesome/free-solid-svg-icons'; // Added faUserTie

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
        // Assuming storage link points public/storage -> storage/app/public
        // And API base URL is http://localhost:8000/api
        // We need http://localhost:8000/storage/...
        const url = new URL(baseApiUrl);
        let baseUrl = url.origin; // Gets http://localhost:8000
        baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash if any
        // Construct the URL using the base origin and the relative path from the public disk root
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
        marche_id: null,        // Holds { value, label } object
        type: null,             // Holds { value, label } object
        id_fonctionnaire: null, // Holds { value, label } object or null <<< NEW STATE
        numero: '',
        date_emission: '',
        description: '',
    };
    const [formData, setFormData] = useState(initialFormData);
    const [selectedFile, setSelectedFile] = useState(null);
    const [existingFileInfo, setExistingFileInfo] = useState(null);
    const [deleteExistingFile, setDeleteExistingFile] = useState(false);
    const [isLoading, setIsLoading] = useState(isEditMode); // True if editing, false otherwise initially
    const [isSubmitting, setIsSubmitting] = useState(false); // For submit button spinner
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const [marcheOptions, setMarcheOptions] = useState([]);
    const [loadingMarcheOptions, setLoadingMarcheOptions] = useState(true);
    const [fonctionnaireOptions, setFonctionnaireOptions] = useState([]); // <<< NEW STATE
    const [loadingFonctionnaireOptions, setLoadingFonctionnaireOptions] = useState(true); // <<< NEW STATE

    // --- API Endpoint Determination ---
    const apiEndpoint = isEditMode
        ? `${baseApiUrl}/ordres-service/${itemId}`
        : `${baseApiUrl}/ordres-service`;

    // --- Effect to Fetch Marche Public Options ---
    useEffect(() => {
        let isMounted = true;
        setLoadingMarcheOptions(true);
        setError(null); // Clear previous errors on option load attempt
        console.log("OrdreServiceForm: Fetching Marche options...");
        const marcheListUrl = `${baseApiUrl}/marches-publics?fields=id,numero_marche,intitule`;
        console.log("Requesting Marche list from:", marcheListUrl);

        axios.get(marcheListUrl, { withCredentials: true }) // Added withCredentials
            .then(response => {
                if (!isMounted) return;
                console.log("Received Marche options response:", response.data);
                // Adjust based on actual API response structure
                const marcheList = response.data?.marches_publics || response.data?.data || response.data || [];

                if (!Array.isArray(marcheList)) {
                    console.error("Marche list data received is not an array:", marcheList);
                    setError("Format de données invalide pour la liste des marchés.");
                    setMarcheOptions([]);
                    return;
                }

                const options = marcheList.map(m => {
                    // Ensure required fields exist
                    if (m.id === undefined || m.numero_marche === undefined || m.intitule === undefined) {
                        console.warn("Skipping invalid Marche option:", m);
                        return null;
                    }
                    return {
                        value: m.id,
                        label: `${m.numero_marche} - ${m.intitule}`.substring(0, 100) + (m.intitule.length > 100 ? '...' : '')
                    };
                }).filter(opt => opt !== null); // Filter out any nulls created by invalid data

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
    }, [baseApiUrl]); // Fetch only once when component mounts or baseApiUrl changes


    // --- Effect to Fetch Fonctionnaire Options --- <<< NEW EFFECT
    useEffect(() => {
        let isMounted = true;
        setLoadingFonctionnaireOptions(true);
        console.log("OrdreServiceForm: Fetching Fonctionnaire options...");
        const fonctionnaireListUrl = `${baseApiUrl}/fonctionnaires`; // Assuming this endpoint exists
        console.log("Requesting Fonctionnaire list from:", fonctionnaireListUrl);

        axios.get(fonctionnaireListUrl, { withCredentials: true })
            .then(response => {
                if (!isMounted) return;
                console.log("Received Fonctionnaire options response:", response.data);
                // Adjust based on your actual API response structure
                const fonctionnaireList = response.data?.fonctionnaires || response.data?.data || response.data || [];

                if (!Array.isArray(fonctionnaireList)) {
                    console.error("Fonctionnaire list data received is not an array:", fonctionnaireList);
                    // Don't necessarily set a global error, just log and set empty options
                    setFonctionnaireOptions([]);
                    return;
                }

                const options = fonctionnaireList.map(f => {
                    // Expecting 'id' and 'nom_complet' from backend
                    if (f.id === undefined || f.nom_complet === undefined) {
                        console.warn("Skipping invalid Fonctionnaire option:", f);
                        return null;
                    }
                    return { value: f.id, label: f.nom_complet };
                }).filter(opt => opt !== null);

                setFonctionnaireOptions(options);
                console.log(`Processed ${options.length} valid Fonctionnaire options.`);
            })
            .catch(err => {
                if (!isMounted) return;
                console.error("Error fetching Fonctionnaire options:", err.response || err);
                // Optionally set a specific error for this failure
                setError(prev => prev ? `${prev}\nErreur chargement des fonctionnaires.` : "Erreur chargement des fonctionnaires.");
                setFonctionnaireOptions([]);
            })
            .finally(() => {
                if (isMounted) setLoadingFonctionnaireOptions(false);
            });
        return () => { isMounted = false; };
    }, [baseApiUrl]);


    // --- Effect to Fetch Existing OrdreService Data (Edit Mode) ---
    useEffect(() => {
        let isMounted = true;
        // Wait until BOTH option sets are loaded before fetching edit data
        if (isEditMode && itemId && !loadingMarcheOptions && !loadingFonctionnaireOptions) {
            setIsLoading(true); // Set loading specifically for edit data fetch
            setError(null);
            setValidationErrors({});
            setExistingFileInfo(null);
            setSelectedFile(null);
            setDeleteExistingFile(false);
            console.log(`OrdreServiceForm (Edit): Fetching data for ID: ${itemId} after ALL options loaded.`);

            axios.get(`${baseApiUrl}/ordres-service/${itemId}`, { withCredentials: true }) // Added withCredentials
                .then(response => {
                    if (!isMounted) return;
                    const itemData = response.data?.ordre_service || response.data || null;
                    console.log("Fetched OrdreService data for edit:", itemData);

                    if (!itemData) {
                        setError("Données de l'ordre de service non trouvées pour modification.");
                        setIsLoading(false);
                        return;
                    }

                    // Find Marche option
                    const currentMarcheId = itemData.marche_id || itemData.marche_public?.id;
                    const selectedMarcheOption = marcheOptions.find(opt => opt.value === currentMarcheId) || null;

                    // Find Fonctionnaire option <<< NEW LOGIC
                    // Backend sends id_fonctionnaire as a string (e.g., "92")
                    const currentFonctionnaireId = itemData.id_fonctionnaire || null;
                    const selectedFonctionnaireOption = currentFonctionnaireId
                         ? fonctionnaireOptions.find(opt => String(opt.value) === String(currentFonctionnaireId)) || null
                         : null; // Find based on ID, compare as strings for safety
                    console.log("Current Fonctionnaire ID:", currentFonctionnaireId, "Selected Option:", selectedFonctionnaireOption);

                    setFormData({
                        marche_id: selectedMarcheOption,
                        type: TYPE_OPTIONS.find(opt => opt.value === itemData.type) || null,
                        id_fonctionnaire: selectedFonctionnaireOption, // Set the {value, label} object <<< NEW
                        numero: itemData.numero || '',
                        date_emission: itemData.date_emission ? itemData.date_emission.split(' ')[0] : '',
                        description: itemData.description || '',
                    });

                    if (itemData.fichier_joint) {
                        // Extract filename from the relative path stored in DB
                        const fileName = itemData.fichier_joint.substring(itemData.fichier_joint.lastIndexOf('/') + 1);
                        setExistingFileInfo({ name: fileName, path: itemData.fichier_joint });
                    } else {
                        setExistingFileInfo(null);
                    }
                })
                .catch(err => {
                    if (!isMounted) return;
                    console.error("Error fetching OrdreService data for edit:", err);
                    setError(err.response?.data?.message || err.message || "Erreur de chargement des données pour modification.");
                    setFormData(initialFormData);
                })
                .finally(() => {
                    if (isMounted) setIsLoading(false);
                });
        } else if (!isEditMode) {
             // Only reset non-required form data if not editing
             setFormData(prev => ({
                 ...initialFormData,
                 // Keep marche_id if it was pre-selected, otherwise reset
                 marche_id: prev.marche_id?.value ? prev.marche_id : null
             }));
             setSelectedFile(null);
             setExistingFileInfo(null);
             setDeleteExistingFile(false);
             // isLoading is controlled by option loading state when creating
        }

        return () => { isMounted = false; };
    // Update dependencies to include fonctionnaire options loading state
    }, [itemId, isEditMode, baseApiUrl, loadingMarcheOptions, marcheOptions, loadingFonctionnaireOptions, fonctionnaireOptions]);


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
         // Clear validation error for the specific select field
        if (validationErrors[name]) {
            setValidationErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
        }
    }, [validationErrors]);

    const handleFileChange = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            // If editing and a file exists, selecting a new one implies replacing/deleting the old one on save
            if (isEditMode && existingFileInfo) {
                setDeleteExistingFile(true); // Mark old file for deletion IF user uploads a new one
            }
            setExistingFileInfo(null); // Hide display of old file info
             if (validationErrors.fichier_joint) {
                setValidationErrors(prev => { const next = { ...prev }; delete next.fichier_joint; return next; });
            }
        }
        e.target.value = null; // Reset file input for selecting the same file again
    }, [validationErrors, isEditMode, existingFileInfo]); // Add dependencies

    const removeNewFile = useCallback(() => {
        setSelectedFile(null);
        // If editing, removing the *newly selected* file should revert the deletion flag for the *existing* one
         if (isEditMode) {
            setDeleteExistingFile(false); // Don't delete the original file if the user cancels the new selection
            // Re-fetch or re-set existing file info if needed, depends on complexity
            // For simplicity, we might require re-fetch if they cancel upload mid-edit
            // Or, store the original existingFileInfo separately if needed
        }
    }, [isEditMode]); // Add isEditMode dependency

    const markExistingFileForDeletion = useCallback(() => {
        if (!window.confirm("Supprimer le fichier joint existant lors de la sauvegarde ?")) return;
        setSelectedFile(null); // Ensure no new file is selected
        setDeleteExistingFile(true); // Mark existing file for deletion
        setExistingFileInfo(null); // Remove display of existing file
    }, []);

    // --- Server Validation Error Mapping ---
    const mapServerErrors = useCallback((serverErrors) => {
        const formErrors = {};
        if (!serverErrors || typeof serverErrors !== 'object') return formErrors;
        for (const key in serverErrors) {
            // Special handling if backend sends nested error keys like 'marche_id.value'
            const simpleKey = key.includes('.') ? key.split('.')[0] : key;
            formErrors[simpleKey] = Array.isArray(serverErrors[key]) ? serverErrors[key] : [serverErrors[key]];
        }
        console.log("Mapped validation errors:", formErrors);
        return formErrors;
    }, []);


    // --- Form Submission Handler ---
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        // Basic frontend check for Marche ID
        if (!formData.marche_id || !formData.marche_id.value) {
            setValidationErrors({ marche_id: ["Le marché public est requis."] });
            return;
        }
        // Basic frontend check for Type
        if (!formData.type || !formData.type.value) {
             setValidationErrors(prev => ({ ...prev, type: ["Le type d'ordre est requis."] }));
             return;
         }

        setIsSubmitting(true); // Set submitting state
        setError(null);
        setValidationErrors({});

        const submissionPayload = new FormData();

        // Append required fields
        submissionPayload.append('marche_id', formData.marche_id.value);
        submissionPayload.append('type', formData.type.value);
        submissionPayload.append('numero', formData.numero || '');
        submissionPayload.append('date_emission', formData.date_emission || '');

        // Append optional fields
        submissionPayload.append('description', formData.description || '');

        // Append id_fonctionnaire if selected <<< NEW
        if (formData.id_fonctionnaire && formData.id_fonctionnaire.value) {
            submissionPayload.append('id_fonctionnaire', formData.id_fonctionnaire.value);
        } else {
             submissionPayload.append('id_fonctionnaire', ''); // Send empty string if nullable and not selected
        }


        // Handle file logic for submission
        if (selectedFile instanceof File) {
            submissionPayload.append('fichier_joint', selectedFile, selectedFile.name);
            // If a new file is uploaded, the backend handles replacing/deleting the old one.
            // We don't need delete_fichier_joint=1 here.
        } else if (isEditMode && deleteExistingFile) {
            // Only send delete_fichier_joint if editing and explicitly marked for deletion WITHOUT a new file being uploaded.
            submissionPayload.append('delete_fichier_joint', '1');
        }

        // Append method override for updates
        const httpMethod = isEditMode ? 'POST' : 'POST'; // Use POST for FormData always
        if (isEditMode) {
            submissionPayload.append('_method', 'PUT'); // Or PATCH depending on backend route setup
        }

        console.log("Submitting FormData to:", apiEndpoint, "Method:", httpMethod);
        // Log FormData entries for debugging (can be verbose)
        // for (let [key, value] of submissionPayload.entries()) {
        //     console.log(`${key}:`, value);
        // }

        try {
            const config = {
                headers: {
                    'Accept': 'application/json',
                    // 'Content-Type': 'multipart/form-data' -> Axios sets this automatically for FormData
                },
                withCredentials: true // Important for Sanctum
             };
            // Use axios[method] directly if not using _method override
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
            onClose(); // Close form on success

        } catch (err) {
             console.error(`Error submitting OrdreService form (${isEditMode ? 'Update' : 'Create'}):`, err.response || err);
             const message = err.response?.data?.message || err.message || "Erreur lors de la sauvegarde.";
             if (err.response && err.response.status === 422) {
                 const serverErrors = err.response.data.errors || {};
                 setValidationErrors(mapServerErrors(serverErrors));
                 setError("Veuillez corriger les erreurs indiquées dans le formulaire.");
             } else {
                 setError(message);
                 setValidationErrors({}); // Clear specific field errors on general server error
             }
        } finally {
            setIsSubmitting(false); // Always stop submitting state
        }
    }, [
        formData, selectedFile, deleteExistingFile, isEditMode, apiEndpoint, baseApiUrl,
        onItemUpdated, onItemCreated, onClose, mapServerErrors
    ]);

    // --- Render Logic ---
    // Spinner shown while loading options OR loading edit data
    const showOverallLoading = loadingMarcheOptions || loadingFonctionnaireOptions || (isEditMode && isLoading);

    // Don't render form until mandatory options are loaded, show spinner or error message
    if (showOverallLoading) {
        return <div className="text-center p-5"><Spinner animation="border" /> Chargement des données du formulaire...</div>;
    }
     if (error && !Object.keys(validationErrors).length) {
         // Show a general error if option loading failed and it prevents form rendering
         return <Alert variant="danger" className="m-4">{error}</Alert>;
     }

    return (
        // Added padding to outer div, consistent with your example
        <div className='p-4'>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditMode ? 'Modifier le' : 'Créer un nouveau'}</h5>
                    <h2 className="mb-0 fw-bold">Ordre de Service {isEditMode ? `(${formData.numero || '...'})` : ''}</h2>
                </div>
                <Button variant="light" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm' onClick={onClose} size="sm" title="Retour">
                     <b>Revenir a la liste</b>
                </Button>
            </div>

            {/* Form with rounded holder */}
            <Form onSubmit={handleSubmit} noValidate className='p-4 holder border bg-white rounded-4 shadow-sm'>
                {/* Error Alerts */}
                {error && !Object.keys(validationErrors).length && <Alert variant="danger">{error}</Alert>}
                {Object.keys(validationErrors).length > 0 && <Alert variant="warning" className="small py-2">Veuillez corriger les erreurs.</Alert>}

                {/* --- Marche Public Selection --- */}
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
                        placeholder="Sélectionner un marché..."
                        isDisabled={loadingMarcheOptions || isSubmitting} // Disable while loading/submitting
                        isClearable={false}
                        styles={customSelectStyles(!!validationErrors.marche_id)}
                        aria-invalid={!!validationErrors.marche_id}
                        aria-describedby="marche_id_feedback"
                    />
                    {validationErrors.marche_id && <div id="marche_id_feedback" className="d-block invalid-feedback">{validationErrors.marche_id[0]}</div>}
                </Form.Group>

                 {/* --- Row for Type and Numero --- */}
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
                             isDisabled={isSubmitting}
                             isClearable={false}
                             styles={customSelectStyles(!!validationErrors.type)}
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
                             disabled={isSubmitting}
                             className='form-control-style shadow-sm form-control-rounded'
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
                         disabled={isSubmitting}
                         className='form-control-style shadow-sm form-control-rounded'
                         aria-describedby="date_emission_feedback"
                     />
                     <Form.Control.Feedback id="date_emission_feedback" type="invalid">{validationErrors.date_emission?.[0]}</Form.Control.Feedback>
                 </Form.Group>

                {/* --- Fonctionnaire Selection --- <<< NEW FIELD */}
                <Form.Group className="mb-3">
                    <Form.Label htmlFor="fonctionnaire_select">
                        <FontAwesomeIcon icon={faUserTie} className="me-1" /> Points Focaux
                    </Form.Label>
                    <Select
                        inputId="fonctionnaire_select"
                        name="id_fonctionnaire" // Matches the state key
                        options={fonctionnaireOptions}
                        value={formData.id_fonctionnaire} // Bind to state
                        onChange={handleSelectChange} // Use the same handler
                        placeholder={loadingFonctionnaireOptions ? "Chargement..." : "Sélectionner un fonctionnaire..."}
                        isLoading={loadingFonctionnaireOptions}
                        isDisabled={loadingFonctionnaireOptions || isSubmitting}
                        isClearable={true} // Allow clearing the selection
                        isSearchable={true} // Allow searching
                        styles={customSelectStyles(!!validationErrors.id_fonctionnaire)} // Handle potential validation errors
                        aria-invalid={!!validationErrors.id_fonctionnaire}
                        aria-describedby="id_fonctionnaire_feedback"
                    />
                    {validationErrors.id_fonctionnaire && <div id="id_fonctionnaire_feedback" className="d-block invalid-feedback">{validationErrors.id_fonctionnaire[0]}</div>}
                </Form.Group>
                {/* --- End Fonctionnaire Selection --- */}


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
                         disabled={isSubmitting}
                         className='form-control-style shadow-sm form-control-rounded'
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
                          disabled={isSubmitting}
                          className="d-none" // Keep hiding default input
                          aria-describedby="fichier_joint_feedback"
                      />
                      {/* Custom File Display Area */}
                      <div className="border p-2 rounded bg-light form-control-style">
                          {/* Display Existing File Info */}
                          {isEditMode && existingFileInfo && !selectedFile && (
                               <Stack direction="horizontal" gap={2} className="align-items-center">
                                   <Badge pill bg="info" text="dark" className="d-flex align-items-center p-2 shadow-sm">
                                      <span className='me-2 text-truncate' style={{ maxWidth: '250px' }} title={existingFileInfo.name}>
                                           {existingFileInfo.name}
                                       </span>
                                       <a href={getPublicFileUrl(baseApiUrl, existingFileInfo.path)} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary border-0 p-0 px-1 me-1" title="Voir le fichier actuel">
                                           <FontAwesomeIcon icon={faEye} size="xs"/>
                                       </a>
                                       <Button variant="close" size="sm" aria-label="Supprimer existant" className="p-0" onClick={markExistingFileForDeletion} title="Marquer pour suppression" disabled={isSubmitting}></Button>
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
                                       <Button variant="close" size="sm" aria-label="Retirer nouveau" className="btn-close-white p-0" onClick={removeNewFile} title="Retirer ce fichier" disabled={isSubmitting}></Button>
                                   </Badge>
                               </Stack>
                           )}
                           {/* Show Upload Button */}
                           {!selectedFile && (!isEditMode || !existingFileInfo) && (
                                <Button variant="outline-warning" size="sm" className="rounded-5" onClick={() => document.getElementById('fichier_joint_input')?.click()} disabled={isSubmitting}>
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
                     <Button variant="danger" onClick={onClose} className="me-3 rounded-5 px-5" disabled={isSubmitting}>
                         Annuler
                     </Button>
                     {/* Apply rounded button style */}
                     <Button variant="primary" type="submit" disabled={isLoading || isSubmitting || loadingMarcheOptions || loadingFonctionnaireOptions} className="rounded-5 px-5">
                         {/* Spinner during actual submission */}
                         {isSubmitting ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-1"/> : null}
                         {isSubmitting ? 'Sauvegarde...' : (isEditMode ? 'Enregistrer Modifications' : 'Créer Ordre')}
                     </Button>
                 </div>
             </Form>
         </div> // End outer padding div
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