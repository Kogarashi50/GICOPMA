// src/gestion_conventions/bons_de_commande_views/BonDeCommandeVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { Button, Row, Col, Badge, ListGroup, Spinner, Alert, Stack } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faDownload, faFileAlt, faTimes, faBuilding, faCalendarAlt,
    faFileInvoiceDollar, faTag, faFileContract, faClipboardCheck,
    faMoneyBillWave, faInfoCircle, faClock, faExclamationTriangle,
    faUsers, faUserTie
} from '@fortawesome/free-solid-svg-icons';
import './boncmd.css'; // Adjust path if needed

// --- Environment Variables ---
// baseApiUrl is now a prop
const STORAGE_URL = process.env.REACT_APP_STORAGE_URL || 'http://localhost:8000/storage';

// --- Helper Functions ---
const formatDecimal = (value, currency = '', decimals = 2) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    const formatted = number.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return currency ? `${formatted} ${currency}` : formatted;
};

const formatDateSimple = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
             console.warn("[BC VISU] Invalid date received for formatDateSimple:", dateString);
             return dateString;
        }
        return date.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
        console.error("[BC VISU] Error formatting date in formatDateSimple:", dateString, e);
        return dateString;
    }
};

const displayData = (data, fallback = '-') => data ?? fallback;

const getEtatBadgeVariant = (etat) => {
     switch (etat?.toLowerCase()) {
        case 'en préparation': return 'primary';
        case 'validé': return 'info';
        case 'envoyé': return 'warning';
        case 'reçu': return 'success';
        case 'annulé': return 'danger';
        default: return 'secondary';
     }
 };
// --- End Helpers ---

const BonDeCommandeVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [bonCommandeData, setBonCommandeData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [fonctionnairesList, setFonctionnairesList] = useState([]);

    const fetchBonCommandeAndFonctionnaires = useCallback(async () => {
        if (!itemId) {
            setBonCommandeData(null); setLoading(false); setError("[BC VISU] ID du Bon de Commande manquant.");
            return;
        }
        console.log(`[BC VISU] Fetching data for Bon de Commande ID: ${itemId}`);
        setLoading(true); setError(null); setBonCommandeData(null); setFonctionnairesList([]);

        const bonCommandeUrl = `${baseApiUrl}/bon-de-commande/${itemId}`;
        const fonctionnairesUrl = `${baseApiUrl}/options/fonctionnaires`; // CORRECTED URL

        try {
            console.log("[BC VISU] Fetching Bon de Commande from:", bonCommandeUrl);
            console.log("[BC VISU] Fetching Fonctionnaires from:", fonctionnairesUrl);

            const [bcRes, foncRes] = await Promise.allSettled([
                axios.get(bonCommandeUrl, { withCredentials: true }),
                axios.get(fonctionnairesUrl, { withCredentials: true })
            ]);

            let currentErrorMessages = [];

            // Process Bon de Commande Response
            if (bcRes.status === 'fulfilled' && bcRes.value.data) {
                const bcData = bcRes.value.data.bon_de_commande || bcRes.value.data;
                if (bcData && typeof bcData === 'object' && (bcData.id || bcData.ID_Bon_Commande)) {
                     bcData.fichiers = Array.isArray(bcData.fichiers) ? bcData.fichiers : [];
                     bcData.marche_public = bcData.marche_public || null;
                     bcData.contrat = bcData.contrat || null;
                     setBonCommandeData(bcData);
                     console.log("[BC VISU] Bon de Commande Data Received:", bcData);
                } else {
                    console.warn(`[BC VISU] No valid data for Bon de Commande ID ${itemId}:`, bcRes.value.data);
                    currentErrorMessages.push(`Aucune donnée valide reçue pour le bon de commande ID ${itemId}.`);
                }
            } else {
                 const status = bcRes.reason?.response?.status;
                 const errorDetail = bcRes.reason?.response?.data?.message || bcRes.reason?.message || `Erreur inconnue (Status: ${status || 'N/A'})`;
                 console.error(`[BC VISU] Bon de Commande fetch failed (Status: ${status}):`, errorDetail, bcRes.reason);
                 currentErrorMessages.push(`Échec chargement Bon de Commande: ${errorDetail}`);
            }

             // Process Fonctionnaires Response
            if (foncRes.status === 'fulfilled' && foncRes.value.data) {
                const foncApiResponseData = foncRes.value.data;
                console.log("[BC VISU] Raw response for /options/fonctionnaires:", foncApiResponseData);
                const foncDataPayload = foncApiResponseData?.fonctionnaires; // CORRECTED EXTRACTION

                if (Array.isArray(foncDataPayload)) {
                    const options = foncDataPayload.map(f => {
                        if (f.id === undefined || (f.nom_complet === undefined && f.Nom_Fonctionnaire === undefined && f.nom === undefined && f.name === undefined)) {
                             console.warn("[BC VISU] Skipping invalid Fonctionnaire option:", f); return null;
                        }
                        return { value: f.id, label: f.nom_complet || f.Nom_Fonctionnaire || f.nom || f.name || `ID ${f.id}` };
                    }).filter(opt => opt !== null).sort((a,b)=>String(a.label||'').localeCompare(String(b.label||'')));
                    setFonctionnairesList(options);
                    console.log("[BC VISU] Processed Fonctionnaire options (count):", options.length);
                } else {
                    console.warn("[BC VISU] Fonctionnaire list payload (from .fonctionnaires key) is not an array:", foncDataPayload);
                    currentErrorMessages.push("Format Points Focaux invalide (BC visu).");
                    setFonctionnairesList([]);
                }
            } else {
                console.warn("[BC VISU] Could not fetch fonctionnaires list:", foncRes.reason?.message || foncRes.reason);
                currentErrorMessages.push("Erreur chargement Points Focaux (BC visu).");
                setFonctionnairesList([]);
            }

            if (currentErrorMessages.length > 0) {
                setError(currentErrorMessages.join('\n'));
            }

        } catch (err) {
            console.error(`[BC VISU] Outer Catch Block Error:`, err);
            setError(err.message || `Erreur critique de chargement (ID: ${itemId}).`);
            setBonCommandeData(null); 
            setFonctionnairesList([]);
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]);

    useEffect(() => {
        fetchBonCommandeAndFonctionnaires();
    }, [fetchBonCommandeAndFonctionnaires]);

    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        console.log("[BC VISU GETNAMES] Called with string:", fonctionnaireIdString);
        console.log("[BC VISU GETNAMES] current fonctionnairesList (length):", fonctionnairesList.length, "Is Array:", Array.isArray(fonctionnairesList));

        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || fonctionnaireIdString.trim() === '') {
            return <span className="value fst-italic text-muted">-</span>;
        }
        if (!Array.isArray(fonctionnairesList)) {
            console.error("[BC VISU GETNAMES] fonctionnairesList is NOT an array! This is unexpected.");
            return <span className="text-danger value fst-italic text-muted">Erreur liste focaux</span>;
        }
        if (fonctionnairesList.length === 0 ) {
             return <span className="text-warning value fst-italic text-muted">Chargement focaux...</span>;
        }

        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
             return <span className="value fst-italic text-muted">-</span>;
        }
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap">
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

    // --- Render Detail Helpers (FROM YOUR ORIGINAL) ---
    const renderField = (label, value, icon = null, className = "mb-3", isBadge = false) => (
        <div className={className}>
             <p className="text-dark d-flex justify-content-between titly d-block mb-1">
                <b> {icon && <FontAwesomeIcon icon={icon} className="me-2 text-warning" />}
                 <span>{label}</span></b>
             {isBadge ? (
                 <Badge bg={getEtatBadgeVariant(value)} text={['warning', 'light', 'info'].includes(getEtatBadgeVariant(value)) ? 'dark' : 'white'} className="py-1 px-2" style={{fontSize: '0.85rem'}} >
                    {displayData(value)}
                 </Badge>
             ) : (
                 <span className="fs-6">{displayData(value)}</span>
             )}
              </p>
        </div>
    );

    const renderField2 = (label, value) => (
        <div className='border shadow-sm my-5 rounded-5 justify-content-center align-items-center d-flex flex-column py-3 bg-white'>
             <p className="text-dark titly">
                <b><span>{label}</span></b>
             </p>
              <p className="fs-6">{displayData(value)}</p>
        </div>
    );
    // --- END Render Detail Helpers ---

    if (loading) {
        return ( <div className="text-center p-4"> <Spinner animation="border" variant="primary" /> <p className="mt-2 text-muted">Chargement...</p> </div> );
    }
    if (error) {
         return ( <Alert variant="danger" className="m-3"> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {error} </Alert> );
     }
    if (!bonCommandeData && !loading && !error) {
         return ( <div className="text-center p-4"> <p className="mt-2 text-muted">Aucune donnée à afficher pour ce Bon de Commande (ID: {itemId}).</p> </div> );
     }
     if (!bonCommandeData) { // Should be caught by above, but as a final fallback
        return <div className="text-center p-4"><p className="text-muted">Données non disponibles.</p></div>;
     }

    return (
        <div className="py-3 px-5 bc-visualisation-container holder">
             <div className="d-flex p-3 justify-content-between align-items-start mb-4 px-5 border-bottom holder pb-1">
                <h2 className='mb-1 fw-bold text-dark'>
                    Bon de Commande: <span>{bonCommandeData.numero_bc}</span>
                </h2>
                  {onClose && (
                     <Button variant="warning" onClick={onClose} title="Fermer" className="px-5 border-0 rounded-5 shadow-sm ">
                        <b>Revenir a la liste</b>
                     </Button>
                  )}
             </div>

            <Row className='mt-5 '>
                <Col md={5} className='border mx-5 rounded-5 shadow-sm p-5 bg-white'>
                    {renderField("Fournisseur", bonCommandeData.fournisseur_nom, faBuilding)}
                    {renderField("Date Émission", formatDateSimple(bonCommandeData.date_emission), faCalendarAlt)}
                    {renderField("Montant Total TTC", formatDecimal(bonCommandeData.montant_total, 'DH'), faMoneyBillWave)}
                    {renderField("État", bonCommandeData.etat, faInfoCircle, "mb-3 bc-data-point", true)}
                </Col>
                <Col md={5} className='border mx-5 rounded-5 shadow-sm p-5 bg-white'>
                    {renderField("Mode Paiement", bonCommandeData.mode_paiement, faTag)}
                    {renderField( "Marché Associé", bonCommandeData.marche_public ? `${bonCommandeData.marche_public.numero_marche || bonCommandeData.marche_public.intitule || `ID: ${bonCommandeData.marche_public.id}`}` : '-', faClipboardCheck )}
                    {renderField( "Contrat Associé", bonCommandeData.contrat ? `${bonCommandeData.contrat.numero_contrat || bonCommandeData.contrat.objet || `ID: ${bonCommandeData.contrat.id}`}` : '-', faFileContract )}
                    {renderField("Créé le", formatDateSimple(bonCommandeData.created_at), faClock)}
                    <div className="mb-3">
                        <p className="text-dark d-flex justify-content-between titly d-block mb-1">
                           <b> <FontAwesomeIcon icon={faUsers} className="me-2 text-warning" />
                            <span>Points Focaux</span></b>
                            <span className="fs-6">
                               {getFonctionnaireNames(bonCommandeData.id_fonctionnaire)}
                            </span>
                         </p>
                   </div>
                </Col>
                <Col xs={1}></Col>
                 <Col xs={10}>
                     {renderField2("Objet du Bon de Commande", bonCommandeData.objet)}
                 </Col>
                 <Col xs={1}></Col>
            </Row>

            {Array.isArray(bonCommandeData.fichiers) && bonCommandeData.fichiers.length > 0 ? (
                <Row className=" pt-3 border-top">
                    <Col xs={12}>
                        <strong className=" d-block  ">
                         <p className="text-uppercase titly text-muted fs-4">Fichiers Associés ({bonCommandeData.fichiers.length})</p>
                       </strong>
                        <ListGroup variant="" className=" d-flex justify-content-evenly flex-wrap flex-row align-items-center p-2 ">
                            {bonCommandeData.fichiers.map(file => (
                                file && file.id ? (
                                    <ListGroup.Item key={file.id} className="border rounded-4 p-2 d-flex align-items-center bg-dark  m-1 text-white">
                                        <FontAwesomeIcon icon={faFileAlt} className='me-2 text-warning'/>
                                        <span className="text-truncate" title={file.nom_fichier || 'Nom inconnu'}>{file.nom_fichier || 'Fichier sans nom'}</span>
                                        {file.chemin_fichier && (<a href={`${STORAGE_URL}/${file.chemin_fichier.replace(/^\//, '')}`} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-warning ms-2" title="Voir / Télécharger" > <FontAwesomeIcon icon={faDownload} /> </a> )}
                                    </ListGroup.Item>
                                ) : null
                            ))}
                        </ListGroup>
                    </Col>
                </Row>
            ) : (
               <Row className="mt-3 pt-3 border-top">
                   <Col><p className="text-muted fst-italic small">Aucun fichier associé.</p></Col>
               </Row>
            )}
        </div>
    );
};

BonDeCommandeVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired
};

BonDeCommandeVisualisation.defaultProps = {
   // baseApiUrl is required
};

export default BonDeCommandeVisualisation;