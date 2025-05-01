// src/gestion_conventions/roles_views/RolesPage.jsx (Updated)

import React, { useMemo } from 'react'; // Added useMemo for consistency
import PropTypes from 'prop-types';
import DynamicTable from '../components/DynamicTable'; // Adjust path as needed
import RoleForm from './RoleForm'; // Make sure this component exists and path is correct

// --- Configuration ---
// Define BASE_API_URL consistently, using environment variables with fallback
// **IMPORTANT**: For this to work reliably, you should set the REACT_APP_API_URL
// environment variable to 'http://localhost:8000' in your .env file when building/running.
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// --- Helper Functions (Optional but good practice) ---
// You can reuse the formatDate function from MarchePublicPage or define it here
const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
        // Attempt to handle various potential date/datetime formats from backend
        const date = new Date(dateString);
        if (isNaN(date.getTime())) { // Check if date is valid
             // console.warn("Invalid date format received:", dateString);
             return dateString; // Return original string if invalid
        }
         // Use 'fr-CA' for YYYY-MM-DD format, or adjust as needed 'fr-FR' etc.
        return date.toLocaleDateString('fr-CA');
    } catch (e) {
        console.error("Date format error:", dateString, e);
        return dateString; // Return original string on error
    }
};


// --- Main Page Component ---
const RolesPage = ({ currentUser }) => {
    const userPermissions = currentUser?.permissions || [];
    // Ensure the permission string matches exactly what your backend/auth system provides
    const canManageRoles = userPermissions.includes('manage roles');

    // Define columns for the Roles table using useMemo
    const roleColumns = useMemo(() => [
        {
            header: 'ID',
            accessorKey: 'id',
            size: 80,
            meta: { align: 'left' } // Optional: Alignment meta
        },
        {
            header: 'Nom du Rôle',
            accessorKey: 'name',
            size: 300,
            meta: { align: 'left', enableGlobalFilter: true } // Allow searching on this column
        },
        // Optionally display number of permissions or users if available in API response
        // {
        //    header: 'Permissions',
        //    accessorFn: row => row.permissions?.length || 0, // Ensure 'permissions' key exists in your API data
        //    size: 100,
        //    meta: { align: 'center' }
        // },
        {
            header: 'Créé le',
            accessorKey: 'created_at',
            cell: info => formatDate(info.getValue()), // Use the formatDate helper
            size: 150,
            meta: { align: 'center' }
        },
        // Actions column is typically added automatically by DynamicTable
        // when CreateComponent, EditComponent, or deleteUrlBase are provided.
    ], []); // Empty dependency array means columns are created once

    // Show unauthorized message if user lacks permission
    // (Original styling and structure maintained)
    if (!canManageRoles) {
        return (
            <div className="container-fluid px-4 py-3">
                <div className="alert alert-danger" role="alert"> {/* Added role="alert" for accessibility */}
                    Accès non autorisé. Vous n'avez pas la permission de gérer les rôles.
                </div>
            </div>
        );
    }

    // Render the table if authorized
    // (Original styling and structure maintained)
    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            {/* Using DynamicTable with the consistent Base URL approach */}
            <DynamicTable
                // --- API Configuration ---
                baseApiUrl={BASE_API_URL}       // *** ADDED: Provide the base URL ***
                fetchUrl="/roles"           // *** CHANGED: Relative path for fetch ***
                dataKey="roles"                 // Key in the JSON response holding the roles array
                deleteUrlBase="/roles"      // *** CHANGED: Relative base path for DELETE ***

                // --- Table Configuration ---
                columns={roleColumns}
                itemName="Rôle"
                itemNamePlural="Rôles"
                identifierKey="id"              // Primary key of a role item
                displayKeyForDelete="name"      // Show role name in delete confirmation

                // --- Components & Permissions ---
                // Conditionally provide components based on permission
                CreateComponent={canManageRoles ? RoleForm : null}
                EditComponent={canManageRoles ? RoleForm : null}
                // ViewComponent={/* Add if you have a specific view-only component for Roles */}

                userPermissions={userPermissions} // Pass permissions down (DynamicTable might use this)

                // --- Optional DynamicTable Features (Examples) ---
                itemsPerPage={10}
                enableGlobalSearch={true}       // Allow global filtering across searchable columns
                 // defaultVisibleColumns={['id', 'name', 'created_at', 'actions']} // Control default visibility if needed
                // renderFilters={/* Add specific filter UI components if needed */}
                // actionColumnWidth={90} // Adjust action column width if necessary
                 tableClassName="table-striped table-hover" // Add bootstrap table styling
            />
        </div>
    );
};

// --- PropTypes ---
// (Original PropTypes maintained)
RolesPage.propTypes = {
    currentUser: PropTypes.shape({
        permissions: PropTypes.arrayOf(PropTypes.string)
        // Add other expected properties of currentUser if available and needed
        // id: PropTypes.number,
        // name: PropTypes.string,
        // email: PropTypes.string,
    })
    // Can be optional if not always provided
    // currentUser: PropTypes.shape({ ... }).isRequired
};

export default RolesPage;