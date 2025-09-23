// src/pages/DomainesPage.jsx (Example Path)

import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path
import DomaineForm from './DomaineForm'; // Adjust path to new form

const DomainesPage = () => {
    const BASE_API_URL = 'http://localhost:8000/api'; // Or use environment variable

    // --- Column Definition for Domaines ---
    const domaineColumns = useMemo(() => [
        { accessorKey: 'Id', header: 'ID', size: 60 },
        { accessorKey: 'Code', header: 'Code', size: 120, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Description', header: 'Description (Fr)', meta: { enableGlobalFilter: true } },
        { accessorKey: 'Description_Arr', header: 'Description (Ar)', meta: { enableGlobalFilter: true } },
        // Actions column will be added by DynamicTable
    ], []);

    // --- DynamicTable Configuration ---
    const defaultCols = useMemo(() => [ 'Code', 'Description', 'Description_Arr', 'actions' ], []);
    const searchExclusions = useMemo(() => ['Id', 'created_at', 'updated_at'], []);

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                // --- Core ---
                fetchUrl="/domaines" // <<< API endpoint for domaines
                dataKey="domaines" // <<< Key in JSON response holding domaine array (adjust if needed)
                deleteUrlBase="/domaines" // <<< Base URL for DELETE /domaines/{id}
                columns={domaineColumns}
                itemName="Axe stratégique" // <<< Singular name
                itemNamePlural="Axes stratégiques" // <<< Plural name
                // --- Optional ---
                identifierKey="Id" // <<< Primary Key column name
                displayKeyForDelete="Description" // Field to show in delete confirmation
                defaultVisibleColumns={defaultCols}
                globalSearchExclusions={searchExclusions}
                itemsPerPage={10} // Adjust as needed
                baseApiUrl={BASE_API_URL}
                // --- Components ---
                CreateComponent={DomaineForm} // Use the new DomaineForm
                // ViewComponent={DomaineVisualisation} // Add later if needed
                EditComponent={DomaineForm} // Use the new DomaineForm
                // renderFilters={null} // No filters for now
                // --- Action Overrides ---
                // onEdit={(id, item) => { /* custom logic */ }}
                // onDelete={(id, item) => { /* custom logic */ }}
            />
        </div>
    );
};

export default DomainesPage;