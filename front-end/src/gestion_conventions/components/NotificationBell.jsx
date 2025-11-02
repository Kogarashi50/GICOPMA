import React, { useState, useEffect, useCallback ,useRef} from 'react';
import { Dropdown, Badge, Spinner, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faCheck, faCircle } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import TimeAgo from 'timeago-react'; // A nice library for relative dates
import * as timeago from 'timeago.js';
import fr from 'timeago.js/lib/lang/fr';
import { toast } from 'react-toastify';

timeago.register('fr', fr);

const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const usePrevious = (value) => {
    const ref = useRef();
    useEffect(() => {
        ref.current = value;
    });
    return ref.current;
};
const NotificationBell = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const prevAlerts = usePrevious(alerts);

    const fetchAlerts = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch unread count and latest unread alerts in parallel
            const [countRes, alertsRes] = await Promise.all([
                axios.get(`${BASE_API_URL}/alerts/unread-count`),
                axios.get(`${BASE_API_URL}/alerts?filter=unread&limit=5`) // Get latest 5 unread
            ]);
            setUnreadCount(countRes.data.unread_count);
            setAlerts(alertsRes.data.data || []); // Adjust if pagination structure is different
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(fetchAlerts, 60000); // Poll for new alerts every minute
        return () => clearInterval(interval);
    }, [fetchAlerts]);
useEffect(() => {
        if (prevAlerts && prevAlerts.length < alerts.length) {
            const prevAlertIds = new Set(prevAlerts.map(a => a.id));
            const newAlerts = alerts.filter(a => !prevAlertIds.has(a.id));

             newAlerts.forEach(alert => {
                showToastForAlert(alert);
            });
        }
    }, [alerts, prevAlerts]);
 // src/gestion_conventions/components/NotificationBell.js

// In src/gestion_conventions/components/NotificationBell.js

const showToastForAlert = (alert) => {
    // --- STEP 1: Log the incoming data ---
    console.log("--- New Toast Triggered ---");
    console.log("Raw Alert Object:", alert);

    const alertTypeName = alert.alert_type?.name || '';
     
    // --- STEP 2: Log the critical variable ---
    console.log("Extracted Alert Type Name:", `"${alertTypeName}"`);


    let toastType = toast.info;
    let icon = "🔔";
    let backgroundColor = '#3498db'; // Default blue
    let textColor = '#fff';

    // --- STEP 3: See which condition is met ---
    if (alertTypeName.includes('late')) {
        console.log("✅ Condition MET: 'late'. Setting color to RED.");
        toastType = toast.error;
        icon = "🔥";
        backgroundColor = '#e74c3c';
    } else if (alertTypeName.includes('approaching')) {
        console.log("✅ Condition MET: 'approaching'. Setting color to YELLOW.");
        toastType = toast.warning;
        icon = "⚠️";
        backgroundColor = '#f1c40f';
        textColor = '#000';
    } else {
        console.log("❌ Condition FAILED. Using DEFAULT blue color.");
    }

    toastType(
        <div onClick={() => handleAlertClick(alert)} style={{ cursor: 'pointer' }}>
            <strong>Nouvelle Alerte</strong>
            <p className="mb-0" style={{ color: textColor }}>{alert.message}</p>
        </div>,
        {
            toastId: alert.id,
            icon: icon,
            style: {
                backgroundColor: backgroundColor,
                color: textColor,
            },
            progressStyle: {
                background: textColor,
            },
        }
    );
};
useEffect(() => {
if (prevAlerts && prevAlerts.length < alerts.length) {
const prevAlertIds = new Set(prevAlerts.map(a => a.id));
const newAlerts = alerts.filter(a => !prevAlertIds.has(a.id));
newAlerts.forEach(alert => {
            showToastForAlert(alert);
        });
    }
}, [alerts, prevAlerts]);
    const handleAlertClick = async (alert) => {
        if (!alert.read_at) {
            try {
                // We use toast.dismiss to manually close the toast since we disabled auto-close
                toast.dismiss(alert.id); 
                await axios.post(`${BASE_API_URL}/alerts/${alert.id}/mark-as-read`);
                fetchAlerts(); 
            } catch (error) {
                console.error("Failed to mark alert as read", error);
            }
        }
        if (alert.link) {
            navigate(alert.link);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await axios.post(`${BASE_API_URL}/alerts/mark-all-as-read`);
            fetchAlerts(); // Refresh
        } catch (error) {
            console.error("Failed to mark all as read", error);
        }
    };
    
    return (
        <Dropdown align="end">
            <Dropdown.Toggle as="div" style={{ cursor: 'pointer' }} className="position-relative me-3">
                <FontAwesomeIcon icon={faBell} size="lg" />
                {unreadCount > 0 && (
                    <Badge pill bg="danger" className="position-absolute top-0 start-100 translate-middle" style={{ fontSize: '0.6em' }}>
                        {unreadCount}
                    </Badge>
                )}
            </Dropdown.Toggle>

            <Dropdown.Menu style={{ width: '350px' }}>
                <Dropdown.Header className="d-flex justify-content-between align-items-center">
                    <span>Notifications</span>
                    {unreadCount > 0 && <Button variant="link" size="sm" onClick={handleMarkAllAsRead}>Tout marquer comme lu</Button>}
                </Dropdown.Header>
                <Dropdown.Divider />
                
                {loading && <div className="text-center p-3"><Spinner size="sm" /></div>}

                {!loading && alerts.length === 0 && (
                    <Dropdown.ItemText className="text-muted text-center p-3">Aucune nouvelle notification.</Dropdown.ItemText>
                )}

                {!loading && alerts.map(alert => (
                    <Dropdown.Item key={alert.id} onClick={() => handleAlertClick(alert)} className="d-flex align-items-start">
                        <FontAwesomeIcon icon={faCircle} className="text-primary me-2 mt-1" style={{ fontSize: '0.5rem' }} />
                        <div className="flex-grow-1">
                            <p className="mb-1" style={{ whiteSpace: 'normal' }}>{alert.message}</p>
                            <small className="text-muted">
                                <TimeAgo datetime={alert.created_at} locale='fr' />
                            </small>
                        </div>
                    </Dropdown.Item>
                ))}

                <Dropdown.Divider />
                <Dropdown.Item href="/all-notifications" className="text-center fw-bold">
                    Voir toutes les notifications
                </Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default NotificationBell;