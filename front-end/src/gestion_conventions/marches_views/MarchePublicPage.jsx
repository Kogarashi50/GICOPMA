// src/gestion_conventions/marches_publics_views/MarchePublicPage.jsx

import React, { useMemo, useCallback, useEffect, useState } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
import MarchePublicForm from './MarchePublicForm'; // Component for Create/Edit
import { TYPE_OPTIONS as MARCHE_TYPE_OPTIONS, MODE_PASSATION_OPTIONS, MARCHE_FICHIER_CATEGORIES, STATUT_OPTIONS as FORM_STATUT_OPTIONS } from './MarchePublicForm';
import MarchePublicVisualisation from './MarchePublicVisualisation'; // Component for View

// --- UI & Utilities ---
import Select from 'react-select';
import { Badge, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faLink } from '@fortawesome/free-solid-svg-icons'; // Import faLink
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

// --- Constants & Helpers ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
         if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
             // console.warn("Unexpected date format:", dateString);
             return dateString;
         }
         return new Date(datePart + 'T00:00:00Z').toLocaleDateString('fr-CA');
    } catch (e) {
        console.error("Date format error:", dateString, e);
        return dateString;
    }
};

const formatCurrency = (value) => {
    if (value == null || value === '' || isNaN(Number(value))) return '-';
    try {
        return parseFloat(value).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
    } catch (e) {
        console.error("Currency format error:", value, e);
        return String(value);
    }
};

const STATUT_OPTIONS = [
    { value: 'En préparation', label: 'En préparation', color: 'secondary' },
    { value: 'En cours', label: 'En cours', color: 'primary' },
    { value: 'Terminé', label: 'Terminé', color: 'success' },
    { value: 'Résilié', label: 'Résilié', color: 'danger' }
];
// Ensure mapping consistency with form's exported STATUT_OPTIONS for select values
const STATUT_SELECT_OPTIONS = FORM_STATUT_OPTIONS;
const getStatusColor = (statusValue) => {
    const option = STATUT_OPTIONS.find(opt => opt.value === statusValue);
    return option ? option.color : "light";
};
// --- End Helpers ---

// --- Main Page Component ---
const MarchePublicPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const action = searchParams.get('action');
    const isCreating = action === 'create';

    // --- Options for relation-based filters ---
    const [fonctionnaireOptions, setFonctionnaireOptions] = useState([]);
    const [conventionOptions, setConventionOptions] = useState([]);
    const [appelOffreOptions, setAppelOffreOptions] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setOptionsLoading(true);
        Promise.all([
            axios.get(`${BASE_API_URL}/options/fonctionnaires`, { withCredentials: true }),
            axios.get(`${BASE_API_URL}/options/conventions`, { withCredentials: true }),
            axios.get(`${BASE_API_URL}/options/appel-offres`, { withCredentials: true })
        ]).then(([foncRes, convRes, aoRes]) => {
            if (!isMounted) return;
            const foncPayload = Array.isArray(foncRes.data?.fonctionnaires) ? foncRes.data.fonctionnaires : (foncRes.data || []);
            setFonctionnaireOptions((foncPayload || []).map(f => ({ value: f.id, label: f.nom_complet || f.name || `Fonctionnaire ${f.id}` })));
            const convPayload = Array.isArray(convRes.data?.conventions) ? convRes.data.conventions : (convRes.data || []);
            setConventionOptions((convPayload || []).map(c => ({ value: c.id, label: c.Intitule || c.intitule || `Convention ${c.id}` })));
            const aoPayload = Array.isArray(aoRes.data?.appel_offres) ? aoRes.data.appel_offres : (aoRes.data || []);
            setAppelOffreOptions((aoPayload || []).map(a => ({ value: a.id, label: a.numero || a.intitule || `AO ${a.id}` })));
        }).catch(() => {
            if (!isMounted) return;
            setFonctionnaireOptions([]); setConventionOptions([]); setAppelOffreOptions([]);
        }).finally(() => { if (isMounted) setOptionsLoading(false); });
        return () => { isMounted = false; };
    }, []);

    // --- Column Definitions for the SUMMARY table ---
    const marcheColumns = useMemo(() => [
        { accessorKey: 'numero_marche', header: 'N° Marché', size: 130, meta: { align: 'left', enableGlobalFilter: true } },
        {
            accessorKey: 'intitule', header: 'Intitulé Marché', size: 220,
            meta: { align: 'left', enableGlobalFilter: true },
            cell: info => <div className="text-truncate" style={{ maxWidth: '220px' }} title={info.getValue()}>{info.getValue()}</div>,
        },
        {
            id: 'appelOffreLIEE', // Unique column ID
            header: "Appel d'Offre", // Column header text
            size: 100, // Adjust size as needed
            accessorFn: row => {
                console.log("Processing row for AO column:", row);
                console.log("Accessing row.appelOffre:", row.appel_offre);
                 // Access the nested object and its 'numero' property
                 // This relies on the backend eager-loading 'appelOffre' with at least 'id' and 'numero'
                 // console.log("Row data for AO accessor:", row); // Uncomment to debug row structure
                 return row.appel_offre ? row.appel_offre.numero : null;
            },
            cell: info => {
                const aoNumero = info.getValue();
                // Display the number with a link icon, similar to convention
                return aoNumero
                    ? <div className="text-truncate" style={{ maxWidth: '150px' }} title={aoNumero}>
                          <FontAwesomeIcon icon={faLink} className="me-1 text-muted small" /> {aoNumero}
                      </div>
                    : '-'; // Display '-' if no related Appel d'Offre
            },
            meta: {
                align: 'left', // Align left
                enableGlobalFilter: true // Include this field in global search
            },
        },
        {
            id: 'conventionLIEE', // Unique column ID
            header: 'Convention Liée',
            size: 220,
            accessorFn: row => {
                 // *** VERIFY these names match the JSON response from the backend ***
                 // 1. Is the nested object key 'convention'?
                 // 2. Is the title field key 'Intitule' (case-sensitive)?
                 const relationshipKey = 'convention'; // <-- Check this in API response
                 const titleFieldKey = 'Intitule';    // <-- Check this in API response (case-sensitive!)

                 // Add logging here to inspect the row data if needed:
                 // console.log("Row data for convention accessor:", row);

                 return row[relationshipKey] ? row[relationshipKey][titleFieldKey] : null;
            },
            cell: info => {
                const conventionTitle = info.getValue();
                return conventionTitle
                    ? <div className="text-truncate" style={{ maxWidth: '220px' }} title={conventionTitle}>
                          <FontAwesomeIcon icon={faLink} className="me-1 text-muted small" /> {conventionTitle}
                      </div>
                    : '-';
            },
            meta: {
                align: 'left',
                enableGlobalFilter: true
            },
        },
        // *** END CORRECTED CONVENTION COLUMN ***
        {
            accessorKey: 'type_marche', header: 'Type', size: 80, filterFn: 'equalsString',
            meta: { align: 'center', enableGlobalFilter: true },
        },
        {
            accessorKey: 'mode_passation', header: 'Mode de passation', size: 160, filterFn: 'equalsString',
            meta: { align: 'left', enableGlobalFilter: true },
            cell: info => <div className="text-truncate" style={{ maxWidth: '160px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
        },
        {
            accessorKey: 'montant_attribue', header: 'Montant Attribué', size: 140,
            cell: info => formatCurrency(info.getValue()),
            meta: { align: 'right', enableGlobalFilter: false }
        },
        {
            accessorKey: 'attributaire', header: 'Attributaire', size: 130,
            meta: { align: 'left', enableGlobalFilter: true },
            cell: info => <div className="text-truncate" style={{ maxWidth: '130px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
        },
        {
            accessorKey: 'statut', header: 'Statut', size: 110, filterFn: 'equalsString',
            cell: info => {
                const status = info.getValue();
                const color = getStatusColor(status);
                return status ? (<Badge bg={color} text={color === 'warning' || color === 'light' ? 'dark' : 'white'} className="w-100 text-truncate">{status}</Badge>) : '-';
            },
            meta: { align: 'center', enableGlobalFilter: true },
        },
        {
            accessorKey: 'date_notification', header: 'Date Notif.', size: 110,
            cell: info => formatDate(info.getValue()),
            meta: { align: 'center', enableGlobalFilter: false }
        },
        // --- Hidden numeric/date/progress/linkage filters ---
        { accessorKey: 'budget_previsionnel', id: 'budget_previsionnel', header: 'Budget Prévisionnel', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'numericRange' },
        { accessorKey: 'avancement_physique', id: 'avancement_physique', header: 'Avancement Physique', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'numericRange' },
        { accessorKey: 'avancement_financier', id: 'avancement_financier', header: 'Avancement Financier', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'numericRange' },
        { accessorKey: 'date_publication', id: 'date_publication', header: 'Date Publication', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'dateRange' },
        { accessorKey: 'date_limite_offres', id: 'date_limite_offres', header: 'Date Limite Offres', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'dateRange' },
        { accessorKey: 'date_debut_execution', id: 'date_debut_execution', header: 'Date Début Exécution', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'dateRange' },
        { accessorKey: 'date_engagement_tresorerie', id: 'date_engagement_tresorerie', header: 'Date Engagement Trésorerie', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'dateRange' },
        { id: 'has_convention', header: 'A une convention', size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'hasConvention' },
        { id: 'filter_convention', header: 'Convention (ID)', size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'byConventionId' },
        { id: 'has_appel_offre', header: "A un appel d'offre", size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'hasAO' },
        { id: 'filter_ao', header: "Appel d'Offre (ID)", size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'byAOId' },
        { id: 'has_lots', header: 'A des lots', size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'hasLots' },
        { id: 'lots_count', header: 'Nombre de lots', size: 0, accessorFn: row => Array.isArray(row.lots) ? row.lots.length : 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'numericRange' },
        { accessorKey: 'duree_marche', id: 'duree_marche', header: 'Durée Marché', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'numericRange' },
        { accessorKey: 'source_financement', id: 'source_financement', header: 'Source Financement', size: 0, meta: { enableGlobalFilter: true }, enableHiding: true, filterFn: 'includesString' },
        // --- Hidden filter-only columns for file-based filtering ---
        {
            id: 'files_title',
            header: 'Titre Fichier (filtre)',
            size: 0,
            accessorFn: row => row, // keep access to full row in filter fn
            meta: { align: 'left', enableGlobalFilter: false },
            enableHiding: true,
            filterFn: 'fileTitleIncludes',
        },
        {
            id: 'files_type',
            header: 'Catégorie Fichier (filtre)',
            size: 0,
            accessorFn: row => row,
            meta: { align: 'left', enableGlobalFilter: false },
            enableHiding: true,
            filterFn: 'fileTypeIncludes',
        },
        // Text blob for global search on files titles/categories
        {
            id: 'files_search',
            header: 'Recherche Fichiers',
            size: 0,
            accessorFn: row => {
                const general = Array.isArray(row.fichiers_joints_generaux) ? row.fichiers_joints_generaux : [];
                const lotFiles = Array.isArray(row.lots) ? row.lots.flatMap(l => Array.isArray(l.fichiers_joints) ? l.fichiers_joints : []) : [];
                const files = [...general, ...lotFiles];
                if (files.length === 0) return '';
                return files.map(f => [f.intitule, f.nom_fichier, f.categorie, f.type_fichier].filter(Boolean).join(' ')).join(' | ');
            },
            meta: { align: 'left', enableGlobalFilter: true },
            enableHiding: true,
        },
        // Boolean filter-only column for has files
        {
            id: 'has_files',
            header: 'A des fichiers',
            size: 0,
            accessorFn: row => row,
            meta: { align: 'left', enableGlobalFilter: false },
            enableHiding: true,
            filterFn: 'hasFiles',
        },
    ], []); // Dependency array is empty

    // --- Filter Rendering Function ---
    const renderMarcheFilters = useCallback((table) => {
        if (!table) return null;
        const typeColumn = table.getColumn('type_marche');
        const modePassationColumn = table.getColumn('mode_passation');
        const statusColumn = table.getColumn('statut');
        const filesTitleColumn = table.getColumn('files_title');
        const filesTypeColumn = table.getColumn('files_type');
        const hasFilesColumn = table.getColumn('has_files');
        const budgetColumn = table.getColumn('budget_previsionnel');
        const montantColumn = table.getColumn('montant_attribue');
        const avPhysColumn = table.getColumn('avancement_physique');
        const avFinColumn = table.getColumn('avancement_financier');
        const datePubColumn = table.getColumn('date_publication');
        const dateLimOffresColumn = table.getColumn('date_limite_offres');
        const dateNotifColumn = table.getColumn('date_notification');
        const dateDebutExecColumn = table.getColumn('date_debut_execution');
        const dateEngTresColumn = table.getColumn('date_engagement_tresorerie');
        const hasConventionColumn = table.getColumn('has_convention');
        const filterConventionColumn = table.getColumn('filter_convention');
        const hasAOColumn = table.getColumn('has_appel_offre');
        const filterAOColumn = table.getColumn('filter_ao');
        const hasLotsColumn = table.getColumn('has_lots');
        const lotsCountColumn = table.getColumn('lots_count');
        const dureeMarcheColumn = table.getColumn('duree_marche');
        const sourceFinColumn = table.getColumn('source_financement');
        const attributaireColumn = table.getColumn('attributaire');
        const isAnyColumnFiltered = table.getState().columnFilters.length > 0;
        return (
            <Form>
                {/* Type Filter */}
                <Form.Group controlId="filterTypeMarche" className="mb-3">
                   <Form.Label className="small mb-1 fw-bold">Type de Marché</Form.Label>
                   <Select
                       inputId="filterTypeMarcheSelect"
                       options={MARCHE_TYPE_OPTIONS}
                       value={MARCHE_TYPE_OPTIONS.find(option => option.value === typeColumn?.getFilterValue()) || null}
                       onChange={option => typeColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder="Tous Types..." isClearable
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
                       aria-label="Filtrer par type de marché"
                   />
                </Form.Group>
                {/* Mode de passation Filter */}
                <Form.Group controlId="filterModePassation" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Mode de passation</Form.Label>
                    <Select
                        inputId="filterModePassationSelect"
                        options={MODE_PASSATION_OPTIONS}
                        value={MODE_PASSATION_OPTIONS.find(option => option.value === modePassationColumn?.getFilterValue()) || null}
                        onChange={option => modePassationColumn?.setFilterValue(option?.value ?? undefined)}
                        placeholder="Tous Modes..." isClearable
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
                        aria-label="Filtrer par mode de passation"
                    />
                </Form.Group>
                {/* Files Title Filter */}
                <Form.Group controlId="filterFilesTitle" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Titre du Fichier</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Contient..."
                        value={filesTitleColumn?.getFilterValue() || ''}
                        onChange={e => filesTitleColumn?.setFilterValue(e.target.value || undefined)}
                        aria-label="Filtrer par intitulé de fichier"
                    />
                </Form.Group>
                {/* Files Category Filter */}
                <Form.Group controlId="filterFilesType" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Catégorie de Fichier</Form.Label>
                    <Select
                        inputId="filterFilesCategorySelect"
                        options={MARCHE_FICHIER_CATEGORIES}
                        value={MARCHE_FICHIER_CATEGORIES.find(option => option.value === filesTypeColumn?.getFilterValue()) || null}
                        onChange={option => filesTypeColumn?.setFilterValue(option?.value ?? undefined)}
                        placeholder="Toutes Catégories..." isClearable
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
                        aria-label="Filtrer par catégorie de fichier"
                    />
                </Form.Group>
                {/* Has Files Toggle */}
                <Form.Group controlId="filterHasFiles" className="mb-3">
                    <Form.Check
                        type="switch"
                        id="has-files-switch"
                        label="Afficher uniquement les marchés avec fichiers"
                        checked={Boolean(hasFilesColumn?.getFilterValue())}
                        onChange={e => hasFilesColumn?.setFilterValue(e.target.checked || undefined)}
                    />
                </Form.Group>
                {/* Budget & Amount Range */}
                <Form.Group controlId="filterBudgetRange" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Budget Prévisionnel (MAD)</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="number" placeholder="Min" value={budgetColumn?.getFilterValue()?.min ?? ''} onChange={e => budgetColumn?.setFilterValue(v => ({ ...(v||{}), min: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        <Form.Control type="number" placeholder="Max" value={budgetColumn?.getFilterValue()?.max ?? ''} onChange={e => budgetColumn?.setFilterValue(v => ({ ...(v||{}), max: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                    </div>
                </Form.Group>
                <Form.Group controlId="filterMontantRange" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Montant Attribué (MAD)</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="number" placeholder="Min" value={montantColumn?.getFilterValue()?.min ?? ''} onChange={e => montantColumn?.setFilterValue(v => ({ ...(v||{}), min: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        <Form.Control type="number" placeholder="Max" value={montantColumn?.getFilterValue()?.max ?? ''} onChange={e => montantColumn?.setFilterValue(v => ({ ...(v||{}), max: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                    </div>
                </Form.Group>
                {/* Progress Range */}
                <Form.Group controlId="filterAvancementPhysique" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Avancement Physique (%)</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="number" placeholder="Min" value={avPhysColumn?.getFilterValue()?.min ?? ''} onChange={e => avPhysColumn?.setFilterValue(v => ({ ...(v||{}), min: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        <Form.Control type="number" placeholder="Max" value={avPhysColumn?.getFilterValue()?.max ?? ''} onChange={e => avPhysColumn?.setFilterValue(v => ({ ...(v||{}), max: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                    </div>
                </Form.Group>
                <Form.Group controlId="filterAvancementFinancier" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Avancement Financier (%)</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="number" placeholder="Min" value={avFinColumn?.getFilterValue()?.min ?? ''} onChange={e => avFinColumn?.setFilterValue(v => ({ ...(v||{}), min: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        <Form.Control type="number" placeholder="Max" value={avFinColumn?.getFilterValue()?.max ?? ''} onChange={e => avFinColumn?.setFilterValue(v => ({ ...(v||{}), max: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                    </div>
                </Form.Group>
                {/* Date Ranges */}
                <Form.Group controlId="filterDatePublication" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Date de publication</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="date" value={datePubColumn?.getFilterValue()?.from ?? ''} onChange={e => datePubColumn?.setFilterValue(v => ({ ...(v||{}), from: e.target.value || undefined }))} />
                        <Form.Control type="date" value={datePubColumn?.getFilterValue()?.to ?? ''} onChange={e => datePubColumn?.setFilterValue(v => ({ ...(v||{}), to: e.target.value || undefined }))} />
                    </div>
                </Form.Group>
                <Form.Group controlId="filterDateLimOffres" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Date limite des offres</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="date" value={dateLimOffresColumn?.getFilterValue()?.from ?? ''} onChange={e => dateLimOffresColumn?.setFilterValue(v => ({ ...(v||{}), from: e.target.value || undefined }))} />
                        <Form.Control type="date" value={dateLimOffresColumn?.getFilterValue()?.to ?? ''} onChange={e => dateLimOffresColumn?.setFilterValue(v => ({ ...(v||{}), to: e.target.value || undefined }))} />
                    </div>
                </Form.Group>
                <Form.Group controlId="filterDateNotification" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Date de notification</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="date" value={dateNotifColumn?.getFilterValue()?.from ?? ''} onChange={e => dateNotifColumn?.setFilterValue(v => ({ ...(v||{}), from: e.target.value || undefined }))} />
                        <Form.Control type="date" value={dateNotifColumn?.getFilterValue()?.to ?? ''} onChange={e => dateNotifColumn?.setFilterValue(v => ({ ...(v||{}), to: e.target.value || undefined }))} />
                    </div>
                </Form.Group>
                <Form.Group controlId="filterDateDebutExec" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Date de début d'exécution</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="date" value={dateDebutExecColumn?.getFilterValue()?.from ?? ''} onChange={e => dateDebutExecColumn?.setFilterValue(v => ({ ...(v||{}), from: e.target.value || undefined }))} />
                        <Form.Control type="date" value={dateDebutExecColumn?.getFilterValue()?.to ?? ''} onChange={e => dateDebutExecColumn?.setFilterValue(v => ({ ...(v||{}), to: e.target.value || undefined }))} />
                    </div>
                </Form.Group>
                <Form.Group controlId="filterDateEngTres" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Date d'engagement Trésorerie</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="date" value={dateEngTresColumn?.getFilterValue()?.from ?? ''} onChange={e => dateEngTresColumn?.setFilterValue(v => ({ ...(v||{}), from: e.target.value || undefined }))} />
                        <Form.Control type="date" value={dateEngTresColumn?.getFilterValue()?.to ?? ''} onChange={e => dateEngTresColumn?.setFilterValue(v => ({ ...(v||{}), to: e.target.value || undefined }))} />
                    </div>
                </Form.Group>
                {/* Linkage Filters */}
                <Form.Group controlId="filterHasConvention" className="mb-3">
                    <Form.Check type="switch" id="has-convention-switch" label="Avec convention liée" checked={Boolean(hasConventionColumn?.getFilterValue())} onChange={e => hasConventionColumn?.setFilterValue(e.target.checked || undefined)} />
                </Form.Group>
                <Form.Group controlId="filterConventionSelect" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Convention</Form.Label>
                    <Select inputId="filterConventionSelectInput" isLoading={optionsLoading} options={conventionOptions} value={conventionOptions.find(o => o.value === filterConventionColumn?.getFilterValue()) || null} onChange={opt => filterConventionColumn?.setFilterValue(opt?.value ?? undefined)} isClearable placeholder="Toutes Conventions..." styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body} />
                </Form.Group>
                <Form.Group controlId="filterHasAO" className="mb-3">
                    <Form.Check type="switch" id="has-ao-switch" label="Avec appel d'offre lié" checked={Boolean(hasAOColumn?.getFilterValue())} onChange={e => hasAOColumn?.setFilterValue(e.target.checked || undefined)} />
                </Form.Group>
                <Form.Group controlId="filterAOSelect" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Appel d'Offre</Form.Label>
                    <Select inputId="filterAOSelectInput" isLoading={optionsLoading} options={appelOffreOptions} value={appelOffreOptions.find(o => o.value === filterAOColumn?.getFilterValue()) || null} onChange={opt => filterAOColumn?.setFilterValue(opt?.value ?? undefined)} isClearable placeholder="Tous Appels d'Offre..." styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body} />
                </Form.Group>
                <Form.Group controlId="filterHasLots" className="mb-3">
                    <Form.Check type="switch" id="has-lots-switch" label="Avec lots" checked={Boolean(hasLotsColumn?.getFilterValue())} onChange={e => hasLotsColumn?.setFilterValue(e.target.checked || undefined)} />
                </Form.Group>
                <Form.Group controlId="filterLotsCount" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Nombre de lots</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="number" placeholder="Min" value={lotsCountColumn?.getFilterValue()?.min ?? ''} onChange={e => lotsCountColumn?.setFilterValue(v => ({ ...(v||{}), min: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        <Form.Control type="number" placeholder="Max" value={lotsCountColumn?.getFilterValue()?.max ?? ''} onChange={e => lotsCountColumn?.setFilterValue(v => ({ ...(v||{}), max: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                    </div>
                </Form.Group>
                {/* Duration */}
                <Form.Group controlId="filterDureeMarche" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Durée du marché (jours)</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="number" placeholder="Min" value={dureeMarcheColumn?.getFilterValue()?.min ?? ''} onChange={e => dureeMarcheColumn?.setFilterValue(v => ({ ...(v||{}), min: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        <Form.Control type="number" placeholder="Max" value={dureeMarcheColumn?.getFilterValue()?.max ?? ''} onChange={e => dureeMarcheColumn?.setFilterValue(v => ({ ...(v||{}), max: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                    </div>
                </Form.Group>
                {/* Text Contains */}
                <Form.Group controlId="filterSourceFinancement" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Source de financement</Form.Label>
                    <Form.Control type="text" placeholder="Contient..." value={sourceFinColumn?.getFilterValue() || ''} onChange={e => sourceFinColumn?.setFilterValue(e.target.value || undefined)} />
                </Form.Group>
                <Form.Group controlId="filterAttributaire" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Attributaire</Form.Label>
                    <Form.Control type="text" placeholder="Contient..." value={attributaireColumn?.getFilterValue() || ''} onChange={e => attributaireColumn?.setFilterValue(e.target.value || undefined)} />
                </Form.Group>
                {/* Status Filter */}
                <Form.Group controlId="filterStatus" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Statut</Form.Label>
                   <Select
                       inputId="filterStatusSelect"
                       options={STATUT_SELECT_OPTIONS}
                       value={STATUT_SELECT_OPTIONS.find(option => option.value === statusColumn?.getFilterValue()) || null}
                       onChange={option => statusColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder="Tous Statuts..." isClearable
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
                       aria-label="Filtrer par statut"
                   />
                </Form.Group>
                {/* Reset Button */}
                <Button variant="outline-secondary" size="sm" onClick={() => table.resetColumnFilters()} disabled={!isAnyColumnFiltered} className="w-100 mt-3">
                   <FontAwesomeIcon icon={faTimes} className="me-2"/> Réinitialiser Filtres Spécifiques
                </Button>
            </Form>
        );
    }, []);


    // --- DynamicTable Configuration ---
    // Convention column ('conventionLIEE') is hidden by default
    const defaultVisibleCols = useMemo(() => [
        'numero_marche',
        'intitule', // Marche's intitule
        'type_marche',
        'statut',
        'montant_attribue',
        'actions',
        'appelOffreLIEE', 
        'conventionLIEE' // Add the ID here if you want it visible by default
    ], []);
    const handleFormClose = (refreshNeeded = false) => {
        setSearchParams({});
      
    };
    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
              {isCreating ? (
                                      // Show the form if action=create
                                      <MarchePublicForm
                                          mode="create" // Tell the form it's in create mode
                                          onClose={handleFormClose} // Pass handler for Cancel button
                                          onSuccess={() => handleFormClose(true)} // Pass handler for successful Save (trigger refresh)
                                          baseApiUrl={BASE_API_URL} // Pass the API URL
                                      />
                                  ) :  <DynamicTable
                // Ensure fetchUrl returns data including the nested 'convention' object
                fetchUrl="/marches-publics"
                dataKey="marches_publics"
                deleteUrlBase="/marches-publics"
                baseApiUrl={BASE_API_URL}

                columns={marcheColumns} // Includes the *corrected* convention column definition
                itemName="Marché Public"
                itemNamePlural="Marchés Publics"
                identifierKey="id"
                displayKeyForDelete="numero_marche"

                itemsPerPage={10}
                defaultVisibleColumns={defaultVisibleCols} // Convention column visibility controlled here
                renderFilters={renderMarcheFilters}
                enableGlobalSearch={true}
                customFilterFunctions={{
                    numericRange: (row, columnId, filterValue) => {
                        if (!filterValue || (filterValue.min == null && filterValue.max == null)) return true;
                        const raw = row.getValue(columnId);
                        const value = raw == null || raw === '' ? NaN : Number(raw);
                        if (isNaN(value)) return false;
                        if (filterValue.min != null && value < filterValue.min) return false;
                        if (filterValue.max != null && value > filterValue.max) return false;
                        return true;
                    },
                    dateRange: (row, columnId, filterValue) => {
                        if (!filterValue || (!filterValue.from && !filterValue.to)) return true;
                        const raw = row.getValue(columnId);
                        if (!raw) return false;
                        const dateStr = String(raw).split(' ')[0];
                        const d = new Date(dateStr + 'T00:00:00Z');
                        if (isNaN(d.getTime())) return false;
                        if (filterValue.from) {
                            const from = new Date(filterValue.from + 'T00:00:00Z');
                            if (d < from) return false;
                        }
                        if (filterValue.to) {
                            const to = new Date(filterValue.to + 'T23:59:59Z');
                            if (d > to) return false;
                        }
                        return true;
                    },
                    fileTitleIncludes: (row, _columnId, filterValue) => {
                        const query = String(filterValue || '').trim().toLowerCase();
                        if (!query) return true;
                        const original = row?.original || {};
                        const general = Array.isArray(original.fichiers_joints_generaux) ? original.fichiers_joints_generaux : [];
                        const lotFiles = Array.isArray(original.lots) ? original.lots.flatMap(l => Array.isArray(l.fichiers_joints) ? l.fichiers_joints : []) : [];
                        const files = [...general, ...lotFiles];
                        if (files.length === 0) return false; // If filtering by files, exclude rows with none
                        return files.some(f => {
                            const title = (f.intitule || f.nom_fichier || '').toString().toLowerCase();
                            return title.includes(query);
                        });
                    },
                    fileTypeIncludes: (row, _columnId, filterValue) => {
                        const query = String(filterValue || '').trim().toLowerCase();
                        if (!query) return true;
                        const original = row?.original || {};
                        const general = Array.isArray(original.fichiers_joints_generaux) ? original.fichiers_joints_generaux : [];
                        const lotFiles = Array.isArray(original.lots) ? original.lots.flatMap(l => Array.isArray(l.fichiers_joints) ? l.fichiers_joints : []) : [];
                        const files = [...general, ...lotFiles];
                        if (files.length === 0) return false;
                        return files.some(f => {
                            const category = (f.categorie || '').toString().toLowerCase();
                            // Strictly prioritize categories per request
                            return category.includes(query);
                        });
                    },
                    hasFiles: (row, _columnId, filterValue) => {
                        const enabled = Boolean(filterValue);
                        if (!enabled) return true;
                        const original = row?.original || {};
                        const general = Array.isArray(original.fichiers_joints_generaux) ? original.fichiers_joints_generaux : [];
                        const lotFiles = Array.isArray(original.lots) ? original.lots.flatMap(l => Array.isArray(l.fichiers_joints) ? l.fichiers_joints : []) : [];
                        return (general.length + lotFiles.length) > 0;
                    },
                    hasConvention: (row, _columnId, filterValue) => {
                        const enabled = Boolean(filterValue);
                        if (!enabled) return true;
                        const conv = row?.original?.convention;
                        return Boolean(conv && conv.id);
                    },
                    byConventionId: (row, _columnId, filterValue) => {
                        if (!filterValue) return true;
                        const conv = row?.original?.convention;
                        return conv && String(conv.id) === String(filterValue);
                    },
                    hasAO: (row, _columnId, filterValue) => {
                        const enabled = Boolean(filterValue);
                        if (!enabled) return true;
                        const ao = row?.original?.appel_offre;
                        return Boolean(ao && ao.id);
                    },
                    byAOId: (row, _columnId, filterValue) => {
                        if (!filterValue) return true;
                        const ao = row?.original?.appel_offre;
                        return ao && String(ao.id) === String(filterValue);
                    },
                    hasLots: (row, _columnId, filterValue) => {
                        const enabled = Boolean(filterValue);
                        if (!enabled) return true;
                        const lots = row?.original?.lots;
                        return Array.isArray(lots) && lots.length > 0;
                    },
                }}

                CreateComponent={MarchePublicForm}
                ViewComponent={MarchePublicVisualisation}
                EditComponent={MarchePublicForm}

                actionColumnWidth={90}
                tableClassName="table-striped table-hover"
            />}
        </div>
    );
};

export default MarchePublicPage;