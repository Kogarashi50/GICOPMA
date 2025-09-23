// src/pages/DashboardPage.jsx

import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import StatCard from './statCard';
import ProjectStatusChart from './ProjectStatusChart';
import DeadlineCalendar from './DeadlineCalendar';
import ActionButton from './ActionButton';
import { Container, Row, Col, Card, Spinner, Alert as BootstrapAlert } from 'react-bootstrap';
import RecentConventionsList from './RecentConventionsList';

// Base URL for your API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export default function DashboardPage() {
    const navigate = useNavigate();

    // --- State ---
    const [stats, setStats] = useState(null);
    const [projectStatus, setProjectStatus] = useState([]);
    const [deadlines, setDeadlines] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recentConventions, setRecentConventions] = useState([]);
    const [showPermissionWarning, setShowPermissionWarning] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [userPermissions, setUserPermissions] = useState([]);
    const [isReportDownloading, setIsReportDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState(null);

    // --- Permissions ---
    const canDownloadReport = useMemo(() => {
        return Array.isArray(userPermissions) && userPermissions.includes('download report');
    }, [userPermissions]);

    // --- Effects ---
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            setLoading(true); setError(null); setCurrentUser(null); setUserPermissions([]);
            try {
                const [ userRes, statsRes, projectStatusRes, deadlinesRes, alertsRes, recentConventionsRes ] = await Promise.allSettled([
                    axios.get(`${API_BASE_URL}/user`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/dashboard/stats`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/dashboard/project-status`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/dashboard/deadlines`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/dashboard/alerts`, { withCredentials: true }),
                    axios.get(`${API_BASE_URL}/dashboard/recent-convention-summaries`, { withCredentials: true }),
                ]);

                if (!isMounted) return;
                let errors = [];

                if (userRes.status === 'fulfilled' && userRes.value?.data) {
                    const userData = userRes.value.data;
                    setCurrentUser(userData);
                    setUserPermissions(Array.isArray(userData.permissions) ? userData.permissions : []);
                    console.log("Fetched current user data:", userData);
                } else {
                    errors.push(`Utilisateur (${userRes.reason?.message || 'Erreur Données'})`);
                    console.error("Failed to fetch user data:", userRes.reason);
                    setError("Impossible de vérifier les informations utilisateur.");
                    setLoading(false); return;
                }

                if (statsRes.status === 'fulfilled') setStats(statsRes.value.data); else errors.push(`Statistiques (${statsRes.reason?.message || '?'})`);
                if (projectStatusRes.status === 'fulfilled') setProjectStatus(projectStatusRes.value.data); else errors.push(`Projets (${projectStatusRes.reason?.message || '?'})`);
                if (deadlinesRes.status === 'fulfilled') setDeadlines(deadlinesRes.value.data); else errors.push(`Échéances (${deadlinesRes.reason?.message || '?'})`);
                if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data); else errors.push(`Alertes (${alertsRes.reason?.message || '?'})`);
                if (recentConventionsRes.status === 'fulfilled') setRecentConventions(recentConventionsRes.value.data); else errors.push(`Conventions (${recentConventionsRes.reason?.message || '?'})`);

                if (errors.length > 0) { setError(prevError => prevError ? `${prevError}\nErreurs données Dashboard: ${errors.join(', ')}.` : `Erreurs données Dashboard: ${errors.join(', ')}.`); console.error("Dashboard fetch errors:", errors); }

            } catch (err) { if (!isMounted) return; console.error("Unexpected error fetching dashboard data:", err); setError("Une erreur inattendue s'est produite."); }
            finally { if (isMounted) setLoading(false); }
        };
        fetchData();
        return () => { isMounted = false; };
    }, []);

    // Effect to manage body cursor style when report is downloading
    useEffect(() => {
        if (isReportDownloading) {
            document.body.classList.add('cursor-wait');
        } else {
            document.body.classList.remove('cursor-wait');
        }
        return () => {
            document.body.classList.remove('cursor-wait');
        };
    }, [isReportDownloading]);

    // Helper function to format large numbers
    const formatMillion = (value) => {
         if (value === null || value === undefined) return '-';
         const num = Number(value);
         if (isNaN(num)) return '-';
         if (num >= 1000000) { return (num / 1000000).toFixed(1).replace('.', ',') + ' M'; }
         if (num >= 1000) { return (num / 1000).toFixed(1).replace('.', ',') + ' k'; }
         return num.toLocaleString('fr-FR');
    };

    // --- Event Handlers ---
    const handleDownloadClick = async () => {
        setShowPermissionWarning(false);
        setDownloadError(null);

        if (!canDownloadReport) {
            console.log('[DEBUG] handleDownloadClick: Permission denied. Showing warning.');
            setShowPermissionWarning(true);
            return;
        }

        setIsReportDownloading(true);
        const reportUrl = `${API_BASE_URL.replace(/\/api\/?$/, '')}/api/report/download`;
        console.log('User has permission. Attempting to download report via Axios:', reportUrl);

        try {
            const response = await axios.get(reportUrl, {
                withCredentials: true,
                responseType: 'blob',
            });
            console.log('[DEBUG] Axios download successful. Status:', response.status);

            const file = new Blob([response.data], { type: 'application/pdf' });
            let filename = 'rapport-dashboard.pdf';
            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+?)"?(;|$)/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            const fileURL = URL.createObjectURL(file);
            console.log('[DEBUG] Blob URL created:', fileURL);
            const link = document.createElement('a');
            link.href = fileURL;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            URL.revokeObjectURL(fileURL);
            console.log('[DEBUG] Download triggered and cleaned up.');

        } catch (err) {
            console.error("[DEBUG] Error during Axios download:", err);
            let message = "Erreur lors du téléchargement du rapport.";
            if (err.response?.status === 403) {
                message = "Permission refusée par le serveur pour télécharger le rapport.";
            } else if (err.response?.data instanceof Blob) {
                try {
                    const errorText = await err.response.data.text();
                    const errorJson = JSON.parse(errorText);
                    message = errorJson.message || message;
                } catch (parseError) {
                    console.warn("Could not parse error message from Blob:", parseError)
                }
            } else if (err.response?.data?.message) {
                message = err.response.data.message;
            } else if (err.message) {
                message = err.message;
            }
            setDownloadError(message);
        } finally {
            setIsReportDownloading(false);
        }
    };

    // --- Loading and Error States ---
    if (loading) {
        return (
            <Container fluid className="p-3 d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <Spinner animation="border" role="status"><span className="visually-hidden">Chargement...</span></Spinner>
                <span className='ms-2 text-muted'>Chargement...</span>
            </Container>
        );
    }
    if (error && (!currentUser || !stats) ) {
        return <Container fluid className="p-3"><BootstrapAlert variant="danger">{error}</BootstrapAlert></Container>;
    }

    const budgetAlerts = (alerts || []).filter(a => a.type === 'warning');
    const calendarAlerts = (alerts || []).filter(a => a.type === 'danger');

    // --- Render Dashboard ---
    return (
        <>
            <Container
                fluid
                className="py-4 px-lg-4 px-md-3 px-2"
                style={{ height: 'calc(91vh - 56px)', overflowY: 'auto' }}
            >
                {error && currentUser && stats && ( <BootstrapAlert variant="warning" className="mb-3">{error}</BootstrapAlert> )}
                {downloadError && ( <BootstrapAlert variant="danger" onClose={() => setDownloadError(null)} dismissible className="mb-3">{downloadError}</BootstrapAlert> )}

                {/* Stat Cards Row */}
                <Row className="g-3 mb-4">
                    <Col xs={6} sm={6} md={3}> <StatCard title="Conventions" value={stats?.convention_count ?? '-'} color="white" /> </Col>
                    <Col xs={6} sm={6} md={3}> <StatCard title="Projets en cours" value={stats?.projects_in_progress_count ?? '-'} color="warning" /> </Col>
                    <Col xs={6} sm={6} md={3}> <StatCard title="Marchés lancés" value={stats?.markets_launched_count ?? '-'} color="dark" /> </Col>
                    <Col xs={6} sm={6} md={3}> <StatCard title="Budget Total Engagé" value={formatMillion(stats?.total_budget_value)} color="white" /> </Col>
                </Row>

                {/* Main Content Row */}
                <Row className="g-3 mb-4">
                    <Col lg={4} className="d-flex flex-column"> <Card className="shadow-sm h-100"> <Card.Body> <Card.Title className="mb-3">État d'avancement des projets</Card.Title> {projectStatus?.length > 0 ? <ProjectStatusChart data={projectStatus} /> : <p className="text-muted small fst-italic">Aucune donnée.</p>} </Card.Body> </Card> </Col>
                    <Col lg={4} className="d-flex flex-column"> <Card className="shadow-sm h-100"> <Card.Body className="d-flex flex-column p-0"> <Card.Title className="mb-0 p-3 border-bottom flex-shrink-0"> Conventions Récentes </Card.Title> <div className="flex-grow-1" style={{ overflowY: 'auto', minHeight: '200px' }}> {recentConventions?.length > 0 ? <RecentConventionsList conventions={recentConventions} /> : <p className="text-muted small fst-italic p-3">Aucune convention.</p>} </div> </Card.Body> </Card> </Col>
                    <Col lg={4} className="d-flex flex-column"> <Card className="shadow-sm h-100"> <Card.Body> <Card.Title className="mb-3">Calendrier des échéances</Card.Title> <DeadlineCalendar deadlines={deadlines || []} alerts={[...budgetAlerts,...calendarAlerts]} /> </Card.Body> </Card> </Col>
                </Row>

                {/* Action Buttons Row */}
                <Row className="g-3 mb-4">
                    <Col xs={12} sm={6} md={3}> <ActionButton text="Créer une convention" icon="faFileContract" onClick={() => navigate('/convention?action=create')} /> </Col>
                    <Col xs={12} sm={6} md={3}> <ActionButton text="Créer un projet" icon="plus" onClick={() => {navigate('/projet?action=create')}} /> </Col>
                    <Col xs={12} sm={6} md={3}> <ActionButton text="Lancer un marché" icon="flag" onClick={() => {navigate('/marche?action=create')}} /> </Col>
                    <Col xs={12} sm={6} md={3}>
                        <ActionButton
                            text="Télécharger rapport"
                            icon="download"
                            onClick={handleDownloadClick}
                            loading={isReportDownloading}
                        />
                    </Col>
                </Row>
            </Container>

            {/* Centered Permission Warning Alert Overlay */}
            {showPermissionWarning && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1060,
                    }}
                    onClick={() => setShowPermissionWarning(false)}
                >
                    <BootstrapAlert
                        variant="warning"
                        onClose={() => setShowPermissionWarning(false)}
                        dismissible
                        show={showPermissionWarning}
                        className="shadow-lg"
                        style={{
                            minWidth: '300px',
                            maxWidth: '500px',
                            pointerEvents: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <BootstrapAlert.Heading as="h5">Permission Refusée</BootstrapAlert.Heading>
                        <hr />
                        <p className="mb-0">
                            Vous n'avez pas la permission nécessaire pour télécharger ce rapport.
                        </p>
                    </BootstrapAlert>
                </div>
            )}
        </>
    );
}