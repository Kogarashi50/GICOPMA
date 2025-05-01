// src/gestion_conventions/appel_offres_views/AppelOffrePage.jsx

import React, { useMemo, useCallback,useState } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
// Ensure these point to the updated Form/Visualisation components for JSON provinces
import AppelOffreForm from './AppelOffreForm';
import AppelOffreVisualisation from './AppelOffreVisualisation';

// --- UI & Utilities ---
import Select from 'react-select';
import { Badge, Form, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faBuilding, faToggleOn, faToggleOff, faMapMarkedAlt } from '@fortawesome/free-solid-svg-icons'; // Added faMapMarkedAlt
import { useSearchParams } from 'react-router-dom';

// --- Constants & Helpers ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Reusable formatters
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const datePart = dateString.split(' ')[0];
         if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) { return dateString; }
         return new Date(datePart).toLocaleDateString('fr-CA');
    } catch (e) { console.error("Date format error:", dateString, e); return dateString; }
};

const formatCurrency = (value) => {
    if (value == null || value === '' || isNaN(Number(value))) return '-';
    try {
        return parseFloat(value).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 });
    } catch (e) { console.error("Currency format error:", value, e); return String(value); }
};

// ENUM Options for Filters
const CATEGORIE_OPTIONS = [
    { value: 'Travaux', label: 'Travaux' },
    { value: 'Etudes', label: 'Etudes' },
    { value: 'Services', label: 'Services' },
    { value: 'Fournitures', label: 'Fournitures' }
];

const PORTAIL_FILTER_OPTIONS = [
    { value: 'true', label: 'Oui' },
    { value: 'false', label: 'Non' }
];

// Static province options for filtering (if needed)
const PROVINCE_FILTER_OPTIONS = [
    { value: 'Berkane', label: 'Berkane' },
    { value: 'Driouch', label: 'Driouch' },
    { value: 'Figuig', label: 'Figuig' },
    { value: 'Guercif', label: 'Guercif' },
    { value: 'Jerada', label: 'Jerada' },
    { value: 'Nador', label: 'Nador' },
    { value: 'Oujda-Angad', label: 'Oujda-Angad' },
    { value: 'Taourirt', label: 'Taourirt' }
];

// --- End Helpers ---

// --- Main Page Component ---
const AppelOffrePage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [provinceFilter, setProvinceFilter] = useState(null); // Keep state
    const action = searchParams.get('action');
    const isCreating = action === 'create';

    // --- Column Definitions for the DynamicTable ---
    const appelOffreColumns = useMemo(() => [
        { accessorKey: 'numero', header: 'N° AO', size: 130, meta: { align: 'left', enableGlobalFilter: true } },
        {
            accessorKey: 'intitule', header: 'Intitulé', size: 400,
            meta: { align: 'left', enableGlobalFilter: true },
            cell: info => <div className="text-truncate" style={{ maxWidth: '400px' }} title={info.getValue()}>{info.getValue()}</div>,
        },
        {
            accessorKey: 'categorie', header: 'Catégorie', size: 100, filterFn: 'equalsString',
            meta: { align: 'center', enableGlobalFilter: true },
        },
        {
            // --- UPDATED Province Column for JSON Array ---
            id: 'provincesList', // Unique column ID
            header: 'Province(s)',
            size: 180, // Adjust size if needed
            accessorKey: 'provinces', // Access the array directly
            cell: info => {
                const provincesArray = info.getValue(); // Gets the array ['Prov1', 'Prov2', ...] or null/[]
                if (!provincesArray || provincesArray.length === 0) {
                    return '-';
                }
                // Display as badges or comma-separated list
                return (
                    <div className="d-flex flex-wrap gap-1" style={{ maxWidth: '180px' }}>
                        {provincesArray.map((prov, index) => (
                            <Badge key={index} pill bg="light" text="dark" className="text-truncate" title={prov}>
                               {prov}
                            </Badge>
                        ))}
                    </div>
                );
                // Alternative: Comma separated string
                // return <div className="text-truncate" style={{ maxWidth: '180px' }} title={provincesArray.join(', ')}>{provincesArray.join(', ')}</div>;
            },
            // Note: Filtering directly on a JSON array might be complex/inefficient depending on DynamicTable capabilities.
            // It might be better to filter this server-side if needed.
            meta: { align: 'left', enableGlobalFilter: true }, // Enable global search (might search the stringified JSON)
            // --- END UPDATED Province Column ---
        },
        {
            accessorKey: 'estimation_HT', header: 'Estimation HT', size: 150,
            cell: info => formatCurrency(info.getValue()),
            meta: { align: 'right', enableGlobalFilter: false }
        },
        {
            accessorKey: 'date_ouverture', header: 'Date Ouverture', size: 140,
            cell: info => formatDate(info.getValue()),
            meta: { align: 'center', enableGlobalFilter: false }
        },
        {
            accessorKey: 'lancement_portail', header: 'Portail', size: 80, filterFn: 'equalsString',
            cell: info => {
                const isOnPortail = info.getValue();
                return isOnPortail === true ?
                    <Badge bg="success" text="white" className="w-100"><FontAwesomeIcon icon={faToggleOn} /> Oui</Badge> :
                    <Badge bg="secondary" text="white" className="w-100"><FontAwesomeIcon icon={faToggleOff} /> Non</Badge>;
            },
            meta: { align: 'center', enableGlobalFilter: true },
        },
    ], []); // Dependency array is empty
    const dynamicFetchUrl = useMemo(() => {
        let url = '/appel-offres'; // Base URL segment
        if (provinceFilter) {
            // Append the province filter as a query parameter
            url += `?province=${encodeURIComponent(provinceFilter)}`;
        }
        return url;
    }, [provinceFilter]);
    // --- Filter Rendering Function ---
    // Added Province Filter (Single Select for filtering, not multi)
    const renderAppelOffreFilters = useCallback((table) => {
        if (!table) return null;
        const categorieColumn = table.getColumn('categorie');
        const portailColumn = table.getColumn('lancement_portail');
        // Add province filter column if you want to filter by ONE province at a time
        const provinceColumn = table.getColumn('provincesList'); // Use the column ID
        const isAnyColumnFiltered = table.getState().columnFilters.length > 0;
        const handleProvinceChange = (selectedOption) => {
            setProvinceFilter(selectedOption?.value ?? null); // Update state
        };
        const selectedProvinceFilterOption = PROVINCE_FILTER_OPTIONS.find(option => provinceFilter === option.value) || null;
        const currentPortailFilterValue = portailColumn?.getFilterValue();
        const selectedPortailOption = PORTAIL_FILTER_OPTIONS.find(option => option.value === String(currentPortailFilterValue)) || null;

        // Get current province filter value (will be a string or undefined)
        const currentProvinceFilterValue = provinceColumn?.getFilterValue();
        console.log("Current Province Filter Value:", provinceColumn);


        return (
            <Form>
                {/* Catégorie Filter */}
                <Form.Group controlId="filterCategorieAO" className="mb-3">
                   <Form.Label className="small mb-1 fw-bold">Catégorie</Form.Label>
                   <Select
                       inputId="filterCategorieAOSelect"
                       options={CATEGORIE_OPTIONS}
                       value={CATEGORIE_OPTIONS.find(option => option.value === categorieColumn?.getFilterValue()) || null}
                       onChange={option => categorieColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder="Toutes Catégories..." isClearable
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
                       aria-label="Filtrer par catégorie"
                   />
                </Form.Group>

                {/* Province Filter (Single Select) */}
                <Form.Group controlId="filterProvinceAO" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Contient Province</Form.Label>
                    <Select
                        inputId="filterProvinceAOSelect"
                        options={PROVINCE_FILTER_OPTIONS}
                        value={selectedProvinceFilterOption}
                        onChange={handleProvinceChange}
                        placeholder="Toutes Provinces..." isClearable
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} 
                        menuPortalTarget={document.body}
                        aria-label="Filtrer par province"
                    />
                </Form.Group>

                {/* Lancement Portail Filter */}
                <Form.Group controlId="filterPortail" className="mb-3">
                    <Form.Label className="small mb-1 fw-bold">Lancé sur Portail</Form.Label>
                   <Select
                       inputId="filterPortailSelect"
                       options={PORTAIL_FILTER_OPTIONS}
                       value={selectedPortailOption}
                       onChange={option => portailColumn?.setFilterValue(option?.value ?? undefined)}
                       placeholder="Oui / Non / Tous..." isClearable
                       styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }} menuPortalTarget={document.body}
                       aria-label="Filtrer par lancement sur portail"
                   />
                </Form.Group>

                {/* Reset Button */}
                <Button variant="outline-secondary" size="sm" onClick={() => {
                     
                    table.resetColumnFilters()
                    setProvinceFilter(null);}} disabled={!provinceFilter && !isAnyColumnFiltered} className="w-100 mt-3">
                   <FontAwesomeIcon icon={faTimes} className="me-2"/> Réinitialiser Filtres Spécifiques
                </Button>
            </Form>
        );
    }, [provinceFilter]);


    // --- DynamicTable Configuration ---
    const defaultVisibleCols = useMemo(() => [
        'numero',
        'intitule',
        'categorie',
        'provincesList', // Show the list of provinces
        'estimation_HT',
        'date_ouverture',
        'lancement_portail',
        'actions',
    ], []);

    const handleFormClose = () => {
        setSearchParams({});
    };

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
              {isCreating ? (
                  <AppelOffreForm
                       onClose={handleFormClose}
                       onItemCreated={handleFormClose}
                       baseApiUrl={BASE_API_URL}
                   />
              ) : (
                  <DynamicTable
                      fetchUrl={dynamicFetchUrl}
                      // Use the key the controller returns for the list
                      dataKey="appel_offres" // Ensure this matches controller response
                      deleteUrlBase="/appel-offres"
                      baseApiUrl={BASE_API_URL}
                      columns={appelOffreColumns} // Use updated column definitions
                      itemName="Appel d'Offre"
                      itemNamePlural="Appels d'Offre"
                      identifierKey="id"
                      displayKeyForDelete="numero"
                      itemsPerPage={10}
                      defaultVisibleColumns={defaultVisibleCols}
                      renderFilters={renderAppelOffreFilters}
                      enableGlobalSearch={true}
                      CreateComponent={AppelOffreForm}
                      ViewComponent={AppelOffreVisualisation}
                      EditComponent={AppelOffreForm}
                      actionColumnWidth={90}
                      tableClassName="table-striped table-hover"
                  />
              )}
        </div>
    );
};

export default AppelOffrePage;