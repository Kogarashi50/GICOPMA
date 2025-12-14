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
import './conventions.css';

// --- Helpers ---

const STATUT_OPTIONS = [
    { value: "approuv├®",             label: "Approuv├®",             color: "success"  },
    { value: "non vis├®",             label: "Non Vis├®",             color: "danger"   },
    { value: "en cours de visa",     label: "En Cours de Visa",     color: "warning"  },
    { value: "vis├®",                 label: "Vis├®",                 color: "info"     },
    { value: "non sign├®",            label: "Non Sign├®",            color: "secondary"},
    { value: "en cours de signature",  label: "En Cours de Signature",  color: "warning"  },
    { value: "sign├®",                label: "Sign├®",                color: "primary"  }
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

// --- Custom Filter Functions ---

const exactMatchFilterFn = (row, columnId, filterValue) => {
    const rowValue = row.getValue(columnId);

    // If filter value is empty, show all rows
    if (filterValue === null || filterValue === undefined) {
        return true;
    }

    // Explicitly convert both to strings for a safe, type-agnostic comparison
    return String(rowValue) === String(filterValue);
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

const engagementTypeFilterFn = (row, columnId, filterValue) => {
    if (filterValue === null || filterValue === undefined) return true;
    const commitments = row.original.partner_commitments || [];
    return commitments.some(commitment => {
        const typeMatches = [
            commitment.engagement_type_id === filterValue,
            commitment.engagement_type?.id === filterValue,
            String(commitment.engagement_type_id) === String(filterValue)
        ];
        return typeMatches.some(match => match === true);
    });
};

const maitreOuvrageDelegueFilterFn = (row, columnId, filterValue) => {
    if (filterValue === null || filterValue === undefined || filterValue === '') return true;
    const delegues = row.original.maitres_ouvrage_delegues || [];
    const fv = (typeof filterValue === 'object' && filterValue !== null)
        ? (filterValue.value ?? filterValue.id ?? filterValue)
        : filterValue;
    const fvs = String(fv).trim().toLowerCase();
    if (!fvs) return true;
    return delegues.some(d => {
        const id = d?.id ?? d?.Id ?? d?.value;
        const nom = (d?.nom ?? d?.Nom ?? d?.label ?? '').toString().trim();
        if (id !== undefined && String(id).toLowerCase() === fvs) return true;
        if (nom && nom.toLowerCase() === fvs) return true;
        return false;
    });
};

const locationFilterFn = (row, columnId, filterValue) => {
    if (filterValue === null || filterValue === undefined) {
        return true;
    }
    const locations = row.getValue(columnId) || []; 
    const filterId = String(filterValue);
    return locations.some(loc => String(loc?.value) === filterId);
};

// --- Component Definition ---
const ConventionsPage = () => {
    const BASE_API_URL = 'http://localhost:8000/api';
    const [searchParams, setSearchParams] = useSearchParams();
    const isCreating = searchParams.get('action') === 'create';
 const action = searchParams.get('action');
    const itemId = searchParams.get('id');

    // This function will be used by the child components to return to the table view
    const handleClose = () => {
        setSearchParams({}); // Clears all URL parameters
    };
    const [optionsLoading, setOptionsLoading] = useState(true);
    const [options, setOptions] = useState({
        partenaires: [],
        annees: [],
        maitresOuvrage: [],
        maitresOuvrageDelegues: [],
        secteurs: [],
        provinces: [],
        statuts: STATUT_OPTIONS,
        engagementTypes: [],
        sous_types: [],
    });

    const [filters, setFilters] = useState({
        annee: null,
        statut: null,
        type: null,
        maitreOuvrage: null,
        maitreOuvrageDelegue: null,
        secteur: null,
        sous_type: null, // <-- ADD THIS

        province: null,
        engagementType: null,
        coutGlobalMin: '',
        coutGlobalMax: ''
    });

    useEffect(() => {
        const fetchFilterOptions = async () => {
            setOptionsLoading(true);
            try {
                const [partRes, convRes, moRes, modRes, sectRes, provRes, engTypeRes] = await Promise.all([
                    axios.get(`${BASE_API_URL}/partenaires`, { withCredentials: true }),
                    axios.get(`${BASE_API_URL}/conventions`, { withCredentials: true }),
                    axios.get(`${BASE_API_URL}/options/maitre-ouvrage`, { withCredentials: true }),
                    axios.get(`${BASE_API_URL}/options/maitres-ouvrage-delegues`, { withCredentials: true }),
                    axios.get(`${BASE_API_URL}/options/secteurs`, { withCredentials: true }),
                    axios.get(`${BASE_API_URL}/options/provinces`, { withCredentials: true }),
                    axios.get(`${BASE_API_URL}/options/engagement-types`, { withCredentials: true })
                ]);
                const conventionsData = convRes.data?.conventions || [];

                setOptions(prev => ({
                    ...prev,
                    partenaires: (partRes.data.partenaires || []).map(p => ({ value: p.Id, label: p.Description })),
                    annees: createSelectOptions(convRes.data?.conventions || [], 'Annee_Convention'),
                    secteurs: (Array.isArray(sectRes.data) ? sectRes.data : []).map(s => ({
                        value: s.description_fr,
                        label: s.description_fr,
                    })),
                    sous_types: createSelectOptions(conventionsData, 'sous_type'), // Populate here

                    maitresOuvrage:(Array.isArray(moRes.data) ? moRes.data : []).map((m, idx) => {
                        const rawId = m.id ?? m.Id ?? m.value;
                        const label = m.nom ?? m.Nom ?? m.label ?? String(rawId ?? `${idx}`);
                        const value = rawId !== undefined && rawId !== null ? rawId : label;
                        return { value, label };
                    }),
                    maitresOuvrageDelegues: (Array.isArray(modRes.data) ? modRes.data : []).map((m, idx) => {
                        const rawId = m.id ?? m.Id ?? m.value;
                        const label = m.nom ?? m.Nom ?? m.label ?? String(rawId ?? `delegue_${idx}`);
                        const value = rawId !== undefined && rawId !== null ? rawId : label;
                        return { value, label };
                    }),
                    provinces: Array.isArray(provRes.data) ? provRes.data : [],
                    engagementTypes: Array.isArray(engTypeRes.data) ? engTypeRes.data : []
                }));
            } catch (error) {
                console.error("Error fetching filter options:", error);
            } finally {
                setOptionsLoading(false);
            }
        };
        fetchFilterOptions();
    }, [BASE_API_URL]);

    const handleFilterChange = useCallback((filterName, selectedOption, column) => {
        setFilters(prev => ({ ...prev, [filterName]: selectedOption }));

        if (column) {
            const filterValue = selectedOption?.value ?? undefined;
            column.setFilterValue(filterValue);
        }
    }, []);

    const resetFilters = useCallback((table) => {
        setFilters({
            annee: null,
            statut: null,
            type: null,
            sous_type: null, // <-- ADD THIS

            maitreOuvrage: null,
            maitreOuvrageDelegue: null,
            secteur: null,
            province: null,
            engagementType: null,
            coutGlobalMin: '',
            coutGlobalMax: ''
        });
        table.resetColumnFilters();
    }, []);

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
            header: 'Intitul├®',
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
        let color = 'primary'; // Default
        if (type === 'cadre') color = 'info';
        if (type === 'convention') color = 'secondary'; // New
        if (type === 'maitrise d\'ouvrage delegue') color = 'dark'; // New
        
        return <Badge bg={color} className="w-100 text-capitalize">{type}</Badge>;
    }},
    {
            accessorKey: 'sous_type',
            header: 'Sous-type',
            cell: info => info.getValue() || '-',
            meta: { enableGlobalFilter: true },
            size: 180,
            filterFn: 'equalsString'
        },
        {
            id: 'rattachement',
            header: 'Rattachement',
            accessorFn: row => row,
            cell: info => {
                const row = info.getValue();
                if (row.type === 'cadre') {
                    const code = row.programme?.Code_Programme;
                    const programmeName = row.programme?.Description;
                    const displayText = (code || programmeName)
                        ? `${code ?? ''}${code && programmeName ? ' - ' : ''}${programmeName ?? ''}`.trim()
                        : '-';
                    return <div className="text-truncate" title={displayText}>{displayText}</div>;
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
            header: <FontAwesomeIcon icon={faUsers} title="Partenaires Affect├®s" />,
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
            id: 'Maitre_Ouvrage',
            header: 'M. Ouvrage',
            accessorFn: row => row.Maitre_Ouvrage,
            cell: info => {
                const maitreOuvrageId = info.getValue();
                if (maitreOuvrageId === null || maitreOuvrageId === undefined) return '-';
                
                const maitreOuvrage = options.maitresOuvrage.find(mo => mo && String(mo.value) === String(maitreOuvrageId));
                
                const label = maitreOuvrage?.label ?? `ID: ${maitreOuvrageId}`;
                return <div className="text-truncate" style={{ maxWidth: '100px' }} title={label}>{label}</div>;
            },
            meta: { enableGlobalFilter: true },
            filterFn: 'exactMatch'
        },
        {
            id: 'secteur',
            header: 'Secteur',
            accessorFn: row => row.secteur?.description_fr,
            cell: info => <div className="text-truncate" title={info.getValue()}>{info.getValue() || '-'}</div>,
            meta: { enableGlobalFilter: true },
            filterFn: 'equalsString',
            size: 150
        },
        {
            id: 'provinces',
            header: 'Province(s)',
            accessorFn: row => {
                const locData = row.localisation;
                if (!locData) return [];
                let provinceIds = [];
                const trimmedData = String(locData).trim();
                if (trimmedData.startsWith('[') && trimmedData.endsWith(']')) {
                    try {
                        const parsed = JSON.parse(trimmedData);
                        if (Array.isArray(parsed)) provinceIds = parsed;
                    } catch (e) {
                        console.error(`Failed to parse JSON-like localisation data: "${trimmedData}"`, e);
                        return [];
                    }
                } else {
                    provinceIds = trimmedData
                        .split(';')
                        .map(id => parseInt(id.trim(), 10))
                        .filter(id => !isNaN(id));
                }
                if (!Array.isArray(provinceIds) || provinceIds.length === 0) return [];
                return provinceIds
                    .map(id => options.provinces.find(p => p.value === id))
                    .filter(Boolean);
            },
            cell: info => {
                const provinces = info.getValue() || [];
                if (provinces.length === 0) return '-';
                return (
                    <Stack direction="horizontal" gap={1} className="flex-wrap">
                        {provinces.map(p => (
                            <Badge key={p.value} bg="secondary" className="text-truncate">
                                {p.label || p.Description || p.nom}
                            </Badge>
                        ))}
                    </Stack>
                );
            },
            filterFn: 'location',
            size: 200
        }, 
        {
            accessorKey: 'Annee_Convention',
            header: 'Ann├®e',
            cell: info => info.getValue() || '-',
            meta: { enableGlobalFilter: true },
            filterFn: 'equalsString',
            size: 60, minSize: 50, maxSize: 70
        },
        {
            accessorKey: 'Cout_Global',
            size: 150, minSize: 120, maxSize: 180,
            header: 'Co├╗t Global',
            cell: info => info.getValue() ? parseFloat(info.getValue()).toLocaleString('fr-MA', { style: 'currency', currency: 'MAD', minimumFractionDigits: 0 }) : '0',
            meta: { enableGlobalFilter: false },
            filterFn: 'costRange'
        },
        {
            id: 'engagement_types',
            header: 'Types Engagement',
            accessorFn: row => row.partner_commitments,
            cell: info => {
                const commitments = info.getValue() || [];
                const types = [...new Set(commitments.map(c => c.engagement_type_label))];
                return (
                    <Stack direction="horizontal" gap={1}>
                        {types.map(type => (
                            <Badge 
                                key={type} 
                                bg={type === 'Financier' ? 'success' : 
                                    type === 'Assistance Technique' ? 'info' : 
                                    type === 'Mise ├á disposition du foncier' ? 'warning' : 'secondary'}
                                className="text-truncate"
                                style={{ maxWidth: '100px' }}
                            >
                                {type}
                            </Badge>
                        ))}
                    </Stack>
                );
            },
            filterFn: 'engagementType',
            size: 200
        },
        {
            id: 'maitres_ouvrage_delegues',
            header: 'M.O. D├®l├®gu├®s',
            accessorFn: row => row.maitres_ouvrage_delegues,
            cell: info => {
                const delegues = info.getValue() || [];
                return (
                    <Stack direction="horizontal" gap={1}>
                        {delegues.map((d, idx) => (
                            <Badge key={idx} bg="info" className="text-truncate">
                                {d.nom}
                            </Badge>
                        ))}
                    </Stack>
                );
            },
            filterFn: 'maitreOuvrageDelegue',
            size: 200
        },
        { id: 'files_title', header: 'Titre Fichier (filtre)', size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'fileTitleIncludes' },
        { id: 'files_type', header: 'Type Fichier (filtre)', size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'fileTypeIncludes' },
        { id: 'files_search', header: 'Recherche Fichiers', size: 0, accessorFn: row => {
            const files = Array.isArray(row.documents) ? row.documents : [];
            if (files.length === 0) return '';
            return files.map(f => [f.Intitule, f.file_name, f.file_type].filter(Boolean).join(' ')).join(' | ');
        }, meta: { enableGlobalFilter: true }, enableHiding: true },
        { id: 'has_files', header: 'A des fichiers', size: 0, accessorFn: row => row, meta: { enableGlobalFilter: false }, enableHiding: true, filterFn: 'hasFiles' },
    ], [options.provinces, options.maitresOuvrage]);

    const renderConventionFilters = useCallback((table) => {
        const columns = {
            annee: table.getColumn('Annee_Convention'),
            statut: table.getColumn('Statut'),
            type: table.getColumn('type'),
            sous_type: table.getColumn('sous_type'), // <-- Add accessor

            maitreOuvrage: table.getColumn('Maitre_Ouvrage'),
            secteur: table.getColumn('secteur'),
            province: table.getColumn('provinces'),
            coutGlobal: table.getColumn('Cout_Global'),
            filesTitle: table.getColumn('files_title'),
            filesType: table.getColumn('files_type'),
            hasFiles: table.getColumn('has_files'),
            engagementType: table.getColumn('engagement_types'),
            maitreOuvrageDelegue: table.getColumn('maitres_ouvrage_delegues')
        };
        
        const selectStyles = { 
            control: base => ({ ...base, minHeight: '31px', fontSize: '0.875rem' }) 
        };

        return (
            <Form className="convention-filters border bg-light rounded mb-3">
                <div className="filters-content">
                    <Row className="g-3">
                        <Col xs={12}>
                            <Form.Group controlId="filterType">
                                <Form.Label size="sm" className="mb-1">Type</Form.Label>
                                <Select 
                                    options={[{ value: 'cadre', label: 'Cadre' }, { value: 'specifique', label: 'Sp├®cifique' }
                                           ,{ value: 'convention', label: 'Convention' }, // <-- ADD
                                        { value: 'maitrise d\'ouvrage delegue', label: 'M.O. D├®l├®gu├®e' } // <-- ADD
                                    ]}
                                    value={filters.type}
                                    onChange={(opt) => handleFilterChange('type', opt, columns.type)}
                                    placeholder="Tous" isClearable styles={selectStyles}
                                />
                            </Form.Group>
                        </Col>
                        <Col xs={12}>
                            <Form.Group controlId="filterSousType">
                                <Form.Label size="sm" className="mb-1">Sous-type</Form.Label>
                                <Select 
                                    options={options.sous_types}
                                    value={filters.sous_type}
                                    onChange={(opt) => handleFilterChange('sous_type', opt, columns.sous_type)}
                                    placeholder="Tous" isClearable styles={selectStyles}
                                    isLoading={optionsLoading}
                                />
                            </Form.Group>
                        </Col>
                        <Col xs={12}>
                            <Form.Group controlId="filterAnnee">
                                <Form.Label size="sm" className="mb-1">Ann├®e</Form.Label>
                                <Select options={options.annees} value={filters.annee} onChange={(opt) => handleFilterChange('annee', opt, columns.annee)} placeholder="Toutes" isClearable isSearchable={false} styles={selectStyles} isLoading={optionsLoading}/>
                            </Form.Group>
                        </Col>
                        <Col xs={12}>
                            <Form.Group controlId="filterStatut">
                                <Form.Label size="sm" className="mb-1">Statut</Form.Label>
                                <Select options={options.statuts} value={filters.statut} onChange={(opt) => handleFilterChange('statut', opt, columns.statut)} placeholder="Tous" isClearable isSearchable={false} styles={selectStyles}/>
                            </Form.Group>
                        </Col>
                         <Col xs={12}>
                             <Form.Group controlId="filterMaitreOuvrage">
                                <Form.Label size="sm" className="mb-1">Maitre Ouvrage</Form.Label>
                                <Select options={options.maitresOuvrage} value={filters.maitreOuvrage} onChange={(opt) => handleFilterChange('maitreOuvrage', opt, columns.maitreOuvrage)} placeholder="Tous" isClearable isSearchable styles={selectStyles} isLoading={optionsLoading}/>
                            </Form.Group>
                         </Col>
                         <Col xs={12}>
                             <Form.Group controlId="filterSecteur">
                                <Form.Label size="sm" className="mb-1">Secteur</Form.Label>
                                <Select 
                                    options={options.secteurs}
                                    value={filters.secteur}
                                    onChange={(opt) => handleFilterChange('secteur', opt, columns.secteur)}
                                    placeholder="Tous" isClearable isSearchable styles={selectStyles} isLoading={optionsLoading}
                                />
                            </Form.Group>
                         </Col>
                         <Col xs={12}>
                             <Form.Group controlId="filterProvince">
                                <Form.Label size="sm" className="mb-1">Localisation</Form.Label>
                                <Select 
                                    options={options.provinces}
                                    value={filters.province}
                                    onChange={(opt) => handleFilterChange('province', opt, columns.province)}
                                    placeholder="Toutes" isClearable isSearchable styles={selectStyles} isLoading={optionsLoading}
                                />
                            </Form.Group>
                         </Col>
                         <Col xs={12}>
                             <Form.Group controlId="filterMaitreOuvrageDelegue">
                                <Form.Label size="sm" className="mb-1">Ma├«tre d'Ouvrage D├®l├®gu├®</Form.Label>
                                <Select 
                                    options={options.maitresOuvrageDelegues}
                                    value={filters.maitreOuvrageDelegue}
                                    onChange={(opt) => handleFilterChange('maitreOuvrageDelegue', opt, columns.maitreOuvrageDelegue)}
                                    placeholder="Tous" isClearable isSearchable styles={selectStyles} isLoading={optionsLoading}
                                />
                            </Form.Group>
                         </Col>
                         <Col xs={12}>
                             <Form.Group controlId="filterCoutGlobal">
                                <Form.Label size="sm" className="mb-1">Co├╗t Global (Min-Max)</Form.Label>
                                <InputGroup size="sm">
                                    <Form.Control 
                                        type="number" placeholder="Min" value={filters.coutGlobalMin} 
                                        onChange={(e) => setFilters(prev => ({ ...prev, coutGlobalMin: e.target.value }))} 
                                        onBlur={() => columns.coutGlobal?.setFilterValue({ min: filters.coutGlobalMin, max: filters.coutGlobalMax })} 
                                    />
                                    <Form.Control 
                                        type="number" placeholder="Max" value={filters.coutGlobalMax} 
                                        onChange={(e) => setFilters(prev => ({ ...prev, coutGlobalMax: e.target.value }))} 
                                        onBlur={() => columns.coutGlobal?.setFilterValue({ min: filters.coutGlobalMin, max: filters.coutGlobalMax })} 
                                    />
                                </InputGroup>
                            </Form.Group>
                         </Col>
                        <Col xs={12}>
                            <Form.Group controlId="filterEngagementType">
                                <Form.Label size="sm" className="mb-1">Type d'Engagement</Form.Label>
                                <Select 
                                    options={options.engagementTypes}
                                    value={filters.engagementType}
                                    onChange={(opt) => handleFilterChange('engagementType', opt, columns.engagementType)}
                                    placeholder="Tous les types" isClearable styles={selectStyles} isLoading={optionsLoading}
                                />
                            </Form.Group>
                        </Col>
                        <Col xs={12} className="d-flex justify-content-end">
                            <Button variant="outline-secondary" size="sm" onClick={() => resetFilters(table)} title="R├®initialiser les filtres">
                                 <FontAwesomeIcon icon={faTimes} />
                            </Button>
                        </Col>
                    </Row>
                </div>
            </Form>
        );
    }, [filters, options, handleFilterChange, resetFilters, optionsLoading]);
    
    const defaultCols = useMemo(() => [
        'Code', 'Intitule', 'type', 'rattachement', 'Statut',
        'Annee_Convention', 'Maitre_Ouvrage', 
        'actions',
    ], []);
    
    const availableCols = useMemo(() => [
        'Code', 'documents', 'Intitule', 'type', 'rattachement', 'Reference', 'secteur',
        'provinces',
        'Annee_Convention', 'Objet', 'Objectifs', 'localisation', 'Maitre_Ouvrage',
        'partenaires', 'Cout_Global', 'Statut', 'Operationalisation',
        'created_at', 'updated_at'
    ], []);

    const searchExclusions = useMemo(() => [
        'created_at', 'updated_at', 'id', 'Id_Programme', 'id_projet',
        'documents', 'Cout_Global', 'partenaires', 'localisation',
        'provinces',
    ], []);

    const customFilters = useMemo(() => ({
        exactMatch: exactMatchFilterFn,
        costRange: costRangeFilterFn,
        engagementType: engagementTypeFilterFn,
        maitreOuvrageDelegue: maitreOuvrageDelegueFilterFn,
        location: locationFilterFn,
        fileTitleIncludes: (row, _columnId, filterValue) => {
            const query = String(filterValue || '').trim().toLowerCase();
            if (!query) return true;
            const files = Array.isArray(row?.original?.documents) ? row.original.documents : [];
            if (files.length === 0) return false;
            return files.some(f => {
                const title = ((f.Intitule || f.file_name || '') + '').toLowerCase();
                return title.includes(query);
            });
        },
        fileTypeIncludes: (row, _columnId, filterValue) => {
            const query = String(filterValue || '').trim().toLowerCase();
            if (!query) return true;
            const files = Array.isArray(row?.original?.documents) ? row.original.documents : [];
            if (files.length === 0) return false;
            return files.some(f => {
                const type = (f.file_type || '').toLowerCase();
                return type.includes(query);
            });
        },
        hasFiles: (row) => {
            const files = Array.isArray(row?.original?.documents) ? row.original.documents : [];
            return files.length > 0;
        }
    }), []);
     if (action === 'view' && itemId) {
        return (
            <ConventionVisualisation
                itemId={itemId}
                onClose={handleClose}
                baseApiUrl={BASE_API_URL}
            />
        );
    }

    return (
        <div className="conventions-page">
            {isCreating ? (
                <ConventionForm onSuccess={() => {}} />
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
                    tableClassName="table-striped table-hover table-sm"
                    enableColumnOrdering={true}
                    enableColumnResizing={true}
                    enableManualFiltering={true }
                    actionColumnWidth={100}
                    renderFilters={renderConventionFilters}
                    EditComponent={ConventionForm}
                    ViewComponent={ConventionVisualisation}
                    CreateComponent={ConventionForm}
                    baseApiUrl={BASE_API_URL}
                    customFilterFunctions={customFilters}
                    itemsPerPage={9}
                    isDataLoading={optionsLoading} 

                />
            )}
        </div>
    );
};

export default ConventionsPage;
