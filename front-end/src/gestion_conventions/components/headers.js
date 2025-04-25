// src/gestion_conventions/components/headers.js

// --- Core React and Hook Imports ---
import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Child Component Imports ---
import UserDropdown from './UserDropdown'; // The dropdown menu component
import ChangePasswordModal from './ChangePasswordModel'; // The new modal component (Adjust path if needed)

// --- Styling and Icons ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle,   // User profile icon
  faSignOutAlt,   // Logout icon
  faSpinner       // Loading spinner icon
} from '@fortawesome/free-solid-svg-icons';
import './Header.css'; // Styles for the Header component itself

/**
 * Header Component
 *
 * Renders the top navigation bar for logged-in users.
 * Includes a user profile icon triggering a dropdown (UserDropdown),
 * which contains an option to open the ChangePasswordModal.
 * Also includes a separate direct logout button.
 * Manages the visibility state for both the dropdown and the modal.
 *
 * @param {object} props - Component props.
 * @param {function} props.onLogout - Function from App.js to handle the complete logout process.
 * @param {object|null} props.currentUser - The currently logged-in user object passed from App.js.
 */
export default function Header({ onLogout, currentUser }) {
    // --- State ---
    // Controls visibility of the UserDropdown menu
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    // Tracks if logout API call is in progress
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    // Controls visibility of the ChangePasswordModal
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    // --- Refs ---
    // Ref for the user icon element that triggers the dropdown
    const triggerRef = useRef(null);
    // Ref for the UserDropdown component itself (for click outside detection)
    const dropdownRef = useRef(null);

    // --- Callbacks ---
    /** Closes the UserDropdown menu */
    const closeDropdown = useCallback(() => {
        setIsDropdownVisible(false);
    }, []);

    /** Toggles the visibility of the UserDropdown menu */
    const toggleDropdown = () => {
        setIsDropdownVisible(prev => !prev);
    };

    /** Handles the click on the separate logout icon */
    const handleLogoutClick = async () => {
         if (isLoggingOut) return;
         setIsLoggingOut(true);
         console.log("Header: Logout icon clicked, calling onLogout prop...");
         try {
             await onLogout(); // Call the main logout function from App.js
         } catch (error) {
             console.error("Header: Error during onLogout prop execution:", error);
         } finally {
             setIsLoggingOut(false);
         }
    };

    /** Opens the ChangePasswordModal and closes the UserDropdown */
    const handleOpenPasswordModal = useCallback(() => {
        console.log("Header: Opening Change Password Modal.");
        closeDropdown(); // Close the dropdown first
        setShowPasswordModal(true); // Set state to show the modal
    }, [closeDropdown]); // Dependency: closeDropdown function

    /** Closes the ChangePasswordModal */
    const handleClosePasswordModal = useCallback(() => {
        console.log("Header: Closing Change Password Modal.");
        setShowPasswordModal(false); // Set state to hide the modal
    }, []);
    // --- End Callbacks ---


    // --- Effect Hook for Click Outside Dropdown ---
    // Closes the UserDropdown when a click occurs outside of it or its trigger
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                triggerRef.current && !triggerRef.current.contains(event.target) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target)
            ) {
                closeDropdown();
            }
        };
        if (isDropdownVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isDropdownVisible, closeDropdown]); // Dependencies ensure effect updates correctly


    // --- Render Component JSX ---
    return (
        // Use React Fragment (<>...</>) to return multiple top-level elements (header and modal)
        <>
            {/* The main header bar */}
            <header className="main-content-header">
                {/* Container for action icons, usually aligned right */}
                <div className="header-actions">

                    {/* --- User Profile Section (Icon + Dropdown Trigger) --- */}
                    <div className="user-profile-section">
                        {/* Clickable span containing the user icon */}
                        <span
                            ref={triggerRef} // Ref for click outside detection
                            onClick={toggleDropdown} // Toggle dropdown visibility
                            className="icon-placeholder user-icon-container"
                            title="Profile Options"
                            role="button"
                            aria-haspopup="true"
                            aria-expanded={isDropdownVisible}
                            tabIndex={0}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleDropdown()}
                           >
                            <FontAwesomeIcon icon={faUserCircle} className="header-icon" />
                        </span>

                        {/* Conditionally render the UserDropdown menu */}
                        {isDropdownVisible && (
                            <UserDropdown
                                ref={dropdownRef} // Pass ref to the dropdown component
                                currentUser={currentUser} // Pass user data
                                closeDropdown={closeDropdown} // Pass function to close dropdown
                                onOpenChangePasswordModal={handleOpenPasswordModal} // Pass function to open modal
                            />
                        )}
                    </div>
                    {/* --- End User Profile Section --- */}


                    {/* --- Separate Logout Icon Section --- */}
                    <span
                        onClick={handleLogoutClick} // Trigger logout
                        className={`icon-placeholder logout-icon-container ${isLoggingOut ? 'disabled' : ''}`}
                        title={isLoggingOut ? "Déconnexion en cours..." : "Déconnexion"}
                        role="button"
                        aria-disabled={isLoggingOut}
                        tabIndex={isLoggingOut ? -1 : 0}
                        onKeyDown={(e) => !isLoggingOut && (e.key === 'Enter' || e.key === ' ') && handleLogoutClick()}
                    >
                        {/* Show spinner or logout icon based on state */}
                        {isLoggingOut
                           ? <FontAwesomeIcon icon={faSpinner} spin className="header-icon" />
                           : <FontAwesomeIcon icon={faSignOutAlt} className="header-icon" />
                        }
                    </span>
                    {/* --- End Logout Icon Section --- */}

                </div> {/* End header-actions */}
            </header> {/* End main-content-header */}

            {/* --- Render the ChangePasswordModal --- */}
            {/* The modal is always rendered in the DOM but controlled by the 'show' prop */}
            {/* This is generally better for accessibility and state management than conditional mounting */}
            <ChangePasswordModal
                show={showPasswordModal} // Controlled by state
                handleClose={handleClosePasswordModal} // Pass function to close the modal
                onLogoutSuccess={onLogout} // Pass the main application logout function
            />
        </> // End React Fragment
    ); // End return statement
} // End Header component

// --- Default Props ---
// Define default values for props to prevent errors if they aren't passed
Header.defaultProps = {
  currentUser: null, // Default to null if no user data is provided
  // Provide a default function for onLogout that logs a warning
  onLogout: async () => { console.warn('Header Component: onLogout prop was not provided.'); },
};