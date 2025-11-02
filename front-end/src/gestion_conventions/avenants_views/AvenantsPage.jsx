import React, { useMemo, useState, useCallback, useEffect } from 'react';
import DynamicTable from '../components/DynamicTable'; // Adjust path if needed
import AvenantForm from './AvenantForm'; // Adjust path
import AvenantVisualisation from './AvenantVisualisation'; // Adjust path

// Import UI components and icons
import Select from 'react-select';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faUsers } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
const getStatusColor = (statusValue) => {
    // This can be a shared helper file
    const statuses = {
         "approuvé": "success", "non visé": "danger",
        "en cours de visa": "warning", "visé": "info", "signé": "primary"
    };
    return statuses[statusValue] || "light";
};
// --- Helpers ---
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString + 'T00:00:00Z');
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('fr-CA');
    } catch (e) { return dateString; }
};

const formatCurrency = (amount, showSign = false) => {
    if (amount === null || amount === undefined || isNaN(Number(amount))) return '-';
    const number = parseFloat(amount);
    const options = { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 };
    if (showSign && number > 0) {
        return `+${number.toLocaleString('fr-MA', options)}`;
    }
    return number.toLocaleString('fr-MA', options);
};


const getTypeModificationColor = (type) => {
    switch (type) {
        case 'montant': return 'success';
        case 'durée': return 'info';
        case 'partenaire': return 'warning';
        case 'autre': return 'secondary';
        default: return 'light';
    }
};

const createSelectOptions = (data, valueKey, labelKey) => {
    if (!data || !Array.isArray(data)) return [];
    const uniqueMap = new Map();
    data.forEach(item => {
        if (item && item[valueKey] !== null && item[valueKey] !== undefined) {
            const labelValue = labelKey && item[labelKey] ? item[labelKey] : item[valueKey];
            const label = String(labelValue);
            if (!uniqueMap.has(item[valueKey])) {
                uniqueMap.set(item[valueKey], { value: item[valueKey], label: label });
            }
        }
    });
    return Array.from(uniqueMap.values()).sort((a, b) =>
        String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' })
    );
};
// --- End Helpers ---


// --- Component ---
const AvenantsPage = () => {
    const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

    const [conventionOptions, setConventionOptions] = useState([]);
    const [typeModificationOptions] = useState([
        { value: 'montant', label: 'Montant' },
        { value: 'durée', label: 'Durée' },
         { value: 'technique_administratif', label: 'Tech. admin.' },
        { value: 'partenaire', label: 'Partenaire(s)' },
        { value: 'autre', label: 'Autre' },
    ]);
    const [optionsLoading, setOptionsLoading] = useState(true);

    useEffect(() => {
        const fetchFilterOptions = async () => {
            setOptionsLoading(true);
            try {
                const convRes = await axios.get(`${BASE_API_URL}/conventions`, { params: { light: true }, withCredentials: true });
                const conventions = Array.isArray(convRes.data?.conventions) ? convRes.data.conventions : (Array.isArray(convRes.data) ? convRes.data : []);
                const mappedConvOptions = conventions
                    .filter(c => c?.id !== undefined && c?.Code !== undefined && c?.Intitule !== undefined)
                    .map(c => ({ value: c.id, label: `${c.Code} - ${c.Intitule}` }))
                    .sort((a, b) => String(a.label).localeCompare(String(b.label), undefined, { sensitivity: 'base' }));
                setConventionOptions(mappedConvOptions);

            } catch (error) {
                console.error("Error fetching convention options:", error.response?.data || error.message);
                setConventionOptions([]);
            } finally {
                setOptionsLoading(false);
            }
        };
        fetchFilterOptions();
    }, [BASE_API_URL]);

    const avenantColumns = useMemo(() => [
        {
            accessorKey: 'code',
            header: 'Code Avenant',
            size: 120,
            meta: { enableGlobalFilter: true }
        },{
            id: 'convention',
            header: 'Convention Parent',
            accessorFn: row => row.convention ? `${row.convention?.Code} - ${row.convention?.Intitule}` : `ID: ${row.convention_id}`,
            cell: info => <div className="text-truncate" title={info.getValue()} style={{ maxWidth: '200px' }}>{info.getValue() || '-'}</div>,
            size: 300,
            meta: { enableGlobalFilter: true }
        },
        {
             accessorKey: 'numero_avenant', header: 'N° Avenant', size: 110,
             meta: { enableGlobalFilter: true }
        },
        {
            accessorKey: 'statut',
            header: 'Statut',
            size: 150,
            filterFn: 'equalsString',
            cell: info => {
                const status = info.getValue();
                const color = getStatusColor(status);
                return status ? <Badge bg={color} text={color === 'warning' || color === 'light' ? 'dark' : 'white'} className="w-100 text-truncate">{status}</Badge> : '-';
            },
            meta: { enableGlobalFilter: true }
        },
        {
             accessorKey: 'objet', header: 'Objet', size: 150,
             cell: info => <div className="text-truncate" title={info.getValue()} style={{ width: '150px' }}>{info.getValue()||'-'}</div>,
             meta: { enableGlobalFilter: true }
         },
         {
             accessorKey: 'type_modification', header: 'Type Modif.', size: 120, filterFn: (row, columnId, filterValue) => {
                 const types = row.getValue(columnId);
                 if (!filterValue) return true;
                 const typeArray = Array.isArray(types) ? types : [types];
                 return typeArray.includes(filterValue);
             },
             cell: info => {
                 const types = info.getValue();
                 if (!types || (Array.isArray(types) && types.length === 0)) return '-';
                 
                 const typeArray = Array.isArray(types) ? types : [types];
                 
                 return (
                     <div className="d-flex flex-wrap gap-1">
                         {typeArray.map((type, index) => {
                             const color = getTypeModificationColor(type);
                             const label = typeModificationOptions.find(opt => opt.value === type)?.label || type;
                             return ( <Badge key={index} bg={color} text={color === 'light' || color === 'warning' ? 'dark' : 'white'} className="text-truncate">{label}</Badge> );
                         })}
                     </div>
                 );
             },
             meta: { enableGlobalFilter: true }
         },
        {
             accessorKey: 'date_signature', header: 'Date Signature', size: 140,
             cell: info => formatDate(info.getValue()),
             meta: { enableGlobalFilter: false }
         },
        {
            id: 'files_count', header: <FontAwesomeIcon icon={faPaperclip} title="Fichiers" />,
            accessorFn: row => row.documents?.length ?? 0,
            cell: info => <span className={`text-center px-2 py-1 small rounded-5 ${info.getValue() !==0?'bg-warning':'bg-dark text-white'} fw-bold`}>{info.getValue()}</span>,
            size: 30, enableSorting: false, meta: { enableGlobalFilter: false }
        },
        {
            id: 'partners_count', header: <FontAwesomeIcon icon={faUsers} title="Partenaires Affectés" />,
            accessorFn: row => row.partner_commitments?.length ?? 0,
            cell: info => <span className={`text-center px-2 py-1 small rounded-5 ${info.getValue() !==0?'bg-warning':'bg-dark text-white'} fw-bold`}>{info.getValue()}</span>,
            size: 30, enableSorting: false, meta: { enableGlobalFilter: false }
        },
         // --- MODIFIED: Added montant_avenant column ---
         {
             accessorKey: 'montant_avenant', header: 'Variation Montant', size: 100,
             cell: info => {
                 const types = info.row.original.type_modification;
                 const typeArray = Array.isArray(types) ? types : [types];
                 // Show the signed variation amount
                 return typeArray.includes('montant') ? formatCurrency(info.getValue(), true) : '-';
             },
             meta: { enableGlobalFilter: false }
         },
         {
             accessorKey: 'montant_modifie', header: 'Nouveau Montant', size: 100,
             cell: info => {
                 const types = info.row.original.type_modification;
                 const typeArray = Array.isArray(types) ? types : [types];
                 // Show the final calculated amount
                 return typeArray.includes('montant') ? formatCurrency(info.getValue()) : '-';
             },
             meta: { enableGlobalFilter: false }
         },
         {
             accessorKey: 'nouvelle_date_fin', header: 'Nouv. Date Fin', size: 100,
             cell: info => {
                 const types = info.row.original.type_modification;
                 const typeArray = Array.isArray(types) ? types : [types];
                 return typeArray.includes('durée') ? formatDate(info.getValue()) : '-';
             },
             meta: { enableGlobalFilter: false }
         },

    ], [typeModificationOptions]);

    const [filterConvention, setFilterConvention] = useState(null);
    const [filterTypeModification, setFilterTypeModification] = useState(null);

    const renderAvenantFilters = useCallback((table) => {
        const conventionColumn = table.getColumn('convention');
        const typeModifColumn = table.getColumn('type_modification');

        return (
            <Row className="mb-3 gx-2 d-flex flex-column gy-2 align-items-end">
                <Col xs="12"><h6 className='mb-1'>Filtrer par:</h6></Col>
                 {conventionColumn && (
                    <Col xs={12}>
                        <Select
                            inputId="filterConvention"
                            name="conventionFilter"
                            options={conventionOptions}
                            value={filterConvention}
                            onChange={(selectedOption) => {
                                 setFilterConvention(selectedOption);
                                 conventionColumn.setFilterValue(selectedOption ? selectedOption.label : undefined);
                            }}
                            placeholder="Filtrer par Convention..."
                            isClearable
                            isLoading={optionsLoading}
                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: (base) => ({...base, minHeight: '32px', fontSize: '0.85rem'}), valueContainer: (base) => ({...base, padding: '0px 6px'}) }}
                            menuPortalTarget={document.body}
                            classNamePrefix="react-select-filter"
                            theme={(theme) => ({ ...theme, borderRadius: 4, colors: { ...theme.colors, primary: '#0d6efd' } })}
                        />
                    </Col>
                 )}

                {typeModifColumn && (
                    <Col xs={12}>
                        <Select
                            inputId="filterTypeModification"
                            name="typeModifFilter"
                            options={typeModificationOptions}
                            value={filterTypeModification}
                            onChange={(selectedOption) => {
                                setFilterTypeModification(selectedOption);
                                typeModifColumn.setFilterValue(selectedOption ? selectedOption.value : undefined);
                            }}
                            placeholder="Filtrer par Type Modification..."
                            isClearable
                            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }), control: (base) => ({...base, minHeight: '32px', fontSize: '0.85rem'}), valueContainer: (base) => ({...base, padding: '0px 6px'}) }}
                            menuPortalTarget={document.body}
                            classNamePrefix="react-select-filter"
                            theme={(theme) => ({ ...theme, borderRadius: 4, colors: { ...theme.colors, primary: '#0d6efd' } })}
                        />
                    </Col>
                )}

                 <Col xs="auto" className="mt-2">
                     <Button
                         variant="outline-secondary"
                         size="sm"
                         className="px-3"
                         onClick={() => {
                             setFilterConvention(null);
                             setFilterTypeModification(null);
                             table.resetColumnFilters();
                         }}
                         title="Réinitialiser les filtres"
                     >
                         Effacer Filtres
                     </Button>
                 </Col>
            </Row>
        );
    }, [filterConvention, filterTypeModification, conventionOptions, typeModificationOptions, optionsLoading]);


    const defaultCols = useMemo(() => [     
        'code', 'convention', 'numero_avenant', 'objet', 'type_modification','statut',
        'date_signature', 'files_count', 'partners_count', 'actions'
    ], []);
    
    // --- MODIFIED: Added montant_avenant to available columns ---
    const availableCols = useMemo(() => [
        'id', 'convention', 'numero_avenant', 'date_signature', 'objet',
        'type_modification', 'montant_avenant', 'montant_modifie', 'nouvelle_date_fin',
        'files_count', 'partners_count', 'remarques', 'date_creation',
    ], []);
    
    const searchExclusions = useMemo(() => [
        'id', 'convention_id',
        'montant_avenant', 'montant_modifie', 'nouvelle_date_fin',
        'files_count', 'partners_count',
        'date_signature', 'date_creation', 'updated_at',
        'remarques'
    ], []);

     const includeParam = useMemo(() => {
        return 'convention,documents,partner_commitments.partenaire';
     }, []);

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                fetchUrl="/avenants"
                fetchParams={{ include: includeParam }}
                dataKey="avenants"
                deleteUrlBase="/avenants"
                baseApiUrl={BASE_API_URL}

                columns={avenantColumns}
                itemName="Avenant"
                itemNamePlural="Avenants"
                identifierKey="id"
                displayKeyForDelete="numero_avenant"

                itemsPerPage={10}
                defaultVisibleColumns={defaultCols}
                availableColumnKeys={availableCols}
                globalSearchExclusions={searchExclusions}
                enableManualFiltering={true}
                enableGlobalSearch={true}

                CreateComponent={AvenantForm}
                ViewComponent={AvenantVisualisation}
                EditComponent={AvenantForm}
                renderFilters={renderAvenantFilters}

                actionColumnWidth={90}
                tableClassName="table-striped table-hover table-sm"
            />
        </div>
    );
};

export default AvenantsPage;