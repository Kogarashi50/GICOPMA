// src/pages/projets_views/ProjetsPage.jsx

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import DynamicTable from '../components/DynamicTable';
import ProjetForm from './ProjectForm';
import ProjetVisualisation from './ProjectVisualisation';
import { useSearchParams } from 'react-router-dom';

// Imports for Filters & UI
import Select from 'react-select';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilterCircleXmark, faUsers, faBuilding, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

// --- Constants ---
const BASE_API_URL = 'http://localhost:8000/api';

// --- Helper Functions ---
const formatPercentage = (value) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    return `${number.toFixed(2)} %`;
};

const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    return number.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateSimple = (dateString) => {
    if (!dateString) return '-';
    try {
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
             return new Date(dateString).toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
        }
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
        return dateString;
    } catch (e) { console.error("Error formatting date:", dateString, e); return dateString; }
};

// --- Filter Functions ---
const arrayRelationshipFilterFn = (row, columnId, filterValue) => {
    if (!filterValue || filterValue.length === 0) return true;
    const rowValue = row.getValue(columnId);
    if (!Array.isArray(rowValue) || rowValue.length === 0) return false;
    const rowItemIds = rowValue.map(item => String(item.Id ?? item.id));
    return filterValue.some(filterId => rowItemIds.includes(String(filterId)));
};

const idStringFilterFn = (row, columnId, filterValue) => {
    if (!filterValue || filterValue.length === 0) return true;
    const rowValueIds = row.getValue(columnId);
    if (!Array.isArray(rowValueIds) || rowValueIds.length === 0) return false;
    return filterValue.some(filterId => rowValueIds.includes(String(filterId)));
};

const equalsStringFilterFn = (row, columnId, filterValue) => {
    if (filterValue === null || filterValue === undefined) return true;
    const rowValue = row.getValue(columnId);
    return String(rowValue).toLowerCase() === String(filterValue).toLowerCase();
};

const dateRangeFilterFn = (row, columnId, filterValue) => {
    try {
        const rowValueStr = row.getValue(columnId);
        if (!rowValueStr) return !filterValue?.start && !filterValue?.end;
        const rowDate = new Date(rowValueStr);
        if (isNaN(rowDate.getTime())) return true;

        const { start, end } = filterValue || {};
        if (start && new Date(start) > rowDate) return false;
        if (end && new Date(end) < rowDate) return false;

        return true;
    } catch (e) { console.error("Error in dateRangeFilterFn:", e); return true; }
};

const numericRangeFilterFn = (row, columnId, filterValue) => {
    const rowValue = parseFloat(row.getValue(columnId));
    if (isNaN(rowValue)) return true;

    const { min, max } = filterValue || {};
    if (min !== undefined && min !== '' && rowValue < parseFloat(min)) return false;
    if (max !== undefined && max !== '' && rowValue > parseFloat(max)) return false;
    return true;
};

// --- The Filter UI Component ---
const RenderProjetFiltersComponent = ({ table, options, optionsLoading }) => {
    const getColumn = (id) => table.getColumn(id);

    const columns = {
        programme: getColumn('Programme_Description'),
        maitreOuvrage: getColumn('maitre_ouvrage'),
        maitreOuvrageDelegue: getColumn('maitre_ouvrage_delegue'),
        province: getColumn('provinces_filter'),
            secteur: getColumn('secteur_filter'), // --- ADD THIS LINE ---
        commune: getColumn('communes_filter'),
        partenaire: getColumn('partenaires_filter'),
        fonctionnaire: getColumn('fonctionnaires_filter'),
        cout: getColumn('Cout_Projet'),
        avFinan: getColumn('Etat_Avan_Finan'),
        dateFin: getColumn('Date_Fin'),
    };

    const getFilterValue = (column) => column?.getFilterValue();

    const filters = {
        programme: getFilterValue(columns.programme),
        maitreOuvrage: getFilterValue(columns.maitreOuvrage),
        maitreOuvrageDelegue: getFilterValue(columns.maitreOuvrageDelegue),
        province: getFilterValue(columns.province) || [],
        commune: getFilterValue(columns.commune) || [],
    secteur: getFilterValue(columns.secteur), // --- ADD THIS LINE ---

        partenaire: getFilterValue(columns.partenaire) || [],
        fonctionnaire: getFilterValue(columns.fonctionnaire) || [],
        cout: getFilterValue(columns.cout) || {},
        avFinan: getFilterValue(columns.avFinan) || {},
        dateFin: getFilterValue(columns.dateFin) || {},
    };

    const handleSelectChange = (column, selectedOptions, isMulti = false) => {
        if (isMulti) {
            const values = selectedOptions ? selectedOptions.map(opt => opt.value) : undefined;
            column?.setFilterValue(values && values.length > 0 ? values : undefined);
        } else {
            column?.setFilterValue(selectedOptions?.value ?? undefined);
        }
    };

    const handleDateChange = (column, part, value) => {
        const currentFilter = getFilterValue(column) || {};
        const newFilter = { ...currentFilter, [part]: value || undefined };
        column?.setFilterValue(newFilter.start || newFilter.end ? newFilter : undefined);
    };

    const handleNumericRangeChange = (column, part, value) => {
        const currentFilter = getFilterValue(column) || {};
        const numericValue = value === '' ? undefined : value;
        const newFilter = { ...currentFilter, [part]: numericValue };
        column?.setFilterValue(newFilter.min !== undefined || newFilter.max !== undefined ? newFilter : undefined);
    };

    const resetAllFilters = () => {
        table.resetColumnFilters();
        table.setGlobalFilter('');
    };

    const selectStyles = {
        control: base => ({ ...base, minHeight: '31px', fontSize: '0.875rem' }),
        menuPortal: base => ({ ...base, zIndex: 9999 })
    };

    return (
        <div style={{ height: 'calc(100% - 10px)', overflowY: 'auto' }}>
            <Form className="p-2 border bg-light rounded mb-2 small" onSubmit={(e) => e.preventDefault()}>
                <h6 className="px-1 mb-2 fw-bold text-secondary">Filtres de Recherche</h6>
                <Row className="g-2 align-items-end">
                    <Col xs={12}><Form.Group><Form.Label className="mb-1 fw-bold">Programme</Form.Label><Select value={options.programmeOptions.find(o => o.value === filters.programme) || null} options={options.programmeOptions} isClearable onChange={(opt) => handleSelectChange(columns.programme, opt)} styles={selectStyles} isLoading={optionsLoading} menuPortalTarget={document.body} /></Form.Group></Col>
                    <Col xs={12}><Form.Group><Form.Label className="mb-1 fw-bold">Maitre d'ouvrage</Form.Label><Select value={options.maitreOuvrageOptions.find(o => o.value === filters.maitreOuvrage) || null} options={options.maitreOuvrageOptions} isClearable onChange={(opt) => handleSelectChange(columns.maitreOuvrage, opt)} styles={selectStyles} isLoading={optionsLoading} menuPortalTarget={document.body} /></Form.Group></Col>
                    <Col xs={12}><Form.Group><Form.Label className="mb-1 fw-bold">M.O. Délégué</Form.Label><Select value={options.maitreOuvrageDelegueOptions.find(o => o.value === filters.maitreOuvrageDelegue) || null} options={options.maitreOuvrageDelegueOptions} isClearable onChange={(opt) => handleSelectChange(columns.maitreOuvrageDelegue, opt)} styles={selectStyles} isLoading={optionsLoading} menuPortalTarget={document.body} /></Form.Group></Col>
                    <Col xs={12}>
    <Form.Group>
        <Form.Label className="mb-1 fw-bold">Secteur</Form.Label>
        <Select
            value={options.secteurOptions.find(o => o.value === filters.secteur) || null}
            options={options.secteurOptions}
            isClearable
            onChange={(opt) => handleSelectChange(columns.secteur, opt)}
            styles={selectStyles}
            isLoading={optionsLoading}
            menuPortalTarget={document.body}
        />
    </Form.Group>
</Col>
                    <Col xs={12}><Form.Group><Form.Label className="mb-1 fw-bold"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-1"/> Provinces</Form.Label><Select value={options.provinceOptions.filter(o => filters.province.includes(o.value))} options={options.provinceOptions} isMulti isClearable closeMenuOnSelect={false} onChange={(opts) => handleSelectChange(columns.province, opts, true)} styles={selectStyles} isLoading={optionsLoading} menuPortalTarget={document.body} /></Form.Group></Col>
                    <Col xs={12}><Form.Group><Form.Label className="mb-1 fw-bold"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-1"/> Communes</Form.Label><Select value={options.communeOptions.filter(o => filters.commune.includes(o.value))} options={options.communeOptions} isMulti isClearable closeMenuOnSelect={false} onChange={(opts) => handleSelectChange(columns.commune, opts, true)} styles={selectStyles} isLoading={optionsLoading} menuPortalTarget={document.body} /></Form.Group></Col>
                    <Col xs={12}><Form.Group><Form.Label className="mb-1 fw-bold"><FontAwesomeIcon icon={faBuilding} className="me-1"/> Partenaires Engagés</Form.Label><Select value={options.partenaireOptions.filter(o => filters.partenaire.includes(o.value))} options={options.partenaireOptions} isMulti isClearable closeMenuOnSelect={false} onChange={(opts) => handleSelectChange(columns.partenaire, opts, true)} styles={selectStyles} isLoading={optionsLoading} menuPortalTarget={document.body} /></Form.Group></Col>
                    <Col xs={12}><Form.Group><Form.Label className="mb-1 fw-bold"><FontAwesomeIcon icon={faUsers} className="me-1"/> Points Focaux</Form.Label><Select value={options.fonctionnaireOptions.filter(o => filters.fonctionnaire.includes(o.value))} options={options.fonctionnaireOptions} isMulti isClearable closeMenuOnSelect={false} onChange={(opts) => handleSelectChange(columns.fonctionnaire, opts, true)} styles={selectStyles} isLoading={optionsLoading} menuPortalTarget={document.body} /></Form.Group></Col>
                    <Col xs={12}><Form.Group><Form.Label className="mb-1 fw-bold">Coût Projet (Plage)</Form.Label><InputGroup size="sm"><Form.Control type="number" placeholder="Min" value={filters.cout.min ?? ''} onChange={(e) => handleNumericRangeChange(columns.cout, 'min', e.target.value)} /><Form.Control type="number" placeholder="Max" value={filters.cout.max ?? ''} onChange={(e) => handleNumericRangeChange(columns.cout, 'max', e.target.value)} /></InputGroup></Form.Group></Col>
                    <Col xs={12}><Form.Group><Form.Label className="mb-1 fw-bold">Av. Financier (%)</Form.Label><InputGroup size="sm"><Form.Control type="number" placeholder="Min" min="0" max="100" value={filters.avFinan.min ?? ''} onChange={(e) => handleNumericRangeChange(columns.avFinan, 'min', e.target.value)} /><Form.Control type="number" placeholder="Max" min="0" max="100" value={filters.avFinan.max ?? ''} onChange={(e) => handleNumericRangeChange(columns.avFinan, 'max', e.target.value)} /></InputGroup></Form.Group></Col>
                    <Col xs={12}><Form.Group><Form.Label className="mb-1 fw-bold">Date Fin Réelle</Form.Label><InputGroup size="sm"><Form.Control type="date" value={filters.dateFin.start ?? ''} onChange={(e) => handleDateChange(columns.dateFin, 'start', e.target.value)} /><Form.Control type="date" value={filters.dateFin.end ?? ''} onChange={(e) => handleDateChange(columns.dateFin, 'end', e.target.value)} /></InputGroup></Form.Group></Col>
                    <Col xs={12} className="d-flex justify-content-end mt-3">
                        <Button variant="outline-secondary" size="sm" onClick={resetAllFilters} title="Réinitialiser tous les filtres"><FontAwesomeIcon icon={faFilterCircleXmark} className="me-1"/>Réinitialiser</Button>
                    </Col>
                </Row>
            </Form>
        </div>
    );
};


const ProjetsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const isCreating = searchParams.get('action') === 'create';

    const [filterOptions, setFilterOptions] = useState({
        programmeOptions: [],
        maitreOuvrageOptions: [],
        maitreOuvrageDelegueOptions: [],
        provinceOptions: [],
        communeOptions: [],
        fonctionnaireOptions: [],
            secteurOptions: [], // --- ADD THIS LINE ---
        partenaireOptions: [],
    });
    const [optionsLoading, setOptionsLoading] = useState(true);

    useEffect(() => {
        const fetchFilterOptions = async () => {
            setOptionsLoading(true);
            try {
                const responses = await Promise.allSettled([
                    axios.get(`${BASE_API_URL}/options/programmes`),
                    axios.get(`${BASE_API_URL}/projets/unique/maitre_ouvrage`),
                    axios.get(`${BASE_API_URL}/projets/unique/maitre_ouvrage_delegue`),
                    axios.get(`${BASE_API_URL}/options/provinces`),
                    axios.get(`${BASE_API_URL}/options/communes`),
                    axios.get(`${BASE_API_URL}/options/fonctionnaires`),
                        axios.get(`${BASE_API_URL}/options/secteurs`), // --- ADD THIS LINE ---
                    axios.get(`${BASE_API_URL}/options/partenaires`),
                ]);

                const getOptions = (response) => response.status === 'fulfilled' ? response.value.data : [];

                setFilterOptions({
                    programmeOptions: getOptions(responses[0]),
                    maitreOuvrageOptions: getOptions(responses[1]),
                    maitreOuvrageDelegueOptions: getOptions(responses[2]),
                    provinceOptions: getOptions(responses[3]),
                    communeOptions: getOptions(responses[4]),
                    fonctionnaireOptions: (responses[5].status === 'fulfilled' ? responses[5].value.data.fonctionnaires : []).map(f => ({ value: f.id, label: f.nom_complet })),
                     secteurOptions: getOptions(responses[6]).map(s => ({ value: s.id, label: s.description_fr })), 
                    partenaireOptions: getOptions(responses[7]),

                });
            } catch (error) {
                console.error("Error fetching comprehensive filter options:", error);
            } finally {
                setOptionsLoading(false);
            }
        };
        fetchFilterOptions();
    }, []);

    const projetColumns = useMemo(() => [
        // --- Core Visible Columns ---
        { accessorKey: 'Code_Projet', header: 'Code', size: 50, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Nom_Projet', header: 'Intitulé', size: 190, cell: info => <div className="text-truncate" style={{ maxWidth: '230px' }} title={info.getValue()}>{info.getValue() || '-'}</div>, meta: { enableGlobalFilter: true } },
        
        // --- Relational Columns for Display and Filtering ---
        { 
            id: 'Programme_Description', 
            header: 'Programme', 
            accessorFn: row => row.programme?.Id,
            cell: info => info.row.original.programme?.Description || '-',
            filterFn: 'equalsString', 
            meta: { enableGlobalFilter: true }
        },
        { 
            accessorKey: 'maitre_ouvrage', 
            header: 'Maitre Ouvrage', 
            filterFn: 'equalsString', 
            meta: { enableGlobalFilter: true }
        },
        { 
            accessorKey: 'maitre_ouvrage_delegue', 
            header: 'Maitre Ouvrage Délégué', 
            filterFn: 'equalsString', 
            meta: { enableGlobalFilter: true }
        },
        
    // --- ADD THIS ENTIRE COLUMN DEFINITION ---
    // --- START: REPLACE THE PREVIOUS SECTEUR COLUMNS WITH THESE TWO ---

    // Column for DISPLAY and SIDEBAR FILTERING
    {
        id: 'secteur_filter', // The main ID used by the filter component
        header: 'Secteur',
        accessorFn: row => row.secteur?.id, // Filter is based on the ID
        cell: info => info.row.original.secteur?.description_fr || '-', // Display shows the name
        filterFn: 'equalsString',
        meta: { enableGlobalFilter: false } // Global search is DISABLED here
    },

    // NEW INVISIBLE column just for GLOBAL SEARCH (CORRECTED)
    {
        id: 'secteur',
        accessorFn: row => row.secteur?.description_fr || '', // CORRECTED: Access property directly on the object
        meta: { enableGlobalFilter: true } // Global search is ENABLED here
    },
    
  
        { 
            id: 'provinces_filter', 
            accessorFn: row => row.provinces, // Returns array of objects
            filterFn: 'arrayRelationship',
            enableHiding: false  
        },
        { 
            id: 'communes_filter', 
            accessorFn: row => row.communes, // Returns array of objects
            filterFn: 'arrayRelationship',
            enableHiding: false  
        },
        { 
            id: 'partenaires_filter', 
            accessorFn: row => row.engagements_financiers?.map(e => e.partenaire).filter(Boolean), // Returns array of objects
            filterFn: 'arrayRelationship' 
            ,enableHiding: false 
        },
        {
            id: 'fonctionnaires_filter',
            accessorFn: row => String(row.id_fonctionnaire || '').split(';').filter(Boolean), // Returns array of ID strings
            filterFn: 'idStringFilterFn',
            enableHiding: false 
        },

        // --- Invisible columns dedicated to GLOBAL SEARCH ---
        // These are not shown. Their job is to provide clean strings for the main search bar.
        {
            id: 'provinces',
            accessorFn: row => (row.provinces || []).map(p => p.Description).join(' '),
            meta: { enableGlobalFilter: true }
        },
        {
            id: 'communes',
            accessorFn: row => (row.communes || []).map(c => c.Description).join(' '),
            meta: { enableGlobalFilter: true }
        },
        {
            id: 'partenaires',
            accessorFn: row => (row.engagements_financiers || []).map(e => e.partenaire?.Description).filter(Boolean).join(' '),
            meta: { enableGlobalFilter: true }
            ,enableHiding: false 

        },
        {
            id: 'fonctionnaires',
            accessorFn: row => {
                const ids = String(row.id_fonctionnaire || '').split(';').filter(Boolean);
                if (ids.length === 0) return '';
                return ids.map(id => filterOptions.fonctionnaireOptions.find(opt => String(opt.value) === id)?.label || '').filter(Boolean).join(' ');
            },
            meta: { enableGlobalFilter: true }
            ,enableHiding: false 

        },

        // --- Other Visible Columns ---
        { accessorKey: 'Cout_Projet', header: 'Coût Projet', size: 130, cell: info => formatCurrency(info.getValue()), filterFn: 'numericRange' },
        { accessorKey: 'Etat_Avan_Physi', header: 'Av. Physi', size: 110, cell: info => formatPercentage(info.getValue()), filterFn: 'numericRange' },
        { accessorKey: 'Etat_Avan_Finan', header: 'Av. Finan', size: 110, cell: info => formatPercentage(info.getValue()), filterFn: 'numericRange' },
        { accessorKey: 'Date_Fin', header: 'Fin Réelle', cell: info => formatDateSimple(info.getValue()), size: 130, filterFn: 'dateRange' },
    ], [filterOptions.fonctionnaireOptions]);
    const availableCols = useMemo(() => [
        'Code_Projet',
        'Nom_Projet',
            'secteur', // --- ADD THIS LINE ---

        'Programme_Description',
        'maitre_ouvrage',
        'provinces_display', // Use the display column ID
        'Cout_Projet',
        'Etat_Avan_Physi',
        'Etat_Avan_Finan',
        'Date_Fin'
        // Add any other user-facing column IDs here
    ], []);
    const defaultVisibleColumns = useMemo(() => [
        'Code_Projet', 'Nom_Projet', 'Programme_Description', 'maitre_ouvrage',
        'Cout_Projet', 'Etat_Avan_Physi', 'Date_Fin', 'actions'
    ], []);

    const searchExclusions = useMemo(() => [
        // Exclude technical and non-string fields from global search string concatenation
        'ID_Projet', 'Id_Programme', 'Cout_CRO', 'Date_Debut', 'created_at', 'updated_at', 'Observations',
        'Cout_Projet', 'Etat_Avan_Physi', 'Etat_Avan_Finan', 'Date_Fin',
        // Exclude the filter-only columns that contain objects or ID arrays
        'provinces_filter', 
        'communes_filter',  
        'partenaires_filter',
        'fonctionnaires_filter', 
        'engagements_financiers'
    ], []);

    const renderFilters = useCallback((table) => (
        <RenderProjetFiltersComponent
            table={table}
            options={filterOptions}
            optionsLoading={optionsLoading}
        />
    ), [filterOptions, optionsLoading]);

    const tableConfig = useMemo(() => ({
        fetchUrl: "/projets",
        dataKey: "projets",
        deleteUrlBase: "/projets",
        identifierKey: "ID_Projet",
        columns: projetColumns,
        itemName: "Projet",
        itemNamePlural: "Projets",
        displayKeyForDelete: "Code_Projet",
        availableColumnKeys: availableCols,
        defaultVisibleColumns: defaultVisibleColumns,
        globalSearchExclusions: searchExclusions,
        itemsPerPage: 10,
        enableColumnFiltering: true,
        CreateComponent: ProjetForm,
        ViewComponent: ProjetVisualisation,
        EditComponent: ProjetForm,
        baseApiUrl: BASE_API_URL,
        renderFilters: renderFilters,
        customFilterFunctions: {
             dateRange: dateRangeFilterFn,
             numericRange: numericRangeFilterFn,
             arrayRelationship: arrayRelationshipFilterFn,
             equalsString: equalsStringFilterFn,
             idStringFilterFn: idStringFilterFn,
        },
    }), [projetColumns, defaultVisibleColumns, renderFilters, searchExclusions]);

    const handleFormClose = () => setSearchParams({});

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            {isCreating ? (
                <ProjetForm onClose={handleFormClose} baseApiUrl={BASE_API_URL} />
            ) : (
                <DynamicTable {...tableConfig} />
            )}
        </div>
    );
};

export default ProjetsPage;