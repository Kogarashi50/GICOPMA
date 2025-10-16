import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import DynamicTable from '../components/DynamicTable';
import ObservationForm from './ObservationForm';
import ObservationVisualisation from './ObservationVisualisation';
import { PERMISSIONS } from '../data';

// --- UI & Utilities ---
import { Modal, Badge, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faPaperclip, faUser, faParagraph, faPlus
} from '@fortawesome/free-solid-svg-icons';

// --- Constants & Helpers ---
const BASE_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
};

const ObservationEditWrapper = ({ itemId, onClose, onItemUpdated, baseApiUrl }) => {
    return (
        <div className="px-4 pt-2 pb-4">
            <Modal.Header className="border-0 px-0 pb-4">
                 <Modal.Title as="h4">Modifier l'Observation</Modal.Title>
            </Modal.Header>
            <ObservationForm
                itemId={itemId}
                baseApiUrl={baseApiUrl}
                onSuccess={onItemUpdated}
                onCancel={onClose}
            />
        </div>
    );
};

// --- Main Page Component ---
const ObservationsPage = ({ currentUser }) => {
    // --- State for custom "Create" modal ---
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [tableKey, setTableKey] = useState(Date.now()); // State to force table refresh

    const handleOpenCreateModal = () => setShowCreateModal(true);
    const handleCloseCreateModal = () => setShowCreateModal(false);

    const handleObservationCreated = () => {
        handleCloseCreateModal();
        setTableKey(Date.now()); // Change the key to force DynamicTable to re-fetch data
    };

    const userPermissions = currentUser?.permissions || [];
    const canView = userPermissions.includes(PERMISSIONS.VIEW_OBSERVATIONS);
    const canCreate = userPermissions.includes(PERMISSIONS.CREATE_OBSERVATIONS);
    const canUpdate = userPermissions.includes(PERMISSIONS.UPDATE_OBSERVATIONS);
    const canDelete = userPermissions.includes(PERMISSIONS.DELETE_OBSERVATIONS);

    const observationColumns = useMemo(() => [
        {
            accessorKey: 'nom_complet',
            header: 'Nom Complet',
            size: 200,
            cell: info => (
                <div className="text-truncate" title={info.getValue()}>
                    <FontAwesomeIcon icon={faUser} className="me-2 text-muted small" />
                    {info.getValue()}
                </div>
            ),
            meta: { align: 'left', enableGlobalFilter: true },
        },
        {
            accessorKey: 'observation',
            header: "Aperçu de l'observation",
            size: 350,
            cell: info => {
                const text = info.getValue();
                if (!text) return <span className="text-muted fst-italic">Aucun contenu</span>;
                return (
                    <div className="text-truncate" title={text}>
                        <FontAwesomeIcon icon={faParagraph} className="me-2 text-muted small" />
                        {text}
                    </div>
                );
            },
            meta: { align: 'left', enableGlobalFilter: true },
        },
        {
            accessorKey: 'date_observation',
            header: 'Date',
            size: 120,
            cell: info => formatDate(info.getValue()),
            meta: { align: 'center' }
        },
        {
            accessorKey: 'fichiers_joints',
            header: 'Fichiers',
            size: 80,
            enableSorting: false,
            cell: info => {
                const files = info.getValue();
                if (!files || files.length === 0) {
                    return <span className='text-muted'>-</span>;
                }
                const tooltipText = files.map(f => f.intitule || f.nom_fichier).join(', ');
                return (
                    <div title={tooltipText}>
                        <FontAwesomeIcon icon={faPaperclip} className="me-1 text-secondary" />
                        <Badge pill bg="secondary" text="white">
                            {files.length}
                        </Badge>
                    </div>
                );
            },
            meta: { align: 'center', enableGlobalFilter: false },
        },
    ], []);

    const defaultVisibleCols = useMemo(() => [
        'nom_complet',
        'observation',
        'date_observation',
        'fichiers_joints',
        'actions'
    ], []);

    if (!canView) {
        return (
            <div className="container-fluid px-4 py-3">
                <div className="alert alert-danger" role="alert">
                    Accès non autorisé. Vous n'avez pas la permission de consulter les observations.
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="d-flex flex-column flex-grow-1" style={{ height: 'calc(91vh - 56px)', overflowY: 'hidden', padding: '0.5rem' }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h1 className="fs-4 fw-bold text-dark mb-0"></h1>
                    {canCreate && (
                        <Button
                            variant="dark"
                            size="sm"
                            onClick={handleOpenCreateModal}
                            className="createBtn btn-sm d-flex align-items-center shadow-sm"
                        >
                            <FontAwesomeIcon icon={faPlus} className="me-2" />
                            <span>Créer Observation</span>
                        </Button>
                    )}
                </div>

                <DynamicTable
                    key={tableKey} // Use the key to trigger re-fetches
                    fetchUrl="/observations"
                    dataKey="data"
                    totalCountKey="meta.total"
                    deleteUrlBase={canDelete ? "/observations" : null}
                    baseApiUrl={BASE_API_URL}
                    columns={observationColumns}
                    itemName="Observation"
                    itemNamePlural="Observations"
                    identifierKey="id"
                    displayKeyForDelete="nom_complet"
                    itemsPerPage={15}
                    defaultVisibleColumns={defaultVisibleCols}
                    renderFilters={false}
                    globalSearchPlaceholder="Rechercher par nom, contenu..."
                    CreateComponent={null} // Hide the default button
                    ViewComponent={ObservationVisualisation}
                    EditComponent={canUpdate ? ObservationEditWrapper : null}
                    actionColumnWidth={90}
                    tableClassName="table-striped table-hover"
                />
            </div>

            <Modal show={showCreateModal} onHide={handleCloseCreateModal} dialogClassName="modal-xl" centered backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title>Créer une nouvelle Observation</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <ObservationForm
                        onSuccess={handleObservationCreated}
                        onCancel={handleCloseCreateModal}
                        baseApiUrl={BASE_API_URL}
                    />
                </Modal.Body>
            </Modal>
        </>
    );
};

ObservationsPage.propTypes = {
    currentUser: PropTypes.shape({
        permissions: PropTypes.arrayOf(PropTypes.string)
    })
};

export default ObservationsPage;