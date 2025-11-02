// src/gestion_conventions/alert_views/UserAlertSettingsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Spinner, Alert, Card, Form, Button, Row, Col } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faSave } from '@fortawesome/free-solid-svg-icons';

const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const UserAlertSettingsPage = () => {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const fetchSettings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${BASE_API_URL}/user-alert-settings`);
            setSettings(response.data.settings || []);
        } catch (err) {
            setError("Impossible de charger vos paramètres de notification.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const handleToggle = (id) => {
        setSettings(currentSettings =>
            currentSettings.map(setting =>
                setting.id === id ? { ...setting, subscribed: !setting.subscribed } : setting
            )
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await axios.put(`${BASE_API_URL}/user-alert-settings`, {
                subscriptions: settings
            });
            setSuccess("Vos paramètres ont été enregistrés avec succès.");
        } catch (err) {
            setError("Une erreur est survenue lors de l'enregistrement.");
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="text-center p-5"><Spinner animation="border" variant="primary" /> Chargement...</div>;
    }

    return (
        <div className="container-fluid px-4 py-3">
            <h3 className="mb-4"><FontAwesomeIcon icon={faBell} className="me-2" />Mes Paramètres de Notification</h3>
            
            <Card className="shadow-sm">
                <Card.Body>
                    <Card.Title>Gérer vos abonnements</Card.Title>
                    <Card.Text className="text-muted mb-4">
                        Votre administrateur vous a abonné par défaut aux alertes correspondant à votre rôle.
                        Vous pouvez vous désabonner ici des notifications que vous ne souhaitez pas recevoir.
                    </Card.Text>

                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}
                    
                    {settings.length > 0 ? (
                        <Form onSubmit={handleSubmit}>
                            {settings.map(setting => (
                                <Form.Check
                                    key={setting.id}
                                    type="switch"
                                    id={`alert-setting-${setting.id}`}
                                    checked={setting.subscribed}
                                    onChange={() => handleToggle(setting.id)}
                                    label={
                                        <div>
                                            <strong>{setting.name}</strong>
                                            <p className="text-muted small mb-0">{setting.description}</p>
                                        </div>
                                    }
                                    className="mb-3 p-3 border rounded"
                                />
                            ))}
                            <Row className="mt-4">
                                <Col className="text-end">
                                    <Button type="submit" variant="primary" disabled={saving}>
                                        {saving ? <Spinner as="span" size="sm" animation="border" className="me-2" /> : <FontAwesomeIcon icon={faSave} className="me-2" />}
                                        Enregistrer les modifications
                                    </Button>
                                </Col>
                            </Row>
                        </Form>
                    ) : (
                        <Alert variant="info">
                            Vous n'êtes éligible à aucun type d'alerte pour le moment, ou aucune alerte n'a été configurée.
                        </Alert>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
};

export default UserAlertSettingsPage;