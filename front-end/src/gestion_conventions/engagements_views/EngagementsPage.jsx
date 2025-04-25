// src/pages/engagements_views/EngagementsPage.jsx

import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path
import EngagementForm from './EngagementForm'; // To be created
import EngagementVisualisation from './EngagementVisualisation'; // To be created

// --- Constants ---
const BASE_API_URL = 'http://localhost:8000'; // Adjust if different

// Helper to format currency (consider moving to a shared utils file)
const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) return '-';
    // Use 'fr-FR' locale and MAD currency, adjust as needed
    return number.toLocaleString('fr-FR', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const EngagementsPage = () => {
    // --- Column Definition ---
    const engagementColumns = useMemo(() => [
        {
            accessorKey: 'Code_Engag', // Exact Casing
            header: 'Code Engagement',
            size: 150,
            meta: { enableGlobalFilter: true }
        },
        {
            accessorKey: 'Description', // Exact Casing
            header: 'Description',
            cell: info => <div className="text-truncate" style={{ maxWidth: '300px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
            size: 350,
            meta: { enableGlobalFilter: true }
        },
        {
            accessorKey: 'Cout', // Exact Casing
            header: 'Coût',
            cell: info => formatCurrency(info.getValue()), // Format as currency
            size: 120,
            meta: { enableGlobalFilter: false } // Usually don't search costs directly
        },
        {
            accessorKey: 'Montant_CRO', // Exact Casing
            header: 'Montant CRO',
            cell: info => formatCurrency(info.getValue()),
            size: 130,
            meta: { enableGlobalFilter: false }
        },
        {
            accessorKey: 'Montant_Hors_CRO', // Exact Casing
            header: 'Montant Hors CRO',
            cell: info => formatCurrency(info.getValue()),
            size: 140,
            meta: { enableGlobalFilter: false }
        },
        {
            accessorKey: 'Rang', // Exact Casing
            header: 'Rang',
            size: 80,
            meta: { enableGlobalFilter: true }
        },
        {
            id: 'Programme_Description', // Unique ID for the column
            header: 'Programme Associé',
            // Access nested data: engagement.programme.Description
            // Fallback to Programme (FK value) if relation not loaded
            accessorFn: row => row.programme?.Description || row.Programme || '-',
            cell: info => <div className="text-truncate" style={{ maxWidth: '250px' }} title={info.getValue()}>{info.getValue()}</div>,
            meta: { enableGlobalFilter: true } // Allow searching by Programme description
        },
        {
            accessorKey: 'created_at',
            header: 'Créé le',
            cell: info => info.table.options.meta?.formatDate(info.getValue()),
            size: 120,
            meta: { enableGlobalFilter: false }
        },
        // 'actions' column added automatically by DynamicTable
    ], []);

    // --- DynamicTable Configuration ---
    const defaultCols = useMemo(() => [ 'Code_Engag', 'Description', 'Cout', 'Rang', 'Programme_Description', 'actions' ], []);
    // Exclude ID, foreign key reference if description is shown, numeric fields, timestamps
    const searchExclusions = useMemo(() => [ 'ID', 'Programme', 'Cout', 'Montant_CRO', 'Montant_Hors_CRO', 'created_at', 'updated_at' ], []);

    return (
        // Use same container style as ProgrammesPage
        <div style={{ height: 'calc(100vh - 56px)', padding: '1rem' }}>
            <DynamicTable
                // --- Core ---
                fetchUrl="/engagements"           // API endpoint
                dataKey="engagements"             // Key in API response
                deleteUrlBase="/engagements"      // API base for delete
                columns={engagementColumns}
                itemName="Engagement"
                itemNamePlural="Engagements"
                // --- Optional ---
                identifierKey="ID"                // Backend primary key field name (Exact Case)
                displayKeyForDelete="Code_Engag"  // Field for delete confirmation (Exact Case)
                defaultVisibleColumns={defaultCols}
                globalSearchExclusions={searchExclusions}
                itemsPerPage={8}
                baseApiUrl={BASE_API_URL}
                // --- Components ---
                CreateComponent={EngagementForm}
                ViewComponent={EngagementVisualisation}
                EditComponent={EngagementForm}
                // renderFilters={/* Add if custom filters needed */}
            />
        </div>
    );
};

export default EngagementsPage;