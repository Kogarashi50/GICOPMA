import React, { useState, useEffect } from 'react';
import { Spinner, Alert, Card, ListGroup ,Row,Col} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt, faFileArchive,
    faCalendarAlt, faUser, faParagraph, faPaperclip, faExternalLinkAlt, faInfoCircle
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

// Helper to format date
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        console.error("Invalid date for formatting:", dateString);
        return dateString;
    }
};

// NEW: Helper to get a file icon based on the filename
const getFileIcon = (filename) => {
    if (!filename) return faFileAlt;
    const lowerCase = String(filename).toLowerCase();
    if (lowerCase.endsWith('.pdf')) return faFilePdf;
    if (lowerCase.endsWith('.doc') || lowerCase.endsWith('.docx')) return faFileWord;
    if (lowerCase.endsWith('.xls') || lowerCase.endsWith('.xlsx')) return faFileExcel;
    if (['.zip', '.rar', '.7z'].some(ext => lowerCase.endsWith(ext))) return faFileArchive;
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'].some(ext => lowerCase.endsWith(ext))) return faFileImage;
    return faFileAlt;
};


const ObservationVisualisation = ({ itemId, baseApiUrl }) => {
    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!itemId) return;

        const fetchObservation = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await axios.get(`${baseApiUrl}/observations/${itemId}`, {
                    withCredentials: true
                });
                // The API now returns a 'fichiers' array inside the data object
                setItem(response.data);
            } catch (err) {
                const errorMsg = err.response?.data?.message || 'Failed to fetch observation details.';
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        fetchObservation();
    }, [itemId, baseApiUrl]);

    if (loading) {
        return <div className="text-center p-5"><Spinner animation="border" /></div>;
    }

    if (error) {
        return <Alert variant="danger" className="m-3">{error}</Alert>;
    }

    if (!item) {
        return <div className="text-center p-5">Aucune donnée à afficher.</div>;
    }

    // --- RENDER LOGIC UPDATED FOR MULTIPLE FILES ---
    return (
        <div className="container-fluid p-4">
            <h4 className="mb-4">Détails de l'Observation</h4>

            <Card className="mb-4 shadow-sm">
                <Card.Body>
                    <Row>
                        <Col md={8}>
                            <p className="mb-1 text-muted small"><FontAwesomeIcon icon={faUser} className="me-2" />Fonctionnaire</p>
                            <p className="fw-bold">{item.nom_complet || 'N/A'}</p>
                        </Col>
                        <Col md={4}>
                            <p className="mb-1 text-muted small"><FontAwesomeIcon icon={faCalendarAlt} className="me-2" />Date d'Observation</p>
                            <p className="fw-bold">{formatDate(item.date_observation)}</p>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Card className="mb-4 shadow-sm">
                <Card.Header as="h6">
                    <FontAwesomeIcon icon={faParagraph} className="me-2" />
                    Contenu de l'observation
                </Card.Header>
                <Card.Body>
                    <p style={{ whiteSpace: 'pre-wrap' }}>
                        {item.observation || <span className="text-muted">Aucune observation fournie.</span>}
                    </p>
                </Card.Body>
            </Card>

            <Card className="shadow-sm">
                <Card.Header as="h6">
                     <FontAwesomeIcon icon={faPaperclip} className="me-2" />
                     Fichiers Joints
                </Card.Header>
                <Card.Body>
                    {/* NEW LOGIC: Check if the 'fichiers' array exists and has items */}
                    {item.fichiers && item.fichiers.length > 0 ? (
                        <ListGroup variant="flush">
                             {item.fichiers.map(file => (
                                 <ListGroup.Item
                                    key={file.chemin_fichier} // Use the unique path as a key
                                    className="d-flex justify-content-between align-items-center"
                                 >
                                    <div>
                                        <FontAwesomeIcon
                                            icon={getFileIcon(file.nom_fichier)}
                                            className="me-3 text-secondary"
                                            fixedWidth
                                        />
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="fw-medium">
                                            {file.intitule || file.nom_fichier}
                                        </a>
                                    </div>
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary" title="Ouvrir dans un nouvel onglet">
                                        <FontAwesomeIcon icon={faExternalLinkAlt} />
                                    </a>
                                </ListGroup.Item>
                             ))}
                        </ListGroup>
                    ) : (
                        // This message is shown if the array is empty or doesn't exist
                        <p className="text-muted mb-0">
                            <FontAwesomeIcon icon={faInfoCircle} className="me-2"/>
                            Aucun fichier n'est joint à cette observation.
                        </p>
                    )}
                </Card.Body>
             </Card>
        </div>
    );
};

export default ObservationVisualisation;