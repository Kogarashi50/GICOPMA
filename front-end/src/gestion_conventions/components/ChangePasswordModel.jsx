// src/components/ChangePasswordModal.jsx

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap'; // Assuming you use React Bootstrap
import axios from 'axios'; // For making API calls

/**
 * ChangePasswordModal Component
 *
 * Renders a modal dialog containing a form for the user to change their password.
 * Handles form input, validation feedback, API submission, and success/error messages.
 * Triggers a logout action upon successful password change.
 *
 * @param {object} props - Component props.
 * @param {boolean} props.show - Controls whether the modal is visible. Passed from the parent (Header).
 * @param {function} props.handleClose - Function to call when the modal should be closed (e.g., clicking close button, backdrop, or cancel). Passed from the parent (Header).
 * @param {function} props.onLogoutSuccess - Function to call after a successful password change to initiate the logout process. Passed from the parent (Header/App).
 */
const ChangePasswordModal = ({ show, handleClose, onLogoutSuccess }) => {
    // --- State Variables ---
    const [oldPassword, setOldPassword] = useState(''); // Stores the value of the 'Ancien mot de passe' input
    const [newPassword, setNewPassword] = useState(''); // Stores the value of the 'Nouveau mot de passe' input
    const [confirmPassword, setConfirmPassword] = useState(''); // Stores the value of the 'Confirmer' input
    const [error, setError] = useState(null); // Stores general error messages (API errors, non-field specific)
    const [successMessage, setSuccessMessage] = useState(''); // Stores the success message after update
    const [isLoading, setIsLoading] = useState(false); // Tracks if the API request is in progress (for disabling inputs/button)
    const [validationErrors, setValidationErrors] = useState({}); // Stores field-specific validation errors from Laravel { field_name: ['Error message'] }

    // --- Effect Hook ---
    // Resets all form fields and messages when the modal becomes visible again after being hidden.
    useEffect(() => {
        // Only reset if the 'show' prop becomes true (modal is opening)
        if (show) {
            console.log("ChangePasswordModal: Resetting state on show.");
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setError(null);
            setSuccessMessage('');
            setIsLoading(false);
            setValidationErrors({});
        }
    }, [show]); // This effect runs whenever the 'show' prop changes

    // --- Form Submission Handler ---
    /**
     * Handles the submission of the password change form.
     * Performs frontend validation, sends data to the backend API,
     * handles success/error responses, and triggers logout on success.
     * @param {React.FormEvent<HTMLFormElement>} e - The form submission event.
     */
    const handleSubmit = async (e) => {
        // Prevent the default browser form submission behaviour (which causes a page reload)
        e.preventDefault();
        console.log("ChangePasswordModal: Handling form submission...");

        // Reset errors before attempting submission
        setError(null);
        setSuccessMessage('');
        setValidationErrors({});
        setIsLoading(true); // Indicate loading state

        // --- Frontend Validation Checks (Good User Experience) ---
        // Check if new password and confirmation match
        if (newPassword !== confirmPassword) {
            console.log("ChangePasswordModal: Frontend validation failed - Passwords don't match.");
            setError("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
            setIsLoading(false); // Stop loading
            return; // Stop submission
        }
        // Check minimum password length (should match backend validation)
        if (newPassword.length < 8) {
            console.log("ChangePasswordModal: Frontend validation failed - Password too short.");
            setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
            // Set validation error specifically for the new_password field
            setValidationErrors({ new_password: ["Le nouveau mot de passe doit contenir au moins 8 caractères."] });
            setIsLoading(false); // Stop loading
            return; // Stop submission
        }
        // --- End Frontend Validation ---

        // --- API Call ---
        try {
            console.log("ChangePasswordModal: Sending PUT request to /user/password...");
            // Send PUT request to the backend endpoint using axios
            // Use relative path '/user/password' because axios baseURL is set in App.js
            const response = await axios.put('/user/password', {
                old_password: oldPassword,                  // Send the old password
                new_password: newPassword,                  // Send the new password
                new_password_confirmation: confirmPassword, // Send the confirmation (required by backend 'confirmed' rule)
            });

            // --- Success Handling ---
            console.log("ChangePasswordModal: Password update successful.", response.data);
            // Set the success message from the server response, adding a note about logout
            setSuccessMessage(response.data.message + " Vous allez être déconnecté.");
            setIsLoading(false); // Stop loading indicator

            // Initiate logout process after a delay to allow user to read the success message
            setTimeout(() => {
                console.log("ChangePasswordModal: Closing modal and triggering logout...");
                handleClose(); // Close the modal window
                // Call the logout function passed from the parent component (App.js via Header.js)
                if (typeof onLogoutSuccess === 'function') {
                    onLogoutSuccess();
                } else {
                     console.error("ChangePasswordModal: onLogoutSuccess function is not available!");
                }
            }, 2000); // 2-second delay (adjust as needed)

        } catch (err) {
            // --- Error Handling ---
            console.error("ChangePasswordModal: Error during password update.", err);
            let errorMessage = "Une erreur est survenue lors de la mise à jour."; // Default error
            setValidationErrors({}); // Clear previous specific errors

            if (err.response) {
                // Handle errors with a response from the server (e.g., 422, 403, 500)
                console.error("ChangePasswordModal: Server responded with error:", err.response.status, err.response.data);
                const status = err.response.status;
                const data = err.response.data;

                if (status === 422 && data.errors) {
                    // Handle Laravel Validation Errors (Unprocessable Content)
                    console.log("ChangePasswordModal: Handling 422 validation errors.");
                    setValidationErrors(data.errors); // Store field-specific errors
                    // Get the first error message to display as a general hint
                    const firstErrorKey = Object.keys(data.errors)[0];
                    errorMessage = data.errors[firstErrorKey]?.[0] || "Erreur de validation.";
                     // Optionally clear the general error message if specific field errors are shown
                     // setError(null);
                } else if (data?.message) {
                    // Use a specific error message from the server response if available
                    errorMessage = data.message;
                } else {
                    // Fallback error message based on status code
                    errorMessage = `Erreur serveur (${status}). Veuillez réessayer.`;
                }
            } else if (err.request) {
                 // Handle network errors (no response received)
                 console.error("ChangePasswordModal: No response received from server.", err.request);
                 errorMessage = "Aucune réponse du serveur. Vérifiez votre connexion.";
            } else {
                // Handle errors setting up the request
                console.error("ChangePasswordModal: Error setting up request.", err.message);
                errorMessage = `Erreur: ${err.message}`;
            }
            setError(errorMessage); // Set the general error message state
            setIsLoading(false); // Stop loading indicator on error
        }
        // Removed 'finally' block as isLoading is managed within try/catch for success delay
    };

    // --- Render Modal JSX ---
    return (
        // React Bootstrap Modal component
        // 'show' controls visibility, 'onHide' is called when closing (backdrop click, ESC key)
        // 'backdrop="static"' prevents closing on backdrop click
        // 'keyboard={false}' prevents closing with ESC key (optional, allows focus management)
        // 'centered' vertically centers the modal
        <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false} centered>
            {/* Modal Header with title and close button */}
            <Modal.Header closeButton>
                <Modal.Title>Changer le mot de passe</Modal.Title>
            </Modal.Header>

            {/* Modal Body containing the form and messages */}
            <Modal.Body>
                {/* Display general error message (only if no specific validation errors exist) */}
                {error && !Object.keys(validationErrors).length > 0 && <Alert variant="danger">{error}</Alert>}
                {/* Display success message */}
                {successMessage && <Alert variant="success">{successMessage}</Alert>}

                {/* Conditionally render the form. Hide it if the success message is displayed. */}
                {!successMessage && (
                    // Assign an ID to the form for associating external buttons if needed
                    <Form id="changePasswordForm" onSubmit={handleSubmit}>
                        {/* --- Old Password Input --- */}
                        <Form.Group className="mb-3" controlId="modalOldPassword">
                            <Form.Label>Ancien mot de passe</Form.Label>
                            <Form.Control
                                type="password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                // Mark as invalid if there's a specific validation error for 'old_password'
                                // OR if the general error message mentions 'ancien' (less reliable)
                                isInvalid={!!validationErrors.old_password}
                                required // HTML5 required attribute
                                disabled={isLoading} // Disable input while loading
                                autoFocus // Automatically focus this field when the modal opens
                            />
                            {/* Display validation error message for this field */}
                            <Form.Control.Feedback type="invalid">
                                {validationErrors.old_password?.[0]}
                            </Form.Control.Feedback>
                        </Form.Group>

                        {/* --- New Password Input --- */}
                        <Form.Group className="mb-3" controlId="modalNewPassword">
                            <Form.Label>Nouveau mot de passe</Form.Label>
                            <Form.Control
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                isInvalid={!!validationErrors.new_password} // Mark invalid based on backend validation
                                required
                                disabled={isLoading}
                            />
                             {/* Display validation error message */}
                             <Form.Control.Feedback type="invalid">
                                {validationErrors.new_password?.[0]}
                            </Form.Control.Feedback>
                             {/* Helper text */}
                             <Form.Text muted>
                                Doit contenir au moins 8 caractères.
                             </Form.Text>
                        </Form.Group>

                        {/* --- Confirm New Password Input --- */}
                        <Form.Group className="mb-3" controlId="modalConfirmPassword">
                            <Form.Label>Confirmer le nouveau mot de passe</Form.Label>
                            <Form.Control
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                // Provide immediate feedback if passwords don't match (frontend check)
                                isInvalid={newPassword !== confirmPassword && confirmPassword !== ''}
                                required
                                disabled={isLoading}
                            />
                             {/* Display error message: prioritized frontend mismatch check */}
                             <Form.Control.Feedback type="invalid">
                                {(newPassword !== confirmPassword && confirmPassword !== '')
                                    ? 'Les mots de passe ne correspondent pas.'
                                    : validationErrors.new_password?.[0] /* Show backend error if frontend matches */
                                }
                             </Form.Control.Feedback>
                        </Form.Group>
                    </Form>
                 )} {/* End of conditional form rendering */}
            </Modal.Body>

            {/* Modal Footer containing action buttons */}
            <Modal.Footer>
                 {/* Conditionally render buttons: Hide if success message is shown */}
                 {!successMessage && (
                    <>
                        {/* Cancel Button */}
                        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
                            Annuler
                        </Button>
                        {/* Submit Button: Use type="submit" and onClick handler */}
                        {/* Alternatively, associate with form using 'form="changePasswordForm"' if button is outside <Form> */}
                        <Button variant="primary" type="submit" disabled={isLoading} onClick={handleSubmit}>
                            {/* Show spinner and different text when loading */}
                            {isLoading ? (
                                <>
                                    <Spinner
                                        as="span"
                                        animation="border"
                                        size="sm"
                                        role="status"
                                        aria-hidden="true"
                                        className="me-2" // Margin end for spacing
                                    />
                                    Mise à jour...
                                </>
                            ) : (
                                'Mettre à jour' // Default button text
                            )}
                        </Button>
                    </>
                )}
                {/* Optionally show a close button even after success */}
                {successMessage && (
                     <Button variant="secondary" onClick={handleClose}>
                         Fermer
                     </Button>
                 )}
            </Modal.Footer>
        </Modal> // End of React Bootstrap Modal
    ); // End of return statement
}; // End of ChangePasswordModal component

// Export the component for use in other files (like Header.js)
export default ChangePasswordModal;