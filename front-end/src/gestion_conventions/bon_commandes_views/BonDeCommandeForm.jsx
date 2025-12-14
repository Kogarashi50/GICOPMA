// src/gestion_conventions/bons_de_commande_views/BonDeCommandeForm.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import Select from 'react-select';
import { Form, Button, Row, Col, Alert, Spinner, Card, Stack, Badge, Modal, ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faTrashAlt, faFileAlt, faPaperclip, faPlus,
    faUsers, faUserTie, faTimes, faPenToSquare
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

// --- Styles and CSS Classes (Restored) ---
const selectStyles = { control: (provided, state) => ({ ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.selectProps.className?.includes('is-invalid') ? '#dc3545' : (state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'), boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', fontSize: '0.875rem', }), valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden', }), input: (provided) => ({ ...provided, margin: '0px', padding: '0px', fontSize: '0.875rem' }), indicatorSeparator: () => ({ display: 'none', }), indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }), placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }), menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }), menuPortal: base => ({ ...base, zIndex: 9999 }), option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, color: state.isSelected ? 'white' : 'black', fontSize: '0.875rem', padding: '0.5rem 1rem' }), multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px', }), multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', fontSize: '0.8rem' }), multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white', }, }), noOptionsMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }), loadingMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),};
const FORM_CONTAINER_CLASS = "p-3 p-md-4 bc-form-container";
const FORM_CONTROL_CLASS = "p-2 mt-1 rounded-pill shadow-sm bg-light border-1";
const FORM_SELECT_CLASS = "p-2 mt-1 rounded-pill shadow-sm bg-light border-1";
const FORM_TEXTAREA_CLASS = "p-3 mt-1 rounded-4 shadow-sm bg-light border-1";
const FORM_ACTIONS_ROW_CLASS = "mt-4 pt-3 border-top justify-content-center flex-shrink-0";
const FORM_CANCEL_BUTTON_CLASS = "btn px-5 rounded-pill shadow-sm";
const FORM_SUBMIT_BUTTON_CLASS = "btn px-5 rounded-pill align-items-center d-flex justify-content-center shadow-sm";
const FORM_HEADER_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold border-0';

// --- Helpers & Constants ---
const STORAGE_URL = process.env.REACT_APP_STORAGE_URL || 'http://localhost:8000';

const etatOptions = [
    { value: 'en préparation', label: 'En préparation' }, { value: 'validé', label: 'Validé' },
    { value: 'envoyé', label: 'Envoyé' }, { value: 'reçu', label: 'Reçu' }, { value: 'annulé', label: 'Annulé' },
];
// --- End Helpers & Constants ---

const BonDeCommandeForm = ({ itemId = null, onClose, onItemCreated, onItemUpdated, baseApiUrl }) => {
    const isEditing = useMemo(() => itemId !== null, [itemId]);

    const initialState = useMemo(() => ({
        numero_bc: '', date_emission: '', objet: '', montant_total: '',
        fournisseur_nom: '', etat: 'en préparation',
        marche: null, contrat: null, fonctionnaires: [],
    }), []);

    const [formData, setFormData] = useState(initialState);
    const [existingFichiers, setExistingFichiers] = useState([]);
    const [fichiers, setFichiers] = useState([]); // For new files: [{ file: File, intitule: string }]
    const [fichiersToDelete, setFichiersToDelete] = useState([]);

    const [marcheOptions, setMarcheOptions] = useState([]);
    const [contratOptions, setContratOptions] = useState([]);
    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(true);
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(isEditing);
    const fileInputRef = useRef(null);
    const [editingFile, setEditingFile] = useState(null); // State for the modal

    // --- Fetch Options ---
    const fetchAllOptions = useCallback(async () => {
        setLoadingOptions(true);
        try {
            const [marcheRes, contratRes, foncRes] = await Promise.all([
                axios.get(`${baseApiUrl}/options/marches-publics`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/contrat-droit-commun`, { params: { per_page: 1000 }, withCredentials: true }),
                axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true })
            ]);

            setMarcheOptions((marcheRes.data || []).sort((a,b) => String(a.label || '').localeCompare(String(b.label || ''))));
            const contrats = contratRes.data.contrats || contratRes.data.data || [];
            setContratOptions(contrats.map(c => ({ value: c.id, label: `${c.numero_contrat || c.objet || `ID: ${c.id}`}` })).sort((a,b) => String(a.label || '').localeCompare(String(b.label || ''))));
            const foncs = (foncRes.data.fonctionnaires || []).filter(f => f.id && (f.nom_complet || f.Nom_Fonctionnaire));
            setFonctionnairesOptions(foncs.map(f => ({ value: f.id, label: f.nom_complet || f.Nom_Fonctionnaire })).sort((a,b) => String(a.label || '').localeCompare(String(b.label || ''))));
        } catch (err) {
            console.error("[BC FORM] Error fetching options:", err);
            setSubmissionStatus(prev => ({ ...prev, error: "Erreur critique lors du chargement des listes." }));
        } finally {
            setLoadingOptions(false);
        }
    }, [baseApiUrl]);

    useEffect(() => { fetchAllOptions(); }, [fetchAllOptions]);

    // --- Fetch Data for Editing ---
    useEffect(() => {
        if (!isEditing || !itemId || loadingOptions) return;
        let isMounted = true;
        setLoadingData(true);
        axios.get(`${baseApiUrl}/bon-de-commande/${itemId}`, { withCredentials: true })
            .then(response => {
                if (!isMounted) return;
                const data = response.data.bon_de_commande;
                const findOption = (options, value) => options.find(opt => String(opt.value) === String(value)) || null;
                const findMulti = (options, valuesStr) => {
                    if (!valuesStr) return [];
                    const ids = String(valuesStr).split(';').map(v => v.trim());
                    return options.filter(opt => ids.includes(String(opt.value)));
                };
                setFormData({
                    numero_bc: data.numero_bc ?? '',
                    date_emission: data.date_emission?.split('T')[0] ?? '',
                    objet: data.objet ?? '',
                    montant_total: data.montant_total ?? '',
                    fournisseur_nom: data.fournisseur_nom ?? '',
                    etat: data.etat ?? 'en préparation',
                    marche: findOption(marcheOptions, data.marche_id),
                    contrat: findOption(contratOptions, data.contrat_id),
                    fonctionnaires: findMulti(fonctionnairesOptions, data.id_fonctionnaire),
                });
                setExistingFichiers((data.fichiers || []).map(f => ({ ...f, url: `${STORAGE_URL}/${f.chemin_fichier}` })));
                setFichiers([]);
                setFichiersToDelete([]);
            })
            .catch(err => console.error("[BC FORM EDIT] Error loading data:", err))
            .finally(() => { if (isMounted) setLoadingData(false); });
        return () => { isMounted = false; };
    }, [itemId, isEditing, loadingOptions, baseApiUrl, marcheOptions, contratOptions, fonctionnairesOptions]);


    // --- Form Handlers ---
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSelectChange = (name, opt) => setFormData(prev => ({ ...prev, [name]: opt }));
    const handleFonctionnaireChange = (opts) => setFormData(prev => ({ ...prev, fonctionnaires: opts || [] }));

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files ?? []);
        setFichiers(prev => [
            ...prev,
            ...newFiles.map(file => ({ file, intitule: file.name.replace(/\.[^/.]+$/, "") }))
        ]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeNewFile = (index) => setFichiers(prev => prev.filter((_, i) => i !== index));
    const removeExistingFile = (id) => setFichiersToDelete(prev => [...prev, id]);

    // --- Form Submission ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmissionStatus({ loading: true, error: null, success: false });
        setFormErrors({});

        const dataToSubmit = new FormData();
        dataToSubmit.append('numero_bc', formData.numero_bc);
        dataToSubmit.append('date_emission', formData.date_emission);
        dataToSubmit.append('objet', formData.objet);
        dataToSubmit.append('montant_total', String(formData.montant_total).replace(',', '.'));
        dataToSubmit.append('fournisseur_nom', formData.fournisseur_nom);
        dataToSubmit.append('etat', formData.etat);
        dataToSubmit.append('marche_id', formData.marche?.value || '');
        dataToSubmit.append('contrat_id', formData.contrat?.value || '');
        dataToSubmit.append('id_fonctionnaire', formData.fonctionnaires.map(f => f.value).join(';'));

        fichiers.forEach((fw, index) => {
            dataToSubmit.append(`fichiers[${index}]`, fw.file);
            dataToSubmit.append(`intitules[${index}]`, fw.intitule);
        });

        if (isEditing) {
            const visibleFichiers = existingFichiers.filter(f => !fichiersToDelete.includes(f.id));
            const docsMeta = visibleFichiers.map(f => ({ id: f.id, intitule: f.intitule }));
            dataToSubmit.append('existing_documents_meta', JSON.stringify(docsMeta));

            fichiersToDelete.forEach(id => {
                dataToSubmit.append('fichiers_a_supprimer[]', id);
            });
            dataToSubmit.append('_method', 'PUT');
        }

        const url = isEditing ? `${baseApiUrl}/bon-de-commande/${itemId}` : `${baseApiUrl}/bon-de-commande`;

        try {
            const response = await axios.post(url, dataToSubmit, { withCredentials: true });
            setSubmissionStatus({ loading: false, error: null, success: true });
            const responseData = response.data.bon_de_commande;
            if (isEditing) onItemUpdated(responseData);
            else onItemCreated(responseData);
            setTimeout(onClose, 1500);
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Une erreur s'est produite.";
            const serverErrors = err.response?.data?.errors || {};
            setFormErrors(serverErrors);
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };
    
    const isSubmitDisabled = submissionStatus.loading || loadingOptions || loadingData;
    const visibleExistingFichiers = existingFichiers.filter(f => !fichiersToDelete.includes(f.id));

    if (loadingData || loadingOptions) {
        return (
            <div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '400px' }}>
                <Spinner animation="border" variant="primary" />
                <span className='ms-3 text-muted'>Chargement du formulaire...</span>
            </div>
        );
    }
    
    return (
        <div className={FORM_CONTAINER_CLASS} style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0 border-bottom pb-3">
                <div>
                    <h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5>
                    <h2 className="mb-0 fw-bold">Bon de Commande</h2>
                </div>
                <Button variant="warning" className={FORM_HEADER_CLOSE_BUTTON_CLASS} onClick={onClose} size="sm">Revenir à la liste</Button>
            </div>
            <div className="flex-grow-1 px-md-3">
                {submissionStatus.error && ( <Alert variant="danger" className="mb-3 py-2"> <FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error} </Alert> )}
                {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2"> Bon de Commande {isEditing ? 'modifié' : 'créé'} avec succès ! </Alert> )}
                
                <Form noValidate onSubmit={handleSubmit}>
                    <Row className="mb-4 g-3">
                        <Col md={6}><Form.Group controlId="formNumeroBc"><Form.Label className=" mb-1 fw-medium w-100">{bilingualLabel("Numéro BC", "رقم أمر الشراء", true)}</Form.Label><Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.numero_bc} required type="text" name="numero_bc" value={formData.numero_bc} onChange={handleChange} size="sm" /><Form.Control.Feedback type="invalid">{formErrors.numero_bc}</Form.Control.Feedback></Form.Group></Col>
                        <Col md={6}><Form.Group controlId="formDateEmission"><Form.Label className=" mb-1 fw-medium w-100">{bilingualLabel("Date Émission", "تاريخ الإصدار", true)}</Form.Label><Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.date_emission} required type="date" name="date_emission" value={formData.date_emission} onChange={handleChange} size="sm" /><Form.Control.Feedback type="invalid">{formErrors.date_emission}</Form.Control.Feedback></Form.Group></Col>
                    </Row>
                    <Form.Group controlId="formObjet" className="mb-4"><Form.Label className=" mb-1 fw-medium w-100">{bilingualLabel("Objet", "الموضوع", true)}</Form.Label><Form.Control as="textarea" rows={2} className={FORM_TEXTAREA_CLASS} isInvalid={!!formErrors.objet} required name="objet" value={formData.objet} onChange={handleChange} size="sm" /><Form.Control.Feedback type="invalid">{formErrors.objet}</Form.Control.Feedback></Form.Group>
                    <Row className="mb-4 g-3 ">
                        <Col md={4}><Form.Group controlId="formFournisseurNom"><Form.Label className=" mb-1 fw-medium w-100">{bilingualLabel("Fournisseur", "المورد", true)}</Form.Label><Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.fournisseur_nom} required type="text" name="fournisseur_nom" value={formData.fournisseur_nom} onChange={handleChange} size="sm" /><Form.Control.Feedback type="invalid">{formErrors.fournisseur_nom}</Form.Control.Feedback></Form.Group></Col>
                        <Col md={4}><Form.Group controlId="formMontantTotal"><Form.Label className=" mb-1 fw-medium w-100">{bilingualLabel("Montant Total TTC", "المبلغ الإجمالي شامل الضريبة", true)}</Form.Label><Form.Control className={FORM_CONTROL_CLASS} isInvalid={!!formErrors.montant_total} required type="number" step="0.01" min="0" name="montant_total" value={formData.montant_total} onChange={handleChange} size="sm" placeholder="0.00" /><Form.Control.Feedback type="invalid">{formErrors.montant_total}</Form.Control.Feedback></Form.Group></Col>
                        <Col md={4}><Form.Group controlId="formEtatBC"><Form.Label className=" mb-1 fw-medium w-100">{bilingualLabel("État", "الحالة")}</Form.Label><Form.Select className={FORM_SELECT_CLASS} name="etat" value={formData.etat} onChange={handleChange} isInvalid={!!formErrors.etat}><option value="">Sélectionner...</option>{etatOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</Form.Select></Form.Group></Col>

                    </Row>
                    <Row className="mb-4 g-3">
                        <Col md={6}><Form.Group controlId="formMarcheBC"><Form.Label className=" mb-1 fw-medium w-100">{bilingualLabel("Marché Associé", "السوق المرتبط")}</Form.Label><Select inputId="marche_bc_select" name="marche" options={marcheOptions} value={formData.marche} onChange={(opt) => handleSelectChange('marche', opt)} styles={selectStyles} placeholder="- Sélectionner -" isClearable classNamePrefix="react-select" className={formErrors.marche_id ? 'is-invalid' : ''} menuPortalTarget={document.body}/></Form.Group></Col>
                        <Col md={6}><Form.Group controlId="formContratBC"><Form.Label className=" mb-1 fw-medium w-100">{bilingualLabel("Contrat Associé", "العقد المرتبط")}</Form.Label><Select inputId="contrat_bc_select" name="contrat" options={contratOptions} value={formData.contrat} onChange={(opt) => handleSelectChange('contrat', opt)} styles={selectStyles} placeholder="- Sélectionner -" isClearable classNamePrefix="react-select" className={formErrors.contrat_id ? 'is-invalid' : ''} menuPortalTarget={document.body}/></Form.Group></Col>
                    </Row>
                    <Form.Group controlId="formFonctionnaireBC" className="my-3"><Form.Label className=" mb-1 fw-medium w-100"><FontAwesomeIcon icon={faUsers} className="me-2 text-secondary" /> {bilingualLabel("Points Focaux", "النقاط المحورية")}</Form.Label><Select inputId="fonctionnaires_bc_select" name="fonctionnaires" options={fonctionnairesOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder="Sélectionner (Optionnel)..." isClearable isMulti closeMenuOnSelect={false} className={formErrors.id_fonctionnaire ? 'is-invalid' : ''} menuPortalTarget={document.body}/></Form.Group>
                    
                    
                    <Card className="border-dashed my-3">
                        <Card.Body className='p-3'>
                            <div className='mb-3 d-flex align-items-center'>
                                <Button variant="outline-warning" size="sm" className="me-3 rounded-pill px-3" onClick={() => fileInputRef.current?.click()} title="Sélectionner des fichiers">
                                    <FontAwesomeIcon icon={faPlus} className="me-1" /> Ajouter
                                </Button>
                                <span className=' text-muted fst-italic'>Ajouter un ou plusieurs fichiers</span>
                                <Form.Control ref={fileInputRef} id="bonCommandeFileInputBC" className='d-none' type="file" multiple onChange={handleFileChange} isInvalid={!!formErrors.fichiers} />
                                {formErrors.fichiers && (<div className="d-block invalid-feedback  mt-1 ms-1">{formErrors.fichiers}</div> )}
                            </div>
                            
                            <ListGroup variant="flush">
                                {visibleExistingFichiers.map((file, index) => (
                                    <ListGroup.Item key={`existing-${file.id}`} className="d-flex justify-content-between align-items-center p-2">
                                        <span className="text-truncate" title={file.nom_fichier}>
                                            <FontAwesomeIcon icon={faFileAlt} className="me-2 text-info"/>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer">{file.intitule || file.nom_fichier}</a>
                                        </span>
                                        <div>
                                            <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => setEditingFile({ isExisting: true, data: { ...file }, index })}>
                                                <FontAwesomeIcon icon={faPenToSquare} />
                                            </Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => removeExistingFile(file.id)}>
                                                <FontAwesomeIcon icon={faTrashAlt} />
                                            </Button>
                                        </div>
                                    </ListGroup.Item>
                                ))}
                                {fichiers.map((fw, index) => (
                                     <ListGroup.Item key={`new-${index}`} className="d-flex justify-content-between align-items-center p-2">
                                        <span className="text-truncate text-success" title={fw.file.name}>
                                            <FontAwesomeIcon icon={faFileAlt} className="me-2"/>
                                            {fw.intitule || fw.file.name}
                                        </span>
                                        <div>
                                            <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => setEditingFile({ isExisting: false, data: { ...fw }, index })}>
                                                <FontAwesomeIcon icon={faPenToSquare} />
                                            </Button>
                                            <Button variant="outline-danger" size="sm" onClick={() => removeNewFile(index)}>
                                                <FontAwesomeIcon icon={faTrashAlt} />
                                            </Button>
                                        </div>
                                    </ListGroup.Item>
                                ))}
                                {visibleExistingFichiers.length === 0 && fichiers.length === 0 && (
                                    <div className="text-center text-muted  p-3">Aucun fichier joint.</div>
                                )}
                            </ListGroup>
                        </Card.Body>
                    </Card>

                    <Row className={FORM_ACTIONS_ROW_CLASS}>
                        <Col xs="auto"><Button onClick={onClose} variant="danger" className={FORM_CANCEL_BUTTON_CLASS} disabled={submissionStatus.loading}>Annuler</Button></Col>
                        <Col xs="auto"><Button type="submit" variant="primary" className={FORM_SUBMIT_BUTTON_CLASS} disabled={isSubmitDisabled}> {submissionStatus.loading ? <><Spinner as="span" animation="border" size="sm" className="me-2"/> Sauvegarde...</> : (isEditing ? 'Enregistrer' : 'Créer')} </Button></Col>
                    </Row>
                </Form>
            </div>
            
            <Modal show={!!editingFile} onHide={() => setEditingFile(null)} centered>
                <Modal.Header closeButton><Modal.Title>Modifier l'intitulé du fichier</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="text-muted  text-truncate">Fichier: {editingFile?.data?.nom_fichier || editingFile?.data?.file?.name}</p>
                    <Form.Group>
                        <Form.Label>Intitulé</Form.Label>
                        <Form.Control type="text" value={editingFile?.data?.intitule || ''} onChange={(e) => setEditingFile(prev => ({ ...prev, data: { ...prev.data, intitule: e.target.value } }))} autoFocus/>
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

BonDeCommandeForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};

BonDeCommandeForm.defaultProps = {
    itemId: null,
    onItemCreated: () => {},
    onItemUpdated: () => {},
    baseApiUrl: 'http://localhost:8000/api',
};

export default BonDeCommandeForm;