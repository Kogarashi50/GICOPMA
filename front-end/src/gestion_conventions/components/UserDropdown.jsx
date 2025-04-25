// src/components/UserDropdown/UserDropdown.jsx

// --- Core React and Routing Imports ---
import React from 'react'; // Import the main React library
// import { Link } from 'react-router-dom'; // Link component is removed as navigation is replaced by modal trigger

// --- Styling and Icons ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Component to render FontAwesome icons
import { faKey, faSpinner } from '@fortawesome/free-solid-svg-icons'; // Import necessary icons: Key (password), Spinner (loading)

// --- CSS Import ---
// *** IMPORTANT: Ensure this path points to the correct CSS file for this component's styles ***
import './Header.css'; // Assuming styles are in UserDropdown.css
// Or import './Header.css'; // If styles were added to Header.css

/**
 * UserDropdown Component (Modified for Modal Trigger)
 *
 * Displays user information (name and role) and provides an action item
 * to open the "Change Password" modal dialog.
 *
 * @param {object} props - Component props.
 * @param {object|null} props.currentUser - The currently logged-in user object. Expected: 'nom_complet', 'email', 'roles'.
 * @param {function} props.closeDropdown - Function from the parent (Header) to close this dropdown.
 * @param {function} props.onOpenChangePasswordModal - Function from the parent (Header) to signal that the change password modal should be opened.
 * @param {React.Ref} ref - Forwarded ref pointing to the main div element of the dropdown.
 */
const UserDropdown = React.forwardRef(({ currentUser, closeDropdown, onOpenChangePasswordModal }, ref) => {

    /**
     * Handles the click event on the "Changer le mot de passe" list item.
     * Calls the function passed from the parent to open the modal,
     * and then closes this dropdown menu.
     */
    const handleChangePasswordClick = () => {
        console.log("UserDropdown: Change Password item clicked.");
        // Call the handler passed from Header.js to open the modal
        if (typeof onOpenChangePasswordModal === 'function') {
            onOpenChangePasswordModal();
        } else {
             console.warn("UserDropdown: onOpenChangePasswordModal prop is not a function!");
        }
        // Close this dropdown menu itself
        closeDropdown();
    };

    // --- Render Component JSX ---
    return (
        // Main container div for the dropdown, ref attached for parent interaction
        <div className="user-dropdown" ref={ref}>

            {/* --- User Information Section --- */}
            {/* Displays user name/role or loading state */}
            {currentUser ? (
                <div className="user-info-section">
                    <div
                        className="user-name"
                        title={currentUser.nom_complet || currentUser.email || ''}
                    >
                        {/* Display full name or email fallback */}
                        {currentUser.nom_complet || currentUser.email || 'Utilisateur'}
                    </div>
                    <div className="user-role">
                        {/* Display first role or default */}
                        {(currentUser.roles && currentUser.roles.length > 0) ? currentUser.roles[0] : 'Membre'}
                    </div>
                </div>
            ) : (
                 // Loading state display
                 <div className="user-info-section loading-indicator">
                     <FontAwesomeIcon icon={faSpinner} spin size="sm" />
                     <span style={{ marginLeft: '8px' }}>Chargement...</span>
                 </div>
            )}
            {/* --- End User Information Section --- */}

            {/* Visual separator line */}
            <hr className="dropdown-separator" />

            {/* --- Action Items List --- */}
            <ul>
                {/* Removed Profile and Settings placeholders */}

                {/* --- Change Password Item (Triggers Modal) --- */}
                {/* This list item now calls handleChangePasswordClick instead of using a Link */}
                <li onClick={handleChangePasswordClick}>
                    <FontAwesomeIcon icon={faKey} className="dropdown-icon" /> {/* Password icon */}
                    Changer le mot de passe {/* Text */}
                </li>
                {/* --- End Change Password Item --- */}

            </ul>
            {/* --- End Action Items List --- */}

        </div> // End of main user-dropdown div
    ); // End of return statement
}); // End of React.forwardRef

// Export the component
export default UserDropdown;