// src/gestion_conventions/components/headers.js

// --- Core React and Hook Imports ---
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';

// --- Child Component Imports ---
import UserDropdown from './UserDropdown';
import ChangePasswordModal from './ChangePasswordModel';
import NotificationBell from './NotificationBell'; // --- MODIFICATION START: Import the bell ---

// --- Styling and Icons ---
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle,
  faSignOutAlt,
  faSpinner,
  faCommentDots
} from '@fortawesome/free-solid-svg-icons';
import { Button } from 'react-bootstrap';
import './Header.css';

export default function Header({ onLogout, currentUser, onAddObservationClick }) {
    // --- State and other logic remains unchanged ---
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const triggerRef = useRef(null);
    const dropdownRef = useRef(null);
    const closeDropdown = useCallback(() => setIsDropdownVisible(false), []);
    const toggleDropdown = () => setIsDropdownVisible(prev => !prev);
    const handleLogoutClick = async () => {
         if (isLoggingOut) return;
         setIsLoggingOut(true);
         try { await onLogout(); }
         catch (error) { console.error("Header: Error during logout:", error); }
         finally { setIsLoggingOut(false); }
    };
    const handleOpenPasswordModal = useCallback(() => { closeDropdown(); setShowPasswordModal(true); }, [closeDropdown]);
    const handleClosePasswordModal = useCallback(() => setShowPasswordModal(false), []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (triggerRef.current && !triggerRef.current.contains(event.target) && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                closeDropdown();
            }
        };
        if (isDropdownVisible) { document.addEventListener('mousedown', handleClickOutside); }
        return () => { document.removeEventListener('mousedown', handleClickOutside); };
    }, [isDropdownVisible, closeDropdown]);

    return (
        <>
            <header className="main-content-header">
                <div className="header-left-actions mx-3">
                    {/* --- MODIFIED BUTTON --- */}
                    <Button
                        variant="success"
                        size="sm"
                        onClick={onAddObservationClick}
                        className="d-flex text-white align-items-center shadow-sm btn-observation-hover" // <-- ADDED CUSTOM CLASS
                    >
                        <FontAwesomeIcon icon={faCommentDots} />
                        {/* The text is now in its own span for easier CSS targeting */}
                        <span className="btn-observation-text">Ajouter Observation</span>
                    </Button>
                </div>

                <div className="header-actions">
                    <NotificationBell />
                    <div className="user-profile-section">
                        <span ref={triggerRef} onClick={toggleDropdown} className="icon-placeholder user-icon-container" title="Options de profil" role="button" tabIndex={0}>
                            <FontAwesomeIcon icon={faUserCircle} className="header-icon" />
                        </span>
                        {isDropdownVisible && <UserDropdown ref={dropdownRef} currentUser={currentUser} closeDropdown={closeDropdown} onOpenChangePasswordModal={handleOpenPasswordModal} />}
                    </div>
                    <span onClick={handleLogoutClick} className={`icon-placeholder logout-icon-container ${isLoggingOut ? 'disabled' : ''}`} title={isLoggingOut ? "Déconnexion en cours..." : "Déconnexion"} role="button" tabIndex={isLoggingOut ? -1 : 0}>
                        {isLoggingOut ? <FontAwesomeIcon icon={faSpinner} spin className="header-icon" /> : <FontAwesomeIcon icon={faSignOutAlt} className="header-icon" />}
                    </span>
                </div>
            </header>

            <ChangePasswordModal show={showPasswordModal} handleClose={handleClosePasswordModal} onLogoutSuccess={onLogout} />
        </>
    );
}

// --- PropTypes and Default Props (Unchanged) ---
Header.propTypes = {
    currentUser: PropTypes.object,
    onLogout: PropTypes.func.isRequired,
    onAddObservationClick: PropTypes.func.isRequired,
};
Header.defaultProps = {
  currentUser: null,
};