// src/gestion_conventions/ordres_service_views/OrdreServiceVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Spinner, Alert, Badge, Stack, Button, Row, Col, Card, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt, faFileArchive,
    faExternalLinkAlt, faTimes, faInfoCircle, faCalendarAlt, faHashtag,
    faFileSignature, faStopCircle, faPlayCircle, faPaperclip, faFileContract,
    faUserTie
} from '@fortawesome/free-solid-svg-icons';
import '../marches_views/marche.css'; // Assuming this provides the 'holder' class or other styles

// --- Helper Functions ---
const displayData = (data, fallback = '-') => data ?? fallback;

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
             const parsedDate = new Date(dateString);
             if (isNaN(parsedDate.getTime())) throw new Error("Invalid date format after direct parse"); // Check getTime() for validity
             return parsedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        // If it's YYYY-MM-DD, ensure it's treated as UTC to avoid timezone shifts if only date is given
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("OrdreServiceVisualisation Date format error:", dateString, e);
        return dateString;
    }
};

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

const getTypeDisplay = (typeValue) => {
    let result = { label: 'Indéfini', icon: faFileSignature, color: 'secondary' };
    switch (String(typeValue).toLowerCase()) { // Make comparison case-insensitive
        case 'commencement':
            result = { label: 'Ordre de Commencement', icon: faPlayCircle, color: 'success' };
            break;
        case 'arret':
            result = { label: 'Ordre d\'Arrêt', icon: faStopCircle, color: 'danger' };
            break;
        default:
            if (typeValue) {
                 result.label = String(typeValue); // Use the value as label if it exists but not matched
            }
            break;
    }
    return result;
};
// --- End Helper Functions ---


// --- Component Definition ---
const OrdreServiceVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    // --- State ---
    const [ordreData, setOrdreData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]);

    // --- Effect to fetch OrdreService data and Fonctionnaires list ---
    useEffect(() => {
        let isMounted = true;

        if (!itemId) {
            setError("OrdreServiceVisualisation: ID de l'Ordre de Service manquant.");
            setLoading(false);
            return;
        }

        const fetchAllData = async () => {
            setLoading(true);
            setError(null);
            setOrdreData(null);
            setFonctionnairesList([]);
            console.log(`OrdreServiceVisualisation: Fetching details for ID: ${itemId} and Fonctionnaires list`);

            const ordreUrl = `${baseApiUrl}/ordres-service/${itemId}`;
            const fonctionnairesUrl = `${baseApiUrl}/options/fonctionnaires`; // <<< CORRECTED URL

            try {
                console.log("OrdreServiceVisualisation: Fetching Ordre from:", ordreUrl);
                console.log("OrdreServiceVisualisation: Fetching Fonctionnaires from:", fonctionnairesUrl);

                const [ordreRes, foncRes] = await Promise.all([
                    axios.get(ordreUrl, { withCredentials: true }),
                    axios.get(fonctionnairesUrl, { withCredentials: true })
                ]);

                if (!isMounted) return;

                // Process Ordre Service Data
                const fetchedOrdreData = ordreRes.data?.ordre_service || ordreRes.data || null;
                if (fetchedOrdreData && (fetchedOrdreData.id || fetchedOrdreData.ID_Ordre_Service)) { // Check for some ID
                    setOrdreData(fetchedOrdreData);
                    console.log("OrdreServiceVisualisation: Fetched OrdreService details:", fetchedOrdreData);
                } else {
                    const errorMsg = "Données Ordre Service invalides ou non trouvées.";
                    setError(prev => prev ? `${prev}\n${errorMsg}` : errorMsg);
                    console.warn(`OrdreServiceVisualisation: No valid data found for OrdreService ID: ${itemId}, Response:`, ordreRes.data);
                }

                 // Process Fonctionnaires Data
                 const foncApiResponseData = foncRes.data;
                 console.log("OrdreServiceVisualisation: Raw response for /options/fonctionnaires:", foncApiResponseData);
                 
                 const foncDataPayload = foncApiResponseData?.fonctionnaires; // Extract the array

                 if (Array.isArray(foncDataPayload)) {
                     const options = foncDataPayload.map(f => {
                         // Ensure 'id' and at least one common name property exist
                         if (f.id === undefined || (f.nom_complet === undefined && f.Nom_Fonctionnaire === undefined && f.nom === undefined && f.name === undefined)) {
                              console.warn("OrdreServiceVisualisation: Skipping invalid Fonctionnaire option (missing id or name):", f);
                              return null;
                         }
                         return { 
                             value: f.id, 
                             label: f.nom_complet || f.Nom_Fonctionnaire || f.nom || f.name || `ID: ${f.id}` 
                            };
                     }).filter(opt => opt !== null); // Remove entries that were marked as null
                     setFonctionnairesList(options);
                     console.log(`OrdreServiceVisualisation: Processed ${options.length} valid Fonctionnaire options.`);
                 } else {
                     const errorMsg = "Format de la liste des Points Focaux invalide (pas un tableau).";
                     console.warn("OrdreServiceVisualisation: Fonctionnaire list data payload (from .fonctionnaires key) received is not an array:", foncDataPayload);
                     setError(prev => prev ? `${prev}\n${errorMsg}` : errorMsg);
                     setFonctionnairesList([]); // Fallback to empty array
                 }

            } catch (err) {
                if (!isMounted) return;
                const errorMessage = err.response?.data?.message || err.message || "Erreur lors du chargement des données.";
                console.error(`OrdreServiceVisualisation: Error fetching Ordre Service details or Fonctionnaires:`, err.response || err);
                setError(prev => prev ? `${prev}\n${errorMessage}` : errorMessage);
                setFonctionnairesList([]); // Ensure empty on major error too
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchAllData();

        return () => { isMounted = false; };
    }, [itemId, baseApiUrl]);

    // --- Helper to render Fonctionnaire names as Badges ---
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        console.log("OrdreServiceVisualisation GETNAMES: Called with string:", fonctionnaireIdString);
        console.log("OrdreServiceVisualisation GETNAMES: current fonctionnairesList:", fonctionnairesList);
        console.log("OrdreServiceVisualisation GETNAMES: Array.isArray(fonctionnairesList):", Array.isArray(fonctionnairesList));

        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || fonctionnaireIdString.trim() === '') {
            return <span className="text-muted small fst-italic">Non spécifié</span>;
        }
        if (!Array.isArray(fonctionnairesList)) {
            console.error("OrdreServiceVisualisation GETNAMES: fonctionnairesList is NOT an array!");
            return <span className="text-danger small fst-italic">Erreur: Liste points focaux corrompue.</span>;
        }
        if (fonctionnairesList.length === 0) {
             return <span className="text-warning small fst-italic">Chargement points focaux... (IDs: {fonctionnaireIdString})</span>;
        }

        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
            return <span className="text-muted small fst-italic">Non spécifié</span>;
        }

        return (
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        <Badge key={id} pill bg="light" text="dark" className="border me-1 mb-1 fw-normal shadow-sm">
                            <FontAwesomeIcon icon={faUserTie} className="me-1 text-secondary" />
                            {fonctionnaire?.label || `ID Point Focal: ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]);

    // --- Conditional Rendering: Loading State ---
    if (loading) {
        return (
            <div className="text-center p-5 d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
                <Spinner animation="border" role="status" className="me-2">
                    <span className="visually-hidden">Chargement...</span>
                </Spinner>
                 Chargement des détails...
            </div>
        );
    }

    // --- Conditional Rendering: Error State ---
    // Show error first if it exists, even if ordreData might also be null
    if (error) {
        return (
            <Alert variant="danger" className="m-3">
                 <Alert.Heading>Erreur</Alert.Heading>
                 <p>{error}</p>
                 {onClose && <Button variant="outline-danger" size="sm" onClick={onClose}>Fermer</Button>}
             </Alert>
        );
    }

    // --- Conditional Rendering: No Data Found (After loading and no error specifically for ordreData) ---
    if (!ordreData) {
        return (
             <Alert variant="warning" className="m-3">
                 Aucune donnée disponible pour cet ordre de service (ID: {itemId}).
                 {onClose && <Button variant="link" size="sm" onClick={onClose} className="float-end">Fermer</Button>}
             </Alert>
        );
    }

    // --- Data Destructuring ---
    const {
        type, numero, date_emission, description,
        fichier_joint_url, // Expecting this from backend if file exists
        marche_public,
        id_fonctionnaire // The string of IDs
    } = ordreData;

    const typeInfo = getTypeDisplay(type); // getTypeDisplay handles null/undefined for type
    // Extract filename from fichier_joint_url if it's a full URL or path
    const fileName = fichier_joint_url ? decodeURIComponent(fichier_joint_url.substring(fichier_joint_url.lastIndexOf('/') + 1)) : null;
    const fileIcon = getFileIcon(fileName); // getFileIcon handles null

    // --- Main Render ---
    return (
        <div className='holder' style={{padding:'70px'}}>
            <Row className="mb-4 pb-3 align-items-center border-bottom ">
                <Col>
                    <h2 className="mb-1 fw-bold" style={{fontFamily:'Poppins'}}> Ordre de Service : {displayData(numero)}</h2>
                </Col>
                <Col xs="auto">
                    {onClose && (
                          <Button variant="warning" className='btn rounded-5 px-5 py-2 bg-warning shadow' onClick={onClose} size="sm" title="Retour">
                              <b>Revenir a la liste</b>
                          </Button>
                    )}
                </Col>
            </Row>

            <h5 className='bg-transparent text-uppercase fw-bold text-secondary mb-4'>
                Informations Principales
            </h5>
           <Card className="mb-4 shadow-sm border-0">
            <Card.Body>
                <Row>
                    <Col md={4} className="mb-3">
                        <strong className="d-block text-dark">Type:</strong>
                        <Badge bg={typeInfo.color} className="p-2 fs-6 shadow-sm"> {/* Removed || 'secondary' as getTypeDisplay ensures color */}
                            <FontAwesomeIcon icon={typeInfo.icon} className="me-2" />
                            {typeInfo.label}
                        </Badge>
                    </Col>
                    <Col md={4} className="mb-3">
                       <strong className="d-block text-dark">
                           <FontAwesomeIcon icon={faHashtag} className="me-1 text-warning"/> Numéro/Référence:
                       </strong>
                       <span>{displayData(numero)}</span>
                    </Col>
                    <Col md={4} className="mb-3">
                        <strong className="d-block ">
                            <FontAwesomeIcon icon={faCalendarAlt}  className="me-1 text-warning" /> Date d'Émission:
                        </strong>
                        <span className="">{formatDate(date_emission)}</span>
                    </Col>
                </Row>
                 <Row className="mt-2 pt-3 border-top">
                     <Col md={6} className="mb-3">
                         <strong className="d-block text-dark">
                             <FontAwesomeIcon icon={faFileContract} className="me-1 text-warning"/> Lié au Marché:
                         </strong>
                         {marche_public ? (
                            <div className="ms-2">
                                <span className="d-block">{displayData(marche_public.numero_marche)}</span>
                                <em className="text-muted" style={{ fontSize: '0.9em' }}>{displayData(marche_public.intitule, 'Intitulé non disponible')}</em>
                            </div>
                         ) : (
                            <span className="text-muted ms-2 fst-italic">Non spécifié</span>
                         )}
                     </Col>
                     <Col md={6} className="mb-3">
                         <strong className="d-block text-dark">
                             <FontAwesomeIcon icon={faUserTie} className="me-1 text-warning"/> Points Focaux:
                         </strong>
                         <div className="ms-2">
                             {getFonctionnaireNames(id_fonctionnaire)}
                         </div>
                     </Col>
                 </Row>
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

        <h5 className='bg-transparent text-uppercase fw-bold text-secondary mb-4 mt-4'>
            <FontAwesomeIcon icon={faPaperclip} className="me-2 text-warning" /> Fichier Joint
        </h5>
        <Card className="shadow-sm border-0">
            <Card.Body>
                {fileName && fichier_joint_url ? (
                    <ListGroup className='d-flex flex-row flex-wrap justify-content-start'>
                         <ListGroup.Item
                            key={`ordre-service-file-${itemId}`}
                            className="px-2 py-2 m-1 rounded-3 d-flex align-items-center bg-dark text-white flex-grow-0"
                            style={{ minWidth: '250px', maxWidth: '45%' }}
                         >
                            <FontAwesomeIcon
                                icon={fileIcon}
                                className="me-3 text-warning fa-lg flex-shrink-0"
                                style={{width: '20px'}}
                                title={fileName}
                            />
                            <div className="flex-grow-1 text-truncate me-2">
                                <a
                                    href={fichier_joint_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link-light text-decoration-none fw-medium stretched-link"
                                    title={`Ouvrir: ${fileName}`}
                                >
                                    {fileName}
                                </a>
                            </div>
                            <a
                                href={fichier_joint_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-warning ms-2 flex-shrink-0"
                                title="Ouvrir dans un nouvel onglet"
                            >
                                <FontAwesomeIcon icon={faExternalLinkAlt} />
                            </a>
                        </ListGroup.Item>
                    </ListGroup>
                ) : (
                    <span className="text-muted fst-italic">
                        <FontAwesomeIcon icon={faInfoCircle} className="me-1"/> Aucun fichier n'est joint à cet ordre de service.
                    </span>
                )}
            </Card.Body>
         </Card>
    </div>
    );
};

OrdreServiceVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func,
    baseApiUrl: PropTypes.string.isRequired,
};

export default OrdreServiceVisualisation;