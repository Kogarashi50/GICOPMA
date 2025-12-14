import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { Form, Button, Row, Col, Spinner, Alert, Badge, Stack, Modal } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheckCircle, faUpload, faPaperclip } from '@fortawesome/free-solid-svg-icons';

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

const ObservationForm = ({ itemId, onSuccess, onCancel, baseApiUrl }) => {
    const isEditing = !!itemId;

    const [formData, setFormData] = useState({
        id_fonctionnaire: '',
        observation: '',
        date_observation: new Date().toISOString().slice(0, 10),
    });

    const [fonctionnairesOptions, setFonctionnairesOptions] = useState([]);

    // --- State for Multi-File Handling ---
    const [newFiles, setNewFiles] = useState([]); // Array of { file: File, intitule: string }
    const [existingFiles, setExistingFiles] = useState([]); // Array of file objects from server
    const [filesToDelete, setFilesToDelete] = useState([]); // Array of file paths to delete
    const [editingFile, setEditingFile] = useState(null); // State for the edit metadata modal

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            setError('');
            try {
                const optionsPromise = axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true });

                if (isEditing) {
                    const itemPromise = axios.get(`${baseApiUrl}/observations/${itemId}`, { withCredentials: true });
                    const [optionsResponse, itemResponse] = await Promise.all([optionsPromise, itemPromise]);

                    const options = (optionsResponse.data.fonctionnaires || []).map(f => ({ value: f.id, label: f.nom_complet }));
                    setFonctionnairesOptions(options);

                    const data = itemResponse.data;
                    setFormData({
                        id_fonctionnaire: data.id_fonctionnaire,
                        observation: data.observation,
                        date_observation: new Date(data.date_observation).toISOString().split('T')[0],
                    });
                    
                    // The API now returns a 'fichiers' array from the JSON column
                    setExistingFiles(data.fichiers || []);
                    setNewFiles([]);
                    setFilesToDelete([]);

                } else {
                    const optionsResponse = await optionsPromise;
                    const options = (optionsResponse.data.fonctionnaires || []).map(f => ({ value: f.id, label: f.nom_complet }));
                    setFonctionnairesOptions(options);
                    // Reset file states for a new form
                    setExistingFiles([]);
                    setNewFiles([]);
                    setFilesToDelete([]);
                }
            } catch (err) {
                setError('Impossible de charger les données nécessaires.');
                console.error("Data loading failed:", err);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, [itemId, isEditing, baseApiUrl]);

    // --- Standard Input Handlers ---
    const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSelectChange = (opt) => setFormData(prev => ({ ...prev, id_fonctionnaire: opt ? opt.value : '' }));

    // --- File Management Handlers ---
    const handleFileChange = useCallback((e) => {
        const filesToAdd = Array.from(e.target.files).map(file => ({
            file,
            intitule: file.name.replace(/\.[^/.]+$/, "") // Default title is filename without extension
        }));
        setNewFiles(prev => [...prev, ...filesToAdd]);
        e.target.value = null; // Reset input to allow re-selecting the same file
    }, []);

    const removeNewFile = useCallback((index) => setNewFiles(prev => prev.filter((_, i) => i !== index)), []);

    const markExistingFileForDeletion = useCallback((filePath) => {
        setExistingFiles(prev => prev.filter(f => f.chemin_fichier !== filePath));
        setFilesToDelete(prev => [...prev, filePath]);
    }, []);

    // Handlers for the "edit file title" modal
    const openFileEditModal = (fileData, index, isExisting) => setEditingFile({ isExisting, data: { ...fileData }, location: { index } });
    const handleEditingFileChange = (field, value) => setEditingFile(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
    const handleSaveFileMetadata = () => {
        if (!editingFile) return;
        const { index } = editingFile.location;
        const updatedFileData = editingFile.data;
        if (editingFile.isExisting) {
            setExistingFiles(prev => prev.map((file, i) => (i === index ? updatedFileData : file)));
        } else {
            setNewFiles(prev => prev.map((fw, i) => (i === index ? { ...fw, intitule: updatedFileData.intitule } : fw)));
        }
        setEditingFile(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSuccess('');

        const submissionData = new FormData();
        Object.keys(formData).forEach(key => submissionData.append(key, formData[key] || ''));

        // Append new files and their user-defined titles
        newFiles.forEach((fw) => {
            submissionData.append('files[]', fw.file);
            submissionData.append('intitules[]', fw.intitule);
        });

        if (isEditing) {
            submissionData.append('_method', 'PUT');
            // Send the array of file paths to be deleted
            submissionData.append('fichiers_a_supprimer', JSON.stringify(filesToDelete));
            // Send the metadata of remaining existing files to handle title changes
            const updatedExistingFiles = existingFiles.map(f => ({
                chemin_fichier: f.chemin_fichier, // Identify file by its unique path
                intitule: f.intitule
            }));
            submissionData.append('fichiers_existants_meta', JSON.stringify(updatedExistingFiles));
        }

        const url = isEditing ? `${baseApiUrl}/observations/${itemId}` : `${baseApiUrl}/observations`;

        try {
            // Using POST for both create and update (with _method override) is standard for FormData
            await axios.post(url, submissionData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                withCredentials: true,
            });
            setSuccess(isEditing ? 'Observation mise à jour!' : 'Observation créée!');
            if (onSuccess) setTimeout(onSuccess, 1500);
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Une erreur est survenue lors de la soumission.';
            setError(errorMsg);
            console.error("Submission failed:", err.response?.data || err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="text-center p-5"><Spinner animation="border" /> <p>Chargement des données...</p></div>;
    if (success) return <div className="text-center p-5"><FontAwesomeIcon icon={faCheckCircle} size="3x" className="text-success mb-3" /><h4>Succès!</h4><p>{success}</p></div>;

    return (
        <>
            <Form onSubmit={handleSubmit} noValidate>
                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                
                <Form.Group controlId="id_fonctionnaire" className="mb-3">
                    <Form.Label className="w-100">{bilingualLabel("Fonctionnaire", "الموظف")}</Form.Label>
                    <Select options={fonctionnairesOptions} value={fonctionnairesOptions.find(o => o.value === formData.id_fonctionnaire) || null} onChange={handleSelectChange} placeholder="Sélectionnez un fonctionnaire..." isClearable required />
                </Form.Group>
                
                <Form.Group controlId="observation" className="mb-3">
                    <Form.Label className="w-100">{bilingualLabel("Contenu de l'observation", "محتوى الملاحظة")}</Form.Label>
                    <Form.Control as="textarea" rows={5} name="observation" value={formData.observation} onChange={handleInputChange} required />
                </Form.Group>
                
                <Row>
                    <Col md={6} className="mb-3">
                        <Form.Group controlId="date_observation">
                            <Form.Label className="w-100">{bilingualLabel("Date d'Observation", "تاريخ الملاحظة")}</Form.Label>
                            <Form.Control type="date" name="date_observation" value={formData.date_observation} onChange={handleInputChange} required />
                        </Form.Group>
                    </Col>
                    <Col md={6} className="mb-3">
                        <Form.Group>
                            <Form.Label className="w-100"><FontAwesomeIcon icon={faPaperclip} className="me-1"/> {bilingualLabel("Fichiers Joints", "الملفات المرفقة")}</Form.Label>
                            <div className="border p-2 rounded bg-light" style={{minHeight: '76px'}}>
                                <Stack direction="horizontal" gap={2} className="flex-wrap">
                                    {existingFiles.map((file, index) => (
                                       <Badge as={Button} variant="info" pill bg="info" text="dark" className="d-flex align-items-center p-2 fw-normal" key={file.chemin_fichier} onClick={() => openFileEditModal(file, index, true)} title={`Modifier l'intitulé de : ${file.intitule}`}>
                                           <span className='me-2 text-truncate'>{file.intitule || file.nom_fichier}</span>
                                           <Button variant="close" size="sm" aria-label="Supprimer" onClick={(e) => { e.stopPropagation(); markExistingFileForDeletion(file.chemin_fichier); }}/>
                                       </Badge>
                                    ))}
                                    {newFiles.map((fw, index) => (
                                       <Badge as={Button} variant="success" pill bg="success" className="d-flex align-items-center p-2 fw-normal" key={index} onClick={() => openFileEditModal(fw, index, false)} title={`Modifier l'intitulé de : ${fw.intitule}`}>
                                           <span className='me-2 text-truncate'>{fw.intitule}</span>
                                           <Button variant="close" className="btn-close-white" size="sm" aria-label="Retirer" onClick={(e) => { e.stopPropagation(); removeNewFile(index); }}/>
                                       </Badge>
                                    ))}
                                </Stack>
                                <Form.Control id="obs-file-input" type="file" multiple onChange={handleFileChange} className="d-none" disabled={isSubmitting} />
                                <Button variant="outline-primary" size="sm" className="rounded-pill mt-2" onClick={() => document.getElementById('obs-file-input')?.click()} disabled={isSubmitting}>
                                    <FontAwesomeIcon icon={faUpload} className="me-2"/> Ajouter des fichiers...
                                </Button>
                            </div>
                        </Form.Group>
                    </Col>
                </Row>
                
                <div className="d-flex justify-content-end gap-2 mt-4">
                    <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>Annuler</Button>
                    <Button variant="primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <><FontAwesomeIcon icon={faSpinner} spin className="me-2" />Enregistrement...</> : (isEditing ? 'Enregistrer les modifications' : "Créer l'observation")}
                    </Button>
                </div>
            </Form>
            
            <Modal show={!!editingFile} onHide={() => setEditingFile(null)} centered>
                <Modal.Header closeButton><Modal.Title>Modifier l'intitulé du fichier</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p className="text-muted small text-truncate">Fichier: {editingFile?.data.nom_fichier || editingFile?.data.file?.name}</p>
                    <Form.Group>
                        <Form.Label className="w-100">{bilingualLabel("Intitulé du document", "عنوان المستند")}</Form.Label>
                        <Form.Control type="text" value={editingFile?.data.intitule || ''} onChange={(e) => handleEditingFileChange('intitule', e.target.value)} autoFocus />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setEditingFile(null)}>Annuler</Button>
                    <Button variant="primary" onClick={handleSaveFileMetadata}>Enregistrer</Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ObservationForm;