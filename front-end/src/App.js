// src/App.js
import './App.css';
import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';

// --- UI Components ---
import { Spinner, Modal } from 'react-bootstrap';

// --- Global Observation Form ---
import ObservationForm from './gestion_conventions/observation_views/ObservationForm';

// --- Layout Components ---
import Sidebar from './gestion_conventions/components/sideBar';
import Header from './gestion_conventions/components/headers';
import SecteursPage from './gestion_conventions/secteurs_views/SecteursPage'; // <-- ADD THIS IMPORT

// --- Page Components ---
import Login from './gestion_conventions/Login';
import WelcomePage from './gestion_conventions/components/welcomePage';
import ChangePasswordPage from './gestion_conventions/components/ChangePasswordModel';
import ConventionsPage from './gestion_conventions/conventions_views/ConventionsPage';
import PartenairesPage from './gestion_conventions/partenaires_views/PartenairesPage';
import DomainesPage from './gestion_conventions/domaines_views/DomainesPage';
import CommunesPage from './gestion_conventions/communes_views/CommunesPage';
import UsersPage from './gestion_conventions/users_views/UsersPage';
import ChantiersPage from './gestion_conventions/chantiers_views/ChantiersPage';
import ProvincesPage from './gestion_conventions/provinces_views/ProvincesPage';
import ProgrammesPage from './gestion_conventions/programmes_views/ProgrammesPage';
import SousProjetsPage from './gestion_conventions/sousprojets_views/SousProjetsPage';
import ProjetsPage from './gestion_conventions/projects_views/ProjectsPage';
import MarchePublicPage from './gestion_conventions/marches_views/MarchePublicPage';
import BonDeCommandePage from './gestion_conventions/bon_commandes_views/BonDeCommandePage';
import ContratDroitCommunPage from './gestion_conventions/contrat_droit_commun/ContratDroitCommunPage';
import AvenantsPage from './gestion_conventions/avenants_views/AvenantsPage';
import VersementPage from './gestion_conventions/versements_views/VersementPage';
import RolesPage from './gestion_conventions/roles_views/RolesPage';
import EngagementsPage from './gestion_conventions/engagements_views/EngagementsPage';
import AppelOffrePage from './gestion_conventions/appeloffre_views/AppelOffrePage';
import VersementsPPPage from './gestion_conventions/versementspp_views/VersementppPage';
import PartnerSummaryPage from './gestion_conventions/partenaire_sum_views/PartnerSummaryPage';
import OrdreServicePage from './gestion_conventions/ordreservice_views/OrdreServicePage';
import ActivityLogPage from './gestion_conventions/gestion_historique_views/ActivityLogPage';
import ObservationsPage from './gestion_conventions/observation_views/ObservationPage';
import AlertTypesPage from './gestion_conventions/alert_views/AlertTypesPage';
import UserAlertSettingsPage from './gestion_conventions/alert_views/UserAlertSettingsPage';
import AllAlertsPage from './gestion_conventions/alert_views/AllAlertsPage'; // <-- ADD THIS
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
// --- Constants & Axios Configuration ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

axios.defaults.baseURL = BASE_API_URL;
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Request Interceptor
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        delete config.headers.Authorization;
    }
    return config;
}, error => Promise.reject(error));

// Response Interceptor
let globalLogoutHandler = () => console.error("Logout handler not initialized yet!");

axios.interceptors.response.use(response => response, error => {
    console.error("Axios response error. Status:", error.response?.status, "URL:", error.config?.url);
    if (error.response?.status === 401) {
        const isInitialUserCheck = error.config?.url.endsWith('/user') && localStorage.getItem('isLoggedIn') !== 'true';
        const isOnLoginPage = window.location.pathname.toLowerCase() === '/login';
        if (!isInitialUserCheck && !isOnLoginPage) {
            console.warn("Received 401 Unauthorized. Triggering global logout.");
            globalLogoutHandler();
        }
    }
    return Promise.reject(error);
});
// --- End Axios Configuration ---


// --- Main Application Content Component ---
function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();

    // --- Authentication State ---
    const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch (e) {
            return null;
        }
    });
    const [isLoadingUser, setIsLoadingUser] = useState(() => localStorage.getItem('isLoggedIn') === 'true' && !localStorage.getItem('user'));
    
    // --- Global Observation Modal State ---
    const [showGlobalObservationModal, setShowGlobalObservationModal] = useState(false);

    // --- Global Observation Modal Handlers ---
    const handleOpenGlobalObservationModal = () => {
        if (currentUser && currentUser.permissions?.includes('create observations')) {
            setShowGlobalObservationModal(true);
        } else {
            alert("Vous n'avez pas la permission de créer une observation.");
        }
    };
    const handleCloseGlobalObservationModal = () => setShowGlobalObservationModal(false);
    const handleGlobalObservationCreated = () => {
        handleCloseGlobalObservationModal();
        // NOTE: A more advanced implementation might use a global state manager (like Context or Redux)
        // to trigger a refresh on the ObservationsPage if it's currently mounted.
    };
    
    // --- Authentication Logic ---
    const performLogout = useCallback(() => {
        console.log("Executing performLogout function...");
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.setItem('isLoggedIn', 'false');
        setCurrentUser(null);
        setIsAuthenticated(false);
        setIsLoadingUser(false);
        if (location.pathname.toLowerCase() !== '/login') {
            navigate('/login', { replace: true });
        }
    }, [navigate, location.pathname]);

    useEffect(() => {
        globalLogoutHandler = performLogout;
        return () => {
            globalLogoutHandler = () => console.error("Logout handler not initialized (App unmounted)");
        };
    }, [performLogout]);

    useEffect(() => {
        let isMounted = true;
        const checkAuthAndFetchUser = async () => {
            if (localStorage.getItem('isLoggedIn') === 'true' && localStorage.getItem('authToken')) {
                if (isMounted) {
                    setIsAuthenticated(true);
                    if (!currentUser) setIsLoadingUser(true);
                }
                try {
                    const response = await axios.get('/user');
                    if (isMounted) {
                        const freshUserData = response.data;
                        if (JSON.stringify(freshUserData) !== JSON.stringify(currentUser)) {
                            setCurrentUser(freshUserData);
                            localStorage.setItem('user', JSON.stringify(freshUserData));
                        }
                    }
                } catch (error) {
                    console.error("Error verifying user session:", error.message);
                } finally {
                    if (isMounted) setIsLoadingUser(false);
                }
            } else {
                if (isMounted && (isAuthenticated || currentUser)) {
                    performLogout();
                } else {
                    setIsLoadingUser(false);
                }
            }
        };

        checkAuthAndFetchUser();
        const handleStorageChange = () => {
            const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (isMounted && isAuthenticated !== loggedIn) {
                 console.log("Storage change detected, re-syncing auth state.");
                 loggedIn ? checkAuthAndFetchUser() : performLogout();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            isMounted = false;
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [performLogout, isAuthenticated, currentUser]);

    const handleLogin = useCallback((token, userData) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('isLoggedIn', 'true');
        setIsAuthenticated(true);
        setCurrentUser(userData);
        setIsLoadingUser(false);
        navigate('/', { replace: true });
    }, [navigate]);

    // --- Render Logic ---
    if (isLoadingUser && isAuthenticated) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spinner animation="border" variant="primary" /> <span className='ms-3'>Chargement des données utilisateur...</span>
            </div>
        );
    }

    const showLayout = isAuthenticated && location.pathname.toLowerCase() !== '/login';

    return (
        <>
        <ToastContainer
                position="bottom-right"
                autoClose={false} // This is the key change: toasts will NOT auto-close
                closeOnClick={false} // Prevents closing the toast when clicking on its body
                newestOnTop={true}
                hideProgressBar={true} // Progress bar is irrelevant without auto-close
                draggable
                theme="colored"
            />
            <div style={{ display: 'flex' }} className={location.pathname.toLowerCase() === '/login' ? 'app-login-background' : ''}>
                {showLayout && <Sidebar currentUser={currentUser} />}
                <main className="main-content d-flex flex-column flex-grow-1">
                    {showLayout && (
                        <Header 
                            onLogout={performLogout} 
                            currentUser={currentUser} 
                            onAddObservationClick={handleOpenGlobalObservationModal}
                        />
                    )}
                    <div className="content-wrapper p-3 flex-grow-1">
                        <Routes>
                            <Route path="/login" element={!isAuthenticated ? <Login onLogin={handleLogin} /> : <Navigate to="/" replace />} />
                            
                            {/* Protected Routes */}
                            <Route path="/" element={isAuthenticated ? <WelcomePage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/convention' element={isAuthenticated ? <ConventionsPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/avenants' element={isAuthenticated ? <AvenantsPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/versements' element={isAuthenticated ? <VersementPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/partenaire' element={isAuthenticated ? <PartenairesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/chantier' element={isAuthenticated ? <ChantiersPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/programme' element={isAuthenticated ? <ProgrammesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/axes-strategiques' element={isAuthenticated ? <DomainesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/projet' element={isAuthenticated ? <ProjetsPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/secteurs' element={isAuthenticated ? <SecteursPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/sousprojet' element={isAuthenticated ? <SousProjetsPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/commune' element={isAuthenticated ? <CommunesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/province' element={isAuthenticated ? <ProvincesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/marche' element={isAuthenticated ? <MarchePublicPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/observations' element={isAuthenticated ? <ObservationsPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/marches/bonCommandes' element={isAuthenticated ? <BonDeCommandePage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/marches/contratsDroitCommun' element={isAuthenticated ? <ContratDroitCommunPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/engagements' element={isAuthenticated ? <EngagementsPage currentUser={currentUser}/> : <Navigate to="/login" replace />} />
                            <Route path='/users' element={isAuthenticated ? <UsersPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/roles' element={isAuthenticated ? <RolesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/alert-types' element={isAuthenticated ? <AlertTypesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/my-alert-settings' element={isAuthenticated ? <UserAlertSettingsPage /> : <Navigate to="/login" replace />} />
                            <Route path='/all-notifications' element={isAuthenticated ? <AllAlertsPage /> : <Navigate to="/login" replace />} />
                            <Route path='/appel-offres' element={isAuthenticated ? <AppelOffrePage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/versementpp' element={isAuthenticated ? <VersementsPPPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/finance/partner-summary' element={isAuthenticated ? <PartnerSummaryPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/ordres-service' element={isAuthenticated ? <OrdreServicePage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/historique' element={isAuthenticated ? <ActivityLogPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                            <Route path='/change-password' element={isAuthenticated ? <ChangePasswordPage onLogout={performLogout} /> : <Navigate to="/login" replace />} />
                            
                            {/* Catch-all Route */}
                            <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
                        </Routes>
                    </div>
                </main>
            </div>

            {/* Global Observation Modal */}
            <Modal show={showGlobalObservationModal} onHide={handleCloseGlobalObservationModal} dialogClassName="modal-xl" centered backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>Ajouter une nouvelle Observation</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ObservationForm
                        onSuccess={handleGlobalObservationCreated}
                        onCancel={handleCloseGlobalObservationModal}
                        baseApiUrl={BASE_API_URL}
                    />
                </Modal.Body>
            </Modal>
        </>
    );
}

// --- Root Application Component ---
function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;