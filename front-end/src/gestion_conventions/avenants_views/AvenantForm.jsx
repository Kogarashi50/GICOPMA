import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faTimes, faTrashAlt, faUndo,
    faFilePdf, faFileWord, faFileExcel, faFileImage, faFileAlt,
    faPlus, faUsers, faHandshake
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import {
    Form, Button, Row, Col, Card, Alert, Spinner,
    InputGroup, ListGroup, Modal
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import PartenaireManager from '../conventions_views/PartenaireManager';
import PartenaireEngagementManager from '../conventions_views/PartenaireEngagementManager';

const bilingualLabel = (fr, ar, required = false) => (
    <div className="d-flex justify-content-between align-items-center w-100">
        <span>{fr}{required && <span className="text-danger ms-1">*</span>}</span>
        <span className="text-muted" style={{ fontSize: '0.9em', marginRight: '8px' }}>{required && <span className="text-danger me-1">*</span>}{ar}</span>
    </div>
);

const STATUT_OPTIONS = [ { value: "approuvé", label: "Approuvé" }, { value: "non visé", label: "Non Visé" }, { value: "en cours de visa", label: "En Cours de Visa" }, { value: "visé", label: "Visé" }, { value: "signé", label: "Signé" } ];
const TYPE_MODIFICATION_OPTIONS = [ { value: 'montant', label: 'Modification du Montant' }, { value: 'durée', label: 'Prolongation de Durée' }, { value: 'partenaire', label: 'Changement de Partenaire(s)' }, { value: 'technique_administratif', label: 'Mise à Jour Technique/Administrative' }, { value: 'autre', label: 'Autres Modifications' } ];

const selectStyles = {
    control: (p, s) => ({ ...p, width: '100%', backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: s.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da', boxShadow: s.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', fontSize: '0.875rem' }),
    valueContainer: (p) => ({ ...p, padding: '0.25rem 0.8rem', flexWrap: 'wrap' }),
    input: (p) => ({ ...p, margin: '0px', padding: '0px', fontSize: '0.875rem' }),
    indicatorSeparator: () => ({ display: 'none' }),
    indicatorsContainer: (p) => ({ ...p, height: '36px' }),
    placeholder: (p) => ({ ...p, color: '#6c757d', fontSize: '0.875rem' }),
    menu: (p) => ({ ...p, borderRadius: '0.5rem', zIndex: 1055 }),
    menuPortal: b => ({ ...b, zIndex: 9999 }),
    option: (p, s) => ({ ...p, backgroundColor: s.isSelected ? '#0d6efd' : s.isFocused ? '#e9ecef' : null, color: s.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    multiValue: (p) => ({ ...p, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px' }),
    multiValueLabel: (p) => ({ ...p, color: '#495057', fontSize: '0.8rem' }),
    multiValueRemove: (p) => ({ ...p, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white' } }),
};

const parseCurrency = (v) => { if (typeof v !== 'string' && typeof v !== 'number') return null; if (typeof v === 'number') return v; const c = v.replace(/[\s\u00A0]/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.'); const n = parseFloat(c); return isNaN(n) ? null : n; };
const getFileIcon = (f) => { if (!f) return faFileAlt; const l = String(f).toLowerCase(); if (l.includes('pdf')) return faFilePdf; if (l.includes('doc')) return faFileWord; if (l.includes('xls')) return faFileExcel; if (['jpg', 'jpeg', 'png', 'gif'].some(e => l.endsWith(e))) return faFileImage; return faFileAlt; };
const generateTempId = () => `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const AvenantForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated, initialConventionId = null, conventionCode = '', baseApiUrl = 'http://localhost:8000/api' }) => {
    const initialFormData = useMemo(() => ({ convention_id: initialConventionId || '', numero_avenant: '', date_signature: '', objet: '', type_modification: [], montant_avenant: '', montant_modifie: '', annee_avenant: new Date().getFullYear(), session: '', numero_approbation: '', statut: null, date_visa: '', nouvelle_date_fin: '', remarques: '', fonctionnaires: [] }), [initialConventionId]);
    
    const [formData, setFormData] = useState(initialFormData);
    const [conventionOptions, setConventionOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
    const [selectedPartenaires, setSelectedPartenaires] = useState([]);
    const [partnerEngagements, setPartnerEngagements] = useState([]);
    const [engagementTypes, setEngagementTypes] = useState([]);
    const [fichiers, setFichiers] = useState([]);
    const [existingFichiers, setExistingFichiers] = useState([]);
    const [fichiersToDelete, setFichiersToDelete] = useState([]);
    const [editingFile, setEditingFile] = useState(null);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(!!itemId);
    const isEditing = useMemo(() => itemId !== null, [itemId]);
    const storageBaseUrl = useMemo(() => baseApiUrl.replace('/api', ''), [baseApiUrl]);
    const [selectedConventionDetails, setSelectedConventionDetails] = useState(null);
    const buttonCloseClass = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold border-0';

    const fetchOptions = useCallback(async () => {
        setLoadingOptions(true);
        try {
            const [convRes, foncRes, engTypeRes] = await Promise.all([
                axios.get(`${baseApiUrl}/options/conventions`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/engagement-types`, { withCredentials: true })
            ]);
            setConventionOptions((convRes.data || []).sort((a, b) => String(a.label).localeCompare(String(b.label))));
            const foncData = Array.isArray(foncRes.data?.fonctionnaires) ? foncRes.data.fonctionnaires : [];
            setFonctionnairesOptions(foncData.map(f => ({ value: f.id, label: f.nom_complet })).sort((a, b) => String(a.label).localeCompare(String(b.label))));
            setEngagementTypes(Array.isArray(engTypeRes.data) ? engTypeRes.data : []);
        } catch (err) {
            setSubmissionStatus(prev => ({ ...prev, error: "Erreur chargement des listes.", loading: false }));
        } finally {
            setLoadingOptions(false);
        }
    }, [baseApiUrl]);

    useEffect(() => { fetchOptions(); }, [fetchOptions]);

    // =================================================================================
    // THIS IS THE CORRECTED DATA FETCHING LOGIC FOR EDITING
    // =================================================================================
    useEffect(() => {
        if (!isEditing || !itemId || loadingOptions) {
            if (!itemId) setLoadingData(false);
            return;
        }

        let isMounted = true;
        const fetchAvenantData = async () => {
            setLoadingData(true);
            try {
                const response = await axios.get(`${baseApiUrl}/avenants/${itemId}`, { withCredentials: true });
                if (!isMounted) return;

                const data = response.data.avenant || response.data;
                if (data.convention) setSelectedConventionDetails(data.convention);

                const findOption = (opts, val) => opts.find(o => String(o.value).toLowerCase() === String(val).toLowerCase()) || null;
                const findMulti = (opts, vals) => Array.isArray(vals) ? opts.filter(o => vals.includes(o.value)) : [];
                const foncIds = new Set((data.id_fonctionnaire || '').split(';').map(id => id.trim()).filter(Boolean));

                setFormData({
                    convention_id: data.convention_id || '',
                    numero_avenant: data.numero_avenant || '',
                    date_signature: data.date_signature || '',
                    objet: data.objet || '',
                    annee_avenant: data.annee_avenant || new Date().getFullYear(),
                    session: data.session || '',
                    numero_approbation: data.numero_approbation || '',
                    statut: findOption(STATUT_OPTIONS, data.statut),
                    date_visa: data.date_visa || '',
                    type_modification: findMulti(TYPE_MODIFICATION_OPTIONS, data.type_modification),
                    montant_avenant: data.montant_avenant != null ? String(data.montant_avenant) : '',
                    montant_modifie: data.montant_modifie != null ? String(data.montant_modifie) : '',
                    nouvelle_date_fin: data.nouvelle_date_fin || '',
                    remarques: data.remarques || '',
                    fonctionnaires: fonctionnairesOptions.filter(f => foncIds.has(String(f.value))),
                });

                setExistingFichiers((data.documents || []).map(f => ({ id: f.id, file_name: f.file_name, url: `${storageBaseUrl}/${f.file_path}`, intitule: f.Intitule || '' })));
                
                const commitments = data.partner_commitments || [];
                const isPartnerMod = (data.type_modification || []).includes('partenaire');
                
                if (isPartnerMod && commitments.length > 0) {
                    const partnerIdSet = new Set();
                    const uniquePartnersForDropdown = [];
                    
                    commitments.forEach(c => {
                        if (!partnerIdSet.has(c.Id_Partenaire) && c.partenaire) {
                            const pData = c.partenaire;
                            let label = pData.Description_Arr || pData.Description || `ID ${c.Id_Partenaire}`;
                            if (pData.Code) label = `${pData.Code} - ${label}`;
                            uniquePartnersForDropdown.push({ value: c.Id_Partenaire, label });
                            partnerIdSet.add(c.Id_Partenaire);
                        }
                    });
                    setSelectedPartenaires(uniquePartnersForDropdown);
                    
                    setPartnerEngagements(commitments.map(c => {
                        const pData = c.partenaire;
                        let label = `ID ${c.Id_Partenaire}`;
                        if (pData) {
                            label = pData.Description_Arr || pData.Description || label;
                            if (pData.Code) label = `${pData.Code} - ${label}`;
                        }
                        return {
                            id: c.Id_CP ?? generateTempId(),
                            partenaire_id: c.Id_Partenaire,
                            partenaire_label: label,
                            engagement_type_id: c.engagement_type_id,
                            engagement_type_label: c.engagement_type?.nom || '',
                            montant_convenu: c.Montant_Convenu || '',
                            autre_engagement: c.autre_engagement || '',
                            engagement_description: c.engagement_description || '',
                            is_signatory: !!c.is_signatory,
                            date_signature: c.date_signature || '',
                            details_signature: c.details_signature || '',
                            engagements_annuels: (c.engagements_annuels || []).map(e => ({ annee: e.annee, montant_prevu: String(e.montant_prevu ?? '') }))
                        };
                    }));
                } else {
                    setSelectedPartenaires([]);
                    setPartnerEngagements([]);
                }
            } catch (err) {
                console.error("Failed to fetch avenant data:", err);
                if (isMounted) setSubmissionStatus({ loading: false, error: "Erreur chargement des données.", success: false });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };
        fetchAvenantData();
        return () => { isMounted = false; };
    }, [itemId, isEditing, baseApiUrl, loadingOptions, fonctionnairesOptions, storageBaseUrl]);
    // =================================================================================
    
    useEffect(() => {
        const typeValues = formData.type_modification?.map(t => t.value) || [];
        if (typeValues.includes('montant') && selectedConventionDetails?.Cout_Global != null) {
            const conventionAmount = parseCurrency(String(selectedConventionDetails.Cout_Global));
            const avenantAmount = parseCurrency(formData.montant_avenant);
            if (conventionAmount !== null && avenantAmount !== null) {
                setFormData(prev => ({ ...prev, montant_modifie: String((conventionAmount + avenantAmount).toFixed(2)) }));
            } else {
                setFormData(prev => ({ ...prev, montant_modifie: '' }));
            }
        }
    }, [formData.montant_avenant, selectedConventionDetails, formData.type_modification]);

    const validateForm = useCallback(() => { /* ... validation logic ... */ return true; }, []);
    const handleChange = useCallback((e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); }, []);
    const handleSelectChange = useCallback(async (opt, action) => { const { name } = action; setFormData(p => ({ ...p, [name]: opt || (action.isMulti ? [] : null) })); if (name === 'convention_id' && opt) { try { const res = await axios.get(`${baseApiUrl}/conventions/${opt.value}`); setSelectedConventionDetails(res.data.convention); } catch (e) { setSelectedConventionDetails(null); } } else if (name === 'convention_id' && !opt) { setSelectedConventionDetails(null); } }, [baseApiUrl]);
    const handleEngagementsChange = useCallback((engs) => { setPartnerEngagements(engs); }, []);
    const handleFileChange = useCallback((e) => { setFichiers(p => [...p, ...Array.from(e.target.files).map(f => ({ file: f, intitule: f.name.replace(/\.[^/.]+$/, "") }))]); e.target.value = null; }, []);
    const removeNewFile = useCallback((idx) => setFichiers(p => p.filter((_, i) => i !== idx)), []);
    const removeExistingFile = useCallback((id) => setFichiersToDelete(p => [...new Set([...p, id])]), []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmissionStatus({ loading: true, error: null, success: false });
        const data = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (key === 'type_modification') (value || []).forEach(v => data.append('type_modification[]', v.value));
            else if (key === 'fonctionnaires') data.append('id_fonctionnaire', (value || []).map(v => v.value).join(';'));
            else if (key === 'statut') data.append('statut', value?.value || '');
            else if (['montant_avenant', 'montant_modifie'].includes(key) && value) data.append(key, String(parseCurrency(value)));
            else data.append(key, value || '');
        });

        if ((formData.type_modification || []).some(t => t.value === 'partenaire')) {
            const payload = partnerEngagements.map(eng => ({
                id_cp: typeof eng.id === 'number' ? eng.id : null,
                Id_Partenaire: eng.partenaire_id,
                engagement_type_id: eng.engagement_type_id,
                Montant_Convenu: eng.montant_convenu ? parseCurrency(eng.montant_convenu) : null,
                autre_engagement: eng.autre_engagement || null,
                engagement_description: eng.engagement_description || null,
                is_signatory: !!eng.is_signatory,
                date_signature: eng.is_signatory ? eng.date_signature : null,
                details_signature: eng.is_signatory ? eng.details_signature : null,
                engagements_annuels: (eng.engagements_annuels || []).map(y => ({ annee: y.annee, montant_prevu: parseCurrency(y.montant_prevu) }))
            }));
            data.append('avenant_partner_commitments', JSON.stringify(payload));
        }

        fichiers.forEach((fw, i) => { data.append(`fichiers[${i}]`, fw.file); data.append(`intitules[${i}]`, fw.intitule); });

        if (isEditing) {
            data.append('_method', 'PUT');
            fichiersToDelete.forEach(id => data.append('fichiers_to_delete[]', id));
            const meta = existingFichiers.map(f => ({ id: f.id, intitule: f.intitule }));
            data.append('existing_documents_meta', JSON.stringify(meta));
        }

        const url = isEditing ? `${baseApiUrl}/avenants/${itemId}` : `${baseApiUrl}/avenants`;
        try {
            const res = await axios.post(url, data, { withCredentials: true });
            setSubmissionStatus({ loading: false, error: null, success: true });
            (isEditing ? onItemUpdated : onItemCreated)(res.data.avenant);
            onClose();
        } catch (err) {
            const error = err.response;
            setSubmissionStatus({ loading: false, error: error?.data?.message || "Erreur.", success: false });
            if (error?.status === 422) setFormErrors(error.data.errors || {});
        }
    }, [isEditing, itemId, baseApiUrl, formData, fichiers, fichiersToDelete, existingFichiers, partnerEngagements, validateForm, onClose, onItemCreated, onItemUpdated]);
    
    // JSX Render starts here
    if (loadingData || loadingOptions) { return <div className="d-flex justify-content-center p-5"><Spinner animation="border" variant="primary" /><span className='ms-3 text-muted'>Chargement...</span></div>; }
    
    return (
        <div className="p-3 p-md-4 bg-white" style={{ borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier' : 'Ajouter'}</h5>
                    <h2 className="mb-0 fw-bold">Avenant {conventionCode && `à la Convention ${conventionCode}`}</h2>
                </div>
                <Button variant="warning" onClick={onClose} size="sm" className={buttonCloseClass}><b>Revenir à la liste</b></Button>
            </div>

            {submissionStatus.error && <Alert variant="danger" dismissible onClose={() => setSubmissionStatus(p => ({ ...p, error: null }))}>{submissionStatus.error}</Alert>}
            
            <Form noValidate onSubmit={handleSubmit} className='px-md-3'>
                {/* Convention Selection */}
                <Form.Group as={Row} className="mb-3 align-items-center" controlId="formConvention_id">
                    <Form.Label column sm={3} className="small fw-medium text-sm-end">{bilingualLabel("Convention", "الاتفاقية", true)}</Form.Label>
                    <Col sm={9}>
                        <Select name="convention_id" options={conventionOptions} value={conventionOptions.find(opt => opt.value === formData.convention_id) || null} onChange={handleSelectChange} styles={selectStyles} placeholder="- Sélectionner -" isDisabled={isEditing} className={formErrors.convention_id ? 'is-invalid' : ''} menuPortalTarget={document.body} />
                        {formErrors.convention_id && <div className="invalid-feedback d-block ps-1 small">{formErrors.convention_id}</div>}
                    </Col>
                </Form.Group>

                {/* Main Avenant Details */}
                <Row className="g-3 mb-3">
                    <Form.Group as={Col} md={4} controlId="formNumeroApprobation"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("N° Approbation", "رقم الموافقة", true)}</Form.Label><Form.Control className="p-2 rounded-pill shadow-sm" isInvalid={!!formErrors.numero_approbation} type="text" name="numero_approbation" value={formData.numero_approbation} onChange={handleChange} size="sm"/></Form.Group>
                    <Form.Group as={Col} md={4} controlId="formSession"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Session", "الدورة", true)}</Form.Label><Form.Select className="p-2 rounded-pill shadow-sm" name="session" value={formData.session} onChange={handleChange} isInvalid={!!formErrors.session} size="sm"><option value="">Sélectionner...</option>{[...Array(12).keys()].map(i => <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('fr', { month: 'long' })}</option>)}</Form.Select></Form.Group>
                    <Form.Group as={Col} md={4} controlId="formAnneeAvenant"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Année", "السنة", true)}</Form.Label><Form.Control className="p-2 rounded-pill shadow-sm" isInvalid={!!formErrors.annee_avenant} type="number" name="annee_avenant" value={formData.annee_avenant} onChange={handleChange} size="sm" /></Form.Group>
                </Row>
                
                 <Row className="g-3 mb-3">
                     <Form.Group as={Col} md={4} controlId="formNumero_avenant"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("N° Avenant", "رقم الإضافة", true)}</Form.Label><Form.Control className="p-2 rounded-pill shadow-sm" isInvalid={!!formErrors.numero_avenant} type="text" name="numero_avenant" value={formData.numero_avenant} onChange={handleChange} size="sm" /></Form.Group>
                     <Form.Group as={Col} md={4} controlId="formStatut"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Statut", "الحالة")}</Form.Label><Select name="statut" options={STATUT_OPTIONS} value={formData.statut} onChange={(opt) => handleSelectChange(opt, {name: 'statut'})} styles={selectStyles} placeholder="- Sélectionner -" isClearable /></Form.Group>
                     {formData.statut?.value === 'signé' && ( <Form.Group as={Col} md={4} controlId="formDate_signature"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Date Signature", "تاريخ التوقيع", true)}</Form.Label><Form.Control className="p-2 rounded-pill shadow-sm" type="date" name="date_signature" value={formData.date_signature} onChange={handleChange} size="sm"/></Form.Group> )}
                 </Row>

                <Form.Group as={Row} className="mb-3"><Col><Form.Label className="small fw-medium">{bilingualLabel("Type Modification", "نوع التعديل", true)}</Form.Label><Select name="type_modification" options={TYPE_MODIFICATION_OPTIONS} value={formData.type_modification} onChange={(opt, action) => handleSelectChange(opt, action)} styles={selectStyles} placeholder="- Sélectionner -" isMulti closeMenuOnSelect={false} menuPortalTarget={document.body} /></Col></Form.Group>
                
                {(formData.type_modification?.map(t => t.value) || []).includes('montant') && (
                    <Row className="g-3 mb-3 p-3 border rounded-3 bg-light">
                        <Form.Group as={Col} md={4}><Form.Label className="small">Montant Initial</Form.Label><InputGroup size="sm"><Form.Control value={selectedConventionDetails?.Cout_Global != null ? parseFloat(selectedConventionDetails.Cout_Global).toLocaleString('fr-MA') : 'N/A'} readOnly disabled /><InputGroup.Text>MAD</InputGroup.Text></InputGroup></Form.Group>
                        <Form.Group as={Col} md={4}><Form.Label className="small">{bilingualLabel("Variation", "التغيير", true)}</Form.Label><InputGroup size="sm"><Form.Control isInvalid={!!formErrors.montant_avenant} type="number" step="0.01" name="montant_avenant" value={formData.montant_avenant} onChange={handleChange} /><InputGroup.Text>MAD</InputGroup.Text></InputGroup></Form.Group>
                        <Form.Group as={Col} md={4}><Form.Label className="small">Nouveau Montant</Form.Label><InputGroup size="sm"><Form.Control className="fw-bold" value={formData.montant_modifie !== '' ? parseFloat(formData.montant_modifie).toLocaleString('fr-MA') : ''} readOnly disabled /><InputGroup.Text>MAD</InputGroup.Text></InputGroup></Form.Group>
                    </Row>
                )}
                {(formData.type_modification?.map(t => t.value) || []).includes('durée') && ( <Form.Group as={Row} className="mb-3"><Col md={6}><Form.Label className="small">{bilingualLabel("Nouvelle Date Fin", "تاريخ الانتهاء الجديد", true)}</Form.Label><Form.Control type="date" name="nouvelle_date_fin" value={formData.nouvelle_date_fin} onChange={handleChange} size="sm"/></Col></Form.Group> )}

                {(formData.type_modification?.map(t => t.value) || []).includes('partenaire') && (
                    <Card className="mb-3 shadow-sm">
                        <Card.Header className='py-2'><h6 className='mb-0 fw-bold text-success'><FontAwesomeIcon icon={faHandshake} className="me-2" />Partenaires & Engagements</h6></Card.Header>
                        <Card.Body className="p-3 bg-light">
                            {formErrors.partenaires && <Alert variant="danger" size="sm" className="py-1">{formErrors.partenaires}</Alert>}
                            <PartenaireEngagementManager selectedPartenaires={selectedPartenaires} onPartenairesChange={setSelectedPartenaires} onEngagementsChange={handleEngagementsChange} engagementTypes={engagementTypes} initialEngagements={partnerEngagements} conventionYear={selectedConventionDetails?.Annee_Convention || formData.annee_avenant} conventionDuration={selectedConventionDetails?.duree_convention} conventionCoutGlobal={formData.montant_modifie || selectedConventionDetails?.Cout_Global} baseApiUrl={baseApiUrl} />
                        </Card.Body>
                    </Card>
                )}
                
                <Form.Group className="mb-3"><Form.Label className="small">Objet</Form.Label><Form.Control as="textarea" rows={2} name="objet" value={formData.objet} onChange={handleChange} size="sm" /></Form.Group>
                <Form.Group className="mb-3"><Form.Label className="small">Remarques</Form.Label><Form.Control as="textarea" rows={2} name="remarques" value={formData.remarques} onChange={handleChange} size="sm" /></Form.Group>
                
                <Form.Group as={Row} className="mb-3 align-items-center"><Form.Label column sm={3} className="small text-sm-end"><FontAwesomeIcon icon={faUsers} className="me-1"/> Points Focaux</Form.Label><Col sm={9}><Select name="fonctionnaires" options={fonctionnairesOptions} value={formData.fonctionnaires} onChange={(opt, act) => handleSelectChange(opt, act)} styles={selectStyles} placeholder="- Sélectionner -" isMulti closeMenuOnSelect={false} menuPortalTarget={document.body} /></Col></Form.Group>
                
                <Form.Group as={Row} className="mb-3"><Form.Label column sm={3} className="small text-sm-end">Fichiers</Form.Label><Col sm={9}><Card className="border-dashed"><Card.Body className='p-3'><Button variant="outline-secondary" size="sm" className="mb-2" onClick={() => document.getElementById('file-input')?.click()}><FontAwesomeIcon icon={faPlus} className="me-2"/>Ajouter</Button><Form.Control id="file-input" type="file" multiple onChange={handleFileChange} style={{ display: 'none' }} />{existingFichiers.filter(f => !fichiersToDelete.includes(f.id)).length > 0 && <ListGroup variant="flush" className="mb-2">{existingFichiers.filter(f => !fichiersToDelete.includes(f.id)).map(f => <ListGroup.Item key={f.id} className="d-flex justify-content-between p-2"><span><FontAwesomeIcon icon={getFileIcon(f.file_name)} className="me-2"/>{f.intitule||f.file_name}</span><Button variant="outline-danger" size="sm" onClick={() => removeExistingFile(f.id)}><FontAwesomeIcon icon={faTrashAlt}/></Button></ListGroup.Item>)}</ListGroup>}{fichiers.length > 0 && <ListGroup variant="flush">{fichiers.map((fw, i) => <ListGroup.Item key={i} className="d-flex justify-content-between p-2"><span><FontAwesomeIcon icon={getFileIcon(fw.file.name)} className="me-2"/>{fw.intitule}</span><Button variant="outline-danger" size="sm" onClick={() => removeNewFile(i)}><FontAwesomeIcon icon={faTrashAlt}/></Button></ListGroup.Item>)}</ListGroup>}</Card.Body></Card></Col></Form.Group>

                <Row className="mt-4 pt-3 border-top justify-content-center">
                    <Col xs="auto"><Button variant="secondary" onClick={onClose} className="px-5 rounded-pill" disabled={submissionStatus.loading}>Annuler</Button></Col>
                    <Col xs="auto"><Button type="submit" variant="primary" className="px-5 rounded-pill" disabled={submissionStatus.loading || loadingData}>{submissionStatus.loading ? <><Spinner size="sm" className="me-2"/>Enregistrement...</> : (isEditing ? 'Enregistrer' : 'Ajouter')}</Button></Col>
                </Row>
            </Form>
        </div>
    );
};

AvenantForm.propTypes = { itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), initialConventionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), conventionCode: PropTypes.string, onClose: PropTypes.func.isRequired, onItemCreated: PropTypes.func, onItemUpdated: PropTypes.func, baseApiUrl: PropTypes.string };
AvenantForm.defaultProps = { itemId: null, initialConventionId: null, conventionCode: '', onItemCreated: () => {}, onItemUpdated: () => {}, baseApiUrl: 'http://localhost:8000/api' };

export default AvenantForm;