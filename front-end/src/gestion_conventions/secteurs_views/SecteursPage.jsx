// src/gestion_conventions/secteurs_views/SecteursPage.jsx

import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path to DynamicTable
import SecteurForm from './SecteurForm'; // Import the new form

const SecteursPage = ({ currentUser }) => { // Pass currentUser for permissions if needed
    const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

    const secteurColumns = useMemo(() => [
        { accessorKey: 'id', header: 'ID', size: 60 },
        { accessorKey: 'description_fr', header: 'Description (Fr)', meta: { enableGlobalFilter: true } },
        { accessorKey: 'description_ar', header: 'Description (Ar)', meta: { enableGlobalFilter: true } },
    ], []);

    const defaultCols = useMemo(() => [ 'id', 'description_fr', 'description_ar', 'actions' ], []);
    
    return (
        <div className="d-flex flex-column" style={{ height: 'calc(100vh - 56px)' }}>
            <DynamicTable
                // --- Core Config ---
                fetchUrl="/secteurs"
                dataKey="secteurs"
                deleteUrlBase="/secteurs"
                columns={secteurColumns}
                itemName="Secteur"
                itemNamePlural="Secteurs"
                
                // --- Optional Config ---
                identifierKey="id" // The primary key is 'id'
                displayKeyForDelete="description_fr"
                defaultVisibleColumns={defaultCols}
                
                // --- Components ---
                CreateComponent={SecteurForm}
                EditComponent={SecteurForm}
                // No ViewComponent or renderFilters for this simple page
            />
        </div>
    );
};

export default SecteursPage;