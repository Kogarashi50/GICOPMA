import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faTimes, faTrashAlt, faUsers, faMapMarkerAlt, faHandshake } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { Form, Button, Row, Col, Alert, Spinner, Card, Modal, ListGroup } from 'react-bootstrap';
import PropTypes from 'prop-types';
import PartenaireManager from '../conventions_views/PartenaireManager';
import PartenaireEngagementManager from '../conventions_views/PartenaireEngagementManager';

// --- Helper Components & Functions ---
const bilingualLabel = (fr, ar, required = false) => ( <div className="d-flex justify-content-between align-items-center w-100"><span>{fr}{required && <span className="text-danger ms-1">*</span>}</span><span className="text-muted" style={{ fontSize: '0.9em' }}>{required && <span className="text-danger me-1">*</span>}{ar}</span></div> );
const selectStyles = { control: (p, s) => ({ ...p, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: s.selectProps.className?.includes('is-invalid') ? '#dc3545' : (s.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'), boxShadow: s.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', fontSize: '0.875rem' }), menuPortal: b => ({ ...b, zIndex: 9999 }), option: (p, s) => ({ ...p, backgroundColor: s.isSelected ? '#0d6efd' : s.isFocused ? '#e9ecef' : null, color: s.isSelected ? 'white' : 'black', fontSize: '0.875rem' }), multiValue: (p) => ({ ...p, backgroundColor: '#e9ecef', borderRadius: '0.5rem' }), };
const inputClass = "form-control form-control-sm rounded-pill shadow-sm bg-light border";
const parseCurrency = (v) => { if (typeof v !== 'string' && typeof v !== 'number') return null; const c = String(v).replace(/[\s\u00A0]/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.'); const n = parseFloat(c); return isNaN(n) ? null : n; };
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// --- Main Component ---
const ProjetForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated, baseApiUrl = 'http://localhost:8000/api' }) => {
    const initialFormData = useMemo(() => ({ Code_Projet: '', Nom_Projet: '', Cout_CRO: '', Date_Debut: '', Observations: '', Etat_Avan_Physi: '', Date_Fin: '', Cout_Projet: '', programme: null, convention: null, fonctionnaires: [], maitre_ouvrage: '', provinces: [], communes: [], Etat_Avan_Finan: '', secteur: null, maitre_ouvrage_delegue: '', duree_projet_mois: '', date_debut_prevue: '', date_fin_prevue: '' }), []);
    
    const [formData, setFormData] = useState(initialFormData);
    const [programmeOptions, setProgrammeOptions] = useState([]);
    const [conventionOptions, setConventionOptions] = useState([]);
    const [secteurOptions, setSecteurOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
    const [provinceOptions, setProvinceOptions] = useState([]);
    const [communeOptions, setCommuneOptions] = useState([]);
    const [selectedPartenaires, setSelectedPartenaires] = useState([]);
    const [partnerEngagements, setPartnerEngagements] = useState([]);
    const [engagementTypes, setEngagementTypes] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(!!itemId);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState({ message: '', details: [] });
    const [dataToResubmit, setDataToResubmit] = useState(null);
    const isEditing = useMemo(() => itemId !== null, [itemId]);
    const [engagementManagerKey, setEngagementManagerKey] = useState(Date.now());

    const fetchOptions = useCallback(async () => {
        setLoadingOptions(true);
        try {
            const results = await Promise.allSettled([
                axios.get(`${baseApiUrl}/options/programmes`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/conventions`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/provinces`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/communes`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/secteurs`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/engagement-types`, { withCredentials: true }),
            ]);
            const extract = (res) => (res.status === 'fulfilled' && Array.isArray(res.value.data)) ? res.value.data : [];
            const foncData = results[2].status === 'fulfilled' ? (results[2].value.data.fonctionnaires || []) : [];
            setProgrammeOptions(extract(results[0]));
            setConventionOptions(extract(results[1]));
            setFonctionnairesOptions(foncData.map(u => ({ value: u.id, label: u.nom_complet })));
            setProvinceOptions(extract(results[3]));
            setCommuneOptions(extract(results[4]));
            setSecteurOptions(extract(results[5]).map(s => ({ value: s.id, label: s.description_fr })));
            setEngagementTypes(extract(results[6]));
        } catch (err) {
            setSubmissionStatus(p => ({ ...p, error: "Erreur de chargement des listes." }));
        } finally {
            setLoadingOptions(false);
        }
    }, [baseApiUrl]);

    useEffect(() => { fetchOptions(); }, [fetchOptions]);

    useEffect(() => {
        if (!isEditing || !itemId || loadingOptions) {
            if (!isEditing) setLoadingData(false);
            return;
        }
        let isMounted = true;
        const fetchProjetData = async () => {
            setLoadingData(true);
            try {
                const response = await axios.get(`${baseApiUrl}/projets/${itemId}`, { withCredentials: true });
                const data = response.data?.projet;
                if (!data || !isMounted) return;

                const findOptionByValue = (options, valueToFind) => options.find(opt => String(opt.value) === String(valueToFind)) || null;
                const mapIdsToOptions = (options, items) => {
                    if (!Array.isArray(items)) return [];
                    const itemIds = new Set(items.map(item => String(item.id ?? item.Id)));
                    return options.filter(opt => itemIds.has(String(opt.value)));
                };
                const foncIds = new Set((data.id_fonctionnaire || '').split(';').filter(Boolean));
                
                setFormData({
                    Code_Projet: data.Code_Projet ?? '', Nom_Projet: data.Nom_Projet ?? '', Cout_CRO: data.Cout_CRO ?? '', Date_Debut: data.Date_Debut?.split('T')[0] ?? '', Observations: data.Observations ?? '', Etat_Avan_Physi: data.Etat_Avan_Physi ?? '', Etat_Avan_Finan: data.Etat_Avan_Finan ?? '', Date_Fin: data.Date_Fin?.split('T')[0] ?? '', Cout_Projet: data.Cout_Projet ?? '', maitre_ouvrage: data.maitre_ouvrage ?? '', maitre_ouvrage_delegue: data.maitre_ouvrage_delegue ?? '', duree_projet_mois: data.duree_projet_mois ?? '', date_debut_prevue: data.date_debut_prevue?.split('T')[0] ?? '', date_fin_prevue: data.date_fin_prevue?.split('T')[0] ?? '',
                    programme: findOptionByValue(programmeOptions, data.Id_Programme), convention: findOptionByValue(conventionOptions, data.Convention_Code), secteur: findOptionByValue(secteurOptions, data.secteur_id), fonctionnaires: fonctionnairesOptions.filter(f => foncIds.has(String(f.value))), provinces: mapIdsToOptions(provinceOptions, data.provinces), communes: mapIdsToOptions(communeOptions, data.communes),
                });

                const engagements = data.engagements_financiers || [];
                if (engagements.length > 0) {
                    const uniquePartnersForDropdown = [];
                    const partnerIdSet = new Set();
                    engagements.forEach(eng => {
                        if (eng.partenaire && !partnerIdSet.has(eng.partenaire_id)) {
                            const partnerData = eng.partenaire;
                            let partnerLabel = partnerData.Description_Arr || partnerData.Description || `Partenaire ID ${eng.partenaire_id}`;
                            if (partnerData.Code) partnerLabel = `${partnerData.Code} - ${partnerLabel}`;
                            uniquePartnersForDropdown.push({ value: eng.partenaire_id, label: partnerLabel });
                            partnerIdSet.add(eng.partenaire_id);
                        }
                    });
                    setSelectedPartenaires(uniquePartnersForDropdown);
                    
                    setPartnerEngagements(engagements.map(eng => {
                        // **CORRECTION** : Mappe les `versements` du backend vers `engagements_annuels` pour le frontend
                        const annualEngagements = Array.isArray(eng.versements)
                            ? eng.versements.map(versement => ({
                                  id: versement.id,
                                  annee: versement.annee,
                                  montant: versement.montant,
                              }))
                            : [];

                        const partnerData = eng.partenaire;
                        let partnerLabel = `Partenaire ID ${eng.partenaire_id}`;
                        if (partnerData) {
                            partnerLabel = partnerData.Description_Arr || partnerData.Description || partnerLabel;
                            if (partnerData.Code) partnerLabel = `${partnerData.Code} - ${partnerLabel}`;
                        }
                        
                        return {
                            id: eng.id ?? generateTempId(),
                            partenaire_id: eng.partenaire_id,
                            partenaire_label: partnerLabel,
                            montant_convenu: eng.montant_engage || '',
                            engagement_description: eng.commentaire || '',
                            date_signature: eng.date_engagement?.split('T')[0] || '',
                            is_signatory: !!eng.is_signatory,
                            engagement_type_id: eng.engagement_type_id,
                            autre_engagement: eng.autre_engagement || '',
                            details_signature: eng.details_signature || '',
                            engagements_annuels: annualEngagements,
                        };
                    }));
                } else {
                    setSelectedPartenaires([]);
                    setPartnerEngagements([]);
                }
                setEngagementManagerKey(Date.now());
            } catch (err) {
                console.error("Failed to fetch project data:", err);
                if (isMounted) setSubmissionStatus({ loading: false, error: "Erreur lors du chargement du projet." });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };
        fetchProjetData();
        return () => { isMounted = false; };
    }, [itemId, isEditing, baseApiUrl, loadingOptions, programmeOptions, conventionOptions, secteurOptions, fonctionnairesOptions, provinceOptions, communeOptions, engagementTypes]);

    const handleChange = useCallback((e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: undefined })); }, [formErrors]);

    const executeSubmit = useCallback(async (dataPayload, confirmDelete = false) => {
        setSubmissionStatus({ loading: true, error: null, success: false });
        if (confirmDelete) dataPayload.confirm_cascade_delete = true;
        const url = isEditing ? `${baseApiUrl}/projets/${itemId}` : `${baseApiUrl}/projets`;
        const method = isEditing ? 'put' : 'post';
        try {
            const response = await axios({ method, url, data: dataPayload, withCredentials: true });
            setSubmissionStatus({ loading: false, error: null, success: true });
            (isEditing ? onItemUpdated : onItemCreated)?.(response.data.projet);
            onClose();
        } catch (err) {
            const error = err.response;
            if (error?.status === 409 && error.data?.requires_confirmation) {
                setSubmissionStatus({ loading: false }); setConfirmModalData({ message: error.data.message, details: error.data.details }); setDataToResubmit(dataPayload); setShowConfirmModal(true);
            } else {
                const errorMsg = error?.data?.message || "Une erreur est survenue.";
                setSubmissionStatus({ loading: false, error: errorMsg });
                if (error?.status === 422) setFormErrors(error.data.errors || {});
            }
        }
    }, [baseApiUrl, isEditing, itemId, onClose, onItemCreated, onItemUpdated]);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        
        const dataToSubmit = {
            ...formData,
            Id_Programme: formData.programme?.value ?? null,
            Convention_Code: formData.convention?.value ?? null,
            secteur_id: formData.secteur?.value ?? null,
            id_fonctionnaire: formData.fonctionnaires.map(f => f.value).join(';'),
            province_ids: formData.provinces.map(p => p.value),
            commune_ids: formData.communes.map(c => c.value),

            engagements: partnerEngagements.map(eng => {
                const numericId = parseInt(eng.id, 10);
                return {
                    // **CORRECTION** : Gère les ID temporaires et numériques
                    id: !isNaN(numericId) ? numericId : null,
                    partenaire_id: eng.partenaire_id,
                    montant_convenu: parseCurrency(eng.montant_convenu),
                    engagement_description: eng.engagement_description,
                    date_signature: eng.date_signature,
                    is_signatory: !!eng.is_signatory,
                    engagement_type_id: eng.engagement_type_id,
                    autre_engagement: eng.autre_engagement,
                    details_signature: eng.details_signature,
                    
                    // **CORRECTION** : Inclut les engagements annuels dans le payload pour la sauvegarde
                    versements: Array.isArray(eng.engagements_annuels) ? eng.engagements_annuels.map(v => {
                        const numericVersementId = parseInt(v.id, 10);
                        return {
                            id: !isNaN(numericVersementId) ? numericVersementId : null,
                            annee: v.annee,
                            montant: parseCurrency(v.montant)
                        };
                    }) : []
                };
            })
        }; 

        executeSubmit(dataToSubmit, false); 
    }, [formData, partnerEngagements, executeSubmit]);

    const handleModalConfirm = () => { if (dataToResubmit) executeSubmit(dataToResubmit, true); setShowConfirmModal(false); };
    const isSubmitDisabled = submissionStatus.loading || loadingData || loadingOptions;

    if (loadingData || loadingOptions) return <div className="text-center p-5"><Spinner /><span className='ms-3'>Chargement...</span></div>;

    return (
        <>
            <div className="p-3 p-md-4 bg-white" style={{ borderRadius: '20px', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                    <div><h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier' : 'Créer'}</h5><h2 className="mb-0 fw-bold">Projet</h2></div>
                    <Button variant="warning" onClick={onClose} size="sm" className="btn rounded-5 px-5 py-2 fw-bold shadow-sm">Revenir</Button>
                </div>
                {submissionStatus.error && <Alert variant="danger" dismissible onClose={() => setSubmissionStatus(p => ({ ...p, error: null }))}>{submissionStatus.error}</Alert>}
                <Form noValidate onSubmit={handleSubmit}>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6}><Form.Label className="small w-100">{bilingualLabel("Code", "الرمز", true)}</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Code_Projet} required type="text" name="Code_Projet" value={formData.Code_Projet} onChange={handleChange} /></Form.Group>
                        <Form.Group as={Col} md={6}><Form.Label className="small w-100">{bilingualLabel("Intitulé", "العنوان", true)}</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Nom_Projet} required type="text" name="Nom_Projet" value={formData.Nom_Projet} onChange={handleChange} /></Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={4}><Form.Label className="small w-100">{bilingualLabel("Maitre d'ouvrage", "صاحب المشروع")}</Form.Label><Form.Control className={inputClass} type="text" name="maitre_ouvrage" value={formData.maitre_ouvrage} onChange={handleChange} /></Form.Group>
                        <Form.Group as={Col} md={4}><Form.Label className="small w-100">{bilingualLabel("M.O. Délégué", "صاحب المشروع المفوض")}</Form.Label><Form.Control className={inputClass} type="text" name="maitre_ouvrage_delegue" value={formData.maitre_ouvrage_delegue} onChange={handleChange} /></Form.Group>
                        <Form.Group as={Col} md={4}><Form.Label className="small w-100">{bilingualLabel("Secteur", "القطاع")}</Form.Label><Select options={secteurOptions} value={formData.secteur} onChange={opt => setFormData(p => ({ ...p, secteur: opt }))} styles={selectStyles} placeholder="- Sélectionner -" isClearable menuPortalTarget={document.body} /></Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={4}><Form.Label className="small w-100">{bilingualLabel("Durée (mois)", "المدة")}</Form.Label><Form.Control className={inputClass} type="number" name="duree_projet_mois" value={formData.duree_projet_mois} onChange={handleChange} min="0" /></Form.Group>
                        <Form.Group as={Col} md={4}><Form.Label className="small w-100">{bilingualLabel("Début Prévu", "البدء المتوقع")}</Form.Label><Form.Control className={inputClass} type="date" name="date_debut_prevue" value={formData.date_debut_prevue} onChange={handleChange} /></Form.Group>
                        <Form.Group as={Col} md={4}><Form.Label className="small w-100">{bilingualLabel("Fin Prévue", "الانتهاء المتوقع")}</Form.Label><Form.Control className={inputClass} type="date" name="date_fin_prevue" value={formData.date_fin_prevue} onChange={handleChange} min={formData.date_debut_prevue || undefined} /></Form.Group>
                    </Row>
                    <Form.Group className="mb-3"><Form.Label className="small w-100">{bilingualLabel("Programme", "البرنامج", true)}</Form.Label><Select options={programmeOptions} value={formData.programme} onChange={opt => setFormData(p => ({ ...p, programme: opt }))} styles={selectStyles} placeholder="- Sélectionner -" isClearable className={formErrors.Id_Programme ? 'is-invalid' : ''} menuPortalTarget={document.body} /></Form.Group>
                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="py-2"><h6 className='mb-0 fw-bold'><FontAwesomeIcon icon={faMapMarkerAlt} className="me-2"/>Localisation</h6></Card.Header>
                        <Card.Body>
                            <Row className="g-3">
                                <Form.Group as={Col} md={6}><Form.Label className="small w-100">{bilingualLabel("Provinces", "الأقاليم")}</Form.Label><Select options={provinceOptions} value={formData.provinces} onChange={opts => setFormData(p => ({ ...p, provinces: opts || [] }))} styles={selectStyles} isMulti closeMenuOnSelect={false} menuPortalTarget={document.body} /></Form.Group>
                                <Form.Group as={Col} md={6}><Form.Label className="small w-100">{bilingualLabel("Communes", "الجماعات")}</Form.Label><Select options={communeOptions} value={formData.communes} onChange={opts => setFormData(p => ({ ...p, communes: opts || [] }))} styles={selectStyles} isMulti closeMenuOnSelect={false} menuPortalTarget={document.body} /></Form.Group>
                            </Row>
                        </Card.Body>
                    </Card>

                    <Card className="mb-4 shadow-sm">
                        <Card.Header className="py-2"><h6 className='mb-0 fw-bold text-success'><FontAwesomeIcon icon={faHandshake} className="me-2"/>Engagements Partenaires</h6></Card.Header>
                        <Card.Body className="p-3 bg-light">
                             <PartenaireManager 
                                selectedPartenaires={selectedPartenaires} 
                                onSelectionChange={setSelectedPartenaires} 
                                baseApiUrl={baseApiUrl} 
                             />
                             {selectedPartenaires.length > 0 && (
                                <div className="mt-4">
                                    <PartenaireEngagementManager
                                        key={engagementManagerKey}
                                        selectedPartenaires={selectedPartenaires}
                                        onEngagementsChange={setPartnerEngagements}
                                        initialEngagements={partnerEngagements}
                                        baseApiUrl={baseApiUrl}
                                        engagementTypes={engagementTypes}
                                        conventionYear={(formData.date_debut_prevue || formData.Date_Debut || '').split('-')[0]}
                                        conventionDuration={formData.duree_projet_mois}
                                        conventionCoutGlobal={formData.Cout_Projet}
                                    />
                                </div>
                             )}
                        </Card.Body>
                    </Card>
                    
                    <Row className="mt-4 pt-3 border-top justify-content-center">
                        <Col xs="auto"><Button onClick={onClose} variant="secondary" className="px-5 rounded-pill" disabled={submissionStatus.loading}>Annuler</Button></Col>
                        <Col xs="auto"><Button type="submit" variant="primary" className="px-5 rounded-pill" disabled={isSubmitDisabled}>{submissionStatus.loading ? <><Spinner size="sm" className="me-2"/> Enregistrement...</> : (isEditing ? 'Enregistrer' : 'Valider')}</Button></Col>
                    </Row>
                </Form>
            </div>
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
                <Modal.Header closeButton><Modal.Title><FontAwesomeIcon icon={faExclamationTriangle} className="text-warning me-2"/> Confirmation Requise</Modal.Title></Modal.Header>
                <Modal.Body><p>{confirmModalData.message}</p>{confirmModalData.details?.length > 0 && <ListGroup variant="flush"><small>Affectera :</small>{confirmModalData.details.map((d, i) => <ListGroup.Item key={i} className="py-1 small">{d}</ListGroup.Item>)}</ListGroup>}<p className="fw-bold text-danger mt-3">Action irréversible.</p></Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowConfirmModal(false)}>Annuler</Button><Button variant="danger" onClick={handleModalConfirm}>Confirmer</Button></Modal.Footer>
            </Modal>
        </>
    );
};

ProjetForm.propTypes = { itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), onClose: PropTypes.func.isRequired, onItemCreated: PropTypes.func, onItemUpdated: PropTypes.func, baseApiUrl: PropTypes.string, };
ProjetForm.defaultProps = { itemId: null, onItemCreated: ()=>{}, onItemUpdated: ()=>{}, baseApiUrl: 'http://localhost:8000/api', };

export default ProjetForm;