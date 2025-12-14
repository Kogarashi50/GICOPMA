// src/pages/sousprojets_views/SousProjetForm.jsx (Final Merged & Simplified Version)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faExclamationTriangle, faUsers } from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import { Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';

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

// --- Styles & Classes ---
const selectStyles = {
    control: (provided, state) => ({ ...provided, backgroundColor: '#f8f9fa', borderRadius: '1.5rem', border: state.selectProps.className?.includes('is-invalid') ? '#dc3545' : (state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da'), boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', minHeight: '38px', fontSize: '0.875rem', }),
    valueContainer: (provided) => ({ ...provided, padding: '0.25rem 0.8rem', flexWrap: 'wrap', maxWidth: '100%', overflow: 'hidden', }),
    input: (provided) => ({ ...provided, margin: '0px', padding: '0px', fontSize: '0.875rem' }),
    indicatorSeparator: () => ({ display: 'none', }),
    indicatorsContainer: (provided) => ({ ...provided, padding: '1px', height: '36px' }),
    placeholder: (provided) => ({ ...provided, color: '#6c757d', fontSize: '0.875rem' }),
    menu: (provided) => ({ ...provided, borderRadius: '0.5rem', boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', zIndex: 1055 }),
    menuPortal: base => ({ ...base, zIndex: 9999 }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : 'white',
        color: state.isSelected ? 'white' : 'black',
        fontSize: '0.875rem',
        padding: '0.5rem 1rem'
    }),
    multiValue: (provided) => ({ ...provided, backgroundColor: '#e9ecef', borderRadius: '0.5rem', margin: '2px', }),
    multiValueLabel: (provided) => ({ ...provided, color: '#495057', padding: '2px 5px', fontSize: '0.8rem' }),
    multiValueRemove: (provided) => ({ ...provided, color: '#6c757d', ':hover': { backgroundColor: '#dc3545', color: 'white', }, }),
    noOptionsMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
    loadingMessage: (provided) => ({ ...provided, fontSize: '0.875rem', padding: '0.5rem 1rem' }),
};

const FORM_CONTAINER_CLASS = "p-3 p-md-4 sousprojet-form-container";
const inputClass = "form-control form-control-sm rounded-pill shadow-sm bg-light border";
const textareaClass = "form-control form-control-sm rounded-3 shadow-sm bg-light border";
const FORM_ACTIONS_ROW_CLASS = "mt-4 pt-2 justify-content-center flex-shrink-0";
const FORM_CANCEL_BUTTON_CLASS = "btn px-5 rounded-5 py-2 shadow-sm";
const FORM_SUBMIT_BUTTON_CLASS = "btn rounded-5 px-5 py-2 align-items-center d-flex justify-content-evenly border-0 shadow-sm";
const FORM_HEADER_CLOSE_BUTTON_CLASS = 'btn rounded-5 px-5 py-2 bg-warning shadow-sm fw-bold';

// --- Helper Function ---
const findMultiOptions = (options, valuesString) => {
    if (!valuesString || typeof valuesString !== 'string' || !options?.length) return [];
    const selectedValues = valuesString.split(';').map(v => String(v).trim().toLowerCase()).filter(v => v);
    return options.filter(opt => selectedValues.includes(String(opt.value).toLowerCase()));
};

// --- Component Definition ---
const SousProjetForm = ({
    itemId = null, onClose, onItemCreated, onItemUpdated, baseApiUrl = 'http://localhost:8000/api'
}) => {
    // --- State Definitions ---
    const initialFormData = useMemo(() => ({
        Code_Sous_Projet: '', Nom_Projet: '', Observations: '', Etat_Avan_Physi: '',
        Etat_Avan_Finan: '', Estim_Initi: '', Secteur: '', Localite: '', Centre: '',
        Site: '', Surface: '', Lineaire: '', Status: '', Douars_Desservis: '',
        Financement: '', Nature_Intervention: '', Benificiaire: '',
        projetMaitre: null, province: [], commune: [],
        fonctionnaires: [],
    }), []);

    const [formData, setFormData] = useState(initialFormData);
    const isEditing = useMemo(() => itemId !== null, [itemId]);
    const [projetOptions, setProjetOptions] = useState([]);
    const [provinceOptions, setProvinceOptions] = useState([]);
    const [communeOptions, setCommuneOptions] = useState([]);
    const [fonctionnaireOptions, setFonctionnaireOptions] = useState([]);
    const [parentProjetDetails, setParentProjetDetails] = useState({ provinces: [], communes: [] });
    const [loadingParentDetails, setLoadingParentDetails] = useState(false);

    const [loadingOptions, setLoadingOptions] = useState({ projets: true, provinces: true, communes: true, fonctionnaires: true });
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});
    const [loadingData, setLoadingData] = useState(isEditing);

    // State to track filtered commune options based on selected provinces
    const [filteredCommuneOptions, setFilteredCommuneOptions] = useState([]);
    const [loadingCommunes, setLoadingCommunes] = useState(false);

    // Effect to filter communes based on selected provinces
    useEffect(() => {
        const fetchFilteredCommunes = async () => {
            if (!formData.province || formData.province.length === 0) {
                // If no provinces selected, show all communes or empty
                setFilteredCommuneOptions(communeOptions);
                // Also reset communes if provinces are cleared
                if (formData.commune && formData.commune.length > 0) {
                    setFormData(prev => ({ ...prev, commune: [] }));
                }
                return;
            }

            setLoadingCommunes(true);
            try {
                // Fetch communes for all selected provinces
                const provinceIds = formData.province.map(p => p.value);
                const communePromises = provinceIds.map(provinceId =>
                    axios.get(`${baseApiUrl}/options/communes/province/${provinceId}`, { withCredentials: true })
                        .then(res => res.data)
                        .catch(() => [])
                );

                const communeArrays = await Promise.all(communePromises);
                // Flatten and deduplicate communes
                const allCommunes = communeArrays.flat();
                const uniqueCommunes = Array.from(
                    new Map(allCommunes.map(c => [c.value, c])).values()
                );

                setFilteredCommuneOptions(uniqueCommunes);

                // Filter current communes to only keep those in the new filtered list
                if (formData.commune && formData.commune.length > 0) {
                    const validCommuneValues = new Set(uniqueCommunes.map(c => c.value));
                    const filteredCommunes = formData.commune.filter(c => validCommuneValues.has(c.value));
                    if (filteredCommunes.length !== formData.commune.length) {
                        setFormData(prev => ({ ...prev, commune: filteredCommunes }));
                    }
                }
            } catch (error) {
                console.error('Error fetching filtered communes:', error);
                setFilteredCommuneOptions([]);
            } finally {
                setLoadingCommunes(false);
            }
        };

        fetchFilteredCommunes();
    }, [formData.province, baseApiUrl, communeOptions]);

    // Initialize filtered communes when communeOptions are loaded
    useEffect(() => {
        if (communeOptions.length > 0 && (!formData.province || formData.province.length === 0)) {
            setFilteredCommuneOptions(communeOptions);
        }
    }, [communeOptions]);

    // --- Data Fetching ---
    const fetchOptions = useCallback(async () => {
        setLoadingOptions({ projets: true, provinces: true, communes: true, fonctionnaires: true });
        try {
            const [projRes, provRes, comRes, foncRes] = await Promise.allSettled([
                axios.get(`${baseApiUrl}/options/projets`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/provinces`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/communes`, { withCredentials: true }),
                axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true }),
            ]);

            const extractData = (res) => {
                if (res.status === 'fulfilled' && res.value.data) {
                    return Array.isArray(res.value.data) ? res.value.data : (res.value.data.data || Object.values(res.value.data)[0] || []);
                }
                return [];
            };

            const rawProjetOptions = extractData(projRes);
            const enrichedProjetOptions = rawProjetOptions.map(opt => {
                const code = opt.label.split(' - ')[0];
                return { ...opt, code: code };
            });
            setProjetOptions(enrichedProjetOptions);
            const rawFonctionnaires = extractData(foncRes, 'fonctionnaires');
            const formattedFonctionnaires = rawFonctionnaires.map(user => ({
                value: user.id,       // Use 'id' as the value
                label: user.nom_complet // Use 'nom_complet' as the label
            }));
            setProvinceOptions(extractData(provRes));
            setCommuneOptions(extractData(comRes));
            setFonctionnaireOptions(formattedFonctionnaires);

        } catch (err) {
            console.error("Error fetching initial options:", err);
            setFormErrors(prev => ({ ...prev, options: "Erreur de chargement des listes." }));
        } finally {
            setLoadingOptions({ projets: false, provinces: false, communes: false, fonctionnaires: false });
        }
    }, [baseApiUrl]);

    useEffect(() => {
        fetchOptions();
    }, [fetchOptions]);

    useEffect(() => {
        const controller = new AbortController();
        if (formData.projetMaitre?.code) {
            const fetchParentDetails = async () => {
                setLoadingParentDetails(true);
                try {
                    const response = await axios.get(`${baseApiUrl}/projets/${formData.projetMaitre.code}/locations`, {
                        signal: controller.signal,
                        withCredentials: true
                    });
                    setParentProjetDetails(response.data);
                } catch (error) {
                    if (!axios.isCancel(error)) {
                        console.error("Failed to fetch parent project details:", error);
                        setParentProjetDetails({ provinces: [], communes: [] });
                    }
                } finally {
                    setLoadingParentDetails(false);
                }
            };
            fetchParentDetails();
        } else {
            setParentProjetDetails({ provinces: [], communes: [] });
        }
        return () => controller.abort();
    }, [formData.projetMaitre, baseApiUrl]);

    useEffect(() => {
        if (!isEditing) {
            if (formData.Code_Sous_Projet) { setFormData(initialFormData); setFormErrors({}); setLoadingData(false); setSubmissionStatus({}); }
            return;
        }

        const allOptionsLoaded = !Object.values(loadingOptions).some(Boolean);
        if (!allOptionsLoaded) {
            setLoadingData(true);
            return;
        }

        let isMounted = true;
        const fetchSousProjetData = async () => {
            setLoadingData(true);
            setSubmissionStatus({});
            setFormErrors({});
            try {
                const response = await axios.get(`${baseApiUrl}/sousprojets/${itemId}`, { withCredentials: true });
                const data = response.data.sousprojet || response.data.sous_projet || response.data;
                if (!data || !isMounted) return;

                const findOptionByCode = (options, codeToFind) => options?.find(opt => String(opt.code) === String(codeToFind)) || null;
                const findOptionById = (options, valueToFind) => options?.find(opt => String(opt.value) === String(valueToFind)) || null;
                const findMultiOptionsById = (options, valuesArray) => {
                    if (!valuesArray || !Array.isArray(valuesArray) || !options?.length) return [];
                    return options.filter(opt => valuesArray.includes(String(opt.value)));
                };
                const selectedFonctionnaires = findMultiOptions(fonctionnaireOptions, data.id_fonctionnaire);

                if (isMounted) {
                    setFormData({
                        Code_Sous_Projet: String(data.Code_Sous_Projet ?? ''),
                        Nom_Projet: data.Nom_Projet ?? '',
                        Observations: data.Observations ?? '',
                        Etat_Avan_Physi: data.Etat_Avan_Physi ?? '',
                        Etat_Avan_Finan: data.Etat_Avan_Finan ?? '',
                        Estim_Initi: data.Estim_Initi ?? '',
                        Secteur: data.Secteur ?? '',
                        Localite: data.Localite ?? '',
                        Centre: data.Centre ?? '',
                        Site: data.Site ?? '',
                        Surface: data.Surface ?? '',
                        Lineaire: data.Lineaire ?? '',
                        Status: data.Status ?? '',
                        Douars_Desservis: data.Douars_Desservis ?? '',
                        Financement: data.Financement ?? '',
                        Nature_Intervention: data.Nature_Intervention ?? '',
                        Benificiaire: data.Benificiaire ?? '',
                        projetMaitre: findOptionByCode(projetOptions, data.ID_Projet_Maitre),
                        province: findMultiOptionsById(provinceOptions, data.Id_Province),
                        commune: findMultiOptionsById(communeOptions, data.Id_Commune),
                        fonctionnaires: selectedFonctionnaires,
                    });
                }
            } catch (err) {
                console.error("[SousProjetForm Edit] Error loading data:", err.response || err);
                const errorMsg = err.response?.data?.message || err.message || "Erreur chargement des données.";
                if (isMounted) setSubmissionStatus({ loading: false, error: errorMsg, success: false });
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };
        fetchSousProjetData();
        return () => { isMounted = false };
    }, [itemId, isEditing, baseApiUrl, loadingOptions, projetOptions, provinceOptions, communeOptions, fonctionnaireOptions, initialFormData]);

    // --- SIMPLIFIED Grouped Options Logic ---
    const buildGroupedOptions = (allItems, parentItems) => {
        if (!formData.projetMaitre) {
            return allItems;
        }

        const parentItemIds = new Set(parentItems.map(p => p.Id));
        const parentGroup = { label: 'Localisations du Projet Maître', options: [] };
        const otherGroup = { label: 'Autres Localisations Disponibles', options: [] };

        allItems.forEach(option => {
            if (parentItemIds.has(option.value)) {
                parentGroup.options.push(option);
            } else {
                otherGroup.options.push(option);
            }
        });

        return [parentGroup, otherGroup].filter(group => group.options.length > 0);
    };

    const provinceGroupedOptions = useMemo(() => buildGroupedOptions(provinceOptions, parentProjetDetails.provinces), [provinceOptions, parentProjetDetails.provinces, formData.projetMaitre]);
    // Use filtered communes for grouping, fallback to all communes if no filter applied
    const communesToGroup = filteredCommuneOptions.length > 0 ? filteredCommuneOptions : communeOptions;
    const communeGroupedOptions = useMemo(() => buildGroupedOptions(communesToGroup, parentProjetDetails.communes), [communesToGroup, parentProjetDetails.communes, formData.projetMaitre]);

    // --- Validation ---
    const validateForm = () => {
        const errors = {};
        if (!formData.Code_Sous_Projet?.trim() && !isEditing) errors.Code_Sous_Projet = "Code Sous-Projet requis.";
        if (!formData.Nom_Projet?.trim()) errors.Nom_Projet = "Intitulé Sous-Projet requis.";
        if (!formData.projetMaitre) errors.ID_Projet_Maitre = "Projet Maître requis.";
        if (!formData.province || formData.province.length === 0) errors.Id_Province = "Au moins une province requise.";

        const checkNumeric = (field, name) => {
            const value = formData[field];
            if (value !== '' && value !== null && value !== undefined) {
                if (isNaN(parseFloat(value))) {
                    errors[field] = `${name} doit être un nombre.`;
                } else if ((field === 'Etat_Avan_Physi' || field === 'Etat_Avan_Finan') && (parseFloat(value) < 0 || parseFloat(value) > 100)) {
                    errors[field] = `${name} doit être entre 0 et 100.`;
                }
            }
        };
        checkNumeric('Etat_Avan_Physi', 'Av. Physique (%)');
        checkNumeric('Etat_Avan_Finan', 'Av. Financier (%)');
        checkNumeric('Estim_Initi', 'Estimation Initiale');
        checkNumeric('Surface', 'Surface');
        checkNumeric('Lineaire', 'Linéaire');

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // --- SIMPLIFIED Handlers ---
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); if (formErrors[name]) { setFormErrors(prev => ({ ...prev, [name]: undefined })); } };

    const handleProjetMaitreChange = (selectedOption) => {
        setFormData(prev => ({ ...prev, projetMaitre: selectedOption, province: [], commune: [] }));
        if (formErrors.ID_Projet_Maitre) setFormErrors(prev => ({ ...prev, ID_Projet_Maitre: undefined }));
    };



    const handleProvinceChange = (selectedOptions) => {
        setFormData(prev => ({ ...prev, province: selectedOptions || [] }));
        if (formErrors.Id_Province) setFormErrors(prev => ({ ...prev, Id_Province: undefined }));
        // Communes will be filtered automatically by the useEffect above
    };

    const handleCommuneChange = (selectedOptions) => {
        setFormData(prev => ({ ...prev, commune: selectedOptions || [] }));
        if (formErrors.Id_Commune) setFormErrors(prev => ({ ...prev, Id_Commune: undefined }));
    };

    const handleFonctionnaireChange = useCallback((selectedOptions) => { setFormData(prev => ({ ...prev, fonctionnaires: selectedOptions || [] })); }, []);

    // --- Submit Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmissionStatus({ loading: true, error: null, success: false });
        if (!validateForm()) {
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs.", success: false });
            return;
        }

        const dataToSubmit = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            if (!['projetMaitre', 'province', 'commune', 'fonctionnaires'].includes(key)) {
                dataToSubmit.append(key, value ?? '');
            }
        });

        if (formData.projetMaitre?.code) dataToSubmit.append('ID_Projet_Maitre', formData.projetMaitre.code);

        // Handle multiple provinces
        if (formData.province && Array.isArray(formData.province) && formData.province.length > 0) {
            formData.province.forEach((province) => {
                dataToSubmit.append(`Id_Province[]`, province.value);
            });
        }

        // Handle multiple communes
        if (formData.commune && Array.isArray(formData.commune) && formData.commune.length > 0) {
            formData.commune.forEach((commune) => {
                dataToSubmit.append(`Id_Commune[]`, commune.value);
            });
        }
        dataToSubmit.append('id_fonctionnaire', formData.fonctionnaires.map(f => f.value).join(';') || '');

        if (isEditing) dataToSubmit.append('_method', 'PUT');

        const url = isEditing ? `${baseApiUrl}/sousprojets/${itemId}` : `${baseApiUrl}/sousprojets`;

        try {
            const response = await axios.post(url, dataToSubmit, { withCredentials: true, headers: { 'Accept': 'application/json' } });
            setSubmissionStatus({ loading: false, error: null, success: true });
            const submittedData = response.data.sousprojet || Object.fromEntries(dataToSubmit.entries());
            if (isEditing) onItemUpdated?.(submittedData);
            else onItemCreated?.(submittedData);
            onClose();
        } catch (err) {
            console.error(`Erreur:`, err.response || err);
            let errorMsg = `Une erreur s'est produite.`; const backendErrors = {};
            if (err.response) { if (err.response.status === 422 && err.response.data.errors) { Object.keys(err.response.data.errors).forEach(key => { backendErrors[key] = err.response.data.errors[key][0]; }); setFormErrors(backendErrors); errorMsg = "Erreurs de validation."; } else { errorMsg = err.response.data.message || `Erreur serveur (${err.response.status})`; } }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    // --- Render Logic ---
    const anyOptionsLoading = Object.values(loadingOptions).some(Boolean);
    const isSubmitDisabled = submissionStatus.loading || loadingData || anyOptionsLoading || loadingParentDetails;

    if (isEditing && loadingData) { return (<div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '300px' }}> <Spinner animation="border" variant="primary" /> <span className='ms-3 text-muted'>Chargement...</span> </div>); }
    if (anyOptionsLoading && !loadingData) { return (<div className={FORM_CONTAINER_CLASS} style={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Spinner animation="border" variant="secondary" /><span className='ms-3 text-muted'>Chargement des listes...</span></div>); }

    return (
        <div className={FORM_CONTAINER_CLASS} style={{ backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 6px 18px rgba(0,0,0,0.1)', maxHeight: 'calc(90vh - 100px)', overflowY: 'auto' }}>
            <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0 border-bottom pb-3">
                <div><h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier le' : 'Créer un nouveau'}</h5><h2 className="mb-0 fw-bold">Sous-Projet {isEditing ? `(${itemId})` : ''}</h2></div>
                <Button variant="warning" className={FORM_HEADER_CLOSE_BUTTON_CLASS} onClick={onClose} size="sm"> Revenir à la liste </Button>
            </div>

            <div className="flex-grow-1 px-md-3">
                {submissionStatus.error && (<Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({ ...prev, error: null }))}><FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> {submissionStatus.error}</Alert>)}

                <Form noValidate onSubmit={handleSubmit}>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formCodeSousProjet"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Code", "الرمز", !isEditing)}</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Code_Sous_Projet} required={!isEditing} type="text" name="Code_Sous_Projet" value={formData.Code_Sous_Projet} onChange={handleChange} size="sm" disabled={isEditing} title={isEditing ? "Non modifiable" : ""} /><Form.Control.Feedback type="invalid">{formErrors.Code_Sous_Projet}</Form.Control.Feedback></Form.Group>
                        <Form.Group as={Col} md={6} controlId="formNomProjet"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Intitulé", "العنوان", true)}</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Nom_Projet} required type="text" name="Nom_Projet" value={formData.Nom_Projet} onChange={handleChange} size="sm" /><Form.Control.Feedback type="invalid">{formErrors.Nom_Projet}</Form.Control.Feedback></Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formProjetMaitre"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Projet Maître", "المشروع الرئيسي", true)}</Form.Label><Select name="projetMaitre" options={projetOptions} value={formData.projetMaitre} onChange={handleProjetMaitreChange} styles={selectStyles} placeholder="- Sélectionner -" isClearable isLoading={loadingOptions.projets} isDisabled={loadingOptions.projets} className={formErrors.ID_Projet_Maitre ? 'is-invalid' : ''} menuPlacement="auto" menuPortalTarget={document.body} />{formErrors.ID_Projet_Maitre && <div className="invalid-feedback d-block">{formErrors.ID_Projet_Maitre}</div>}</Form.Group>
                        <Form.Group as={Col} md={6} controlId="formProvince">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Province(s)", "الأقاليم", true)}</Form.Label>
                            <Select
                                name="province"
                                options={provinceGroupedOptions}
                                value={formData.province}
                                onChange={handleProvinceChange}
                                styles={selectStyles}
                                placeholder={!formData.projetMaitre ? "Sélectionnez d'abord un projet" : "- Sélectionner -"}
                                isMulti
                                isClearable
                                closeMenuOnSelect={false}
                                isLoading={loadingOptions.provinces || loadingParentDetails}
                                isDisabled={!formData.projetMaitre || loadingOptions.provinces}
                                className={formErrors.Id_Province ? 'is-invalid' : ''}
                                menuPlacement="auto"
                                menuPortalTarget={document.body}
                            />
                            {formErrors.Id_Province && <div className="invalid-feedback d-block">{formErrors.Id_Province}</div>}
                        </Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={6} controlId="formCommune">
                            <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Commune(s)", "الجماعات")}</Form.Label>
                            <Select
                                name="commune"
                                options={communeGroupedOptions}
                                value={formData.commune}
                                onChange={handleCommuneChange}
                                styles={selectStyles}
                                placeholder={!formData.projetMaitre ? "Sélectionnez d'abord un projet" : (!formData.province || formData.province.length === 0 ? "Sélectionnez d'abord des provinces" : "- Sélectionner -")}
                                isMulti
                                isClearable
                                closeMenuOnSelect={false}
                                isLoading={loadingCommunes || loadingOptions.communes || loadingParentDetails}
                                isDisabled={!formData.projetMaitre || !formData.province || formData.province.length === 0 || loadingOptions.communes}
                                className={formErrors.Id_Commune ? 'is-invalid' : ''}
                                menuPlacement="auto"
                                menuPortalTarget={document.body}
                            />
                            {(!formData.province || formData.province.length === 0) && formData.projetMaitre && (
                                <Form.Text className="text-muted">Veuillez d'abord sélectionner au moins une province</Form.Text>
                            )}
                            {formErrors.Id_Commune && <div className="invalid-feedback d-block">{formErrors.Id_Commune}</div>}
                        </Form.Group>
                        <Form.Group as={Col} md={6} controlId="formStatus"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Statut", "الحالة")}</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Status} type="text" name="Status" value={formData.Status} onChange={handleChange} size="sm" placeholder="Ex: En cours" /><Form.Control.Feedback type="invalid">{formErrors.Status}</Form.Control.Feedback></Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={12} controlId="formFonctionnaire">
                            <Form.Label className="small mb-1 fw-medium w-100"><FontAwesomeIcon icon={faUsers} className="me-1 text-secondary" /> {bilingualLabel("Points Focaux", "النقاط المحورية")}</Form.Label>
                            <Select name="fonctionnaires" options={fonctionnaireOptions} value={formData.fonctionnaires} onChange={handleFonctionnaireChange} styles={selectStyles} placeholder="- Sélectionner -" isMulti isClearable closeMenuOnSelect={false} isLoading={loadingOptions.fonctionnaires} isDisabled={loadingOptions.fonctionnaires} className={formErrors.id_fonctionnaire ? 'is-invalid' : ''} menuPlacement="auto" menuPortalTarget={document.body} />
                            {formErrors.id_fonctionnaire && <div className="invalid-feedback d-block">{formErrors.id_fonctionnaire}</div>}
                        </Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={4} controlId="formEtatAvanPhysi"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Av. Physi (%)", "التقدم المادي (%)")}</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Etat_Avan_Physi} type="number" name="Etat_Avan_Physi" value={formData.Etat_Avan_Physi} onChange={handleChange} size="sm" step="0.01" min="0" max="100" placeholder="0-100" /><Form.Control.Feedback type="invalid">{formErrors.Etat_Avan_Physi}</Form.Control.Feedback></Form.Group>
                        <Form.Group as={Col} md={4} controlId="formEtatAvanFinan"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Av. Finan (%)", "التقدم المالي (%)")}</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Etat_Avan_Finan} type="number" name="Etat_Avan_Finan" value={formData.Etat_Avan_Finan} onChange={handleChange} size="sm" step="0.01" min="0" max="100" placeholder="0-100" /><Form.Control.Feedback type="invalid">{formErrors.Etat_Avan_Finan}</Form.Control.Feedback></Form.Group>
                        <Form.Group as={Col} md={4} controlId="formEstimIniti"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Estim. Initiale", "التقدير الأولي")}</Form.Label><Form.Control className={inputClass} isInvalid={!!formErrors.Estim_Initi} type="number" name="Estim_Initi" value={formData.Estim_Initi} onChange={handleChange} size="sm" step="0.01" min="0" placeholder="Montant" /><Form.Control.Feedback type="invalid">{formErrors.Estim_Initi}</Form.Control.Feedback></Form.Group>
                    </Row>
                    <Row className="mb-3 g-3">
                        <Form.Group as={Col} md={12} controlId="formObservations"><Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Observations", "الملاحظات")}</Form.Label><Form.Control className={textareaClass} as="textarea" rows={3} name="Observations" value={formData.Observations} onChange={handleChange} size="sm" isInvalid={!!formErrors.Observations} /><Form.Control.Feedback type="invalid">{formErrors.Observations}</Form.Control.Feedback></Form.Group>
                    </Row>

                    <Row className={FORM_ACTIONS_ROW_CLASS}>
                        <Col xs="auto" className="pe-2"> <Button onClick={onClose} variant="danger" className={`${FORM_CANCEL_BUTTON_CLASS} bg-danger`} disabled={submissionStatus.loading}> Annuler </Button> </Col>
                        <Col xs="auto" className="ps-2"> <Button type="submit" className={`${FORM_SUBMIT_BUTTON_CLASS} bg-primary`} disabled={isSubmitDisabled}> {submissionStatus.loading ? <><Spinner as="span" animation="border" size="sm" className="me-2" />{isEditing ? 'Enregistrement...' : 'Création...'}</> : (isEditing ? 'Enregistrer' : 'Créer Sous-Projet')} </Button> </Col>
                    </Row>
                </Form>
            </div>
        </div>
    );
};

// --- PropTypes & Default Props ---
SousProjetForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string,
};
SousProjetForm.defaultProps = {
    itemId: null,
    onItemCreated: (item) => console.log("Sous-Projet Created:", item),
    onItemUpdated: (item) => console.log("Sous-Projet Updated:", item),
    baseApiUrl: 'http://localhost:8000/api',
};

export default SousProjetForm;