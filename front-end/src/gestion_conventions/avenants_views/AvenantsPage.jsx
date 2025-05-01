import React, { useMemo, useState, useCallback, useEffect } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path if needed
import AvenantForm from './AvenantForm'; // Adjust path
import AvenantVisualisation from './AvenantVisualisation'; // Adjust path

// Import UI components and icons
import Select from 'react-select';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faUsers } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

// --- Helpers ---
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        // Using UTC suffix to avoid timezone shifts when only date is known
        const date = new Date(dateString + 'T00:00:00Z');
        if (isNaN(date.getTime())) return dateString; // Invalid date check
        return date.toLocaleDateString('fr-CA'); // YYYY-MM-DD format
    } catch (e) { return dateString; } // Fallback
};

const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '-';
    // Using MAD currency format
    return parseFloat(amount).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
};

const getTypeModificationColor = (type) => {
    switch (type) {
        case 'montant': return 'success';
        case 'durée': return 'info';
        case 'partenaire': return 'warning';
        case 'autre': return 'secondary';
        default: return 'light';
    }
};

// Helper to create options for react-select, handling duplicates and sorting
const createSelectOptions = (data, valueKey, labelKey) => {
    if (!data || !Array.isArray(data)) return [];
    const uniqueMap = new Map();
    data.forEach(item => {
        if (item && item[valueKey] !== null && item[valueKey] !== undefined) {
            const labelValue = labelKey && item[labelKey] ? item[labelKey] : item[valueKey];
            const label = String(labelValue); // Ensure label is a string
            // Check if value already exists before adding
            if (!uniqueMap.has(item[valueKey])) {
                uniqueMap.set(item[valueKey], { value: item[valueKey], label: label });
            }
        }
    });
    // Convert map values to array and sort by label
    return Array.from(uniqueMap.values()).sort((a, b) =>
        String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' })
    );
};
// --- End Helpers ---


// --- Component ---
const AvenantsPage = () => {
    const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

    // --- State for Select Options ---
    const [conventionOptions, setConventionOptions] = useState([]);
    const [typeModificationOptions] = useState([ // Keep static options directly in state
        { value: 'montant', label: 'Montant' },
        { value: 'durée', label: 'Durée' },
        { value: 'partenaire', label: 'Partenaire(s)' },
        { value: 'autre', label: 'Autre' },
    ]);
    const [optionsLoading, setOptionsLoading] = useState(true);

    // --- Fetch Options for Selects ---
    useEffect(() => {
        const fetchFilterOptions = async () => {
            console.log("Fetching options for Avenant filters...");
            setOptionsLoading(true);
            try {
                // Fetch conventions (adjust params if backend supports lightweight fetch)
                const convRes = await axios.get(`${BASE_API_URL}/conventions`, { params: { light: true }, withCredentials: true });
                // Safely access data, handle potential variations in response structure
                const conventions = Array.isArray(convRes.data?.conventions) ? convRes.data.conventions : (Array.isArray(convRes.data) ? convRes.data : []);
                // Map and sort convention options
                const mappedConvOptions = conventions
                    .filter(c => c?.id !== undefined && c?.Code !== undefined && c?.Intitule !== undefined) // Ensure needed fields exist
                    .map(c => ({ value: c.id, label: `${c.Code} - ${c.Intitule}` }))
                    .sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' }));
                setConventionOptions(mappedConvOptions);
                console.log("Convention Options for Filter loaded:", mappedConvOptions.length);

            } catch (error) {
                console.error("Error fetching convention options:", error.response?.data || error.message);
                setConventionOptions([]); // Set empty array on error
            } finally {
                setOptionsLoading(false); // Stop loading regardless of outcome
                console.log("Finished fetching options for Avenant filters.");
            }
        };
        fetchFilterOptions();
    }, [BASE_API_URL]); // Dependency: only API URL

    // --- Column Definition (Using Code 2's objet cell) ---
    const avenantColumns = useMemo(() => [
        {
            id: 'convention',
            header: 'Convention Parent',
            accessorFn: row => row.convention ? `${row.convention?.Code} - ${row.convention?.Intitule}` : `ID: ${row.convention_id}`,
            cell: info => <div className="text-truncate" title={info.getValue()} style={{ maxWidth: '300px' }}>{info.getValue() || '-'}</div>, // Fallback if null/empty
            size: 300,
            meta: { enableGlobalFilter: true } // Allow searching in this column
        },
        {
             accessorKey: 'numero_avenant', header: 'N° Avenant', size: 110,
             meta: { enableGlobalFilter: true }
        },
        {
             accessorKey: 'objet', header: 'Objet', size: 200,
             cell: info => <div className="text-truncate" title={info.getValue()} style={{ width: '300px' }}>{info.getValue()||'-'}</div>, // <<< Using Code 2's fallback
             meta: { enableGlobalFilter: true }
         },
         {
             accessorKey: 'type_modification', header: 'Type Modif.', size: 120, filterFn: 'equalsString', // Use exact match filter
             cell: info => {
                 const type = info.getValue();
                 const color = getTypeModificationColor(type);
                 const label = typeModificationOptions.find(opt => opt.value === type)?.label || type; // Get readable label
                 return type ? <Badge bg={color} text={color === 'light' || color === 'warning' ? 'dark' : 'white'} className="d-flex justify-content-center text-truncate">{label}</Badge> : '-';
             },
             meta: { enableGlobalFilter: true } // Can be searched by value ('montant', 'durée', etc.)
         },
        {
             accessorKey: 'date_signature', header: 'Date Signature', size: 140,
             cell: info => formatDate(info.getValue()),
             meta: { enableGlobalFilter: false } // Usually don't globally search dates like this
         },
        {
            id: 'files_count', header: <FontAwesomeIcon icon={faPaperclip} title="Fichiers" />,
            accessorFn: row => row.documents?.length ?? 0, // Safely get count
            cell: info => <span className={`text-center px-2 py-1 small rounded-5 ${info.getValue() !==0?'bg-warning':'bg-dark text-white'} fw-bold`}>{info.getValue()}</span>, // Styled count
            size: 30, enableSorting: false, meta: { enableGlobalFilter: false }
        },
        {
            id: 'partners_count', header: <FontAwesomeIcon icon={faUsers} title="Partenaires Affectés" />,
            accessorFn: row => row.partner_commitments?.length ?? 0, // Use the correct key from API response
            cell: info => <span className={`text-center px-2 py-1 small rounded-5 ${info.getValue() !==0?'bg-warning':'bg-dark text-white'} fw-bold`}>{info.getValue()}</span>, // Styled count
            size: 30, enableSorting: false, meta: { enableGlobalFilter: false }
        },
         {
             accessorKey: 'montant_modifie', header: 'Montant Modifié', size: 100,
             cell: info => info.row.original.type_modification === 'montant' ? formatCurrency(info.getValue()) : '-', // Conditionally display
             meta: { enableGlobalFilter: false } // Usually don't globally search specific amounts
         },
         {
             accessorKey: 'nouvelle_date_fin', header: 'Nouv. Date Fin', size: 100,
             cell: info => info.row.original.type_modification === 'durée' ? formatDate(info.getValue()) : '-', // Conditionally display
             meta: { enableGlobalFilter: false }
         },

    ], [typeModificationOptions]); // Dependency: typeModificationOptions for cell rendering

    // --- Local Filter State ---
    const [filterConvention, setFilterConvention] = useState(null);
    const [filterTypeModification, setFilterTypeModification] = useState(null);

    // --- Filter Rendering Function ---
    const renderAvenantFilters = useCallback((table) => {
        // Get column instances for filtering
        const conventionColumn = table.getColumn('convention');
        const typeModifColumn = table.getColumn('type_modification');

        return (
            <Row className="mb-3 gx-2 d-flex flex-column gy-2 align-items-end">
                <Col xs="12"><h6 className='mb-1'>Filtrer par:</h6></Col>
                 {/* Convention Filter */}
                 {conventionColumn && (
                    <Col xs={12}> {/* Full width for better usability */}
                        <Select
                            inputId="filterConvention"
                            name="conventionFilter"
                            options={conventionOptions}
                            value={filterConvention}
                            onChange={(selectedOption) => {
                                 setFilterConvention(selectedOption);
                                 // Filter by the underlying label (which includes code and intitule)
                                 conventionColumn.setFilterValue(selectedOption ? selectedOption.label : undefined);
                            }}
                            placeholder="Filtrer par Convention..."
                            isClearable
                            isLoading={optionsLoading}
                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: (base) => ({...base, minHeight: '32px', fontSize: '0.85rem'}), valueContainer: (base) => ({...base, padding: '0px 6px'}) }}
                            menuPortalTarget={document.body} // Ensure dropdown isn't cut off
                            classNamePrefix="react-select-filter"
                            theme={(theme) => ({ ...theme, borderRadius: 4, colors: { ...theme.colors, primary: '#0d6efd' } })}
                        />
                    </Col>
                 )}

                {/* Type Modification Filter */}
                {typeModifColumn && (
                    <Col xs={12}> {/* Full width */}
                        <Select
                            inputId="filterTypeModification"
                            name="typeModifFilter"
                            options={typeModificationOptions}
                            value={filterTypeModification}
                            onChange={(selectedOption) => {
                                setFilterTypeModification(selectedOption);
                                // Filter by the exact value ('montant', 'durée', etc.)
                                typeModifColumn.setFilterValue(selectedOption ? selectedOption.value : undefined);
                            }}
                            placeholder="Filtrer par Type Modification..."
                            isClearable
                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: (base) => ({...base, minHeight: '32px', fontSize: '0.85rem'}), valueContainer: (base) => ({...base, padding: '0px 6px'}) }}
                            menuPortalTarget={document.body}
                            classNamePrefix="react-select-filter"
                            theme={(theme) => ({ ...theme, borderRadius: 4, colors: { ...theme.colors, primary: '#0d6efd' } })}
                        />
                    </Col>
                )}

                 {/* Button to clear all filters */}
                 <Col xs="auto" className="mt-2"> {/* auto width for the button */}
                     <Button
                         variant="outline-secondary"
                         size="sm"
                         className="px-3"
                         onClick={() => {
                             setFilterConvention(null);
                             setFilterTypeModification(null);
                             table.resetColumnFilters(); // Reset tanstack table internal filter state
                         }}
                         title="Réinitialiser les filtres"
                     >
                         Effacer Filtres
                     </Button>
                 </Col>
            </Row>
        );
    }, [filterConvention, filterTypeModification, conventionOptions, typeModificationOptions, optionsLoading]); // Dependencies


    // --- DynamicTable Configuration ---
    // Define default visible columns
    const defaultCols = useMemo(() => [
        'convention', 'numero_avenant', 'objet', 'type_modification',
        'date_signature', 'files_count', 'partners_count', 'actions' // Standard set
    ], []);
    // Define all possible columns that can be shown/hidden
    const availableCols = useMemo(() => [
        'id', 'convention', 'numero_avenant', 'date_signature', 'objet',
        'type_modification', 'montant_modifie', 'nouvelle_date_fin',
        'files_count', 'partners_count', 'remarques', 'date_creation', // Include all relevant fields
    ], []);
    // Define columns to exclude from the global text search
    const searchExclusions = useMemo(() => [
        'id', 'convention_id', // IDs
        'montant_modifie', 'nouvelle_date_fin', // Specific numeric/date conditional fields
        'files_count', 'partners_count', // Counts
        'date_signature', 'date_creation', 'updated_at', // Dates
        'remarques' // Long text, maybe exclude? Or include if needed.
    ], []);

     // Define relationships to include in the API fetch using snake_case names from backend
     const includeParam = useMemo(() => {
        return 'convention,documents,partner_commitments.partenaire'; // Ensure keys match backend API expectations
     }, []);

    // --- Render Component ---
    return (
        // Main container with padding and scroll
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                // --- Core ---
                fetchUrl="/avenants"
                fetchParams={{ include: includeParam }} // Pass relationships to include
                dataKey="avenants" // Key in the API response containing the data array
                deleteUrlBase="/avenants" // Base URL for delete requests (ID will be appended)
                baseApiUrl={BASE_API_URL} // Pass the base API URL

                // --- Columns & Display ---
                columns={avenantColumns} // Defined column configuration
                itemName="Avenant" // Singular name for UI messages
                itemNamePlural="Avenants" // Plural name for UI messages
                identifierKey="id" // Primary key field of the items
                displayKeyForDelete="numero_avenant" // Field to display in delete confirmation

                // --- Options ---
                itemsPerPage={10} // Default items per page
                defaultVisibleColumns={defaultCols} // Default columns shown
                availableColumnKeys={availableCols} // All columns available for selection
                globalSearchExclusions={searchExclusions} // Columns excluded from global search
                enableManualFiltering={true} // Enable column-specific filters
                enableGlobalSearch={true} // Enable the main search bar

                // --- Components ---
                CreateComponent={AvenantForm} // Component for creating items
                ViewComponent={AvenantVisualisation} // Component for viewing items
                EditComponent={AvenantForm} // Component for editing items
                renderFilters={renderAvenantFilters} // Function to render custom filters

                // --- Styling & Actions ---
                actionColumnWidth={90} // Width for the actions column (Edit/View/Delete)
                tableClassName="table-striped table-hover table-sm" // Bootstrap table classes
            />
        </div>
    );
};

export default AvenantsPage;