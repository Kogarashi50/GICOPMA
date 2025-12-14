// src/pages/projets_views/ProjetVisualisation.jsx (Refactored for Mission 2)


import React, { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faUsers,
  faHandHoldingUsd,
  faMapMarkerAlt,
  faPiggyBank,
  faFileInvoiceDollar,
  faUserTie,
  faBuilding,
  faInfoCircle,
  faCalendarAlt,
  faTasks,
  faCommentDots,
} from "@fortawesome/free-solid-svg-icons"
import Button from "react-bootstrap/Button"
import Card from "react-bootstrap/Card"
import Row from "react-bootstrap/Row"
import Col from "react-bootstrap/Col"
import Alert from "react-bootstrap/Alert"
import PropTypes from "prop-types"
import Spinner from "react-bootstrap/Spinner"
import Badge from "react-bootstrap/Badge"
import ProgressBar from "react-bootstrap/ProgressBar"
import Stack from "react-bootstrap/Stack"
// Assuming the CSS from ConventionVisualisation is available globally or imported here
// import "./visualisation.css";

// --- Helper Functions (Enhanced for consistency) ---
const formatPercentage = (value) => {
  const n = parseFloat(value)
  return isNaN(n) ? "-" : `${n.toFixed(1)} %`
}
const formatCurrency = (value) => {
  const n = parseFloat(value)
  if (isNaN(n)) return "-"
  return n.toLocaleString("fr-MA", { style: "currency", currency: "MAD", minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const displayData = (data, fallback = "-") => (data !== null && data !== undefined && String(data).trim() !== "" ? data : fallback)
const formatDate = (dateString) => {
  if (!dateString) return "-"
  try {
    const d = new Date(dateString)
    if (isNaN(d.getTime())) return dateString
    // Check if time is relevant (not midnight UTC)
    if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
      return d.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "2-digit" })
    }
    return d.toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit" })
  } catch (e) {
    return dateString
  }
}

const ProjetVisualisation = ({ itemId, onClose, baseApiUrl = "http://localhost:8000/api" }) => {
  // --- State ---
  const [projetData, setProjetData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [fonctionnairesList, setFonctionnairesList] = useState([])

  // --- Data Fetching Logic ---
  const fetchProjetAndFonctionnaires = useCallback(async () => {
    if (!itemId) {
      setError("ID Projet manquant.")
      setLoading(false)
      return
    }
    if (!baseApiUrl) {
      setError("URL d'API (baseApiUrl) manquante.")
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setProjetData(null)
    setFonctionnairesList([])

    try {
      const [projetRes, foncRes] = await Promise.allSettled([
        axios.get(`${baseApiUrl}/projets/${itemId}`, {
          params: { include: "programme,convention,engagementsFinanciers.partenaire,engagementsFinanciers.versements,provinces,communes" },
          withCredentials: true,
        }),
        axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true }),
      ])

      if (projetRes.status === "fulfilled" && projetRes.value.data) {
        const data = projetRes.value.data.projet || projetRes.value.data
        if (data && typeof data === "object" && data.ID_Projet) {
          data.engagements_financiers = Array.isArray(data.engagements_financiers) ? data.engagements_financiers : []
          data.engagements_financiers.forEach((eng) => {
            eng.versements = Array.isArray(eng.versements) ? eng.versements : []
          })
          setProjetData(data)
        } else {
          throw new Error(`Format de données invalide reçu pour Projet ID ${itemId}.`)
        }
      } else {
        const errorDetail = projetRes.reason?.response?.data?.message || projetRes.reason?.message || "Erreur inconnue"
        throw new Error(`Échec chargement projet: ${errorDetail}`)
      }

      if (foncRes.status === "fulfilled") {
        const foncDataPayload = foncRes.value.data.fonctionnaires || foncRes.value.data.data || foncRes.value.data
        if (Array.isArray(foncDataPayload)) {
          setFonctionnairesList(
            foncDataPayload.map((f) => ({
              value: f.id,
              label: f.nom_complet || f.Nom_Fonctionnaire || f.nom || f.name || `ID: ${f.id}`,
            })),
          )
        }
      } else {
        console.warn("Could not fetch fonctionnaires:", foncRes.reason?.message)
      }
    } catch (err) {
      setError(err.message || "Erreur de chargement.")
    } finally {
      setLoading(false)
    }
  }, [itemId, baseApiUrl])

  useEffect(() => {
    fetchProjetAndFonctionnaires()
  }, [fetchProjetAndFonctionnaires])

  // --- Memoized Helpers ---
  const getFonctionnaireNames = useCallback(
    (fonctionnaireIdString) => {
      if (!fonctionnaireIdString) return displayData(null, "Non spécifié")
      const ids = String(fonctionnaireIdString).split(";").map((id) => id.trim()).filter(Boolean)
      if (ids.length === 0) return displayData(null, "Non spécifié")
      if (fonctionnairesList.length === 0) return <span className="text-warning fst-italic">Chargement...</span>
      
      return (
        <Stack direction="horizontal" gap={1} wrap="wrap">
          {ids.map((id) => {
            const fonctionnaire = fonctionnairesList.find((f) => String(f.value).toLowerCase() === String(id).toLowerCase())
            return (
              <Badge key={id} pill bg="dark" text="white" className="border me-1 mb-1 px-2 py-1 fw-normal">
                <FontAwesomeIcon icon={faUserTie} className="me-1" />
                {fonctionnaire?.label || `ID: ${id}`}
              </Badge>
            )
          })}
        </Stack>
      )
    },
    [fonctionnairesList],
  )

  const financialSummary = useMemo(() => {
    if (!projetData || !Array.isArray(projetData.engagements_financiers)) {
      return { partnerSummary: {}, totalPaid: 0, totalEngagedProject: 0 }
    }
    const summary = { partnerSummary: {}, totalPaid: 0, totalEngagedProject: 0 }
    projetData.engagements_financiers.forEach((eng) => {
      const partnerId = eng.partenaire?.Id ?? eng.partenaire_id
      const partnerName = eng.partenaire?.Description!==""?eng.partenaire?.Description: eng.partenaire?.Description_Arr ?? `Partenaire ID: ${partnerId}`
      if (!partnerId) return
      if (!summary.partnerSummary[partnerId]) {
        summary.partnerSummary[partnerId] = { name: partnerName, totalEngaged: 0, totalVersed: 0 }
      }
      const engagedAmount = parseFloat(eng.montant_engage || 0)
      const currentEngagementVersed = Array.isArray(eng.versements)
        ? eng.versements.reduce((sum, v) => sum + parseFloat(v.montant_verse || 0), 0)
        : 0
      summary.partnerSummary[partnerId].totalEngaged += engagedAmount
      summary.partnerSummary[partnerId].totalVersed += currentEngagementVersed
      summary.totalPaid += currentEngagementVersed
      summary.totalEngagedProject += engagedAmount
    })
    return summary
  }, [projetData])

  // --- Render Logic ---
  if (loading) { return ( <div className="text-center p-5 d-flex justify-content-center align-items-center" style={{ minHeight: "300px" }}><Spinner animation="border" variant="warning" className="me-3" /><span className="text-muted">Chargement du projet...</span></div> ) }
  if (error) { return ( <Alert variant="danger" className="m-3 m-md-4"><Alert.Heading><FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> Erreur</Alert.Heading><p>{error}</p><hr /><Button onClick={onClose} variant="outline-danger" size="sm">Fermer</Button></Alert> ) }
  if (!projetData) { return ( <Alert variant="secondary" className="m-3 m-md-4">Aucune donnée disponible.<Button variant="link" size="sm" onClick={onClose} className="float-end">Fermer</Button></Alert> ) }
  const { partnerSummary, totalPaid, totalEngagedProject } = financialSummary
  const projectCost = parseFloat(projetData.Cout_Projet || 0)
  const remainingAmount = projectCost - totalPaid
  const financialProgress = parseFloat(projetData.Etat_Avan_Finan || 0)
  const physicalProgress = parseFloat(projetData.Etat_Avan_Physi || 0)
console.log(partnerSummary)

  return (
    <div className="p-3 p-md-4 convention-visualisation-container bg-light" style={{ borderRadius: "15px", maxHeight: "90vh", overflowY: "auto" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-2">
        <div>
          <h5 className="text-muted  fw-bold"> DETAILS DU PROJET</h5>
          <h3 className="mb-0 fw-bold d-inline text-dark">{displayData(projetData.Nom_Projet)}
          <span className="text-muted  fw-semibold"> ({displayData(projetData.Code_Projet)}) </span></h3>
        </div>
        <Button variant="warning" onClick={onClose} className="btn rounded-5 px-5 fw-bold py-1 bg-warning shadow-sm" aria-label="Fermer">Revenir à la liste </Button>
      </div>

      <Row className="g-4 mb-4">
        {/* General Info Card */}
        <Col md={6} lg={4}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient" style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}><Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center"><FontAwesomeIcon icon={faInfoCircle} className="me-2 text-warning" />INFORMATIONS PROJET</Card.Title></Card.Header>
            <Card.Body>
              <dl className="row mb-0 dl-compact">
                <dt className="col-sm-5 text-muted">Maitre d'ouvrage:</dt><dd className="col-sm-7">{displayData(projetData.maitre_ouvrage)}</dd>
                <dt className="col-sm-5 text-muted">M.O. Délégué:</dt><dd className="col-sm-7">{displayData(projetData.maitre_ouvrage_delegue)}</dd>
                <dt className="col-sm-5 text-muted">Programme:</dt><dd className="col-sm-7" title={projetData.programme?.Description}>{displayData(projetData.programme?.Description)}</dd>
                <dt className="col-sm-5 text-muted">Secteur:</dt>
<dd className="col-sm-7">
    <Badge bg="info" text="dark">
        {displayData(projetData.secteur?.description_fr)}
    </Badge>
</dd>
              </dl>
            </Card.Body>
          </Card>
        </Col>

        {/* Location Card */}
        <Col md={6} lg={4}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient" style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}><Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center"><FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-warning" />LOCALISATION</Card.Title></Card.Header>
            <Card.Body>
              <h6 className="fw-semibold small text-dark">Provinces:</h6>
              <div className="d-flex flex-wrap mb-3">{projetData.provinces?.length > 0 ? projetData.provinces.map(p => (<Badge key={p.Id} bg="warning" text="dark" className="me-1 mb-1">{p.Description}</Badge>)) : "-"}</div>
              <h6 className="fw-semibold small text-dark">Communes:</h6>
              <div className="d-flex flex-wrap">{projetData.communes?.length > 0 ? projetData.communes.map(c => (<Badge key={c.Id} bg="light" text="dark" className="border me-1 mb-1">{c.Description}</Badge>)) : "-"}</div>
            </Card.Body>
          </Card>
        </Col>

        {/* Dates Card */}
        <Col md={12} lg={4}>
          <Card className="h-100 border-0 shadow-sm" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient" style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}><Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center"><FontAwesomeIcon icon={faCalendarAlt} className="me-2 text-warning" />DATES & DURÉE</Card.Title></Card.Header>
            <Card.Body>
              <dl className="row mb-0 dl-compact">
                <dt className="col-sm-5 text-muted">Durée:</dt><dd className="col-sm-7"><Badge bg="warning" text="dark">{displayData(projetData.duree_projet_mois)} mois</Badge></dd>
                <dt className="col-sm-5 text-muted">Début Prévu:</dt><dd className="col-sm-7">{formatDate(projetData.date_debut_prevue)}</dd>
                <dt className="col-sm-5 text-muted">Fin Prévue:</dt><dd className="col-sm-7">{formatDate(projetData.date_fin_prevue)}</dd>
                <dt className="col-sm-5 text-muted">Début Réelle:</dt><dd className="col-sm-7 fw-bold">{formatDate(projetData.Date_Debut)}</dd>
                <dt className="col-sm-5 text-muted">Fin Réelle:</dt><dd className="col-sm-7 fw-bold">{formatDate(projetData.Date_Fin)}</dd>
              </dl>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Financial Dashboard Card */}
      <Row className="g-4 mb-4">
        <Col>
          <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient" style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}><Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center"><FontAwesomeIcon icon={faPiggyBank} className="me-2 text-warning" />FINANCES & AVANCEMENT</Card.Title></Card.Header>
            <Card.Body>
              <Row className="align-items-center">
                <Col md={6} className="border-end-md">
                  <h6 className="fw-bold text-dark mb-3">Synthèse Financière</h6>
                  <dl className="row mb-0">
                    <dt className="col-sm-6 text-muted">Coût Projet Total:</dt><dd className="col-sm-6 fw-bold text-dark">{formatCurrency(projectCost)}</dd>
                    <dt className="col-sm-6 text-muted">Total Engagé Part.:</dt><dd className="col-sm-6">{formatCurrency(totalEngagedProject)}</dd>
                    <dt className="col-sm-6 text-muted">Total Versé Part.:</dt><dd className="col-sm-6 fw-bold text-success">{formatCurrency(totalPaid)}</dd>
                    <dt className="col-sm-6 text-muted">Reste à Financer:</dt><dd className={`col-sm-6 fw-bold ${remainingAmount > 0 ? "text-danger" : "text-info"}`}>{formatCurrency(remainingAmount)}</dd>
                  </dl>
                </Col>
                <Col md={6} className="mt-4 mt-md-0">
                  <h6 className="fw-bold text-dark mb-3">Progression</h6>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1"><small>Avancement Financier</small><Badge bg="warning" text="dark">{formatPercentage(financialProgress)}</Badge></div>
                    <ProgressBar now={financialProgress} variant="warning" style={{ height: "10px" }} className="shadow-sm rounded-pill" />
                  </div>
                  <div>
                    <div className="d-flex justify-content-between mb-1"><small>Avancement Physique</small><Badge bg="info">{formatPercentage(physicalProgress)}</Badge></div>
                    <ProgressBar now={physicalProgress} variant="info" style={{ height: "10px" }} className="shadow-sm rounded-pill" />
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Partners Contributions Card */}
      <Row className="g-4 mb-4">
        <Col>
          <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient" style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}><Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center"><FontAwesomeIcon icon={faUsers} className="me-2 text-warning" />CONTRIBUTIONS DES PARTENAIRES</Card.Title></Card.Header>
            <Card.Body>
              {Object.keys(partnerSummary).length > 0 ? (
                <Row className="g-3">
                  {Object.entries(partnerSummary).map(([partnerId, summary]) => {
                    const partnerRemaining = summary.totalEngaged - summary.totalVersed
                    const paymentRatio = summary.totalEngaged > 0 ? (summary.totalVersed / summary.totalEngaged) * 100 : 0
                    return (
                      <Col key={partnerId} md={6} lg={4}>
                        <Card className="h-100 shadow-sm border">
                          <Card.Header className="bg-white py-2 px-3"><h6 className="mb-0 text-dark fw-semibold text-truncate" title={summary.name}><FontAwesomeIcon icon={faBuilding} className="me-2 text-secondary" />{summary.name}</h6></Card.Header>
                          <Card.Body className="p-3">
                            <Row className="g-2 mb-3">
                              <Row className="p-2"><Col xs={6}><span className="small text-muted"><FontAwesomeIcon icon={faFileInvoiceDollar} className="me-2 text-info"/>Engagé</span></Col>
                              <Col xs={6} className="text-end fw-bold">{formatCurrency(summary.totalEngaged)}</Col>
                              </Row><Row className="p-2"><Col xs={6}><span className="small text-muted"><FontAwesomeIcon icon={faHandHoldingUsd} className="me-2 text-success"/>Versé</span></Col>
                              <Col xs={6} className="text-end fw-bold text-success">{formatCurrency(summary.totalVersed)}</Col>
                              </Row><Row ><Col xs={12}><hr className="my-1"/></Col></Row>
                              <Row className="p-2"><Col xs={6} className="fw-bold fs-5"><span className="small">Restant</span></Col>
                             <Col xs={6} className="text-end fs-5">{partnerRemaining > 0 ? (<Badge bg="warning "><span className="text-dark">{formatCurrency(partnerRemaining)}</span></Badge>) : (<Badge bg="success">Soldé <FontAwesomeIcon icon={faCheckCircle}/></Badge>)}</Col>
                            </Row> </Row>
                            <ProgressBar now={paymentRatio} variant="success" style={{ height: "6px" }} title={`Payé: ${paymentRatio.toFixed(1)}%`} />
                          </Card.Body>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              ) : ( <Alert variant="secondary" className="text-center m-0">Aucun engagement financier trouvé pour ce projet.</Alert> )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      {/* Follow-up & Notes Card */}
      <Row className="g-4">
        <Col>
          <Card className="border-0 shadow-sm" style={{ borderLeft: "4px solid #ffc107" }}>
             <Card.Header className="bg-gradient" style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}><Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center"><FontAwesomeIcon icon={faCommentDots} className="me-2 text-warning" />SUIVI & NOTES</Card.Title></Card.Header>
             <Card.Body>
                <Row>
                  <Col md={5}>
                    <h6 className="fw-bold small text-dark mb-2">POINTS FOCAUX</h6>
                    {getFonctionnaireNames(projetData.id_fonctionnaire)}
                  </Col>
                  <Col md={7} className="mt-3 mt-md-0">
                     <h6 className="fw-bold small text-dark mb-2">OBSERVATIONS</h6>
                     <div className="p-3 rounded-3" style={{ backgroundColor: "#fff8e1" }}>
                       <p className="mb-0 text-muted fst-italic small">{displayData(projetData.Observations, "Aucune observation.")}</p>
                     </div>
                  </Col>
                </Row>
             </Card.Body>
             <Card.Footer className="text-end bg-transparent border-0">
               <small className="text-muted">Créé le: {formatDate(projetData.created_at)} | Modifié le: {formatDate(projetData.updated_at)}</small>
             </Card.Footer>
          </Card>
        </Col>
      </Row>

    </div>
  )
}

ProjetVisualisation.propTypes = {
  itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired,
  baseApiUrl: PropTypes.string,
}

ProjetVisualisation.defaultProps = {
  baseApiUrl: "http://localhost:8000/api",
}

export default ProjetVisualisation