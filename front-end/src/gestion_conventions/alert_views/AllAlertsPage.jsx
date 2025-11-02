// src/gestion_conventions/alert_views/AllAlertsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Spinner, Alert, ListGroup, Pagination, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faEnvelope, faEnvelopeOpen } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import TimeAgo from 'timeago-react';
import * as timeago from 'timeago.js';
import fr from 'timeago.js/lib/lang/fr';

timeago.register('fr', fr);

const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const AllAlertsPage = () => {
    const [alerts, setAlerts] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const fetchAlerts = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            // Fetch ALL alerts (read and unread) with pagination
            const response = await axios.get(`${BASE_API_URL}/alerts?page=${page}`);
            setAlerts(response.data.data || []);
            setPagination({
                current_page: response.data.current_page,
                last_page: response.data.last_page,
                total: response.data.total,
                per_page: response.data.per_page,
            });
        } catch (err) {
            setError("Impossible de charger l'historique des notifications.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts(1); // Fetch the first page on component mount
    }, [fetchAlerts]);

    const handleAlertClick = (alert) => {
        // Even if the alert is already read, we still navigate to the link
        if (alert.link) {
            navigate(alert.link);
        }
    };
    
    const handlePageChange = (pageNumber) => {
        fetchAlerts(pageNumber);
    };

    const renderPagination = () => {
        if (!pagination || pagination.last_page <= 1) return null;

        let items = [];
        for (let number = 1; number <= pagination.last_page; number++) {
            items.push(
                <Pagination.Item key={number} active={number === pagination.current_page} onClick={() => handlePageChange(number)}>
                    {number}
                </Pagination.Item>,
            );
        }
        return <Pagination className="justify-content-center mt-4">{items}</Pagination>;
    };

    if (loading) {
        return <div className="text-center p-5"><Spinner animation="border" variant="primary" /> Chargement...</div>;
    }

    if (error) {
        return <Alert variant="danger">{error}</Alert>;
    }

    return (
        <div className="container-fluid px-4 py-3">
            <h3 className="mb-4"><FontAwesomeIcon icon={faBell} className="me-2" />Toutes les Notifications</h3>

            {alerts.length > 0 ? (
                <>
                    <ListGroup>
                        {alerts.map(alert => (
                            <ListGroup.Item
                                key={alert.id}
                                action
                                onClick={() => handleAlertClick(alert)}
                                className={`d-flex align-items-start ${!alert.read_at ? 'fw-bold' : ''}`}
                                style={{ cursor: alert.link ? 'pointer' : 'default' }}
                            >
                                <FontAwesomeIcon 
                                    icon={alert.read_at ? faEnvelopeOpen : faEnvelope} 
                                    className={`me-3 mt-1 ${alert.read_at ? 'text-muted' : 'text-primary'}`} 
                                />
                                <div className="flex-grow-1">
                                    <div className="d-flex justify-content-between">
                                        <span>{alert.message}</span>
                                        {!alert.read_at && <Badge pill bg="primary">Nouveau</Badge>}
                                    </div>
                                    <small className="text-muted">
                                        <TimeAgo datetime={alert.created_at} locale='fr' />
                                    </small>
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                    {renderPagination()}
                </>
            ) : (
                <Alert variant="info">
                    Vous n'avez aucune notification dans votre historique.
                </Alert>
            )}
        </div>
    );
};

export default AllAlertsPage;