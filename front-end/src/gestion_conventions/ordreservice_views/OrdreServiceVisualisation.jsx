// src/gestion_conventions/ordres_service_views/OrdreServiceVisualisation.jsx (adjust path if needed)

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios'; // Use your configured axios instance
import { Spinner, Alert, Badge, Stack, Button, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt, faFileArchive,
    faExternalLinkAlt, faTimes, faInfoCircle, faCalendarAlt, faHashtag,
    faFileSignature, faStopCircle, faPlayCircle, faPaperclip, faFileContract,
    faUserTie // Added icon for Fonctionnaire
} from '@fortawesome/free-solid-svg-icons';
import '../marches_views/marche.css'; // Assuming this provides the 'holder' class or other styles

// --- Helper Functions ---

// Formats date string (e.g., YYYY-MM-DD HH:MM:SS) to DD/MM/YYYY
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            throw new Error("Invalid date format expected YYYY-MM-DD");
        }
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Date format error:", dateString, e);
        return dateString;
    }
};

// Determines FontAwesome icon based on filename or type
const getFileIcon = (filenameOrMimeType) => {
    if (!filenameOrMimeType) return faFileAlt;
    const lowerCase = String(filenameOrMimeType).toLowerCase();
    if (lowerCase.includes('pdf')) return faFilePdf;
    if (lowerCase.includes('doc')) return faFileWord;
    if (lowerCase.includes('xls')) return faFileExcel;
    if (['zip', 'rar', '7z'].some(ext => lowerCase.endsWith(ext))) return faFileArchive;
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage;
    return faFileAlt;
};

// Constructs the public URL for accessing stored files
const getPublicFileUrl = (baseApiUrl, relativePath) => {
    if (!relativePath || !baseApiUrl) return null;
    try {
        const url = new URL(baseApiUrl);
        let baseUrl = url.origin;
        if (url.pathname.includes('/api')) {
            baseUrl += url.pathname.substring(0, url.pathname.indexOf('/api'));
        }
        baseUrl = baseUrl.replace(/\/$/, '');
        return `${baseUrl}/storage/${relativePath.replace(/^\//, '')}`;
    } catch (e) {
        console.error("Error constructing public URL:", e);
        return null;
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

        if (!itemId) {
            setError("ID de l'Ordre de Service manquant.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        setOrdreData(null);
        console.log(`OrdreServiceVisualisation: Fetching details for ID: ${itemId}`);

        // *** IMPORTANT: Adjust the API endpoint if your backend needs to load the fonctionnaire relationship ***
        // If the backend doesn't automatically include it, you might need a query param like '?include=fonctionnaire'
        // Or ensure the backend controller always loads it for the 'show' method.
        const apiUrl = `${baseApiUrl}/ordres-service/${itemId}`; // Add query params if needed '?include=fonctionnaire'

        axios.get(apiUrl, { withCredentials: true }) // Added withCredentials
            .then(response => {
                if (!isMounted) return;

                const fetchedData = response.data?.ordre_service || response.data || null;

                if (fetchedData) {
                    setOrdreData(fetchedData);
                    console.log("Fetched OrdreService details:", fetchedData);
                    // Log if fonctionnaire data is present
                    console.log("Fonctionnaire data in response:", fetchedData.fonctionnaire);
                } else {
                    setError("Données de l'ordre de service non trouvées pour cet ID.");
                    console.warn(`No data found for OrdreService ID: ${itemId}`);
                }
            })
            .catch(err => {
                if (!isMounted) return;
                console.error(`Error fetching Ordre Service details (ID: ${itemId}):`, err.response || err);
                if (err.response && err.response.status === 404) {
                    setError("Ordre de Service non trouvé (ID: " + itemId + ").");
                } else {
                    setError(err.response?.data?.message || err.message || "Erreur lors du chargement des détails.");
                }
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => { isMounted = false; };
    }, [itemId, baseApiUrl]);

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
        return <Alert variant="warning" className="m-3">Aucune donnée disponible pour cet ordre de service.</Alert>;
    }

    // --- Data Destructuring (after checks) ---
    const {
        type, numero, date_emission, description, fichier_joint,
        marche_public, // Assuming this object is included from backend
        id_fonctionnaire, // The ID
        fonctionnaire // <<< The loaded fonctionnaire object from backend (assuming Option A)
    } = ordreData;

    const typeInfo = getTypeDisplay(type);
    const fileUrl = getPublicFileUrl(baseApiUrl, fichier_joint);
    const fileName = fichier_joint ? fichier_joint.split('/').pop() : null;
    const fonctionnaireName = fonctionnaire?.nom_complet || null; // Get name if object exists

    // --- Main Render ---
    return (
        // Keep existing holder class and padding
        <div className='holder' style={{padding:'70px'}}>
            {/* Header Section */}
            <Row className="mb-4 pb-3 align-items-center border-bottom ">
                <Col>
                    <h2 className="mb-1 fw-bold" style={{fontFamily:'Poppins'}}> Ordre de Service : {numero}</h2>
                </Col>
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
                       <strong className="d-block text-dark">
                           <FontAwesomeIcon icon={faHashtag} className="me-1 text-warning"/> Numéro/Référence:
                       </strong>
                       <span>{numero || '-'}</span>
                    </Col>


                    {/* Date Emission */}
                    <Col md={4} className="mb-3">
                        <strong className="d-block ">
                            <FontAwesomeIcon icon={faCalendarAlt}  className="me-1 text-warning" /> Date d'Émission:
                        </strong>
                        <span className="">{formatDate(date_emission) || '-'}</span>
                    </Col>
                </Row>

                 {/* Row for Marche Public and Fonctionnaire */}
                 <Row className="mt-2 pt-3 border-top">
                      {/* Marché Public */}
                     <Col md={6} className="mb-3">
                         <strong className="d-block text-dark">
                             <FontAwesomeIcon icon={faFileContract} className="me-1 text-warning"/> Lié au Marché:
                         </strong>
                         {marche_public ? (
                            <div className="ms-2">
                                <span className="d-block">{marche_public.numero_marche || 'N/A'}</span>
                                <em className="text-muted" style={{ fontSize: '0.9em' }}>{marche_public.intitule || 'Intitulé non disponible'}</em>
                             </div>
                         ) : (
                            <span className="text-muted ms-2 fst-italic">Non spécifié</span>
                         )}
                     </Col>

                     {/* Fonctionnaire */}
                     <Col md={6} className="mb-3">
                         <strong className="d-block text-dark">
                             <FontAwesomeIcon icon={faUserTie} className="me-1 text-warning"/> Points Focaux:
                         </strong>
                         {/* Display name if available, otherwise the ID, otherwise '-' */}
                         <span className="ms-2">
                             {fonctionnaireName ? (
                                 fonctionnaireName
                             ) : id_fonctionnaire ? (
                                 <span className="text-muted fst-italic">(ID: {id_fonctionnaire})</span> // Show ID if name is missing but ID exists
                             ) : (
                                 '-' // Show dash if no ID or name
                             )}
                         </span>
                     </Col>
                 </Row>

                {/* Description (only shown if present) */}
                {description && (
                     <Row>
                         <Col xs={12} className="mb-2 mt-2 pt-3 border-top">
                            <strong className="d-block text-dark">Description:</strong>
                            <p className="bg-light p-2 rounded border" style={{ whiteSpace: 'pre-wrap', fontSize: '0.95em' }}>{description}</p>
                         </Col>
                     </Row>
                 )}
            </Card.Body>
        </Card>

        {/* Fichier Joint Section */}
        <h5 className='bg-transparent text-uppercase fw-bold text-secondary mb-4 mt-4'>
        <FontAwesomeIcon icon={faPaperclip} className="me-2 text-warning" /> Fichier Joint
        </h5>
        <Card className="shadow-sm border-0">
            <Card.Body>
                {fileName && fileUrl ? (
                    <Stack direction="horizontal" gap={3} className="align-items-center">
                        <FontAwesomeIcon icon={getFileIcon(fileName)} size="lg" className="text-secondary" /> {/* Slightly larger icon */}
                        <span className="me-auto text-truncate fw-medium" title={fileName}>
                            {fileName}
                        </span>
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-warning bg-dark py-1 px-3" // Keep style
                            title="Ouvrir le fichier joint"
                        >
                            <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" className='me-1'/> Ouvrir
                        </a>
                    </Stack>
                ) : (
                    <span className="text-muted fst-italic">
                        <FontAwesomeIcon icon={faInfoCircle} className="me-1"/> Aucun fichier n'est joint à cet ordre de service.
                    </span>
                )}
            </Card.Body>
         </Card>
    </div> // End holder div
    );
};

// --- PropTypes Definition ---
OrdreServiceVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func,
    baseApiUrl: PropTypes.string.isRequired,
};

export default OrdreServiceVisualisation;