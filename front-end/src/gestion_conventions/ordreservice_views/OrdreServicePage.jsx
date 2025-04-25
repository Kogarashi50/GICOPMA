
// src/gestion_conventions/ordres_service_views/OrdreServicePage.jsx (adjust path as needed)

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import axios from 'axios'; // For fetching Marche options for filtering
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
import OrdreServiceForm from './OrdreServiceForm';     // Component for Create/Edit
import OrdreServiceVisualisation from './OrdreServiceVisualisation'; // Component for View

// --- UI & Utilities ---
import Select from 'react-select';
import { Badge, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes, faLink, faPlayCircle, faStopCircle, faFileSignature, faPaperclip, faFileContract
} from '@fortawesome/free-solid-svg-icons';

// --- Constants & Helpers ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const TYPE_OPTIONS = [
    { value: 'commencement', label: 'Commencement' }, // Keep labels short for filter dropdown
    { value: 'arret', label: 'Arrêt' }
];
// Helper: Formats date string (e.g., YYYY-MM-DD HH:MM:SS) to DD/MM/YYYY
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return dateString; // Return original if format unexpected
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Date format error:", dateString, e);
        return dateString; // Fallback to original string
    }
};

// Helper: Gets display properties (label, icon, color) for OrdreService type
const getTypeDisplay = (typeValue) => {
    switch (typeValue) {
        case 'commencement': return { label: 'Commencement', icon: faPlayCircle, color: 'success' };
        case 'arret': return { label: 'Arrêt', icon: faStopCircle, color: 'danger' };
        default: return { label: typeValue || 'N/A', icon: faFileSignature, color: 'secondary' };
    }
};

// Helper: Constructs the public URL for accessing stored files
const getPublicFileUrl = (baseApiUrl, relativePath) => {
    if (!relativePath || !baseApiUrl) return null;
    try {
        const url = new URL(baseApiUrl);
        let baseUrl = url.origin;
        if (url.pathname.includes('/api')) {
            baseUrl += url.pathname.substring(0, url.pathname.indexOf('/api'));
        }
        baseUrl = baseUrl.replace(/\/$/, '');
        return `${baseUrl}/storage/${relativePath.replace(/^\//, '')}`;
    } catch (e) {
        console.error("Error constructing public URL:", e);
        return null;
    }
};
// --- End Helpers ---


// --- Main Page Component ---
const OrdreServicePage = () => {

    // State for Marche Public options used in the filter dropdown
    const [marcheOptions, setMarcheOptions] = useState([]);
    const [loadingMarcheOptions, setLoadingMarcheOptions] = useState(true);

    // --- Effect to Fetch Marche Public Options for Filtering ---
    useEffect(() => {
        let isMounted = true;
        setLoadingMarcheOptions(true);
        console.log("OrdreServicePage: Fetching Marche options for filter...");
        // Fetch a simplified list of Marches - adjust endpoint/params as needed
        axios.get(`${BASE_API_URL}/marches-publics?fields=id,numero_marche,intitule`)
            .then(response => {
                if (!isMounted) return;
                // Map the response data to the { value, label } format for react-select
                // Ensure keys match your actual API response structure
                const options = (response.data?.marches_publics || response.data || []).map(m => ({
                    value: m.id,
                    label: `${m.numero_marche} - ${m.intitule}`.substring(0, 100) + (m.intitule.length > 100 ? '...' : '')
                }));
                setMarcheOptions(options);
                console.log(`Fetched ${options.length} Marche options for filter.`);
            })
            .catch(error => {
                if (!isMounted) return;
                console.error("Error fetching Marche options for filter:", error);
                // Handle error - maybe show a message to the user
                setMarcheOptions([]); // Set empty array on error
            })
            .finally(() => {
                if (isMounted) setLoadingMarcheOptions(false);
            });
        // Cleanup function
        return () => { isMounted = false; };
    }, []); // Runs once on component mount

    // --- Column Definitions for the DynamicTable ---
    const ordreColumns = useMemo(() => [
        {
            accessorKey: 'marche_public', // Access the nested object fetched via 'with()' in the controller
            header: 'Marché Public Lié',
            size: 200, // Adjust size as needed
            // Cell rendering function - expects marchePublic: { id, numero_marche, intitule }
            cell: info => {
                const marche = info.getValue(); // marche will be the marchePublic object or null/undefined
                return marche ? (
                    <div className="text-truncate" style={{ maxWidth: '200px' }} title={`${marche.numero_marche} - ${marche.intitule}`}>
                        <FontAwesomeIcon icon={faFileContract} className="me-2 text-info small" />
                        {marche.numero_marche || 'N/A'} {/* Display numero_marche */}
                    </div>
                ) : (
                    <span className='text-muted'>-</span> // Display if no marche data
                );
            },
            meta: {
                align: 'left',
                enableSorting: false, // Sorting on related object data can be complex
                enableGlobalFilter: true, // Allow global search to check marchePublic.numero_marche (if backend supports)
            },
            // Custom filter function needed to filter based on the ID from the Select dropdown
            filterFn: (row, columnId, filterValue) => {
                // filterValue will be the selected marche ID (e.g., 5)
                // Compare it with the ID inside the row's marchePublic object
                return row.original?.marche_public?.id == filterValue; // Use loose equality for type flexibility
            },
        },
        {
            accessorKey: 'type',
            header: 'Type',
            size: 200,
            // Use a predefined filter function for exact string matching
            filterFn: 'equalsString', // 'equals' or 'equalsString' from react-table
            cell: info => {
                const typeVal = info.getValue();
                const typeInfo = getTypeDisplay(typeVal); // Use helper for consistent display
                return typeVal ? (
                    <Badge bg={typeInfo.color || 'secondary'} text="white" className="px-2 py-1 shadow-sm">
                        <FontAwesomeIcon icon={typeInfo.icon} className="me-1 fa-fw" /> {typeInfo.label}
                    </Badge>
                ) : '-';
            },
            meta: { align: 'center', enableGlobalFilter: true },
        },
        {
            accessorKey: 'numero',
            header: 'Numéro OS',
            size: 200,
            meta: { align: 'left', enableGlobalFilter: true } // Allow searching by numero
        },
        {
            accessorKey: 'date_emission',
            header: 'Date Émission',
            size: 200,
            cell: info => formatDate(info.getValue()), // Format date for display
            meta: { align: 'center', enableGlobalFilter: false } // Date search usually not needed globally
        },
        {
            accessorKey: 'fichier_joint',
            header: 'Fichier',
            size: 80,
            enableSorting: false, // Cannot sort by file attachment meaningfully
            cell: info => {
                 const path = info.getValue(); // Get the relative path from data
                 const url = getPublicFileUrl(BASE_API_URL, path); // Generate public URL
                 const name = path ? path.split('/').pop() : null; // Extract filename
                 return url ? (
                     <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary p-1" title={name || 'Voir fichier'}>
                         <FontAwesomeIcon icon={faPaperclip} /> {/* Simple paperclip icon */}
                     </a>
                 ) : (
                    <span className='text-muted'>-</span> // Display dash if no file
                 );
            },
            meta: { align: 'center', enableGlobalFilter: false }, // Cannot search file content
        },
        // Optional: Add description column if needed, maybe truncated
        // {
        //     accessorKey: 'description', header: 'Description', size: 200,
        //     cell: info => <div className="text-truncate" style={{ maxWidth: '180px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
        //     meta: { align: 'left', enableGlobalFilter: true },
        // },

    ], [BASE_API_URL]); // Include BASE_API_URL if getPublicFileUrl uses it directly

    // --- Filter Rendering Function for DynamicTable ---
    const renderOrdreFilters = useCallback((table) => {
        if (!table) return null; // Guard clause

        // Get column instances to manage their filter state
        const marcheColumn = table.getColumn('marche_public'); // Matches accessorKey
        const typeColumn = table.getColumn('type');           // Matches accessorKey

        // Check if any column filters are currently active
        const isAnyColumnFiltered = table.getState().columnFilters.length > 0;

        return (
            <Form>
                {/* Marche Public Filter Dropdown */}
                <Form.Group controlId="filterMarche" className="mb-3">
                   <Form.Label className="small mb-1 fw-bold">Filtrer par Marché Public</Form.Label>
                   <Select
                       inputId="filterMarcheSelect"
                       options={marcheOptions}
                       // Find the selected option based on the current filter value (which is the ID)
                       value={marcheOptions.find(option => option.value == marcheColumn?.getFilterValue()) || null} // Use loose equality
                       // Update the column's filter value when selection changes
                       onChange={option => marcheColumn?.setFilterValue(option?.value ?? undefined)} // Set filter to ID or undefined
                       placeholder={loadingMarcheOptions ? "Chargement..." : "Tous les Marchés..."}
                       isClearable // Allow user to clear the filter
                       isLoading={loadingMarcheOptions} // Show loading state
                       isDisabled={loadingMarcheOptions} // Disable while loading
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} // Ensure dropdown appears above table
                       menuPortalTarget={document.body}
                       aria-label="Filtrer par marché public"
                   />
                </Form.Group>

                {/* Type Filter Dropdown */}
                 <Form.Group controlId="filterTypeOrdre" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Filtrer par Type</Form.Label>
                    {/* Use the same options structure as the form */}
                    <Select
                       inputId="filterTypeOrdreSelect"
                       options={TYPE_OPTIONS}
                       value={TYPE_OPTIONS.find(option => option.value === typeColumn?.getFilterValue()) || null}
                       onChange={option => typeColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder="Tous les Types..."
                       isClearable
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                       menuPortalTarget={document.body}
                       aria-label="Filtrer par type d'ordre"
                   />
                 </Form.Group>

                {/* Button to Reset Column Filters */}
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => table.resetColumnFilters()} // Calls react-table's reset function
                    disabled={!isAnyColumnFiltered} // Disable if no filters applied
                    className="w-100 mt-3"
                >
                   <FontAwesomeIcon icon={faTimes} className="me-2"/> Réinitialiser les Filtres
                </Button>
            </Form>
        );
    }, [marcheOptions, loadingMarcheOptions]); // Dependencies: Re-render if options or loading state change


    // --- DynamicTable Configuration ---
    // Define which columns are visible by default
    const defaultVisibleCols = useMemo(() => [
        'marche_public', // Show the linked market
        'numero',       // Show the OS number
        'type',         // Show the OS type
        'date_emission',// Show the issue date
        'fichier_joint',// Show the file link icon
        'actions'       // Actions column (View, Edit, Delete) is added by DynamicTable
    ], []);

    // --- Component Return ---
    return (
        // Basic page container styling
        <div style={{ height: 'calc(100vh - 56px)', padding: '1rem', overflowY: 'auto' }}>
            <DynamicTable
                // --- API Endpoints ---
                fetchUrl="/ordres-service"   // Endpoint to fetch the list (GET) - assumes backend handles filtering/sorting/pagination via query params
                dataKey="data"               // ** IMPORTANT: Key in the API response containing the array of orders. Adjust if your pagination response is different (e.g., 'ordres_service')**
                // If using pagination, DynamicTable might need specific props for total count, etc.
                // For non-paginated: dataKey="ordres_service" (matching controller's non-paginated return)
                deleteUrlBase="/ordres-service" // Base URL for deleting items (DELETE /ordres-service/{id})
                baseApiUrl={BASE_API_URL}    // Base URL for constructing view/edit links if needed internally

                // --- Data Configuration ---
                columns={ordreColumns}           // Defined column structure
                itemName="Ordre de Service"      // Singular name for labels/confirmations
                itemNamePlural="Ordres de Service" // Plural name for labels
                identifierKey="id"               // Primary key field of the data items
                displayKeyForDelete="numero"     // Field to show in the delete confirmation dialog

                // --- Table Features ---
                itemsPerPage={15}                // Default items per page (if pagination is used)
                defaultVisibleColumns={defaultVisibleCols} // Columns shown initially
                renderFilters={renderOrdreFilters} // Function to render custom filter UI
                enableGlobalSearch={true}        // Enable the main search bar (backend must support 'search' query param)
                enableColumnFilters={true}       // Enable column-specific filters defined above

                // --- CRUD Components ---
                // Pass the components used for Create, View, and Edit actions
                // OrdreServiceForm now handles marcheId selection internally for Create mode
                CreateComponent={OrdreServiceForm}
                ViewComponent={OrdreServiceVisualisation}
                EditComponent={OrdreServiceForm}

                // --- Styling & Layout ---
                actionColumnWidth={90}          // Width of the actions column (View/Edit/Delete buttons)
                tableClassName="table-striped table-hover" // Optional Bootstrap table styling classes
            />
        </div>
    );
};

export default OrdreServicePage;
