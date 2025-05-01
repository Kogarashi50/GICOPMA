// src/gestion_conventions/users_views/UsersPage.jsx (Updated for Consistency)

import React, { useMemo } from 'react'; // Added useMemo for consistency
import PropTypes from 'prop-types';
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
import UserForm from './UserForm'; // Ensure path is correct
import { Badge } from 'react-bootstrap'; // Keep Badge for status

// --- Configuration ---
// Define BASE_API_URL consistently, using environment variables with fallback
// **IMPORTANT**: Set REACT_APP_API_URL to 'http://localhost:8000/api' in your .env file
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api'; // Includes /api

// --- Helper Functions ---
// (Assuming these helpers are defined elsewhere or passed via meta)
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('fr-CA');
    } catch (e) { return dateString; }
};

const formatStatus = (status) => {
    if (!status) return <Badge bg="light" text="dark">-</Badge>;
    let variant;
    let label = status.charAt(0).toUpperCase() + status.slice(1); // Capitalize first letter
    switch (status.toLowerCase()) {
        case 'active':
            variant = 'success';
            label = 'Actif';
            break;
        case 'inactive':
            variant = 'secondary';
            label = 'Inactif';
            break;
        case 'suspended':
            variant = 'warning';
            label = 'Suspendu';
            break;
        default:
            variant = 'light';
            label = status; // Display original if unknown
    }
    return <Badge bg={variant} text={variant === 'light' || variant === 'warning' ? 'dark' : 'white'} className="w-100">{label}</Badge>;
};

// Status options for filtering (assuming these are defined elsewhere or static)
const statusOptions = [
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
    { value: 'suspended', label: 'Suspendu' },
];

// --- Main Page Component ---
const UsersPage = ({ currentUser }) => {

    const userPermissions = currentUser?.permissions || [];

    // Define columns using useMemo
    const columns = useMemo(() => [
        { header: 'ID', accessorKey: 'id', size: 80, enableHiding: true, meta: { filterVariant: 'number' } },
        { header: 'Email', accessorKey: 'email', size: 370, meta: { filterVariant: 'text', enableGlobalFilter: true } },
        {
            header: 'Fonctionnaire',
            accessorFn: row => row.nom_complet || '-', // Use data from backend
            id: 'fonctionnaire_nom_complet',
            size: 200,
            enableSorting: true,
            meta: { filterVariant: 'text', enableGlobalFilter: true }
        },
        {
            header: 'Rôle',
            accessorFn: row => row.roles?.[0]?.name || 'Aucun', // Access the name of the first role
            id: 'role_name', // Unique ID for the column
            size: 150,
            enableSorting: true,
            meta: { filterVariant: 'text', enableGlobalFilter: true } // Could be 'select' if roles are fetched for filter
        },
        {
            header: 'Statut',
            accessorKey: 'status',
            cell: info => formatStatus(info.getValue()), // Use cell formatter
            size: 100,
            meta: { filterVariant: 'select', filterOptions: statusOptions, enableGlobalFilter: true } // Allow filtering by status
        },
        {
            header: 'Créé le',
            accessorKey: 'created_at',
            cell: info => formatDate(info.getValue()), // Use formatDate helper
            size: 120,
            meta: { filterVariant: 'datetime' }
        },
        // Actions column added by DynamicTable
    ], []); // Empty dependency array is appropriate here

    // Check permission to manage users
    const canManageUsers = userPermissions.includes('manage users');

    return (
        // Keep original container styling
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                // --- API Configuration ---
                baseApiUrl={BASE_API_URL}             // *** ADDED: Explicitly pass base URL ***
                fetchUrl="/users"                     // Relative path for fetch
                dataKey="users"                       // Key in the JSON response
                deleteUrlBase={canManageUsers ? "/users" : null} // Relative path for DELETE (conditional)

                // --- Table Configuration ---
                columns={columns}
                itemName="Utilisateur"
                itemNamePlural="Utilisateurs"
                identifierKey="id"
                displayKeyForDelete="email"

                // --- Components & Permissions ---
                CreateComponent={canManageUsers ? UserForm : null} // Conditional rendering
                EditComponent={canManageUsers ? UserForm : null}   // Conditional rendering

                // --- Optional Features ---
                defaultVisibleColumns={['email', 'fonctionnaire_nom_complet', 'role_name', 'status', 'actions']}
                globalSearchExclusions={['id', 'created_at', 'updated_at', 'fonctionnaire_id', 'roles']} // Exclude object/ID fields
                itemsPerPage={10}
                enableGlobalSearch={true}
                // Pass helper functions if needed by columns via meta
                meta={{ formatDate: formatDate }} // Example: Pass formatDate if needed inside DynamicTable/cells
                // tableClassName="table-striped table-hover" // Optional: Add bootstrap styling
            />
        </div>
    );
};

// --- PropTypes ---
// Keep original PropTypes
UsersPage.propTypes = {
    currentUser: PropTypes.shape({
        // Define structure expected by the component
        permissions: PropTypes.arrayOf(PropTypes.string),
        // Add other fields if used: id, name, email etc.
    })
};

export default UsersPage;