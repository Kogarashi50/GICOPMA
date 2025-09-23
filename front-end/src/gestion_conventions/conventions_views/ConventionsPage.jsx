// src/pages/ConventionsPage.jsx (Full Copy-Paste Version)

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import DynamicTable from '../components/DynamicTable';
import ConventionForm from './ConventionForm';
import ConventionVisualisation from './visualisationConventions';

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
    faTimes, faFolderOpen, faUsers
} from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

// --- Helpers ---

const STATUT_OPTIONS = [
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
    return option ? option.color : "light";
};

const createSelectOptions = (data, key) => {
    if (!data || !Array.isArray(data)) return [];
    const uniqueValues = [...new Set(data.map(item => item[key]).filter(Boolean))];
    uniqueValues.sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
    return uniqueValues.map(val => ({ value: val, label: val }));
};

const costRangeFilterFn = (row, columnId, filterValue) => {
    if (typeof filterValue !== 'object' || filterValue === null) return true;
    const cost = parseFloat(String(row.getValue(columnId)).replace(/[^0-9.-]/g, ''));
    if (isNaN(cost)) return false;
    const minNum = (filterValue.min != null && filterValue.min !== '' && !isNaN(parseFloat(filterValue.min))) ? parseFloat(filterValue.min) : undefined;
    const maxNum = (filterValue.max != null && filterValue.max !== '' && !isNaN(parseFloat(filterValue.max))) ? parseFloat(filterValue.max) : undefined;
    const isMinOk = minNum === undefined || cost >= minNum;
    const isMaxOk = maxNum === undefined || cost <= maxNum;
    return isMinOk && isMaxOk;
};
// --- End Helpers ---


// --- Component Definition ---
const ConventionsPage = () => {
    const BASE_API_URL = 'http://localhost:8000/api';
    const [searchParams, setSearchParams] = useSearchParams();
    const isCreating = searchParams.get('action') === 'create';

    // --- State for Select Options & Lookups ---
    const [allPartenairesOptions, setAllPartenairesOptions] = useState([]);
    const [anneeOptions, setAnneeOptions] = useState([]);
    const [statutOptions] = useState(STATUT_OPTIONS);
    const [maitreOuvrageOptions, setMaitreOuvrageOptions] = useState([]);
    const [optionsLoading, setOptionsLoading] = useState(true);

    // --- Fetch Options for Selects & Lookups ---
    useEffect(() => {
        const fetchFilterOptions = async () => {
            setOptionsLoading(true);
            try {
                const [partRes, convRes] = await Promise.all([
                    axios.get(`${BASE_API_URL}/partenaires`, { withCredentials: true }),
                    axios.get(`${BASE_API_URL}/conventions`, { withCredentials: true })
                ]);
                
                const partData = partRes.data.partenaires || partRes.data || [];
                setAllPartenairesOptions(partData.map(p => ({ value: p.Id, label: p.Description })));

                const conventions = convRes.data?.conventions || [];
                setAnneeOptions(createSelectOptions(conventions, 'Annee_Convention'));
                setMaitreOuvrageOptions(createSelectOptions(conventions, 'Maitre_Ouvrage'));
            } catch (error) {
                console.error("Error fetching data for filter options:", error);
            } finally {
                setOptionsLoading(false);
            }
        };
        fetchFilterOptions();
    }, [BASE_API_URL]);


    // --- Column Definition ---
    const conventionColumns = useMemo(() => [
        {
            accessorKey: 'Code',
            header: 'Code',
            meta: { enableGlobalFilter: true },
            size: 80, minSize: 60, maxSize: 150
        },
        {
            id: 'documents',
            header: 'Docs',
            accessorFn: row => row.documents,
            cell: info => {
                const documents = info.getValue() || [];
                if (!Array.isArray(documents) || documents.length === 0) {
                    return <div className="text-center"><span className="text-muted small">-</span></div>;
                }
                const count = documents.length;
                return (
                    <div className="text-center" title={`${count} document(s)`}>
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
            accessorKey: 'type',
            header: 'Type',
            cell: info => {
                const type = info.getValue();
                if (!type) return '-';
                const color = type === 'cadre' ? 'info' : 'primary';
                return <Badge bg={color} className="w-100 text-capitalize">{type}</Badge>;
            },
            meta: { enableGlobalFilter: true },
            size: 110,
            filterFn: 'equalsString'
        },
        {
            id: 'rattachement',
            header: 'Rattachement',
            accessorFn: row => row,
            cell: info => {
                const row = info.getValue();
                if (row.type === 'cadre') {
                    const programmeName = row.programme?.Description;
                    return <div className="text-truncate" title={programmeName}>{row.programme.Code_Programme +' - '+programmeName || '-'}</div>;
                }
                if (row.type === 'specifique') {
                    const projet = row.projet;
                    const displayText = projet ? `${projet.Code_Projet || ''} - ${projet.Nom_Projet || 'N/A'}`.replace(/^ - | - $/, '').trim() : '-';
                    return <div className="text-truncate" title={displayText}>{displayText}</div>;
                }
                return '-';
            },
            meta: { enableGlobalFilter: true },
            size: 250, minSize: 150, maxSize: 300
        },
        {
            accessorKey: 'Statut',
            header: 'Statut',
            cell: info => {
                const status = info.getValue();
                const color = getStatusColor(status);
                return status ? (<Badge bg={color} text={color === 'warning' || color === 'light' ? 'dark' : 'white'} className=" w-100 text-truncate">{status}</Badge>) : '-';
            },
            meta: { enableGlobalFilter: true },
            size: 135, minSize: 100, maxSize: 170,
            filterFn: 'equalsString'
        },
        {
            id: 'partenaires',
            header: <FontAwesomeIcon icon={faUsers} title="Partenaires Affectés" />,
            accessorFn: row => row.Partenaire,
            cell: info => {
                const idString = info.getValue();
                if (!idString || typeof idString !== 'string') {
                    return <span className="text-muted small">-</span>;
                }
                const partnerIDs = idString.split(';').map(id => id.trim()).filter(Boolean);
                if (partnerIDs.length === 0) return <span className="text-muted small">-</span>;
                return (
                    <div className="text-center">
                        <Badge bg="dark" text="light" className="border" pill>
                            {partnerIDs.length}
                        </Badge>
                    </div>
                );
            },
            enableSorting: false,
            meta: { enableGlobalFilter: false },
            size: 40, minSize: 30, maxSize: 50
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
            filterFn: 'equalsString',
            size: 60, minSize: 50, maxSize: 70
        },
        {
            accessorKey: 'Cout_Global',
            size: 150, minSize: 120, maxSize: 180,
            header: 'Coût Global',
            cell: info => info.getValue() ? parseFloat(info.getValue()).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 }) : '0',
            meta: { enableGlobalFilter: false },
            filterFn: 'costRange'
        },
    ], [allPartenairesOptions]);

    // --- State for Filters ---
    const [filterAnnee, setFilterAnnee] = useState(null);
    const [filterStatut, setFilterStatut] = useState(null);
    const [filterType, setFilterType] = useState(null);
    const [filterMaitreOuvrage, setFilterMaitreOuvrage] = useState(null);
    const [filterCoutGlobalMin, setFilterCoutGlobalMin] = useState('');
    const [filterCoutGlobalMax, setFilterCoutGlobalMax] = useState('');

    // --- Filter Rendering Function ---
    const renderConventionFilters = useCallback((table) => {
        const anneeColumn = table.getColumn('Annee_Convention');
        const statutColumn = table.getColumn('Statut');
        const typeColumn = table.getColumn('type');
        const maitreOuvrageColumn = table.getColumn('Maitre_Ouvrage');
        const coutGlobalColumn = table.getColumn('Cout_Global');

        const handleSelectChange = (setter, column, selectedOption) => {
            setter(selectedOption);
            column?.setFilterValue(selectedOption?.value ?? undefined);
        };
        
        const applyCostFilters = () => {
            coutGlobalColumn?.setFilterValue({ min: filterCoutGlobalMin, max: filterCoutGlobalMax });
        };

        const resetFilters = () => {
            setFilterAnnee(null);
            setFilterStatut(null);
            setFilterType(null);
            setFilterMaitreOuvrage(null);
            setFilterCoutGlobalMin('');
            setFilterCoutGlobalMax('');
            table.resetColumnFilters();
        };

        const typeOptions = [
            { value: 'cadre', label: 'Cadre' },
            { value: 'specifique', label: 'Spécifique' }
        ];

        const selectStyles = { control: base => ({ ...base, minHeight: '31px', fontSize: '0.875rem' }) };

        return (
            <Form className="p-3 border bg-light rounded mb-3">
                <Row className="g-3 align-items-end">
                    <Col xs={12}>
                        <Form.Group controlId="filterType">
                            <Form.Label size="sm" className="mb-1">Type</Form.Label>
                            <Select options={typeOptions} value={filterType} onChange={(opt) => handleSelectChange(setFilterType, typeColumn, opt)} placeholder="Tous" isClearable isSearchable={false} styles={selectStyles}/>
                        </Form.Group>
                    </Col>
                    <Col xs={12}>
                        <Form.Group controlId="filterAnnee">
                            <Form.Label size="sm" className="mb-1">Année</Form.Label>
                            <Select options={anneeOptions} value={filterAnnee} onChange={(opt) => handleSelectChange(setFilterAnnee, anneeColumn, opt)} placeholder="Toutes" isClearable isSearchable={false} styles={selectStyles} isLoading={optionsLoading}/>
                        </Form.Group>
                    </Col>
                    <Col xs={12}>
                        <Form.Group controlId="filterStatut">
                            <Form.Label size="sm" className="mb-1">Statut</Form.Label>
                            <Select options={statutOptions} value={filterStatut} onChange={(opt) => handleSelectChange(setFilterStatut, statutColumn, opt)} placeholder="Tous" isClearable isSearchable={false} styles={selectStyles}/>
                        </Form.Group>
                    </Col>
                    <Col xs={12}>
                         <Form.Group controlId="filterMaitreOuvrage">
                            <Form.Label size="sm" className="mb-1">Maitre Ouvrage</Form.Label>
                            <Select options={maitreOuvrageOptions} value={filterMaitreOuvrage} onChange={(opt) => handleSelectChange(setFilterMaitreOuvrage, maitreOuvrageColumn, opt)} placeholder="Tous" isClearable isSearchable styles={selectStyles} isLoading={optionsLoading}/>
                        </Form.Group>
                    </Col>
                     <Col xs={12}>
                         <Form.Group controlId="filterCoutGlobal">
                            <Form.Label size="sm" className="mb-1">Coût Global (Min-Max)</Form.Label>
                             <InputGroup size="sm">
                                 <Form.Control type="number" placeholder="Min" value={filterCoutGlobalMin} onChange={(e) => setFilterCoutGlobalMin(e.target.value)} onBlur={applyCostFilters} />
                                 <Form.Control type="number" placeholder="Max" value={filterCoutGlobalMax} onChange={(e) => setFilterCoutGlobalMax(e.target.value)} onBlur={applyCostFilters} />
                             </InputGroup>
                         </Form.Group>
                     </Col>
                    <Col xs={12} className="d-flex justify-content-end">
                        <Button variant="outline-secondary" size="sm" onClick={resetFilters} title="Réinitialiser les filtres">
                             <FontAwesomeIcon icon={faTimes} />
                        </Button>
                    </Col>
                </Row>
            </Form>
        );
    }, [
        filterAnnee, filterStatut, filterType, filterMaitreOuvrage,
        filterCoutGlobalMin, filterCoutGlobalMax,
        anneeOptions, statutOptions, maitreOuvrageOptions, optionsLoading
    ]);

    // --- DynamicTable Configuration ---
    const defaultCols = useMemo(() => [
        'Code', 'Intitule', 'type', 'rattachement', 'Statut',
        'Annee_Convention', 'Cout_Global',
        'actions', 'partenaires'
    ], []);
    const availableCols = useMemo(() => [
        'Code', 'documents', 'Intitule', 'type', 'rattachement', 'Reference',
        'Annee_Convention', 'Objet', 'Objectifs', 'localisation', 'Maitre_Ouvrage',
        'partenaires', 'Cout_Global', 'Statut', 'Operationalisation',
        // 'Groupe', 'Rang', 
        'created_at', 'updated_at'
    ], []);
    const searchExclusions = useMemo(() => [
        'created_at', 'updated_at', 'id', 'Id_Programme', 'id_projet',
        // 'Groupe', 'Rang', 
        'documents', 'Cout_Global',
        'partenaires', 'localisation',
    ], []);
    const customFilters = useMemo(() => ({ costRange: costRangeFilterFn }), []);
    const handleFormClose = () => { setSearchParams({}); };

    // --- Render DynamicTable ---
    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            {isCreating ? (
                <ConventionForm onClose={handleFormClose} baseApiUrl={BASE_API_URL} />
            ) : (
                <DynamicTable
                    fetchUrl="/conventions"
                    dataKey="conventions"
                    deleteUrlBase="/conventions"
                    columns={conventionColumns}
                    itemName="Convention"
                    itemNamePlural="Conventions"
                    identifierKey="id"
                    displayKeyForDelete="Code"
                    defaultVisibleColumns={defaultCols}
                    availableColumnKeys={availableCols}
                    globalSearchExclusions={searchExclusions}
                    itemsPerPage={10}
                    customFilterFunctions={customFilters}
                    baseApiUrl={BASE_API_URL}
                    CreateComponent={ConventionForm}
                    ViewComponent={ConventionVisualisation}
                    EditComponent={ConventionForm}
                    renderFilters={renderConventionFilters}
                    actionColumnWidth={100}
                    enableManualFiltering={true}
                    enableColumnResizing={true}
                    enableColumnOrdering={true}
                    tableClassName="table-striped table-hover table-sm"
                />
            )}
        </div>
    );
};

export default ConventionsPage;