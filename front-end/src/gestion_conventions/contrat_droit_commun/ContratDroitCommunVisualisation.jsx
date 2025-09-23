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
// baseApiUrl is a prop, BASE_API_URL constant can be removed if prop is always provided
const STORAGE_URL = process.env.REACT_APP_STORAGE_URL || 'http://localhost:8000'; // Adjusted to root for getPublicFileUrl

// --- Helper Functions ---
const formatDecimal = (value, currency = 'MAD', decimals = 2) => { /* ... (Your original) ... */ };
const formatDateSimple = (dateString) => { /* ... (Your original) ... */ };
const displayData = (data, fallback = '-') => data ?? fallback;
// --- End Helpers ---

const ContratDroitCommunVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [contratData, setContratData] = useState(null);
    const [loading, setLoading] = useState(true); // Combined loading
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]);

    const fetchData = useCallback(async () => {
        if (!itemId) {
            setContratData(null); setLoading(false); setError("[CDC VISU] ID du Contrat manquant.");
            return;
        }
        console.log(`[CDC VISU] Fetching data for Contrat ID: ${itemId}`);
        setLoading(true); setError(null); setContratData(null); setFonctionnairesList([]);

        const contratUrl = `${baseApiUrl}/contrat-droit-commun/${itemId}`;
        const fonctionnairesUrl = `${baseApiUrl}/options/fonctionnaires`; // <<< CORRECTED URL

        try {
            console.log("[CDC VISU] Fetching Contrat from:", contratUrl);
            console.log("[CDC VISU] Fetching Fonctionnaires from:", fonctionnairesUrl);

            const [contratRes, foncRes] = await Promise.allSettled([
                 axios.get(contratUrl, { params: { include: 'fichiers' }, withCredentials: true }),
                 axios.get(fonctionnairesUrl, { withCredentials: true })
            ]);

            let currentErrorMessages = [];

            // Process Contrat Response
            if (contratRes.status === 'fulfilled' && contratRes.value.data) {
                const cdcData = contratRes.value.data.contrat_droit_commun || contratRes.value.data;
                if (cdcData && typeof cdcData === 'object' && (cdcData.id || cdcData.ID_Contrat_CDC)) { // Check for some ID
                     cdcData.fichiers = Array.isArray(cdcData.fichiers) ? cdcData.fichiers : [];
                     setContratData(cdcData);
                     console.log("[CDC VISU] Contrat Data Received:", cdcData);
                } else {
                    console.warn(`[CDC VISU] No valid data for Contrat ID ${itemId}:`, contratRes.value.data);
                    currentErrorMessages.push(`Aucune donnée valide reçue pour le contrat ID ${itemId}.`);
                }
            } else {
                 const status = contratRes.reason?.response?.status;
                 const errorDetail = contratRes.reason?.response?.data?.message || contratRes.reason?.message || `Erreur inconnue (Status: ${status || 'N/A'})`;
                 console.error(`[CDC VISU] Contrat fetch failed (Status: ${status}):`, errorDetail, contratRes.reason);
                 currentErrorMessages.push(`Échec chargement Contrat: ${errorDetail}`);
            }

            // Process Fonctionnaires Response
            if (foncRes.status === 'fulfilled' && foncRes.value.data) {
                 const foncApiResponseData = foncRes.value.data;
                 console.log("[CDC VISU] Raw response for /options/fonctionnaires:", foncApiResponseData);
                 const foncDataPayload = foncApiResponseData?.fonctionnaires; // <<< CORRECTED EXTRACTION

                 if (Array.isArray(foncDataPayload)) {
                     const options = foncDataPayload.map(f => {
                         if (f.id === undefined || (f.nom_complet === undefined && f.Nom_Fonctionnaire === undefined && f.nom === undefined && f.name === undefined)) {
                              console.warn("[CDC VISU] Skipping invalid Fonctionnaire option:", f); return null;
                         }
                         return { value: f.id, label: f.nom_complet || f.Nom_Fonctionnaire || f.nom || f.name || `ID ${f.id}` };
                     }).filter(opt => opt !== null).sort((a,b)=>String(a.label||'').localeCompare(String(b.label||'')));
                     setFonctionnairesList(options);
                     console.log("[CDC VISU] Processed Fonctionnaire options (count):", options.length);
                 } else {
                     console.warn("[CDC VISU] Fonctionnaire list payload (from .fonctionnaires key) is not an array:", foncDataPayload);
                     currentErrorMessages.push("Format Points Focaux invalide (CDC visu).");
                     setFonctionnairesList([]);
                 }
            } else {
                console.warn("[CDC VISU] Could not fetch fonctionnaires list:", foncRes.reason?.message || foncRes.reason);
                currentErrorMessages.push("Erreur chargement Points Focaux (CDC visu).");
                setFonctionnairesList([]);
            }

            if(currentErrorMessages.length > 0) {
                setError(currentErrorMessages.join('\n'));
            }

        } catch (err) { // Should not be hit if using Promise.allSettled and handling rejections
            console.error(`[CDC VISU] Outer Catch Block Error for ID ${itemId}:`, err);
            setError(err.message || `Erreur critique de chargement (ID: ${itemId}).`);
            setContratData(null);
            setFonctionnairesList([]);
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        console.log("[CDC VISU GETNAMES] Called with string:", fonctionnaireIdString);
        console.log("[CDC VISU GETNAMES] current fonctionnairesList (length):", fonctionnairesList.length, "Is Array:", Array.isArray(fonctionnairesList));

        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || fonctionnaireIdString.trim() === '') {
            return <span className="fs-6 text-end text-muted fst-italic">-</span>;
        }
        if (!Array.isArray(fonctionnairesList)) {
            console.error("[CDC VISU GETNAMES] fonctionnairesList is NOT an array!");
            return <span className="text-danger fs-6 text-end text-muted fst-italic">Erreur liste focaux</span>;
        }
        if (fonctionnairesList.length === 0) {
             return <span className="text-warning fs-6 text-end text-muted fst-italic">Chargement focaux...</span>;
        }

        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
             return <span className="fs-6 text-end text-muted fst-italic">-</span>;
        }
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap" className='justify-content-end'>
                {ids.map(id => {
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        <Badge key={id} pill bg="light" text="dark" className="me-1 mb-1 border">
                            <FontAwesomeIcon icon={faUserTie} className="me-1" />
                            {fonctionnaire?.label || `ID ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]);

    const renderField = (label, value, icon = null, className = "mb-3", extraClass = "") => (
        <div className={`${className} bc-data-point`}>
             <p className={`text-dark d-flex justify-content-between titly mb-1 ${extraClass}`}>
                <b>
                    {icon && <FontAwesomeIcon icon={icon} className="me-2 text-warning" />}
                    <span>{label}</span>
                </b>
                <span className="fs-6 text-end">{displayData(value)}</span>
             </p>
        </div>
    );

    const renderFieldBlock = (label, value, icon = null, className = "mb-3") => (
        <div className={`${className} bc-data-point d-flex flex-column justify-content-center `}>
             <p className="text-dark mb-1 titly">
                 <b>
                    {icon && <FontAwesomeIcon icon={icon} className="me-2 text-warning" />}
                    <span>{label}</span>
                </b>
            </p>
             <p className="fs-6 p-2 rounded-5 border px-4 bg-white shadow-sm" style={{ whiteSpace: 'pre-wrap' }}>{displayData(value)}</p>
        </div>
    );

    if (loading) { return ( <div className="text-center p-4"> <Spinner animation="border" variant="primary" /> <p className="mt-2 text-muted">Chargement...</p> </div> ); }
    if (error) { return ( <Alert variant="danger" className="m-3"> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {error} {onClose && <Button variant="link" className="btn-close float-end" onClick={onClose}></Button>} </Alert> ); }
    if (!contratData && !loading && !error) { return ( <div className="text-center p-4"> <p className="mt-2 text-muted">Aucune donnée de contrat à afficher (ID: {itemId}).</p> </div> ); }
    if (!contratData) { return null; }


    return (
        <div className="p-3 bc-visualisation-container holder">
             <div className="d-flex p-5 justify-content-between align-items-start mb-4 px-md-5 border-bottom holder pb-2">
                <h2 className='mb-1 fw-bold text-dark'> Contrat: <span className="text-dark">{contratData.numero_contrat}</span> </h2>
                {onClose && ( <Button variant="warning" onClick={onClose} title="Retour" className="px-5 py-2 border-0 rounded-5 shadow-sm"> <b>Revenir à la liste</b> </Button> )}
             </div>

            <Row className='mt-4 px-md-4'>
                <Col md={5} className='border rounded-5 bg-white shadow-sm m-4 p-4'>
                    {renderField("Fournisseur", contratData.fournisseur_nom, faBuilding)}
                    {renderField("Date Signature", formatDateSimple(contratData.date_signature), faCalendarAlt)}
                    {renderField("Montant Total", formatDecimal(contratData.montant_total, 'MAD'), faHandHoldingUsd)}
                    {renderField("Durée (mois)", contratData.duree_contrat, faClock)}
                </Col>
                <Col md={1}></Col>
                <Col md={5} className='border rounded-5 bg-white m-4 shadow-sm p-4'>
                    {renderField("Type Contrat", contratData.type_contrat, faListAlt)}
                    {renderField("Mode Paiement", contratData.mode_paiement, faMoneyCheckAlt)}
                    <div className="mb-3 bc-data-point">
                         <p className="text-dark d-flex justify-content-between titly mb-1">
                             <b>
                                <FontAwesomeIcon icon={faUsers} className="me-2 text-warning" />
                                <span>Points Focaux</span>
                            </b>
                            <span className="fs-6 text-end">
                                {getFonctionnaireNames(contratData.id_fonctionnaire)}
                            </span>
                         </p>
                    </div>
                    {/* Optional created/updated display
                    {contratData.created_at && renderField("Créé le", formatDateSimple(contratData.created_at), faClock)}
                    {contratData.updated_at && renderField("Modifié le", formatDateSimple(contratData.updated_at), faClock)}
                    */}
                </Col>
            </Row>

            <Row className='mt-4 px-md-4'>
                <Col xs={6}> {renderFieldBlock("Objet du Contrat", contratData.objet, faAlignLeft)} </Col>
                {contratData.observations && ( <Col xs={6}> {renderFieldBlock("Observations", contratData.observations, faCommentDots)} </Col> )}
            </Row>

            <Row className="mt-4 pt-3 border-top mx-md-3">
                <Col xs={12}>
                    <h5 className="text-uppercase titly text-muted fs-4"> <FontAwesomeIcon icon={faPaperclip} className='me-2'/> Fichiers Associés ({(contratData.fichiers || []).length}) </h5>
                    {Array.isArray(contratData.fichiers) && contratData.fichiers.length > 0 ? (
                        <ListGroup variant="flush" className=" d-flex justify-content-evenly flex-wrap flex-row align-items-center p-2 ">
                            {contratData.fichiers.map(file => ( file && file.id ? ( <ListGroup.Item key={file.id} className="border rounded-4 p-2 d-flex align-items-center bg-dark m-1 text-white"> <div> <FontAwesomeIcon icon={faFileAlt} className='me-2 text-warning'/> <span className="text-truncate" title={file.nom_fichier || 'Nom inconnu'}>{file.nom_fichier || 'Fichier sans nom'}</span> <span className='text-muted small ms-2'>({formatDateSimple(file.date_ajout)})</span> </div> {file.chemin_fichier && ( <a href={`${STORAGE_URL}/${file.chemin_fichier.replace(/^\//, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-warning ms-2 py-0 px-2" title="Voir / Télécharger"><FontAwesomeIcon icon={faDownload} className='text-warning' /></a> )} </ListGroup.Item> ) : null ))}
                        </ListGroup>
                    ) : ( <p className="text-muted fst-italic small">Aucun fichier associé à ce contrat.</p> )}
                </Col>
            </Row>
        </div>
    );
};

ContratDroitCommunVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired // Made required
};

ContratDroitCommunVisualisation.defaultProps = {
   // No default for baseApiUrl as it's required
};

export default ContratDroitCommunVisualisation;