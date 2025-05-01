// src/gestion_conventions/ordres_service_views/OrdreServiceVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react'; // Removed useMemo as publicBaseUrl calculation is no longer needed for file URLs
import PropTypes from 'prop-types';
import axios from 'axios';
import { Spinner, Alert, Badge, Stack, Button, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt, faFileArchive,
    faExternalLinkAlt, faTimes, faInfoCircle, faCalendarAlt, faHashtag,
    faFileSignature, faStopCircle, faPlayCircle, faPaperclip, faFileContract,
    faUserTie
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

// *** REMOVED getPublicFileUrl function as it's no longer needed ***

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

        // Backend controller's 'show' method should load necessary relations (marchePublic, fonctionnaire if needed)
        // and add the 'fichier_joint_url' property.
        const apiUrl = `${baseApiUrl}/ordres-service/${itemId}`;

        axios.get(apiUrl, { withCredentials: true })
            .then(response => {
                if (!isMounted) return;

                // Expecting the full URL 'fichier_joint_url' to be present in the response data
                const fetchedData = response.data?.ordre_service || response.data || null;

                if (fetchedData) {
                    setOrdreData(fetchedData);
                    console.log("Fetched OrdreService details (expecting fichier_joint_url):", fetchedData);
                    // Log if fonctionnaire data is present
                    // console.log("Fonctionnaire data in response:", fetchedData.fonctionnaire); // Keep if backend sends it
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
        type, numero, date_emission, description, fichier_joint, // Still need fichier_joint for filename extraction
        fichier_joint_url, // <<< USE THIS URL FROM BACKEND
        marche_public,
        id_fonctionnaire,
        fonctionnaire // Assuming backend loads this relation if needed for display
    } = ordreData;

    const typeInfo = getTypeDisplay(type);
    // Extract filename from the relative path (fichier_joint) if it exists
    const fileName = fichier_joint ? fichier_joint.split('/').pop() : null;
    const fonctionnaireName = fonctionnaire?.nom_complet || null; // Get name if object exists

    // --- Main Render ---
    return (
        // Keep existing holder class and padding
        <div className='holder' style={{padding:'70px'}}>
            {/* Header Section */}
            <Row className="mb-4 pb-3 align-items-center border-bottom ">
                <Col>
                    <h2 className="mb-1 fw-bold" style={{fontFamily:'Poppins'}}> Ordre de Service : {numero || '-'}</h2>
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
           <Card className="mb-4 shadow-sm border-0">
            <Card.Body>
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
                                 <span className="text-muted fst-italic">(ID: {id_fonctionnaire})</span>
                             ) : (
                                 '-'
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
                {/* Use fileName to know IF a file exists, use fichier_joint_url for the actual link */}
                {fileName && fichier_joint_url ? (
                    <Stack direction="horizontal" gap={3} className="align-items-center">
                        <FontAwesomeIcon icon={getFileIcon(fileName)} size="lg" className="text-secondary" />
                        <span className="btn btn-sm btn-outline-warning bg-dark py-1 px-3" title={fileName}
                            href={fichier_joint_url} 
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {fileName}
                        </span>
                        <a
                            href={fichier_joint_url} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-warning bg-dark py-1 px-3"
                            title="Ouvrir le fichier joint"
                        >
                            <FontAwesomeIcon icon={faExternalLinkAlt} size="sm" className='me-1'/> {fileName}
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