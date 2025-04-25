import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust the path based on your project structure
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBalanceScale } from '@fortawesome/free-solid-svg-icons'; // Example icon

// --- Constants ---
// You can define this globally or pass it via props/context if preferred
const BASE_API_URL = 'http://localhost:8000/api';

// --- Helper Functions (Reuse or define centrally) ---
/**
 * Formats a numeric value as MAD currency.
 * Handles null/undefined by returning '0,00 MAD'.
 * @param {number|string|null|undefined} value The value to format.
 * @returns {string} Formatted currency string.
 */
const formatCurrency = (value) => {
    const number = parseFloat(value);
    // Default to 0 if value is null, undefined, or not a valid number
    if (value === null || value === undefined || isNaN(number)) {
        return (0).toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return number.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Simple helper to display data or a fallback
const displayData = (data, fallback = '-') => data ?? fallback;
// --- End Helpers ---

// --- React Component ---
const PartnerSummaryPage = () => {

    // --- Column Definitions for Partner Summary ---
    // Memoize to prevent recalculation on every render
    const summaryColumns = useMemo(() => [
        // Partner Information (fetched from Partenaire model)
        // { accessorKey: 'Id', header: 'ID', size: 60, enableSorting: false, meta: { filterVariant: 'text' } }, // Optional: Show ID
        {
            accessorKey: 'Code',
            header: 'Code Partenaire',
            size: 130,
            enableSorting: true,
            meta: { filterVariant: 'text', enableGlobalFilter: true } // Allow text filtering and global search
        },
        {
            accessorKey: 'Description',
            header: 'Nom Partenaire',
            size: 280, // Allow more space for names
            enableSorting: true,
            cell: info => <div className="text-truncate" style={{ maxWidth: '270px' }} title={info.getValue()}>{displayData(info.getValue())}</div>,
            meta: { filterVariant: 'text', enableGlobalFilter: true }
        },

        // Calculated Financial Data (from backend calculation)
        {
            accessorKey: 'total_engage', // Matches the alias from controller's withSum
            header: 'Total Engagé',
            size: 180,
            enableSorting: true,
            cell: info => formatCurrency(info.getValue()), // Use currency formatter
            meta: { filterVariant: 'range', enableGlobalFilter: true } // Allow range filtering (e.g., > 10000)
        },
        {
            accessorKey: 'total_verse', // Matches the alias from controller's selectSub
            header: 'Total Versé',
            size: 180,
            enableSorting: true,
            cell: info => formatCurrency(info.getValue()), // Use currency formatter
            meta: { filterVariant: 'range', enableGlobalFilter: true }
        },
        {
            accessorKey: 'reste_a_payer', // Matches the key added in controller's transform
            header: 'Reste à Payer',
            size: 180,
            enableSorting: true, // Allow sorting by remaining amount
            cell: info => {
                const value = info.getValue(); // Already calculated in backend
                const numericValue = parseFloat(value);
                let style = {};
                if (isNaN(numericValue)) {
                     style = { color: 'grey' }; // Style for non-numeric (shouldn't happen)
                } else if (numericValue < 0) {
                     style = { color: '#dc3545', fontWeight: 'bold' }; // Negative (Overpaid?) - Use Bootstrap danger color
                } else if (numericValue > 0) {
                     style = { color: '#ffc107', fontWeight: 'bold' }; // Positive (Amount Due) - Use Bootstrap warning color
                } else { // Exactly 0
                     style = { color: '#198754' }; // Zero (Paid in full) - Use Bootstrap success color
                }
                return <span style={style}>{formatCurrency(value)}</span>;
            },
            // Filtering on this calculated field might be complex depending on DynamicTable implementation
            // Range filter is a good start
            meta: { filterVariant: 'range', enableGlobalFilter: true }
        },
        // No 'actions' column needed for a read-only summary view generally
    ], []); // Empty dependency array means this runs only once

    // --- DynamicTable Configuration ---
    // Define default visible columns using the accessorKey or id
    const defaultVisibleColumns = useMemo(() => [
        'Code', 'Description', 'total_engage', 'total_verse', 'reste_a_payer'
        // Add/remove columns as needed for the default view
    ], []);

    // Define fields to exclude from the global search bar (adjust as needed)
    const searchExclusions = useMemo(() => [
        'Id', // Primary Key of Partner
        // Add any other internal/unwanted fields if the API includes them
    ], []);

    // Configuration object passed as props to DynamicTable
    const tableConfig = useMemo(() => ({
        // --- Core API & Data ---
        fetchUrl: "/partenaires/summary",      // *** USE THE NEW API ENDPOINT ***
        dataKey: "partnerSummary",            // *** MATCH THE KEY IN CONTROLLER RESPONSE ***
        identifierKey: "Id",                  // Primary Key of the Partner model (used internally if actions were enabled)
        columns: summaryColumns,              // Use the summary columns defined above
        itemName: "Résumé Partenaire",        // Singular name for any potential messages (e.g., export)
        itemNamePlural: "Résumés Partenaires", // Plural name

        // --- Display & Functionality ---
        defaultVisibleColumns: defaultVisibleColumns, // Default columns shown
        globalSearchExclusions: searchExclusions,     // Fields excluded from global search
        itemsPerPage: 15,                      // Default items per page
        enableColumnFiltering: true,           // Enable per-column filters
        enableGlobalFiltering: true,           // Enable the global search bar
        enableSorting: true,                   // Enable column sorting
        enablePagination: true,                // Enable table pagination
        enableRowSelection: false,             // No need to select rows in a summary view
        enableExport: true,                    // Enable data export button is useful for reports

        // --- Disable CRUD Actions ---
        enableEditing: false,
        enableViewing: false, // Set to true ONLY if you want an action button linking to partner details page
        enableDeleting: false,
        enableCreating: false, // Cannot 'create' a summary row

        // --- Components for Modals (Not Needed) ---
        CreateComponent: null,
        EditComponent: null,
        ViewComponent: null, // Can be set if enableViewing is true and you have a Partner view component

        // --- API & Formatting ---
        baseApiUrl: BASE_API_URL,              // Base URL for API calls (mostly relevant if actions were enabled)
        formatCurrency: formatCurrency,        // Pass helper for potential use by DynamicTable internals

    }), [summaryColumns, defaultVisibleColumns, searchExclusions]); // Dependencies for useMemo


    // --- Render the Page ---
    return (
        // Consistent container style
        <div style={{ height: 'calc(100vh - 60px)', padding: '1rem' }}>
            {/* Page Title */}
            <h2 className="mb-4 d-flex align-items-center">
                 <FontAwesomeIcon icon={faBalanceScale} className="me-3 text-primary" /> {/* Optional Icon */}
                 Résumé Financier par Partenaire
             </h2>

            {/* Render the Dynamic Table */}
            <DynamicTable {...tableConfig} />
        </div>
    );
};

export default PartnerSummaryPage;