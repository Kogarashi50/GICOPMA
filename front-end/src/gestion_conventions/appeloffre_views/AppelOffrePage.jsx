import React, { useMemo, useCallback, useState, useEffect } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
import AppelOffreForm from './AppelOffreForm';
import AppelOffreVisualisation from './AppelOffreVisualisation';
import axios from 'axios'; // Import axios for API calls

// --- UI & Utilities ---
import Select from 'react-select';
import { Badge, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faToggleOn, faToggleOff } from '@fortawesome/free-solid-svg-icons';
import { useSearchParams } from 'react-router-dom';

// --- Constants & Helpers ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Reusable formatters
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) { return dateString; }
        return new Date(datePart).toLocaleDateString('fr-CA');
    } catch (e) { console.error("Date format error:", dateString, e); return dateString; }
};

const formatCurrency = (value) => {
    if (value == null || value === '' || isNaN(Number(value))) return '-';
    try {
        return parseFloat(value).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
    } catch (e) { console.error("Currency format error:", value, e); return String(value); }
};

// ENUM Options for Filters
const CATEGORIE_OPTIONS = [
    { value: 'Travaux', label: 'Travaux' },
    { value: 'Etudes', label: 'Etudes' },
    { value: 'Services', label: 'Services' },
    { value: 'Fournitures', label: 'Fournitures' }
];

const PORTAIL_FILTER_OPTIONS = [
    { value: 'true', label: 'Oui' },
    { value: 'false', label: 'Non' }
];

const PROVINCE_FILTER_OPTIONS = [
    { value: 'Berkane', label: 'Berkane' },
    { value: 'Driouch', label: 'Driouch' },
    { value: 'Figuig', label: 'Figuig' },
    { value: 'Guercif', label: 'Guercif' },
    { value: 'Jerada', label: 'Jerada' },
    { value: 'Nador', label: 'Nador' },
    { value: 'Oujda-Angad', label: 'Oujda-Angad' },
    { value: 'Taourirt', label: 'Taourirt' }
];
// --- End Helpers ---

// --- Main Page Component ---
const AppelOffrePage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // State for the server-side province filter
    const [provinceFilter, setProvinceFilter] = useState(null);
    
    // --- NEW: State for dynamic file categories ---
    const [fichierCategories, setFichierCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    const action = searchParams.get('action');
    const isCreating = action === 'create';

    // --- NEW: Effect to fetch file categories on component mount ---
    useEffect(() => {
        const fetchFichierCategories = async () => {
            setLoadingCategories(true);
            try {
                const response = await axios.get(`${BASE_API_URL}/fichier-categories`, { withCredentials: true });
                // The backend already returns {id, label, value}, so we can use it directly
                setFichierCategories(response.data || []);
            } catch (error) {
                console.error("Erreur lors du chargement des catégories de fichiers pour les filtres.", error);
                // Optionally set an error state to show in the UI
            } finally {
                setLoadingCategories(false);
            }
        };

        fetchFichierCategories();
    }, []);

    // --- Column Definitions for the DynamicTable ---
    const appelOffreColumns = useMemo(() => [
        { accessorKey: 'numero', header: 'N° AO', size: 130, meta: { align: 'left', enableGlobalFilter: true } },
        {
            accessorKey: 'intitule', header: 'Intitulé', size: 400,
            meta: { align: 'left', enableGlobalFilter: true },
            cell: info => <div className="text-truncate" style={{ maxWidth: '400px' }} title={info.getValue()}>{info.getValue()}</div>,
        },
        {
            accessorKey: 'categorie', header: 'Catégorie', size: 100, filterFn: 'equalsString',
            meta: { align: 'center', enableGlobalFilter: true },
        },
        {
            id: 'provincesList',
            header: 'Province(s)',
            size: 180,
            accessorKey: 'provinces',
            cell: info => {
                const provincesArray = info.getValue();
                if (!provincesArray || provincesArray.length === 0) return '-';
                return (
                    <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '180px' }}>
                        {provincesArray.map((prov, index) => (
                            <Badge key={index} pill bg="light" text="dark" className="text-truncate" title={prov}>{prov}</Badge>
                        ))}
                    </div>
                );
            },
            meta: { align: 'left', enableGlobalFilter: true },
        },
        {
            accessorKey: 'estimation_HT', header: 'Estimation HT', size: 150, filterFn: 'numericRange',
            cell: info => formatCurrency(info.getValue()),
            meta: { align: 'right', enableGlobalFilter: false }
        },
        {
            accessorKey: 'date_ouverture', header: 'Date Ouverture', size: 140, filterFn: 'dateRange',
            cell: info => formatDate(info.getValue()),
            meta: { align: 'center', enableGlobalFilter: false }
        },
        {
            accessorKey: 'lancement_portail', header: 'Portail', size: 80, filterFn: 'equalsString',
            cell: info => {
                const isOnPortail = info.getValue();
                return isOnPortail === true ?
                    <Badge bg="success" text="white" className="w-100"><FontAwesomeIcon icon={faToggleOn} /> Oui</Badge> :
                    <Badge bg="secondary" text="white" className="w-100"><FontAwesomeIcon icon={faToggleOff} /> Non</Badge>;
            },
            meta: { align: 'center', enableGlobalFilter: true },
        },
        // --- Hidden file-based filters ---
        { id: 'files_title', header: 'Titre Fichier (filtre)', size: 0, accessorFn: row => row, meta: { align: 'left', enableGlobalFilter: false }, enableHiding: false, filterFn: 'fileTitleIncludes' },
        { id: 'files_type', header: 'Catégorie Fichier (filtre)', size: 0, accessorFn: row => row, meta: { align: 'left', enableGlobalFilter: false }, enableHiding: false, filterFn: 'fileTypeIncludes' },
        { id: 'files_search', header: 'Recherche Fichiers', size: 0, accessorFn: row => {
            const files = Array.isArray(row.fichiers) ? row.fichiers : [];
            if (files.length === 0) return '';
            return files.map(f => [f.intitule, f.nom_fichier, f.categorie?.value, f.type_fichier].filter(Boolean).join(' ')).join(' | ');
        }, meta: { align: 'left', enableGlobalFilter: true }, enableHiding: false },
        { id: 'has_files', header: 'A des fichiers', size: 0, accessorFn: row => row, meta: { align: 'left', enableGlobalFilter: false }, enableHiding: false, filterFn: 'hasFiles' },
    ], []);

    // --- UPDATED: The fetch URL is now dynamically built based on the server-side province filter ---
    const dynamicFetchUrl = useMemo(() => {
        let url = '/appel-offres';
        if (provinceFilter) {
            url += `?province=${encodeURIComponent(provinceFilter)}`;
        }
        return url;
    }, [provinceFilter]);

    // --- Filter Rendering Function ---
    const renderAppelOffreFilters = useCallback((table) => {
        if (!table) return null;
        const categorieColumn = table.getColumn('categorie');
        const portailColumn = table.getColumn('lancement_portail');
        const estimationColumn = table.getColumn('estimation_HT');
        const dateOuvertureColumn = table.getColumn('date_ouverture');
        const filesTitleColumn = table.getColumn('files_title');
        const filesTypeColumn = table.getColumn('files_type');
        const hasFilesColumn = table.getColumn('has_files');
        const isAnyColumnFiltered = table.getState().columnFilters.length > 0;
        
        const handleProvinceChange = (selectedOption) => {
            setProvinceFilter(selectedOption?.value ?? null);
        };
        const selectedProvinceFilterOption = PROVINCE_FILTER_OPTIONS.find(option => provinceFilter === option.value) || null;
        
        const currentPortailFilterValue = portailColumn?.getFilterValue();
        const selectedPortailOption = PORTAIL_FILTER_OPTIONS.find(option => option.value === String(currentPortailFilterValue)) || null;

        return (
            <Form>
                {/* Catégorie Filter */}
                <Form.Group controlId="filterCategorieAO" className="mb-3">
                   <Form.Label className="small mb-1 fw-bold">Catégorie</Form.Label>
                   <Select
                       inputId="filterCategorieAOSelect"
                       options={CATEGORIE_OPTIONS}
                       value={CATEGORIE_OPTIONS.find(option => option.value === categorieColumn?.getFilterValue()) || null}
                       onChange={option => categorieColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder="Toutes Catégories..." isClearable
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
                       aria-label="Filtrer par catégorie"
                   />
                </Form.Group>

                {/* Province Filter (Server-Side) */}
                <Form.Group controlId="filterProvinceAO" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Contient Province</Form.Label>
                    <Select
                        inputId="filterProvinceAOSelect"
                        options={PROVINCE_FILTER_OPTIONS}
                        value={selectedProvinceFilterOption}
                        onChange={handleProvinceChange}
                        placeholder="Toutes Provinces..." isClearable
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} 
                        menuPortalTarget={document.body}
                        aria-label="Filtrer par province"
                    />
                </Form.Group>

                {/* Estimation Range */}
                <Form.Group controlId="filterEstimationRange" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Estimation HT (MAD)</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="number" placeholder="Min" value={estimationColumn?.getFilterValue()?.min ?? ''} onChange={e => estimationColumn?.setFilterValue(v => ({ ...(v||{}), min: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                        <Form.Control type="number" placeholder="Max" value={estimationColumn?.getFilterValue()?.max ?? ''} onChange={e => estimationColumn?.setFilterValue(v => ({ ...(v||{}), max: e.target.value === '' ? undefined : Number(e.target.value) }))} />
                    </div>
                </Form.Group>

                {/* Date Ouverture Range */}
                <Form.Group controlId="filterDateOuverture" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Date d'ouverture</Form.Label>
                    <div className="d-flex gap-2">
                        <Form.Control type="date" value={dateOuvertureColumn?.getFilterValue()?.from ?? ''} onChange={e => dateOuvertureColumn?.setFilterValue(v => ({ ...(v||{}), from: e.target.value || undefined }))} />
                        <Form.Control type="date" value={dateOuvertureColumn?.getFilterValue()?.to ?? ''} onChange={e => dateOuvertureColumn?.setFilterValue(v => ({ ...(v||{}), to: e.target.value || undefined }))} />
                    </div>
                </Form.Group>

                {/* Files Title Filter */}
                <Form.Group controlId="filterFilesTitleAO" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Titre du Fichier</Form.Label>
                    <Form.Control type="text" placeholder="Contient..." value={filesTitleColumn?.getFilterValue() || ''} onChange={e => filesTitleColumn?.setFilterValue(e.target.value || undefined)} />
                </Form.Group>

                {/* --- UPDATED: Files Category Filter (Dynamic) --- */}
                <Form.Group controlId="filterFilesCategoryAO" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Catégorie de Fichier</Form.Label>
                    <Select
                        inputId="filterFilesCategoryAOSelect"
                        options={fichierCategories} // Use dynamic options
                        getOptionLabel={opt => opt.label} // Specify how to get label
                        getOptionValue={opt => opt.value} // Specify how to get value
                        value={fichierCategories.find(o => o.value === filesTypeColumn?.getFilterValue()) || null}
                        onChange={opt => filesTypeColumn?.setFilterValue(opt?.value ?? undefined)}
                        isClearable
                        isLoading={loadingCategories} // Show loading indicator
                        placeholder={loadingCategories ? "Chargement..." : "Toutes Catégories..."}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        menuPortalTarget={document.body}
                    />
                </Form.Group>

                {/* Has Files Toggle */}
                <Form.Group controlId="filterHasFilesAO" className="mb-3">
                    <Form.Check type="switch" id="has-files-ao-switch" label="Afficher uniquement les AOs avec fichiers" checked={Boolean(hasFilesColumn?.getFilterValue())} onChange={e => hasFilesColumn?.setFilterValue(e.target.checked || undefined)} />
                </Form.Group>

                {/* Lancement Portail Filter */}
                <Form.Group controlId="filterPortail" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Lancé sur Portail</Form.Label>
                   <Select
                       inputId="filterPortailSelect"
                       options={PORTAIL_FILTER_OPTIONS}
                       value={selectedPortailOption}
                       onChange={option => portailColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder="Oui / Non / Tous..." isClearable
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
                       aria-label="Filtrer par lancement sur portail"
                   />
                </Form.Group>

                {/* Reset Button */}
                <Button variant="outline-secondary" size="sm" onClick={() => {
                    table.resetColumnFilters(); // Resets client-side filters
                    setProvinceFilter(null);   // Resets server-side province filter
                }} disabled={!provinceFilter && !isAnyColumnFiltered} className="w-100 mt-3">
                   <FontAwesomeIcon icon={faTimes} className="me-2"/> Réinitialiser Filtres
                </Button>
            </Form>
        );
    }, [provinceFilter, fichierCategories, loadingCategories]); // Add dependencies


    // --- DynamicTable Configuration ---
    const defaultVisibleCols = useMemo(() => [
        'numero', 'intitule', 'categorie', 'provincesList', 'estimation_HT',
        'date_ouverture', 'lancement_portail', 'actions',
    ], []);

    const handleFormClose = () => {
        setSearchParams({});
    };

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
              {isCreating ? (
                  <AppelOffreForm
                       onClose={handleFormClose}
                       onItemCreated={handleFormClose}
                       baseApiUrl={BASE_API_URL}
                   />
              ) : (
                  <DynamicTable
                      fetchUrl={dynamicFetchUrl}
                      dataKey="appel_offres"
                      deleteUrlBase="/appel-offres"
                      baseApiUrl={BASE_API_URL}
                      columns={appelOffreColumns}
                      itemName="Appel d'Offre"
                      itemNamePlural="Appels d'Offre"
                      identifierKey="id"
                      displayKeyForDelete="numero"
                      itemsPerPage={10}
                      defaultVisibleColumns={defaultVisibleCols}
                      renderFilters={renderAppelOffreFilters}
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
                            const files = Array.isArray(row?.original?.fichiers) ? row.original.fichiers : [];
                            if (files.length === 0) return false;
                            return files.some(f => {
                                const title = (f.intitule || f.nom_fichier || '').toString().toLowerCase();
                                return title.includes(query);
                            });
                        },
                        fileTypeIncludes: (row, _columnId, filterValue) => {
                            const query = String(filterValue || '').trim().toLowerCase();
                            if (!query) return true;
                            const files = Array.isArray(row?.original?.fichiers) ? row.original.fichiers : [];
                            if (files.length === 0) return false;
                            return files.some(f => {
                                // Now we check against the 'value' of the related category object
                                const categoryValue = (f.categorie?.value || '').toString().toLowerCase();
                                return categoryValue === query;
                            });
                        },
                        hasFiles: (row, _columnId, filterValue) => {
                            const enabled = Boolean(filterValue);
                            if (!enabled) return true;
                            const files = Array.isArray(row?.original?.fichiers) ? row.original.fichiers : [];
                            return files.length > 0;
                        },
                      }}
                      CreateComponent={AppelOffreForm}
                      ViewComponent={AppelOffreVisualisation}
                      EditComponent={AppelOffreForm}
                      actionColumnWidth={90}
                      tableClassName="table-striped table-hover"
                  />
              )}
        </div>
    );
};

export default AppelOffrePage;