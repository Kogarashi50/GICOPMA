// src/pages/PartenairesPage.jsx (Updated Version with Pagination Emphasis)

import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
import PartenaireForm from './PartenaireForm';       // Adjust path as needed
import PartenaireVisualisation from './PartenaireVisualisation'; // Adjust path as needed

const PartenairesPage = () => {
    // Ensure this matches your environment (can use process.env.REACT_APP_API_URL)
    const BASE_API_URL = 'http://localhost:8000/api';

    // --- Column Definition for Partenaires ---
    // (No changes needed here from your version)
    const partenaireColumns = useMemo(() => [
        { accessorKey: 'Id', header: 'ID', size: 60, enableSorting: false },
        { accessorKey: 'Code', header: 'Code', size: 80, meta: { enableGlobalFilter: true, filterVariant: 'text' } },
        { accessorKey: 'Description', header: 'Description (Fr)', meta: { enableGlobalFilter: true, filterVariant: 'text' } },
        { accessorKey: 'Description_Arr', header: 'Description (Ar)', meta: { enableGlobalFilter: true, filterVariant: 'text' } },
        // Example: Add created_at if desired and helper exists
        // {
        //     accessorKey: 'created_at',
        //     header: 'Créé le',
        //     cell: info => info.table.options.meta?.formatDateSimple(info.getValue()),
        //     size: 140,
        //     meta: { enableGlobalFilter: false, filterVariant: 'date' }
        // },
        // 'actions' column is added automatically
    ], []);

    // --- DynamicTable Configuration ---

    // Define default visible columns
    const defaultCols = useMemo(() => [ 'Code', 'Description', 'Description_Arr', 'actions' ], []);

    // Define fields to exclude from the global search bar
    const searchExclusions = useMemo(() => ['Id', 'created_at', 'updated_at'], []);

    // Configuration object passed as props to DynamicTable
    const tableConfig = useMemo(() => ({
        // --- Core API & Data ---
        fetchUrl: "/partenaires",           // API endpoint - *Backend MUST support pagination*
        dataKey: "partenaires",             // Key in API response containing the array of items
                                            // **Crucial**: Backend response should look like:
                                            // { partenaires: [...], pagination: { currentPage: ..., totalPages: ... } }
        deleteUrlBase: "/partenaires",      // Base URL for DELETE requests
        identifierKey: "Id",                // Primary key column name ('Id')
        columns: partenaireColumns,         // Columns defined above
        itemName: "Partenaire",
        itemNamePlural: "Partenaires",

        // --- Display & Functionality ---
        displayKeyForDelete: "Description",
        defaultVisibleColumns: defaultCols,
        globalSearchExclusions: searchExclusions,
        itemsPerPage: 10,                   // **Set items per page (enables pagination requests)**
        enableColumnFiltering: true,
        enableGlobalFiltering: true,
        enableSorting: true,
        // *** Explicitly Enable Pagination ***
        enablePagination: true,             // **Ensure this is true**
        enableRowSelection: false,
        enableExport: true,

        // --- Enable CRUD + View Actions ---
        enableEditing: true,
        enableDeleting: true,
        enableCreating: true,
        enableViewing: true,                // **Enable the view action**

        // --- Components for Modals ---
        CreateComponent: PartenaireForm,
        EditComponent: PartenaireForm,
        ViewComponent: PartenaireVisualisation, // **Assign the visualisation component**

        // --- API & Formatting ---
        baseApiUrl: BASE_API_URL,
        // meta: { /* Pass helpers like formatDateSimple if needed */ }

    }), [partenaireColumns, defaultCols, searchExclusions]); // Dependencies for useMemo


    return (
        // Consistent container style
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>  
            {/* Render the Dynamic Table with the configuration */}
            <DynamicTable {...tableConfig} />
        </div>
    );
};

export default PartenairesPage;