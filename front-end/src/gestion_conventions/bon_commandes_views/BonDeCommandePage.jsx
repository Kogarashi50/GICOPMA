import React, { useMemo } from 'react';
// --- Import Badge from react-bootstrap ---
import { Badge } from 'react-bootstrap';
import DynamicTable from '../components/DynamicTable'; // Adjust path
import BonDeCommandeForm from './BonDeCommandeForm';       // Adjust path
import BonDeCommandeVisualisation from './BonDeCommandeVisualisation'; // Adjust path

// Make sure BASE_API_URL is defined, either via import.meta.env or hardcoded
const BASE_API_URL =  'http://localhost:8000/api';

// --- Helper Functions ---
const formatDecimal = (value, decimals = 2) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    return number.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

// Improved date formatting to handle potential timezone issues and invalid dates
const formatDateSimple = (dateString) => {
    if (!dateString) return '-';
    try {
        // Try parsing the date string
        const date = new Date(dateString);
        // Check if the date object is valid
        if (isNaN(date.getTime())) {
             console.warn("Could not format invalid date:", dateString);
             return dateString; // Return original string if parsing fails
        }
        // Use localeString with options for YYYY-MM-DD format, assumes UTC if no TZ provided
        // Using 'fr-CA' locale often gives YYYY-MM-DD by default
        return date.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString; // Return original string on error
    }
};

const displayData = (data, fallback = '-') => data ?? fallback;

// --- Status Options and Color Helper ---
const STATUT_OPTIONS = [
    // Ensure values exactly match backend ENUM or possible string values
    { value: 'en préparation', label: 'En préparation', color: 'primary' }, // Changed color
    { value: 'validé', label: 'Validé', color: 'info' },         // Changed color
    { value: 'envoyé', label: 'Envoyé', color: 'warning' },
    { value: 'reçu', label: 'Reçu', color: 'success' },
    { value: 'annulé', label: 'Annulé', color: 'danger' }
];

const getStatusColor = (statusValue) => {
    // Handle potential case inconsistencies
    const lowerStatus = statusValue?.toLowerCase();
    const option = STATUT_OPTIONS.find(opt => opt.value.toLowerCase() === lowerStatus);
    return option ? option.color : "secondary"; // Default to secondary if not found
};
// --- End Helpers ---


// --- Component Definition ---
const BonDeCommandePage = () => {
    const bonDeCommandeColumns = useMemo(() => [
        {
            accessorKey: 'numero_bc', header: 'Numéro', size: 50,
            meta: { filterVariant: 'text', enableGlobalFilter: true }
        },
        {
            accessorKey: 'objet', header: 'Objet', size: 270, // Increased size
             // Use standard text display, maybe with tooltip if needed via CSS/parent component
             cell: info => <span title={info.getValue() || ''}>{info.getValue().length>35?displayData(info.getValue()).slice(0,35)+'...':displayData(info.getValue())}</span>,
            meta: { filterVariant: 'text', enableGlobalFilter: true }
        },
        {
            accessorKey: 'fournisseur_nom', header: 'Fournisseur', size: 160,
            meta: { filterVariant: 'text', enableGlobalFilter: true }
        },
        {
            accessorKey: 'date_emission', header: 'D. Émission', size: 110,
            // Use the robust formatDateSimple for display
            cell: info => formatDateSimple(info.getValue()),
            meta: { enableGlobalFilter: false } // Usually don't globally filter dates like this
        },
        {
            accessorKey: 'montant_total', header: 'Montant Total', size: 130,
            cell: info => formatDecimal(info.getValue()) + ' DH', // Add currency
             meta: { enableGlobalFilter: false } // Usually don't globally filter amounts
        },
        {
            accessorKey: 'etat', header: 'État', size: 80,
            // Ensure filter matches the *value* sent from backend
            meta: { filterVariant: 'select', filterOptions: STATUT_OPTIONS.map(o => o.value), enableGlobalFilter: true },
            cell: info => {
                const etat = info.getValue();
                const color = getStatusColor(etat);
                // Determine text color based on background for readability
                const textColor = ['warning', 'light', 'info'].includes(color) ? 'dark' : 'white';
                // Render the badge using the helper function for color
                return etat ? (
                    <Badge bg={color} text={textColor} className="w-100 text-truncate  py-1 px-2" style={{fontSize: '0.6rem'}}>
                        {etat}
                    </Badge>
                ) : displayData(etat); // Show '-' if null/undefined
            }
        },
        {
            id: 'marche', header: 'Marché', size: 130,
            // *** IMPORTANT: Use the CORRECT relationship name ('marche') from backend ***
            accessorFn: row => row.marche_public?.numero_marche || row.marche_public?.objet || '-',
            // Use standard text display
            cell: info => <span title={info.getValue() || ''}>{displayData(info.getValue())}</span>,
             // Allow searching/filtering by the displayed Marche details
            meta: { filterVariant: 'text', enableGlobalFilter: true }
        },
        {
            id: 'fichiers', header: 'Fichiers', size: 80,
            accessorFn: row => row.fichiers?.length || 0,
            cell: info => (
                <Badge bg={info.getValue() > 0 ? 'warning' : 'dark'} pill className="px-2">
                    {info.getValue()}
                </Badge>
            ),
            enableSorting: false,
            meta: { enableGlobalFilter: false } // Don't usually filter by file count
        },
        {
            accessorKey: 'created_at', header: 'Créé le', size: 120,
             // Use the robust formatDateSimple, check for meta.formatDate passed by DynamicTable first
             cell: info => info.table.options.meta?.formatDate?.(info.getValue()) ?? formatDateSimple(info.getValue()),
             meta: { enableGlobalFilter: false }
        },
        // 'actions' column is typically added by DynamicTable itself
    ], []); // Empty dependency array ensures this runs only once

    const defaultCols = useMemo(() => [
        'numero_bc', 'objet', 'fournisseur_nom', 'date_emission', 'montant_total', 'etat', 'marche'
        // 'fichiers'
        , 'actions'
    ], []);

    // Exclude fields not suitable for global search or direct display
    const searchExclusions = useMemo(() => [
        'id', 'marche_id', 'contrat_id', 'updated_at', 
        'contrat', // The full contrat object if loaded
    ], []);

    return (
        // Ensure container takes necessary height and padding
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                // --- Core Props ---
                fetchUrl="/bon-de-commande" // API endpoint for BC list
                dataKey="bons_de_commande"  // Key in the API JSON response containing the array
                deleteUrlBase="/bon-de-commande" // Base URL for DELETE requests (DynamicTable appends /id)
                columns={bonDeCommandeColumns}
                itemName="Bon de Commande"
                itemNamePlural="Bons de Commande"
                identifierKey="id" // The primary key column name in your data
                displayKeyForDelete="numero_bc" // Field shown in delete confirmation

                // --- Component Props ---
                CreateComponent={BonDeCommandeForm}
                ViewComponent={BonDeCommandeVisualisation} // Passed to handle viewing
                EditComponent={BonDeCommandeForm}

                // --- Optional Configuration ---
                defaultVisibleColumns={defaultCols}
                globalSearchExclusions={searchExclusions}
                itemsPerPage={10} // Or your preferred default page size
                baseApiUrl={BASE_API_URL} // Pass the base API URL if DynamicTable needs it

                // --- Filtering ---
                // Define initial filter values if needed (can be empty)
                columnFilters={[
                    { id: 'etat', value: '' },
                    { id: 'fournisseur_nom', value: '' },
                    { id: 'numero_bc', value: '' },
                    { id: 'marche', value: '' }, // Allow filtering by the calculated marche display value
                ]}
                enableColumnFilters={true} // Enable column-specific filtering UI
                enableGlobalFilter={true} // Enable the global search bar
                // Pass helper function if DynamicTable needs it for dates (optional)
                // meta={{ formatDate: formatDateSimple }}
            />
        </div>
    );
};

export default BonDeCommandePage;