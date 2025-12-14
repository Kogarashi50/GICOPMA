// src/gestion_contrats_cdc_views/ContratDroitCommunForm.jsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import Select from 'react-select';
import { Form, Button, Row, Col, Spinner, Alert, Card, ListGroup, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPlus, faTrashAlt, faPaperclip, faFileAlt, faPenToSquare,
    faUsers
} from '@fortawesome/free-solid-svg-icons';

const bilingualLabel = (fr, ar, required = false) => (
    <div className="d-flex justify-content-between align-items-center w-100">
        <span>
            {fr}
            {required && <span className="text-danger ms-1">*</span>}
        </span>
        <span className="text-muted" style={{ fontSize: '0.9em', marginRight: '8px' }}>
            {required && <span className="text-danger me-1">*</span>}
            {ar}
        </span>
    </div>
);

// --- Constants ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const STORAGE_URL = process.env.REACT_APP_STORAGE_URL || 'http://localhost:8000';

const TYPE_CONTRAT_OPTIONS = [
    { value: 'Maintenance', label: 'Maintenance' }, { value: 'Prestation de service', label: 'Prestation de service' },
    { value: 'Location', label: 'Location' }, { value: 'Fourniture', label: 'Fourniture' }, { value: 'Autre', label: 'Autre' },
];

// --- Helper: Parse Multi-Select String ---
const findMultiOptions = (options, valuesString, separator = ';') => {
    if (!valuesString || typeof valuesString !== 'string' || !Array.isArray(options) || options.length === 0) return [];
    const selectedValues = valuesString.split(separator).map(v => String(v).trim()).filter(v => v);
    return options.filter(opt => selectedValues.includes(String(opt.value)));
};

// --- react-select Styles ---
const selectStyles = { control: (provided, state) => ({ ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.selectProps.className?.includes('is-invalid') ? '#dc3545' : (state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'), boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', fontSize: '0.875rem', }), valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden', }), input: (provided) => ({ ...provided, margin: '0px', padding: '0px', fontSize: '0.875rem' }), indicatorSeparator: () => ({ display: 'none', }), indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }), placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }), menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }), menuPortal: base => ({ ...base, zIndex: 9999 }), option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }), multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px', }), multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', fontSize: '0.8rem' }), multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white', }, }), };

// --- CSS Class Names ---
const inputClass = 'p-2 mt-1 rounded-pill shadow-sm bg-light border-1';
const selectClass = 'p-2 mt-1 rounded-pill shadow-sm bg-light border-1 form-select';
const textareaClass = 'p-3 mt-1 rounded-4 shadow-sm bg-light border-1';
const buttonCloseClass = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold border-0';

// --- Form Component ---
const ContratDroitCommunForm = ({ itemId, onClose, onItemCreated, onItemUpdated, baseApiUrl = BASE_API_URL }) => {
    const isEditMode = useMemo(() => !!itemId, [itemId]);

    const initialFormData = useMemo(() => ({
        numero_contrat: '', objet: '', fournisseur_nom: '', date_signature: '',
        montant_total: '', duree_contrat: '', type_contrat: '', observations: '',
        fonctionnaires: [],
    }), []);

    const [formData, setFormData] = useState(initialFormData);
    const [existingFichiers, setExistingFichiers] = useState([]);
    const [fichiers, setFichiers] = useState([]); // For new files: [{ file: File, intitule: string }]
    const [fichiersToDelete, setFichiersToDelete] = useState([]);
    const [editingFile, setEditingFile] = useState(null); // State for the modal

    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(isEditMode);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [validationErrors, setValidationErrors] = useState({});
    const fileInputRef = useRef(null);

    // --- Fetch Fonctionnaires List ---
    const fetchFonctionnaires = useCallback(async () => {
        setLoadingOptions(true);
        try {
            const response = await axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true });
            const foncData = response.data.fonctionnaires || response.data || [];
            setFonctionnairesOptions(foncData.map(f => ({ value: f.id, label: f.nom_complet || `ID ${f.id}` })).sort((a, b) => a.label.localeCompare(b.label)));
        } catch (err) {
            console.error("Error loading fonctionnaires options:", err);
            setError("Erreur critique: Impossible de charger la liste des points focaux.");
        } finally {
            setLoadingOptions(false);
        }
    }, [baseApiUrl]);

    useEffect(() => { fetchFonctionnaires(); }, [fetchFonctionnaires]);

    // --- Effect to Fetch Data (Edit Mode) ---
    useEffect(() => {
        if (!isEditMode || !itemId || loadingOptions) return;
        let isMounted = true;
        setIsLoadingData(true);
        setError(null);
        setValidationErrors({});
        const apiEndpoint = `${baseApiUrl}/contrat-droit-commun/${itemId}`;

        axios.get(apiEndpoint, { params: { include: 'fichiers' }, withCredentials: true })
            .then(response => {
                if (!isMounted) return;
                const itemData = response.data?.contrat_droit_commun || response.data || {};
                const matchedFonctionnaires = findMultiOptions(fonctionnairesOptions, itemData.id_fonctionnaire, ';');
                setFormData({
                    numero_contrat: itemData.numero_contrat || '',
                    objet: itemData.objet || '',
                    fournisseur_nom: itemData.fournisseur_nom || '',
                    date_signature: itemData.date_signature ? itemData.date_signature.split(' ')[0] : '',
                    montant_total: itemData.montant_total || '',
                    duree_contrat: itemData.duree_contrat || '',
                    type_contrat: itemData.type_contrat || '',
                    observations: itemData.observations || '',
                    fonctionnaires: matchedFonctionnaires,
                });
                setExistingFichiers((itemData.fichiers || []).map(f => ({ ...f, url: `${STORAGE_URL}/${f.chemin_fichier}` })));
                setFichiers([]);
                setFichiersToDelete([]);
            })
            .catch(err => {
                if (!isMounted) return;
                console.error("[CDC Form] Error fetching data:", err);
                setError(err.response?.data?.message || err.message || "Erreur de chargement des données du contrat.");
            })
            .finally(() => { if (isMounted) setIsLoadingData(false); });
        return () => { isMounted = false; };
    }, [itemId, isEditMode, baseApiUrl, initialFormData, loadingOptions, fonctionnairesOptions]);


    // --- Input Handlers ---
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleFonctionnaireChange = (selectedOptions) => setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] }));

    // --- File Handlers ---
    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files ?? []);
        setFichiers(prev => [...prev, ...newFiles.map(file => ({ file, intitule: file.name.replace(/\.[^/.]+$/, "") }))]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeNewFile = (index) => setFichiers(prev => prev.filter((_, i) => i !== index));
    const removeExistingFile = (id) => setFichiersToDelete(prev => [...prev, id]);

    // --- Form Submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setValidationErrors({});

        const submissionPayload = new FormData();
        // Append standard fields
        Object.entries(formData).forEach(([key, value]) => {
            if (key !== 'fonctionnaires') submissionPayload.append(key, value ?? '');
        });
        submissionPayload.append('id_fonctionnaire', formData.fonctionnaires.map(f => f.value).join(';'));
        submissionPayload.set('montant_total', String(formData.montant_total).replace(',', '.'));

        // Append NEW files with intitules
        fichiers.forEach((fw, index) => {
            submissionPayload.append(`fichiers[${index}]`, fw.file);
            submissionPayload.append(`intitules[${index}]`, fw.intitule);
        });

        // Handle existing files for updates
        if (isEditMode) {
            const visibleFichiers = existingFichiers.filter(f => !fichiersToDelete.includes(f.id));
            const docsMeta = visibleFichiers.map(f => ({ id: f.id, intitule: f.intitule }));
            submissionPayload.append('existing_documents_meta', JSON.stringify(docsMeta));

            fichiersToDelete.forEach(id => submissionPayload.append('fichiers_a_supprimer[]', id));
            submissionPayload.append('_method', 'PUT');
        }

        const url = isEditMode ? `${baseApiUrl}/contrat-droit-commun/${itemId}` : `${baseApiUrl}/contrat-droit-commun`;

        try {
            const config = { headers: { 'Content-Type': 'multipart/form-data' }, withCredentials: true };
            const response = await axios.post(url, submissionPayload, config);
            const responseData = response.data.contrat_droit_commun || response.data;

            if (isEditMode) onItemUpdated(responseData);
            else onItemCreated(responseData);
            onClose();
        } catch (err) {
            const message = err.response?.data?.message || "Une erreur s'est produite.";
            if (err.response && err.response.status === 422) {
                setValidationErrors(err.response.data.errors || {});
                setError("Veuillez corriger les erreurs indiquées.");
            } else {
                setError(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const isSubmitDisabled = isSubmitting || loadingOptions || isLoadingData;
    const visibleExistingFichiers = existingFichiers.filter(f => !fichiersToDelete.includes(f.id));

    if (isLoadingData || loadingOptions) {
        return <div className="text-center p-5"><Spinner animation="border" /> Chargement du formulaire...</div>;
    }

    return (
        <div className='p-3 p-md-4' style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
            {error && <Alert variant="danger">{error}</Alert>}
            
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditMode ? 'Modifier le' : 'Créer un nouveau'}</h5>
                    <h2 className="mb-0 fw-bold">Contrat Droit Commun</h2>
                </div>
                <Button variant="warning" onClick={onClose} size="sm" className={buttonCloseClass}><b>Revenir à la liste</b></Button>
            </div>

            <Form onSubmit={handleSubmit} noValidate className="px-md-3">
                <h5 className="mb-3 mt-2 text-secondary">Détails du Contrat</h5>
                <Row className="g-3">
                    <Form.Group as={Col} md="6"><Form.Label className="w-100">{bilingualLabel("Numéro Contrat", "رقم العقد", true)}</Form.Label><Form.Control type="text" name="numero_contrat" value={formData.numero_contrat} onChange={handleChange} isInvalid={!!validationErrors.numero_contrat} className={inputClass} /><Form.Control.Feedback type="invalid">{validationErrors.numero_contrat?.[0]}</Form.Control.Feedback></Form.Group>
                    <Form.Group as={Col} md="6"><Form.Label className="w-100">{bilingualLabel("Fournisseur", "المورد", true)}</Form.Label><Form.Control type="text" name="fournisseur_nom" value={formData.fournisseur_nom} onChange={handleChange} isInvalid={!!validationErrors.fournisseur_nom} className={inputClass} /><Form.Control.Feedback type="invalid">{validationErrors.fournisseur_nom?.[0]}</Form.Control.Feedback></Form.Group>
                </Row>
                <Form.Group className="my-3"><Form.Label className="w-100">{bilingualLabel("Objet", "الموضوع", true)}</Form.Label><Form.Control as="textarea" rows={2} name="objet" value={formData.objet} onChange={handleChange} isInvalid={!!validationErrors.objet} className={textareaClass} /><Form.Control.Feedback type="invalid">{validationErrors.objet?.[0]}</Form.Control.Feedback></Form.Group>
                <Row className="g-3">
                    <Form.Group as={Col} md="4"><Form.Label className="w-100">{bilingualLabel("Date Signature", "تاريخ التوقيع", true)}</Form.Label><Form.Control type="date" name="date_signature" value={formData.date_signature} onChange={handleChange} isInvalid={!!validationErrors.date_signature} className={inputClass} /><Form.Control.Feedback type="invalid">{validationErrors.date_signature?.[0]}</Form.Control.Feedback></Form.Group>
                    <Form.Group as={Col} md="4"><Form.Label className="w-100">{bilingualLabel("Montant Total TTC", "المبلغ الإجمالي شامل الضريبة", true)}</Form.Label><Form.Control type="number" step="0.01" name="montant_total" value={formData.montant_total} onChange={handleChange} isInvalid={!!validationErrors.montant_total} placeholder="0.00" className={inputClass} /><Form.Control.Feedback type="invalid">{validationErrors.montant_total?.[0]}</Form.Control.Feedback></Form.Group>
                    <Form.Group as={Col} md="4"><Form.Label className="w-100">{bilingualLabel("Durée Contrat", "مدة العقد")}</Form.Label><Form.Control type="text" name="duree_contrat" value={formData.duree_contrat} onChange={handleChange} isInvalid={!!validationErrors.duree_contrat} placeholder="Ex: 12 mois" className={inputClass} /><Form.Control.Feedback type="invalid">{validationErrors.duree_contrat?.[0]}</Form.Control.Feedback></Form.Group>
                </Row>
                <Row className="my-3 g-3">
                    <Form.Group as={Col} md={6}><Form.Label className="w-100"><FontAwesomeIcon icon={faUsers} className="me-1 text-secondary" /> {bilingualLabel("Points Focaux", "النقاط المحورية")}</Form.Label><Select inputId="fonctionnaires" name="fonctionnaires" options={fonctionnairesOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} placeholder="Sélectionner..." isClearable isMulti closeMenuOnSelect={false} styles={selectStyles} className={validationErrors.id_fonctionnaire ? 'is-invalid' : ''} menuPortalTarget={document.body} /></Form.Group>
                    <Form.Group as={Col} md="6"><Form.Label className="w-100">{bilingualLabel("Type Contrat", "نوع العقد")}</Form.Label><Form.Select name="type_contrat" value={formData.type_contrat} onChange={handleChange} isInvalid={!!validationErrors.type_contrat} className={selectClass}><option value="">-- Sélectionner --</option>{TYPE_CONTRAT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</Form.Select><Form.Control.Feedback type="invalid">{validationErrors.type_contrat?.[0]}</Form.Control.Feedback></Form.Group>
                </Row>
                <Form.Group className="mb-3"><Form.Label className="w-100">{bilingualLabel("Observations", "الملاحظات")}</Form.Label><Form.Control as="textarea" rows={2} name="observations" value={formData.observations} onChange={handleChange} className={textareaClass} /></Form.Group>

                <h5 className="mt-4 mb-3 text-secondary">Fichiers Joints</h5>
                <Card className="border-dashed my-3">
                    <Card.Body className='p-3'>
                        <div className='mb-3 d-flex align-items-center'>
                            <Button variant="outline-warning" size="sm" className="me-3 rounded-pill px-3" onClick={() => fileInputRef.current?.click()} title="Sélectionner des fichiers"><FontAwesomeIcon icon={faPlus} className="me-1" /> Ajouter</Button>
                            <span className='text-muted fst-italic'>Ajouter un ou plusieurs fichiers</span>
                            <Form.Control ref={fileInputRef} className='d-none' type="file" multiple onChange={handleFileChange} isInvalid={!!validationErrors.fichiers} />
                            {validationErrors.fichiers && (<div className="d-block invalid-feedback mt-1 ms-1">{validationErrors.fichiers}</div>)}
                        </div>
                        <ListGroup variant="flush">
                            {visibleExistingFichiers.map((file, index) => (
                                <ListGroup.Item key={`existing-${file.id}`} className="d-flex justify-content-between align-items-center p-2">
                                    <span className="text-truncate" title={file.nom_fichier}><FontAwesomeIcon icon={faFileAlt} className="me-2 text-info" /><a href={file.url} target="_blank" rel="noopener noreferrer">{file.intitule || file.nom_fichier}</a></span>
                                    <div>
                                        <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => setEditingFile({ isExisting: true, data: { ...file }, index })}><FontAwesomeIcon icon={faPenToSquare} /></Button>
                                        <Button variant="outline-danger" size="sm" onClick={() => removeExistingFile(file.id)}><FontAwesomeIcon icon={faTrashAlt} /></Button>
                                    </div>
                                </ListGroup.Item>
                            ))}
                            {fichiers.map((fw, index) => (
                                <ListGroup.Item key={`new-${index}`} className="d-flex justify-content-between align-items-center p-2">
                                    <span className="text-truncate text-success" title={fw.file.name}><FontAwesomeIcon icon={faFileAlt} className="me-2" />{fw.intitule || fw.file.name}</span>
                                    <div>
                                        <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => setEditingFile({ isExisting: false, data: { ...fw }, index })}><FontAwesomeIcon icon={faPenToSquare} /></Button>
                                        <Button variant="outline-danger" size="sm" onClick={() => removeNewFile(index)}><FontAwesomeIcon icon={faTrashAlt} /></Button>
                                    </div>
                                </ListGroup.Item>
                            ))}
                            {visibleExistingFichiers.length === 0 && fichiers.length === 0 && (<div className="text-center text-muted p-3">Aucun fichier joint.</div>)}
                        </ListGroup>
                    </Card.Body>
                </Card>

                <Row className="mt-4 pt-3 border-top justify-content-center">
                    <Col xs="auto"><Button onClick={onClose} variant="danger" className="btn px-5 rounded-pill shadow-sm" disabled={isSubmitting}>Annuler</Button></Col>
                    <Col xs="auto"><Button type="submit" variant="primary" className="btn px-5 rounded-pill shadow-sm" disabled={isSubmitDisabled}>{isSubmitting ? <><Spinner as="span" animation="border" size="sm" className="me-2" /> Sauvegarde...</> : (isEditMode ? 'Enregistrer' : 'Créer')}</Button></Col>
                </Row>
            </Form>

            <Modal show={!!editingFile} onHide={() => setEditingFile(null)} centered>
                <Modal.Header closeButton><Modal.Title>Modifier l'intitulé du fichier</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="text-muted text-truncate">Fichier: {editingFile?.data?.nom_fichier || editingFile?.data?.file?.name}</p>
                    <Form.Group>
                        <Form.Label>Intitulé</Form.Label>
                        <Form.Control type="text" value={editingFile?.data?.intitule || ''} onChange={(e) => setEditingFile(prev => ({ ...prev, data: { ...prev.data, intitule: e.target.value } }))} autoFocus />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setEditingFile(null)}>Annuler</Button>
                    <Button variant="primary" onClick={() => {
                        if (!editingFile) return;
                        const { index, data, isExisting } = editingFile;
                        if (isExisting) {
                            setExistingFichiers(prev => prev.map(f => f.id === data.id ? { ...f, intitule: data.intitule } : f));
                        } else {
                            setFichiers(prev => prev.map((fw, i) => i === index ? { ...fw, intitule: data.intitule } : fw));
                        }
                        setEditingFile(null);
                    }}>Enregistrer</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

ContratDroitCommunForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};

export default ContratDroitCommunForm;