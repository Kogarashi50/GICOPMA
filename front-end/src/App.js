// src/App.js
import './App.css';
import React, { useEffect, useState, useCallback } from 'react'; // Added useCallback
import axios from 'axios'; // Using global axios instance
import Login from './gestion_conventions/Login';
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom'; // Added useNavigate
import Sidebar from './gestion_conventions/components/sideBar';
// import DashBoard from './gestion_conventions/components/dashboard'; // Not used in Routes, can be removed if truly unused
import Header from './gestion_conventions/components/headers';
import { Spinner } from 'react-bootstrap';

// --- Import Page Components (Combined from both versions) ---
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
import VersementPage from './gestion_conventions/versements_views/VersementPage'; // VersementCP
import RolesPage from './gestion_conventions/roles_views/RolesPage';
import EngagementsPage from './gestion_conventions/engagements_views/EngagementsPage';
import AppelOffrePage from './gestion_conventions/appeloffre_views/AppelOffrePage';
import VersementsPPPage from './gestion_conventions/versementspp_views/VersementppPage'; // <<< ADDED from App 2
import PartnerSummaryPage from './gestion_conventions/partenaire_sum_views/PartnerSummaryPage'; // <<< ADDED from App 2
import OrdreServicePage from './gestion_conventions/ordreservice_views/OrdreServicePage'; // <<< ADDED from App 2
import WelcomePage from './gestion_conventions/components/welcomePage'; // <<< ADDED from App 2
import ChangePasswordPage from './gestion_conventions/components/ChangePasswordModel'; // <<< KEPT from App 1
import ActivityLogPage from './gestion_conventions/gestion_historique_views/ActivityLogPage'; // <<< ADDED from App 2


// --- Axios Configuration (Using Code 1's version - identical to 2) ---
axios.defaults.baseURL = 'http://localhost:8000/api'; // Ensure this points to your API base URL
axios.defaults.headers.common['Accept'] = 'application/json';
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
// axios.defaults.withCredentials = true; // Uncomment if using Sanctum cookie-based authentication

// --- REQUEST Interceptor ---
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    } else {
        delete config.headers.Authorization; // Ensure no old token is sent
    }
    return config;
}, error => {
    console.error("Axios request setup error:", error);
    return Promise.reject(error);
});

// --- RESPONSE Interceptor ---
let globalLogoutHandler = () => { // Placeholder for logout function
    console.error("Logout handler not initialized yet!");
};

axios.interceptors.response.use(response => {
    // Any successful response goes through here
    return response;
}, error => {
    // Handle errors globally
    console.error("Axios response error. Status:", error.response?.status, "URL:", error.config?.url);
    if (error.response) {
        const { status, config } = error.response;
        // Handle 401 Unauthorized (e.g., token expired)
        if (status === 401) {
            // Avoid triggering logout on the initial /user check if no token exists yet
            // or if already on the login page
            const isInitialUserCheck = config?.url === '/user' && localStorage.getItem('isLoggedIn') !== 'true';
            const isOnLoginPage = window.location.pathname.toLowerCase() === '/login';

            if (!isInitialUserCheck && !isOnLoginPage) {
                 console.warn("Received 401 Unauthorized. Triggering global logout.");
                 globalLogoutHandler(); // Call the function assigned in AppContent
            } else if (isInitialUserCheck) {
                 console.log("Initial /user check failed with 401, likely no valid token initially.");
            }
        } else if (status === 403) {
            console.warn("Received 403 Forbidden. User lacks permission for:", config?.url);
            // Optionally show a user-friendly message (e.g., using a toast notification library)
            // alert("Accès refusé. Vous n'avez pas les permissions nécessaires.");
        } else if (status === 404) {
             console.warn("Received 404 Not Found for:", config?.url);
             // Handle specific 404s if needed, or show a generic message
        } else if (status >= 500) {
             console.error("Server error:", status, error.response.data);
             // Optionally show a user-friendly message
             // alert("Une erreur serveur est survenue. Veuillez réessayer plus tard ou contacter l'administrateur.");
         }
        // You might want to handle other specific statuses like 422 (Validation Errors) here
        // if you don't handle them individually in your components.
    } else if (error.request) {
        // The request was made but no response was received (network error, server down)
        console.error('Axios error: No response received.', error.request);
        // alert("Erreur réseau ou problème de connexion au serveur. Veuillez vérifier votre connexion.");
    } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Axios error: Request setup failed.', error.message);
    }
    // IMPORTANT: Always reject the promise so individual catch blocks in components can also run
    return Promise.reject(error);
});
// --- End Axios Configuration ---


// --- Main Application Content Component (Using Code 1's version) ---
function AppContent() {
    const navigate = useNavigate();
    const location = useLocation();

    // Authentication State
    const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            // Attempt to parse user data from localStorage, default to null if missing or invalid
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch (e) {
            console.error("Error parsing user from localStorage on init:", e);
            localStorage.removeItem('user'); // Clear potentially corrupted data
            return null;
        }
    });
    // Loading state, initially true only if we think we are logged in but don't have user data yet
    const [isLoadingUser, setIsLoadingUser] = useState(() => localStorage.getItem('isLoggedIn') === 'true' && !localStorage.getItem('user'));

    // Define the logout logic using useCallback for stability
    const performLogout = useCallback(() => {
         console.log("Executing performLogout function...");
         // Clear authentication artifacts
         localStorage.removeItem('authToken');
         localStorage.removeItem('user');
         localStorage.setItem('isLoggedIn', 'false'); // Explicitly mark as logged out
         // Reset component state
         setCurrentUser(null);
         setIsAuthenticated(false);
         setIsLoadingUser(false); // Ensure loading stops on logout
         // Redirect to login page, replacing history to prevent going back to protected routes
         // Check if not already on login to avoid redundant navigation
         if (location.pathname.toLowerCase() !== '/login') {
              console.log("Navigating to /login on logout.");
              navigate('/login', { replace: true });
         } else {
              console.log("Already on login page during logout.");
         }
    }, [navigate, location.pathname]); // Dependencies: navigate function and current path

    // Assign the logout function to the global handler managed by the interceptor
    useEffect(() => {
        console.log("Assigning performLogout to globalLogoutHandler");
        globalLogoutHandler = performLogout;
        // Cleanup function to reset the handler when AppContent unmounts
        return () => {
            console.log("Resetting globalLogoutHandler on unmount");
            globalLogoutHandler = () => console.error("Logout handler not initialized (App unmounted)");
        };
    }, [performLogout]); // Re-assign only if performLogout identity changes (due to useCallback dependencies)


    // Effect to check authentication status and fetch/verify user data on initial load or refresh
    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates after component unmounts

        const checkAuthAndFetchUser = async () => {
            const loggedIn = localStorage.getItem('isLoggedIn') === 'true';
            const token = localStorage.getItem('authToken');

            if (loggedIn && token) {
                // Assume authenticated based on local storage, verify with API
                if (isMounted) setIsAuthenticated(true);

                // If we think we're logged in but don't have user data in state, start loading
                 if (!currentUser && isMounted) {
                     console.log("Starting user loading state.");
                     setIsLoadingUser(true);
                 }

                console.log("Attempting to fetch /user to verify session and get fresh data...");
                try {
                    const response = await axios.get('/user'); // Verify token and get fresh user data
                    if (isMounted) {
                        const freshUserData = response.data;
                        // Update user state only if data actually changed (or was null)
                        if (JSON.stringify(freshUserData) !== JSON.stringify(currentUser)) {
                            console.log("Updating user state with fresh data from API:", freshUserData);
                            setCurrentUser(freshUserData);
                            localStorage.setItem('user', JSON.stringify(freshUserData)); // Update local storage too
                        } else {
                            console.log("User data from API matches current state.");
                        }
                    }
                } catch (error) {
                    // Error fetching user usually means token is invalid/expired
                    // The response interceptor (handling 401) should trigger performLogout
                    console.error("Error caught in checkAuthAndFetchUser during /user fetch:", error.message);
                    // No need to call performLogout here, interceptor handles it based on status code
                } finally {
                    // Stop loading indicator regardless of success/failure of the API call
                     if (isMounted) {
                         console.log("Stopping user loading state.");
                         setIsLoadingUser(false);
                     }
                }
            } else {
                // Not logged in according to localStorage, ensure state reflects this
                if (isMounted) {
                    // If component state thought we were logged in, force logout/cleanup
                     if (isAuthenticated || currentUser) {
                        console.log("Local storage indicates logged out state, performing state cleanup via performLogout.");
                        performLogout(); // This will set state correctly
                     } else {
                         // Ensure loading is false if we start in a logged-out state
                         setIsLoadingUser(false);
                     }
                }
            }
        };

        checkAuthAndFetchUser();

        // --- Storage Event Listener ---
        // Handles logout/login events triggered in other tabs/windows
        const handleStorageChange = (event) => {
            // Listen for changes relevant to authentication state
            if (event.key === 'isLoggedIn' || event.key === 'authToken' || event.key === 'user') {
                console.log("Storage change detected for key:", event.key);
                 if (!isMounted) return; // Don't update state if component is unmounted

                 const currentLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
                 const currentToken = localStorage.getItem('authToken');

                 if (!currentLoggedIn || !currentToken) {
                     // If storage indicates logout, ensure component state reflects it
                     if (isAuthenticated) {
                        console.log("Storage change indicates logout, forcing state update via performLogout.");
                        performLogout();
                     }
                 } else {
                     // Storage indicates login or user data update
                     setIsAuthenticated(true); // Ensure authenticated state is true
                     const storedUser = localStorage.getItem('user');
                     try {
                         const parsedUser = storedUser ? JSON.parse(storedUser) : null;
                         // Update component's user state only if it differs from the new storage value
                         if (JSON.stringify(parsedUser) !== JSON.stringify(currentUser)) {
                             console.log("Updating user state based on storage event:", parsedUser);
                             setCurrentUser(parsedUser);
                             // If user data became available (was null), stop loading
                             if (parsedUser && isLoadingUser) setIsLoadingUser(false);
                             // If user data became null after being logged in, might indicate an issue, potentially re-fetch?
                             if (!parsedUser && isAuthenticated) {
                                 console.warn("User data removed from storage while logged in, consider re-fetching or investigating.");
                                 // Optionally trigger checkAuthAndFetchUser() again?
                             }
                         }
                     } catch (e) {
                         console.error("Error parsing user from storage event, forcing logout.", e);
                         performLogout(); // Corrupted data likely means logout is safest
                     }
                 }
            }
        };
        window.addEventListener('storage', handleStorageChange);
        // --- End Storage Event Listener ---


        // Cleanup function for the effect
        return () => {
            console.log("Cleaning up AppContent effect and listener.");
            isMounted = false; // Prevent state updates after unmount
            window.removeEventListener('storage', handleStorageChange); // Remove the listener
        };
        // Dependencies: Only run on mount/unmount. performLogout is stable due to useCallback.
        // Adding isAuthenticated helps re-sync if external factors change it, though storage listener should handle most cases.
    }, [performLogout, isAuthenticated, currentUser]); // Added currentUser to potentially trigger re-fetch if it becomes null unexpectedly


    // Login handler - receives token and user data from Login component
    const handleLogin = useCallback((receivedToken, receivedUserData) => {
        console.log("Handling successful login callback...");
        localStorage.setItem('authToken', receivedToken);
        localStorage.setItem('user', JSON.stringify(receivedUserData));
        localStorage.setItem('isLoggedIn', 'true');
        // Update state immediately
        setIsAuthenticated(true);
        setCurrentUser(receivedUserData);
        setIsLoadingUser(false); // Ensure loading stops on successful login
        console.log("Navigating to '/' after login.");
        navigate('/', { replace: true }); // Navigate to dashboard/welcome page after login
    }, [navigate]); // Dependency: navigate function


    // --- Conditional Rendering Variables ---
    const showLayout = isAuthenticated && location.pathname.toLowerCase() !== '/login';
    const isLoginPage = location.pathname.toLowerCase() === '/login';

    // --- Loading State ---
    // Show spinner only if we are *supposed* to be logged in but still fetching/verifying user data
    if (isLoadingUser && isAuthenticated && !isLoginPage) {
         console.log("Rendering loading spinner...");
         return (
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                 <Spinner animation="border" variant="primary" /> <span className='ms-3'>Chargement des données utilisateur...</span>
             </div>
         );
    }

    // --- Render Application ---
    console.log("Rendering AppContent. IsAuth:", isAuthenticated, "IsLoading:", isLoadingUser, "Path:", location.pathname);
    return (
        <div style={{ display: 'flex' }} className={isLoginPage ? 'app-login-background' : ''}>
            {/* Sidebar shown only when authenticated and not on the login page */}
            {showLayout && <Sidebar currentUser={currentUser} />}

            {/* Main Content Area */}
            <main className="main-content d-flex flex-column flex-grow-1" /* Use flex-grow-1 */ style={{ backgroundColor: isLoginPage ? 'transparent' : '#f8f9fa' /* Example background */ }}>
                 {/* Header shown only when authenticated and not on the login page */}
                 {showLayout && <Header onLogout={performLogout} currentUser={currentUser} />}

                {/* --- Routes Definition (Merged) --- */}
                <div className="content-wrapper p-3 flex-grow-1" /* Allow content to grow */>
                    <Routes>
                        {/* Login Route */}
                        <Route
                            path="/login"
                            element={
                                !isAuthenticated
                                ? <Login onLogin={handleLogin} />
                                : <Navigate to="/" replace /> // Redirect to home if already logged in
                            }
                        />

                        {/* Protected Routes */}
                        {/* Use a wrapper or repetitive checks */}
                        <Route path="/" element={isAuthenticated ? <WelcomePage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/convention' element={isAuthenticated ? <ConventionsPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/avenants' element={isAuthenticated ? <AvenantsPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/versements' element={isAuthenticated ? <VersementPage currentUser={currentUser} /> : <Navigate to="/login" replace />} /> {/* VersementCP */}
                        <Route path='/partenaire' element={isAuthenticated ? <PartenairesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/chantier' element={isAuthenticated ? <ChantiersPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/programme' element={isAuthenticated ? <ProgrammesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/axes-strategiques' element={isAuthenticated ? <DomainesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/projet' element={isAuthenticated ? <ProjetsPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/sousprojet' element={isAuthenticated ? <SousProjetsPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/commune' element={isAuthenticated ? <CommunesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/province' element={isAuthenticated ? <ProvincesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/marche' element={isAuthenticated ? <MarchePublicPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/marches/bonCommandes' element={isAuthenticated ? <BonDeCommandePage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/marches/contratsDroitCommun' element={isAuthenticated ? <ContratDroitCommunPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/engagements' element={isAuthenticated ? <EngagementsPage currentUser={currentUser}/> : <Navigate to="/login" replace />} />
                        <Route path='/users' element={isAuthenticated ? <UsersPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/roles' element={isAuthenticated ? <RolesPage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/appel-offres' element={isAuthenticated ? <AppelOffrePage currentUser={currentUser} /> : <Navigate to="/login" replace />} />
                        <Route path='/versementpp' element={isAuthenticated ? <VersementsPPPage currentUser={currentUser} /> : <Navigate to="/login" replace />} /> {/* <<< ADDED Route */}
                        <Route path='/finance/partner-summary' element={isAuthenticated ? <PartnerSummaryPage currentUser={currentUser} /> : <Navigate to="/login" replace />} /> {/* <<< ADDED Route */}
                        <Route path='/ordres-service' element={isAuthenticated ? <OrdreServicePage currentUser={currentUser} /> : <Navigate to="/login" replace />} /> {/* <<< ADDED Route */}
                        <Route path='/historique' element={isAuthenticated ? <ActivityLogPage currentUser={currentUser} /> : <Navigate to="/login" replace />} /> {/* <<< ADDED Route */}

                        {/* Change Password Route (from App 1) */}
                        <Route
                            path='/change-password'
                            element={
                                isAuthenticated
                                ? <ChangePasswordPage onLogout={performLogout} /> // Pass performLogout if needed inside
                                : <Navigate to="/login" replace />
                            }
                        />

                        {/* Catch-all Route: Redirects unknown paths */}
                        <Route
                            path="*"
                            element={
                                <Navigate to={isAuthenticated ? "/" : "/login"} replace /> // Redirect home or login
                            }
                        />
                    </Routes>
                </div>
            </main>
        </div>
    );
}

// --- Root Application Component ---
function App() {
    return (
        <BrowserRouter>
            <AppContent /> {/* Render the component containing state and logic */}
        </BrowserRouter>
    );
}

export default App;