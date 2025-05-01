// src/gestion_historique/ActivityLogPage.jsx

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import axios from 'axios';
import DynamicTable from '../components/DynamicTable'; // Adjust path
import ActivityLogVisualisation from './ActivityLogVisualisation'; // Adjust path

// --- UI & Utilities ---
import Select from 'react-select';
import ReactDatePicker, { registerLocale } from 'react-datepicker'; // Import DatePicker
import fr from 'date-fns/locale/fr'; // Import French locale for DatePicker
import 'react-datepicker/dist/react-datepicker.css'; // Import DatePicker CSS
import { Badge, Form, Button, Row, Col, InputGroup, Spinner } from 'react-bootstrap'; // Added Spinner
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHistory, faTimes, faUser, faPlusCircle, faEdit, faTrashAlt, faQuestionCircle, faTags, faServer,
    faCalendarAlt, // Icon for date filters
    faFilter // Icon for filter section title
} from '@fortawesome/free-solid-svg-icons';

registerLocale('fr', fr); // Register French locale for DatePicker

// --- Constants & Helpers ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const formatDate = (dateString, includeTime = true) => {
    if (!dateString) {
        return '-'; // Handle null, undefined, or empty strings
    }

    try {
        // Attempt to parse the date string using the built-in Date constructor
        const date = new Date(dateString);

        // --- CRUCIAL CHECK ---
        // Verify if the date object is valid. isNaN() on a date object checks
        // if its internal time value is NaN, which indicates an invalid date.
        if (isNaN(date.getTime())) {
            console.warn("formatDate: Could not parse date string:", dateString);
            // Return the original string or a placeholder if parsing fails
            return dateString;
        }

        // --- Formatting (Only if date is valid) ---
        const day = String(date.getDate()).padStart(2, '0');
        // getMonth() is 0-indexed (0 for January), so add 1
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        // If only date is needed, return it here
        if (!includeTime) {
            return `${day}/${month}/${year}`;
        }

        // Continue formatting time components
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        // Return the full formatted string
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;

    } catch (e) {
        // Catch any unexpected errors (less likely now with the isNaN check)
        console.error("formatDate: Unexpected error processing date string:", dateString, e);
        return dateString; // Fallback to original string on any error
    }
};
const getEventDisplay = (eventName) => {
    switch (eventName?.toLowerCase()) {
        case 'created': return {value:'created', icon: faPlusCircle, color: 'success', label: 'Créé' };
        case 'updated': return {value:'updated', icon: faEdit, color: 'primary', label: 'Modifié' };
        case 'deleted': return { value:'deleted',icon: faTrashAlt, color: 'danger', label: 'Supprimé' };
        default: return { icon: faQuestionCircle, color: 'secondary', label: eventName || 'N/A' };
    }
};


// Date Range Filter Function (for Tanstack Table client-side filtering)
const dateBetweenFilterFn = (row, columnId, filterValue) => {
  const date = new Date(row.getValue(columnId));
  if (isNaN(date.getTime())) { return false; }
  const [start, end] = filterValue || [null, null];
  const adjustedEndDate = end ? new Date(end.getTime() + 24 * 60 * 60 * 1000 - 1) : null;
  if (start && adjustedEndDate) { return date >= start && date <= adjustedEndDate; }
  else if (start) { return date >= start; }
  else if (adjustedEndDate) { return date <= adjustedEndDate; }
  return true;
};
// --- End Helpers ---


// --- Main Page Component ---
const ActivityLogPage = () => {

    // --- State ---
    const [eventOptions, setEventOptions] = useState([]);
    const [loadingEventOptions, setLoadingEventOptions] = useState(true);
    const [userOptions, setUserOptions] = useState([]);
    const [loadingUserOptions, setLoadingUserOptions] = useState(true);
    // Local state for filter UI controls (needed for controlled inputs)
    const [selectedUserOption, setSelectedUserOption] = useState(null);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    // ---

    // --- Fetch Select Options ---
    useEffect(() => {
        let isMounted = true;
        const fetchOptions = async () => {
            setLoadingEventOptions(true);
            setLoadingUserOptions(true);
            try {
                const [eventRes, userRes] = await Promise.all([
                    axios.get(`${BASE_API_URL}/activity-log/event-types`),
                    axios.get(`${BASE_API_URL}/users/options`, { withCredentials: true }) // Add credentials if needed
                ]);
                if (isMounted) {
                    setEventOptions(eventRes.data || []);
                    setUserOptions(userRes.data || []);
                }
            } catch (error) {
                if (isMounted) {
                    console.error("Error fetching filter options:", error);
                    setEventOptions([]); setUserOptions([]); // Set empty on error
                }
            } finally {
                if (isMounted) {
                    setLoadingEventOptions(false);
                    setLoadingUserOptions(false);
                }
            }
        };
        fetchOptions();
        return () => { isMounted = false; };
    }, []);
    // ---


    // --- Column Definitions ---
    const activityColumns = useMemo(() => [
        {
            accessorKey: 'created_at',
            header: 'Date & Heure',
            size: 200,
            cell: info => formatDate(info.getValue()),
            enableColumnFilter: true, // Enable filtering
            filterFn: dateBetweenFilterFn, // Assign date filter function
            meta: { align: 'left', enableSorting: true, enableGlobalFilter: false },
        },
        {
            accessorKey: 'causer.nom_complet',
            header: 'Utilisateur',
            id: 'causer',
            size: 200,
            cell: info => {
                const causer = info.row.original.causer;
                const name = info.getValue();
                return causer ? ( <span title={causer.email || `ID: ${causer.id}`}><FontAwesomeIcon icon={faUser} className="me-2 text-muted small" />{name || `Utilisateur ID: ${causer.id}`}</span> )
                              : ( <span className='text-info fst-italic'><FontAwesomeIcon icon={faServer} className="me-2 text-info small" />Système</span> );
            },
            enableColumnFilter: true, // Enable filtering
            filterFn: (row, columnId, filterValue) => { // Client-side filter by ID
                if (filterValue === null || filterValue === undefined) return true;
                if (filterValue === 'system') return !row.original.causer;
                return row.original.causer?.id == filterValue;
            },
            meta: { align: 'left', enableSorting: false, enableGlobalFilter: true },
        },
         {
            accessorKey: 'event',
            header: 'Événement',
            size: 180,
            enableColumnFilter: true, // Enable filtering
            filterFn: 'equalsString', // Use built-in filter function
            cell: info => {
                const eventVal = info.getValue();
                const eventInfo = getEventDisplay(eventVal);
                return eventVal ? (<Badge bg={eventInfo.color || 'secondary'} text="white" className="px-2 py-1 shadow-sm w-100"><FontAwesomeIcon icon={eventInfo.icon} className="me-1 fa-fw" /> {eventInfo.label}</Badge> ) : '-';
            },
            meta: { align: 'center', enableSorting: true, enableGlobalFilter: true },
        },
        {
            accessorKey: 'description',
            header: 'Description Action',
            size: 300,
            cell: info => <div className="text-truncate" style={{ maxWidth: '280px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
            enableColumnFilter: false,
            meta: { align: 'left', enableSorting: true, enableGlobalFilter: true },
        },
        {
            accessorKey: 'subject_type',
            header: 'Sujet',
            size: 200,
            cell: info => {
                 const type = info.getValue()?.split('\\').pop() || 'N/A';
                 const id = info.row.original.subject_id;
                 return id ? `${type} (ID: ${id})` : type;
            },
            enableColumnFilter: false,
            meta: { align: 'left', enableSorting: false, enableGlobalFilter: true },
        },
    ], []); // Empty dependency array is fine here
    // ---


    // --- Filter Rendering Function (Used by DynamicTable's renderFilters prop) ---
    const renderActivityFilters = useCallback((table) => {
        if (!table) { return <div className="text-center p-3"><Spinner animation="border" size="sm" /> Chargement...</div>; }

        const eventColumn = table.getColumn('event');
        const userColumn = table.getColumn('causer');
        const dateColumn = table.getColumn('created_at');

        const currentEventFilter = eventColumn?.getFilterValue();
        const currentUserIdFilter = userColumn?.getFilterValue();
        const currentDateRangeFilter = dateColumn?.getFilterValue() || [null, null];
        const [currentStartDate, currentEndDate] = currentDateRangeFilter; // Use current from table state for comparison

        // Handlers update local state for UI AND table state for filtering
        const handleEventChange = (selectedOption) => {
            eventColumn?.setFilterValue(selectedOption?.value ?? undefined);
        };
        const handleUserChange = (selectedOption) => {
            setSelectedUserOption(selectedOption); // Update local state for Select display
            userColumn?.setFilterValue(selectedOption?.value ?? undefined);
        };
        const handleDateChange = (dates) => {
            const [start, end] = dates || [null, null];
            setStartDate(start); // Update local state for DatePicker display
            setEndDate(end);
            dateColumn?.setFilterValue((start || end) ? [start, end] : undefined);
        };
        const handleResetSpecificFilters = () => {
             eventColumn?.setFilterValue(undefined);
             userColumn?.setFilterValue(undefined);
             dateColumn?.setFilterValue(undefined);
             setSelectedUserOption(null); // Reset local state
             setStartDate(null);
             setEndDate(null);
        };

        // Check if any filters are active using table state
        const isAnyFilterActive = currentEventFilter !== undefined ||
                                  currentUserIdFilter !== undefined ||
                                  (currentDateRangeFilter && (currentDateRangeFilter[0] || currentDateRangeFilter[1]));

        return (
            <Form>
                 <h6 className='mb-3'><FontAwesomeIcon icon={faFilter} className="me-2 text-primary"/>Filtres Spécifiques</h6>
                 {/* Event Type Filter */}
                 <Form.Group controlId="filterEventType" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold"><FontAwesomeIcon icon={faTags} className="me-2"/>Par Événement</Form.Label>
                    <Select inputId="filterEventTypeSelect" options={eventOptions}
                       value={eventOptions.find(option => option.value === currentEventFilter) || null} // Read value from table state
                       onChange={handleEventChange}
                       placeholder={loadingEventOptions ? "Chargement..." : "Tous..."} isClearable isLoading={loadingEventOptions} isDisabled={loadingEventOptions}
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body} aria-label="Filtrer par type d'événement" classNamePrefix="react-select-sm"/>
                 </Form.Group>
                 {/* User Filter */}
                  <Form.Group controlId="filterUser" className="mb-3">
                     <Form.Label className="small mb-1 fw-bold"><FontAwesomeIcon icon={faUser} className="me-2"/>Par Utilisateur</Form.Label>
                     <Select inputId="filterUserSelect" options={userOptions}
                         value={selectedUserOption} // Use local state for control
                         onChange={handleUserChange}
                         placeholder={loadingUserOptions ? "Chargement..." : "Tous..."} isClearable isLoading={loadingUserOptions} isDisabled={loadingUserOptions}
                         styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body} aria-label="Filtrer par utilisateur" classNamePrefix="react-select-sm"/>
                  </Form.Group>
                 {/* Date Range Filter */}
                  <Form.Group controlId="filterDateRange" className="mb-3">
                     <Form.Label className="small mb-1 fw-bold"><FontAwesomeIcon icon={faCalendarAlt} className="me-2"/>Par Date</Form.Label>
                      <ReactDatePicker
                         selectsRange={true}
                         startDate={startDate} // Use local state for control
                         endDate={endDate} // Use local state for control
                         onChange={handleDateChange}
                         isClearable={true}
                         dateFormat="dd/MM/yyyy" locale="fr" placeholderText="Sélectionner une plage..."
                         className="form-control form-control-sm w-100"
                         wrapperClassName="d-block" // Ensure picker takes full width
                      />
                 </Form.Group>
                 {/* Reset Button */}
                 <Button variant="outline-secondary" size="sm" onClick={handleResetSpecificFilters} disabled={!isAnyFilterActive} className="w-100 mt-3">
                   <FontAwesomeIcon icon={faTimes} className="me-2"/> Réinitialiser Filtres
                 </Button>
            </Form>
        );
    }, [ // Dependencies for useCallback
        eventOptions, loadingEventOptions,
        userOptions, loadingUserOptions,
        selectedUserOption, setSelectedUserOption, // Include setters for controlled components
        startDate, setStartDate,
        endDate, setEndDate
    ]);
    // ---

console.log(userOptions)
    // --- DynamicTable Configuration ---
    const defaultVisibleCols = useMemo(() => [
        'created_at',
        'subject_type', 'causer', 'event',
        'actions'
    ], []);

    return (
        // Use simple padding div
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
          

            {/* DynamicTable Component */}
            <DynamicTable
                fetchUrl="/activity-log"
                dataKey="data"
                baseApiUrl={BASE_API_URL}

                columns={activityColumns} // Pass columns with filter functions
                itemName="Entrée d'Historique"
                itemNamePlural="Entrées d'Historique"
                identifierKey="id"

                itemsPerPage={10}
                defaultSortBy={{ id: 'created_at', desc: true }}
                defaultVisibleColumns={defaultVisibleCols}
                renderFilters={renderActivityFilters} // Pass the updated filter form generator
                enableGlobalSearch={true}
                enableColumnFilters={true} // Keep TRUE to enable filter logic

                ViewComponent={ActivityLogVisualisation}
                canAdd={false}

                actionColumnWidth={60}
                tableClassName="table-striped table-hover table-sm"

                // Pass the custom filter function type to DynamicTable
                customFilterFunctions={{ dateBetweenFilterFn }}
            />
        </div>
    );
};

export default ActivityLogPage;