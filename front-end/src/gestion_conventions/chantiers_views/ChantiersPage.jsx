// src/pages/ChantiersPage.jsx (Adjust path if needed)

import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path
import ChantierForm from './ChantierForm'; // Adjust path - Create this file next
import ChantierVisualisation from './ChantierVisualisation'; // Adjust path - Create this file later

// --- Constants ---
const BASE_API_URL = 'http://localhost:8000/api'; // Define Base URL

const ChantiersPage = () => {
    // --- Column Definition ---
    const chantierColumns = useMemo(() => [
        {
            accessorKey: 'Code_Chantier',
            header: 'Code',
            size: 50,
            meta: { enableGlobalFilter: true }
        },
        {
            accessorKey: 'Description',
            header: 'Description',
            cell: info => <div className="text-truncate" title={info.getValue()}>{info.getValue() || '-'}</div>,
            size: 400,
            meta: { enableGlobalFilter: true }
        },
        {
            // Assuming API returns eager-loaded domaine: chantier.domaine.Description
            // Or if API returns domaine_description directly: accessorKey: 'domaine_description'
            id: 'Domaine_Description', // Unique ID for the column
            header: 'Domaine',
            accessorFn: row => row.domaine?.Description || row.id_domaine || '-', // Access nested data safely, fall back to id_domaine if needed
            cell: info => <div className="text-truncate" title={info.getValue()}>{info.getValue()}</div>,
            meta: { enableGlobalFilter: true }, // Allow searching by Domaine description
            size: 100,

        },
        {
            accessorKey: 'created_at',
            header: 'Créé le',
            cell: info => info.table.options.meta?.formatDate(info.getValue()), // Use formatter from DynamicTable
            size: 120,
            meta: { enableGlobalFilter: false }
        },
        // 'actions' column is added automatically by DynamicTable if needed
    ], []);

    // --- DynamicTable Configuration ---
    const defaultCols = useMemo(() => [ 'Code_Chantier', 'Description', 'Domaine_Description', 'actions' ], []);
    // Exclude fields not suitable for simple text search or handled differently
    const searchExclusions = useMemo(() => [ 'Id', 'Id_Domaine', 'created_at', 'updated_at' ], []);

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                // --- Core ---
                fetchUrl="/chantiers" // API endpoint to fetch chantiers
                dataKey="chantiers"    // Key in the response containing the array
                deleteUrlBase="/chantiers" // Base URL for deletion
                columns={chantierColumns}
                itemName="Chantier"
                itemNamePlural="Chantiers"
                // --- Optional ---
                identifierKey="Id" // Assuming 'id' is the primary key from backend
                displayKeyForDelete="Code_Chantier" // Field to show in delete confirmation
                defaultVisibleColumns={defaultCols}
                globalSearchExclusions={searchExclusions}
                itemsPerPage={10}
                // customFilterFunctions={{}} // Add if specific filters needed
                baseApiUrl={BASE_API_URL} // Pass the base URL
                // --- Components ---
                CreateComponent={ChantierForm}
                ViewComponent={ChantierVisualisation}
                EditComponent={ChantierForm} // Use the same form for editing
                // renderFilters={renderChantierFilters} // Add if custom filters are needed
                // --- Action Overrides ---
                // onEdit={(id, item) => { /* custom logic if needed */ }}
                // onDelete={(id, item) => { /* custom logic if needed */ }}
            />
        </div>
    );
};

export default ChantiersPage;