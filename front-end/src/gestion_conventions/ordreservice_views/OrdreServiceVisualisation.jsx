// src/gestion_conventions/ordres_service_views/OrdreServiceVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Spinner, Alert, Badge, Stack, Button, Row, Col, Card, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt, faFileArchive,
    faExternalLinkAlt, faTimes,faSyncAlt, faInfoCircle, faCalendarAlt, faHashtag,
    faFileSignature, faStopCircle, faPlayCircle, faPaperclip, faFileContract,
    faUserTie
} from '@fortawesome/free-solid-svg-icons';
import '../marches_views/marche.css';

// --- Helper Functions (No changes needed here) ---
const displayData = (data, fallback = '-') => data ?? fallback;

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
             const parsedDate = new Date(dateString);
             if (isNaN(parsedDate.getTime())) throw new Error("Invalid date format after direct parse");
             return parsedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
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
    switch (String(typeValue).toLowerCase()) {
        case 'commencement': result = { label: 'Ordre de Commencement', icon: faPlayCircle, color: 'success' }; break;
        case 'arret': result = { label: 'Ordre d\'Arrêt', icon: faStopCircle, color: 'danger' }; break;
        case 'reprise': result = { label: 'Ordre de Service de Reprise', icon: faSyncAlt, color: 'primary' }; break;
        default: if (typeValue) { result.label = String(typeValue); } break;
    }
    return result;
};
// --- End Helper Functions ---


const OrdreServiceVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [ordreData, setOrdreData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]);

    // --- Effect to fetch data (No changes needed here) ---
    useEffect(() => {
        let isMounted = true;
        if (!itemId) { setLoading(false); return; }
        const fetchAllData = async () => {
            setLoading(true); setError(null);
            const ordreUrl = `${baseApiUrl}/ordres-service/${itemId}`;
            const fonctionnairesUrl = `${baseApiUrl}/options/fonctionnaires`;
            try {
                const [ordreRes, foncRes] = await Promise.all([
                    axios.get(ordreUrl, { withCredentials: true }),
                    axios.get(fonctionnairesUrl, { withCredentials: true })
                ]);
                if (!isMounted) return;
                setOrdreData(ordreRes.data?.ordre_service || ordreRes.data || null);
                const foncDataPayload = foncRes.data?.fonctionnaires;
                if (Array.isArray(foncDataPayload)) {
                    const options = foncDataPayload.map(f => ({ value: f.id, label: f.nom_complet || `ID: ${f.id}` })).filter(Boolean);
                    setFonctionnairesList(options);
                }
            } catch (err) {
                if (!isMounted) return;
                setError(err.response?.data?.message || err.message || "Erreur de chargement.");
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchAllData();
        return () => { isMounted = false; };
    }, [itemId, baseApiUrl]);

    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString) return <span className="text-muted small fst-italic">Non spécifié</span>;
        if (fonctionnairesList.length === 0) return <span className="text-warning small fst-italic">Chargement... (IDs: {fonctionnaireIdString})</span>;
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value) === String(id));
                    return (
                        <Badge key={id} pill bg="light" text="dark" className="border me-1 mb-1 fw-normal shadow-sm">
                            <FontAwesomeIcon icon={faUserTie} className="me-1 text-secondary" />
                            {fonctionnaire?.label || `ID: ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]);

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /> Chargement...</div>;
    if (error) return <Alert variant="danger" className="m-3"><Alert.Heading>Erreur</Alert.Heading><p>{error}</p>{onClose && <Button variant="outline-danger" size="sm" onClick={onClose}>Fermer</Button>}</Alert>;
    if (!ordreData) return <Alert variant="warning" className="m-3">Aucune donnée disponible pour cet ordre (ID: {itemId}).</Alert>;

    // --- Data Destructuring ---
    const {
        type, numero, date_emission, description,
        fichiers, // <<< MODIFIED: Expecting the 'fichiers' array now
        marche_public,
        id_fonctionnaire
    } = ordreData;

    const typeInfo = getTypeDisplay(type);

    // --- Main Render ---
    return (
        <div className='holder' style={{padding:'70px'}}>
            <Row className="mb-4 pb-3 align-items-center border-bottom ">
                <Col><h2 className="mb-1 fw-bold" style={{fontFamily:'Poppins'}}> Ordre de Service : {displayData(numero)}</h2></Col>
                <Col xs="auto">{onClose && <Button variant="warning" className='btn rounded-5 px-5 py-2 bg-warning shadow' onClick={onClose} size="sm" title="Retour"><b>Revenir a la liste</b></Button>}</Col>
            </Row>

            <h5 className='bg-transparent text-uppercase fw-bold text-secondary mb-4'>Informations Principales</h5>
            <Card className="mb-4 shadow-sm border-0">
                <Card.Body>
                    {/* This entire info section remains unchanged and should work perfectly */}
                    <Row>
                        <Col md={4} className="mb-3"><strong className="d-block text-dark">Type:</strong><Badge bg={typeInfo.color} className="p-2 fs-6 shadow-sm"><FontAwesomeIcon icon={typeInfo.icon} className="me-2" />{typeInfo.label}</Badge></Col>
                        <Col md={4} className="mb-3"><strong className="d-block text-dark"><FontAwesomeIcon icon={faHashtag} className="me-1 text-warning"/> Numéro/Référence:</strong><span>{displayData(numero)}</span></Col>
                        <Col md={4} className="mb-3"><strong className="d-block "><FontAwesomeIcon icon={faCalendarAlt}  className="me-1 text-warning" /> Date d'Émission:</strong><span className="">{formatDate(date_emission)}</span></Col>
                    </Row>
                    <Row className="mt-2 pt-3 border-top">
                        <Col md={6} className="mb-3"><strong className="d-block text-dark"><FontAwesomeIcon icon={faFileContract} className="me-1 text-warning"/> Lié au Marché:</strong>{marche_public ? (<div className="ms-2"><span className="d-block">{displayData(marche_public.numero_marche)}</span><em className="text-muted" style={{ fontSize: '0.9em' }}>{displayData(marche_public.intitule, 'Intitulé non disponible')}</em></div>) : (<span className="text-muted ms-2 fst-italic">Non spécifié</span>)}</Col>
                        <Col md={6} className="mb-3"><strong className="d-block text-dark"><FontAwesomeIcon icon={faUserTie} className="me-1 text-warning"/> Points Focaux:</strong><div className="ms-2">{getFonctionnaireNames(id_fonctionnaire)}</div></Col>
                    </Row>
                    {description && (<Row><Col xs={12} className="mb-2 mt-2 pt-3 border-top"><strong className="d-block text-dark">Description:</strong><p className="bg-light p-2 rounded border" style={{ whiteSpace: 'pre-wrap', fontSize: '0.95em' }}>{description}</p></Col></Row>)}
                </Card.Body>
            </Card>

            {/* =================================================================== */}
            {/* === MODIFIED SECTION FOR DISPLAYING MULTIPLE FILES === */}
            {/* =================================================================== */}
            <h5 className='bg-transparent text-uppercase fw-bold text-secondary mb-4 mt-4'>
                <FontAwesomeIcon icon={faPaperclip} className="me-2 text-warning" /> Fichiers Joints
            </h5>
            <Card className="shadow-sm border-0">
                <Card.Body>
                    {/* NEW LOGIC: Check if the 'fichiers' array is valid and has items */}
                    {fichiers && fichiers.length > 0 ? (
                        <ListGroup className='d-flex flex-row flex-wrap justify-content-start'>
                             {/* Use .map() to create a ListGroup.Item for each file */}
                             {fichiers.map(file => (
                                 <ListGroup.Item
                                    key={file.id} // Use a unique key for each item
                                    className="px-2 py-2 m-1 rounded-3 d-flex align-items-center bg-dark text-white flex-grow-0"
                                    style={{ minWidth: '250px', maxWidth: '45%' }}
                                 >
                                    <FontAwesomeIcon
                                        icon={getFileIcon(file.nom_fichier)}
                                        className="me-3 text-warning fa-lg flex-shrink-0"
                                        style={{width: '20px'}}
                                        title={file.nom_fichier}
                                    />
                                    <div className="flex-grow-1 text-truncate me-2">
                                        <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="link-light text-decoration-none fw-medium stretched-link"
                                            title={`Ouvrir: ${file.intitule || file.nom_fichier}`}
                                        >
                                            {/* Prioritize showing the user-defined 'intitule' */}
                                            {file.intitule || file.nom_fichier}
                                        </a>
                                    </div>
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-sm btn-outline-warning ms-2 flex-shrink-0"
                                        title="Ouvrir dans un nouvel onglet"
                                    >
                                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                                    </a>
                                </ListGroup.Item>
                             ))}
                        </ListGroup>
                    ) : (
                        // This message is shown if the array is empty or doesn't exist
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