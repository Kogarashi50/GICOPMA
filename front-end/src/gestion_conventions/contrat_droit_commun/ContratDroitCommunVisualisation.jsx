// src/gestion_contrats_cdc_views/ContratDroitCommunVisualisation.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Button, Row, Col, ListGroup, Spinner, Alert, Stack, Badge } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDownload, faFileAlt, faTimes, faPaperclip, faBuilding, faCalendarAlt,
    faFileInvoiceDollar, faTag, faFileContract, faInfoCircle, faClock,
    faExclamationTriangle, faHashtag, faAlignLeft, faFileSignature,
    faHandHoldingUsd, faRulerHorizontal, faListAlt, faMoneyCheckAlt, faCommentDots,
    faUsers, faUserTie
} from '@fortawesome/free-solid-svg-icons';
import '../bon_commandes_views/boncmd.css'; // Reusing styles

// --- Environment Variables ---
const STORAGE_URL = process.env.REACT_APP_STORAGE_URL || 'http://localhost:8000';

// --- Helper Functions ---
const formatDecimal = (value, currency = 'MAD', decimals = 2) => {
    if (value === null || value === undefined) return '-';
    const num = Number(String(value).replace(',', '.'));
    if (isNaN(num)) return '-';
    const formattedNumber = num.toLocaleString('fr-FR', {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
    });
    return `${formattedNumber} ${currency}`;
};

const formatDateSimple = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Date invalide';
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (error) {
        console.error("Error formatting date:", dateString, error);
        return 'Date invalide';
    }
};

const displayData = (data, fallback = '-') => data ?? fallback;
// --- End Helpers ---

const ContratDroitCommunVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [contratData, setContratData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]);

    const fetchData = useCallback(async () => {
        if (!itemId) {
            setContratData(null); setLoading(false); setError("[CDC VISU] ID du Contrat manquant.");
            return;
        }
        setLoading(true); setError(null);
        
        const contratUrl = `${baseApiUrl}/contrat-droit-commun/${itemId}`;
        const fonctionnairesUrl = `${baseApiUrl}/options/fonctionnaires`;

        try {
            const [contratRes, foncRes] = await Promise.allSettled([
                 axios.get(contratUrl, { params: { include: 'fichiers' }, withCredentials: true }),
                 axios.get(fonctionnairesUrl, { withCredentials: true })
            ]);

            let currentErrorMessages = [];

            if (contratRes.status === 'fulfilled' && contratRes.value.data) {
                const cdcData = contratRes.value.data.contrat_droit_commun || contratRes.value.data;
                if (cdcData && cdcData.id) {
                     cdcData.fichiers = Array.isArray(cdcData.fichiers) ? cdcData.fichiers : [];
                     setContratData(cdcData);
                } else {
                    currentErrorMessages.push(`Aucune donnée valide reçue pour le contrat ID ${itemId}.`);
                }
            } else {
                 const status = contratRes.reason?.response?.status;
                 const errorDetail = contratRes.reason?.response?.data?.message || contratRes.reason?.message || 'Erreur inconnue';
                 currentErrorMessages.push(`Échec chargement Contrat: ${errorDetail}`);
            }

            if (foncRes.status === 'fulfilled' && foncRes.value.data) {
                 const foncDataPayload = foncRes.value.data?.fonctionnaires;
                 if (Array.isArray(foncDataPayload)) {
                     const options = foncDataPayload.map(f => ({ value: f.id, label: f.nom_complet || f.Nom_Fonctionnaire || `ID ${f.id}` })).filter(opt => opt.value && opt.label).sort((a,b)=>String(a.label).localeCompare(String(b.label)));
                     setFonctionnairesList(options);
                 } else {
                     currentErrorMessages.push("Format Points Focaux invalide.");
                 }
            } else {
                currentErrorMessages.push("Erreur chargement Points Focaux.");
            }

            if(currentErrorMessages.length > 0) setError(currentErrorMessages.join('\n'));

        } catch (err) {
            setError(err.message || `Erreur critique de chargement.`);
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString) return <span className="fs-6 text-end text-muted fst-italic">-</span>;
        if (fonctionnairesList.length === 0) return <span className="text-warning fs-6 text-end text-muted fst-italic">Chargement...</span>;
        
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap" className='justify-content-end'>
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value) === String(id));
                    return ( <Badge key={id} pill bg="light" text="dark" className="me-1 mb-1 border"><FontAwesomeIcon icon={faUserTie} className="me-1" />{fonctionnaire?.label || `ID ${id}`}</Badge> );
                })}
            </Stack>
        );
    }, [fonctionnairesList]);

    const renderField = (label, value, icon, className = "mb-3") => (
        <div className={`${className} bc-data-point`}><p className="text-dark d-flex justify-content-between titly mb-1"><b>{icon && <FontAwesomeIcon icon={icon} className="me-2 text-warning" />}<span>{label}</span></b><span className="fs-6 text-end">{displayData(value)}</span></p></div>
    );
    const renderFieldBlock = (label, value, icon) => (
        <div className="bc-data-point d-flex flex-column justify-content-center "><p className="text-dark mb-1 titly"><b>{icon && <FontAwesomeIcon icon={icon} className="me-2 text-warning" />}<span>{label}</span></b></p><p className="fs-6 p-2 rounded-5 border px-4 bg-white shadow-sm" style={{ whiteSpace: 'pre-wrap' }}>{displayData(value)}</p></div>
    );

    if (loading) { return ( <div className="text-center p-4"><Spinner animation="border" variant="primary" /><p className="mt-2 text-muted">Chargement...</p></div> ); }
    if (error) { return ( <Alert variant="danger" className="m-3"><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/>{error}</Alert> ); }
    if (!contratData) { return ( <div className="text-center p-4"><p className="mt-2 text-muted">Aucune donnée de contrat à afficher (ID: {itemId}).</p></div> ); }

    return (
        <div className="p-3 bc-visualisation-container holder">
            <div className="d-flex p-5 justify-content-between align-items-start mb-4 px-md-5 border-bottom holder pb-2">
                <h2 className='mb-1 fw-bold text-dark'> Contrat: <span className="text-dark">{contratData.numero_contrat}</span> </h2>
                {onClose && ( <Button variant="warning" onClick={onClose} title="Retour" className="px-5 py-2 border-0 rounded-5 shadow-sm"><b>Revenir à la liste</b></Button> )}
            </div>

            <Row className='mt-4 px-md-4'>
                <Col  className='border rounded-5 bg-white shadow-sm m-4 p-4'>
                    {renderField("Fournisseur", contratData.fournisseur_nom, faBuilding)}
                    {renderField("Date Signature", formatDateSimple(contratData.date_signature), faCalendarAlt)}
                    {renderField("Montant Total", formatDecimal(contratData.montant_total, 'MAD'), faHandHoldingUsd)}
                    {renderField("Durée", contratData.duree_contrat, faClock)}
                </Col>
                <Col  className='border rounded-5 bg-white m-4 shadow-sm p-4'>
                    {renderField("Type Contrat", contratData.type_contrat, faListAlt)}
                    <div className="mb-3 bc-data-point">
                         <p className="text-dark d-flex justify-content-between titly mb-1"><b><FontAwesomeIcon icon={faUsers} className="me-2 text-warning" /><span>Points Focaux</span></b><span className="fs-6 text-end">{getFonctionnaireNames(contratData.id_fonctionnaire)}</span></p>
                    </div>
                </Col>
            </Row>

            <Row className='mt-4 px-md-4'>
                <Col md={6}> {renderFieldBlock("Objet du Contrat", contratData.objet, faAlignLeft)} </Col>
                {contratData.observations && ( <Col md={6}> {renderFieldBlock("Observations", contratData.observations, faCommentDots)} </Col> )}
            </Row>

            <Row className="mt-4 pt-3 border-top mx-md-3">
                <Col xs={12}>
                    <h5 className="text-uppercase titly text-muted fs-4"><FontAwesomeIcon icon={faPaperclip} className='me-2'/> Fichiers Associés ({(contratData.fichiers || []).length})</h5>
                    {Array.isArray(contratData.fichiers) && contratData.fichiers.length > 0 ? (
                        <ListGroup variant="flush" className="d-flex justify-content-evenly flex-wrap flex-row align-items-center p-2">
                            {contratData.fichiers.map(file => ( file && file.id ? ( <ListGroup.Item key={file.id} className="border rounded-4 p-2 d-flex align-items-center bg-dark m-1 text-white"> <FontAwesomeIcon icon={faFileAlt} className='me-2 text-warning'/> <span className="text-truncate" title={file.nom_fichier || 'Nom inconnu'}>{file.intitule || file.nom_fichier || 'Fichier sans nom'}</span> {file.chemin_fichier && ( <a href={`${STORAGE_URL}/${file.chemin_fichier.replace(/^\//, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-warning ms-2" title="Voir / Télécharger"><FontAwesomeIcon icon={faDownload}/></a> )} </ListGroup.Item> ) : null ))}
                        </ListGroup>
                    ) : ( <p className="text-muted fst-italic small">Aucun fichier associé.</p> )}
                </Col>
            </Row>
        </div>
    );
};

ContratDroitCommunVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired
};

export default ContratDroitCommunVisualisation;