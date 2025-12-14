import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faSpinner, faExclamationTriangle, faTimes, faCheckCircle, faInfoCircle,
    faReceipt, faCalendarAlt, faProjectDiagram, faUsers, faStickyNote, faCreditCard, faEuroSign // Use consistent icons
} from '@fortawesome/free-solid-svg-icons';
import Select from 'react-select';
import {
    Form, Button, Row, Col, Alert, Spinner, Card, InputGroup, FormLabel, Stack,
    FormSelect, Modal // Added Modal import for consistency
} from 'react-bootstrap';
import PropTypes from 'prop-types';

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

// --- Styles & Classes --- (Keep consistent styles)
// *** Full selectStyles definition included ***
const selectStyles = {
    control: (provided, state) => ({
        ...provided,
        backgroundColor: '#f8f9fa', // Light background
        borderRadius: '1.5rem',     // Pill shape
        border: state.isFocused ? '1px solid #86b7fe' : '1px solid #ced4da', // Standard Bootstrap focus/border
        boxShadow: state.isFocused ? '0 0 0 0.25rem rgba(13, 110, 253, 0.25)' : 'none', // Bootstrap focus shadow
        minHeight: '38px', // Standard Bootstrap input height
        fontSize: '0.875rem', // Match Bootstrap sm size
        borderColor: state.selectProps.className?.includes('is-invalid') ? '#dc3545' : (state.isFocused ? '#86b7fe' : '#ced4da'), // Invalid border color
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: '0.25rem 0.8rem', // Adjust padding to vertically align text
    }),
    input: (provided) => ({
        ...provided,
        margin: '0px',
        paddingBottom: '0px',
        paddingTop: '0px',
        fontSize: '0.875rem',
    }),
    indicatorSeparator: () => ({
        display: 'none', // Hide the separator
    }),
    indicatorsContainer: (provided) => ({
        ...provided,
        padding: '1px', // Minimal padding for indicators
        height: '36px',
    }),
    placeholder: (provided) => ({
        ...provided,
        color: '#6c757d', // Bootstrap placeholder color
        fontSize: '0.875rem',
    }),
    menu: (provided) => ({
        ...provided,
        borderRadius: '0.5rem', // Rounded corners for the dropdown menu
        boxShadow: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)', // Standard dropdown shadow
        zIndex: 1055 // Ensure menu is above modal content
    }),
    option: (provided, state) => ({
        ...provided,
        backgroundColor: state.isSelected ? '#0d6efd' : state.isFocused ? '#e9ecef' : null, // Bootstrap primary/hover colors
        color: state.isSelected ? 'white' : 'black',
        fontSize: '0.875rem',
        padding: '0.5rem 1rem',
    }),
    noOptionsMessage: (provided) => ({
        ...provided,
        fontSize: '0.875rem',
        padding: '0.5rem 1rem',
    }),
    loadingMessage: (provided) => ({
        ...provided,
        fontSize: '0.875rem',
        padding: '0.5rem 1rem',
    }),
};
const FORM_CONTAINER_CLASS = "p-3 p-md-4"; // Simplified container class
const FORM_SELECT_CLASS = "form-select form-select-sm rounded-pill shadow-sm bg-light border"; // Bootstrap classes
const FORM_CONTROL_CLASS = "form-control form-control-sm rounded-pill shadow-sm bg-light border"; // Bootstrap classes
const FORM_TEXTAREA_CLASS = "form-control form-control-sm rounded shadow-sm bg-light border"; // Bootstrap classes (not pill)
const FORM_ACTIONS_ROW_CLASS = "mt-4 pt-2 justify-content-center flex-shrink-0";
const FORM_CANCEL_BUTTON_CLASS = "btn btn-secondary rounded-5 px-5 m-1 py-1 border-0"; // Changed variant, kept Bootstrap classes
const FORM_SUBMIT_BUTTON_CLASS = "btn btn-primary rounded-5 px-5 py-1 m-1 align-items-center d-flex justify-content-evenly border-0"; // Kept Bootstrap classes
const FORM_HEADER_CLOSE_BUTTON_CLASS = 'btn btn-warning rounded-5 px-5 py-2 shadow-sm'; // Keep consistent close button

// --- Helpers ---
const PAIEMENT_METHODE_OPTIONS = [ { value: "Virement", label: "Virement Bancaire" }, { value: "Chèque", label: "Chèque" }, { value: "Espèces", label: "Espèces" }, { value: "Autre", label: "Autre" } ];
const parseCurrency = (value) => { if (value === null || value === undefined) return NaN; if (typeof value !== 'string') return Number(value) || 0; const cleaned = value.replace(/[\s\u00A0]/g, '').replace(/[^0-9,.-]/g, '').replace(',', '.'); const number = parseFloat(cleaned); return isNaN(number) ? NaN : number; };
const formatCurrency = (value, fallback = '-') => { const n = parseFloat(value); return isNaN(n) ? fallback : n.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
const formatDateSimple = (dateString) => { if (!dateString) return '-'; try { if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) { return new Date(dateString).toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); } const d=new Date(dateString); return isNaN(d.getTime())?dateString:d.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); } catch (e) { return dateString; } };
// *** Full truncateText implementation included ***
const truncateText = (text, maxLength = 60) => {
     if (!text) return '';
     if (text.length <= maxLength) {
         return text;
     }
     return text.substring(0, maxLength) + '...';
};
// --- End Helpers ---

const VersementForm = ({
    itemId = null, // VersementCP ID when editing
    onClose,
    onItemCreated,
    onItemUpdated,
    baseApiUrl = 'http://localhost:8000/api' // <<< ADJUST/VERIFY Base URL
}) => {
    // --- State ---
    const isEditing = useMemo(() => itemId !== null, [itemId]);
    const [formData, setFormData] = useState({ date_versement: '', montant_verse: '', commentaire: '' });

    // State for dropdowns and derived info
    const [conventionOptions, setConventionOptions] = useState([]);
    const [selectedConvention, setSelectedConvention] = useState(null);
    const [partnerOptions, setPartnerOptions] = useState([]); // Now just partner info
    const [selectedPartner, setSelectedPartner] = useState(null); // Now just partner info
    const [commitmentId, setCommitmentId] = useState(null); // Stores the fetched id_CP

    // State for commitment details (fetched)
    const [commitmentInfo, setCommitmentInfo] = useState({ montant_convenu: null, total_deja_verse: null }); // total_deja_verse MUST be fetched

    // State for validation (like PP form)
    const [originalMontantVerse, setOriginalMontantVerse] = useState(null); // For edit mode calculation

    // Loading and Status States
    const [loadingCommitmentDetails, setLoadingCommitmentDetails] = useState(false);
    const [loadingConventions, setLoadingConventions] = useState(false); // Renamed for clarity
    const [loadingPartners, setLoadingPartners] = useState(false);
    const [loadingData, setLoadingData] = useState(isEditing); // For loading existing versement
    const [submissionStatus, setSubmissionStatus] = useState({ loading: false, error: null, success: false });
    const [formErrors, setFormErrors] = useState({});

    // --- Fetch Initial Data ---

    // Effect 1: Fetch Conventions (All modes, but selection only enabled in Create)
    const fetchConventions = useCallback(async () => {
        setLoadingConventions(true); setConventionOptions([]); // Reset
        try {
            // Assuming an endpoint exists to get convention options { value: id, label: name }
             // <<< ADJUST/VERIFY API Endpoint >>>
            const response = await axios.get(`${baseApiUrl}/options/conventions`, { withCredentials: true });
            // Use response.data directly assuming it's the array [{value, label}, ...]
            const conventions = Array.isArray(response.data) ? response.data : [];
            setConventionOptions(conventions);
        } catch (err) {
            console.error("Erreur chargement Conventions:", err);
            setFormErrors(prev => ({ ...prev, convention: "Erreur chargement conventions." }));
        } finally {
            setLoadingConventions(false);
        }
    }, [baseApiUrl]);

    useEffect(() => {
        fetchConventions(); // Fetch conventions on initial load
    }, [fetchConventions]);

    // Effect 2: Fetch Existing Versement Data & Related Commitment Details (Edit Mode)
    useEffect(() => {
        if (!isEditing || !itemId || conventionOptions.length === 0) { // Wait for conventions too
            setLoadingData(false);
            return;
        }

        let isMounted = true;
        const fetchEditData = async () => {
            setLoadingData(true);
            // Reset everything before loading
            setSubmissionStatus({}); setFormErrors({}); setSelectedConvention(null); setSelectedPartner(null);
            setPartnerOptions([]); setCommitmentId(null); setCommitmentInfo({ montant_convenu: null, total_deja_verse: null });
            setOriginalMontantVerse(null);

            try {
                // --- Step 1: Fetch the VersementCP itself ---
                 // <<< ADJUST/VERIFY API Path >>>
                const versementResponse = await axios.get(`${baseApiUrl}/versements/${itemId}`, { withCredentials: true });
                const data = versementResponse.data?.versement;
                console.log("Data received in fetchEditData:",data?.conv_part?.Id_Convention,' ||', data?.conv_part?.Id_Partenaire ,' ||', data?.conv_part?.convention  ,' ||', data?.conv_part?.partenaire ,' ||', data.id_CP ); // <<< ADD THIS LOG

                // Validate required nested data points exist from the versement fetch
                if (!data?.conv_part?.Id_Convention || !data?.conv_part?.Id_Partenaire || !data?.conv_part?.convention || !data?.conv_part?.partenaire ||!data?.id_CP) {
                     console.error("Missing data in fetched versement:", data);
                    throw new Error("Données API incomplètes reçues pour le versement ou son engagement associé (convention/partenaire).");
                }

                if (!isMounted) return;

                const currentMontantVerseNum = parseCurrency(data.montant_verse ?? 0);

                setFormData({
                    date_versement: data.date_versement?.split('T')[0] ?? '',
                    montant_verse: String(data.montant_verse ?? ''),
                    
                    commentaire: data.commentaire ?? ''
                });
                setOriginalMontantVerse(currentMontantVerseNum);
                const fetchedCommitmentId = data.id_CP;
                setCommitmentId(fetchedCommitmentId);

                const initialConvention = conventionOptions.find(opt => String(opt.value) === String(data.conv_part.Id_Convention));
                if (initialConvention) {
                    setSelectedConvention(initialConvention);
                    const partner = data.conv_part.partenaire;
                    const partnerLabel = `${partner.Code ? partner.Code + ' - ' : ''}${partner.Description||partner.Description_Arr||`ID: ${partner.Id}`}`;
                    const partnerOption = { value: partner.Id, label: partnerLabel };
                    setPartnerOptions([partnerOption]);
                    setSelectedPartner(partnerOption);
                } else {
                    console.warn("Associated convention not found in options. Versement data:", data);
                    setFormErrors(prev => ({ ...prev, convention: "Convention associée non trouvée." }));
                }

                // --- Step 2: Fetch Commitment Details (Amount & Total Paid) ---
                setLoadingCommitmentDetails(true);
                try {
                    // <<< ADJUST/VERIFY API Endpoint & Params >>> Use the lookup route
                    const detailsUrl = `${baseApiUrl}/convparts/lookup?convention_id=${data.conv_part.Id_Convention}&partenaire_id=${data.conv_part.Id_Partenaire}`;
                    const detailsResponse = await axios.get(detailsUrl, { withCredentials: true });

                    if (isMounted && detailsResponse.data) {
                         // Destructure and check all required fields from the lookup response
                        const { id_cp, montant_convenu, total_deja_verse } = detailsResponse.data;
                        if (id_cp == fetchedCommitmentId && montant_convenu !== undefined && total_deja_verse !== undefined) {
                            setCommitmentInfo({
                                montant_convenu: montant_convenu,
                                total_deja_verse: total_deja_verse ?? 0
                            });
                        } else {
                            console.error("Incomplete or mismatched commitment details received:", detailsResponse.data);
                            throw new Error("Détails d'engagement (montant/total payé) invalides ou ID ne correspond pas.");
                        }
                    } else if (isMounted) {
                         throw new Error("Aucune donnée reçue pour les détails d'engagement.");
                    }
                } catch (detailsErr) {
                     if (isMounted) {
                        console.error("Erreur chargement Détails Engagement (Edit):", detailsErr);
                        setCommitmentInfo({ montant_convenu: null, total_deja_verse: null });
                        setFormErrors(prev => ({ ...prev, commitment: `Erreur chargement détails engagement (${detailsErr.message}).` }));
                     }
                } finally {
                    if (isMounted) setLoadingCommitmentDetails(false);
                }

            } catch (err) {
                if (isMounted) {
                    console.error("Erreur chargement Versement (Edit):", err);
                    setSubmissionStatus({ loading: false, error: err.message || "Erreur chargement détails du versement.", success: false });
                    setSelectedConvention(null); setSelectedPartner(null); setPartnerOptions([]); setCommitmentId(null); setCommitmentInfo({ montant_convenu: null, total_deja_verse: null });
                }
            } finally {
                if (isMounted) setLoadingData(false);
            }
        };

        fetchEditData();
        return () => { isMounted = false };
    }, [itemId, isEditing, baseApiUrl, conventionOptions]);


    // Effect 3: Fetch Partners (Only runs in CREATE mode when convention changes)
    useEffect(() => {
        if (isEditing || !selectedConvention) {
            if(!selectedConvention) {
                 setPartnerOptions([]); setSelectedPartner(null); setCommitmentId(null); setCommitmentInfo({ montant_convenu: null, total_deja_verse: null });
            }
            return;
        }

        const conventionId = selectedConvention.value;
        let isMounted = true;
        const fetchPartnersForConvention = async () => {
            setLoadingPartners(true);
            setPartnerOptions([]); setSelectedPartner(null); setCommitmentId(null); setCommitmentInfo({ montant_convenu: null, total_deja_verse: null });
            setFormErrors(prev => ({ ...prev, partner: undefined, commitment: undefined }));

            try {
                // <<< ADJUST/VERIFY API Endpoint >>> Use the correct endpoint from routes/api.php
                const url = `${baseApiUrl}/conventions/${conventionId}/partenaire-options`;
                const response = await axios.get(url, { withCredentials: true });

                if (isMounted) {
                    // Backend now returns array [{value, label}, ...] directly
                    const partnersArray = Array.isArray(response.data) ? response.data : [];
                    setPartnerOptions(partnersArray); // Use the array directly
                }
            } catch (err) {
                console.error(`Erreur chargement Partenaires Convention ${conventionId}:`, err.response || err);
                if (isMounted) setFormErrors(prev => ({ ...prev, partner: "Erreur chargement partenaires." }));
            } finally {
                if (isMounted) setLoadingPartners(false);
            }
        };

        fetchPartnersForConvention();
        return () => { isMounted = false };
    }, [selectedConvention, baseApiUrl, isEditing]);


    // Effect 4: Fetch Commitment Details (ID, Amount, Total Paid) (Only in CREATE mode when Convention & Partner change)
    useEffect(() => {
        // <<< --- EXPLICIT EDITING CHECK ADDED --- >>>
        if (isEditing) {
            return; // Stop if in Edit mode
        }
        // <<< --- END ADDED CHECK --- >>>

        // Proceed only if both selections are made in Create mode
        if (!selectedConvention || !selectedPartner) {
            setCommitmentId(null);
            setCommitmentInfo({ montant_convenu: null, total_deja_verse: null });
            return;
        }

        const conventionId = selectedConvention.value;
        const partnerId = selectedPartner.value;

        let isMounted = true;
        const fetchCommitmentDetails = async () => {
            setLoadingCommitmentDetails(true);
            setCommitmentId(null);
            setCommitmentInfo({ montant_convenu: null, total_deja_verse: null });
            setFormErrors(prev => ({ ...prev, commitment: undefined }));

            try {
                // Use the lookup route
                const url = `${baseApiUrl}/convparts/lookup?convention_id=${conventionId}&partenaire_id=${partnerId}`;
                const response = await axios.get(url, { withCredentials: true });

                if (isMounted && response.data) {
                    const { id_cp, montant_convenu, total_deja_verse } = response.data;
                    if (id_cp && montant_convenu !== undefined && total_deja_verse !== undefined) {
                        setCommitmentId(id_cp);
                        setCommitmentInfo({ montant_convenu: montant_convenu, total_deja_verse: total_deja_verse ?? 0 });
                        setFormErrors(prev => ({...prev, montant_verse: undefined}));
                    } else {
                         console.error("Incomplete API response from lookup:", response.data);
                         throw new Error("Réponse API incomplète pour détails engagement.");
                    }
                } else if (isMounted) {
                     throw new Error("Aucune donnée reçue pour détails engagement.");
                }
            } catch (err) {
                console.error(`Erreur chargement Détails Engagement Conv ${conventionId}/Part ${partnerId}:`, err);
                 if (isMounted) {
                    const errorMsg = err.response?.status === 404 ? "Aucun engagement trouvé pour ce partenaire/convention." : (err.message || "Erreur chargement détails.");
                    setFormErrors(prev => ({ ...prev, commitment: errorMsg }));
                    setCommitmentInfo({ montant_convenu: null, total_deja_verse: null });
                }
            } finally {
                if (isMounted) setLoadingCommitmentDetails(false);
            }
        };

        fetchCommitmentDetails();
        return () => { isMounted = false };
    }, [selectedConvention, selectedPartner, baseApiUrl, isEditing]); // Dependencies remain the same


    // --- Handlers ---

    // Handle Convention Change (Create Mode Only)
     const handleConventionChange = (selectedOption) => {
         if (isEditing) return;
         setSelectedConvention(selectedOption);
         setSelectedPartner(null);
         setPartnerOptions([]);
         setCommitmentId(null);
         setCommitmentInfo({ montant_convenu: null, total_deja_verse: null });
         setFormErrors(prev => ({...prev, convention: undefined, partner: undefined, commitment: undefined }));
     };

    // Handle Partner Change (Create Mode Only)
     const handlePartnerChange = (selectedOption) => {
         if (isEditing) return;
         setSelectedPartner(selectedOption);
         setCommitmentId(null);
         setCommitmentInfo({ montant_convenu: null, total_deja_verse: null });
         setFormErrors(prev => ({...prev, partner: undefined, commitment: undefined }));
     };

    // Handle General Form Input Change (Includes Amount Validation)
    const handleChange = (e) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };
        setFormData(newFormData);
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: undefined }));

        // --- VALIDATION LOGIC ---
        if (name === 'montant_verse' && commitmentInfo.montant_convenu !== null) {
            const montantConvenuNum = parseFloat(commitmentInfo.montant_convenu);
            const totalDejaVerseCompletNum = commitmentInfo.total_deja_verse !== null ? parseFloat(commitmentInfo.total_deja_verse) : NaN;
            const montantOriginalCeVersementNum = isEditing && originalMontantVerse !== null ? originalMontantVerse : 0;
            const montantActuelSaisiNum = parseCurrency(value);

            if (!isNaN(montantConvenuNum) && !isNaN(totalDejaVerseCompletNum) && !isNaN(montantActuelSaisiNum)) {
                const totalVerseParAutresNum = Math.max(0, totalDejaVerseCompletNum - montantOriginalCeVersementNum);
                const maxValeurPourCeVersement = Math.max(0, montantConvenuNum - totalVerseParAutresNum);

                if (montantActuelSaisiNum > maxValeurPourCeVersement + 0.001) {
                    setFormErrors(prev => ({ ...prev, montant_verse: `Dépasse le max possible (${formatCurrency(maxValeurPourCeVersement)}).` }));
                } else if (montantActuelSaisiNum <= 0) {
                     setFormErrors(prev => ({...prev, montant_verse: 'Montant doit être strictement positif.'}));
                } else {
                    setFormErrors(prev => ({...prev, montant_verse: undefined}));
                }
            } else if (!isNaN(montantActuelSaisiNum) && montantActuelSaisiNum <= 0) {
                setFormErrors(prev => ({...prev, montant_verse: 'Montant doit être strictement positif.'}));
            } else {
                 setFormErrors(prev => ({...prev, montant_verse: undefined}));
            }
        }
        // --- End Validation ---
    };

    // --- Frontend Validation before Submit ---
    const validateForm = () => {
        const currentErrors = { ...formErrors };
        if (!isEditing) {
             if (!selectedConvention) currentErrors.convention = "Convention requise.";
             if (!selectedPartner) currentErrors.partner = "Partenaire requis.";
             if (!commitmentId && !loadingCommitmentDetails && selectedConvention && selectedPartner) {
                currentErrors.commitment = currentErrors.commitment || "Engagement non trouvé ou erreur chargement détails.";
             } else if (!commitmentId && selectedConvention && selectedPartner && !loadingCommitmentDetails && !formErrors.commitment) {
                currentErrors.commitment = "Sélectionnez Convention/Partenaire valides.";
             }
        } else if (!commitmentId) {
             currentErrors.commitment = "Erreur interne: ID Engagement (id_CP) manquant pour la modification.";
        }

        if (!formData.date_versement) currentErrors.date_versement = "Date versement requise.";

        const montantNum = parseCurrency(formData.montant_verse);
        const montantValide = !isNaN(montantNum) && montantNum > 0;
        if (!formData.montant_verse || !montantValide) {
             if (!currentErrors.montant_verse) {
                 currentErrors.montant_verse = "Montant valide (strictement positif) requis.";
             }
        }


        setFormErrors(currentErrors);
        return Object.values(currentErrors).every(error => !error);
    };

    // --- Submit Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            setSubmissionStatus({ loading: false, error: "Veuillez corriger les erreurs indiquées.", success: false });
            return;
        }
        if (!commitmentId) {
            setSubmissionStatus({ loading: false, error: "ID Engagement (id_CP) est manquant. Impossible de sauvegarder.", success: false });
            return;
        }

        setSubmissionStatus({ loading: true, error: null, success: false });
        setFormErrors({});

        const dataToSubmit = {
             ...(isEditing ? {} : { id_CP: commitmentId }),
             date_versement: formData.date_versement,
             montant_verse: parseCurrency(formData.montant_verse),
             
             commentaire: formData.commentaire || null,
        };

        // <<< ADJUST/VERIFY API Paths >>>
        const url = isEditing ? `${baseApiUrl}/versements/${itemId}` : `${baseApiUrl}/versements`;
        const method = isEditing ? 'put' : 'post';
        const config = { headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, withCredentials: true };

        try {
            const response = await axios[method](url, dataToSubmit, config);
            setSubmissionStatus({ loading: false, error: null, success: true });
            const returnedData = response.data.versement;

            if (isEditing) {
                onItemUpdated?.(returnedData);
            } else {
                onItemCreated?.(returnedData);
            }
             setTimeout(() => {
                 if (!isEditing) {
                     setFormData({ date_versement: '', montant_verse: '',  commentaire: '' });
                     setSelectedConvention(null);
                 }
                  onClose();
             }, 500);

        } catch (err) {
            console.error(`Erreur ${isEditing ? 'modif.' : 'création'} versement CP:`, err.response || err);
            let errorMsg = `Une erreur s'est produite lors de la sauvegarde.`;
            let serverErrors = {};
            if (err.response) {
                errorMsg = err.response.data?.message || `Erreur serveur (${err.response.status})`;
                if (err.response.status === 422 && typeof err.response.data.errors === 'object') {
                    serverErrors = err.response.data.errors;
                    const mappedErrors = {};
                    Object.keys(serverErrors).forEach(key => {
                        const formKey = key === 'id_CP' ? 'commitment' : key;
                        mappedErrors[formKey] = Array.isArray(serverErrors[key]) ? serverErrors[key].join(' ') : String(serverErrors[key]);
                    });
                    setFormErrors(mappedErrors);
                    errorMsg = mappedErrors.montant_verse || "Erreurs de validation reçues du serveur.";
                }
            } else {
                errorMsg = err.message;
            }
            setSubmissionStatus({ loading: false, error: errorMsg, success: false });
        }
    };

    // --- Render Logic ---
    const isLoadingInitial = loadingData || loadingConventions;
    const isLoadingDependencies = loadingPartners || loadingCommitmentDetails;
    const isSubmitButtonDisabled = isLoadingInitial || isLoadingDependencies || submissionStatus.loading || !!formErrors.montant_verse || (isEditing ? !commitmentId : !commitmentId) || Object.keys(formErrors).length > 0;

    // --- Calculation logic for display values (like PP form) ---
    const montantConvenuNum = commitmentInfo.montant_convenu !== null ? parseFloat(commitmentInfo.montant_convenu) : NaN;
    const totalDejaVerseCompletNum = commitmentInfo.total_deja_verse !== null ? parseFloat(commitmentInfo.total_deja_verse) : NaN;
    const montantOriginalCeVersementNum = isEditing && originalMontantVerse !== null ? originalMontantVerse : 0;
    const montantActuelSaisiNum = parseCurrency(formData.montant_verse);

    let montantRestantAffichage = NaN;
    let maxVersementPossibleHelper = NaN;

    if (!isNaN(montantConvenuNum) && !isNaN(totalDejaVerseCompletNum)) {
        const totalVerseParAutresNum = Math.max(0, totalDejaVerseCompletNum - montantOriginalCeVersementNum);
        if (!isNaN(montantActuelSaisiNum)) {
            montantRestantAffichage = montantConvenuNum - totalVerseParAutresNum - montantActuelSaisiNum;
        } else {
            montantRestantAffichage = montantConvenuNum - totalDejaVerseCompletNum;
        }
        maxVersementPossibleHelper = Math.max(0, montantConvenuNum - totalVerseParAutresNum);
    }
    // --- End Calculation ---

     if (isLoadingInitial && isEditing) {
         return <div className="d-flex justify-content-center align-items-center p-5" style={{ minHeight: '400px' }}><Spinner /> <span className='ms-3 text-muted'>Chargement du versement...</span></div>;
     }

    return (
        // Using Modal structure for consistency
        <div className="m-2 p-5 card shadow-sm border-0" style={{ maxHeight: 'calc(90vh - 100px)', overflowY: 'auto',overflowX:'hidden' }}>
             <div className="d-flex justify-content-between align-items-center mb-4 flex-shrink-0"><div><h5 className="text-uppercase fw-bold text-secondary mb-1">{isEditing ? 'Modifier' : 'Ajouter'}</h5><h2 className="mb-0 fw-bold">Versement</h2></div><Button variant="warning" onClick={onClose} size="sm" className='rounded-5 px-5'><b>Revenir a la liste</b></Button></div>

            <Form noValidate onSubmit={handleSubmit} >
                <Modal.Body >
                    {/* Status Alerts */}
                    {submissionStatus.error && ( <Alert variant="danger" className="mb-3 py-2" dismissible onClose={() => setSubmissionStatus(prev => ({...prev, error: null}))}><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {submissionStatus.error}</Alert> )}
                    {submissionStatus.success && ( <Alert variant="success" className="mb-3 py-2">Versement {isEditing ? 'modifié' : 'ajouté'} avec succès !</Alert> )}

                    {/* === Section 1: Convention & Partner Selection === */}
                     <h5 className="mb-3 mt-1 fw-semibold text-warning border-bottom pb-2">Engagement Associé</h5>
                     <Row className="mb-3 g-3">
                         <Col md={6}>
                             <Form.Group controlId="formConvention">
                                 <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Convention", "الاتفاقية", true)}</Form.Label>
                                 <Select
                                     name="convention"
                                     options={conventionOptions}
                                     value={selectedConvention}
                                     onChange={handleConventionChange}
                                     styles={selectStyles}
                                     placeholder={loadingConventions ? "Chargement..." : "- Sélectionner Convention -"}
                                     isClearable
                                     isLoading={loadingConventions}
                                     isDisabled={loadingConventions || isEditing || submissionStatus.loading}
                                     className={formErrors.convention ? 'is-invalid' : ''}
                                     classNamePrefix="react-select"
                                 />
                                 {formErrors.convention && <div className="invalid-feedback d-block ps-2 pt-1">{formErrors.convention}</div>}
                                 {isEditing && <Form.Text className="text-muted small ms-1">Convention non modifiable lors de la modification.</Form.Text>}
                             </Form.Group>
                         </Col>
                         <Col md={6}>
                             <Form.Group controlId="formPartner">
                                 <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Partenaire", "الشريك", true)}</Form.Label>
                                 <Select
                                     name="partenaire"
                                     options={partnerOptions}
                                     value={selectedPartner}
                                     onChange={handlePartnerChange}
                                     styles={selectStyles}
                                     placeholder={loadingPartners ? "Chargement..." : (selectedConvention ? "- Sélectionner Partenaire -" : "Choisir Convention d'abord")}
                                     isClearable
                                     isLoading={loadingPartners}
                                     isDisabled={!selectedConvention || loadingPartners || isEditing || submissionStatus.loading}
                                     className={formErrors.partner ? 'is-invalid' : ''}
                                     classNamePrefix="react-select"
                                     noOptionsMessage={() => loadingPartners ? 'Chargement...' : (selectedConvention ? 'Aucun partenaire trouvé' : 'Choisir Convention')}
                                 />
                                 {formErrors.partner && <div className="invalid-feedback d-block ps-2 pt-1">{formErrors.partner}</div>}
                                 {isEditing && <Form.Text className="text-muted small ms-1">Partenaire non modifiable lors de la modification.</Form.Text>}
                             </Form.Group>
                         </Col>
                     </Row>
                      {/* Display Commitment Info/Status */}
                     <Row className="mb-3 g-3">
                         <Col>
                              {isLoadingDependencies && ( <div className="text-muted small d-flex align-items-center"><Spinner size="sm" animation="border" className="me-2" /> Recherche détails engagement...</div> )}
                              {!isLoadingDependencies && commitmentId && commitmentInfo.montant_convenu !== null && (
                                <Alert variant="light" className="py-2 px-3 d-flex justify-content-between align-items-center flex-wrap border shadow-sm small">
                                     <div className='me-3 mb-1 mb-md-0'><FontAwesomeIcon icon={faStickyNote} className="me-1 text-secondary"/> ID Engagement (CP): <strong>{commitmentId}</strong></div>
                                     <div className='me-3 mb-1 mb-md-0'>Montant Convenu: <strong>{formatCurrency(commitmentInfo.montant_convenu)}</strong></div>
                                     {!isNaN(montantRestantAffichage) && (
                                         <div>Montant Restant (Après ce versement): <strong className={montantRestantAffichage < 0.01 && montantRestantAffichage > -0.01 ? 'text-success' : (montantRestantAffichage < 0 ? 'text-danger' : 'text-primary')}>{formatCurrency(montantRestantAffichage)}</strong></div>
                                     )}
                                </Alert>
                             )}
                             {formErrors.commitment && ( <Alert variant="danger" size="sm" className="py-1 px-3 small"><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/> {formErrors.commitment}</Alert> )}
                         </Col>
                    </Row>

                    {/* === Section 2: Versement Details === */}
                    <h5 className="mb-3 mt-4 fw-semibold text-warning border-bottom pb-2">Détails du Versement</h5>
                     <Row className="mb-1 g-3">
                         <Form.Group as={Col} md={6} controlId="formDateVersement">
                             <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Date Versement", "تاريخ الدفع", true)}</Form.Label>
                             <Form.Control
                                className={FORM_CONTROL_CLASS}
                                isInvalid={!!formErrors.date_versement} required type="date" name="date_versement"
                                value={formData.date_versement} onChange={handleChange} size="sm" disabled={submissionStatus.loading}/>
                             <Form.Control.Feedback type="invalid">{formErrors.date_versement}</Form.Control.Feedback>
                         </Form.Group>

                         <Form.Group as={Col} md={6} controlId="formMontantVerse">
                             <Form.Label className="small mb-1 fw-medium w-100">{bilingualLabel("Montant Versé (MAD)", "المبلغ المدفوع (درهم)", true)}</Form.Label>
                             <InputGroup size="sm" hasValidation>
                                 <Form.Control
                                    className="form-control-sm"
                                    style={{borderTopLeftRadius: '1.5rem', borderBottomLeftRadius: '1.5rem', borderRight: 0}}
                                    isInvalid={!!formErrors.montant_verse} required type="number" name="montant_verse"
                                    value={formData.montant_verse} onChange={handleChange}
                                    step="0.01" min="0.01" placeholder="0.00"
                                    disabled={!commitmentId || isLoadingDependencies || submissionStatus.loading}
                                 />
                                 <InputGroup.Text style={{borderTopRightRadius: '1.5rem', borderBottomRightRadius: '1.5rem', background: 'transparent'}}>MAD</InputGroup.Text>
                                 <Form.Control.Feedback type="invalid">{formErrors.montant_verse}</Form.Control.Feedback>
                             </InputGroup>
                             {/* Helper Text */}
                             {!isNaN(maxVersementPossibleHelper) && !formErrors.montant_verse && maxVersementPossibleHelper >= 0 && commitmentId && (
                                <Form.Text className="text-muted small ms-1">
                                    Max autorisé pour ce versement: {formatCurrency(maxVersementPossibleHelper)}
                                </Form.Text>
                             )}
                             {!commitmentId && !isEditing && selectedConvention && selectedPartner && !isLoadingDependencies && !formErrors.commitment && (
                                <Form.Text className="text-warning small ms-1">Validation engagement...</Form.Text>
                             )}
                              {!commitmentId && !isEditing && !(selectedConvention && selectedPartner) && (
                                <Form.Text className="text-muted small ms-1">Sélectionnez Convention/Partenaire.</Form.Text>
                             )}
                         </Form.Group>

                         
                     </Row>
                     
                     <Row className="mb-3 g-3">
                         <Form.Group as={Col} md={12} controlId="formCommentaire">
                             <Form.Label className="small mb-1 fw-medium">Commentaire</Form.Label>
                             <Form.Control
                                className={FORM_TEXTAREA_CLASS}
                                style={{borderRadius: '1rem'}} as="textarea" rows={3} name="commentaire"
                                value={formData.commentaire} onChange={handleChange} size="sm" disabled={submissionStatus.loading}/>
                             <Form.Control.Feedback type="invalid">{formErrors.commentaire}</Form.Control.Feedback>
                         </Form.Group>
                     </Row>
                </Modal.Body>

                <Modal.Footer className='border-0 justify-content-center'>
                     <Button onClick={onClose}  variant="danger" className={FORM_CANCEL_BUTTON_CLASS} disabled={submissionStatus.loading}>Annuler</Button>
                    <Button type="submit" className={FORM_SUBMIT_BUTTON_CLASS} >
                         {submissionStatus.loading ? <><Spinner as="span" animation="border" size="sm" className="me-2"/> Enregistrement...</> : (isEditing ? 'Enregistrer Modifications' : 'Créer Versement')}
                     </Button>
                </Modal.Footer>
            </Form>
        </div>
    );
};

// --- PropTypes & Default Props ---
VersementForm.propTypes = {
    itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onClose: PropTypes.func.isRequired,
    onItemCreated: PropTypes.func,
    onItemUpdated: PropTypes.func,
    baseApiUrl: PropTypes.string
};
VersementForm.defaultProps = {
    itemId: null,
    onItemCreated: (v) => console.log("Versement CP Created:", v),
    onItemUpdated: (v) => console.log("Versement CP Updated:", v),
    baseApiUrl: 'http://localhost:8000/api'
};

export default VersementForm;