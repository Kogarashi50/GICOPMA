// src/pages/ActionButton.jsx
import React from 'react';
import { Button, Spinner } from 'react-bootstrap'; // Import Spinner
import { IconContext } from 'react-icons';
import { FaPlus, FaFlag, FaDownload, FaFileContract } from 'react-icons/fa'; // Standard react-icons import

// Map internal icon names to actual icons
const actionIconMap = {
    plus: <FaPlus />,
    flag: <FaFlag />,
    download: <FaDownload />,
    faFileContract: <FaFileContract /> // Using the FaFileContract from react-icons/fa
    // Add other icons if needed, e.g., edit: <FaEdit />
};

export default function ActionButton({
    text,
    icon, // This should be a key from actionIconMap (e.g., "plus", "download")
    onClick,
    variant = 'light', // Default Bootstrap button variant
    className = '',    // Allows additional custom classes
    loading = false,   // Prop to indicate loading state
    disabled = false   // Prop to explicitly disable the button
}) {
    const buttonIcon = actionIconMap[icon]; // Get the icon component based on the prop

    return (
        <Button
            variant={variant}
            onClick={onClick}
            className={`w-100 d-flex border border-dark align-items-center justify-content-center p-2 shadow-sm ${className}`} // Correctly combines fixed and passed classes
            disabled={disabled || loading} // Button is disabled if explicitly disabled OR if loading
        >
            {loading ? (
                <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2" // Margin to the right of the spinner
                />
            ) : (
                buttonIcon && ( // Only render IconContext if buttonIcon exists
                    <IconContext.Provider value={{ className: 'me-2' }}>
                        {buttonIcon}
                    </IconContext.Provider>
                )
            )}
            <span className="small">{text}</span>
        </Button>
    );
}