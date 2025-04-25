// src/pages/CommunesPage.jsx (Example Path)

import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path
import CommuneForm from './CommuneForm'; // Adjust path to new form

const CommunesPage = () => {
    const BASE_API_URL = 'http://localhost:8000/api';

    // --- Column Definition for Communes ---
    // Using PascalCase matching the DB/Model/State
    const communeColumns = useMemo(() => [
        { accessorKey: 'Id', header: 'ID', size: 60 },
        { accessorKey: 'Code', header: 'Code', size: 80, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Description', header: 'Description (Fr)', meta: { enableGlobalFilter: true } },
        { accessorKey: 'Description_Arr', header: 'Description (Ar)', meta: { enableGlobalFilter: true } },
        // Actions column added by DynamicTable
    ], []);

    // --- DynamicTable Configuration ---
    const defaultCols = useMemo(() => [ 'Code', 'Description', 'Description_Arr', 'actions' ], []);
    const searchExclusions = useMemo(() => ['Id', 'created_at', 'updated_at'], []);

    return (
        <div style={{ height: 'calc(100vh - 56px)', padding: '1rem' }}>
            <DynamicTable
                // --- Core ---
                fetchUrl="/communes" // <<< API endpoint for communes
                dataKey="communes" // <<< Key in JSON response (adjust if needed)
                deleteUrlBase="/communes" // <<< Base URL for DELETE /communes/{id}
                columns={communeColumns}
                itemName="Commune" // <<< Singular name
                itemNamePlural="Communes" // <<< Plural name
                // --- Optional ---
                identifierKey="Id" // <<< Primary Key column name (PascalCase)
                displayKeyForDelete="Description" // Field for delete confirmation
                defaultVisibleColumns={defaultCols}
                globalSearchExclusions={searchExclusions}
                itemsPerPage={8} // Adjust as needed
                baseApiUrl={BASE_API_URL}
                // --- Components ---
                CreateComponent={CommuneForm} // Use the new CommuneForm
                // ViewComponent={CommuneVisualisation} // Add later if needed
                EditComponent={CommuneForm} // Use the new CommuneForm
                // renderFilters={null} // No filters for now
            />
        </div>
    );
};

export default CommunesPage;