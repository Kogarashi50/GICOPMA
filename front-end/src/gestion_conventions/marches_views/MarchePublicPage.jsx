// src/gestion_conventions/marches_publics_views/MarchePublicPage.jsx

import React, { useMemo, useCallback } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
import MarchePublicForm from './MarchePublicForm'; // Component for Create/Edit
import MarchePublicVisualisation from './MarchePublicVisualisation'; // Component for View

// --- UI & Utilities ---
import Select from 'react-select';
import { Badge, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faLink } from '@fortawesome/free-solid-svg-icons'; // Import faLink
import { useSearchParams } from 'react-router-dom';

// --- Constants & Helpers ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
         if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
             // console.warn("Unexpected date format:", dateString);
             return dateString;
         }
         return new Date(datePart + 'T00:00:00Z').toLocaleDateString('fr-CA');
    } catch (e) {
        console.error("Date format error:", dateString, e);
        return dateString;
    }
};

const formatCurrency = (value) => {
    if (value == null || value === '' || isNaN(Number(value))) return '-';
    try {
        return parseFloat(value).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
    } catch (e) {
        console.error("Currency format error:", value, e);
        return String(value);
    }
};

const TYPE_OPTIONS = [
    { value: 'Travaux', label: 'Travaux' },
    { value: 'Fournitures', label: 'Fournitures' },
    { value: 'Services', label: 'Services' }
];
const STATUT_OPTIONS = [
    { value: 'En préparation', label: 'En préparation', color: 'secondary' },
    { value: 'En cours', label: 'En cours', color: 'primary' },
    { value: 'Terminé', label: 'Terminé', color: 'success' },
    { value: 'Résilié', label: 'Résilié', color: 'danger' }
];
const getStatusColor = (statusValue) => {
    const option = STATUT_OPTIONS.find(opt => opt.value === statusValue);
    return option ? option.color : "light";
};
// --- End Helpers ---

// --- Main Page Component ---
const MarchePublicPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const action = searchParams.get('action');
    const isCreating = action === 'create';

    // --- Column Definitions for the SUMMARY table ---
    const marcheColumns = useMemo(() => [
        { accessorKey: 'numero_marche', header: 'N° Marché', size: 130, meta: { align: 'left', enableGlobalFilter: true } },
        {
            accessorKey: 'intitule', header: 'Intitulé Marché', size: 220,
            meta: { align: 'left', enableGlobalFilter: true },
            cell: info => <div className="text-truncate" style={{ maxWidth: '220px' }} title={info.getValue()}>{info.getValue()}</div>,
        },
        {
            id: 'appelOffreLIEE', // Unique column ID
            header: "Appel d'Offre", // Column header text
            size: 100, // Adjust size as needed
            accessorFn: row => {
                console.log("Processing row for AO column:", row);
                console.log("Accessing row.appelOffre:", row.appel_offre);
                 // Access the nested object and its 'numero' property
                 // This relies on the backend eager-loading 'appelOffre' with at least 'id' and 'numero'
                 // console.log("Row data for AO accessor:", row); // Uncomment to debug row structure
                 return row.appel_offre ? row.appel_offre.numero : null;
            },
            cell: info => {
                const aoNumero = info.getValue();
                // Display the number with a link icon, similar to convention
                return aoNumero
                    ? <div className="text-truncate" style={{ maxWidth: '150px' }} title={aoNumero}>
                          <FontAwesomeIcon icon={faLink} className="me-1 text-muted small" /> {aoNumero}
                      </div>
                    : '-'; // Display '-' if no related Appel d'Offre
            },
            meta: {
                align: 'left', // Align left
                enableGlobalFilter: true // Include this field in global search
            },
        },
        {
            id: 'conventionLIEE', // Unique column ID
            header: 'Convention Liée',
            size: 220,
            accessorFn: row => {
                 // *** VERIFY these names match the JSON response from the backend ***
                 // 1. Is the nested object key 'convention'?
                 // 2. Is the title field key 'Intitule' (case-sensitive)?
                 const relationshipKey = 'convention'; // <-- Check this in API response
                 const titleFieldKey = 'Intitule';    // <-- Check this in API response (case-sensitive!)

                 // Add logging here to inspect the row data if needed:
                 // console.log("Row data for convention accessor:", row);

                 return row[relationshipKey] ? row[relationshipKey][titleFieldKey] : null;
            },
            cell: info => {
                const conventionTitle = info.getValue();
                return conventionTitle
                    ? <div className="text-truncate" style={{ maxWidth: '220px' }} title={conventionTitle}>
                          <FontAwesomeIcon icon={faLink} className="me-1 text-muted small" /> {conventionTitle}
                      </div>
                    : '-';
            },
            meta: {
                align: 'left',
                enableGlobalFilter: true
            },
        },
        // *** END CORRECTED CONVENTION COLUMN ***
        {
            accessorKey: 'type_marche', header: 'Type', size: 80, filterFn: 'equalsString',
            meta: { align: 'center', enableGlobalFilter: true },
        },
        {
            accessorKey: 'montant_attribue', header: 'Montant Attribué', size: 140,
            cell: info => formatCurrency(info.getValue()),
            meta: { align: 'right', enableGlobalFilter: false }
        },
        {
            accessorKey: 'attributaire', header: 'Attributaire', size: 130,
            meta: { align: 'left', enableGlobalFilter: true },
            cell: info => <div className="text-truncate" style={{ maxWidth: '130px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
        },
        {
            accessorKey: 'statut', header: 'Statut', size: 110, filterFn: 'equalsString',
            cell: info => {
                const status = info.getValue();
                const color = getStatusColor(status);
                return status ? (<Badge bg={color} text={color === 'warning' || color === 'light' ? 'dark' : 'white'} className="w-100 text-truncate">{status}</Badge>) : '-';
            },
            meta: { align: 'center', enableGlobalFilter: true },
        },
        {
            accessorKey: 'date_notification', header: 'Date Notif.', size: 110,
            cell: info => formatDate(info.getValue()),
            meta: { align: 'center', enableGlobalFilter: false }
        },
    ], []); // Dependency array is empty

    // --- Filter Rendering Function ---
    const renderMarcheFilters = useCallback((table) => {
        if (!table) return null;
        const typeColumn = table.getColumn('type_marche');
        const statusColumn = table.getColumn('statut');
        const isAnyColumnFiltered = table.getState().columnFilters.length > 0;
        return (
            <Form>
                {/* Type Filter */}
                <Form.Group controlId="filterTypeMarche" className="mb-3">
                   <Form.Label className="small mb-1 fw-bold">Type de Marché</Form.Label>
                   <Select
                       inputId="filterTypeMarcheSelect"
                       options={TYPE_OPTIONS}
                       value={TYPE_OPTIONS.find(option => option.value === typeColumn?.getFilterValue()) || null}
                       onChange={option => typeColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder="Tous Types..." isClearable
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
                       aria-label="Filtrer par type de marché"
                   />
                </Form.Group>
                {/* Status Filter */}
                <Form.Group controlId="filterStatus" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Statut</Form.Label>
                   <Select
                       inputId="filterStatusSelect"
                       options={STATUT_OPTIONS}
                       value={STATUT_OPTIONS.find(option => option.value === statusColumn?.getFilterValue()) || null}
                       onChange={option => statusColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder="Tous Statuts..." isClearable
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
                       aria-label="Filtrer par statut"
                   />
                </Form.Group>
                {/* Reset Button */}
                <Button variant="outline-secondary" size="sm" onClick={() => table.resetColumnFilters()} disabled={!isAnyColumnFiltered} className="w-100 mt-3">
                   <FontAwesomeIcon icon={faTimes} className="me-2"/> Réinitialiser Filtres Spécifiques
                </Button>
            </Form>
        );
    }, []);


    // --- DynamicTable Configuration ---
    // Convention column ('conventionLIEE') is hidden by default
    const defaultVisibleCols = useMemo(() => [
        'numero_marche',
        'intitule', // Marche's intitule
        'type_marche',
        'statut',
        'montant_attribue',
        'actions',
        'appelOffreLIEE', 
        'conventionLIEE' // Add the ID here if you want it visible by default
    ], []);
    const handleFormClose = (refreshNeeded = false) => {
        setSearchParams({});
      
    };
    return (
        <div style={{ height: 'calc(100vh - 56px)', padding: '1rem', overflowY: 'auto' }}>
              {isCreating ? (
                                      // Show the form if action=create
                                      <MarchePublicForm
                                          mode="create" // Tell the form it's in create mode
                                          onClose={handleFormClose} // Pass handler for Cancel button
                                          onSuccess={() => handleFormClose(true)} // Pass handler for successful Save (trigger refresh)
                                          baseApiUrl={BASE_API_URL} // Pass the API URL
                                      />
                                  ) :  <DynamicTable
                // Ensure fetchUrl returns data including the nested 'convention' object
                fetchUrl="/marches-publics"
                dataKey="marches_publics"
                deleteUrlBase="/marches-publics"
                baseApiUrl={BASE_API_URL}

                columns={marcheColumns} // Includes the *corrected* convention column definition
                itemName="Marché Public"
                itemNamePlural="Marchés Publics"
                identifierKey="id"
                displayKeyForDelete="numero_marche"

                itemsPerPage={15}
                defaultVisibleColumns={defaultVisibleCols} // Convention column visibility controlled here
                renderFilters={renderMarcheFilters}
                enableGlobalSearch={true}

                CreateComponent={MarchePublicForm}
                ViewComponent={MarchePublicVisualisation}
                EditComponent={MarchePublicForm}

                actionColumnWidth={90}
                tableClassName="table-striped table-hover"
            />}
        </div>
    );
};

export default MarchePublicPage;