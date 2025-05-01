// src/gestion_conventions/ordres_service_views/OrdreServicePage.jsx

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import axios from 'axios';
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
import OrdreServiceForm from './OrdreServiceForm';     // Component for Create/Edit
import OrdreServiceVisualisation from './OrdreServiceVisualisation'; // Component for View

// --- UI & Utilities ---
import Select from 'react-select';
import { Badge, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes, faLink, faPlayCircle, faStopCircle, faFileSignature, faPaperclip, faFileContract
} from '@fortawesome/free-solid-svg-icons';

// --- Constants & Helpers ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const TYPE_OPTIONS = [
    { value: 'commencement', label: 'Commencement' },
    { value: 'arret', label: 'Arrêt' }
];
// Helper: Formats date string (e.g., YYYY-MM-DD HH:MM:SS) to DD/MM/YYYY
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return dateString;
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error("Date format error:", dateString, e);
        return dateString;
    }
};

// Helper: Gets display properties (label, icon, color) for OrdreService type
const getTypeDisplay = (typeValue) => {
    switch (typeValue) {
        case 'commencement': return { label: 'Commencement', icon: faPlayCircle, color: 'success' };
        case 'arret': return { label: 'Arrêt', icon: faStopCircle, color: 'danger' };
        default: return { label: typeValue || 'N/A', icon: faFileSignature, color: 'secondary' };
    }
};

// *** REMOVED the incorrect getPublicFileUrl helper function ***

// --- End Helpers ---


// --- Main Page Component ---
const OrdreServicePage = () => {

    // State for Marche Public options used in the filter dropdown
    const [marcheOptions, setMarcheOptions] = useState([]);
    const [loadingMarcheOptions, setLoadingMarcheOptions] = useState(true);

    // --- Effect to Fetch Marche Public Options for Filtering ---
    useEffect(() => {
        let isMounted = true;
        setLoadingMarcheOptions(true);
        console.log("OrdreServicePage: Fetching Marche options for filter...");
        // Fetch a simplified list of Marches - adjust endpoint/params as needed
        axios.get(`${BASE_API_URL}/marches-publics?fields=id,numero_marche,intitule`)
            .then(response => {
                if (!isMounted) return;
                const options = (response.data?.marches_publics || response.data || []).map(m => ({
                    value: m.id,
                    label: `${m.numero_marche} - ${m.intitule}`.substring(0, 100) + (m.intitule.length > 100 ? '...' : '')
                }));
                setMarcheOptions(options);
                console.log(`Fetched ${options.length} Marche options for filter.`);
            })
            .catch(error => {
                if (!isMounted) return;
                console.error("Error fetching Marche options for filter:", error);
                setMarcheOptions([]);
            })
            .finally(() => {
                if (isMounted) setLoadingMarcheOptions(false);
            });
        return () => { isMounted = false; };
    }, []); // Runs once on component mount

    // --- Column Definitions for the DynamicTable ---
    const ordreColumns = useMemo(() => [
        {
            accessorKey: 'marche_public',
            header: 'Marché Public Lié',
            size: 200,
            cell: info => {
                const marche = info.getValue();
                return marche ? (
                    <div className="text-truncate" style={{ maxWidth: '200px' }} title={`${marche.numero_marche} - ${marche.intitule}`}>
                        <FontAwesomeIcon icon={faFileContract} className="me-2 text-info small" />
                        {marche.numero_marche || 'N/A'}
                    </div>
                ) : ( <span className='text-muted'>-</span> );
            },
            meta: { align: 'left', enableSorting: false, enableGlobalFilter: true },
            filterFn: (row, columnId, filterValue) => {
                return row.original?.marche_public?.id == filterValue;
            },
        },
        {
            accessorKey: 'type',
            header: 'Type',
            size: 200,
            filterFn: 'equalsString',
            cell: info => {
                const typeVal = info.getValue();
                const typeInfo = getTypeDisplay(typeVal);
                return typeVal ? (
                    <Badge bg={typeInfo.color || 'secondary'} text="white" className="px-2 py-1 shadow-sm">
                        <FontAwesomeIcon icon={typeInfo.icon} className="me-1 fa-fw" /> {typeInfo.label}
                    </Badge>
                ) : '-';
            },
            meta: { align: 'center', enableGlobalFilter: true },
        },
        {
            accessorKey: 'numero',
            header: 'Numéro OS',
            size: 200,
            meta: { align: 'left', enableGlobalFilter: true }
        },
        {
            accessorKey: 'date_emission',
            header: 'Date Émission',
            size: 200,
            cell: info => formatDate(info.getValue()),
            meta: { align: 'center', enableGlobalFilter: false }
        },
        {
            // Keep accessorKey as 'fichier_joint' to get the original relative path for filename extraction
            accessorKey: 'fichier_joint',
            header: 'Fichier',
            size: 80,
            enableSorting: false,
            // *** MODIFIED cell renderer ***
            cell: info => {
                 // Get the full original data for the row to access BOTH path and URL
                 const rowData = info.row.original;
                 const relativePath = rowData.fichier_joint; // Get relative path from original accessor key
                 const url = rowData.fichier_joint_url; // <<< Get the full URL provided by the backend
                 const name = relativePath ? relativePath.split('/').pop() : null; // Extract filename from relative path

                 return url ? ( // Use the backend-provided URL for the link
                     <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary p-1" title={name || 'Voir fichier'}>
                         <FontAwesomeIcon icon={faPaperclip} />
                     </a>
                 ) : (
                    <span className='text-muted'>-</span>
                 );
            },
            meta: { align: 'center', enableGlobalFilter: false },
        },
    ], []); // Removed BASE_API_URL dependency as helper is gone

    // --- Filter Rendering Function for DynamicTable ---
    const renderOrdreFilters = useCallback((table) => {
        if (!table) return null;

        const marcheColumn = table.getColumn('marche_public');
        const typeColumn = table.getColumn('type');
        const isAnyColumnFiltered = table.getState().columnFilters.length > 0;

        return (
            <Form>
                {/* Marche Public Filter Dropdown */}
                <Form.Group controlId="filterMarche" className="mb-3">
                   <Form.Label className="small mb-1 fw-bold">Filtrer par Marché Public</Form.Label>
                   <Select
                       inputId="filterMarcheSelect"
                       options={marcheOptions}
                       value={marcheOptions.find(option => option.value == marcheColumn?.getFilterValue()) || null}
                       onChange={option => marcheColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder={loadingMarcheOptions ? "Chargement..." : "Tous les Marchés..."}
                       isClearable
                       isLoading={loadingMarcheOptions}
                       isDisabled={loadingMarcheOptions}
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                       menuPortalTarget={document.body}
                       aria-label="Filtrer par marché public"
                   />
                </Form.Group>

                {/* Type Filter Dropdown */}
                 <Form.Group controlId="filterTypeOrdre" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Filtrer par Type</Form.Label>
                    <Select
                       inputId="filterTypeOrdreSelect"
                       options={TYPE_OPTIONS}
                       value={TYPE_OPTIONS.find(option => option.value === typeColumn?.getFilterValue()) || null}
                       onChange={option => typeColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder="Tous les Types..."
                       isClearable
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                       menuPortalTarget={document.body}
                       aria-label="Filtrer par type d'ordre"
                   />
                 </Form.Group>

                {/* Button to Reset Column Filters */}
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => table.resetColumnFilters()}
                    disabled={!isAnyColumnFiltered}
                    className="w-100 mt-3"
                >
                   <FontAwesomeIcon icon={faTimes} className="me-2"/> Réinitialiser les Filtres
                </Button>
            </Form>
        );
    }, [marcheOptions, loadingMarcheOptions]); // Dependencies


    // --- DynamicTable Configuration ---
    const defaultVisibleCols = useMemo(() => [
        'marche_public',
        'numero',
        'type',
        'date_emission',
        'fichier_joint', // The column showing the link
        'actions'
    ], []);

    // --- Component Return ---
    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                // --- API Endpoints & Data Handling ---
                fetchUrl="/ordres-service"
                // *** IMPORTANT: Ensure this dataKey matches your backend pagination response ***
                // If the backend returns { "data": [...], "links": ..., "meta": ... }, use "data"
                // If it returns { "ordres": [...], ... }, use "ordres"
                dataKey="data" // Default for Laravel pagination response
                totalCountKey="meta.total" // Key for total items count in pagination response
                // --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
                deleteUrlBase="/ordres-service"
                baseApiUrl={BASE_API_URL}

                // --- Data Configuration ---
                columns={ordreColumns}
                itemName="Ordre de Service"
                itemNamePlural="Ordres de Service"
                identifierKey="id"
                displayKeyForDelete="numero"

                // --- Table Features ---
                itemsPerPage={10} // Or your preferred default
                defaultVisibleColumns={defaultVisibleCols}
                renderFilters={renderOrdreFilters}
                enableGlobalSearch={true}
                enableColumnFilters={true}
                enablePagination={true} // Ensure pagination is enabled
                enableSorting={true}    // Enable backend sorting

                // --- CRUD Components ---
                CreateComponent={OrdreServiceForm}
                ViewComponent={OrdreServiceVisualisation}
                EditComponent={OrdreServiceForm}

                // --- Styling & Layout ---
                actionColumnWidth={90}
                tableClassName="table-striped table-hover"
            />
        </div>
    );
};

export default OrdreServicePage;