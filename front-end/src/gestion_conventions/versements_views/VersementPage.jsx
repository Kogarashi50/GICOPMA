import React, { useMemo, useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types'; // <<< ADD THIS IMPORT
import DynamicTable from '../components/DynamicTable'; // ADJUST PATH if needed
import VersementForm from './VersementForm'; // ADJUST PATH if needed (Form for VersementCP)
import VersementVisualisation from './VersementVisualisation'; // ADJUST PATH if needed (Visualisation for VersementCP)

// Import UI components and icons
import Select from 'react-select';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilterCircleXmark, faMagnifyingGlass, faFileContract, faHandshake } from '@fortawesome/free-solid-svg-icons';
import Spinner from 'react-bootstrap/Spinner'; // Added Spinner import

// --- Helpers ---
const formatDate = (dateString) => {
    if (!dateString || typeof dateString !== 'string') return '-';
    try {
        // Handle potential existing 'dd/MM/yyyy' format if passed back
        if (/^\d{2}\/\d{2}\/\d{4}/.test(dateString)) return dateString;
        // Try parsing YYYY-MM-DD or full ISO (treat date part as UTC)
        const date = new Date(dateString.split('T')[0] + 'T00:00:00Z');
        if (isNaN(date.getTime())) return dateString;
        // Use 'fr-CA' for YYYY-MM-DD format which is good for inputs, but 'fr-FR' might be preferred for display
        return date.toLocaleDateString('fr-CA', {
            year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC'
        });
    } catch (e) { console.error("formatDate Error:", dateString, e); return dateString; }
};

const formatCurrency = (amount) => {
    const number = parseFloat(amount);
    if (isNaN(number)) return '-';
    return number.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
};


// --- End Helpers ---


// --- Filter Functions ---
const amountRangeFilterFn = (row, columnId, filterValue) => {
    const rowValue = parseFloat(row.getValue(columnId));
    if (isNaN(rowValue)) return true; // Or false, depending if you want NaN rows excluded

    const min = filterValue?.min !== undefined && filterValue.min !== '' ? parseFloat(filterValue.min) : undefined;
    const max = filterValue?.max !== undefined && filterValue.max !== '' ? parseFloat(filterValue.max) : undefined;

    if (min !== undefined && !isNaN(min) && rowValue < min) return false;
    if (max !== undefined && !isNaN(max) && rowValue > max) return false;
    return true;
};

const dateRangeFilterFn = (row, columnId, filterValue) => {
    try {
        const rowValueStr = row.getValue(columnId);
        if (!rowValueStr) return !filterValue?.start && !filterValue?.end; // Handle null/empty dates

        // Attempt to parse date, assuming YYYY-MM-DD or compatible format
        const rowDate = new Date(rowValueStr.split('T')[0] + 'T00:00:00Z'); // Compare dates only UTC
        if (isNaN(rowDate.getTime())) return true; // Don't filter if row date is invalid

        const startStr = filterValue?.start;
        const endStr = filterValue?.end;
        let startDate, endDate;

        if (startStr) {
            startDate = new Date(startStr + 'T00:00:00Z'); // Start of day UTC
            if (!isNaN(startDate.getTime()) && rowDate < startDate) return false;
        }
        if (endStr) {
            endDate = new Date(endStr + 'T00:00:00Z'); // End of day UTC
            if (!isNaN(endDate.getTime()) && rowDate > endDate) return false;
        }
        return true;
    } catch (e) { console.error("Error in dateRangeFilterFn:", e); return true; }
};
// --- End Filter Functions ---


// --- Standalone Filter Component ---
const RenderVersementFiltersComponent = ({
    table,
    externalFilterConvPartId,
    setExternalFilterConvPartId,
    optionsLoading,
}) => {
    // Get initial values from table state
    const initialDateFilter = table.getColumn('date_versement')?.getFilterValue() || {};
    const initialAmountFilter = table.getColumn('montant_verse')?.getFilterValue() || {};

    // Local state for filter inputs
    const [localDateDebut, setLocalDateDebut] = useState(initialDateFilter.start || '');
    const [localDateFin, setLocalDateFin] = useState(initialDateFilter.end || '');

    const [localMontantMin, setLocalMontantMin] = useState(initialAmountFilter.min || '');
    const [localMontantMax, setLocalMontantMax] = useState(initialAmountFilter.max || '');

    // Get column instances
    const dateColumn = table.getColumn('date_versement');
    const montantColumn = table.getColumn('montant_verse');

    // Apply date/amount range filters
    const applyRangeFilters = () => {
        dateColumn?.setFilterValue(
            (localDateDebut || localDateFin) ? { start: localDateDebut || undefined, end: localDateFin || undefined } : undefined
        );
        montantColumn?.setFilterValue(
            (localMontantMin || localMontantMax) ? { min: localMontantMin || undefined, max: localMontantMax || undefined } : undefined
        );
    };

    // Handle select change

    // Reset all filters
    const resetAllFilters = () => {
        setLocalDateDebut(''); setLocalDateFin('');
        
        setLocalMontantMin(''); setLocalMontantMax('');
        setExternalFilterConvPartId(''); // Reset external state -> triggers URL change / refetch
        table.resetColumnFilters();
        table.setGlobalFilter('');
    };

    // Styles for react-select
    const selectStyles = {
      control: base => ({ ...base, minHeight: '31px', fontSize: '0.875rem' }),
      menu: base => ({ ...base, zIndex: 1050 }), // Ensure dropdown is above table elements if needed
    };

    return (
        <Form className="p-2 border bg-light rounded mb-2 small" onSubmit={(e) => {e.preventDefault(); applyRangeFilters();}}>
            <Row className="g-2 align-items-end">
                {/* ID Engagement Filter */}
                {/* <Col xs={12} >
                    <Form.Group controlId="filterConvPartId">
                        <Form.Label size="sm" className="mb-1 fw-bold">ID Engagement (CP)</Form.Label>
                        <Form.Control
                            type="number" size="sm"
                            placeholder="Filtrer par ID_CP"
                            value={externalFilterConvPartId}
                            onChange={(e) => setExternalFilterConvPartId(e.target.value)}
                            aria-label="Filtrer par ID Engagement"
                        />
                    </Form.Group>
                </Col> */}

                {/* Date Range Filter */}
                <Col xs={12} >
                    <Form.Group controlId="filterDateRange">
                        <Form.Label size="sm" className="mb-1 fw-bold">Date Versement</Form.Label>
                        <InputGroup size="sm">
                            <Form.Control type="date" title="Date début" value={localDateDebut} onChange={(e) => setLocalDateDebut(e.target.value)} aria-label="Date début versement"/>
                            <Form.Control type="date" title="Date fin" value={localDateFin} onChange={(e) => setLocalDateFin(e.target.value)} aria-label="Date fin versement"/>
                        </InputGroup>
                    </Form.Group>
                </Col>

                

                {/* Montant Range Filter */}
                 <Col xs={12} >
                    <Form.Group controlId="filterMontantRange">
                        <Form.Label size="sm" className="mb-1 fw-bold">Montant Versé</Form.Label>
                        <InputGroup size="sm">
                            <Form.Control type="number" placeholder="Min" step="0.01" value={localMontantMin} onChange={(e) => setLocalMontantMin(e.target.value)} aria-label="Montant minimum"/>
                            <Form.Control type="number" placeholder="Max" step="0.01" value={localMontantMax} onChange={(e) => setLocalMontantMax(e.target.value)} aria-label="Montant maximum"/>
                        </InputGroup>
                    </Form.Group>
                </Col>

                {/* Action Buttons */}
                <Col xs={6}  className="d-flex align-items-end">
                    <Button type="submit" variant="primary" size="sm" className="w-100" title="Appliquer filtres Date/Montant">
                       <FontAwesomeIcon icon={faMagnifyingGlass} /> <span className="d-none d-md-inline ms-1">Filtrer</span>
                    </Button>
                </Col>
                <Col xs={6}  className="d-flex align-items-end">
                    <Button variant="outline-secondary" size="sm" className="w-100" onClick={resetAllFilters} title="Réinitialiser tous les filtres">
                        <FontAwesomeIcon icon={faFilterCircleXmark} /> <span className="d-none d-md-inline ms-1">Reset</span>
                    </Button>
                </Col>
            </Row>
        </Form>
    );
};
// --- End Standalone Filter Component ---


// --- Main Page Component ---
const VersementPage = () => {
    const BASE_API_URL = 'http://localhost:8000/api'; // MAKE SURE THIS IS CORRECT

    // State for options loading (if applicable)
    const [optionsLoading, setOptionsLoading] = useState(false); // Example, adjust if needed

    // State for URL-based filter (triggers refetch via key prop)
    const [filterConvPartId, setFilterConvPartId] = useState('');

    // --- Column Definition ---
    const versementColumns = useMemo(() => [
        { accessorKey: 'id', header: 'ID', size: 30, enableHiding: true, enableColumnFilter: false, meta: { enableGlobalFilter: false } },
        {
            id: 'convention_details', header: 'Convention', filterFn: 'includesString',
            accessorFn: row => {
                 const conv = row.conv_part?.convention;
                 return conv ? `${conv.code || ''} ${conv.intitule || ''}`.trim() : '';
            },
            cell: info => {
                const convention = info.row.original.conv_part?.convention;
                if (!convention) return '-';
                const displayText = `${convention.code || ''}${convention.intitule ? ' - ' + convention.intitule : ''}`;
                return ( <div className="text-truncate" style={{ maxWidth: '300px' }} title={displayText}> <FontAwesomeIcon icon={faFileContract} className="me-2 text-primary opacity-75" /> {displayText || '-'} </div> );
            },
            size: 300, meta: { enableGlobalFilter: true }
        },
        {
            id: 'partenaire_details', header: 'Partenaire', filterFn: 'includesString',
            accessorFn: row => row.conv_part?.partenaire?.Description || row.conv_part?.partenaire?.Description_Arr || '', // Return empty string if undefined
            cell: info => {
                const description = info.getValue();
                return ( <div className="text-truncate" style={{ maxWidth: '300px' }} title={description}> {description ? (<><FontAwesomeIcon icon={faHandshake} className="me-2 text-success opacity-75" />{description}</> ) : ( '-' )} </div> );
             },
            size: 300, meta: { enableGlobalFilter: true }
        },
        {
            accessorKey: 'date_versement', header: 'Date Versement',
            cell: info => formatDate(info.getValue()),
            size: 150, meta: { filterVariant: 'date-range', enableGlobalFilter: false },
            filterFn: 'dateRange'
        },
        {
            accessorKey: 'montant_verse', header: 'Montant Versé',
            cell: info => formatCurrency(info.getValue()),
            size: 150, meta: { filterVariant: 'range', enableGlobalFilter: false },
            filterFn: 'amountRange'
        },
        
        { accessorKey: 'commentaire', header: 'Commentaire', cell: info => <div className="text-truncate" style={{ maxWidth: '170px' }} title={info.getValue()}>{info.getValue() || '-'}</div>, size: 170, enableHiding: true, meta: { enableGlobalFilter: true } },
    ], [/* No external dependencies here if PAIEMENT_METHODE_OPTIONS is constant */]);


    // --- Prepare Filter Rendering Function ---
    const renderFilters = useCallback((table) => (
        <RenderVersementFiltersComponent
            table={table}
            externalFilterConvPartId={filterConvPartId}
            setExternalFilterConvPartId={setFilterConvPartId}
            optionsLoading={optionsLoading}
        />
    ), [filterConvPartId, optionsLoading]); // Dependencies


    // --- DynamicTable Configuration ---
    const defaultVisibleColumns = useMemo(() => [ 'convention_details', 'partenaire_details', 'date_versement', 'montant_verse',  'actions' ], []);
    const availableColumnKeys = useMemo(() => [ 'id', 'convention_details', 'partenaire_details', 'date_versement', 'montant_verse', 'commentaire' ], []);
    const searchExclusions = useMemo(() => [ 'id', 'montant_verse', 'date_versement' ], []);

    // API Fetch URL depends on filterConvPartId state
    const dynamicFetchUrl = useMemo(() => {
        // !!! IMPORTANT: Verify this base path matches your VersementCPController route !!!
        let url = "/versements"; // <<< ADJUST IF NEEDED (e.g., to "/versements")

        if (filterConvPartId && filterConvPartId.trim() !== '') {
            // Ensure the parameter name matches what VersementCPController expects
            url += `?convpart_id=${encodeURIComponent(filterConvPartId.trim())}`;
        }
        return url;
    }, [filterConvPartId]);

    // Define the configuration object for DynamicTable
    const tableConfig = useMemo(() => ({
        // --- Core API & Data ---
        fetchUrl: dynamicFetchUrl,         // API endpoint (dynamic based on filter)
        dataKey: "versements",             // Key in the API response containing the data array
        // !!! IMPORTANT: Verify this base path for DELETE matches your VersementCPController route !!!
        deleteUrlBase: "/versements",    // Base URL for DELETE requests <<< ADJUST IF NEEDED (e.g., to "/versements")
        identifierKey: "id",               // Primary Key column name for VersementCP model
        columns: versementColumns,         // Column definitions
        itemName: "Versement",             // Singular name for messages
        itemNamePlural: "Versements (CP)", // Plural name for messages (added CP for clarity)

        // --- Display & Functionality ---
        displayKeyForDelete: "id",         // Field to display in delete confirmation (e.g., "Versement ID {id}")
        defaultVisibleColumns: defaultVisibleColumns, // Default columns shown
        globalSearchExclusions: searchExclusions, // Fields excluded from global search
        itemsPerPage: 10,                   // Default items per page
        enableColumnFiltering: true,        // Enable per-column filters (uses renderFilters for UI)
        enableGlobalFiltering: true,        // Enable the global search bar
        enableSorting: true,                // Enable column sorting
        enablePagination: true,             // Enable table pagination
        enableRowSelection: false,          // Disable row selection checkboxes if not needed
        enableExport: true,                 // Enable data export button (if DynamicTable supports it)

        // --- CRUD Actions & Components ---
        enableAdding: true,                // <<< ENABLE Add button
        enableEditing: true,               // <<< ENABLE Edit button
        enableViewing: true,               // <<< ENABLE View button
        enableDeleting: true,              // <<< ENABLE Delete button
        CreateComponent: VersementForm,        // Component used for creating an item
        EditComponent: VersementForm,          // Component used for editing an item
        ViewComponent: VersementVisualisation, // Component used for viewing an item

        // --- API & Formatting & Filters ---
        baseApiUrl: BASE_API_URL,           // Base URL for API calls made *from within* the Form/Visualisation components
        // Pass filter rendering function and custom logic
        renderFilters: renderFilters,
        customFilterFunctions: { amountRange: amountRangeFilterFn, dateRange: dateRangeFilterFn },

        // --- Optional: Customizations ---
        // formatCurrency: formatCurrency // Can pass helpers if DynamicTable needs them directly

    }), [
        dynamicFetchUrl, // Re-evaluate config if fetch URL changes
        versementColumns,
        defaultVisibleColumns,
        searchExclusions,
        renderFilters, // Include renderFilters as dependency
        BASE_API_URL  // Include baseApiUrl if it could change
    ]);


    // --- Render DynamicTable ---
    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            {/* Use the dynamic URL as key to force re-render/refetch when filter changes */}
            <DynamicTable
                key={dynamicFetchUrl}
                // Spread the configuration object as props
                {...tableConfig}
            />
        </div>
    );
};

// Prop types for RenderVersementFiltersComponent (if needed for linting/checking)
// Make sure PropTypes is imported at the top
RenderVersementFiltersComponent.propTypes = {
  table: PropTypes.object.isRequired,
  externalFilterConvPartId: PropTypes.string.isRequired,
  setExternalFilterConvPartId: PropTypes.func.isRequired,
  optionsLoading: PropTypes.bool.isRequired,
};

export default VersementPage;