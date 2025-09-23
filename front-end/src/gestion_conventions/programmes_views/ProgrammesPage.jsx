// src/pages/programmes_views/ProgrammesPage.jsx

import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path
import ProgrammeForm from './ProgrammeForm'; // To be created
import ProgrammeVisualisation from './ProgrammeVisualisation'; // To be created

// --- Constants ---
const BASE_API_URL = 'http://localhost:8000/api'; // Adjust if different

const ProgrammesPage = () => {
    // --- Column Definition ---
    const programmeColumns = useMemo(() => [
        {
            accessorKey: 'Code_Programme', // Matches backend model/validation
            header: 'Code',
            size: 50,
            meta: { enableGlobalFilter: true }
        },
        {
            accessorKey: 'Description', // Matches backend model/validation
            header: 'Description',
            cell: info => <div className="text-truncate" style={{ minWidth:'350px',maxWidth: '500px', width:'450px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
            maxSize: 500,
            size:450,
            minSize:350,
            meta: { enableGlobalFilter: true }
        },
        {
            // Display related Chantier Description (using accessorFn)
            id: 'Domaine_Description', // NEW unique ID
    header: 'Axe stratégique Associé',
    // Access nested data: programme.domaine.Description
    accessorFn: row => row.domaine?.Description || '-', // NEW accessor
    cell: info => <div className="text-truncate" style={{ minWidth:'350px',maxWidth: '500px', width:'450px' }} title={info.getValue()}>{info.getValue()}</div>,
    meta: { enableGlobalFilter: true },
    maxSize: 500,
    size: 450,
    minSize: 350,
            // Allow searching by Chantier description
        },
        {
            accessorKey: 'created_at',
            header: 'Créé le',
            cell: info => info.getValue().slice(0,10),
            size: 120,
            meta: { enableGlobalFilter: false }
        },
        // 'actions' column added automatically by DynamicTable
    ], []);

    // --- DynamicTable Configuration ---
    const defaultCols = useMemo(() => [ 'Code_Programme', 'Description', 'Domaine_Description', 'created_at', 'actions' ], []);
    const searchExclusions = useMemo(() => [ 'Id', 'domaine_id', 'updated_at' ], []);

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                // --- Core ---
                fetchUrl="/programmes"          // API endpoint
                dataKey="programmes"            // Key in API response
                deleteUrlBase="/programmes"     // API base for delete
                columns={programmeColumns}
                itemName="Programme"
                itemNamePlural="Programmes"
                // --- Optional ---
                identifierKey="Id"              // Backend primary key field name
                displayKeyForDelete="Code_Programme" // Field for delete confirmation
                defaultVisibleColumns={defaultCols}
                globalSearchExclusions={searchExclusions}
                itemsPerPage={10}
                baseApiUrl={BASE_API_URL}
                // --- Components ---
                CreateComponent={ProgrammeForm}
                ViewComponent={ProgrammeVisualisation} // Include View for now
                EditComponent={ProgrammeForm}
                // renderFilters={/* Add if custom filters needed */}
            />
        </div>
    );
};

export default ProgrammesPage;