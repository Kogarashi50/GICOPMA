// src/gestion_conventions/users_views/UserForm.jsx (Updated for Consistency)

import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Using axios
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import Select from 'react-select'; // Use react-select for dropdowns
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Link } from 'react-router-dom';
import { faExclamationTriangle, faSpinner, faPlus } from '@fortawesome/free-solid-svg-icons';

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

// Styles for react-select (Keep your existing styles)
const selectStyles = {
    control: (provided, state) => ({
        ...provided, minHeight: '38px',
         boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none',
         borderColor: state.isFocused ? '#86b7fe' : '#ced4da',
         backgroundColor: state.isDisabled ? '#e9ecef' : provided.backgroundColor,
    }),
     menu: (provided) => ({ ...provided, zIndex: 1055 }), // Ensure dropdown appears above other elements
     option: (provided, state) => ({
         ...provided,
         backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null,
         color: state.isSelected ? 'white' : 'black',
         ':active': { // Style for when option is clicked
            ...provided[':active'],
            backgroundColor: !state.isDisabled ? (state.isSelected ? provided.backgroundColor : '#d0e7ff') : undefined,
         },
    }),
};


// Static options for the status dropdown
const statusOptions = [
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
    { value: 'suspended', label: 'Suspendu' },
];


const UserForm = ({
    itemId = null,
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl // <<< Received from props or defaultProps
}) => {
    const isEditing = itemId !== null;

    // Keep existing state variables
    const [formData, setFormData] = useState({
        email: '', status: null, fonctionnaire_id: null, role: null, password: '', password_confirmation: '',
    });
    const [fonctionnaireOptions, setFonctionnaireOptions] = useState([]);
    const [loadingFonctionnaires, setLoadingFonctionnaires] = useState(false);
    const [roleOptions, setRoleOptions] = useState([]);
    const [loadingRoles, setLoadingRoles] = useState(false);
    const [loadingData, setLoadingData] = useState(isEditing);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});

    // --- Fetch Fonctionnaire Options (Using baseApiUrl) ---
    useEffect(() => {
        let isMounted = true;
        const fetchFonctionnaires = async () => {
             if (!baseApiUrl) { // Check if baseApiUrl is available
                 console.error("UserForm: Base API URL missing for fetching fonctionnaires.");
                 if (isMounted) setFormErrors(prev => ({...prev, fonctionnaire_id: "Erreur config: URL API manquante."}));
                 setLoadingFonctionnaires(false); return;
             }
             setLoadingFonctionnaires(true);
             setFormErrors(prev => ({...prev, fonctionnaire_id: undefined})); // Clear specific error
             try {
                 // *** CHANGED: Use baseApiUrl ***
                 // Assumes baseApiUrl includes /api
                 const response = await axios.get(`${baseApiUrl}/options/fonctionnaires`);
                 const data = response.data.fonctionnaires || response.data || [];
                 if (isMounted) {
                     setFonctionnaireOptions(data.map(f => ({ value: f.id, label: f.nom_complet || `ID: ${f.id}` })));
                 }
             } catch (err) {
                  console.error("Erreur chargement fonctionnaires:", err);
                  if (isMounted) setFormErrors(prev => ({...prev, fonctionnaire_id: "Impossible de charger les fonctionnaires."}));
             } finally {
                  if (isMounted) setLoadingFonctionnaires(false);
             }
         };
         fetchFonctionnaires();
         return () => { isMounted = false; };
     // *** ADDED baseApiUrl dependency ***
     }, [baseApiUrl]);

     // --- Fetch Role Options (Using baseApiUrl) ---
     useEffect(() => {
        let isMounted = true;
        const fetchRoles = async () => {
             if (!baseApiUrl) { // Check if baseApiUrl is available
                 console.error("UserForm: Base API URL missing for fetching roles.");
                 if (isMounted) setFormErrors(prev => ({...prev, role: "Erreur config: URL API manquante."}));
                 setLoadingRoles(false); return;
             }
             setLoadingRoles(true);
             setFormErrors(prev => ({...prev, role: undefined})); // Clear specific error
             try {
                 // *** CHANGED: Use baseApiUrl ***
                 // Assumes baseApiUrl includes /api
                 const response = await axios.get(`${baseApiUrl}/roles`);
                 const data = response.data.roles || response.data || []; // Expecting { roles: [...] }
                 if (isMounted) {
                    setRoleOptions(data.map(r => ({ value: r.id, label: r.name })));
                 }
             } catch (err) {
                  console.error("Erreur chargement roles:", err);
                  if (isMounted) setFormErrors(prev => ({...prev, role: "Impossible de charger les rôles."}));
             } finally {
                  if (isMounted) setLoadingRoles(false);
             }
        };
        fetchRoles();
        return () => { isMounted = false; };
     // *** ADDED baseApiUrl dependency ***
    }, [baseApiUrl]);

    // --- Fetch Existing User Data for Editing (Using baseApiUrl) ---
    useEffect(() => {
        if (!isEditing) {
             // Reset form state (keep existing logic)
             setFormData({ email: '', status: null, fonctionnaire_id: null, role: null, password: '', password_confirmation: '' });
             setFormErrors({}); setLoadingData(false); setSubmissionStatus({ loading: false, error: null, success: false });
             return;
        }
        if (loadingFonctionnaires || loadingRoles) return; // Wait for options
        if (!baseApiUrl) { // Check if baseApiUrl is available
            console.error("UserForm: Base API URL missing for fetching user data.");
            setSubmissionStatus({ loading: false, error: "Erreur config: URL API manquante.", success: false });
            setLoadingData(false); return;
        }

        let isMounted = true;
        const fetchUserData = async () => {
            setLoadingData(true); setSubmissionStatus({loading:false, error:null, success:false}); setFormErrors({});
            try {
                // *** CONFIRMED: Already using baseApiUrl ***
                const response = await axios.get(`${baseApiUrl}/users/${itemId}`);
                const data = response.data;
                if (!data) throw new Error("Utilisateur non trouvé.");

                if (isMounted) {
                    // Keep existing logic to find options
                    const findOption = (options, value) => options.find(opt => opt.value === value) || null;
                    const findRoleOptionByName = (options, roleName) => options.find(opt => opt.label === roleName) || null;
                    const userRoleName = data.roles?.[0]?.name;

                    setFormData({
                        email: data.email ?? '',
                        status: findOption(statusOptions, data.status),
                        fonctionnaire_id: findOption(fonctionnaireOptions, data.fonctionnaire_id),
                        role: findRoleOptionByName(roleOptions, userRoleName),
                        password: '', password_confirmation: '',
                    });
                }
            } catch (err) {
                console.error("Erreur chargement données utilisateur:", err);
                if (isMounted) setSubmissionStatus({ loading: false, error: err.response?.data?.message || err.message || "Erreur chargement.", success: false });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };

        // Fetch only when options are ready AND baseApiUrl exists
        if (!loadingFonctionnaires && !loadingRoles) {
             fetchUserData();
        }

        return () => { isMounted = false };
    // Depend on options being ready and baseApiUrl
    }, [itemId, isEditing, baseApiUrl, fonctionnaireOptions, roleOptions, loadingFonctionnaires, loadingRoles]);

    // --- Frontend Validation (Keep existing) ---
    const validateForm = () => { /* ... Keep existing validation logic ... */
        const errors = {};
        if (!formData.email?.trim()) errors.email = "L'email est requis.";
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Format d'email invalide.";
        if (!formData.status) errors.status = "Le statut est requis.";
        if (!formData.fonctionnaire_id) errors.fonctionnaire_id = "Le fonctionnaire est requis.";
        if (!formData.role) errors.role = "Le rôle est requis.";
        if (!isEditing && !formData.password) { errors.password = "Le mot de passe est requis."; }
        if (formData.password) {
             if (!formData.password_confirmation) { errors.password_confirmation = "Veuillez confirmer le mot de passe."; }
             else if (formData.password !== formData.password_confirmation) { errors.password_confirmation = "Les mots de passe ne correspondent pas."; }
             if (formData.password.length < 8) { errors.password = "Le mot de passe doit contenir au moins 8 caractères."; }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // --- Handlers (Keep existing) ---
    const handleChange = (e) => { /* ... Keep existing ... */
         const { name, value } = e.target;
         setFormData(prev => ({ ...prev, [name]: value }));
         if (name === 'password' || name === 'password_confirmation') { setFormErrors(prev => ({ ...prev, password: '', password_confirmation: '' })); }
         else if (formErrors[name]) { setFormErrors(prev => ({ ...prev, [name]: undefined })); }
    };
    const handleStatusChange = (selectedOption) => { /* ... Keep existing ... */
         setFormData(prev => ({ ...prev, status: selectedOption }));
         if (formErrors.status) { setFormErrors(prev => ({ ...prev, status: undefined })); }
    };
    const handleFonctionnaireChange = (selectedOption) => { /* ... Keep existing ... */
         setFormData(prev => ({ ...prev, fonctionnaire_id: selectedOption }));
         if (formErrors.fonctionnaire_id) { setFormErrors(prev => ({ ...prev, fonctionnaire_id: undefined })); }
    };
    const handleRoleChange = (selectedOption) => { /* ... Keep existing ... */
        setFormData(prev => ({ ...prev, role: selectedOption }));
        if (formErrors.role) { setFormErrors(prev => ({ ...prev, role: undefined })); }
   };

    // --- Submit Handler (Using baseApiUrl) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!baseApiUrl) { // Check baseApiUrl again before submit
            console.error("UserForm: Base API URL is missing in handleSubmit.");
            setSubmissionStatus({ loading: false, error: "Erreur config: URL API manquante.", success: false });
            return;
        }
        setSubmissionStatus({ loading: true, error: null, success: false });
        setFormErrors({});

        if (!validateForm()) {
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs.", success: false });
            return;
        }

        // Keep data preparation logic
        const dataToSubmit = {
            email: formData.email,
            status: formData.status ? formData.status.value : null,
            fonctionnaire_id: formData.fonctionnaire_id ? formData.fonctionnaire_id.value : null,
            role: formData.role ? formData.role.label : null, // Send role NAME
        };
        if (formData.password) { dataToSubmit.password = formData.password; }

        // *** CHANGED: Construct URL using baseApiUrl ***
        // Assumes baseApiUrl includes /api
        const url = isEditing ? `${baseApiUrl}/users/${itemId}` : `${baseApiUrl}/users`;
        const method = isEditing ? 'put' : 'post';

        console.log(`Submitting ${method.toUpperCase()} to ${url}`, dataToSubmit);

        try {
            // Use explicit method/url
            const response = await axios({ method, url, data: dataToSubmit });

            console.log(`API ${isEditing ? 'Update' : 'Create'} Response:`, response.data);
            setSubmissionStatus({ loading: false, error: null, success: true });

            // Call appropriate callback
            if (isEditing && onItemUpdated) { onItemUpdated(); } // Consider passing response.data if needed
            else if (!isEditing && onItemCreated) { onItemCreated(); } // Consider passing response.data if needed

        } catch (err) {
             // Keep existing error handling logic
             console.error(`Erreur lors de ${isEditing ? 'la modification' : 'la création'}:`, err.response || err);
             let errorMsg = `Une erreur s'est produite.`;
             if (err.response) { /* ... Keep existing backend error mapping ... */
                 if (err.response.status === 422 && typeof err.response.data.errors === 'object') {
                      errorMsg = "Erreurs de validation."; const backendErrors = err.response.data.errors; const frontendErrors = {};
                      if (backendErrors.email) frontendErrors.email = backendErrors.email.join(', ');
                      if (backendErrors.status) frontendErrors.status = backendErrors.status.join(', ');
                      if (backendErrors.fonctionnaire_id) frontendErrors.fonctionnaire_id = backendErrors.fonctionnaire_id.join(', ');
                      if (backendErrors.role) frontendErrors.role = backendErrors.role.join(', ');
                      if (backendErrors.password) frontendErrors.password = backendErrors.password.join(', ');
                      setFormErrors(frontendErrors);
                 } else if (err.response.data?.message) { errorMsg = err.response.data.message; }
                 else if (typeof err.response.data === 'string') { errorMsg = err.response.data; }
                 errorMsg += ` (Status: ${err.response.status})`;
             } else { errorMsg = err.message; }
             setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    // --- Render Loading State for Edit data fetch (Keep existing) ---
    if (isEditing && loadingData) { /* ... Keep existing ... */
         return ( <div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '200px' }}> <Spinner animation="border" variant="primary" /><span className='ms-3 text-muted'>Chargement...</span> </div> );
    }

    // --- Main Form Render (Keep existing structure) ---
    return (
        // Assuming this form is rendered within a modal or page container, no outer div needed here
        <Form noValidate onSubmit={handleSubmit} className='p-5 '>
                <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0">
                                        <div>
                                            <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier la' : 'Créer un nouveau'}</h5>
                                            <h2 className="mb-0 fw-bold">Utilisateur {isEditing ? `(ID: ${itemId                                                    
                                            })` : ''}</h2>
                                        </div>
                                        <Button variant="light" className='btn rounded-5 px-5 py-2 bg-warning shadow-sm' onClick={onClose} size="sm" title="Retour">
                                             <b>Revenir a la liste</b>
                                        </Button>
                                    </div>
            {/* Alerts */}
            {submissionStatus.error && !Object.keys(formErrors).length > 0 && ( <Alert variant="danger" className="mb-3 py-2"><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}</Alert> )}
            {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2">Opération réussie !</Alert> )}

            {/* Fields: Email, Status, Fonctionnaire, Role, Password */}
            {/* Keep the existing Row/Col structure and Form.Group/Form.Control/Select setup */}
            <Row className="mb-3">
                <Form.Group as={Col} md={6} controlId="userEmail"> <Form.Label className="small mb-1 w-100">{bilingualLabel("Email", "البريد الإلكتروني", true)}</Form.Label><Form.Control type="email" name="email" value={formData.email} onChange={handleChange} isInvalid={!!formErrors.email} required size="sm"/><Form.Control.Feedback type="invalid">{formErrors.email}</Form.Control.Feedback> </Form.Group>
                <Form.Group as={Col} md={6} controlId="userStatus"> <Form.Label className="small mb-1 w-100">{bilingualLabel("Statut", "الحالة", true)}</Form.Label><Select name="status" options={statusOptions} value={formData.status} onChange={handleStatusChange} styles={selectStyles} placeholder="- Sélectionner statut -" className={formErrors.status ? 'is-invalid' : ''} inputId="userStatusSelect"/> {formErrors.status && <div className="d-block invalid-feedback mt-n1 small">{formErrors.status}</div>} </Form.Group>
            </Row>
             <Row className="mb-3">
                 <Form.Group as={Col} md={12} controlId="userFonctionnaire"> <Form.Label className="small mb-1 w-100">{bilingualLabel("Fonctionnaire", "الموظف", true)}</Form.Label><Select name="fonctionnaire_id" options={fonctionnaireOptions} value={formData.fonctionnaire_id} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder={loadingFonctionnaires ? "Chargement..." : "- Sélectionner fonctionnaire -"} isLoading={loadingFonctionnaires} isClearable={false} className={formErrors.fonctionnaire_id ? 'is-invalid' : ''} inputId="userFonctionnaireSelect"/> {formErrors.fonctionnaire_id && <div className="d-block invalid-feedback mt-n1 small">{formErrors.fonctionnaire_id}</div>} </Form.Group>
            </Row>
            <Row className="mb-3">
                <Form.Group as={Col} md={12} controlId="userRole"> <Form.Label className="small mb-1 w-100">{bilingualLabel("Rôle", "الدور", true)}</Form.Label><Select name="role" options={roleOptions} value={formData.role} onChange={handleRoleChange} styles={selectStyles} placeholder={loadingRoles ? "Chargement..." : "- Sélectionner un rôle -"} isLoading={loadingRoles} isClearable={false} className={formErrors.role ? 'is-invalid' : ''} inputId="userRoleSelect"/> {formErrors.role && <div className="d-block invalid-feedback mt-n1 small">{formErrors.role}</div>} <div className="mt-1 text-end"><Link to="/roles" className="small text-muted text-decoration-none" title="Gérer les rôles"><FontAwesomeIcon icon={faPlus} size="xs" className="me-1"/>Créer/Gérer les rôles</Link></div> </Form.Group>
            </Row>
            <Row className="mb-4">
                 <Form.Group as={Col} md={6} controlId="userPassword"> <Form.Label className="small mb-1 w-100">{bilingualLabel(isEditing ? "Mot de passe (Laisser vide pour ne pas changer)" : "Mot de passe", isEditing ? "كلمة المرور (اتركها فارغة للاحتفاظ بالقديمة)" : "كلمة المرور", !isEditing)}</Form.Label><Form.Control type="password" name="password" value={formData.password} onChange={handleChange} isInvalid={!!formErrors.password} required={!isEditing} size="sm" placeholder={isEditing ? 'Nouveau mot de passe (min 8 caractères)' : 'Mot de passe (min 8 caractères)'} autoComplete="new-password" /><Form.Control.Feedback type="invalid">{formErrors.password}</Form.Control.Feedback> </Form.Group>
                 <Form.Group as={Col} md={6} controlId="userPasswordConfirmation"> <Form.Label className="small mb-1 w-100">{bilingualLabel("Confirmer Mot de passe", "تأكيد كلمة المرور", !!formData.password)}</Form.Label><Form.Control type="password" name="password_confirmation" value={formData.password_confirmation} onChange={handleChange} isInvalid={!!formErrors.password_confirmation || (!!formErrors.password && formErrors.password.includes('correspondent pas'))} required={!!formData.password} size="sm" placeholder="Confirmer le mot de passe" autoComplete="new-password"/><Form.Control.Feedback type="invalid">{formErrors.password_confirmation}</Form.Control.Feedback> </Form.Group>
            </Row>

            {/* Action Buttons (Keep existing structure) */}
            <div className="d-flex justify-content-end border-top pt-3 mt-3">
                <Button variant="danger" onClick={onClose} className="me-2 px-5" disabled={submissionStatus.loading}> Annuler </Button>
                <Button variant="primary" type="submit" className="px-5" disabled={submissionStatus.loading}>
                    {submissionStatus.loading ? <Spinner as="span" animation="border" size="sm" className="me-2"/> : null}
                    {isEditing ? 'Enregistrer' : 'Créer'}
                </Button>
            </div>
        </Form>
    );
};

// --- PropTypes ---
UserForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    // ** baseApiUrl is optional due to defaultProps **
    baseApiUrl: PropTypes.string,
};

// --- Default Props ---
UserForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {}, // Default no-op
    onItemUpdated: () => {}, // Default no-op
    // ** ADDED: Default baseApiUrl (including /api) **
    // ** Make sure this matches your actual required endpoint **
    baseApiUrl: 'http://localhost:8000/api',
};

export default UserForm;