// src/gestion_conventions/marches_views/MarchePublicVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Spinner, Alert, Table, Badge, Stack, Button, Row, Col, Card } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt,
    faExternalLinkAlt, faTimes, faInfoCircle, faLink,
    faUserTie
} from '@fortawesome/free-solid-svg-icons';

import './marche.css'; // Ensure this CSS file exists and has necessary styles

// --- Helpers ---
const displayData = (data, fallback = '-') => data ?? fallback;
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        // Basic check for YYYY-MM-DD format before parsing
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
             // If not YYYY-MM-DD, try parsing directly (might be full timestamp)
             const parsedDate = new Date(dateString);
             if (isNaN(parsedDate)) throw new Error("Invalid date format after direct parse");
             return parsedDate.toLocaleDateString('fr-CA'); // Use YYYY-MM-DD format
        }
        // If it looks like YYYY-MM-DD, ensure time part doesn't cause timezone issues
        return new Date(datePart + 'T00:00:00').toLocaleDateString('fr-CA'); // Use YYYY-MM-DD format
     }
    catch (e) { console.error("Date format error:", dateString, e); return dateString; } // Return original on error
};
const formatCurrency = (value) => {
    if (value == null || value === '' || isNaN(Number(value))) return '-';
    try {
        // Format using Moroccan Dirham locale
        return parseFloat(value).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
    } catch (e) {
         console.error("Currency format error:", value, e);
         return String(value); // Fallback to string representation
    }
};
const formatPercentage = (value) => {
    const n = parseFloat(value);
    return isNaN(n) ? '-' : `${n.toFixed(2)} %`;
};
const STATUT_OPTIONS = [
    { value: 'En préparation', label: 'En préparation', color: 'secondary' },
    { value: 'En cours', label: 'En cours', color: 'primary' },
    { value: 'Terminé', label: 'Terminé', color: 'success' },
    { value: 'Résilié', label: 'Résilié', color: 'danger' }
];
const getStatusBadge = (statusValue) => {
    const option = STATUT_OPTIONS.find(opt => opt.value === statusValue);
    const color = option ? option.color : "light";
    // Determine text color based on background for readability
    const textColor = ['warning', 'light', 'secondary'].includes(color) ? 'dark' : 'white';
    return <Badge bg={color} text={textColor} className="shadow-sm">{displayData(statusValue)}</Badge>;
};
const getFileIcon = (filenameOrMimeType) => {
    if (!filenameOrMimeType) return faFileAlt;
    const lowerCase = String(filenameOrMimeType).toLowerCase();
    if (lowerCase.includes('pdf')) return faFilePdf;
    if (lowerCase.includes('doc')) return faFileWord; // doc, docx
    if (lowerCase.includes('xls')) return faFileExcel; // xls, xlsx
    // Check common image extensions or mime type start
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage;
    return faFileAlt; // Default icon
};
// --- End Helpers ---

// --- Constants ---
const CARD_CLASS = "border-light shadow-sm mb-3";
const CARD_TITLE_CLASS = "mb-3 section-title text-uppercase fw-bold text-secondary";
// --- End Constants ---


const MarchePublicVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    // --- State Variables ---
    const [marcheData, setMarcheData] = useState(null);
    const [lotsData, setLotsData] = useState([]); // Still useful for the lots table
    const [filesData, setFilesData] = useState([]); // Combined list of all files
    const [conventionName, setConventionName] = useState(null); // Extracted convention name
    const [fonctionnairesList, setFonctionnairesList] = useState([]); // Separate fetch
    const [loadingMarche, setLoadingMarche] = useState(true); // Loading main data
    const [loadingRelated, setLoadingRelated] = useState(true); // Loading fonctionnaires etc.
    const [error, setError] = useState(null);

    // No need for publicBaseUrl calculation if backend provides full URLs

    // --- Fetch Logic (Simplified) ---
     useEffect(() => {
        let isMounted = true;
        if (!itemId) {
            setLoadingMarche(false); setLoadingRelated(false); // Set both false
            setError("ID du Marché manquant.");
            return;
        }

        const fetchDetails = async () => {
            setLoadingMarche(true);
            setLoadingRelated(true); // Set related loading true initially
            setError(null);
            setMarcheData(null); setLotsData([]); setFilesData([]); setConventionName(null); setFonctionnairesList([]);
            console.log(`Visualisation: Fetching ALL details for Marche ID: ${itemId} from main endpoint`);
            const apiPrefix = ''; // Assuming API base URL already includes /api if needed

            try {
                // --- ONLY ONE API CALL for Marche + Lots + Files ---
                const marcheUrl = `${baseApiUrl}${apiPrefix}/marches-publics/${itemId}`;
                const marcheRes = await axios.get(marcheUrl, { withCredentials: true });
                if (!isMounted) return;

                const fetchedMarcheData = marcheRes.data?.marche_public || marcheRes.data || null;
                if (!fetchedMarcheData || !fetchedMarcheData.id) {
                    throw new Error("Données principales du marché non trouvées ou invalides.");
                }
                console.log("Visualisation: Received main data:", fetchedMarcheData); // Log the full response

                // --- Set Marche Data ---
                setMarcheData(fetchedMarcheData); // Contains convention, appelOffre relations if loaded
                setLoadingMarche(false); // Main data is loaded

                // --- Extract Lots Data ---
                const extractedLots = fetchedMarcheData.lots || [];
                // Ensure lots have their files with URLs added by backend
                setLotsData(extractedLots);
                console.log("Visualisation: Extracted Lots (count):", extractedLots.length);


                // --- Extract and Combine Files Data ---
                const generalFiles = fetchedMarcheData.fichiers_joints_generaux || [];
                let allFiles = [...generalFiles]; // Start with general files

                // Add files from within each lot (assuming they have URLs from backend)
                extractedLots.forEach(lot => {
                    if (lot.fichiers_joints && Array.isArray(lot.fichiers_joints)) {
                        // Assuming files within lots also have the 'url' property added by backend
                        allFiles = [...allFiles, ...lot.fichiers_joints];
                    }
                });
                setFilesData(allFiles); // Set the combined list of all files
                console.log("Visualisation: Extracted and Combined Files (count):", allFiles.length);
                // Check the console log for 'allFiles' to verify 'url' properties are present


                // --- Set Convention Name (use data already loaded) ---
                const loadedConvention = fetchedMarcheData.convention;
                if (loadedConvention) {
                    setConventionName(loadedConvention.Intitule || null);
                } else {
                    setConventionName(null); // No associated convention
                }

                // --- Fetch Fonctionnaires (Separate call remains) ---
                const fonctionnairesUrl = `${baseApiUrl}${apiPrefix}/fonctionnaires`;
                try {
                    const foncRes = await axios.get(fonctionnairesUrl, { withCredentials: true });
                    if (isMounted && foncRes.data) {
                        const foncData = foncRes.data.fonctionnaires || foncRes.data || [];
                        setFonctionnairesList(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` })));
                        console.log("Visualisation: Fetched Fonctionnaires List (length):", (foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` }))).length);
                    } else if (isMounted) {
                         console.warn("Could not fetch fonctionnaires list (no data)"); setFonctionnairesList([]);
                    }
                } catch (foncErr) {
                     if (isMounted) {
                         console.warn("Could not fetch fonctionnaires list:", foncErr.message); setFonctionnairesList([]);
                     }
                }
                // --- End Fonctionnaires Fetch ---

            } catch (err) {
                 if (!isMounted) return;
                console.error("Error fetching marche data:", err.response || err);
                setError(err.response?.data?.message || err.message || "Erreur critique lors du chargement du marché.");
                 setLoadingMarche(false); // Stop main loading on error
                 setMarcheData(null);
            } finally {
                 // Set related loading false after all processing (including fonctionnaires)
                 if (isMounted) setLoadingRelated(false);
            }
        };
        fetchDetails();
        return () => { isMounted = false; }; // Cleanup function
    }, [itemId, baseApiUrl]); // Dependencies

    // --- Helper to render Fonctionnaire names ---
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        // Handle cases where string might be null/undefined or just whitespace
        if (!fonctionnaireIdString || typeof fonctionnaireIdString !== 'string' || fonctionnaireIdString.trim() === '' || !Array.isArray(fonctionnairesList) || fonctionnairesList.length === 0) {
            return <span className="text-muted small fst-italic">Aucun point focal assigné.</span>;
        }
        // Split, trim, and filter out empty strings after trimming
        const ids = fonctionnaireIdString.split(';').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
            return <span className="text-muted small fst-italic">Aucun point focal assigné.</span>;
        }
        return (
            <Stack direction="horizontal" gap={1} wrap="wrap">
                {ids.map(id => {
                    // Case-insensitive comparison might be safer if IDs vary in case
                    const fonctionnaire = fonctionnairesList.find(f => String(f.value).toLowerCase() === String(id).toLowerCase());
                    return (
                        <Badge key={id} pill bg="light" text="dark" className="border me-1 mb-1 fw-normal shadow-sm">
                            <FontAwesomeIcon icon={faUserTie} className="me-1 text-secondary" />
                            {fonctionnaire?.label || `ID ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [fonctionnairesList]); // Dependency on fonctionnairesList

    // --- Render Detail Helpers ---
    const renderDetail = (label, value, formatter = null, mdSize = 6, lgSize = 3) => (
         (value !== null && value !== undefined && value !== '') || value === 0 ? // Show if value is 0
            <Col xs={12} md={mdSize} lg={lgSize} className="mb-3 data-point text-center">
                <strong className="text-dark titly d-block label">{label}</strong>
                <span className="value">{formatter ? formatter(value) : displayData(value)}</span>
            </Col>
        : null // Don't render if null/undefined/empty string
    );
    const renderDetail2 = (label, value, formatter = null) => (
        (value !== null && value !== undefined && value !== '') || value === 0 ? // Show if value is 0
           <div className="mb-2 d-flex justify-content-between align-items-center data-point">
               <strong className="text-dark titly fw-bold label me-2">{label} :</strong>
               <span className="value text-end">
                   {formatter ? formatter(value) : displayData(value)}
               </span>
           </div>
       : null // Don't render if null/undefined/empty string
   );

    // --- File Mapping Logic ---
    // Filter files based on presence/absence of lot_id from the combined filesData
    const marketFiles = filesData.filter(f => f.marche_id && !f.lot_id);
    // Group files by lot_id for the lots table
    const lotFilesMap = filesData.reduce((acc, f) => {
        if (f.lot_id) {
            if (!acc[f.lot_id]) acc[f.lot_id] = [];
            acc[f.lot_id].push(f); // Assumes file object now has 'url'
        }
        return acc;
    }, {});

    // --- Render Logic ---

    if (loadingMarche) { // Show initial spinner only for marche data
       return <div className="text-center p-5"><Spinner animation="border" /><span> Chargement initial...</span></div>;
    }

    if (error) { return <Alert variant="danger" className="m-3">Erreur: {error}</Alert>; }
    // Check specifically if marcheData is loaded, even if related data is still loading
    if (!marcheData) { return <Alert variant="warning" className="m-3">Aucune donnée principale de marché trouvée.</Alert>; }

    // Main content render
    return (
        <div className='px-4'>
            {/* Header Section */}
             <div className="d-flex justify-content-between align-items-start mb-4 px-5 pt-5 border-bottom holder pb-1">
                 <div>
                    <h2 className="mb-1 fw-bold text-dark ">Marché Public : {displayData(marcheData.numero_marche)}</h2>
                 </div>
                 {onClose && (
                     <Button variant="warning" onClick={onClose} title="Fermer" className="px-5 border-0 rounded-5 shadow-sm ">
                         <b>Revenir a la liste</b>
                     </Button>
                 )}
             </div>

             {/* Main Content Area Padding */}
            <div className="px-5 pb-3 holder">

                {/* --- Main Details Section --- */}
                <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Informations Générales</h5>
                 {/* Intitule */}
                <Row className="mb-4 pb-3 border-bottom data-section">
                     <Col xs={12} className="mb-3 data-point text-dark text-center pill bg-white shadow-sm p-2 px-5 rounded-2 ">
                        <strong className=" titly fs-bold d-block label">Intitulé du Marché</strong>
                        <p className="value lead mb-0">{displayData(marcheData.intitule)}</p>
                    </Col>
                </Row>
                 {/* Convention, AO, Type, Statut Row */}
                <Row className="mb-3 data-section">
                     <Col xs={12} className="mb-3 data-point">
                         <Row className='p-4 m-2 bg-white shadow-sm rounded-5'>
                            {/* Convention Associée */}
                            {renderDetail(
                                "Convention Associée",
                                conventionName, // Use extracted name
                                (name) => name ? <span><FontAwesomeIcon icon={faLink} className="me-2 text-warning"/>{displayData(name)}</span> : '-',
                                6, 3
                            )}
                             {/* Appel d'Offre */}
                            {renderDetail(
                                "Appel d'Offre Réf.",
                                marcheData.appel_offre?.numero, // Access nested property safely
                                (num) => num ? <span><FontAwesomeIcon icon={faLink} className="me-2 text-warning"/>{displayData(num)}</span> : '-',
                                6, 3
                            )}
                             {/* Type */}
                            {renderDetail("Type", marcheData.type_marche, null, 6, 3)}
                             {/* Statut */}
                            {renderDetail("Statut", marcheData.statut, getStatusBadge, 6, 3)}
                         </Row>
                     </Col>
                 </Row>
                 {/* Procedure, Mode, Budget, Montant, Source, Attributaire, Dates Row */}
                 <Row className="mb-3 data-section">
                     <Col xs={12} className="mb-3 data-point">
                         <div className='d-flex w-100 justify-content-between'>
                             <div className='p-3 m-2 bg-white rounded-5 shadow-sm w-100'>
                                {renderDetail2("Procédure Passation", marcheData.procedure_passation)}
                                {renderDetail2("Mode Passation", marcheData.mode_passation)}
                                {renderDetail2("Budget Prévisionnel", marcheData.budget_previsionnel, formatCurrency)}
                                {renderDetail2("Montant Attribué", marcheData.montant_attribue, formatCurrency)}
                             </div>
                             <div className='p-4 m-2 bg-white rounded-5 shadow-sm w-100'>
                                {renderDetail2("Source Financement", marcheData.source_financement)}
                                {renderDetail2("Attributaire(s) Principal", marcheData.attributaire)}
                                {renderDetail2("Date Publication", marcheData.date_publication, formatDate)}
                                {renderDetail2("Date Limite Offres", marcheData.date_limite_offres, formatDate)}
                             </div>
                         </div>
                     </Col>
                 </Row>
                 {/* Dates, Avancement, Engagement Row */}
                <Row className="mb-4 pb-3 border-bottom data-section">
                    <Col md={6}>
                        <div className='p-4 m-2 bg-white rounded-5 shadow-sm flex-fill w-100'>
                            {renderDetail2("Date Ouverture Plis", marcheData.date_ouverture_plis, formatDate)}
                            {renderDetail2("Date Fin Session Ouverture", marcheData.date_fin_ouverture, formatDate)}
                            {renderDetail2("Avancement Physique", marcheData.avancement_physique, formatPercentage)}
                            {renderDetail2("Avancement Financier", marcheData.avancement_financier, formatPercentage)}
                            {renderDetail2("Date Engagement Trésorerie", marcheData.date_engagement_tresorerie, formatDate)}
                         </div>
                     </Col>
                     <Col md={6}>
                         <div className='p-4 m-2 bg-white rounded-5 shadow-sm w-100 flex-fill'>
                            {renderDetail2("Date Notification", marcheData.date_notification, formatDate)}
                            {renderDetail2("Date Début Exécution", marcheData.date_debut_execution, formatDate)}
                            {renderDetail2("Durée (jours)", marcheData.duree_marche)}
                         </div>
                     </Col>
                </Row>
                {/* --- End Main Details Section --- */}

                {/* Loading indicator specifically for related data (like fonctionnaires) */}
                 {loadingRelated && (
                     <div className="text-center my-3 text-muted">
                         <Spinner animation="border" size="sm" className="me-2"/> Chargement des détails supplémentaires...
                     </div>
                 )}

                {/* --- Points Focaux Section (Card) --- */}
                {/* Show Card even if related data is loading, show spinner inside */}
                <Card className={CARD_CLASS}>
                     <Card.Body>
                         <Card.Title as="h5" className={CARD_TITLE_CLASS}>Points Focaux</Card.Title>
                         {loadingRelated ? ( // Check if related data (fonctionnaires) is still loading
                             <div className="text-center">
                                 <Spinner animation="border" size="sm" />
                             </div>
                         ) : (
                             // Use the helper function with the ID string from marcheData
                             getFonctionnaireNames(marcheData.id_fonctionnaire)
                         )}
                     </Card.Body>
                 </Card>
                {/* --- End Points Focaux Section --- */}

                {/* --- Lots Section --- */}
                {/* Show only after related data (which includes lots from main fetch) is done loading */}
                 {!loadingRelated && lotsData && lotsData.length > 0 && (
                     <div className="mb-4 pb-3 border-bottom data-section">
                        <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Lots Associés ({lotsData.length})</h5>
                        <Table striped hover responsive size="sm" className="mytab">
                            <thead className="table-light">
                                <tr>
                                    <th>N° Lot</th>
                                    <th>Objet</th>
                                    <th className="text-end">Montant Attribué</th>
                                    <th>Attributaire</th>
                                    <th>Fichiers</th>
                                </tr>
                            </thead>
                             <tbody>
                                {lotsData.map(lot => ( // Use lotsData state variable
                                    <tr key={lot.id}>
                                        <td>{displayData(lot.numero_lot)}</td>
                                        <td>{displayData(lot.objet)}</td>
                                        <td className="text-end">{formatCurrency(lot.montant_attribue)}</td>
                                        <td>{displayData(lot.attributaire)}</td>
                                        <td>
                                            {/* Use lotFilesMap which is derived from combined filesData */}
                                            {lotFilesMap[lot.id]?.length > 0 ? (
                                                <Stack direction="horizontal" gap={2}>
                                                    {/* Map over files associated with this lot ID */}
                                                    {lotFilesMap[lot.id].map(file => {
                                                        const publicUrl = file.url; // Directly use the URL from the file object
                                                        return publicUrl ? (
                                                            <a key={file.id} href={publicUrl} target="_blank" rel="noopener noreferrer" className="p-0 text-secondary" title={`Ouvrir: ${file.nom_fichier}`}>
                                                                <FontAwesomeIcon className='text-warning' icon={getFileIcon(file.nom_fichier || file.type_fichier)} />
                                                            </a>
                                                        ) : (<FontAwesomeIcon icon={faLink} className="text-muted" title="Lien indisponible"/>);
                                                    })}
                                                </Stack>
                                            ) : (<span className="text-muted fst-italic">-</span>)} {/* No files for this lot */}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                 )}

                 {/* --- General Files Section --- */}
                 {/* Show only after related data is done loading */}
                {!loadingRelated && marketFiles && marketFiles.length > 0 && (
                    <div className="mb-3 data-section">
                        <h5 className="mb-3 section-title text-uppercase fw-bold text-secondary">Fichiers Généraux ({marketFiles.length})</h5>
                        <Stack direction="horizontal" gap={3} wrap className='justify-content-start'>
                            {/* Map over the filtered general files */}
                            {marketFiles.map(file => {
                                const publicUrl = file.url; // Directly use the URL from the file object
                                return (
                                    <div key={file.id} className="border rounded p-2 d-flex align-items-center bg-dark text-white shadow-sm mb-2" style={{minWidth: '180px'}}>
                                        <FontAwesomeIcon icon={getFileIcon(file.nom_fichier || file.type_fichier)} className="me-2 fa-lg text-warning"/>
                                        <span className="me-auto small text-truncate" title={file.nom_fichier}>
                                            {displayData(file.nom_fichier, 'Fichier')}
                                        </span>
                                        {/* Conditional rendering based on publicUrl */}
                                        {publicUrl ? (
                                            <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-warning py-0 px-1 ms-2" title="Ouvrir">
                                                <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" className='text-warning'/>
                                            </a>
                                        ) : (
                                            <span className="text-muted fst-italic small ms-2">(Lien invalide)</span>
                                        )}
                                    </div>
                                );
                             })}
                        </Stack>
                    </div>
                )}

                {/* No Lots/Files Message */}
                 {!loadingRelated && (!lotsData || lotsData.length === 0) && (!marketFiles || marketFiles.length === 0) && (
                    <Alert variant='secondary' className='small py-2'><FontAwesomeIcon icon={faInfoCircle} className="me-2"/> Aucun lot ou fichier général joint pour ce marché.</Alert>
                 )}
             </div> {/* End holder padding */}
         </div>
    );
};

// --- PropTypes ---
MarchePublicVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func,
    baseApiUrl: PropTypes.string.isRequired,
};

export default MarchePublicVisualisation;