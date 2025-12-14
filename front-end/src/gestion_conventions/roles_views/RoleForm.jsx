// src/gestion_conventions/roles_views/RoleForm.jsx

import React, { useState, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import {
    Form, Button, Row, Col, Alert, Spinner, FormCheck, Tabs, Tab
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSave, faTimes, faPlus, faShieldAlt, faListCheck, faBell, faCog
} from '@fortawesome/free-solid-svg-icons';

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

// --- (Constants and helpers remain the same) ---
const GROUP_NAME_MAP = { 'Domaines': 'Axes Stratégiques' };
const formatPermissionLabel = (permissionName) => permissionName.replace(/\bdomaines\b/g, 'axes stratégiques');
const SIDEBAR_ORDER = ['Dashboard', 'Conventions', 'Partenaires', 'Partenaire summary', 'Chantiers', 'Programmes', 'Domaines', 'Projets', 'Sousprojets', 'Engagements', 'Communes', 'Provinces', 'Marches', 'Bon de Commande', 'Contrat Droit Commun', 'Utilisateurs', 'Rôles', 'Secteurs'];
const DASHBOARD_PERMISSION_GROUP = 'Dashboard';
const DASHBOARD_VIEW_PERMISSION = 'view dashboard';
const isCrudPermission = (permissionName) => {
    const crudVerbs = ['create', 'view', 'update', 'delete'];
    const parts = permissionName.split(' ');
    return crudVerbs.includes(parts[0]);
};

const RoleForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated, baseApiUrl }) => {
    const isEditing = !!itemId;
    const isMountedRef = useRef(true);

    const [activeTab, setActiveTab] = useState('crud');
    const [roleName, setRoleName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState(new Set());
    
    const [orderedCrudGroups, setOrderedCrudGroups] = useState([]);
    const [orderedOtherGroups, setOrderedOtherGroups] = useState([]);
    const [allVisiblePermissions, setAllVisiblePermissions] = useState([]);

    const [allAlertTypes, setAllAlertTypes] = useState([]);
    const [selectedAlertTypes, setSelectedAlertTypes] = useState(new Set());

    const [loading, setLoading] = useState(true);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: null });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        isMountedRef.current = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const [permsRes, alertsRes] = await Promise.all([
                    axios.get(`${baseApiUrl}/permissions`),
                    axios.get(`${baseApiUrl}/alert-types`)
                ]);

                if (!isMountedRef.current) return;

                setAllAlertTypes(alertsRes.data.alert_types || []);
                const permissionsGrouped = permsRes.data.permissionsGrouped || {};
                
                const crudGroups = {};
                const otherGroups = {};
                const allPermsList = [];

                // --- MODIFICATION START: We no longer filter out alert-related permissions ---
                for (const groupName in permissionsGrouped) {
                    const permissions = permissionsGrouped[groupName];
                    
                    const crudPerms = permissions.filter(p => isCrudPermission(p.name));
                    const otherPerms = permissions.filter(p => !isCrudPermission(p.name));

                    if (crudPerms.length > 0) crudGroups[groupName] = crudPerms;
                    if (otherPerms.length > 0) otherGroups[groupName] = otherPerms;
                    
                    allPermsList.push(...permissions.map(p => p.name));
                }
                setAllVisiblePermissions(allPermsList);
                // --- MODIFICATION END ---

                const sortAndSet = (groups, setter) => {
                    const ordered = [];
                    const groupKeys = Object.keys(groups);
                    SIDEBAR_ORDER.forEach(key => { if (groups[key]) ordered.push({ groupName: key, permissions: groups[key] }); });
                    groupKeys.forEach(key => { if (!SIDEBAR_ORDER.includes(key) && !ordered.some(o => o.groupName === key)) ordered.push({ groupName: key, permissions: groups[key] }); });
                    setter(ordered);
                };

                sortAndSet(crudGroups, setOrderedCrudGroups);
                sortAndSet(otherGroups, setOrderedOtherGroups);
                
                if (isEditing) {
                    const roleRes = await axios.get(`${baseApiUrl}/roles/${itemId}`);
                    const roleData = roleRes.data.role;
                    if (isMountedRef.current) {
                        setRoleName(roleData.name ?? '');
                        setSelectedPermissions(new Set(roleData.permissions?.map(p => p.name) || []));
                        setSelectedAlertTypes(new Set(roleData.alert_type_ids || []));
                    }
                } else {
                    const dp = permissionsGrouped[DASHBOARD_PERMISSION_GROUP]?.find(p => p.name === DASHBOARD_VIEW_PERMISSION);
                    if (dp) setSelectedPermissions(new Set([dp.name]));
                }
            } catch (err) {
                console.error("RoleForm: Error fetching initial data", err);
                if (isMountedRef.current) setSubmissionStatus({ loading: false, error: "Erreur de chargement des données. Veuillez réessayer.", success: null });
            } finally {
                if (isMountedRef.current) setLoading(false);
            }
        };

        fetchData();
        return () => { isMountedRef.current = false; };
    }, [itemId, isEditing, baseApiUrl]);

    const eligibleAlertTypes = useMemo(() => {
        return allAlertTypes.filter(alertType => selectedPermissions.has(alertType.permission_name));
    }, [allAlertTypes, selectedPermissions]);

    const handleNameChange = (e) => setRoleName(e.target.value);
    const handlePermissionChange = (name, checked) => { setSelectedPermissions(p => { const n = new Set(p); checked ? n.add(name) : n.delete(name); return n; }); };
    const handleSelectAllGroup = (perms, checked) => { setSelectedPermissions(p => { const n = new Set(p); perms.forEach(pm => checked ? n.add(pm.name) : n.delete(pm.name)); return n; }); };
    const handleSelectAllPermissions = (selAll) => { setSelectedPermissions(selAll ? new Set(allVisiblePermissions) : new Set()); };
    const handleAlertTypeChange = (id, checked) => {
        setSelectedAlertTypes(prev => {
            const newSet = new Set(prev);
            checked ? newSet.add(id) : newSet.delete(id);
            return newSet;
        });
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmissionStatus({ loading: true, error: null, success: null });
        setFormErrors({});

        // --- MODIFICATION START: Simplified payload creation. The user is now in full control. ---
        const payload = {
            name: roleName.trim(),
            permissions: Array.from(selectedPermissions),
            alert_type_ids: Array.from(selectedAlertTypes),
        };
        // --- MODIFICATION END ---

        const url = isEditing ? `${baseApiUrl}/roles/${itemId}` : `${baseApiUrl}/roles`;
        const method = isEditing ? 'put' : 'post';
        try {
            const response = await axios({ method, url, data: payload });
            const msg = response.data.message || (isEditing ? 'Rôle mis à jour!' : 'Rôle créé!');
            setSubmissionStatus({ loading: false, error: null, success: msg });
            if (isEditing) onItemUpdated(response.data.role);
            else onItemCreated(response.data.role);
            setTimeout(() => { if (isMountedRef.current) onClose(); }, 1500);
        } catch (err) {
            const errData = err.response?.data;
            if (err.response?.status === 422) {
                setFormErrors(errData.errors || {});
                setSubmissionStatus({ loading: false, error: "Validation failed.", success: null });
            } else {
                setSubmissionStatus({ loading: false, error: errData?.message || "Submission error.", success: null });
            }
        }
    };

    if (loading) {
        return <div className="text-center p-5"><Spinner animation="border" variant="primary" /> Chargement...</div>;
    }

    const areAllPermissionsSelected = allVisiblePermissions.length > 0 && selectedPermissions.size >= allVisiblePermissions.length;

    const renderPermissionGroup = (group) => {
        const { groupName, permissions } = group;
        const allGroupSelected = permissions.every(perm => selectedPermissions.has(perm.name));
        return (
            <div key={groupName} className="permission-group mb-3 pb-3 border-bottom-dashed">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0 fw-semibold">{GROUP_NAME_MAP[groupName] || groupName}</h6>
                    <FormCheck type="switch" id={`select-all-${groupName}`} label="Tout" className="small" checked={allGroupSelected} onChange={(e) => handleSelectAllGroup(permissions, e.target.checked)} />
                </div>
                <Row xs={1} sm={2} md={3} lg={4} className="g-2">
                    {permissions.map(permission => (
                        <Col key={permission.id}><FormCheck type="switch" id={`perm-${permission.id}`} label={formatPermissionLabel(permission.name)} className="small" checked={selectedPermissions.has(permission.name)} onChange={(e) => handlePermissionChange(permission.name, e.target.checked)} /></Col>
                    ))}
                </Row>
            </div>
        );
    };

    return (
        <div className="role-form-wrapper px-3" style={{ maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
            <div className="p-3 p-md-4 role-form-convention-style">
                <Form noValidate onSubmit={handleSubmit}>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="mb-0 text-dark fw-bold">
                            <FontAwesomeIcon icon={faShieldAlt} className="me-2 text-primary" />
                            {isEditing ? `Modifier le Rôle` : 'Créer un Rôle'}
                        </h5>
                        <Button variant="light" onClick={onClose} className="btn rounded-5 px-5 py-2 bg-warning text-dark shadow-sm fw-bold">Retour</Button>
                    </div>

                    {submissionStatus.error && <Alert variant="danger">{submissionStatus.error}</Alert>}
                    {submissionStatus.success && <Alert variant="success">{submissionStatus.success}</Alert>}
                    
                    <Form.Group as={Row} className="mb-4" controlId="roleName">
                        <Form.Label column sm={2} className="w-100">{bilingualLabel("Nom du Rôle", "اسم الدور", true)}</Form.Label>
                        <Col sm={10}>
                            <Form.Control type="text" value={roleName} onChange={handleNameChange} isInvalid={!!formErrors.name} required placeholder="Nom unique" />
                            <Form.Control.Feedback type="invalid">{formErrors.name?.[0]}</Form.Control.Feedback>
                        </Col>
                    </Form.Group>
                    
                    <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} id="role-form-tabs" className="mb-3">
                        <Tab eventKey="crud" title={<><FontAwesomeIcon icon={faListCheck} className="me-2" />Permissions CRUD</>}>
                             <div className="p-3">{orderedCrudGroups.map(renderPermissionGroup)}</div>
                        </Tab>
                        <Tab eventKey="other" title={<><FontAwesomeIcon icon={faCog} className="me-2" />Autres Permissions</>}>
                            <div className="p-3">{orderedOtherGroups.map(renderPermissionGroup)}</div>
                        </Tab>
                        
                        <Tab eventKey="alerts" title={<><FontAwesomeIcon icon={faBell} className="me-2" />Abonnements aux Alertes</>}>
                             <div className='p-3'>
                                {isEditing ? (
                                    eligibleAlertTypes.length > 0 ? (
                                        <div className="permission-group">
                                            {eligibleAlertTypes.map(alertType => (
                                                <Row md={12} key={alertType.id} className="mb-2">
                                                    <Form.Check
                                                        type="switch"
                                                        id={`alert-type-${alertType.id}`}
                                                        label={<strong>{alertType.description}</strong>}
                                                        checked={selectedAlertTypes.has(alertType.id)}
                                                        onChange={(e) => handleAlertTypeChange(alertType.id, e.target.checked)}
                                                        className="small"
                                                    />
                                                </Row>
                                            ))}
                                        </div>
                                    ) : (
                                        <Alert variant="info">
                                            Pour activer les abonnements, veuillez d'abord accorder la permission "receive convention alerts" (ou similaire) dans l'onglet "Autres Permissions".
                                        </Alert>
                                    )
                                ) : (
                                    <Alert variant="warning">
                                        Veuillez d'abord créer et enregistrer le rôle. Vous pourrez ensuite modifier le rôle pour gérer les abonnements aux alertes.
                                    </Alert>
                                )}
                             </div>
                        </Tab>
                    </Tabs>

                    <Row className="mt-4 pt-3 border-top justify-content-between align-items-center">
                         <Col xs="auto">
                            {activeTab !== 'alerts' && allVisiblePermissions.length > 0 && 
                                <FormCheck 
                                    type="switch" 
                                    id="global-select-all-switch" 
                                    label="Tout Sélectionner" 
                                    checked={areAllPermissionsSelected} 
                                    onChange={() => handleSelectAllPermissions(!areAllPermissionsSelected)} 
                                />
                            }
                        </Col>
                        <Col xs="auto" className="d-flex justify-content-end">
                            <Button variant="secondary" onClick={onClose} disabled={submissionStatus.loading} className="me-2">Annuler</Button>
                            <Button variant="primary" type="submit" disabled={submissionStatus.loading || !!submissionStatus.success}>
                                {submissionStatus.loading ? <Spinner as="span" animation="border" size="sm" /> : <FontAwesomeIcon icon={isEditing ? faSave : faPlus} />}
                                {submissionStatus.loading ? ' Enregistrement...' : (isEditing ? ' Enregistrer' : ' Créer')}
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </div>
        </div>
    );
};

// --- (PropTypes and defaultProps remain the same) ---
RoleForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};
RoleForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {},
    onItemUpdated: () => {},
    baseApiUrl: 'http://localhost:8000/api',
};

export default RoleForm;