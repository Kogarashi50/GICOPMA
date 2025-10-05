// src/gestion_conventions/ordres_service_views/OrdreServicePage.jsx

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import axios from 'axios';
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
import OrdreServiceForm from './OrdreServiceForm';     // Component for Create/Edit
import OrdreServiceVisualisation from './OrdreServiceVisualisation'; // Component for View

// --- UI & Utilities ---
import Select from 'react-select';
// MODIFIED IMPORT: Added Dropdown
import { Badge, Form, Button, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes, faSyncAlt, faPlayCircle, faStopCircle, faFileSignature, faPaperclip, faFileContract
} from '@fortawesome/free-solid-svg-icons';

// --- Constants & Helpers ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const TYPE_OPTIONS = [
    { value: 'commencement', label: 'Commencement' },
    { value: 'arret', label: 'Arrêt' },
    { value: 'reprise', label: 'Ordre de Service de Reprise' }
];

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

const getTypeDisplay = (typeValue) => {
    switch (typeValue) {
        case 'commencement': return { label: 'Commencement', icon: faPlayCircle, color: 'success' };
        case 'arret': return { label: 'Arrêt', icon: faStopCircle, color: 'danger' };
        case 'reprise': return { label: 'Reprise', icon: faSyncAlt, color: 'primary' };
        default: return { label: typeValue || 'N/A', icon: faFileSignature, color: 'secondary' };
    }
};
// --- End Helpers ---


// --- Main Page Component ---
const OrdreServicePage = () => {

    const [marcheOptions, setMarcheOptions] = useState([]);
    const [loadingMarcheOptions, setLoadingMarcheOptions] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setLoadingMarcheOptions(true);
        axios.get(`${BASE_API_URL}/marches-publics?fields=id,numero_marche,intitule`)
            .then(response => {
                if (!isMounted) return;
                const options = (response.data?.marches_publics || response.data?.data || response.data || []).map(m => ({
                    value: m.id,
                    label: `${m.numero_marche} - ${m.intitule}`.substring(0, 100) + (m.intitule.length > 100 ? '...' : '')
                }));
                setMarcheOptions(options);
            })
            .catch(error => { if (isMounted) console.error("Error fetching Marche options for filter:", error); })
            .finally(() => { if (isMounted) setLoadingMarcheOptions(false); });
        return () => { isMounted = false; };
    }, []);

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
            // ===================================================================
            // === MODIFIED COLUMN FOR HANDLING MULTIPLE FILES ===
            // ===================================================================
            accessorKey: 'fichiers', // Use the new 'fichiers' array from the API
            header: 'Fichiers Joints',
            size: 100,
            enableSorting: false,
            cell: info => {
                const fichiers = info.getValue(); // This will be the array of file objects

                // Case 1: No files
                if (!fichiers || fichiers.length === 0) {
                    return <span className='text-muted'>-</span>;
                }

                // Case 2: Exactly one file - show a direct link
                if (fichiers.length === 1) {
                    const file = fichiers[0];
                    return (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary p-1" title={file.intitule || file.nom_fichier}>
                            <FontAwesomeIcon icon={faPaperclip} />
                        </a>
                    );
                }

                // Case 3: Multiple files - show a dropdown
                return (
                    <Dropdown>
                        <Dropdown.Toggle variant="secondary" size="sm" className="p-1">
                            <FontAwesomeIcon icon={faPaperclip} />
                            <Badge pill bg="dark" className="ms-1">{fichiers.length}</Badge>
                        </Dropdown.Toggle>

                        <Dropdown.Menu align="end">
                            {fichiers.map(file => (
                                <Dropdown.Item
                                    key={file.id}
                                    as="a"
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-truncate"
                                    style={{maxWidth: '250px'}}
                                >
                                    {file.intitule || file.nom_fichier}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                );
            },
            meta: { align: 'center', enableGlobalFilter: false },
        },
    ], []);

    const renderOrdreFilters = useCallback((table) => {
        if (!table) return null;
        const marcheColumn = table.getColumn('marche_public');
        const typeColumn = table.getColumn('type');
        const isAnyColumnFiltered = table.getState().columnFilters.length > 0;

        return (
            <Form>
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
                <Button variant="outline-secondary" size="sm" onClick={() => table.resetColumnFilters()} disabled={!isAnyColumnFiltered} className="w-100 mt-3">
                   <FontAwesomeIcon icon={faTimes} className="me-2"/> Réinitialiser les Filtres
                </Button>
            </Form>
        );
    }, [marcheOptions, loadingMarcheOptions]);


    // --- DynamicTable Configuration ---
    const defaultVisibleCols = useMemo(() => [
        'marche_public',
        'numero',
        'type',
        'date_emission',
        'fichiers', // <-- MODIFIED: Update the column key here
        'actions'
    ], []);

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                fetchUrl="/ordres-service"
                dataKey="data"
                totalCountKey="meta.total"
                deleteUrlBase="/ordres-service"
                baseApiUrl={BASE_API_URL}
                columns={ordreColumns}
                itemName="Ordre de Service"
                itemNamePlural="Ordres de Service"
                identifierKey="id"
                displayKeyForDelete="numero"
                itemsPerPage={10}
                defaultVisibleColumns={defaultVisibleCols}
                renderFilters={renderOrdreFilters}
                enableGlobalSearch={true}
                enableColumnFilters={true}
                enablePagination={true}
                enableSorting={true}
                CreateComponent={OrdreServiceForm}
                ViewComponent={OrdreServiceVisualisation} // Note: This component may also need updating
                EditComponent={OrdreServiceForm}
                actionColumnWidth={90}
                tableClassName="table-striped table-hover"
            />
        </div>
    );
};

export default OrdreServicePage;