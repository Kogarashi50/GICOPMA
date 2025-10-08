// src/gestion_contrats_cdc_views/ContratDroitCommunPage.jsx
import React, { useMemo, useCallback } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
import ContratDroitCommunForm from './ContratDroitCommunForm'; // Adjust path
import ContratDroitCommunVisualisation from './ContratDroitCommunVisualisation'; // Adjust path

// --- UI & Utilities ---
import { Badge, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileContract, faPaperclip,faCalendarAlt, faEuroSign, faClock } from '@fortawesome/free-solid-svg-icons'; // Example icons

// --- Constants & Helpers ---
const BASE_API_URL =  'http://localhost:8000/api';

// Reuse or adapt existing helpers
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            return dateString; // Return original if format is unexpected
        }
        // Use UTC to avoid timezone issues if dates are stored as date only
        return new Date(datePart).toLocaleDateString('fr-CA'); // YYYY-MM-DD
    } catch (e) {
        console.error("Date format error:", dateString, e);
        return dateString;
    }
};

const formatCurrency = (value, currency = 'MAD') => {
    if (value == null || value === '' || isNaN(Number(value))) return '-';
    try {
        return parseFloat(value).toLocaleString('fr-MA', { style: 'currency', currency: currency, minimumFractionDigits: 2 });
    } catch (e) {
        console.error("Currency format error:", value, e);
        return String(value);
    }
};

// --- Main Page Component ---
const ContratDroitCommunPage = () => {

    // --- Column Definitions ---
    const contratColumns = useMemo(() => [
        { accessorKey: 'numero_contrat', header: 'N° Contrat', size: 130, meta: { align: 'left', enableGlobalFilter: true } },
        {
            accessorKey: 'objet', header: 'Objet', size: 400,
            meta: { align: 'left', enableGlobalFilter: true },
            cell: info => <div className="text-truncate" style={{ maxWidth: '400px' }} title={info.getValue()}>{info.getValue()}</div>,
        },
        {
            accessorKey: 'fournisseur_nom', header: 'Fournisseur', size: 180,
            meta: { align: 'left', enableGlobalFilter: true },
            cell: info => <div className="text-truncate" style={{ maxWidth: '180px' }} title={info.getValue()}>{info.getValue()}</div>,
        },
        {
            accessorKey: 'type_contrat', header: 'Type', size: 170, filterFn: 'equalsString', // Add filterFn if needed
            meta: { align: 'center', enableGlobalFilter: true },
        },
        {
            accessorKey: 'montant_total', header: 'Montant Total', size: 150,
            cell: info => formatCurrency(info.getValue()),
            meta: { align: 'right', enableGlobalFilter: false }
        },
        {
            accessorKey: 'date_signature', header: 'Date Signature', size: 150,
            cell: info => formatDate(info.getValue()),
            meta: { align: 'center', enableGlobalFilter: false }
        },
        {
            accessorKey: 'duree_contrat', header: 'Durée', size: 100,
            meta: { align: 'center', enableGlobalFilter: false },
            cell: info => info.getValue() || '-',
        },
    ], []);

    // --- Filter Rendering Function (Optional Example) ---
   

    // --- DynamicTable Configuration ---
    const defaultVisibleCols = useMemo(() => [
        'numero_contrat',
        'objet',
        'fournisseur_nom',
        'type_contrat',
        'montant_total',
        'date_signature',
        'actions' // Ensure 'actions' is included for view/edit/delete buttons
    ], []);

    return (
        // Adjust height and padding as needed for your layout
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                fetchUrl="/contrat-droit-commun" // Matches api.php route
                dataKey="contrats" // Matches JSON response key from controller index
                deleteUrlBase="/contrat-droit-commun" // Base URL for DELETE requests
                baseApiUrl={BASE_API_URL}

                columns={contratColumns}
                itemName="Contrat de Droit Commun"
                itemNamePlural="Contrats de Droit Commun"
                identifierKey="id" // Primary key of the contrat table
                displayKeyForDelete="numero_contrat" // Field to show in delete confirmation

                itemsPerPage={10}
                defaultVisibleColumns={defaultVisibleCols}
                // renderFilters={renderContratFilters} // Pass the filter function if implemented
                enableGlobalSearch={true} // Allow global search bar

                // Pass the Form and Visualisation components
                CreateComponent={ContratDroitCommunForm}
                ViewComponent={ContratDroitCommunVisualisation}
                EditComponent={ContratDroitCommunForm} // Use the same form for edit

                actionColumnWidth={90} // Adjust width for action buttons
                tableClassName="table-striped table-hover" // Apply Bootstrap styling
                // Apply custom dark theme styling from reference if needed
                // tableClassName="mytab table-dark table-striped table-hover" // Example dark theme
                // containerClassName="mytab"
            />
        </div>
    );
};

export default ContratDroitCommunPage;