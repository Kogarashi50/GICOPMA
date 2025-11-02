import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import DynamicTable from '../components/DynamicTable';
import AlertTypeForm from './AlertTypeForm'; // We will create this component next

const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const AlertTypesPage = ({ currentUser }) => {
    // For now, let's assume anyone who can manage roles can manage alert types.
    // You could create a new, specific permission for this later if needed.
    const canManageAlertTypes = currentUser?.permissions?.includes('manage roles');

    const columns = useMemo(() => [
        { header: 'ID', accessorKey: 'id', size: 80 },
        { header: 'Nom Unique', accessorKey: 'name', size: 250, meta: { enableGlobalFilter: true } },
        { header: 'Description', accessorKey: 'description', size: 400, meta: { enableGlobalFilter: true } },
        { header: 'Permission Requise', accessorKey: 'permission_name', size: 250, meta: { enableGlobalFilter: true } },
    ], []);

    if (!canManageAlertTypes) {
        return (
            <div className="container-fluid px-4 py-3">
                <div className="alert alert-danger" role="alert">
                    Accès non autorisé. Vous n'avez pas la permission de gérer les types d'alertes.
                </div>
            </div>
        );
    }

    return (
        <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden' }}>
            <DynamicTable
                baseApiUrl={BASE_API_URL}
                fetchUrl="/alert-types"
                dataKey="alert_types"
                deleteUrlBase="/alert-types"
                
                columns={columns}
                itemName="Type d'Alerte"
                itemNamePlural="Types d'Alerte"
                identifierKey="id"
                displayKeyForDelete="name"

                CreateComponent={canManageAlertTypes ? AlertTypeForm : null}
                EditComponent={canManageAlertTypes ? AlertTypeForm : null}
                
                userPermissions={currentUser?.permissions || []}
                itemsPerPage={15}
                enableGlobalSearch={true}
                tableClassName="table-striped table-hover"
            />
        </div>
    );
};

AlertTypesPage.propTypes = {
    currentUser: PropTypes.shape({
        permissions: PropTypes.arrayOf(PropTypes.string)
    }).isRequired
};

export default AlertTypesPage;