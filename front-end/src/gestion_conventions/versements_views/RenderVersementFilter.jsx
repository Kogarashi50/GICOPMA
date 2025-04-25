import React, { useState, useMemo } from 'react'; // Added useMemo here if needed
import Select from 'react-select';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilterCircleXmark, faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';

// Filter component - receives table instance and EXTERNAL state/setters for URL filter
const RenderVersementFiltersComponent = ({
    table,
    externalFilterConvPartId, // Receive the state value
    setExternalFilterConvPartId, // Receive the setter function
    paiementMethodeOptions, // Receive options
    optionsLoading, // Receive loading state
}) => {
    // Get initial values from table state if they exist
    const initialDateFilter = table.getColumn('date_versement')?.getFilterValue() || {};
    const initialAmountFilter = table.getColumn('montant_verse')?.getFilterValue() || {};
    const initialMoyenFilter = table.getColumn('moyen_paiement')?.getFilterValue();

    // --- LOCAL state for filter inputs ---
    const [localDateDebut, setLocalDateDebut] = useState(initialDateFilter.start || '');
    const [localDateFin, setLocalDateFin] = useState(initialDateFilter.end || '');
    const [localMoyenPaiement, setLocalMoyenPaiement] = useState(
        paiementMethodeOptions.find(opt => opt.value === initialMoyenFilter) || null
    );
    const [localMontantMin, setLocalMontantMin] = useState(initialAmountFilter.min || '');
    const [localMontantMax, setLocalMontantMax] = useState(initialAmountFilter.max || '');

    // Get column instances
    const dateColumn = table.getColumn('date_versement');
    const moyenPaiementColumn = table.getColumn('moyen_paiement');
    const montantColumn = table.getColumn('montant_verse');

    // Apply date/amount filters
    const applyRangeFilters = () => {
        dateColumn?.setFilterValue(
            (localDateDebut || localDateFin) ? { start: localDateDebut || undefined, end: localDateFin || undefined } : undefined
        );
        montantColumn?.setFilterValue(
            (localMontantMin || localMontantMax) ? { min: localMontantMin || undefined, max: localMontantMax || undefined } : undefined
        );
    };

    // Handle Select change
    const handleSelectChange = (selectedOption) => {
        setLocalMoyenPaiement(selectedOption);
        moyenPaiementColumn?.setFilterValue(selectedOption?.value ?? undefined);
    };

    // Reset all filters
    const resetAllFilters = () => {
        setLocalDateDebut(''); setLocalDateFin('');
        setLocalMoyenPaiement(null);
        setLocalMontantMin(''); setLocalMontantMax('');
        setExternalFilterConvPartId(''); // Use the passed setter for the external state
        table.resetColumnFilters();
        table.setGlobalFilter('');
    };

    const selectStyles = { control: base => ({ ...base, minHeight: '31px', fontSize: '0.875rem' }) };

    return (
        <Form className="p-2 border bg-light rounded mb-2 small" onSubmit={(e) => {e.preventDefault(); applyRangeFilters();}}>
            <Row className="g-2 align-items-end">
                {/* ID Engagement Filter (Controls URL) */}
                <Col xs={12} md={6} lg={3}>
                    <Form.Group controlId="filterConvPartId">
                        <Form.Label size="sm" className="mb-1 fw-bold">ID Engagement (CP)</Form.Label>
                        <Form.Control
                            type="number" size="sm"
                            placeholder="Filtrer par ID_CP"
                            value={externalFilterConvPartId} // READ from passed prop
                            onChange={(e) => setExternalFilterConvPartId(e.target.value)} // CALL passed setter
                            aria-label="Filtrer par ID Engagement"
                        />
                    </Form.Group>
                </Col>

                {/* Date Range Filter */}
                <Col xs={12} md={6} lg={4}>
                    <Form.Group controlId="filterDateRange">
                        <Form.Label size="sm" className="mb-1 fw-bold">Date Versement</Form.Label>
                        <InputGroup size="sm">
                            <Form.Control type="date" title="Date début" value={localDateDebut} onChange={(e) => setLocalDateDebut(e.target.value)} aria-label="Date début versement"/>
                            <Form.Control type="date" title="Date fin" value={localDateFin} onChange={(e) => setLocalDateFin(e.target.value)} aria-label="Date fin versement"/>
                        </InputGroup>
                    </Form.Group>
                </Col>

                {/* Moyen Paiement Filter */}
                <Col xs={12} md={6} lg={3}>
                    <Form.Group controlId="filterMoyenPaiement">
                        <Form.Label size="sm" className="mb-1 fw-bold">Moyen Paiement</Form.Label>
                        <Select
                            options={paiementMethodeOptions} value={localMoyenPaiement} onChange={handleSelectChange}
                            placeholder="Tous" isClearable size="sm" styles={selectStyles} isLoading={optionsLoading}
                            aria-label="Filtrer par moyen de paiement"
                         />
                    </Form.Group>
                </Col>

                {/* Montant Range Filter */}
                <Col xs={12} md={6} lg={4}>
                    <Form.Group controlId="filterMontantRange">
                        <Form.Label size="sm" className="mb-1 fw-bold">Montant Versé</Form.Label>
                        <InputGroup size="sm">
                            <Form.Control type="number" placeholder="Min" step="0.01" value={localMontantMin} onChange={(e) => setLocalMontantMin(e.target.value)} aria-label="Montant minimum"/>
                            <Form.Control type="number" placeholder="Max" step="0.01" value={localMontantMax} onChange={(e) => setLocalMontantMax(e.target.value)} aria-label="Montant maximum"/>
                        </InputGroup>
                    </Form.Group>
                </Col>

                {/* Action Buttons */}
                <Col xs={12} md={6} lg={2} className="d-flex flex-column justify-content-end">
                    <Button type="submit" variant="primary" size="sm" title="Appliquer filtres Date/Montant">
                       <FontAwesomeIcon icon={faMagnifyingGlass} /> <span className="d-none d-lg-inline ms-1">Filtrer</span>
                    </Button>
                </Col>
                <Col xs={12} md={6} lg={2} className="d-flex flex-column justify-content-end">
                    <Button variant="outline-secondary" size="sm" onClick={resetAllFilters} title="Réinitialiser tous les filtres">
                        <FontAwesomeIcon icon={faFilterCircleXmark} /> <span className="d-none d-lg-inline ms-1">Reset</span>
                    </Button>
                </Col>
            </Row>
        </Form>
    );
};
export default RenderVersementFiltersComponent;