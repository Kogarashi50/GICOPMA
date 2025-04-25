import React, { useState, useEffect } from 'react';
import {useNavigate} from 'react-router-dom'
import axios from 'axios';
import StatCard from './statCard'; // Adjust path if needed
import ProjectStatusChart from './ProjectStatusChart'; // Adjust path
import BudgetDistribution from './BudgetDistribution'; // Adjust path
import DeadlineCalendar from './DeadlineCalendar'; // Adjust path
import ActionButton from './ActionButton'; // Adjust path
import { Container, Row, Col, Card, Spinner, Alert as BootstrapAlert } from 'react-bootstrap';
import { format } from 'date-fns'; // For date formatting if needed elsewhere
import RecentConventionsList from './RecentConventionsList';

// Base URL for your API (ensure correct setup in vite.config.js or proxy)
const API_BASE_URL = '';

export default function DashboardPage() {
    const navigate=useNavigate()
    const [stats, setStats] = useState(null);
    const [projectStatus, setProjectStatus] = useState([]);
    const [budgetData, setBudgetData] = useState([]);
    const [deadlines, setDeadlines] = useState([]);
    const [alerts, setAlerts] = useState([]); // Combined alerts
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recentConventions, setRecentConventions] = useState([]);
    const handleDownloadReport = () => {
        // Construct the full URL to the backend report download route
        // Ensure API_BASE_URL is set correctly above or remove `${API_BASE_URL}/` if not needed
        const reportUrl = `http://localhost:8000/api/report/download`;

        console.log('Attempting to open PDF report URL:', reportUrl);

        // Open the URL in a new tab.
        // The browser will handle displaying or downloading the PDF
        // based on the Content-Disposition header sent by the backend.
        window.open(reportUrl, '_blank');

        // Note: Error handling for this simple approach is limited.
        // If the backend returns an error (e.g., 500), the new tab might show an error page.
        // A more complex fetch/blob approach would allow for better frontend error handling.
    };
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Use Promise.all for parallel fetching
                const [
                    statsRes,
                    projectStatusRes,
                    budgetRes,
                    deadlinesRes,
                    alertsRes ,
                    recentConventionsRes,
                    // Fetch combined alerts
                ] = await Promise.all([
                    axios.get(`${API_BASE_URL}/dashboard/stats`),
                    axios.get(`${API_BASE_URL}/dashboard/project-status`),
                    axios.get(`${API_BASE_URL}/dashboard/budget-distribution`),
                    axios.get(`${API_BASE_URL}/dashboard/deadlines`),
                    axios.get(`${API_BASE_URL}/dashboard/alerts`),
                    axios.get(`${API_BASE_URL}/dashboard/recent-convention-summaries`), 
                ]);
                setStats(statsRes.data);
                setProjectStatus(projectStatusRes.data);
                setBudgetData(budgetRes.data);
                setDeadlines(deadlinesRes.data);
                setAlerts(alertsRes.data); // Store combined alerts
                setRecentConventions(recentConventionsRes.data); // *** SET NEW STATE ***

            } catch (err) {
                console.error("Failed to fetch dashboard data:", err.response?.data || err.message);
                setError("Erreur lors du chargement des données du tableau de bord.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Add cleanup function if needed
        // return () => { /* cancel requests */ };
    }, []); // Empty dependency array means run once on mount
    // Helper function to format large numbers (e.g., 1200000 to "1,20 M")
    const formatMillion = (value) => {
         if (value === null || value === undefined) return 'N/A';
         const num = Number(value);
         if (isNaN(num)) return 'N/A';
         if (num >= 1000000) {
             return (num / 1000000).toFixed(1).replace('.', ',') + ' M';
         }
         if (num >= 1000) {
              return (num / 1000).toFixed(1).replace('.', ',') + ' k'; // Use 'k' for thousands
         }
         // Format as integer with spaces for thousands separator
         return num.toLocaleString('fr-FR'); // Use French locale for spacing
    }

    // --- Loading and Error States ---
    if (loading) {
        return (
            <Container fluid className="p-3 d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
                <Spinner animation="border" role="status">
                    <span className="visually-hidden">Chargement...</span>
                </Spinner>
            </Container>
        );
    }

    if (error) {
         return <Container fluid className="p-3"><BootstrapAlert variant="danger">{error}</BootstrapAlert></Container>;
    }

    // --- Prepare Alerts for Components ---
    // Split alerts based on their intended location (using 'type' from backend)
    const budgetAlerts = alerts.filter(a => a.type === 'warning');
    const calendarAlerts = alerts.filter(a => a.type === 'danger'); // Assuming dark alerts go to calendar side
console.log('raw data:',recentConventions)

    // --- Render Dashboard ---
    return (
        <Container  className="pt-5" style={{width:'calc(100vw - 350px )',overflow: 'auto',maxHeight:'calc(100vh-100)' }}> {/* Add light background to container */}
       
            <Row className="d-flex justify-content-evenly"> {/* g-3 adds gutters */}
                 <Col  xs={3}>
                    <StatCard title="Conventions" value={stats?.convention_count} color="white" />
                </Col>
                <Col xs={3}>
                    <StatCard title="Projets en cours" value={stats?.projects_in_progress_count} color="warning" />
                </Col>
                 <Col xs={3}>
                    <StatCard title="Marchés lancés" value={stats?.markets_launched_count} color="dark" />
                </Col>
                 <Col xs={3}>
                    <StatCard title="Budget Total" value={formatMillion(stats?.total_budget_value)} color="white" />
                </Col>
            </Row>

            {/* Main Content Row */}
            <Row className=" g-3">
                {/* Left Column */}
                <Col lg={4} className="d-flex flex-column">
                     <Card className=" shadow-sm"> {/* Added shadow */}
                         <Card.Body>
                            <Card.Title className="mb-3">État d'avancement des projets</Card.Title>
                            <ProjectStatusChart data={projectStatus} />
                         </Card.Body>
                     </Card>
                     {/* Placeholder for the omitted Projete/Programme/Partenaire bars */}
                     {/* <Card className="shadow-sm">...</Card> */}
                </Col>

                {/* Middle Column */}
                <Col lg={4} className="d-flex flex-column">
                     <Card className=" shadow-sm">
                         <Card.Body className=""> {/* Remove padding if ListGroup handles it */}
                            <Card.Title className="mb-0 p-3 border-bottom"> {/* Add padding back to title, add border */}
                                Conventions Récentes
                            </Card.Title>
                            {/* Use new component and pass the fetched data */}
                            <RecentConventionsList conventions={recentConventions} />
                         </Card.Body>
                     </Card>
                 </Col>
                {/* Right Column */}
                 <Col lg={4} className="d-flex flex-column">
                     <Card className="shadow-sm">
                          <Card.Body>
                             <Card.Title className="mb-3">Calendrier des échéances</Card.Title>
                              <DeadlineCalendar deadlines={deadlines} alerts={[...budgetAlerts,...calendarAlerts]} />
                          </Card.Body>
                     </Card>
                 </Col>
            </Row>

            {/* Action Buttons Row */}
            <Row className="g-3">
            <Col xs={12} sm={6} md={3}>
                    <ActionButton text="Créer une convention" icon="faFileContract" onClick={() => navigate('/convention?action=create')} />
                </Col>
                 <Col xs={12} sm={6} md={3}>
                    <ActionButton text="Créer un projet" icon="plus" onClick={() => {navigate('/projet?action=create')}} />
                </Col>
                <Col xs={12} sm={6} md={3}>
                    <ActionButton text="Lancer un marché" icon="flag" onClick={() => {navigate('/marche?action=create')}} />
                </Col>
                <Col xs={12} sm={6} md={3}>
                     <ActionButton text="Télécharger rapport" icon="download" onClick={handleDownloadReport} />
                </Col>
                
            </Row>

        </Container>
    );
}