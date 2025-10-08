import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path to your DynamicTable component
import VersementPPForm from './VersementppForm';           // We will create this next
import VersementPPVisualisation from './VersementppVisualisation'; // We will create this later (optional)

// --- Constants ---
const BASE_API_URL = 'http://localhost:8000/api'; // Ensure this matches your Laravel API base URL

// --- Helper Functions (copy/adapt from ProjetsPage or create shared utils) ---
const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    return number.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateSimple = (dateString) => {
    if (!dateString) return '-';
    try {
        // Handle 'YYYY-MM-DD' or full ISO strings
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
            return new Date(dateString).toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }); // YYYY-MM-DD
        }
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
        return dateString; // Fallback
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString; // Fallback
    }
};

// More detailed date format (if needed for timestamps like created_at if they existed)

// --- End Helpers ---

const VersementsPPPage = () => {

    // --- Column Definitions for Versements ---
    const versementColumns = useMemo(() => [
        // Key identifier (useful but maybe hidden by default)
        { accessorKey: 'id', header: 'ID', size: 80, enableSorting: true, meta: { filterVariant: 'text' } },

        // **Data from Versement Model**
        {
            accessorKey: 'date_versement', header: 'Date Versement', size: 150, enableSorting: true,
            cell: info => formatDateSimple(info.getValue()),
            meta: { filterVariant: 'date', enableGlobalFilter: false } // Date filter
        },
        {
            accessorKey: 'montant_verse', header: 'Montant Versé', size: 180, enableSorting: true,
            cell: info => formatCurrency(info.getValue()),
            meta: { filterVariant: 'range', enableGlobalFilter: true } // Range filter, include in global search
        },
        

        // **Data from Related EngagementFinancier -> Projet**
        {
            id: 'projet_code', // Use unique ID if accessorFn is used
            header: 'Code Projet', size: 200,
            accessorFn: row => row.engagement_financier?.projet?.Code_Projet || '-', // Safely access nested data
            meta: { filterVariant: 'text', enableGlobalFilter: true } // Text filter
        },
        {
            id: 'projet_nom', header: 'Intitulé Projet', size: 310,
            accessorFn: row => row.engagement_financier?.projet?.Nom_Projet || '-',
            cell: info => <div className="text-truncate" style={{ maxWidth: '310px' }} title={info.getValue()}>{info.getValue()}</div>,
            meta: { filterVariant: 'text', enableGlobalFilter: true } // Text filter
        },

        // **Data from Related EngagementFinancier -> Partenaire**
        {
            id: 'partenaire_nom', header: 'Partenaire', size: 220,
            accessorFn: row => row.engagement_financier?.partenaire?.Description ||row.engagement_financier?.partenaire?.Description_Arr|| '-',
            cell: info => <div className="text-truncate" style={{ maxWidth: '220px' }} title={info.getValue()}>{info.getValue()}</div>,
            meta: { filterVariant: 'text', enableGlobalFilter: true } // Text filter
        },

        // Optional: Commentaire
        // {
        //     accessorKey: 'commentaire', header: 'Commentaire', size: 180,
        //     cell: info => <div className="text-truncate" style={{ maxWidth: '170px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
        //     meta: { filterVariant: 'text', enableGlobalFilter: false } // Maybe exclude from global search
        // },

        // 'actions' column is added automatically by DynamicTable if enabled

    ], []); // Empty dependency array means this runs once

    // --- DynamicTable Configuration ---

    // Define default visible columns using the accessorKey or id
    const defaultVisibleColumns = useMemo(() => [
        'date_versement', 'montant_verse', 'projet_code', 'projet_nom', 'partenaire_nom', 'reference_paiement', 'actions'
        // Add/remove columns as needed for default view
    ], []);

    // Define fields to exclude from the global search bar (adjust as needed)
    const searchExclusions = useMemo(() => [
        'id',                   // Primary Key
        'engagement_id',        // Foreign Key (implicitly searched via project/partner)
        'commentaire',          // Often long text, better filtered specifically
        'engagement_financier',  // The nested object itself
        // Add other keys if the API response includes fields you don't want searched globally
    ], []);

    // Configuration object passed as props to DynamicTable
    const tableConfig = useMemo(() => ({
        // --- Core API & Data ---
        fetchUrl: "/versementspp",           // API endpoint (relative to baseApiUrl) for fetching data (index route)
        dataKey: "versements",             // Key in the API response containing the data array (check your controller)
        deleteUrlBase: "/versementspp",      // Base URL for DELETE requests (e.g., /versements/{id})
        identifierKey: "id",               // Primary Key column name for the Versement model (usually 'id')
        columns: versementColumns,         // The column definitions created above
        itemName: "Versement",             // Singular name for messages
        itemNamePlural: "Versements",      // Plural name for messages

        // --- Display & Functionality ---
        displayKeyForDelete: "id", // Field to display in delete confirmation (e.g., show ID or combine fields like "Versement du {date} pour {projet}")
        defaultVisibleColumns: defaultVisibleColumns, // Default columns shown
        globalSearchExclusions: searchExclusions, // Fields excluded from global search
        itemsPerPage: 10,                   // Default items per page
        enableColumnFiltering: true,        // Enable per-column filters
        enableGlobalFiltering: true,        // Enable the global search bar
        enableSorting: true,                // Enable column sorting
        enablePagination: true,             // Enable table pagination
        enableRowSelection: false,          // Disable row selection checkboxes if not needed
        enableExport: true,                 // Enable data export button (DynamicTable needs to support this)
        enableEditing: true,               // Enable the edit action button
        enableViewing: false,               // Enable the view action button (Set to true if you create VersementVisualisation)
        enableDeleting: true,              // Enable the delete action button

        // --- Components for Modals ---
        CreateComponent: VersementPPForm,        // Component used for creating an item
        EditComponent: VersementPPForm,          // Component used for editing an item
        ViewComponent: VersementPPVisualisation, // Assign if you create the visualisation component

        // --- API & Formatting ---
        baseApiUrl: BASE_API_URL,           // Base URL for API calls made *from within* the Form/Visualisation components
        formatDateSimple: formatDateSimple, // Pass helper functions if needed by DynamicTable or sub-components
        formatCurrency: formatCurrency,

        // --- Optional: Customizations ---
        // Pass any other props required by your specific DynamicTable implementation
        // E.g., custom toolbar buttons, filter functions etc.

    }), [versementColumns, defaultVisibleColumns, searchExclusions]); // Dependencies for useMemo


    return (
        // Use a consistent container style
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable {...tableConfig} />
        </div>
    );
};

export default VersementsPPPage;