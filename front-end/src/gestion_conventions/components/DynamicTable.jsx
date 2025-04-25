// src/components/DynamicTable.jsx (Or your actual path)

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import toExcel from './toexcel.js'; // Import the updated utility
import {
    faPlus, faEye, faPencilAlt, faTrashAlt, faFileAlt,
    faChevronLeft, faChevronRight, faSpinner, faColumns, faFilter, faTimes,
    faCrosshairs, faCheck, faExclamationTriangle, faFileExcel // Added Excel icon
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
} from '@tanstack/react-table';
import Offcanvas from 'react-bootstrap/Offcanvas';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Alert from 'react-bootstrap/Alert';
import getPageNumbers from './Ellipsis'; // Assuming you have this ellipsis helper

// --- Helper Functions ---
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        }
        return dateString;
    } catch (e) { console.error("Error formatting date:", dateString, e); return dateString; }
};

const formatDateSimple = (dateString) => {
    if (!dateString) return '-';
    try {
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
            return new Date(dateString + 'T00:00:00Z').toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
        }
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
        }
        return dateString;
    } catch (e) { console.error("Error formatting simple date:", dateString, e); return dateString; }
};
// --- End Helpers ---


// --- Constants ---
const DEFAULT_ITEMS_PER_PAGE = 10; // Or your preferred default
const DEFAULT_GLOBAL_SEARCH_EXCLUSIONS = ['id', 'created_at', 'updated_at', 'fichier', 'domaine', 'programme', 'chantier', 'convention', 'engagements_financiers']; // Added objects

// --- Helper to safely get header text ---
const getHeaderText = (column) => {
  const header = column.columnDef.header;
  if (typeof header === 'string') {
    return header;
  }
  // If it's a function or complex type, fallback to column ID for export header
  return column.id;
};


// --- The Dynamic Table Component ---
const DynamicTable = ({
    // --- Core Configuration ---
    fetchUrl, dataKey, deleteUrlBase, columns: propColumns, itemName, itemNamePlural,
    // --- Optional Configuration ---
    identifierKey = 'id', displayKeyForDelete, defaultVisibleColumns, globalSearchExclusions = DEFAULT_GLOBAL_SEARCH_EXCLUSIONS, itemsPerPage = DEFAULT_ITEMS_PER_PAGE,
    customFilterFunctions = {}, baseApiUrl = 'http://localhost:8000/api', enableExport = true, // Added enableExport prop
    // --- Component Injection ---
    CreateComponent, ViewComponent, EditComponent,
    renderFilters, // Function: (tableInstance) => JSX (Renders the filter controls)
    // --- Action Handlers (Optional Overrides) ---
    onEdit, onDelete,
    // Pass down date formatters if needed by parent/columns
    formatDate: parentFormatDate,
    formatDateSimple: parentFormatDateSimple,
}) => {
    // --- State ---
    const [rawData, setRawData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [actionSuccess, setActionSuccess] = useState(null);
    const [globalFilter, setGlobalFilter] = useState('');
    const [columnVisibility, setColumnVisibility] = useState({});
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: itemsPerPage });
    const [sorting, setSorting] = useState([]);
    const [showFilters, setShowFilters] = useState(false); // Manages Offcanvas visibility
    const [columnFilters, setColumnFilters] = useState([]);
    const [searchTargetColumnId, setSearchTargetColumnId] = useState('all');
    const [viewingItemId, setViewingItemId] = useState(null);
    const [editingItemId, setEditingItemId] = useState(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    // --- End State ---

    // Use passed formatters or internal defaults
    const internalFormatDate = parentFormatDate || formatDate;
    const internalFormatDateSimple = parentFormatDateSimple || formatDateSimple;

    // Construct full URLs
    const fullFetchUrl = `${baseApiUrl}${fetchUrl}`;
    const fullDeleteUrlBase = deleteUrlBase ? `${baseApiUrl}${deleteUrlBase}` : null;

    // --- Data Fetching ---
    const fetchData = useCallback((showSuccessMessage = false) => {
        console.log(`Fetching data from ${fullFetchUrl}...`);
        setIsLoading(true); setError(null); setActionError(null); setActionSuccess(null);
        axios.get(fullFetchUrl, { withCredentials: true }) // Added withCredentials
            .then(res => {
                console.log("Data fetched:", res.data);
                const fetchedData = res.data?.[dataKey] || [];
                setRawData(fetchedData);
                if (showSuccessMessage) { setActionSuccess(`${itemNamePlural} rafraîchi(e)s.`); setTimeout(() => setActionSuccess(null), 3000); }
            })
            .catch((err) => {
                console.error(`Error fetching ${itemNamePlural.toLowerCase()}:`, err);
                const errorMsg = err.response?.data?.message || err.message || `Erreur chargement ${itemNamePlural.toLowerCase()}.`;
                setError(errorMsg); setRawData([]);
            })
            .finally(() => { setIsLoading(false); });
    }, [fullFetchUrl, dataKey, itemNamePlural]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- Event Handlers ---
    const handleCreate = useCallback(() => { setActionError(null); setActionSuccess(null); setViewingItemId(null); setEditingItemId(null); setShowCreateForm(true); }, []);
    const handleView = useCallback((id) => { setActionError(null); setActionSuccess(null); setShowCreateForm(false); setEditingItemId(null); setViewingItemId(id); }, []);
    const handleEdit = useCallback((id) => { setActionError(null); setActionSuccess(null); setShowCreateForm(false); setViewingItemId(null); console.log('Edit ID:', id); setEditingItemId(id); }, []);
    const handleDelete = useCallback((id, identifierForDisplay) => {
        if (!fullDeleteUrlBase && !onDelete) { setActionError("Suppression non configurée."); setTimeout(() => setActionError(null), 5000); return; }
        setActionError(null); setActionSuccess(null);
        const itemIdentifier = identifierForDisplay || `ID ${id}`;
        if (window.confirm(`Supprimer ${itemName.toLowerCase()} : ${itemIdentifier} ?`)) {
            setIsLoading(true);
            if (onDelete) {
                 try {
                    Promise.resolve(onDelete(id, rawData.find(item => item[identifierKey] === id)))
                        .then(() => { setActionSuccess(`${itemName} ${itemIdentifier} supprimé(e) (action perso).`); fetchData(true); }) // Refresh after custom delete
                        .catch(err => { setActionError(err.message || `Erreur suppression perso.`); setTimeout(() => setActionError(null), 5000); })
                        .finally(() => setIsLoading(false));
                 } catch (err) { setActionError(err.message || `Erreur sync suppression perso.`); setTimeout(() => setActionError(null), 5000); setIsLoading(false); }
                 return;
            }
            axios.delete(`${fullDeleteUrlBase}/${id}`, { withCredentials: true }) // Added withCredentials
                .then(() => { setActionSuccess(`${itemName} ${itemIdentifier} supprimé(e).`); fetchData(true); if (viewingItemId === id) setViewingItemId(null); if (editingItemId === id) setEditingItemId(null); })
                .catch(err => { const errorMsg = err.response?.data?.message || err.message || `Erreur suppression.`; setActionError(errorMsg); setTimeout(() => setActionError(null), 5000); setIsLoading(false); })
        } else { console.log(`Deletion cancelled for ${itemName} ID: ${id}`); }
    }, [fullDeleteUrlBase, identifierKey, itemName, viewingItemId, editingItemId, fetchData, onDelete, rawData]);

    const handleShowFilters = useCallback(() => setShowFilters(true), []);
    const handleCloseFilters = useCallback(() => setShowFilters(false), []);
    const handleCloseVisualisation = useCallback(() => setViewingItemId(null), []);
    const handleCloseEdit = useCallback(() => setEditingItemId(null), []);
    const handleCloseForm = useCallback(() => setShowCreateForm(false), []);
    const handleItemCreated = useCallback((createdItem) => { // Pass item if needed
        console.log("Item created:", createdItem);
        setShowCreateForm(false);
        fetchData(true); // Refresh data
        setActionSuccess(`${itemName} créé(e) avec succès.`); // Provide success feedback
        setTimeout(() => setActionSuccess(null), 4000);
    }, [fetchData, itemName]);
    const handleItemUpdated = useCallback((updatedItem) => { // Pass item if needed
        console.log("Item updated:", updatedItem);
        setEditingItemId(null);
        fetchData(true); // Refresh data
        setActionSuccess(`${itemName} modifié(e) avec succès.`); // Provide success feedback
        setTimeout(() => setActionSuccess(null), 4000);
    }, [fetchData, itemName]);
    const handleSelectSearchTarget = useCallback((columnId) => setSearchTargetColumnId(columnId), []);
    // --- End Event Handlers ---


    // --- Columns Definition & Visibility ---
    const columns = useMemo(() => {
        const actionCol = {
            id: 'actions', header: 'Actions', enableHiding: false, enableSorting: false, meta: { enableGlobalFilter: false },
            cell: ({ row }) => {
                const item = row.original; const itemId = item[identifierKey];
                const displayIdentifier = displayKeyForDelete && item[displayKeyForDelete] ? item[displayKeyForDelete] : `ID ${itemId}`;
                return ( <div className="d-flex align-items-center justify-content-center flex-nowrap">
                        {ViewComponent && ( <button onClick={() => handleView(itemId)} className="btn btn-link btn-sm text-primary p-0 mx-1" title="Voir"><FontAwesomeIcon icon={faEye} /></button> )}
                        {(onEdit || EditComponent) && ( <button onClick={() => onEdit ? onEdit(itemId, item) : handleEdit(itemId)} className="btn btn-link btn-sm text-success p-0 mx-1" title="Modifier"><FontAwesomeIcon icon={faPencilAlt} /></button> )}
                        {(onDelete || fullDeleteUrlBase) && ( <button onClick={() => handleDelete(itemId, displayIdentifier)} className="btn btn-link btn-sm text-danger p-0 mx-1" title="Supprimer"><FontAwesomeIcon icon={faTrashAlt} /></button> )}
                    </div> ); },
            size: 90, minSize: 80, maxSize: 100,
        };
        const hasUserActions = propColumns.some(col => col.id === 'actions');
        const shouldAddActions = !hasUserActions && (ViewComponent || EditComponent || onEdit || fullDeleteUrlBase || onDelete);
        return shouldAddActions ? [...propColumns, actionCol] : propColumns;
    }, [ propColumns, identifierKey, displayKeyForDelete, ViewComponent, EditComponent, fullDeleteUrlBase, onEdit, onDelete, handleView, handleEdit, handleDelete ]);

    const allColumnIds = useMemo(() => columns.map(col => col.id || col.accessorKey).filter(Boolean), [columns]);
    useEffect(() => { // Initial column visibility setup
        const initialVisibility = {};
        allColumnIds.forEach(id => {
            if (id === 'actions') { initialVisibility[id] = true; }
            else if (defaultVisibleColumns) { initialVisibility[id] = defaultVisibleColumns.includes(id); }
            else { initialVisibility[id] = true; }
        });
        setColumnVisibility(initialVisibility);
     }, [allColumnIds, defaultVisibleColumns]);
    // --- End Columns ---

    // --- Custom Global Filter ---
    const customGlobalFilterFn = useCallback((row, columnId, filterValue) => {
        const targetColId = searchTargetColumnId; const lowerCaseFilter = String(filterValue).toLowerCase().trim();
        if (!lowerCaseFilter) return true;
        const checkValue = (value) => value != null && String(value).toLowerCase().includes(lowerCaseFilter);
        if (targetColId === 'all') {
            return row.getAllCells().some(cell => {
                const columnDef = cell.column.columnDef; const isSearchable = columnDef.meta?.enableGlobalFilter ?? !globalSearchExclusions.includes(cell.column.id);
                return isSearchable && checkValue(cell.getValue()); });
        } else {
             const cell = row.getAllCells().find(c => c.column.id === targetColId); const colDef = cell?.column?.columnDef;
             const isSearchable = colDef?.meta?.enableGlobalFilter ?? !globalSearchExclusions.includes(targetColId);
             return cell && isSearchable && checkValue(cell.getValue()); }
    }, [searchTargetColumnId, globalSearchExclusions]);
    // --- End Global Filter ---

    // --- TanStack Table Instance ---
    const table = useReactTable({
         data: rawData, columns, globalFilterFn: customGlobalFilterFn, filterFns: { ...customFilterFunctions },
         // Pass formatters to meta if columns need them
         meta: useMemo(() => ({ formatDate: internalFormatDate, formatDateSimple: internalFormatDateSimple }), [internalFormatDate, internalFormatDateSimple]),
         state: { globalFilter, columnVisibility, columnFilters, pagination, sorting },
         onColumnFiltersChange: setColumnFilters, onGlobalFilterChange: setGlobalFilter, onColumnVisibilityChange: setColumnVisibility,
         onPaginationChange: setPagination, onSortingChange: setSorting,
         getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
         getSortedRowModel: getSortedRowModel(),
         manualFiltering: false, manualPagination: false, manualSorting: false, autoResetPageIndex: true, debugTable: false,
     });
    // --- End Table Instance ---

    // --- Hooks depending on 'table' ---
    const handleResetAllFilters = useCallback(() => {
        setGlobalFilter('');
        setSearchTargetColumnId('all');
        if (table) {
            table.resetColumnFilters();
            table.resetSorting();
        }
    }, [table]);

    const targetColumnHeader = useMemo(() => {
        if (!table) return '...';
        if (searchTargetColumnId === 'all') return `toutes les colonnes ${globalSearchExclusions.length > 0 ? '(excl.)' : ''}`;
        const targetCol = table.getColumn(searchTargetColumnId);
        return targetCol ? getHeaderText(targetCol) : searchTargetColumnId; // Use helper
    }, [searchTargetColumnId, table, globalSearchExclusions.length]);
    // --- End Dependent Hooks ---


    // --- Export Handler ---
    const handleExport = useCallback(() => {
        if (!table) {
            console.error("Export Error: Table instance not available.");
            setActionError("Impossible d'exporter : instance de table non prête.");
            return;
        }

        const visibleColumns = table.getVisibleLeafColumns().filter(col => col.id !== 'actions'); // Exclude actions column
        const rowsToExport = table.getFilteredRowModel().rows; // Gets filtered and sorted rows

        if (rowsToExport.length === 0) {
            alert('Aucune donnée filtrée à exporter.');
            return;
        }

        console.log(`Exporting ${rowsToExport.length} rows with ${visibleColumns.length} visible columns (excluding actions).`);

        // Prepare data in the format needed by XLSX.utils.json_to_sheet
        const dataForExport = rowsToExport.map(row => {
            const rowData = {};
            visibleColumns.forEach(column => {
                const headerText = getHeaderText(column); // Get header using helper
                let cellValue = row.getValue(column.id); // Get potentially formatted value

                // Attempt to get a more "raw" value if needed (e.g., if cell renderer returns complex JSX)
                // Check if the value is a React element or an object (excluding null)
                 if (typeof cellValue === 'object' && cellValue !== null && !Array.isArray(cellValue)) {
                    // Heuristic: If it's an object or element, try accessing original data via accessor key if defined
                    if (column.columnDef.accessorKey && row.original.hasOwnProperty(column.columnDef.accessorKey)) {
                        cellValue = row.original[column.columnDef.accessorKey];
                    } else if (row.original.hasOwnProperty(column.id)) {
                        // Fallback to using column ID on original data if accessorKey isn't defined/present
                        cellValue = row.original[column.id];
                    } else {
                        // Last resort: If it's still an object/element, stringify (might not be ideal)
                        console.warn(`Column "${headerText}" has complex content. Exporting as string.`);
                        try {
                             cellValue = JSON.stringify(cellValue);
                         } catch {
                             cellValue = '[Complex Content]';
                         }
                    }
                }

                // Handle potential null/undefined after attempting to get raw value
                rowData[headerText] = cellValue ?? ''; // Use empty string for null/undefined in Excel

            });
            return rowData;
        });

        console.log("Data prepared for export:", dataForExport);

        // Call the export utility
        toExcel(dataForExport, `${itemNamePlural}_export_${new Date().toISOString().slice(0,10)}`); // Add date to filename

    }, [table, itemNamePlural]); // Dependencies: table instance, itemNamePlural for filename
    // --- End Export Handler ---


    // --- Filter activity checks ---
    const hasActiveColumnFilters = table?.getState().columnFilters.length > 0; // Use table state safely
    const hasActiveFilters = globalFilter || hasActiveColumnFilters;

    // --- Render Logic ---
    return (
        <>
            {showCreateForm && CreateComponent ? ( <CreateComponent onClose={handleCloseForm} onItemCreated={handleItemCreated} baseApiUrl={baseApiUrl} /> ) : (
                <div className="d-flex flex-column dynamic-table-container p-2 h-100">
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-center mb-2 flex-shrink-0">
                       <h1 className="fs-4 fw-bold text-dark mb-0">{itemNamePlural.toUpperCase()}</h1>
                       {CreateComponent && ( <button onClick={handleCreate} className="btn createBtn btn-sm d-flex align-items-center shadow-sm"><FontAwesomeIcon icon={faPlus} className="me-2" /><span>Créer {itemName}</span></button> )}
                    </div>
                    {/* Feedback Area */}
                     <div className="flex-shrink-0 mb-2">
                        {actionError && <Alert variant="danger" onClose={() => setActionError(null)} dismissible className="py-2 small mb-1"><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/>{actionError}</Alert>}
                        {actionSuccess && <Alert variant="success" onClose={() => setActionSuccess(null)} dismissible className="py-2 small mb-1"><FontAwesomeIcon icon={faCheck} className="me-2"/>{actionSuccess}</Alert>}
                        {error && !isLoading && <Alert variant="warning" onClose={() => setError(null)} dismissible className="py-2 small mb-1"><FontAwesomeIcon icon={faExclamationTriangle} className="me-2"/>{error}</Alert>}
                    </div>
                    {/* Toolbar */}
                    <div className="card cardSearch mb-2 flex-shrink-0">
                         <div className="card-body d-flex align-items-center justify-content-between p-2 gap-2 flex-wrap">
                            {/* Search */}
                            <div className="input-group input-group-sm search-input-group-container flex-grow-1" style={{minWidth: '250px'}}>
                                {/* Search Target Dropdown */}
                                <div className="dropdown">
                                    <button className="btn border border-0" type="button" id="searchTargetDropdown" data-bs-toggle="dropdown" aria-expanded="false" title="Colonne à rechercher"><FontAwesomeIcon icon={faCrosshairs} className="text-secondary"/></button>
                                    <ul className="dropdown-menu px-1 shadow-sm" aria-labelledby="searchTargetDropdown" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '350px', overflowY: 'auto', zIndex: 1050 }}>
                                         <li><button className={`dropdown-item d-flex justify-content-between align-items-center small ${searchTargetColumnId === 'all' ? 'active' : ''}`} type="button" onClick={() => handleSelectSearchTarget('all')}>Toutes {searchTargetColumnId === 'all' && <FontAwesomeIcon icon={faCheck} size="xs" className="ms-2"/>}</button></li>
                                         <li><hr className="dropdown-divider my-1" /></li>
                                         {table?.getAllLeafColumns().map(column => {
                                            const isSearchable = column.columnDef.meta?.enableGlobalFilter ?? !globalSearchExclusions.includes(column.id);
                                            const canShow = column.getCanHide() || column.id === 'actions';
                                            return isSearchable && canShow ? ( <li key={column.id}><button className={`dropdown-item d-flex justify-content-between align-items-center small ${searchTargetColumnId === column.id ? 'active' : ''}`} type="button" onClick={() => handleSelectSearchTarget(column.id)}><span>{getHeaderText(column)}</span>{searchTargetColumnId === column.id && <FontAwesomeIcon icon={faCheck} size="xs" className="ms-2"/>}</button></li> ) : null;
                                         })}
                                    </ul>
                                </div>
                                <input type="text" placeholder={`Rechercher dans "${targetColumnHeader}"...`} value={globalFilter ?? ''} onChange={(e) => setGlobalFilter(e.target.value)} className="form-control  border-0 form-control-sm" aria-label="Search input"/>
                                {globalFilter && ( <Button variant="light" size="sm" onClick={() => setGlobalFilter('')} className="border" title="Effacer"><FontAwesomeIcon icon={faTimes} size="xs" /></Button> )}
                            </div>
                            {/* Buttons */}
                            <div className='d-flex gap-1 flex-shrink-0'>
                                {renderFilters && ( // Column Filters Button
                                    <Button variant="light" size="sm" onClick={handleShowFilters} title={`Filtrer ${itemNamePlural}`} className={hasActiveColumnFilters ? 'text-primary border-primary' : ''}>
                                        <FontAwesomeIcon icon={faFilter} />
                                        {hasActiveColumnFilters && <span className="badge bg-primary rounded-pill ms-1 align-middle" style={{ fontSize: '0.6em' }}>{columnFilters.length}</span>}
                                    </Button>
                                )}
                                {/* Column Visibility Dropdown */}
                                <div className="dropdown">
                                    <button className="btn btn-light btn-sm" type="button" id="columnVisibilityDropdown" data-bs-toggle="dropdown" aria-expanded="false" title="Colonnes"><FontAwesomeIcon icon={faColumns} /></button>
                                    <ul className="dropdown-menu dropdown-menu-end px-2 shadow-sm" aria-labelledby="columnVisibilityDropdown" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '350px', overflowY: 'auto', zIndex: 1050 }}>
                                         <li className="dropdown-header small text-muted px-1 pb-1">Afficher colonnes</li>
                                         {table?.getAllLeafColumns().map(column => ( column.getCanHide() ? ( <li key={column.id}><Form.Check type="checkbox" id={`col-vis-${column.id}`} label={<span className="small">{getHeaderText(column)}</span>} checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} className="dropdown-item-text mb-0"/></li> ) : null ))}
                                    </ul>
                                </div>

                                {/* Export Button */}
                                {enableExport && table && table.getFilteredRowModel().rows.length > 0 && ( // Only show if enabled AND there are rows to export
                                     <Button variant="outline-success" size="sm" onClick={handleExport} title={`Exporter les ${itemNamePlural} filtrés vers Excel`}>
                                        <FontAwesomeIcon icon={faFileExcel} />
                                    </Button>
                                )}

                                {/* Reset Button */}
                                {(globalFilter || hasActiveColumnFilters || sorting.length > 0) && ( <Button variant="outline-secondary" size="sm" onClick={handleResetAllFilters} title="Réinitialiser recherche/filtres/tris"><FontAwesomeIcon icon={faTimes} /></Button> )}
                            </div>
                        </div>
                    </div>
                    {/* Table */}
                     <div className="card cardTab mb-2" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                         <div className="table-responsive " style={{ overflow: 'auto' }}>
                            <table className="table table-hover tableList table-xs mb-0 align-middle">
                                <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--bs-table-bg, white)' }}>
                                    {table?.getHeaderGroups().map(headerGroup=>(<tr key={headerGroup.id}>{headerGroup.headers.map(header => (
                                        <th key={header.id} colSpan={header.colSpan} scope="col" className="py-2 px-3 text-capitalize text-muted small table-light"
                                            style={{ width: header.getSize() !== 150 ? header.getSize() : undefined, minWidth: header.column.columnDef.minSize, maxWidth: header.column.columnDef.maxSize, cursor: header.column.getCanSort() ? 'pointer' : undefined, userSelect: header.column.getCanSort() ? 'none' : undefined, }}
                                            onClick={header.column.getToggleSortingHandler()} title={header.column.getCanSort() ? `Trier par ${getHeaderText(header.column)}` : undefined} >
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</span>
                                                {/* Sorting indicators */}
                                                <span className='opacity-50 ms-1'>
                                                     {{ asc: '▲', desc: '▼' }[header.column.getIsSorted()] ?? null}
                                                </span>
                                             </div>
                                        </th> ))}</tr> ))}
                                </thead>
                                <tbody>
                                    {isLoading ? ( <tr><td colSpan={table?.getVisibleLeafColumns().length || 1} className="text-center py-4"><FontAwesomeIcon icon={faSpinner} spin size="2x" className="text-secondary" /><p>Chargement...</p></td></tr> )
                                    : table && table.getRowModel().rows.length > 0 ? ( table.getRowModel().rows.map(row => (
                                        <tr key={row.id} className={viewingItemId === row.original[identifierKey] || editingItemId === row.original[identifierKey] ? 'table-active' : ''}>
                                            {row.getVisibleCells().map(cell => ( <td key={cell.id} className="py-2 px-3 small" style={{ width: cell.column.getSize() !== 150 ? cell.column.getSize() : undefined, minWidth: cell.column.columnDef.minSize, maxWidth: cell.column.columnDef.maxSize, }} title={typeof cell.getValue() === 'string' || typeof cell.getValue() === 'number' ? String(cell.getValue()) : undefined} >{flexRender(cell.column.columnDef.cell, cell.getContext())}</td> ))}
                                        </tr> )) )
                                    : ( <tr><td colSpan={table?.getVisibleLeafColumns().length || 1} className="text-center py-3 text-muted small">{ hasActiveFilters ? `Aucun(e) ${itemName.toLowerCase()} trouvé(e) correspondant aux critères.` : error ? `Erreur: ${error}` : `Aucun(e) ${itemName.toLowerCase()} disponible.` }</td></tr> )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/* Pagination */}
                    { !isLoading && table && table.getPageCount() > 0 && (
                        <nav aria-label="Table pagination" className="mt-auto pt-2 flex-shrink-0 custom-minimal-pagination">
                            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                                <div className="text-muted small"> {table.getFilteredRowModel().rows.length} sur {rawData.length} {itemNamePlural.toLowerCase()} (Page {table.getState().pagination.pageIndex + 1} sur {table.getPageCount()}) </div>
                                {table.getPageCount() > 1 && (
                                    <ul className="pagination pagination-sm justify-content-center mb-0">
                                    <li className={`page-item prev-page ${!table.getCanPreviousPage() ? 'disabled' : ''}`}> <button className="page-link page-arrow" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Précédent" title="Précédent"><FontAwesomeIcon icon={faChevronLeft} /></button> </li>
                                    {getPageNumbers(table.getState().pagination.pageIndex, table.getPageCount()).map((page, index) => (
                                         <li key={`page-${page}-${index}`} className={`page-item page-number-item ${page === '...' ? 'disabled' : ''} ${table.getState().pagination.pageIndex + 1 === page ? 'active' : ''}`}>
                                            {page === '...' ? ( <span className="page-link ellipsis">...</span> ) : ( <button className="page-link page-number" onClick={() => table.setPageIndex(page - 1)}>{page}</button> )}
                                         </li>
                                     ))}
                                    <li className={`page-item next-page ${!table.getCanNextPage() ? 'disabled' : ''}`}> <button className="page-link page-arrow" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Suivant" title="Suivant"><FontAwesomeIcon icon={faChevronRight} /></button> </li>
                                </ul>
                                 )}
                                <div className="d-flex align-items-center gap-1">
                                    <span className='small text-muted'>Lignes:</span>
                                    <Form.Select size="sm" value={table.getState().pagination.pageSize} onChange={e => table.setPageSize(Number(e.target.value))} style={{ width: 'auto'}} aria-label="Items per page" >
                                        {[5, 10, 20, 50, 100].map(pageSize => ( <option key={pageSize} value={pageSize}>{pageSize}</option> ))}
                                    </Form.Select>
                                </div>
                             </div>
                        </nav>
                    )}

                </div> /* End Table View */
             )}

            {/* Filter Offcanvas */}
            {renderFilters && (
                 <Offcanvas show={showFilters} onHide={handleCloseFilters} placement="end" backdrop={true} className="offcanvas-sm bg-light p-2">
                     <Offcanvas.Header closeButton>
                         <Offcanvas.Title className="fs-6">Filtrer {itemNamePlural}</Offcanvas.Title>
                     </Offcanvas.Header>
                     <Offcanvas.Body className="d-flex flex-column">
                         {table ? renderFilters(table) : <p>Chargement des filtres...</p>}
                     </Offcanvas.Body>
                 </Offcanvas>
             )}

            {/* View Modal */}
            {ViewComponent && (
                <Modal show={!!viewingItemId} onHide={handleCloseVisualisation} dialogClassName="modal-xl modal-custom-large" contentClassName=" rounded-5" centered scrollable >
                    <Modal.Body style={{ padding: '0' }}>
                        {viewingItemId && ( <ViewComponent  itemId={viewingItemId} onClose={handleCloseVisualisation} baseApiUrl={baseApiUrl} /> )}
                    </Modal.Body>
                </Modal> )}

             {/* Edit Modal */}
             {EditComponent && (
                <Modal show={!!editingItemId} onHide={handleCloseEdit} contentClassName=" rounded-5 py-5" dialogClassName="modal-xl" centered backdrop="static" keyboard={false} scrollable >
                    <Modal.Body style={{ padding: '0' }}>
                        {editingItemId && ( <EditComponent itemId={editingItemId} onClose={handleCloseEdit} onItemUpdated={handleItemUpdated} baseApiUrl={baseApiUrl} /> )}
                    </Modal.Body>
                </Modal> )}
        </>
    );
};

// --- PropTypes ---
DynamicTable.propTypes = {
    // Core
    fetchUrl: PropTypes.string.isRequired, dataKey: PropTypes.string.isRequired, deleteUrlBase: PropTypes.string, columns: PropTypes.arrayOf(PropTypes.object).isRequired, itemName: PropTypes.string.isRequired, itemNamePlural: PropTypes.string.isRequired,
    // Optional Config
    identifierKey: PropTypes.string, displayKeyForDelete: PropTypes.string, defaultVisibleColumns: PropTypes.arrayOf(PropTypes.string), globalSearchExclusions: PropTypes.arrayOf(PropTypes.string), itemsPerPage: PropTypes.number, customFilterFunctions: PropTypes.object, baseApiUrl: PropTypes.string, enableExport: PropTypes.bool, // Added prop type
    // Components & Filters
    CreateComponent: PropTypes.elementType, ViewComponent: PropTypes.elementType, EditComponent: PropTypes.elementType,
    renderFilters: PropTypes.func,
    // Actions
    onEdit: PropTypes.func, onDelete: PropTypes.func,
    // Formatters (Optional passthrough)
    formatDate: PropTypes.func,
    formatDateSimple: PropTypes.func,
};

// --- Default Props ---
DynamicTable.defaultProps = {
  identifierKey: 'id',
  itemsPerPage: DEFAULT_ITEMS_PER_PAGE,
  globalSearchExclusions: DEFAULT_GLOBAL_SEARCH_EXCLUSIONS,
  baseApiUrl: 'http://localhost:8000/api',
  enableExport: true, // Default export to true
};


export default DynamicTable;