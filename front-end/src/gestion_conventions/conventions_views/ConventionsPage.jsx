// src/pages/ConventionsPage.jsx (Complete - With Projet Column)

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path if needed
import ConventionForm from './ConventionForm';         // Uses the updated form
import ConventionVisualisation from './visualisationConventions'; // Uses the updated view

// Import UI components and icons
import Select from 'react-select';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Stack from 'react-bootstrap/Stack';
import InputGroup from 'react-bootstrap/InputGroup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faTimes, faFilePdf, faFileWord, faFileImage, faFileExcel,
    faFileAlt, faExternalLinkAlt, faFolderOpen,faUsers // Added folder icon
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

// --- Helpers ---

// Status Options and Color Helper
const STATUT_OPTIONS = [
    { value: "non approuvé",         label: "Non Approuvé",         color: "danger"   },
    { value: "en cours d'approbation", label: "En Cours d'Approbation", color: "warning"  },
    { value: "approuvé",             label: "Approuvé",             color: "success"  },
    { value: "non visé",             label: "Non Visé",             color: "danger"   },
    { value: "en cours de visa",     label: "En Cours de Visa",     color: "warning"  },
    { value: "visé",                 label: "Visé",                 color: "info"     },
    { value: "non signé",            label: "Non Signé",            color: "secondary"},
    { value: "en cours de signature",  label: "En Cours de Signature",  color: "warning"  },
    { value: "signé",                label: "Signé",                color: "primary"  }
];
const getStatusColor = (statusValue) => {
    const option = STATUT_OPTIONS.find(opt => opt.value === statusValue);
    return option ? option.color : "light"; // Default color
};

// File Icon Helper
const getFileIcon = (filenameOrMimeType) => {
    if (!filenameOrMimeType) return faFileAlt;
    const lowerCase = String(filenameOrMimeType).toLowerCase();
    if (lowerCase.includes('pdf')) return faFilePdf;
    if (lowerCase.includes('doc')) return faFileWord; // Covers docx too
    if (lowerCase.includes('xls')) return faFileExcel; // Covers xlsx too
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].some(ext => lowerCase.endsWith(ext)) || lowerCase.startsWith('image/')) return faFileImage;
    return faFileAlt; // Default icon
};


// Select Options Helper (for filters derived from data)
const createSelectOptions = (data, key, labelKey = null) => {
    if (!data || !Array.isArray(data)) return [];
    const uniqueMap = new Map();
    data.forEach(item => {
        const value = item[key];
        if (value !== null && value !== undefined && value !== '') {
            uniqueMap.set(value, item); // Store the item to potentially get a label
        }
    });
    const uniqueValues = Array.from(uniqueMap.keys());

    // Sort numerically if possible, otherwise alphabetically
    uniqueValues.sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB; // Numerical sort
        // Locale-sensitive string sort
        return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
    });

    // Create options array {value, label}
    return uniqueValues.map(val => ({
        value: val,
        // Use labelKey if provided and exists on the stored item, otherwise use the value itself
        label: labelKey ? (uniqueMap.get(val)?.[labelKey] ?? val) : val
    }));
};

// Custom Filter Function for Cost Range
const costRangeFilterFn = (row, columnId, filterValue) => {
    if (typeof filterValue !== 'object' || filterValue === null) return true; // No filter applied

    const rawValue = row.getValue(columnId);
    // Clean potential currency symbols/spaces before parsing
    const cost = parseFloat(String(rawValue).replace(/[^0-9.-]/g, ''));

    if (isNaN(cost)) return false; // Row value isn't a valid number

    // Get min/max from filter, parse to numbers, handle undefined/empty strings
    const minStr = filterValue.min;
    const maxStr = filterValue.max;
    const minNum = (minStr !== '' && minStr != null && !isNaN(parseFloat(minStr))) ? parseFloat(minStr) : undefined;
    const maxNum = (maxStr !== '' && maxStr != null && !isNaN(parseFloat(maxStr))) ? parseFloat(maxStr) : undefined;

    const isMinOk = minNum === undefined || cost >= minNum;
    const isMaxOk = maxNum === undefined || cost <= maxNum;

    return isMinOk && isMaxOk;
};
// --- End Helpers ---


// --- Component Definition ---
const ConventionsPage = () => {
    // Define Base URLs
    const BASE_API_URL = 'http://localhost:8000/api';
    const [searchParams, setSearchParams] = useSearchParams();
    const action = searchParams.get('action');
    const isCreating = action === 'create';
    // const STORAGE_BASE_URL = 'http://localhost:8000/api'; // Base for accessing stored files (public path)

    // --- State for Select Options & Partner Lookup ---
    const [allPartenairesOptions, setAllPartenairesOptions] = useState([]); // For partner name lookup in table column
    const [anneeOptions, setAnneeOptions] = useState([]); // For Annee filter dropdown
    const [statutOptions] = useState(STATUT_OPTIONS); // Predefined status options for filter
    const [maitreOuvrageOptions, setMaitreOuvrageOptions] = useState([]); // For Maitre Ouvrage filter dropdown
    const [optionsLoading, setOptionsLoading] = useState(true); // Loading state for filter options

    // --- Fetch Options for Selects & Partner Lookup ---
    useEffect(() => {
        const fetchFilterOptions = async () => {
            console.log("Fetching options for filters and lookups...");
            setOptionsLoading(true);
            try {
                // Fetch partners first - needed for the partner column cell renderer lookup
                const partRes = await axios.get(`${BASE_API_URL}/partenaires`, { withCredentials: true });
                const partData = partRes.data.partenaires || partRes.data || [];
                const mappedPartnerOptions = partData.map(p => ({ value: p.Id, label: p.Description }));
                setAllPartenairesOptions(mappedPartnerOptions);
                console.log("Partner Options for Lookup Set:", mappedPartnerOptions.length);

                // Fetch conventions data JUST to derive options for other filters (Année, Maitre Ouvrage)
                // Consider a dedicated endpoint if convention list becomes very large
                const convRes = await axios.get(`${BASE_API_URL}/conventions`, { withCredentials: true });
                const conventions = convRes.data?.conventions || [];
                console.log("Conventions data received for filter derivation:", conventions.length);

                // Create select options from the fetched conventions data
                setAnneeOptions(createSelectOptions(conventions, 'Annee_Convention'));
                setMaitreOuvrageOptions(createSelectOptions(conventions, 'Maitre_Ouvrage'));
                // Statut options are predefined

            } catch (error) {
                console.error("Error fetching data for filter options:", error);
                // TODO: Handle error state appropriately (e.g., show an error message)
            } finally {
                setOptionsLoading(false);
                console.log("Finished fetching options for filters.");
            }
        };
        fetchFilterOptions();
    }, [BASE_API_URL]); // Re-fetch if base URL changes


    // --- Column Definition ---
    const conventionColumns = useMemo(() => [
        { accessorKey: 'Code', header: 'Code',  meta: { enableGlobalFilter: true }
    , size: 80, minSize: 60, maxSize: 150  },
        // Display Documents Count/Icon
        {
            id: 'documents',
            header: 'Docs',
            accessorFn: row => row.documents, // Access the documents array
            cell: info => {
                const documents = info.getValue() || [];
                if (!Array.isArray(documents) || documents.length === 0) {
                    return <div className="text-center"><span className="text-muted small">-</span></div>;
                }
                const count = documents.length;
                const fileNamesTooltip = documents.map(doc => doc.file_name || 'Fichier sans nom').join('\n');
                return (
                    <div className="text-center" title={fileNamesTooltip}>
                         <FontAwesomeIcon icon={faFolderOpen} className="text-secondary me-1" />
                         <Badge bg="secondary" text="white" pill>{count}</Badge>
                    </div>
                );
            },
            enableSorting: false,
            meta: { enableGlobalFilter: false }
        },
        {
            accessorKey: 'Intitule',
            header: 'Intitulé',
            cell: info => <div className="text-truncate" title={info.getValue()}>{info.getValue() || '-'}</div>,
            meta: { enableGlobalFilter: true },
             size: 250, minSize: 150, maxSize: 300  
        },
        {
            id: 'programme',
            header: 'Programme',
            accessorFn: row => row.programme?.Description, // Safely access nested property
            cell: info => <div className="text-truncate"  title={info.getValue()}>{info.getValue() || '-'}</div>,
            meta: { enableGlobalFilter: true },
            size: 250, minSize: 150, maxSize: 300  


        },
        // --- Projet Column ---
        {
            id: 'projet',
            header: 'Projet',
            accessorFn: row => row.projet, // Access the nested projet object
            cell: info => {
                const projet = info.getValue(); // Get the projet object or null/undefined
                // Construct display text (Code - Name), handle missing parts gracefully
                const displayText = projet
                    ? `${projet.Code_Projet || ''} - ${projet.Nom_Projet || 'N/A'}`.replace(/^ - | - $/, '').trim() // Combine, remove leading/trailing separators
                    : '-'; // Fallback if no projet linked
                return <div className="text-truncate" title={displayText}>{displayText}</div>;
            },
            meta: { enableGlobalFilter: true },
            size: 250, minSize: 150, maxSize: 300  

            // Allow searching by project name/code
        },
        // --- End Projet Column ---
        {
            accessorKey: 'Statut',
            header: 'Statut',
            cell: info => {
                const status = info.getValue();
                const color = getStatusColor(status);
                return status ? (<Badge bg={color} text={color === 'warning' || color === 'light' ? 'dark' : 'white'} className=" w-100 text-truncate">{status}</Badge>) : '-';
            },
            meta: { enableGlobalFilter: true },
            size: 135, minSize: 100, maxSize: 170  ,
            filterFn: 'equalsString' // Use table's built-in filter
        },
        {
            id: 'partenaires', // Display partners based on the string ID list
            header:<FontAwesomeIcon icon={faUsers} title="Partenaires Affectés" />,
            accessorFn: row => row.Partenaire, // Access the semicolon-separated string of IDs
            cell: info => {
                const idString = info.getValue();
                // Use the partner options fetched earlier for name lookup
                if (!idString || typeof idString !== 'string' || !allPartenairesOptions || allPartenairesOptions.length === 0) {
                    return <span className="text-muted small">-</span>;
                }
                const partnerIDs = idString.split(';').map(id => id.trim()).filter(Boolean);
                if (partnerIDs.length === 0) return <span className="text-muted small">-</span>;
                const partnerNames = partnerIDs.map(id => {
                    const option = allPartenairesOptions.find(opt => String(opt.value) === String(id));
                    return option ? option.label : `ID ${id}`; // Fallback to ID if not found
                }).filter(Boolean);

              

                // Display names as badges (limit visible count)
                return (
                    <Stack direction="horizontal" gap={1} style={{ flexWrap: 'wrap', maxWidth: '30px' }}>
                        
                            <Badge bg="dark" text="light" className="border me-1 mb-1" pill >
                                {partnerIDs.length}
                            </Badge>
                    </Stack>
                );
            },
            enableSorting: false, // Sorting by list is complex
            meta: { enableGlobalFilter: false }
            , size: 40, minSize: 30, maxSize: 50  // Searching ID string might not be useful
        },
        {
            accessorKey: 'Maitre_Ouvrage',
            header: 'Maitre Ouvrage',
            cell: info => <div className="text-truncate" style={{ maxWidth: '180px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
            meta: { enableGlobalFilter: true },
            filterFn: 'equalsString'
        },
        {
            accessorKey: 'Annee_Convention',
            header: 'Année',
            cell: info => info.getValue() || '-',
            meta: { enableGlobalFilter: true },
            filterFn: 'equalsString'
            , size: 60, minSize: 50, maxSize: 70  // Searching ID string might not be useful

        },
        {
            accessorKey: 'Cout_Global',
            size: 150, minSize: 120, maxSize: 180  ,

            header: 'Coût Global',
            cell: info => info.getValue() ? parseFloat(info.getValue()).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 }) : '0',
            meta: { enableGlobalFilter: false }, // Use range filter instead
            filterFn: 'costRange' // Use custom range filter function
        },
        {
            accessorKey: 'Cout_CR',
            header: 'Coût CR',
            cell: info => info.getValue() ? parseFloat(info.getValue()).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 }) : '0',
            meta: { enableGlobalFilter: false },
            filterFn: 'costRange'
        },
    // Add other columns definitions if needed
    ], [allPartenairesOptions]); // Dependency: partner options for cell renderer


    // --- Local Filter State ---
    const [filterAnnee, setFilterAnnee] = useState(null);
    const [filterStatut, setFilterStatut] = useState(null);
    const [filterMaitreOuvrage, setFilterMaitreOuvrage] = useState(null);
    const [filterCoutGlobalMin, setFilterCoutGlobalMin] = useState('');
    const [filterCoutGlobalMax, setFilterCoutGlobalMax] = useState('');
    const [filterCoutCRMin, setFilterCoutCRMin] = useState('');
    const [filterCoutCRMax, setFilterCoutCRMax] = useState('');

    // --- Filter Rendering Function ---
    const renderConventionFilters = useCallback((table) => {
        // Get column filter states and setters from the table instance
        const anneeColumn = table.getColumn('Annee_Convention');
        const statutColumn = table.getColumn('Statut');
        const maitreOuvrageColumn = table.getColumn('Maitre_Ouvrage');
        const coutGlobalColumn = table.getColumn('Cout_Global');
        const coutCRColumn = table.getColumn('Cout_CR');

        // Helper for select filter changes
        const handleSelectChange = (setter, column, selectedOption) => {
            setter(selectedOption);
            column?.setFilterValue(selectedOption?.value ?? undefined);
        };
        // Helper for range filter input changes
        const handleRangeChange = (setter, value) => { setter(value); };
        // Update table filter value when range inputs lose focus (or on button click)
        const applyCostFilters = () => {
            coutGlobalColumn?.setFilterValue({ min: filterCoutGlobalMin, max: filterCoutGlobalMax });
            coutCRColumn?.setFilterValue({ min: filterCoutCRMin, max: filterCoutCRMax });
        };
        // Reset all filters
        const resetFilters = () => {
            setFilterAnnee(null); setFilterStatut(null); setFilterMaitreOuvrage(null);
            setFilterCoutGlobalMin(''); setFilterCoutGlobalMax('');
            setFilterCoutCRMin(''); setFilterCoutCRMax('');
            table.resetColumnFilters();
        };

        const selectStyles = { control: base => ({ ...base, minHeight: '31px', fontSize: '0.875rem' }) };

        return (
            <Form className="p-3 border bg-light rounded mb-3">
                <Row className="g-3 align-items-end">
                    {/* Année */}
                    <Col xs={12}>
                        <Form.Group controlId="filterAnnee"><Form.Label size="sm" className="mb-1">Année</Form.Label>
                            <Select options={anneeOptions} value={filterAnnee} onChange={(opt) => handleSelectChange(setFilterAnnee, anneeColumn, opt)} placeholder="Toutes" isClearable isSearchable={false} size="sm" styles={selectStyles} isLoading={optionsLoading}/>
                        </Form.Group>
                    </Col>
                    {/* Statut */}
                    <Col xs={12}>
                        <Form.Group controlId="filterStatut"><Form.Label size="sm" className="mb-1">Statut</Form.Label>
                            <Select options={statutOptions} value={filterStatut} onChange={(opt) => handleSelectChange(setFilterStatut, statutColumn, opt)} placeholder="Tous" isClearable isSearchable={false} size="sm" styles={selectStyles}/>
                        </Form.Group>
                    </Col>
                    {/* Maitre Ouvrage */}
                    <Col xs={12}>
                         <Form.Group controlId="filterMaitreOuvrage"><Form.Label size="sm" className="mb-1">Maitre Ouvrage</Form.Label>
                            <Select options={maitreOuvrageOptions} value={filterMaitreOuvrage} onChange={(opt) => handleSelectChange(setFilterMaitreOuvrage, maitreOuvrageColumn, opt)} placeholder="Tous" isClearable isSearchable size="sm" styles={selectStyles} isLoading={optionsLoading}/>
                        </Form.Group>
                    </Col>
                    {/* Coût Global */}
                     <Col xs={12}>
                         <Form.Group controlId="filterCoutGlobal"><Form.Label size="sm" className="mb-1">Coût Global (Min-Max)</Form.Label>
                             <InputGroup size="sm">
                                 <Form.Control type="number" placeholder="Min" value={filterCoutGlobalMin} onChange={(e) => handleRangeChange(setFilterCoutGlobalMin, e.target.value)} onBlur={applyCostFilters} />
                                 <Form.Control type="number" placeholder="Max" value={filterCoutGlobalMax} onChange={(e) => handleRangeChange(setFilterCoutGlobalMax, e.target.value)} onBlur={applyCostFilters} />
                             </InputGroup>
                         </Form.Group>
                     </Col>
                    {/* Coût CR */}
                    <Col xs={12}>
                        <Form.Group controlId="filterCoutCR"><Form.Label size="sm" className="mb-1">Coût CR (Min-Max)</Form.Label>
                            <InputGroup size="sm">
                                <Form.Control type="number" placeholder="Min" value={filterCoutCRMin} onChange={(e) => handleRangeChange(setFilterCoutCRMin, e.target.value)} onBlur={applyCostFilters} />
                                <Form.Control type="number" placeholder="Max" value={filterCoutCRMax} onChange={(e) => handleRangeChange(setFilterCoutCRMax, e.target.value)} onBlur={applyCostFilters} />
                            </InputGroup>
                        </Form.Group>
                    </Col>
                    {/* Reset */}
                    <Col xs={12} className="d-flex justify-content-end">
                        <Button variant="outline-secondary" size="sm" onClick={resetFilters} title="Réinitialiser les filtres">
                             <FontAwesomeIcon icon={faTimes} />
                        </Button>
                    </Col>
                </Row>
            </Form>
        );
    }, [
        filterAnnee, filterStatut, filterMaitreOuvrage,
        filterCoutGlobalMin, filterCoutGlobalMax, filterCoutCRMin, filterCoutCRMax,
        anneeOptions, statutOptions, maitreOuvrageOptions, optionsLoading // Dependencies
    ]);

    // --- DynamicTable Configuration ---
    const defaultCols = useMemo(() => [
        'Code', 'Intitule', 'projet', 'Statut', // <-- Added 'projet'
        'Annee_Convention', 'Cout_Global', 
        'actions',
        'partenaires'
    ], []);
    const availableCols = useMemo(() => [ // All possible column keys from data + relationships
        'Code', 'documents', 'Intitule', 'Reference', 'Annee_Convention', 'Objet', 'Objectifs',
        'localisation', // Raw data key (string of IDs)
        'Maitre_Ouvrage', 'partenaires', // Use 'partenaires' for display column ID
        'Cout_Global', 'Cout_CR', 'Statut', 'Operationalisation',
        'programme', // Use 'programme' for display column ID
        'projet', // <-- Added 'projet' for display column ID
        'Groupe', 'Rang',
        'created_at', 'updated_at'
    ], []);
    const searchExclusions = useMemo(() => [ // Columns to exclude from global text search
        'created_at', 'updated_at', 'id', 'Id_Programme', 'id_projet', // <-- Added 'id_projet' (the FK)
        'Groupe', 'Rang', 'documents', 'Cout_Global', 'Cout_CR',
        'partenaires', // Exclude partner list display from global search
        'localisation', // Exclude location string display from global search
    ], []);
    const customFilters = useMemo(() => ({ costRange: costRangeFilterFn }), []);
    const handleFormClose = (refreshNeeded = false) => { setSearchParams({}); /* Optional refresh logic */ };


    // --- Render DynamicTable ---
    return (
        // Container with scrolling for the whole page content
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(100vh - 56px)', padding: '1rem', overflowY: 'hidden' }}>
            {isCreating ? (
                <ConventionForm mode="create" onClose={() => handleFormClose(false)} onSuccess={() => handleFormClose(true)} baseApiUrl={BASE_API_URL} />
            ) : (  <DynamicTable
                // --- Core Props ---
                fetchUrl="/conventions"       // API endpoint to fetch data
                dataKey="conventions"        // Key in the JSON response containing the data array
                deleteUrlBase="/conventions" // Base URL for DELETE requests (e.g., /conventions/{id})
                columns={conventionColumns}  // Defined column configurations
                itemName="Convention"        // Singular name for messages
                itemNamePlural="Conventions" // Plural name for messages

                // --- Options ---
                identifierKey="id"           // Primary key column name in the data (convention.id)
                displayKeyForDelete="Code"   // Key to display in delete confirmation (e.g., "Code 123")
                defaultVisibleColumns={defaultCols} // Initial columns shown
                availableColumnKeys={availableCols} // All columns user can choose to show/hide
                globalSearchExclusions={searchExclusions} // Columns excluded from global search
                itemsPerPage={10}            // Default items per page
                customFilterFunctions={customFilters} // Register custom filter logic { 'filterName': filterFunction }
                baseApiUrl={BASE_API_URL}    // Pass API base URL down

                // --- Components ---
                CreateComponent={ConventionForm}        // Component for creating items
                ViewComponent={ConventionVisualisation} // Component for viewing item details
                EditComponent={ConventionForm}          // Component for editing items
                renderFilters={renderConventionFilters} // Function returning filter JSX

                // --- Actions & Styling ---
                actionColumnWidth={100}         // Width of the actions column (Edit/Delete/View)
                enableManualFiltering={true}    // Use local filter state and pass filter values to table
                enableManualSorting={false}     // Let backend handle sorting (usually)
                enableColumnResizing={true}     // Allow users to resize columns
                enableColumnOrdering={true}     // Allow users to reorder columns
                tableClassName="table-striped table-hover table-sm" // Bootstrap table classes
            />)}
        </div>
    );
};

export default ConventionsPage;