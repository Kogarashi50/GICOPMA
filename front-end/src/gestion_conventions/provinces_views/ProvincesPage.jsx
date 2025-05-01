// src/pages/provinces_views/ProvincesPage.jsx

import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path if needed
import ProvinceForm from './ProvinceForm'; // Adjust path - Used for Create/Edit

// --- Constants ---
const BASE_API_URL = 'http://localhost:8000/api'; // Adjust if different

const ProvincesPage = () => {
    // --- Column Definition ---
    const provinceColumns = useMemo(() => [
        {
            accessorKey: 'Code', // Matches the backend field name
            header: 'Code',      // Display header
            size: 80,           // Optional: Column width
            meta: { enableGlobalFilter: true } // Allow searching this column
        },
        {
            accessorKey: 'Description',
            header: 'Description',
            // Optional: Custom cell render for truncation or styling
            cell: info => <div className="text-truncate" style={{ maxWidth: '300px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
            size: 300,
            meta: { enableGlobalFilter: true }
        },
        {
            accessorKey: 'Description_Arr',
            header: 'Description (Arabe)',
            // Optional: Custom cell render for RTL text
            cell: info => <div className="text-truncate" style={{ maxWidth: '300px', direction: 'ltr' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
            size: 300,
            meta: { enableGlobalFilter: true } // Allow searching (adjust if needed)
        },
        {
            accessorKey: 'created_at',
            header: 'Créé le',
            // Use the built-in formatter from DynamicTable's meta options
            cell: info => info.table.options.meta?.formatDate(info.getValue()),
            size: 180,
            meta: { enableGlobalFilter: false } // Usually don't search timestamps
        },
        // 'actions' column is added automatically by DynamicTable if EditComponent or deleteUrlBase is provided
    ], []);

    // --- DynamicTable Configuration ---

    // Define which columns are visible by default
    // Ensure these keys/ids match those defined in provinceColumns
    const defaultCols = useMemo(() => [ 'Code', 'Description', 'Description_Arr', 'created_at', 'actions' ], []);

    // Define which columns to exclude from the global search input
    const searchExclusions = useMemo(() => [ 'Id', 'created_at', 'updated_at' ], []);

    return (
        // Container for the page, adjust styling as needed
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                // --- Core API & Data ---
                fetchUrl="/provinces"           // API endpoint to fetch the list
                dataKey="provinces"             // Key in the API response containing the data array
                deleteUrlBase="/provinces"      // Base URL for the DELETE API call (ID will be appended)
                columns={provinceColumns}       // The column definitions created above
                itemName="Province"             // Singular name for UI text (e.g., "Créer Province")
                itemNamePlural="Provinces"      // Plural name for UI text (e.g., table title)

                // --- Identifiers & Display ---
                identifierKey="Id"              // The field name of the primary key in your data objects
                displayKeyForDelete="Description" // Field to show in the delete confirmation dialog (e.g., "Supprimer Province : Casablanca ?")

                // --- Features & Configuration ---
                defaultVisibleColumns={defaultCols} // Columns visible when the table first loads
                globalSearchExclusions={searchExclusions} // Fields excluded from the main search bar
                itemsPerPage={10}                // Default number of items per page
                baseApiUrl={BASE_API_URL}       // Pass the base API URL for constructing full URLs

                // --- Component Injection ---
                CreateComponent={ProvinceForm}  // Component to render when "Create" button is clicked
                EditComponent={ProvinceForm}    // Component to render in a modal when "Edit" button is clicked
                // ViewComponent={ProvinceVisualisation} // OMITTED: No View button or modal needed for Provinces

                // --- Custom Filters (Optional) ---
                // renderFilters={renderProvinceFilters} // Provide a function here if you need custom column filters like in ConventionsPage
            />
        </div>
    );
};

export default ProvincesPage;