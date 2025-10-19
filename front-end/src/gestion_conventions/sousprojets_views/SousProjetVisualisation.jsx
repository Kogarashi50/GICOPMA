// src/pages/sousprojets_views/SousProjetVisualisation.jsx

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faUserTie } from '@fortawesome/free-solid-svg-icons';
import { Button, Card, Row, Col, Alert, Spinner, Stack, Badge } from 'react-bootstrap';

// --- Helpers ---
const formatPercentage = (value) => { const n = parseFloat(value); return isNaN(n)?'-':`${n.toFixed(2)} %`; };
const formatNumber = (value, decimals = 2) => { const n = parseFloat(value); return isNaN(n)?'-':n.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); };
const displayData = (data, fallback = '-') => data ?? fallback;
const formatDate = (dateString) => { if (!dateString) return '-'; try { return new Date(dateString).toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch (e) { return dateString; } };

// --- Styles/Classes ---
const VISUALISATION_CONTAINER_CLASS = "p-3 p-md-4 sousprojet-visualisation-container";
const VISUALISATION_CLOSE_BUTTON_CLASS = 'float-end py-2 rounded-5 shadow fw-bold px-5';
const CARD_CLASS = "h-100 border-light shadow-sm";
const CARD_TITLE_CLASS = "mb-3 fw-semibold text-secondary text-uppercase small";
const DL_CLASS = "row mb-0 dl-compact";
const DT_CLASS = "col-sm-5 fw-bold";
const DD_CLASS = "col-sm-7";

const SousProjetVisualisation = ({ itemId, onClose, baseApiUrl }) => {
    const [sousProjetData, setSousProjetData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lookupData, setLookupData] = useState({
        provinces: [],
        communes: [],
        fonctionnaires: []
    });

    // Fetch Sub-Project and all related lookup data
    const fetchData = useCallback(async () => {
        if (!itemId || !baseApiUrl) {
            setError("Configuration error: Missing ID or Base URL.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        const sousProjetUrl = `${baseApiUrl}/sousprojets/${itemId}`;
        const provincesUrl = `${baseApiUrl}/options/provinces`;
        const communesUrl = `${baseApiUrl}/options/communes`;
        const fonctionnairesUrl = `${baseApiUrl}/options/fonctionnaires`;

        try {
            const [sousProjetRes, provincesRes, communesRes, foncRes] = await Promise.all([
                axios.get(sousProjetUrl),
                axios.get(provincesUrl),
                axios.get(communesUrl),
                axios.get(fonctionnairesUrl),
            ]);

            // Process Sub-Project Response
            const spData = sousProjetRes.data.sousprojet || sousProjetRes.data.sous_projet || sousProjetRes.data;
            if (!spData || typeof spData !== 'object' || !spData.Code_Sous_Projet) {
                throw new Error(`Format de données invalide reçu pour Sous-Projet ${itemId}.`);
            }
            setSousProjetData(spData);

            // Process Lookup Responses
            setLookupData({
                provinces: provincesRes.data.provinces || provincesRes.data || [],
                communes: communesRes.data.communes || communesRes.data || [],
                fonctionnaires: foncRes.data.fonctionnaires || foncRes.data || [],
            });

        } catch (err) {
            const errorDetail = err.response?.data?.message || err.message || 'Erreur de chargement.';
            console.error(`Error during fetch:`, err);
            setError(`Échec du chargement des données: ${errorDetail}`);
        } finally {
            setLoading(false);
        }
    }, [itemId, baseApiUrl]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Helper to render Fonctionnaire names from lookup data
    const getFonctionnaireNames = useCallback((fonctionnaireIdString) => {
        if (!fonctionnaireIdString || !lookupData.fonctionnaires.length) {
            return displayData(null);
        }
        const ids = String(fonctionnaireIdString).split(';').map(id => id.trim()).filter(Boolean);
        if (ids.length === 0) {
            return displayData(null);
        }
        return (
            <Stack direction="horizontal" gap={1} wrap>
                {ids.map(id => {
                    const fonctionnaire = lookupData.fonctionnaires.find(f => String(f.id) === String(id));
                    return (
                        <Badge key={id} pill bg="light" text="dark" className="border me-1 mb-1 fw-normal shadow-sm">
                            <FontAwesomeIcon icon={faUserTie} className="me-1 text-secondary" />
                            {fonctionnaire?.nom_complet || `ID ${id}`}
                        </Badge>
                    );
                })}
             </Stack>
        );
    }, [lookupData.fonctionnaires]);

    // --- Render Logic ---

    if (loading) {
        return (
            <div className="text-center p-5 d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                <Spinner animation="border" variant="primary" className="me-3"/>
                <span className="text-muted fs-5">Chargement du sous-projet...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="m-3 m-md-4 shadow">
                <Alert.Heading><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> Erreur de Chargement</Alert.Heading>
                <p>{error}</p>
                <hr/>
                <Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button>
            </Alert>
        );
    }

    if (!sousProjetData) {
        return (
            <Alert variant="warning" className="m-3 m-md-4 shadow">
                 <Alert.Heading>Données indisponibles</Alert.Heading>
                 <p>Aucune donnée n'a pu être chargée pour ce sous-projet (Code: {itemId}). Cela peut être dû à une réponse inattendue de l'API.</p>
                 <hr/>
                 <Button onClick={onClose} variant="outline-warning" size="sm">Fermer</Button>
            </Alert>
        );
    }

    return (
        <div className={VISUALISATION_CONTAINER_CLASS}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <h3 className="mb-0 fw-bold text-primary">
                    {displayData(sousProjetData.Nom_Projet)}
                    <small className="text-muted fw-normal ms-2">({displayData(sousProjetData.Code_Sous_Projet)})</small>
                </h3>
                <Button variant="warning" size="sm" onClick={onClose} className={VISUALISATION_CLOSE_BUTTON_CLASS} aria-label="Fermer">
                   Revenir à la liste
                </Button>
            </div>

            {/* Main Content Grid */}
            <Row className="g-3 mb-3">

                {/* Card 1: Basic Info */}
                <Col md={6} lg={4}>
                    <Card className={CARD_CLASS}>
                         <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Informations Générales</Card.Title>
                            <dl className={DL_CLASS}>
                                <dt className={DT_CLASS}>Code:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Code_Sous_Projet)}</dd>
                                <dt className={DT_CLASS}>Nom:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Nom_Projet)}</dd>
                                <dt className={DT_CLASS}>Projet Maître:</dt>
                                <dd className={DD_CLASS} title={sousProjetData.projet ? `Code: ${sousProjetData.projet.Code_Projet}` : ''}>
                                    {displayData(sousProjetData.projet?.Code_Projet+ ' - '+sousProjetData.projet?.Nom_Projet, `(Code: ${displayData(sousProjetData.ID_Projet_Maitre)})`)}
                                </dd>
                                <dt className={DT_CLASS}>Statut:</dt><dd className={DD_CLASS}><Badge bg="secondary">{displayData(sousProjetData.Status)}</Badge></dd>
                                <dt className={DT_CLASS}>Secteur:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Secteur)}</dd>
                            </dl>
                        </Card.Body>
                    </Card>
                </Col>

                 {/* Card 2: Localisation */}
                <Col md={6} lg={4}>
                     <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Localisation</Card.Title>
                             <dl className={DL_CLASS}>
                                <dt className={DT_CLASS}>Province(s):</dt>
                                <dd className={DD_CLASS}>
                                    {(() => {
                                        const provinceIds = sousProjetData.Id_Province;
                                        if (!provinceIds || provinceIds.length === 0) return '-';
                                        return (
                                            <Stack direction="horizontal" gap={1} wrap>
                                                {provinceIds.map((id, index) => {
                                                    const province = lookupData.provinces.find(p => +p.value === +id);
                                                    const name = province?.label?.replace('Province:', '').trim() || `ID: ${id}`;
                                                    return <Badge key={index} bg="primary">{name}</Badge>;
                                                })}
                                            </Stack>
                                        );
                                    })()}
                                </dd>
                                <dt className={DT_CLASS}>Commune(s):</dt>
                                <dd className={DD_CLASS}>
                                     {(() => {
                                        const communeIds = sousProjetData.Id_Commune;
                                        if (!communeIds || communeIds.length === 0) return '-';
                                        return (
                                            <Stack direction="horizontal" gap={1} wrap>
                                                {communeIds.map((id, index) => {
                                                    const commune = lookupData.communes.find(c => +c.value === +id);
                                                    const name = commune?.label || `ID: ${id}`;
                                                    return <Badge key={index} bg="secondary">{name}</Badge>;
                                                })}
                                            </Stack>
                                        );
                                    })()}
                                </dd>
                                <dt className={DT_CLASS}>Localité:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Localite)}</dd>
                                <dt className={DT_CLASS}>Centre:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Centre)}</dd>
                                <dt className={DT_CLASS}>Site:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Site)}</dd>
                                <dt className={DT_CLASS}>Douars Desservis:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Douars_Desservis)}</dd>
                             </dl>
                        </Card.Body>
                    </Card>
                </Col>

                 {/* Card 3: Détails Techniques & Financiers */}
                 <Col md={6} lg={4}>
                     <Card className={CARD_CLASS}>
                         <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Détails Techniques & Financiers</Card.Title>
                             <dl className={DL_CLASS}>
                                 <dt className={DT_CLASS}>Nature Intervention:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Nature_Intervention)}</dd>
                                 <dt className={DT_CLASS}>Surface:</dt><dd className={DD_CLASS}>{formatNumber(sousProjetData.Surface)}</dd>
                                 <dt className={DT_CLASS}>Linéaire:</dt><dd className={DD_CLASS}>{formatNumber(sousProjetData.Lineaire)}</dd>
                                 <dt className={DT_CLASS}>Av. Physique:</dt><dd className={DD_CLASS}><Badge bg="primary">{formatPercentage(sousProjetData.Etat_Avan_Physi)}</Badge></dd>
                                 <dt className={DT_CLASS}>Av. Financier:</dt><dd className={DD_CLASS}><Badge bg="success">{formatPercentage(sousProjetData.Etat_Avan_Finan)}</Badge></dd>
                                 <dt className={DT_CLASS}>Estim. Initiale:</dt><dd className={`${DD_CLASS} fw-bold`}>{formatNumber(sousProjetData.Estim_Initi)} MAD</dd>
                                 <dt className={DT_CLASS}>Financement:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Financement)}</dd>
                                 <dt className={DT_CLASS}>Bénéficiaire:</dt><dd className={DD_CLASS}>{displayData(sousProjetData.Benificiaire)}</dd>
                             </dl>
                        </Card.Body>
                    </Card>
                 </Col>

                 {/* Card 4: Observations & Audit */}
                 <Col md={12} lg={8}>
                     <Card className={CARD_CLASS}>
                        <Card.Body>
                             <Card.Title as="h6" className={CARD_TITLE_CLASS}>Observations & Audit</Card.Title>
                             <p className="small mb-3 text-muted fst-italic">{displayData(sousProjetData.Observations, "Aucune observation.")}</p>
                             <hr className="my-2" />
                             <dl className={`${DL_CLASS} mt-2`}>
                                <dt className={DT_CLASS}>Créé le:</dt><dd className={DD_CLASS}>{formatDate(sousProjetData.created_at)}</dd>
                                <dt className={DT_CLASS}>Modifié le:</dt><dd className={DD_CLASS}>{formatDate(sousProjetData.updated_at)}</dd>
                             </dl>
                        </Card.Body>
                    </Card>
                 </Col>

                 {/* Card 5: Points Focaux */}
                 <Col md={12} lg={4}>
                     <Card className={CARD_CLASS}>
                        <Card.Body>
                            <Card.Title as="h6" className={CARD_TITLE_CLASS}>Points Focaux</Card.Title>
                            {getFonctionnaireNames(sousProjetData.id_fonctionnaire)}
                        </Card.Body>
                    </Card>
                 </Col>

            </Row>
        </div>
    );
};

SousProjetVisualisation.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    onClose: PropTypes.func.isRequired,
    baseApiUrl: PropTypes.string.isRequired,
};

export default SousProjetVisualisation;