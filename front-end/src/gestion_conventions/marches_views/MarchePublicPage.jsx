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

    const [conventionOptions, setConventionOptions] = useState([]);
    const [appelOffreOptions, setAppelOffreOptions] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        setOptionsLoading(true);
        Promise.all([
            axios.get(`${BASE_API_URL}/options/conventions`, { withCredentials: true }),
            axios.get(`${BASE_API_URL}/options/appel-offres`, { withCredentials: true })
        ]).then(([convRes, aoRes]) => {
            if (!isMounted) return;
            const convPayload = convRes.data || [];
            setConventionOptions((convPayload).map(c => ({ value: c.value, label: c.label || `Convention ${c.value}` })));
            const aoPayload = aoRes.data || [];
            setAppelOffreOptions((aoPayload).map(a => ({ value: a.value, label: a.label || `AO ${a.value}` })));
        }).catch(() => {
            if (!isMounted) return;
            setConventionOptions([]); setAppelOffreOptions([]);
        }).finally(() => { if (isMounted) setOptionsLoading(false); });
        return () => { isMounted = false; };
    }, []);

    const marcheColumns = useMemo(() => [
        { accessorKey: 'numero_marche', header: 'N° Marché', size: 130, meta: { align: 'left', enableGlobalFilter: true } },
        { accessorKey: 'intitule', header: 'Intitulé Marché', size: 220, meta: { align: 'left', enableGlobalFilter: true }, cell: info => <div className="text-truncate" style={{ maxWidth: '220px' }} title={info.getValue()}>{info.getValue()}</div>, },
        { id: 'appelOffreLIEE', header: "Appel d'Offre", size: 100, accessorFn: row => row.appel_offre ? row.appel_offre.numero : null, cell: info => { const aoNumero = info.getValue(); return aoNumero ? <div className="text-truncate" style={{ maxWidth: '150px' }} title={aoNumero}> <FontAwesomeIcon icon={faLink} className="me-1 text-muted small" /> {aoNumero} </div> : '-'; }, meta: { align: 'left', enableGlobalFilter: true }, },
        { id: 'conventionLIEE', header: 'Convention Liée', size: 220, accessorFn: row => row.convention ? row.convention.Intitule : null, cell: info => { const conventionTitle = info.getValue(); return conventionTitle ? <div className="text-truncate" style={{ maxWidth: '220px' }} title={conventionTitle}> <FontAwesomeIcon icon={faLink} className="me-1 text-muted small" /> {conventionTitle} </div> : '-'; }, meta: { align: 'left', enableGlobalFilter: true }, },
        { accessorKey: 'type_marche', header: 'Type', size: 80, filterFn: 'equalsString', meta: { align: 'center', enableGlobalFilter: true }, },
        { accessorKey: 'mode_passation', header: 'Mode de passation', size: 160, filterFn: 'equalsString', meta: { align: 'left', enableGlobalFilter: true }, cell: info => <div className="text-truncate" style={{ maxWidth: '160px' }} title={info.getValue()}>{info.getValue() || '-'}</div>, },
        { accessorKey: 'montant_attribue', header: 'Montant Attribué', size: 140, cell: info => formatCurrency(info.getValue()), meta: { align: 'right', enableGlobalFilter: false } },
        { accessorKey: 'attributaire', header: 'Attributaire', size: 130, meta: { align: 'left', enableGlobalFilter: true }, cell: info => <div className="text-truncate" style={{ maxWidth: '130px' }} title={info.getValue()}>{info.getValue() || '-'}</div>, },
        { accessorKey: 'statut', header: 'Statut', size: 110, filterFn: 'equalsString', cell: info => { const status = info.getValue(); const color = getStatusColor(status); return status ? (<Badge bg={color} text={color === 'warning' || color === 'light' ? 'dark' : 'white'} className="w-100 text-truncate">{status}</Badge>) : '-'; }, meta: { align: 'center', enableGlobalFilter: true }, },
        { accessorKey: 'date_notification', header: 'Date Notif.', size: 110, cell: info => formatDate(info.getValue()), meta: { align: 'center', enableGlobalFilter: false } },
        { accessorKey: 'budget_previsionnel', id: 'budget_previsionnel', header: 'Budget Prévisionnel', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'numericRange' },
        { accessorKey: 'avancement_physique', id: 'avancement_physique', header: 'Avancement Physique', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'numericRange' },
        { accessorKey: 'avancement_financier', id: 'avancement_financier', header: 'Avancement Financier', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'numericRange' },
        { accessorKey: 'date_publication', id: 'date_publication', header: 'Date Publication', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'dateRange' },
        { accessorKey: 'date_limite_offres', id: 'date_limite_offres', header: 'Date Limite Offres', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'dateRange' },
        { accessorKey: 'date_debut_execution', id: 'date_debut_execution', header: 'Date Début Exécution', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'dateRange' },
        { accessorKey: 'date_engagement_tresorerie', id: 'date_engagement_tresorerie', header: 'Date Engagement Trésorerie', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'dateRange' },
        { accessorKey: 'date_visa_tresorerie', id: 'date_visa_tresorerie', header: 'Date Visa Trésorerie', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'dateRange' },
        { accessorKey: 'date_approbation_president', id: 'date_approbation_president', header: 'Date Approbation Président', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'dateRange' },
        { id: 'has_convention', header: 'A une convention', size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: false, filterFn: 'hasConvention' },
        { id: 'filter_convention', header: 'Convention (ID)', size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: false, filterFn: 'byConventionId' },
        { id: 'has_appel_offre', header: "A un appel d'offre", size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: false, filterFn: 'hasAO' },
        { id: 'filter_ao', header: "Appel d'Offre (ID)", size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: false, filterFn: 'byAOId' },
        { id: 'has_lots', header: 'A des lots', size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: false, filterFn: 'hasLots' },
        { id: 'lots_count', header: 'Nombre de lots', size: 0, accessorFn: row => Array.isArray(row.lots) ? row.lots.length : 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'numericRange' },
        { accessorKey: 'duree_marche', id: 'duree_marche', header: 'Durée Marché', size: 0, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'numericRange' },
        { accessorKey: 'source_financement', id: 'source_financement', header: 'Source Financement', size: 0, meta: { enableGlobalFilter: true }, enableHiding: true, filterFn: 'includesString' },
        { id: 'files_title', header: 'Titre Fichier (filtre)', size: 0, accessorFn: row => row, meta: { align: 'left', enableGlobalFilter: false }, enableHiding: false, filterFn: 'fileTitleIncludes', },
        { id: 'files_type', header: 'Catégorie Fichier (filtre)', size: 0, accessorFn: row => row, meta: { align: 'left', enableGlobalFilter: false }, enableHiding: false, filterFn: 'fileTypeIncludes', },
        { id: 'files_search', header: 'Recherche Fichiers', size: 0, accessorFn: row => { const general = Array.isArray(row.fichiers_joints_generaux) ? row.fichiers_joints_generaux : []; const lotFiles = Array.isArray(row.lots) ? row.lots.flatMap(l => Array.isArray(l.fichiers_joints) ? l.fichiers_joints : []) : []; const files = [...general, ...lotFiles]; if (files.length === 0) return ''; return files.map(f => [f.intitule, f.nom_fichier, f.categorie, f.type_fichier].filter(Boolean).join(' ')).join(' | '); }, meta: { align: 'left', enableGlobalFilter: true }, enableHiding: false, },
        { id: 'has_files', header: 'A des fichiers', size: 0, accessorFn: row => row, meta: { align: 'left', enableGlobalFilter: false }, enableHiding: false, filterFn: 'hasFiles', },
    ], []);

    const renderMarcheFilters = useCallback((table) => {
        if (!table) return null;
        const columns = {
            type: table.getColumn('type_marche'),
            modePassation: table.getColumn('mode_passation'),
            status: table.getColumn('statut'),
            filesTitle: table.getColumn('files_title'),
            filesType: table.getColumn('files_type'),
            hasFiles: table.getColumn('has_files'),
            budget: table.getColumn('budget_previsionnel'),
            montant: table.getColumn('montant_attribue'),
            avPhys: table.getColumn('avancement_physique'),
            avFin: table.getColumn('avancement_financier'),
            datePub: table.getColumn('date_publication'),
            dateLimOffres: table.getColumn('date_limite_offres'),
            dateNotif: table.getColumn('date_notification'),
            dateDebutExec: table.getColumn('date_debut_execution'),
            dateEngTres: table.getColumn('date_engagement_tresorerie'),
            dateVisaTres: table.getColumn('date_visa_tresorerie'),
            dateApprobPres: table.getColumn('date_approbation_president'),
            hasConvention: table.getColumn('has_convention'),
            filterConvention: table.getColumn('filter_convention'),
            hasAO: table.getColumn('has_appel_offre'),
            filterAO: table.getColumn('filter_ao'),
            hasLots: table.getColumn('has_lots'),
            lotsCount: table.getColumn('lots_count'),
            dureeMarche: table.getColumn('duree_marche'),
            sourceFin: table.getColumn('source_financement'),
            attributaire: table.getColumn('attributaire')
        };
        const isAnyColumnFiltered = table.getState().columnFilters.length > 0;
        
        const NumericRangeFilter = ({ column, label }) => (
            <Form.Group className="mb-3">
                <Form.Label className="small mb-1 fw-bold">{label}</Form.Label>
                <div className="d-flex gap-2">
                    <Form.Control type="number" placeholder="Min" value={column?.getFilterValue()?.min ?? ''} onChange={e => column?.setFilterValue(v => ({ ...(v||{}), min: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                    <Form.Control type="number" placeholder="Max" value={column?.getFilterValue()?.max ?? ''} onChange={e => column?.setFilterValue(v => ({ ...(v||{}), max: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                </div>
            </Form.Group>
        );

        const DateRangeFilter = ({ column, label }) => (
            <Form.Group className="mb-3">
                <Form.Label className="small mb-1 fw-bold">{label}</Form.Label>
                <div className="d-flex gap-2">
                    <Form.Control type="date" value={column?.getFilterValue()?.from ?? ''} onChange={e => column?.setFilterValue(v => ({ ...(v||{}), from: e.target.value || undefined }))} />
                    <Form.Control type="date" value={column?.getFilterValue()?.to ?? ''} onChange={e => column?.setFilterValue(v => ({ ...(v||{}), to: e.target.value || undefined }))} />
                </div>
            </Form.Group>
        );

        return (
            // --- CHANGE START ---
            <>
                <div style={{ height: 'calc(100% - 50px)', overflowY: 'auto', paddingRight: '15px' }}>
                    <Form>
                        <Form.Group controlId="filterTypeMarche" className="mb-3">
                            <Form.Label className="small mb-1 fw-bold">Type de Marché</Form.Label>
                            <Select inputId="filterTypeMarcheSelect" options={MARCHE_TYPE_OPTIONS} value={MARCHE_TYPE_OPTIONS.find(option => option.value === columns.type?.getFilterValue()) || null} onChange={option => columns.type?.setFilterValue(option?.value ?? undefined)} placeholder="Tous Types..." isClearable styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body} aria-label="Filtrer par type de marché" />
                        </Form.Group>

                        <Form.Group controlId="filterModePassation" className="mb-3">
                            <Form.Label className="small mb-1 fw-bold">Mode de passation</Form.Label>
                            <Select inputId="filterModePassationSelect" options={MODE_PASSATION_OPTIONS} value={MODE_PASSATION_OPTIONS.find(option => option.value === columns.modePassation?.getFilterValue()) || null} onChange={option => columns.modePassation?.setFilterValue(option?.value ?? undefined)} placeholder="Tous Modes..." isClearable styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body} aria-label="Filtrer par mode de passation" />
                        </Form.Group>
                        
                        <Form.Group controlId="filterStatus" className="mb-3">
                            <Form.Label className="small mb-1 fw-bold">Statut</Form.Label>
                            <Select inputId="filterStatusSelect" options={STATUT_SELECT_OPTIONS} value={STATUT_SELECT_OPTIONS.find(option => option.value === columns.status?.getFilterValue()) || null} onChange={option => columns.status?.setFilterValue(option?.value ?? undefined)} placeholder="Tous Statuts..." isClearable styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body} aria-label="Filtrer par statut" />
                        </Form.Group>
                        
                        <DateRangeFilter column={columns.datePub} label="Date de publication" />
                        <DateRangeFilter column={columns.dateLimOffres} label="Date limite des offres" />
                        <DateRangeFilter column={columns.dateNotif} label="Date de notification" />
                        <DateRangeFilter column={columns.dateDebutExec} label="Date de début d'exécution" />
                        <DateRangeFilter column={columns.dateEngTres} label="Date d'engagement Trésorerie" />
                        <DateRangeFilter column={columns.dateVisaTres} label="Date Visa Trésorerie" />
                        <DateRangeFilter column={columns.dateApprobPres} label="Date Approbation Président" />

                        <NumericRangeFilter column={columns.budget} label="Budget Prévisionnel (MAD)" />
                        <NumericRangeFilter column={columns.montant} label="Montant Attribué (MAD)" />
                        <NumericRangeFilter column={columns.avPhys} label="Avancement Physique (%)" />
                        <NumericRangeFilter column={columns.avFin} label="Avancement Financier (%)" />
                        <NumericRangeFilter column={columns.dureeMarche} label="Durée du marché (jours)" />
                        <NumericRangeFilter column={columns.lotsCount} label="Nombre de lots" />

                        <Form.Group controlId="filterFilesTitle" className="mb-3">
                            <Form.Label className="small mb-1 fw-bold">Titre du Fichier</Form.Label>
                            <Form.Control type="text" placeholder="Contient..." value={columns.filesTitle?.getFilterValue() || ''} onChange={e => columns.filesTitle?.setFilterValue(e.target.value || undefined)} aria-label="Filtrer par intitulé de fichier" />
                        </Form.Group>
                        
                        <Form.Group controlId="filterFilesType" className="mb-3">
                            <Form.Label className="small mb-1 fw-bold">Catégorie de Fichier</Form.Label>
                            <Select inputId="filterFilesCategorySelect" options={MARCHE_FICHIER_CATEGORIES} value={MARCHE_FICHIER_CATEGORIES.find(option => option.value === columns.filesType?.getFilterValue()) || null} onChange={option => columns.filesType?.setFilterValue(option?.value ?? undefined)} placeholder="Toutes Catégories..." isClearable styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body} aria-label="Filtrer par catégorie de fichier" />
                        </Form.Group>
                       
                        <Form.Group controlId="filterConventionSelect" className="mb-3">
                            <Form.Label className="small mb-1 fw-bold">Convention</Form.Label>
                            <Select inputId="filterConventionSelectInput" isLoading={optionsLoading} options={conventionOptions} value={conventionOptions.find(o => o.value === columns.filterConvention?.getFilterValue()) || null} onChange={opt => columns.filterConvention?.setFilterValue(opt?.value ?? undefined)} isClearable placeholder="Toutes Conventions..." styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body} />
                        </Form.Group>
                       
                        <Form.Group controlId="filterAOSelect" className="mb-3">
                            <Form.Label className="small mb-1 fw-bold">Appel d'Offre</Form.Label>
                            <Select inputId="filterAOSelectInput" isLoading={optionsLoading} options={appelOffreOptions} value={appelOffreOptions.find(o => o.value === columns.filterAO?.getFilterValue()) || null} onChange={opt => columns.filterAO?.setFilterValue(opt?.value ?? undefined)} isClearable placeholder="Tous Appels d'Offre..." styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body} />
                        </Form.Group>
                        
                        <Form.Group controlId="filterHasFiles" className="mb-3">
                            <Form.Check type="switch" id="has-files-switch" label="Avec fichiers" checked={Boolean(columns.hasFiles?.getFilterValue())} onChange={e => columns.hasFiles?.setFilterValue(e.target.checked || undefined)} />
                        </Form.Group>
                        <Form.Group controlId="filterHasConvention" className="mb-3">
                            <Form.Check type="switch" id="has-convention-switch" label="Avec convention liée" checked={Boolean(columns.hasConvention?.getFilterValue())} onChange={e => columns.hasConvention?.setFilterValue(e.target.checked || undefined)} />
                        </Form.Group>
                        <Form.Group controlId="filterHasAO" className="mb-3">
                            <Form.Check type="switch" id="has-ao-switch" label="Avec appel d'offre lié" checked={Boolean(columns.hasAO?.getFilterValue())} onChange={e => columns.hasAO?.setFilterValue(e.target.checked || undefined)} />
                        </Form.Group>
                        <Form.Group controlId="filterHasLots" className="mb-3">
                            <Form.Check type="switch" id="has-lots-switch" label="Avec lots" checked={Boolean(columns.hasLots?.getFilterValue())} onChange={e => columns.hasLots?.setFilterValue(e.target.checked || undefined)} />
                        </Form.Group>
                    </Form>
                </div>
                <div className="pt-3 border-top">
                    <Button variant="outline-secondary" size="sm" onClick={() => table.resetColumnFilters()} disabled={!isAnyColumnFiltered} className="w-100">
                        <FontAwesomeIcon icon={faTimes} className="me-2"/> Réinitialiser Filtres
                    </Button>
                </div>
            </>
            // --- CHANGE END ---
        );
    }, [conventionOptions, appelOffreOptions, optionsLoading]); // Dependencies for useCallback

    const defaultVisibleCols = useMemo(() => ['numero_marche', 'intitule', 'type_marche', 'statut', 'montant_attribue', 'actions', 'appelOffreLIEE', 'conventionLIEE'], []);
    
    const handleFormClose = () => {
        setSearchParams({});
    };

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
              {isCreating ? (
                <MarchePublicForm
                    onClose={handleFormClose}
                    onItemCreated={handleFormClose}
                    baseApiUrl={BASE_API_URL}
                />
                ) : (
                <DynamicTable
                    fetchUrl="/marches-publics"
                    dataKey="marches_publics"
                    deleteUrlBase="/marches-publics"
                    baseApiUrl={BASE_API_URL}
                    columns={marcheColumns}
                    itemName="Marché Public"
                    itemNamePlural="Marchés Publics"
                    identifierKey="id"
                    displayKeyForDelete="numero_marche"
                    itemsPerPage={9}
                    defaultVisibleColumns={defaultVisibleCols}
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
                            try {
                                const d = new Date(dateStr);
                                if (isNaN(d.getTime())) return false;
                                if (filterValue.from && d < new Date(filterValue.from)) return false;
                                if (filterValue.to) { const to = new Date(filterValue.to); to.setHours(23,59,59,999); if (d > to) return false; }
                                return true;
                            } catch (e) { return false; }
                        },
                        fileTitleIncludes: (row, _columnId, filterValue) => {
                            const query = String(filterValue || '').trim().toLowerCase();
                            if (!query) return true;
                            const original = row?.original || {};
                            const general = Array.isArray(original.fichiers_joints_generaux) ? original.fichiers_joints_generaux : [];
                            const lotFiles = Array.isArray(original.lots) ? original.lots.flatMap(l => Array.isArray(l.fichiers_joints) ? l.fichiers_joints : []) : [];
                            const files = [...general, ...lotFiles];
                            if (files.length === 0) return false;
                            return files.some(f => (f.intitule || f.nom_fichier || '').toString().toLowerCase().includes(query));
                        },
                        fileTypeIncludes: (row, _columnId, filterValue) => {
                            const query = String(filterValue || '').trim().toLowerCase();
                            if (!query) return true;
                            const original = row?.original || {};
                            const general = Array.isArray(original.fichiers_joints_generaux) ? original.fichiers_joints_generaux : [];
                            const lotFiles = Array.isArray(original.lots) ? original.lots.flatMap(l => Array.isArray(l.fichiers_joints) ? l.fichiers_joints : []) : [];
                            const files = [...general, ...lotFiles];
                            if (files.length === 0) return false;
                            return files.some(f => (f.categorie || '').toString().toLowerCase().includes(query));
                        },
                        hasFiles: (row, _columnId, filterValue) => {
                            if (!filterValue) return true;
                            const original = row?.original || {};
                            const general = Array.isArray(original.fichiers_joints_generaux) ? original.fichiers_joints_generaux : [];
                            const lotFiles = Array.isArray(original.lots) ? original.lots.flatMap(l => Array.isArray(l.fichiers_joints) ? l.fichiers_joints : []) : [];
                            return (general.length + lotFiles.length) > 0;
                        },
                        hasConvention: (row, _columnId, filterValue) => !filterValue || Boolean(row?.original?.convention?.id),
                        byConventionId: (row, _columnId, filterValue) => !filterValue || String(row?.original?.convention?.id) === String(filterValue),
                        hasAO: (row, _columnId, filterValue) => !filterValue || Boolean(row?.original?.appel_offre?.id),
                        byAOId: (row, _columnId, filterValue) => !filterValue || String(row?.original?.appel_offre?.id) === String(filterValue),
                        hasLots: (row, _columnId, filterValue) => !filterValue || (Array.isArray(row?.original?.lots) && row.original.lots.length > 0),
                    }}
                    CreateComponent={MarchePublicForm}
                    ViewComponent={MarchePublicVisualisation}
                    EditComponent={MarchePublicForm}
                    actionColumnWidth={90}
                    tableClassName="table-striped table-hover"
                />
            )}
        </div>
    );
};

export default MarchePublicPage;