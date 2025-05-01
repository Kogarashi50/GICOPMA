// src/pages/sousprojets_views/SousProjetsPage.jsx

import React, { useMemo } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path if needed
import SousProjetForm from './SousProjetForm';         // Adjust path if needed
import SousProjetVisualisation from './SousProjetVisualisation'; // Adjust path if needed

// --- Constants ---
const BASE_API_URL = 'http://localhost:8000/api';

// --- Helper Functions (Copy or import from a shared utility file) ---
const formatPercentage = (value) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    return `${number.toFixed(2)} %`;
};

const formatNumber = (value, decimals = 2) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    return number.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const displayData = (data, fallback = '-') => data ?? fallback;

const formatDateSimple = (dateString) => {
    if (!dateString) return '-';
    try {
        // Basic check for ISO-like format (YYYY-MM-DD)
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
             // Append time to avoid timezone issues assuming it's midnight UTC if no time provided
             return new Date(dateString + 'T00:00:00Z').toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
        // Try parsing other potential date formats
        const date = new Date(dateString);
        // Check if the date object is valid
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
        console.warn("Could not format date:", dateString);
        return dateString; // Return original string if parsing fails
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString; // Return original string on error
    }
};
// --- End Helpers ---


const SousProjetsPage = () => {
    // --- Column Definition ---
    const sousProjetColumns = useMemo(() => [
        // Use EXACT Casing from schema
        { accessorKey: 'Code_Sous_Projet', header: 'Code', size: 40, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Nom_Projet', header: 'Nom', cell: info => <div className="text-truncate" style={{ maxWidth: '250px' }} title={info.getValue()}>{info.getValue() || '-'}</div>, size: 200, meta: { enableGlobalFilter: true } },
        {
            id: 'ProjetMaitre', header: 'Projet Maître',
            // Assuming API returns nested 'projet' object with 'Nom_Projet'
            accessorFn: row => row.projet?.Code_Projet+'-'+row.projet?.Nom_Projet || row.ID_Projet_Maitre || '-',
            cell: info => <div className="text-truncate" style={{ maxWidth: '250px' }} title={info.getValue()}>{info.getValue()||'-'}</div>,
            size: 200,
            meta: { enableGlobalFilter: true } // Allow searching by Projet Maître name/code
        },
        {
            id: 'Province', header: 'Province',
            // Assuming API returns nested 'province' object with 'Nom' (adjust if different)
            accessorFn: row => row.province?.Description.replace('Province:','').trim() || row.Id_Province || '-',
            meta: { enableGlobalFilter: true },
            size: 90,

        },
        {
            id: 'Commune', header: 'Commune',
             // Assuming API returns nested 'commune' object with 'Nom' (adjust if different)
            accessorFn: row => row.commune?.Description || row.Id_Commune || '-',
             meta: { enableGlobalFilter: true },
             size: 80,

        },
        { accessorKey: 'Secteur', header: 'Secteur', size: 130, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Localite', header: 'Localité', size: 130, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Status', header: 'Statut', size: 100, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Etat_Avan_Physi', header: 'Av. Physi', cell: info => formatPercentage(info.getValue()), size: 100, meta: { enableGlobalFilter: false } },
        { accessorKey: 'Etat_Avan_Finan', header: 'Av. Finan', cell: info => formatPercentage(info.getValue()), size: 100, meta: { enableGlobalFilter: false } }, // Optional
        { accessorKey: 'Estim_Initi', header: 'Estim. Init.', cell: info => formatNumber(info.getValue()), size: 140, meta: { enableGlobalFilter: false } }, // Optional
        // { accessorKey: 'Surface', header: 'Surface', cell: info => formatNumber(info.getValue()), size: 100, meta: { enableGlobalFilter: false } }, // Optional
        // { accessorKey: 'Lineaire', header: 'Linéaire', cell: info => formatNumber(info.getValue()), size: 100, meta: { enableGlobalFilter: false } }, // Optional
        { accessorKey: 'created_at', header: 'Créé le', cell: info => info.table.options.meta?.formatDate(info.getValue()), size: 120, meta: { enableGlobalFilter: false } },
        // 'actions' column added automatically by DynamicTable if needed
    ], []);

    // --- DynamicTable Configuration ---
    const defaultCols = useMemo(() => [
        'Code_Sous_Projet', 'Nom_Projet', 'ProjetMaitre', 'Province', 'Commune', 'Estim_Initi', 'Etat_Avan_Finan', 'Etat_Avan_Physi', 'actions'
    ], []);

    // Exclude fields (use exact keys from schema + related data IDs if not directly searchable)
    const searchExclusions = useMemo(() => [
        'ID_Sous_Projet', // If there's an auto-increment ID you don't show/use
        'ID_Projet_Maitre', // Search via ProjetMaitre column instead
        'Id_Province',      // Search via Province column instead
        'Id_Commune',       // Search via Commune column instead
        'Observations',
        'Etat_Avan_Finan', 'Estim_Initi', 'Centre', 'Site', 'Surface', 'Lineaire',
        'Douars_Desservis', 'Financement', 'Nature_Intervention', 'Benificiaire',
        'created_at', 'updated_at'
    ], []);

    return (
        // Mimic ProjetsPage container style
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                // --- Core ---
                fetchUrl="/sousprojets" // API endpoint for Sous-Projets
                dataKey="sousprojets"   // Key in API response (adjust if needed)
                deleteUrlBase="/sousprojets" // API base for delete (using Code_Sous_Projet)
                columns={sousProjetColumns}
                itemName="Sous-Projet"
                itemNamePlural="Sous-Projets"
                // --- Optional ---
                identifierKey="Code_Sous_Projet" // Exact Case Primary Key
                displayKeyForDelete="Nom_Projet" // Field for delete confirmation message
                defaultVisibleColumns={defaultCols}
                globalSearchExclusions={searchExclusions}
                itemsPerPage={10} // Or your preferred default
                // customFilterFunctions={{}} // Add if needed later
                baseApiUrl={BASE_API_URL}
                // --- Components ---
                CreateComponent={SousProjetForm}
                ViewComponent={SousProjetVisualisation}
                EditComponent={SousProjetForm}
                // renderFilters={/* renderSousProjetFilters */} // Add complex filters if needed
            />
        </div>
    );
};

export default SousProjetsPage;