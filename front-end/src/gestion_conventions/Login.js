// src/gestion_conventions/Login.js
import axios from 'axios';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css'; // Make sure this path points to your CSS file with .loginZone, .logoZone, .formZone, .input, .submit etc.

// This component receives an 'onLogin' function as a prop
// It's responsible for updating the parent component's state (e.g., in App.js or AuthContext)
export default function Login({ onLogin }) {
    const [email, setEmail] = useState(''); // State for the email input
    const [password, setPassword] = useState(''); // State for the password input
    const [error, setError] = useState(null); // State to hold login error messages
    const [isLoading, setIsLoading] = useState(false); // State to track if login is in progress
    const navigate = useNavigate(); // Hook for programmatic navigation

    // Function to handle form submission
    async function validateForm(e) {
        e.preventDefault(); // Prevent default browser form submission
        setError(null); // Clear any previous errors
        setIsLoading(true); // Set loading state to true

        try {
            // Send login request to the backend API endpoint '/login'
            const response = await axios.post('/login', {
                email: email, // Send the email from state
                password: password, // Send the password from state
            });

            // --- Login Successful ---
            const receivedToken = response.data.token;
            const receivedUserData = response.data.user; // Expecting user data with roles/permissions

            // Check if we received the necessary data and the onLogin prop is a valid function
            if (receivedToken && receivedUserData && typeof onLogin === 'function') {
                // Call the onLogin function passed from the parent component
                onLogin(receivedToken, receivedUserData);

                // Navigate to the main application page ('/') AFTER processing login in the parent
                navigate('/');
            } else {
                 console.error("Login response missing token or user data, or onLogin is not a function.");
                 setError("Erreur de connexion: Réponse invalide du serveur ou problème interne.");
                 // Optionally clear potentially bad local storage data
                 localStorage.removeItem('authToken');
                 localStorage.removeItem('user');
                 localStorage.setItem('isLoggedIn', 'false');
            }

        } catch (err) {
            // --- Error Handling (same logic as before) ---
            let errorMessage = 'Une erreur inattendue est survenue. Veuillez réessayer.';

            if (err.response) {
                console.error("Login Error Response:", err.response.status, err.response.data);
                const status = err.response.status;
                const data = err.response.data;

                 if (status === 422 && data && data.errors) {
                    if (data.errors.email) {
                         errorMessage = data.errors.email[0];
                    } else if (data.errors.password) {
                         errorMessage = data.errors.password[0];
                    } else {
                        const firstErrorKey = Object.keys(data.errors)[0];
                        errorMessage = data.errors[firstErrorKey] ? data.errors[firstErrorKey][0] : 'Erreur de validation.';
                    }
                } else if (status === 403 && data?.message) {
                    errorMessage = data.message;
                } else if (data?.message) {
                     errorMessage = data.message;
                } else {
                    errorMessage = `Erreur serveur (${status}).`;
                }
            } else if (err.request) {
                console.error("Login Error: No response received", err.request);
                errorMessage = "Aucune réponse du serveur. Vérifiez votre connexion internet.";
            } else {
                console.error('Login Error:', err.message);
                errorMessage = `Erreur lors de la préparation de la requête: ${err.message}`;
            }
            setError(errorMessage);
            // --- END Error Handling ---

        } finally {
            setIsLoading(false); // Set loading state back to false
        }
    }

    // --- JSX using your original structure and classes ---
    return (
        // Main container using your original classes for layout
        <div className="container d-flex justify-content-center align-items-center w-100 min-vh-100 ">
            <div className="loginZone d-flex justify-content-end w-75 m-5"> {/* Your main login area container */}

                {/* Left side with Logo and Title */}
                <div className="d-flex logoZone flex-column justify-content-center p-5 align-items-center"> {/* Your logo area */}
                    <h1 className='text-center'>GICOPMA
                        <small className='text-light' style={{display:'flex', fontSize:'14px', padding:'5px'}}>
                            GESTION INTEGREE DES CONVENTIONS, PROJETS ET MARCHES
                        </small>
                    </h1>
                    {/* Ensure the image path is correct */}
                    <img src="/logo2.png" width='230px' alt="Logo CRO"/>
                </div>

                {/* Right side with the Form */}
                <form className="formZone h-100 flex-column d-flex justify-content-center align-items-center " onSubmit={validateForm}> {/* Your form area */}
                    <div className=" container d-flex justify-content-center flex-column align-items-center "> {/* Inner container for form elements */}
                        <h1>Connexion</h1>

                        {/* Email Input using your 'label' and 'input' classes */}
                        <label className="label align-self-start">Email</label>
                        <input
                            type="email" // Use email type
                            className="input" // Your input class
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading} // Disable when loading
                            required // Basic HTML validation
                         />

                        {/* Password Input using your 'label' and 'input' classes */}
                        <label className="label align-self-start">Mot de passe</label>
                        <input
                            type="password"
                            className="input" // Your input class
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading} // Disable when loading
                            required // Basic HTML validation
                        />

                        {/* Error Message Display Area */}
                        {error && (
                            // Simple div for error display, style as needed in Login.css
                            <div style={{ color: 'red', width: '100%', textAlign: 'center', fontSize: '11px', marginTop: '5px' }}>
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Submit Button using your 'submit' class */}
                       <button className="submit" type="submit" disabled={isLoading}>
                        {isLoading ? 'Connexion...' : 'Se connecter'} {/* Change text when loading */}
                    </button>
                </form>
            </div>
        </div>
    );
}