import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import Select from 'react-select';

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

const AlertTypeForm = ({ itemId, onClose, onItemCreated, onItemUpdated, baseApiUrl }) => {
    const isEditing = useMemo(() => !!itemId, [itemId]);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permission_name: null, // Will hold the selected option object
    });
    const [allPermissions, setAllPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                // Fetch all available permissions for the dropdown
                const permsResponse = await axios.get(`${baseApiUrl}/permissions`);
                const groupedPerms = permsResponse.data.permissionsGrouped || {};
                const flatPerms = Object.values(groupedPerms).flat().map(p => ({ value: p.name, label: p.name })).sort((a, b) => a.label.localeCompare(b.label));

                if (!isMounted) return;
                setAllPermissions(flatPerms);

                // If editing, fetch the specific alert type's data
                if (isEditing) {
                    const itemResponse = await axios.get(`${baseApiUrl}/alert-types/${itemId}`);
                    const itemData = itemResponse.data.alert_type;
                    if (isMounted) {
                        setFormData({
                            name: itemData.name,
                            description: itemData.description,
                            permission_name: flatPerms.find(p => p.value === itemData.permission_name) || null,
                        });
                    }
                }
            } catch (err) {
                console.error("Error fetching data for AlertTypeForm", err);
                if (isMounted) setError("Erreur de chargement des données.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [itemId, isEditing, baseApiUrl]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleSelectChange = (selectedOption) => {
        setFormData(prev => ({ ...prev, permission_name: selectedOption }));
        setFormErrors(prev => ({ ...prev, permission_name: null }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setFormErrors({});

        const payload = {
            name: formData.name,
            description: formData.description,
            permission_name: formData.permission_name?.value || '', // Send only the value
        };

        const url = isEditing ? `${baseApiUrl}/alert-types/${itemId}` : `${baseApiUrl}/alert-types`;
        const method = isEditing ? 'put' : 'post';

        try {
            const response = await axios({ method, url, data: payload });
            const savedItem = response.data.alert_type;

            if (isEditing) {
                onItemUpdated(savedItem);
            } else {
                onItemCreated(savedItem);
            }
            onClose();
        } catch (err) {
            const errData = err.response?.data;
            if (err.response?.status === 422) {
                setFormErrors(errData.errors || {});
                setError("Veuillez corriger les erreurs de validation.");
            } else {
                setError(errData?.message || "Une erreur est survenue lors de l'enregistrement.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="text-center p-5"><Spinner animation="border" /> Chargement...</div>;
    }

    return (
        <Form onSubmit={handleSubmit} noValidate>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Row>
                <Col md={12}>
                    <Form.Group className="mb-3" controlId="name">
                        <Form.Label className="w-100">{bilingualLabel("Nom Unique (machine-readable)", "الاسم الفريد (قابل للقراءة آلياً)", true)}</Form.Label>
                        <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            isInvalid={!!formErrors.name}
                            placeholder="Ex: convention_expiring_soon"
                        />
                        <Form.Control.Feedback type="invalid">{formErrors.name?.[0]}</Form.Control.Feedback>
                    </Form.Group>
                </Col>
                <Col md={12}>
                    <Form.Group className="mb-3" controlId="description">
                        <Form.Label className="w-100">{bilingualLabel("Description", "الوصف")}</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            isInvalid={!!formErrors.description}
                            placeholder="Description pour les administrateurs"
                        />
                        <Form.Control.Feedback type="invalid">{formErrors.description?.[0]}</Form.Control.Feedback>
                    </Form.Group>
                </Col>
                <Col md={12}>
                    <Form.Group className="mb-3" controlId="permission_name">
                        <Form.Label className="w-100">{bilingualLabel("Permission Requise", "الإذن المطلوب")}</Form.Label>
                        <Select
                            options={allPermissions}
                            value={formData.permission_name}
                            onChange={handleSelectChange}
                            placeholder="Sélectionner une permission..."
                            isClearable
                            className={formErrors.permission_name ? 'is-invalid' : ''}
                        />
                         {formErrors.permission_name && <div className="invalid-feedback d-block">{formErrors.permission_name[0]}</div>}
                    </Form.Group>
                </Col>
            </Row>

            <div className="text-end mt-3">
                <Button variant="secondary" onClick={onClose} className="me-2" disabled={submitting}>
                    Annuler
                </Button>
                <Button variant="primary" type="submit" disabled={submitting}>
                    {submitting ? <Spinner as="span" animation="border" size="sm" /> : (isEditing ? 'Enregistrer' : 'Créer')}
                </Button>
            </div>
        </Form>
    );
};

AlertTypeForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func.isRequired,
    onItemUpdated: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

export default AlertTypeForm;