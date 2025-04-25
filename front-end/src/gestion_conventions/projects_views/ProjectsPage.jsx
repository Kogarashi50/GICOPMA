// src/pages/projets_views/ProjetsPage.jsx

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path if needed
import ProjetForm from './ProjectForm'; // Adjust path if needed
import ProjetVisualisation from './ProjectVisualisation'; // Adjust path if needed
import { useSearchParams } from 'react-router-dom';

// Imports for Filters
import Select from 'react-select';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilterCircleXmark, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

// --- Constants ---
const BASE_API_URL = 'http://localhost:8000/api'; // Make sure this is correct

// --- Helpers ---
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
             // Parse as YYYY-MM-DD (implicitly UTC if no time is specified)
             return new Date(dateString ).toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit'});
        }
        const date = new Date(dateString); // Try parsing directly for full ISO strings
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
        return dateString; // Fallback if parsing fails
    } catch (e) { console.error("Error formatting date:", dateString, e); return dateString; }
};
const formatDate = (dateString) => { // For timestamps
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit'});
        }
        return dateString; // Fallback
    } catch (e) { console.error("Error formatting timestamp:", dateString, e); return dateString; }
};
// --- End Helpers ---

// --- Filter Functions ---
const dateRangeFilterFn = (row, columnId, filterValue) => {
    try {
        const rowValueStr = row.getValue(columnId);
        if (!rowValueStr) return !filterValue?.start && !filterValue?.end; // Row passes if no date and no filter set
        const rowDate = new Date(rowValueStr ); // Compare date part as UTC
        if (isNaN(rowDate.getTime())) return true; // Let invalid row dates pass

        const startStr = filterValue?.start;
        const endStr = filterValue?.end;
        let startDate, endDate;

        if (startStr) {
            startDate = new Date(startStr );
            if (!isNaN(startDate.getTime()) && rowDate < startDate) return false;
        }
        if (endStr) {
            // Compare against the start of the *next* day (exclusive)
             let tempEnd = new Date(endStr );
             if (!isNaN(tempEnd.getTime())) {
                 tempEnd.setUTCDate(tempEnd.getUTCDate() + 1); // Use UTC date methods
                 endDate = tempEnd;
                 if (rowDate >= endDate) return false; // Use >= because we compare against start of *next* day
             }
        }
        return true;
    } catch (e) { console.error("Error in dateRangeFilterFn:", e); return true; }
};

const numericRangeFilterFn = (row, columnId, filterValue) => {
    const rowValue = parseFloat(row.getValue(columnId));
    if (isNaN(rowValue)) return true; // Let non-numeric rows pass

    const min = filterValue?.min !== undefined && filterValue.min !== '' ? parseFloat(filterValue.min) : undefined;
    const max = filterValue?.max !== undefined && filterValue.max !== '' ? parseFloat(filterValue.max) : undefined;

    if (min !== undefined && !isNaN(min) && rowValue < min) return false;
    if (max !== undefined && !isNaN(max) && rowValue > max) return false;
    return true;
};
// --- End Filter Functions ---


// --- Standalone Filter Component (Uses Table State Directly) ---
const RenderProjetFiltersComponent = ({
    table,
    domaineOptions,
    programmeOptions,
    optionsLoading
}) => {
    // Get column instances
    const dateDebutColumn = table.getColumn('Date_Debut');
    const dateFinColumn = table.getColumn('Date_Fin');
    const domaineColumn = table.getColumn('Domaine');
    const programmeColumn = table.getColumn('Programme_Description');
    const coutColumn = table.getColumn('Cout_Projet');
    const avPhysiColumn = table.getColumn('Etat_Avan_Physi');

    // Read filter values DIRECTLY from table state
    const dateDebutFilterValue = dateDebutColumn?.getFilterValue() || {};
    const dateFinFilterValue = dateFinColumn?.getFilterValue() || {};
    const domaineFilterValue = domaineColumn?.getFilterValue(); // string value or undefined
    const programmeFilterValue = programmeColumn?.getFilterValue(); // string value or undefined
    const coutFilterValue = coutColumn?.getFilterValue() || {};
    const avPhysiFilterValue = avPhysiColumn?.getFilterValue() || {};

    // Handlers to update table state DIRECTLY
    const handleDateChange = (column, part, value) => {
        const currentFilter = column?.getFilterValue() || {};
        const newFilter = { ...currentFilter, [part]: value || undefined };
        column?.setFilterValue(newFilter.start || newFilter.end ? newFilter : undefined);
    };

    const handleNumericRangeChange = (column, part, value) => {
        const currentFilter = column?.getFilterValue() || {};
        const numericValue = value === '' ? undefined : value;
        const newFilter = { ...currentFilter, [part]: numericValue };
        column?.setFilterValue(newFilter.min !== undefined || newFilter.max !== undefined ? newFilter : undefined);
    };

    const handleSelectChange = (column, selectedOption) => {
        column?.setFilterValue(selectedOption?.value ?? undefined);
    };

    // Reset all table filters
    const resetAllFilters = () => {
        table.resetColumnFilters();
        table.setGlobalFilter('');
    };

    const selectStyles = { control: base => ({ ...base, minHeight: '31px', fontSize: '0.875rem' }) };

    return (
        <Form className="p-2 border bg-light rounded mb-2 small" onSubmit={(e) => e.preventDefault()}>
            <Row className="g-2 align-items-end">

                {/* Domaine Filter */}
                <Col xs={12}>
                    <Form.Group controlId="filterDomaine">
                        <Form.Label size="sm" className="mb-1 fw-bold">Domaine</Form.Label>
                        <Select
                            options={domaineOptions}
                            value={domaineOptions.find(opt => opt.value === domaineFilterValue) || null}
                            onChange={(option) => handleSelectChange(domaineColumn, option)}
                            placeholder="Tous" isClearable size="sm" styles={selectStyles}
                            isLoading={optionsLoading} aria-label="Filtrer par domaine"
                        />
                    </Form.Group>
                </Col>

                 {/* Programme Filter */}
                <Col xs={12}>
                    <Form.Group controlId="filterProgramme">
                        <Form.Label size="sm" className="mb-1 fw-bold">Programme</Form.Label>
                        <Select
                            options={programmeOptions}
                            value={programmeOptions.find(opt => opt.value === programmeFilterValue) || null}
                            onChange={(option) => handleSelectChange(programmeColumn, option)}
                            placeholder="Tous" isClearable size="sm" styles={selectStyles}
                            isLoading={optionsLoading} aria-label="Filtrer par programme"
                         />
                    </Form.Group>
                </Col>

                 {/* Coût Projet Filter */}
                <Col xs={12}>
                    <Form.Group controlId="filterCoutProjet">
                        <Form.Label size="sm" className="mb-1 fw-bold">Coût Projet (Plage)</Form.Label>
                        <InputGroup size="sm">
                            <Form.Control type="number" placeholder="Min" step="0.01"
                                value={coutFilterValue.min ?? ''}
                                onChange={(e) => handleNumericRangeChange(coutColumn, 'min', e.target.value)}
                                aria-label="Coût minimum"/>
                            <Form.Control type="number" placeholder="Max" step="0.01"
                                value={coutFilterValue.max ?? ''}
                                onChange={(e) => handleNumericRangeChange(coutColumn, 'max', e.target.value)}
                                aria-label="Coût maximum"/>
                        </InputGroup>
                    </Form.Group>
                </Col>

                 {/* Av. Physi Filter */}
                <Col xs={12}>
                    <Form.Group controlId="filterAvPhysi">
                        <Form.Label size="sm" className="mb-1 fw-bold">Av. Physi (%) (Plage)</Form.Label>
                        <InputGroup size="sm">
                            <Form.Control type="number" placeholder="Min %" min="0" max="100" step="0.1"
                                value={avPhysiFilterValue.min ?? ''}
                                onChange={(e) => handleNumericRangeChange(avPhysiColumn, 'min', e.target.value)}
                                aria-label="Avancement physique minimum"/>
                            <Form.Control type="number" placeholder="Max %" min="0" max="100" step="0.1"
                                value={avPhysiFilterValue.max ?? ''}
                                onChange={(e) => handleNumericRangeChange(avPhysiColumn, 'max', e.target.value)}
                                aria-label="Avancement physique maximum"/>
                        </InputGroup>
                    </Form.Group>
                </Col>

                {/* Date Début Filter */}
                <Col xs={12}>
                    <Form.Group controlId="filterDateDebut">
                        <Form.Label size="sm" className="mb-1 fw-bold">Date Début (Plage)</Form.Label>
                        <InputGroup size="sm">
                            <Form.Control type="date" title="Date début min"
                                value={dateDebutFilterValue.start ?? ''}
                                onChange={(e) => handleDateChange(dateDebutColumn, 'start', e.target.value)}
                                aria-label="Date début minimum"/>
                            <Form.Control type="date" title="Date début max"
                                value={dateDebutFilterValue.end ?? ''}
                                onChange={(e) => handleDateChange(dateDebutColumn, 'end', e.target.value)}
                                aria-label="Date début maximum"/>
                        </InputGroup>
                    </Form.Group>
                </Col>

                {/* Date Fin Filter */}
                 <Col xs={12}>
                    <Form.Group controlId="filterDateFin">
                        <Form.Label size="sm" className="mb-1 fw-bold">Date Fin (Plage)</Form.Label>
                        <InputGroup size="sm">
                            <Form.Control type="date" title="Date fin min"
                                value={dateFinFilterValue.start ?? ''}
                                onChange={(e) => handleDateChange(dateFinColumn, 'start', e.target.value)}
                                aria-label="Date fin minimum"/>
                            <Form.Control type="date" title="Date fin max"
                                value={dateFinFilterValue.end ?? ''}
                                onChange={(e) => handleDateChange(dateFinColumn, 'end', e.target.value)}
                                aria-label="Date fin maximum"/>
                        </InputGroup>
                    </Form.Group>
                </Col>

                {/* Action Buttons */}
                <Col xs={12} className="d-flex justify-content-end align-items-end pt-3 pt-lg-0">
                    {/* Optional: Remove the explicit Filter button for ranges if onChange update is preferred */}
                    {/* <Button type="submit" variant="primary" size="sm" title="Appliquer les filtres Date/Coût/Avancement" className='me-2'>
                       <FontAwesomeIcon icon={faMagnifyingGlass} /> <span className="d-none d-lg-inline ms-1">Filtrer Plages</span>
                    </Button> */}
                    <Button variant="outline-secondary" size="sm" onClick={resetAllFilters} title="Réinitialiser tous les filtres">
                        <FontAwesomeIcon icon={faFilterCircleXmark} /> <span className="d-none d-lg-inline ms-1">Reset</span>
                    </Button>
                </Col>
            </Row>
        </Form>
    );
};
// --- End Standalone Filter Component ---


const ProjetsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const action = searchParams.get('action');
    const isCreating = action === 'create';

    // State for Filter Options
    const [domaineOptions, setDomaineOptions] = useState([]);
    const [programmeOptions, setProgrammeOptions] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(true);

    // Fetch Filter Options Effect
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setOptionsLoading(true);
            try {
                const [domaineRes, programmeRes] = await Promise.all([
                    axios.get(`${BASE_API_URL}/domaines`, { params: { perPage: 9999 }, withCredentials: true }),
                    axios.get(`${BASE_API_URL}/programmes`, { params: { perPage: 9999 }, withCredentials: true })
                ]);
                const domaines = domaineRes.data?.domaines || domaineRes.data || [];
                setDomaineOptions(domaines.map(d => ({ value: String(d.Id), label: d.Description }))); // Ensure value is string
                const programmes = programmeRes.data?.programmes || programmeRes.data || [];
                setProgrammeOptions(programmes.map(p => ({ value: String(p.Id), label: p.Description }))); // Ensure value is string
            } catch (error) { console.error("Error fetching filter options for Projets:", error); }
            finally { setOptionsLoading(false); }
        };
        fetchFilterOptions();
    }, []); // Run once on mount


    // Column Definition
    const projetColumns = useMemo(() => [
        { accessorKey: 'Code_Projet', header: 'Code', size: 50, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Nom_Projet', header: 'Nom Projet', size: 190, cell: info => <div className="text-truncate" style={{ maxWidth: '230px' }} title={info.getValue()}>{info.getValue() || '-'}</div>, meta: { enableGlobalFilter: true } },
        {
            id: 'Domaine', header: 'Domaine', size: 90,
            accessorFn: row => String(row.domaine?.Id ?? row.Id_Domaine ?? ''),
            cell: info => info.row.original.domaine?.Description || info.row.original.Id_Domaine || '-',
            meta: { filterVariant: 'select', enableGlobalFilter: true },
            filterFn: 'equalsString'
        },
        {
            id: 'Programme_Description', header: 'Programme', size: 190,
            accessorFn: row => String(row.programme?.Id ?? row.Id_Programme ?? ''),
            cell: info => { const fullText = info.row.original.programme?.Description || info.row.original.Id_Programme || '-'; return (<div className="text-truncate" style={{ maxWidth: '230px' }} title={typeof fullText === 'string' ? fullText : undefined}>{fullText}</div>); },
            meta: { filterVariant: 'select', enableGlobalFilter: true },
            filterFn: 'equalsString'
        },
        { accessorKey: 'Cout_Projet', header: 'Coût Projet', size: 130, cell: info => formatCurrency(info.getValue()), meta: { filterVariant: 'range', enableGlobalFilter: false }, filterFn: 'numericRange' },
        { accessorKey: 'Etat_Avan_Physi', header: 'Av. Physi', size: 110, cell: info => formatPercentage(info.getValue()), meta: { filterVariant: 'range', enableGlobalFilter: false }, filterFn: 'numericRange' },
        { accessorKey: 'Etat_Avan_Finan', header: 'Av. Finan', size: 110, cell: info => formatPercentage(info.getValue()), meta: { filterVariant: 'range', enableGlobalFilter: false }, filterFn: 'numericRange' },
        { accessorKey: 'Date_Debut', header: 'Date Début', size:130, cell: info => formatDateSimple(info.getValue()), meta: { filterVariant: 'date-range', enableGlobalFilter: false }, filterFn: 'dateRange' },
        { accessorKey: 'Date_Fin', header: 'Date Fin', cell: info => formatDateSimple(info.getValue()), size: 130, meta: { filterVariant: 'date-range', enableGlobalFilter: false }, filterFn: 'dateRange' },
    ], []); // Keep dependency array empty unless formatters/constants change

    // Default visible columns
    const defaultVisibleColumns = useMemo(() => [
        'Code_Projet', 'Nom_Projet', 'Domaine', 'Programme_Description',
        'Cout_Projet', 'Etat_Avan_Physi', 'Date_Debut', 'actions','Etat_Avan_Finan'
    ], []);

    // Search exclusions
    const searchExclusions = useMemo(() => [
        'ID_Projet', 'Id_Domaine', 'Id_Programme', 'Id_Chantier', 'Cout_CRO',
        'Date_Debut', 'Date_Fin', 'Etat_Avan_Finan','Etat_Avan_Physi', 'Cout_Projet',
        'created_at', 'updated_at', 'Observations',
        'domaine', 'programme', 'chantier', 'convention', 'engagements_financiers'
    ], []);

    // Prepare Filter Rendering Function
    const renderFilters = useCallback((table) => (
        <RenderProjetFiltersComponent
            table={table}
            domaineOptions={domaineOptions}
            programmeOptions={programmeOptions}
            optionsLoading={optionsLoading}
        />
    ), [domaineOptions, programmeOptions, optionsLoading]); // Add dependencies

    // Configuration object for DynamicTable props
    const tableConfig = useMemo(() => ({
        // Core API & Data
        fetchUrl: "/projets", dataKey: "projets", deleteUrlBase: "/projets",
        identifierKey: "ID_Projet", columns: projetColumns,
        itemName: "Projet", itemNamePlural: "Projets",

        // Display & Functionality
        displayKeyForDelete: "Code_Projet", defaultVisibleColumns: defaultVisibleColumns,
        globalSearchExclusions: searchExclusions, itemsPerPage: 8,
        enableColumnFiltering: true, enableGlobalFiltering: true,
        enableSorting: true, enablePagination: true,
        enableRowSelection: false, enableExport: true,
        enableColumnResizing: true, enableColumnOrdering: true,

        // Components for Modals
        CreateComponent: ProjetForm, ViewComponent: ProjetVisualisation, EditComponent: ProjetForm,

        // API & Formatting
        baseApiUrl: BASE_API_URL, formatDate: formatDate, formatDateSimple: formatDateSimple,

        // Filters
        renderFilters: renderFilters,
        customFilterFunctions: {
             dateRange: dateRangeFilterFn,
             numericRange: numericRangeFilterFn
             // React Table has built-in 'equalsString' for Selects, no need to register
        },

    }), [projetColumns, defaultVisibleColumns, searchExclusions, renderFilters]); // Ensure renderFilters is dependency

    const handleFormClose = (refreshNeeded = false) => { setSearchParams({}); /* Optional refresh logic */ };

    return (
        <div style={{ height: 'calc(100vh - 60px)', padding: '1rem' }}>
            {isCreating ? (
                <ProjetForm mode="create" onClose={handleFormClose} onSuccess={() => handleFormClose(true)} baseApiUrl={BASE_API_URL}/>
            ) : (
                <DynamicTable {...tableConfig} />
            )}
        </div>
    );
};

export default ProjetsPage;