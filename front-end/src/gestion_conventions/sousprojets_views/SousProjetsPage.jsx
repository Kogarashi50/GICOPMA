// src/pages/sousprojets_views/SousProjetsPage.jsx

import React, { useMemo, useState, useEffect } from 'react';
import axios from 'axios';
import DynamicTable from '../components/DynamicTable';
import SousProjetForm from './SousProjetForm';
import SousProjetVisualisation from './SousProjetVisualisation';
import Alert from 'react-bootstrap/Alert';

// --- Constants ---
const BASE_API_URL = 'http://localhost:8000/api';

// --- Helper Functions ---
const formatPercentage = (value) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    return `${number.toFixed(2)} %`;
};

const formatNumber = (value, decimals = 2) => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) return '-';
    return number.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const displayData = (data, fallback = '-') => data ?? fallback;

const formatDateSimple = (dateString) => {
    if (!dateString) return '-';
    try {
        // Basic check for ISO-like format (YYYY-MM-DD)
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
             // Append time to avoid timezone issues assuming it's midnight UTC if no time provided
             return new Date(dateString + 'T00:00:00Z').toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
        // Try parsing other potential date formats
        const date = new Date(dateString);
        // Check if the date object is valid
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
        }
        console.warn("Could not format date:", dateString);
        return dateString; // Return original string if parsing fails
    } catch (e) {
        console.error("Error formatting date:", dateString, e);
        return dateString; // Return original string on error
    }
};
// --- End Helpers ---


const SousProjetsPage = () => {
    // --- State for lookup data ---
    const [lookupData, setLookupData] = useState({ provinces: [], communes: [] });
    const [lookupError, setLookupError] = useState(null);
    const [optionsLoading, setOptionsLoading] = useState(true);

    // --- Fetch lookup data on component mount ---
    useEffect(() => {
        const fetchLookups = async () => {
           setOptionsLoading(true);

            try {
                // Assuming you have these API endpoints to get all options
                const [provincesRes, communesRes] = await Promise.all([
                    axios.get(`${BASE_API_URL}/options/provinces`),
                    axios.get(`${BASE_API_URL}/options/communes`)
                ]);

                setLookupData({
                    // Adjust data key based on your API response
                    provinces: provincesRes.data.provinces || provincesRes.data || [],
                    communes: communesRes.data.communes || communesRes.data || [],
                });
            } catch (error) {
                console.error("Failed to fetch lookup data:", error);
                setLookupError("Impossible de charger les listes de provinces et communes. L'affichage des noms peut échouer.");
            } finally {
                setOptionsLoading(false);
            }
        };
        fetchLookups();
    }, []); // Empty dependency array means this runs only once on mount

    // --- Column Definition ---
    const sousProjetColumns = useMemo(() => [
        { accessorKey: 'Code_Sous_Projet', header: 'Code', size: 40, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Nom_Projet', header: 'Nom', cell: info => <div className="text-truncate" style={{ maxWidth: '250px' }} title={info.getValue()}>{info.getValue() || '-'}</div>, size: 200, meta: { enableGlobalFilter: true } },
        {
            id: 'ProjetMaitre', header: 'Projet Maître',
            accessorFn: row => row.projet ? `${row.projet.Code_Projet} - ${row.projet.Nom_Projet}` : row.ID_Projet_Maitre || '-',
            cell: info => <div className="text-truncate" style={{ maxWidth: '250px' }} title={info.getValue()}>{info.getValue() || '-'}</div>,
            size: 200,
            meta: { enableGlobalFilter: true }
        },
        {
            id: 'Province', header: 'Province(s)',
            accessorFn: row => row.Id_Province,
            cell: info => {
                const provinceIds = info.getValue();
                if (!provinceIds || provinceIds.length === 0) return '-';
                const provinceArray = Array.isArray(provinceIds) ? provinceIds : [provinceIds];

                return (
                    <div className="d-flex flex-wrap gap-1">
                        {provinceArray.map((id, index) => {
                            const province = lookupData.provinces.find(p => +p.value === +id);
                            const name = province?.label?.replace('Province:', '').trim() || `ID: ${id}`;
                            return (
                                <span key={index} className="badge bg-primary text-white text-truncate" style={{ maxWidth: '80px' }} title={name}>
                                    {name}
                                </span>
                            );
                        })}
                    </div>
                );
            },
            size: 120,
            meta: { enableGlobalFilter: true },
        },
        {
            id: 'Commune', header: 'Commune(s)',
            accessorFn: row => row.Id_Commune,
            cell: info => {
                const communeIds = info.getValue();
                if (!communeIds || communeIds.length === 0) return '-';
                const communeArray = Array.isArray(communeIds) ? communeIds : [communeIds];
                return (
                    <div className="d-flex flex-wrap gap-1">
                        {communeArray.map((id, index) => {
                            const commune = lookupData.communes.find(c => +c.value === +id);
                            const name = commune?.label || `ID: ${id}`;
                            return (
                                <span key={index} className="badge bg-secondary text-white text-truncate" style={{ maxWidth: '80px' }} title={name}>
                                    {name}
                                </span>
                            );
                        })}
                    </div>
                );
            },
            size: 120,
            meta: { enableGlobalFilter: true },
        },
        { accessorKey: 'Secteur', header: 'Secteur', size: 130, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Localite', header: 'Localité', size: 130, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Status', header: 'Statut', size: 100, meta: { enableGlobalFilter: true } },
        { accessorKey: 'Etat_Avan_Physi', header: 'Av. Physi', cell: info => formatPercentage(info.getValue()), size: 100, meta: { enableGlobalFilter: false } },
        { accessorKey: 'Etat_Avan_Finan', header: 'Av. Finan', cell: info => formatPercentage(info.getValue()), size: 100, meta: { enableGlobalFilter: false } },
        { accessorKey: 'Estim_Initi', header: 'Estim. Init.', cell: info => formatNumber(info.getValue()), size: 140, meta: { enableGlobalFilter: false } },
        { accessorKey: 'created_at', header: 'Créé le', cell: info => formatDateSimple(info.getValue()), size: 120, meta: { enableGlobalFilter: false } },
    ], [lookupData]); // Re-calculate columns when lookupData is loaded

    // --- DynamicTable Configuration ---
    const defaultCols = useMemo(() => [
        'Code_Sous_Projet', 'Nom_Projet', 'ProjetMaitre', 'Province', 'Commune', 'Estim_Initi', 'Etat_Avan_Finan', 'Etat_Avan_Physi', 'actions'
    ], []);

    const searchExclusions = useMemo(() => [
        'ID_Sous_Projet', 'ID_Projet_Maitre', 'Id_Province', 'Id_Commune', 'Observations',
        'Etat_Avan_Finan', 'Estim_Initi', 'Centre', 'Site', 'Surface', 'Lineaire',
        'Douars_Desservis', 'Financement', 'Nature_Intervention', 'Benificiaire',
        'created_at', 'updated_at'
    ], []);

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            {lookupError && <Alert variant="danger" className="m-2">{lookupError}</Alert>}
            <DynamicTable
                // --- Core ---
                fetchUrl="/sousprojets"
                dataKey="sousprojets"
                deleteUrlBase="/sousprojets"
                columns={sousProjetColumns}
                itemName="Sous-Projet"
                itemNamePlural="Sous-Projets"
                // --- Optional ---
                identifierKey="Code_Sous_Projet"
                displayKeyForDelete="Nom_Projet"
                defaultVisibleColumns={defaultCols}
                globalSearchExclusions={searchExclusions}
                itemsPerPage={10}
                baseApiUrl={BASE_API_URL}
                // --- Components ---
                CreateComponent={SousProjetForm}
                ViewComponent={SousProjetVisualisation}
                EditComponent={SousProjetForm}
                isDataLoading={optionsLoading} 

            />
        </div>
    );
};

export default SousProjetsPage;