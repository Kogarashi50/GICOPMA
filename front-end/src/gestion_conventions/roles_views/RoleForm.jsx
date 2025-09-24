// src/gestion_conventions/roles_views/RoleForm.jsx (Updated with baseApiUrl)
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios'; // Using axios
import {
    Form, Button, Row, Col, Alert, Spinner, FormCheck
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faExclamationTriangle, faSpinner, faSave, faTimes, faPlus,
    faShieldAlt, faCheckCircle, faListCheck // faSquareCheck, faSquare removed as not used
} from '@fortawesome/free-solid-svg-icons';

// --- Display Name Mapping ---
const GROUP_NAME_MAP = {
    'Domaines': 'Axes Stratégiques',
    // You can add other name overrides here in the future
    // e.g., 'Utilisateurs': 'Gestion des Accès'
};

// --- Helper to format permission labels for display ---
const formatPermissionLabel = (permissionName) => {
    return permissionName.replace(/\bdomaines\b/g, 'axes stratégiques');
};

// --- Sidebar Order Constant ---
const SIDEBAR_ORDER = [ /* ... Keep your existing order ... */
    'Dashboard', 'Conventions', 'Partenaires', 'Chantiers', 'Programmes', 'Domaines',
    'Projets', 'Sousprojets', 'Engagements', 'Communes', 'Provinces', 'Marches',
    'Bon de Commande', 'Contrat Droit Commun', 'Utilisateurs', 'Rôles'
];
const DASHBOARD_PERMISSION_GROUP = 'Dashboard';
const DASHBOARD_VIEW_PERMISSION = 'view dashboard';

// --- The RoleForm Component ---
const RoleForm = ({
    itemId = null,
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl // <<< ADDED: Received from props or defaultProps
}) => {
    // --- Keep existing state variables ---
    const isEditing = itemId !== null;
    const isMountedRef = useRef(true); // Use ref for mount status
    const [roleName, setRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState(new Set());
    const [allPermissionsGrouped, setAllPermissionsGrouped] = useState({});
    const [orderedPermissionGroups, setOrderedPermissionGroups] = useState([]);
    const [loadingPermissions, setLoadingPermissions] = useState(true);
    const [loadingRoleData, setLoadingRoleData] = useState(isEditing);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: null });
    const [formErrors, setFormErrors] = useState({});
    const allPermissionNames = useMemo(() => Object.values(allPermissionsGrouped).flat().map(p => p.name), [allPermissionsGrouped]);

    // --- Fetch Permissions (Using baseApiUrl) ---
    const fetchPermissions = useCallback(async () => {
        if (!baseApiUrl) { // Check if URL is available
            console.error("RoleForm: Base API URL missing for fetching permissions.");
            if (isMountedRef.current) setSubmissionStatus(p => ({ ...p, loading: false, error: "Erreur configuration: URL API manquante." }));
            setLoadingPermissions(false); return;
        }
        setLoadingPermissions(true);
        try {
            // *** CHANGED: Use baseApiUrl ***
            const r = await axios.get(`${baseApiUrl}/permissions`);
            if (isMountedRef.current) {
                const fg = r.data.permissionsGrouped || {};
                setAllPermissionsGrouped(fg);
                const o = []; const gk = Object.keys(fg);
                SIDEBAR_ORDER.forEach(k => { if (fg[k]) o.push({ groupName: k, permissions: fg[k] }); });
                gk.forEach(k => { if (!SIDEBAR_ORDER.includes(k) && fg[k]) o.push({ groupName: k, permissions: fg[k] }); });
                setOrderedPermissionGroups(o);
                // Set default view dashboard permission for create mode
                if (!isEditing) {
                    const dp = fg[DASHBOARD_PERMISSION_GROUP]?.filter(p => p.name === DASHBOARD_VIEW_PERMISSION).map(p => p.name) || [];
                    setSelectedPermissions(new Set(dp));
                }
            }
        } catch (e) {
            console.error("RoleForm: Error fetching permissions", e);
            if (isMountedRef.current) setSubmissionStatus(p => ({ ...p, loading: false, error: "Erreur chargement permissions." }));
        } finally {
            if (isMountedRef.current) setLoadingPermissions(false);
        }
    // *** ADDED baseApiUrl dependency ***
    }, [isEditing, baseApiUrl]);

    // --- Fetch Existing Role Data (Using baseApiUrl) ---
    const fetchRoleData = useCallback(async (id) => {
        if (!id) return;
        if (!baseApiUrl) { // Check if URL is available
            console.error("RoleForm: Base API URL missing for fetching role data.");
            if (isMountedRef.current) setSubmissionStatus(p => ({ ...p, loading: false, error: "Erreur configuration: URL API manquante." }));
            setLoadingRoleData(false); return;
        }
        setLoadingRoleData(true);
        setSubmissionStatus({ loading: false, error: null, success: null });
        setFormErrors({});
        try {
            // *** CHANGED: Use baseApiUrl ***
            const r = await axios.get(`${baseApiUrl}/roles/${id}`);
            const d = r.data.role;
            if (!d) throw Error("Rôle non trouvé.");
            if (isMountedRef.current) {
                setRoleName(d.name ?? '');
                setSelectedPermissions(new Set(d.permissions?.map(p => p.name) || []));
            }
        } catch (e) {
            console.error("RoleForm: Error fetching role data", e);
            const m = e.response?.data?.message || e.message || "Erreur chargement rôle.";
            if (isMountedRef.current) setSubmissionStatus(p => ({ ...p, loading: false, error: m }));
        } finally {
            if (isMountedRef.current) setLoadingRoleData(false);
        }
    // *** ADDED baseApiUrl dependency ***
    }, [baseApiUrl]);

    // --- Effects (Keep existing logic, dependencies handled by useCallback) ---
    useEffect(() => {
        isMountedRef.current = true;
        fetchPermissions(); // Fetch permissions on mount
        return () => { isMountedRef.current = false; };
    }, [fetchPermissions]); // Depends on fetchPermissions callback

    useEffect(() => {
        // Fetch role data only when editing, permissions are loaded, and itemId exists
        if (isEditing && !loadingPermissions && itemId) {
            fetchRoleData(itemId);
        } else if (!isEditing && !loadingPermissions) {
            // Ensure loading state is false for create mode once permissions are loaded
            setLoadingRoleData(false);
        }
        // Dependencies ensure this runs when relevant state changes
    }, [isEditing, itemId, loadingPermissions, fetchRoleData]);

    // --- Handlers (Keep existing: handleNameChange, handlePermissionChange, etc.) ---
    const handleNameChange = (e) => { setRoleName(e.target.value); if (formErrors.name) setFormErrors(p => ({ ...p, name: undefined })); };
    const handlePermissionChange = (name, checked) => { setSelectedPermissions(p => { const n = new Set(p); checked ? n.add(name) : n.delete(name); return n; }); if (formErrors.permissions) setFormErrors(p => ({ ...p, permissions: undefined })); };
    const handleSelectAllGroup = (perms, checked) => { setSelectedPermissions(p => { const n = new Set(p); perms.forEach(pm => checked ? n.add(pm.name) : n.delete(pm.name)); return n; }); if (formErrors.permissions) setFormErrors(p => ({ ...p, permissions: undefined })); };
    const handleSelectAllPermissions = (selAll) => { setSelectedPermissions(selAll ? new Set(allPermissionNames) : new Set()); if (formErrors.permissions) setFormErrors(p => ({ ...p, permissions: undefined })); };

    // --- Validation (Keep existing) ---
    const validateForm = () => { const e = {}; if (!roleName.trim()) e.name = "Nom requis."; setFormErrors(e); return Object.keys(e).length === 0; };

    // --- Submit Handler (Using baseApiUrl) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!baseApiUrl) { // Check URL before submitting
             console.error("RoleForm: Base API URL missing for submitting role.");
             setSubmissionStatus({ loading: false, error: "Erreur configuration: URL API manquante.", success: null }); return;
        }
        if (!validateForm()) { setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs.", success: null }); return; }

        setSubmissionStatus({ loading: true, error: null, success: null });
        setFormErrors({});

        const data = { name: roleName.trim(), permissions: Array.from(selectedPermissions) };
        // *** CHANGED: Construct URL using baseApiUrl ***
        // Assumes baseApiUrl includes /api
        const url = isEditing ? `${baseApiUrl}/roles/${itemId}` : `${baseApiUrl}/roles`;
        const method = isEditing ? 'put' : 'post';

        console.log(`RoleForm: Submitting ${method.toUpperCase()} request to ${url}`);

        try {
            const r = await axios({ method, url, data });
            const msg = r.data.message || (isEditing ? 'Rôle mis à jour !' : 'Rôle créé !');
            setSubmissionStatus({ loading: false, error: null, success: msg });

            // Call appropriate callback
            if (isEditing && onItemUpdated) { onItemUpdated(r.data.role); } // Pass updated role back if needed
            else if (!isEditing && onItemCreated) { onItemCreated(r.data.role); } // Pass created role back if needed

            // Close after delay on success
            setTimeout(() => { if (isMountedRef.current) onClose(); }, 1500);

        } catch (err) {
            console.error("RoleForm: Error submitting role", err.response || err);
            let msg = `Erreur soumission.`;
            const be = {};
            if (err.response) {
                 const s = err.response.status; const d = err.response.data;
                 if (s === 422 && typeof d.errors === 'object') { /* Keep validation error mapping */ msg = "Validation."; if (d.errors.name) be.name = d.errors.name.join(', '); if (d.errors.permissions) be.permissions = d.errors.permissions.join(', '); }
                 else if (d?.message) { msg = d.message; }
                 msg += ` (S:${s})`;
            } else if (err.request) { msg = "Aucune réponse serveur."; } else { msg = err.message; }
            if (isMountedRef.current) { setFormErrors(be); setSubmissionStatus({ loading: false, error: msg, success: null }); }
        }
    };

    // Calculate if all permissions are selected
    const areAllSelected = useMemo(() => allPermissionNames.length > 0 && selectedPermissions.size === allPermissionNames.length, [selectedPermissions, allPermissionNames]);

    // --- Render Loading State (Keep existing) ---
    if (loadingPermissions || loadingRoleData) { /* ... Keep existing loading spinner ... */
         return ( <div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '300px' }}> <Spinner animation="border" variant="primary" role="status" aria-hidden="true" /> <span className='ms-3 text-muted fs-6'>Chargement...</span> </div> );
    }

    // --- Render Form (Keep existing structure and styling) ---
    return (
        // Keep existing wrapper and styling classes
        <div className="role-form-wrapper px-3" style={{ maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
            <div className="p-3 p-md-4 role-form-convention-style">
                <Form noValidate onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-4"> 
                        <h5 className="mb-0 text-dark fw-bold"> 
                            <FontAwesomeIcon icon={faShieldAlt} className="me-2 text-primary" /> {isEditing ? `Modifier` : 'Créer'} Rôle {isEditing && roleName && <span className="text-muted fw-normal ms-2">({roleName})</span>} 
                            </h5>
                              <Button variant="warning" size="sm" onClick={onClose} className="btn rounded-5 px-5 py-2 bg-warning text-dark shadow-sm fw-bold" aria-label="Fermer">
                                                Revenir a la liste
                                            </Button>
                                         </div>
                    {/* Alerts */}
                    {submissionStatus.error && ( <Alert variant="danger" className="d-flex align-items-center py-2 mb-3 small"> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> {submissionStatus.error} </Alert> )}
                    {submissionStatus.success && ( <Alert variant="success" className="d-flex align-items-center py-2 mb-3 small"> <FontAwesomeIcon icon={faCheckCircle} className="me-2" /> {submissionStatus.success} </Alert> )}
                    {/* Role Name Field */}
                    <div className="form-section mb-4"> <Row> <Col md={6} className="mb-3"> <Form.Group controlId="roleName"> <Form.Label className="form-label-custom">Nom <span className="text-danger">*</span></Form.Label> <Form.Control type="text" name="name" value={roleName} onChange={handleNameChange} isInvalid={!!formErrors.name} required size="sm" placeholder="Nom unique" className="form-control-custom rounded-5 shadow-sm p-2" /> <Form.Control.Feedback type="invalid">{formErrors.name}</Form.Control.Feedback> </Form.Group> </Col> </Row> </div>
                    {/* Permissions Section */}
                    <div className="form-section mb-4">
                         <div className="d-flex justify-content-between align-items-center mb-3">
                             <h6 className="mb-0 fw-bold section-title" style={{ borderBottom: 'none', paddingBottom: 0 }}> <FontAwesomeIcon icon={faListCheck} className="me-2" /> Permissions </h6>
                             {/* Global Select All Switch */}
                             {allPermissionNames.length > 0 && ( <FormCheck type="switch" id="global-select-all-switch" label="Tout Sélectionner" className="small global-select-all-switch" checked={areAllSelected} onChange={() => handleSelectAllPermissions(!areAllSelected)} title={areAllSelected ? "Désélectionner tout" : "Sélectionner tout"} /> )}
                         </div>
                         {/* Permissions Groups */}
                         {orderedPermissionGroups.length > 0 ? ( orderedPermissionGroups.map(({ groupName, permissions: groupPermissions }, index) => { const allGroupSelected = groupPermissions.every(perm => selectedPermissions.has(perm.name)); const sanitizedGroupName = groupName.replace(/\s+/g, '-'); return ( <div key={groupName} className={`permission-group mb-3 pb-3 ${index < orderedPermissionGroups.length - 1 ? 'border-bottom-dashed' : ''}`}> <div className="d-flex justify-content-between align-items-center mb-2"> <h6 className="mb-0 fw-semibold permission-group-title">{GROUP_NAME_MAP[groupName] || groupName}</h6> <FormCheck type="switch" id={`select-all-${sanitizedGroupName}`} label="Tout" className="small select-all-perm-group" checked={allGroupSelected} onChange={(e) => handleSelectAllGroup(groupPermissions, e.target.checked)} title={`Tout ${groupName}`} /> </div> <Row xs={1} sm={2} md={3} lg={4} className="g-2 permission-list"> {groupPermissions.map(permission => ( <Col key={permission.id}> <FormCheck type="switch" id={`perm-${permission.id}`} label={formatPermissionLabel(permission.name)} className="small permission-item" checked={selectedPermissions.has(permission.name)} onChange={(e) => handlePermissionChange(permission.name, e.target.checked)} title={permission.name} /> </Col> ))} </Row> </div> ); }) ) : ( <div className="text-muted text-center p-3 border rounded bg-light">Aucune permission disponible.</div> )}
                         {formErrors.permissions && ( <div className="d-block invalid-feedback mt-1 small">{formErrors.permissions}</div> )}
                    </div>
                    {/* Footer Actions */}
                    <Row className="mt-4 pt-3 border-top justify-content-end flex-shrink-0">
                         <Col xs="auto"> <Button variant="secondary" onClick={onClose} className="btn-custom-secondary px-4" disabled={submissionStatus.loading}> <FontAwesomeIcon icon={faTimes} className="me-1" /> Annuler </Button> </Col>
                         <Col xs="auto"> <Button variant="primary" type="submit" className="btn-custom-primary px-4" disabled={submissionStatus.loading || !!submissionStatus.success}> {submissionStatus.loading ? <Spinner as="span" animation="border" size="sm" className="me-2" /> : <FontAwesomeIcon icon={isEditing ? faSave : faPlus} className="me-1" /> } {submissionStatus.loading ? 'Enreg...' : (isEditing ? 'Enregistrer' : 'Créer')} </Button> </Col>
                    </Row>
                </Form>
            </div>
        </div>
    );
};

// --- PropTypes & DefaultProps ---
RoleForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    // *** baseApiUrl is optional due to defaultProps ***
    baseApiUrl: PropTypes.string,
};

RoleForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {}, // Default empty function
    onItemUpdated: () => {}, // Default empty function
    // *** ADDED: Default baseApiUrl (including /api) ***
    baseApiUrl: 'http://localhost:8000/api',
};

export default RoleForm;

// --- Required CSS (Keep existing styles) ---
/*
// ... Keep all your existing CSS styles for layout, switches, buttons, etc. ...
// Make sure the switch styles (`.form-check-input:checked[type=switch]`) are present
// Make sure the custom button styles (`.btn-custom-primary`, `.btn-custom-secondary`) are defined
// Make sure the layout styles (`.role-form-wrapper`, `.role-form-convention-style`, etc.) are defined
*/