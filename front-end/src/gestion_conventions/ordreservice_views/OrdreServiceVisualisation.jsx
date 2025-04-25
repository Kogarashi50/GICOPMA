// src/gestion_conventions/ordres_service_views/OrdreServiceVisualisation.jsx (adjust path if needed)

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios'; // Use your configured axios instance
import { Spinner, Alert, Badge, Stack, Button, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt, faFileArchive,
    faExternalLinkAlt, faTimes, faInfoCircle, faCalendarAlt, faHashtag,
    faFileSignature, faStopCircle, faPlayCircle, faPaperclip, faFileContract // Added icons
} from '@fortawesome/free-solid-svg-icons';
import '../marches_views/marche.css'
// --- Helper Functions ---

// Formats date string (e.g., YYYY-MM-DD HH:MM:SS) to DD/MM/YYYY
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        // Take only the date part before potential space
        const datePart = dateString.split(' ')[0];
        // Basic check for YYYY-MM-DD format
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            throw new Error("Invalid date format expected YYYY-MM-DD");
        }
        // Split and reassemble for DD/MM/YYYY display
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Date format error:", dateString, e);
        return dateString; // Return original string on error
    }
};

// Determines FontAwesome icon based on filename or type
const getFileIcon = (filenameOrMimeType) => {
    if (!filenameOrMimeType) return faFileAlt; // Default icon
    const lowerCase = String(filenameOrMimeType).toLowerCase();
    if (lowerCase.includes('pdf')) return faFilePdf;
    if (lowerCase.includes('doc')) return faFileWord; // Catches .doc, .docx
    if (lowerCase.includes('xls')) return faFileExcel; // Catches .xls, .xlsx
    if (['zip', 'rar', '7z'].some(ext => lowerCase.endsWith(ext))) return faFileArchive; // Archive icon
    // Image check (more comprehensive)
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage;
    return faFileAlt; // Default fallback
};

// Constructs the public URL for accessing stored files
// Adjust baseURL calculation if your /storage route is different
const getPublicFileUrl = (baseApiUrl, relativePath) => {
    if (!relativePath || !baseApiUrl) return null; // Return null if no path or base URL
    try {
        const url = new URL(baseApiUrl);
        let baseUrl = url.origin;
        // Attempt to remove '/api' if present in the pathname
        if (url.pathname.includes('/api')) {
            baseUrl += url.pathname.substring(0, url.pathname.indexOf('/api'));
        }
        baseUrl = baseUrl.replace(/\/$/, ''); // Remove any trailing slash
        // Assumes files are served from a '/storage/' route linked to storage/app/public
        return `${baseUrl}/storage/${relativePath.replace(/^\//, '')}`;
    } catch (e) {
        console.error("Error constructing public URL:", e);
        return null; // Return null on error
    }
};

// Provides display label, icon, and color based on the 'type' value
const getTypeDisplay = (typeValue) => {
    switch (typeValue) {
        case 'commencement':
            return { label: 'Ordre de Commencement', icon: faPlayCircle, color: 'success' };
        case 'arret':
            return { label: 'Ordre d\'Arrêt', icon: faStopCircle, color: 'danger' };
        default:
            // Fallback for unknown types
            return { label: typeValue || 'Indéfini', icon: faFileSignature, color: 'secondary' };
    }
};
// --- End Helper Functions ---


// --- Component Definition ---
const OrdreServiceVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    // State for the fetched Ordre de Service data
    const [ordreData, setOrdreData] = useState(null);
    // State for loading indicator
    const [loading, setLoading] = useState(true);
    // State for storing any fetch errors
    const [error, setError] = useState(null);

    // Effect to fetch data when component mounts or ID changes
    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates if component unmounts during fetch

        // Validate the input ID
        if (!itemId) {
            setError("ID de l'Ordre de Service manquant.");
            setLoading(false);
            return; // Stop execution if no ID
        }

        // Reset state before fetching
        setLoading(true);
        setError(null);
        setOrdreData(null);
        console.log(`OrdreServiceVisualisation: Fetching details for ID: ${itemId}`);

        // Perform the API call
        axios.get(`${baseApiUrl}/ordres-service/${itemId}`)
            .then(response => {
                // Only update state if the component is still mounted
                if (!isMounted) return;

                // Extract data, assuming nested structure 'ordre_service'
                const fetchedData = response.data?.ordre_service || response.data || null;

                if (fetchedData) {
                    // Successfully fetched data
                    setOrdreData(fetchedData);
                    console.log("Fetched OrdreService details:", fetchedData);
                } else {
                    // API responded but no data found for the ID
                    setError("Données de l'ordre de service non trouvées pour cet ID.");
                    console.warn(`No data found for OrdreService ID: ${itemId}`);
                }
            })
            .catch(err => {
                // Only update state if the component is still mounted
                if (!isMounted) return;

                // Handle API call errors (network, server error, etc.)
                console.error(`Error fetching Ordre Service details (ID: ${itemId}):`, err.response || err);
                // Set a user-friendly error message
                if (err.response && err.response.status === 404) {
                    setError("Ordre de Service non trouvé (ID: " + itemId + ").");
                } else {
                    setError(err.response?.data?.message || err.message || "Erreur lors du chargement des détails.");
                }
            })
            .finally(() => {
                // Stop loading indicator regardless of outcome, if component still mounted
                if (isMounted) setLoading(false);
            });

        // Cleanup function to run when the component unmounts or ID changes
        return () => { isMounted = false; };
    }, [itemId, baseApiUrl]); // Dependencies: Rerun effect if ID or base URL changes

    // --- Conditional Rendering: Loading State ---
    if (loading) {
        return <div className="text-center p-5"><Spinner animation="border" role="status"><span className="visually-hidden">Chargement...</span></Spinner> Chargement des détails...</div>;
    }

    // --- Conditional Rendering: Error State ---
    if (error) {
        return <Alert variant="danger" className="m-3">Erreur: {error}</Alert>;
    }

    // --- Conditional Rendering: No Data Found ---
    if (!ordreData) {
        // This case should ideally be covered by the 404 error handling, but include as a fallback
        return <Alert variant="warning" className="m-3">Aucune donnée disponible pour cet ordre de service.</Alert>;
    }

    // --- Data Destructuring (after checks) ---
    const { type, numero, date_emission, description, fichier_joint, marche_public } = ordreData;
    // Get display properties for the 'type'
    const typeInfo = getTypeDisplay(type);
    // Construct the URL for the attached file
    const fileUrl = getPublicFileUrl(baseApiUrl, fichier_joint);
    // Extract filename from the path for display
    const fileName = fichier_joint ? fichier_joint.split('/').pop() : null;

    // --- Main Render ---
    return (
        <div className='holder' style={{padding:'70px'}}>
            {/* Header Section */}
            <Row className="mb-4 pb-3 align-items-center border-bottom ">
                <Col>
                    {/* Main Title */}
                    <h2 className="mb-1 fw-bold" style={{fontFamily:'Poppins'}}> Ordre de Service :{numero}</h2>
                    {/* Display linked Marche Public info if available */}
                   
                </Col>
                {/* Optional Close Button */}
                <Col xs="auto">
                    {onClose && (
                          <Button variant="warning" className='btn rounded-5 px-5 py-2 bg-warning shadow' onClick={onClose} size="sm" title="Retour">
                                                      <b>Revenir a la liste</b>
                                                 </Button>
                    )}
                </Col>
            </Row>

            {/* Main Details Card */}
           
                <h5 className='bg-transparent text-uppercase fw-bold text-secondary mb-4'>
                    Informations Principales
                </h5>
               <Card className="mb-4 shadow-sm border-0">  <Card.Body>
                    <Row>
                        {/* Type */}
                        <Col md={4} className="mb-3">
                            <strong className="d-block text-dark">Type:</strong>
                            <Badge bg={typeInfo.color || 'secondary'} className="p-2 fs-6 shadow-sm">
                                <FontAwesomeIcon icon={typeInfo.icon} className="me-2" />
                                {typeInfo.label}
                            </Badge>
                        </Col>

                        {/* Numero */}
                        <Col md={4} className="mb-3">
                         {marche_public ? ( <div>  <strong className="d-block text-dark">
                            <FontAwesomeIcon icon={faFileContract} className="me-1 text-warning"/>
                            Lié au Marché: 
                            </strong>
                            <span>{marche_public.numero_marche || 'N/A'}</span> <br/><em><small className='text-muted' style={{fontSize:'16px'}}>{marche_public.intitule || 'Intitulé non disponible'}</small></em>
                            </div> 
                        
                    ) : (
                         <small className="text-danger d-block">Marché public associé non trouvé.</small>
                    )}
                        </Col>

                        {/* Date Emission */}
                        <Col md={4} className="mb-3">
                            <strong className="d-block ">
                                <FontAwesomeIcon icon={faCalendarAlt}  className="me-1 text-warning" /> Date d'Émission:
                            </strong>
                            <span className="">{formatDate(date_emission) || '-'}</span>
                        </Col>
                    </Row>

                    {/* Description (only shown if present) */}
                    {description && (
                         <Row>
                             <Col xs={12} className="mb-2 mt-2 pt-2 border-top">
                                <strong className="d-block text-dark">Description:</strong>
                                {/* Use pre-wrap to respect newlines and spaces in the description */}
                                <p className="bg-light p-2 rounded border" style={{ whiteSpace: 'pre-wrap', fontSize: '0.95em' }}>{description}</p>
                             </Col>
                         </Row>
                     )}
                </Card.Body>
            </Card>
            <h5 className='bg-transparent text-uppercase fw-bold text-secondary mb-4'>
            <FontAwesomeIcon icon={faPaperclip} className="me-2 text-warning" /> Fichier Joint
            </h5>
            {/* Fichier Joint Card */}
            <Card className="shadow-sm border-0">
                 
                <Card.Body>
                    {/* Display file info if filename and URL exist */}
                    {fileName && fileUrl ? (
                        <Stack direction="horizontal" gap={3} className="align-items-center">
                            {/* File Icon */}
                            <FontAwesomeIcon icon={getFileIcon(fileName)} size="x" className="text-dark" />
                            {/* Filename (truncated for potentially long names) */}
                            <span className="me-auto text-truncate fw-medium" title={fileName}>
                                {fileName}
                            </span>
                            {/* Link to open the file */}
                            <a
                                href={fileUrl}
                                target="_blank" // Open in new tab
                                rel="noopener noreferrer" // Security best practice
                                className="btn btn-sm btn-outline-warning bg-dark py-1 px-3"
                                title="Ouvrir le fichier joint"
                            >
                                <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" className='me-1'/> Ouvrir
                            </a>
                        </Stack>
                    ) : (
                        // Message if no file is attached
                        <span className="text-muted fst-italic">
                            <FontAwesomeIcon icon={faInfoCircle} className="me-1"/> Aucun fichier n'est joint à cet ordre de service.
                        </span>
                    )}
                </Card.Body>
             </Card>
        </div>
    );
};

// --- PropTypes Definition ---
OrdreServiceVisualisation.propTypes = {
    // The ID of the Ordre de Service to display
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    // Optional function to close this view (e.g., if shown in a modal)
    onClose: PropTypes.func,
    // Base URL for making API calls
    baseApiUrl: PropTypes.string.isRequired,
};

export default OrdreServiceVisualisation;