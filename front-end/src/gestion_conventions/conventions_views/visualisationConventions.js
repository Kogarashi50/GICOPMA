import { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faExclamationTriangle,
  faExternalLinkAlt,
  faCheckCircle,
  faTimesCircle,
  faUsers,
  faFilePdf,
  faFileWord,
  faFileImage,
  faFileExcel,
  faFileAlt,
  faCommentDots,
  faPiggyBank,
  faHandHoldingUsd,
  faTasks,
  faUserTie,
  faBuilding,
   faChevronDown, 
    faChevronUp,
  faMapMarkerAlt,
  faProjectDiagram,
  faClipboardList,
  faInfoCircle,
  faGift,
  faSitemap, // ADDED ICON
} from "@fortawesome/free-solid-svg-icons"
import Button from "react-bootstrap/Button"
import Card from "react-bootstrap/Card"
import Row from "react-bootstrap/Row"
import Col from "react-bootstrap/Col"
import Collapse from "react-bootstrap/Collapse"
import Alert from "react-bootstrap/Alert"
import PropTypes from "prop-types"
import Spinner from "react-bootstrap/Spinner"
import Badge from "react-bootstrap/Badge"
import Stack from "react-bootstrap/Stack"
import ProgressBar from "react-bootstrap/ProgressBar"
import ListGroup from "react-bootstrap/ListGroup"; // ADDED
import "./visualisation.css" // Ensure this path is correct

// --- Helper Functions ---
const formatCurrency = (cost) => {
  if (cost === 0 || cost === "0") {
    const options = { style: "currency", currency: "MAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }
    return (0).toLocaleString("fr-MA", options)
  }
  const number = Number.parseFloat(cost)
  if (isNaN(number) || number === null || number === undefined) return "-"
  const options = { style: "currency", currency: "MAD", minimumFractionDigits: 2, maximumFractionDigits: 2 }
  return number.toLocaleString("fr-MA", options)
}
const displayData = (data, fallback = "-") =>
  data !== null && data !== undefined && String(data).trim() !== "" ? data : fallback
const STATUT_OPTIONS = [
  { value: "non approuvé", label: "Non Approuvé", color: "danger" },
  { value: "en cours d'approbation", label: "En Cours d'Approbation", color: "warning" },
  { value: "approuvé", label: "Approuvé", color: "success" },
  { value: "non visé", label: "Non Visé", color: "danger" },
  { value: "en cours de visa", label: "En Cours de Visa", color: "warning" },
  { value: "visé", label: "Visé", color: "info" },
  { value: "non signé", label: "Non Signé", color: "secondary" },
  { value: "en cours de signature", label: "En Cours de Signature", color: "warning" },
  { value: "signé", label: "Signé", color: "primary" },
]
const getStatusColor = (statusValue) => {
  const option = STATUT_OPTIONS.find((opt) => opt.value === statusValue)
  return option ? option.color : "light"
}
const getFileIcon = (mimeTypeOrName) => {
  if (!mimeTypeOrName) return faFileAlt
  const lowerCase = String(mimeTypeOrName).toLowerCase()
  if (lowerCase.includes("pdf")) return faFilePdf
  if (lowerCase.includes("doc") || lowerCase.includes("word")) return faFileWord
  if (lowerCase.includes("xls") || lowerCase.includes("excel") || lowerCase.includes("spreadsheetml"))
    return faFileExcel
  if (
    ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"].some((ext) => lowerCase.endsWith(ext)) ||
    lowerCase.startsWith("image/")
  )
    return faFileImage
  return faFileAlt
}

// --- Component Definition ---
const ConventionVisualisation = ({ itemId, onClose, baseApiUrl = "http://localhost:8000/api" }) => {
  // --- State ---
  const [conventionData, setConventionData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [provincesList, setProvincesList] = useState([])
  const [fonctionnairesList, setFonctionnairesList] = useState([])
  const [openPartnerId, setOpenPartnerId] = useState(null); 
 const handleTogglePartner = (partnerId) => {
    setOpenPartnerId(currentOpenId => (currentOpenId === partnerId ? null : partnerId));
  };
  const getMonthName = (monthNumber) => {
    const monthMap = {
      1: "Janvier", 2: "Février", 3: "Mars", 4: "Avril", 5: "Mai", 6: "Juin",
      7: "Juillet", 8: "Août", 9: "Septembre", 10: "Octobre", 11: "Novembre", 12: "Décembre",
    }
    const num = Number.parseInt(monthNumber, 10)
    return monthMap[num] || displayData(monthNumber)
  }

  const appBaseUrl = useMemo(() => {
    if (!baseApiUrl) {
      console.error("VISU CONV: baseApiUrl prop is missing!")
      return ""
    }
    try {
      return baseApiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "")
    } catch (e) {
      console.error("VISU CONV: Error processing baseApiUrl:", e)
      return ""
    }
  }, [baseApiUrl])

  // --- Data Fetching Logic ---
  const fetchData = useCallback(async () => {
    if (!itemId || !baseApiUrl) {
      const missing = []
      if (!itemId) missing.push("ID de convention")
      if (!baseApiUrl) missing.push("URL d'API (baseApiUrl)")
      setError(`VISU CONV: Informations manquantes pour charger les données: ${missing.join(", ")}.`)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setConventionData(null)
    setProvincesList([])
    setFonctionnairesList([])

    console.log(`VISU CONV: Fetching convention ${itemId}`)
    try {
      const conventionRes = await axios.get(`${baseApiUrl}/conventions/${itemId}`, { withCredentials: true })
      const convention = conventionRes.data.convention || conventionRes.data

      if (convention && typeof convention === "object" && Object.keys(convention).length > 0) {
        console.log("VISU CONV: Convention data received:", convention)
        convention.partner_commitments = convention.partner_commitments || []
        convention.documents = convention.documents || []
        setConventionData(convention)

        const auxiliaryFetches = await Promise.allSettled([
          axios.get(`${baseApiUrl}/options/provinces`, { withCredentials: true }),
          axios.get(`${baseApiUrl}/options/fonctionnaires`, { withCredentials: true }),
        ])

        if (auxiliaryFetches[0].status === "fulfilled") {
          const provincesRes = auxiliaryFetches[0].value
          const provDataPayload = provincesRes.data.provinces || provincesRes.data.data || provincesRes.data
          const provDataArray = Array.isArray(provDataPayload) ? provDataPayload : []
          setProvincesList(
            provDataArray.map((p) => ({
              value: p.Id || p.id || p.value,
              label: p.Description || p.Nom || p.Code || p.label || `ID: ${p.Id || p.id}`,
            })),
          )
          console.log(`VISU CONV: Processed ${provDataArray.length} provinces.`)
        } else {
          console.warn("VISU CONV: Could not fetch provinces list:", auxiliaryFetches[0].reason?.message)
        }

        if (auxiliaryFetches[1].status === "fulfilled") {
          const foncRes = auxiliaryFetches[1].value
          const foncDataPayload = foncRes.data.fonctionnaires || foncRes.data.data || foncRes.data

          if (Array.isArray(foncDataPayload)) {
            setFonctionnairesList(
              foncDataPayload.map((f) => ({
                value: f.id,
                label: f.nom_complet || f.Nom_Fonctionnaire || f.nom || f.name || `ID: ${f.id}`,
              })),
            )
            console.log(`VISU CONV: Processed ${foncDataPayload.length} fonctionnaires.`)
          } else {
            console.error("VISU CONV: Data for /options/fonctionnaires was NOT an array.", foncDataPayload)
            setError((prev) => (prev ? prev + "\n" : "") + "Format incorrect pour la liste des fonctionnaires.")
          }
        } else {
          console.warn("VISU CONV: Could not fetch fonctionnaires list:", auxiliaryFetches[1].reason?.message)
          setError((prev) => (prev ? prev + "\n" : "") + "Erreur de chargement des fonctionnaires.")
        }
      } else {
        throw new Error(`VISU CONV: Aucune donnée trouvée pour la convention ID ${itemId}.`)
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || `VISU CONV: Erreur de chargement (ID: ${itemId}).`
      setError(errorMsg + (err.response ? ` (Status: ${err.response.status})` : ""))
      console.error("VISU CONV: Global fetch error:", err.response || err)
    } finally {
      setLoading(false)
    }
  }, [itemId, baseApiUrl])

  useEffect(() => {
    fetchData()
  }, [fetchData])
const renderYearlyBreakdown = (engagements) => {
        if (!engagements || engagements.length === 0) {
            return (
                <div className="text-center text-muted fst-italic small py-2">
                    Aucune répartition annuelle prévisionnelle n'a été fournie.
                </div>
            );
        }

        const sortedEngagements = [...engagements].sort((a, b) => a.annee - b.annee);
 return (
           <div className="mt-2 yearly-breakdown-container pt-3">
            <div className="d-flex justify-content-between border border-warning border-1 px-3 py-2 mb-2 rounded-5 bg-white">
                <h6 className="text-secondary small fw-bold mb-0">Année</h6>
                <h6 className="text-secondary small fw-bold mb-0">Montant Prévisionnel</h6>
            </div>
            <div className=" rounded-4 border border-warning bg-white ">
                    <hr className="py-0 my-0 mx-4 px-2  text-warning"/>
                {sortedEngagements.map(({ annee, montant_prevu }, index) => (
                    <><div
                        key={annee}
                        className={`d-flex justify-content-between m-2  align-items-center px-2 `}
                    >
                        <span className="fw-medium text-dark">{annee}</span>
                        <span className="fw-bold text-dark">{formatCurrency(montant_prevu)}</span>

                    </div>
                    <hr className="py-0 my-0 mx-4 px-2  text-warning"/>
                    </>
                ))}
            </div>
        </div>
        );
    };
  const getProvinceNames = useCallback(
    (localisationString) => {
      if (
        !localisationString ||
        typeof localisationString !== "string" ||
        !Array.isArray(provincesList) ||
        provincesList.length === 0
      )
        return displayData(null)
      const ids = localisationString
        .split(";")
        .map((id) => id.trim())
        .filter((id) => id)
      if (ids.length === 0) return displayData(null)
      return (
        <Stack direction="horizontal" gap={1} wrap="wrap">
          {ids.map((id) => {
            const province = provincesList.find((p) => String(p.value).toLowerCase() === String(id).toLowerCase())
            return (
              <Badge key={id} pill bg="light" text="dark" className="border me-1 mb-1">
                {province?.label || `ID ${id}`}
              </Badge>
            )
          })}
        </Stack>
      )
    },
    [provincesList],
  )

  const getFonctionnaireNames = useCallback(
    (fonctionnaireIdString) => {
      if (!fonctionnaireIdString || typeof fonctionnaireIdString !== "string") return displayData(null, "Aucun ID")
      if (!Array.isArray(fonctionnairesList)) {
        return <span className="text-danger">Erreur: Liste fonctionnaires invalide</span>
      }
      if (fonctionnairesList.length === 0 && fonctionnaireIdString.trim() !== "") {
        return <span className="text-warning fst-italic">Chargement... (IDs: {fonctionnaireIdString})</span>
      }
      const ids = fonctionnaireIdString
        .split(";")
        .map((id) => id.trim())
        .filter((id) => id)
      if (ids.length === 0) return displayData(null, "Non spécifié")
      return (
        <Stack direction="horizontal" gap={1} wrap="wrap">
          {ids.map((id) => {
            const fonctionnaire = fonctionnairesList.find(
              (f) => String(f.value).toLowerCase() === String(id).toLowerCase(),
            )
            return (
              <Badge key={id} pill bg="info" text="dark" className="border me-1 mb-1">
                {fonctionnaire?.label || `ID Point Focal: ${id}`}
              </Badge>
            )
          })}
        </Stack>
      )
    },
    [fonctionnairesList],
  )

  const globalFinancialSummary = useMemo(() => {
    if (!conventionData)
      return { coutGlobal: 0, totalMontantVerse: 0, resteAFinancer: 0, progression: 0, isComplete: false }
    const coutGlobal = Number.parseFloat(conventionData.Cout_Global) || 0
    const totalMontantVerse = (conventionData.partner_commitments || [])
      .filter((p) => !p.autre_engagement)
      .reduce((sum, p) => sum + (Number.parseFloat(p.Montant_Verse) || 0), 0)
    const resteAFinancer = coutGlobal - totalMontantVerse
    const progression =
      coutGlobal > 0 ? Math.min(100, (totalMontantVerse / coutGlobal) * 100) : totalMontantVerse > 0 ? 100 : 0
    const isComplete = totalMontantVerse >= coutGlobal
    return { coutGlobal, totalMontantVerse, resteAFinancer, progression, isComplete }
  }, [conventionData])

  if (loading) {
    return (
      <div className="text-center p-5 d-flex justify-content-center align-items-center" style={{ minHeight: "300px" }}>
        <Spinner animation="border" variant="primary" className="me-3" />
        <span className="text-muted">Chargement...</span>
      </div>
    )
  }
  if (error) {
    return (
      <Alert variant="danger" className="m-3 m-md-4">
        <Alert.Heading>
          <FontAwesomeIcon icon={faExclamationTriangle} className="me-2" /> Erreur
        </Alert.Heading>
        <p>{error}</p>
        <hr />
        <div className="d-flex justify-content-end">
          <Button onClick={onClose} variant="outline-danger" size="sm">
            Fermer
          </Button>
        </div>
      </Alert>
    )
  }
  if (!conventionData) {
    return (
      <Alert variant="secondary" className="m-3 m-md-4">
        Aucune donnée disponible.
        <Button variant="link" size="sm" onClick={onClose} className="float-end">
          Fermer
        </Button>
      </Alert>
    )
  }

  const { coutGlobal, totalMontantVerse, resteAFinancer, progression, isComplete } = globalFinancialSummary

  return (
    <div
      className="p-3 p-md-4 convention-visualisation-container bg-light"
      style={{ borderRadius: "15px", maxHeight: "90vh", overflowY: "auto", fontSize: "15px" }}
    >
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom border-2">
        <h3 className="mb-0 fw-bold text-dark">Détails Convention: {displayData(conventionData.Code)}</h3>
        <Button
          variant="warning"
          onClick={onClose}
          className="btn rounded-5 px-5 fw-bold py-1 bg-warning shadow-sm"
          aria-label="Fermer"
        >
          Revenir a la liste
        </Button>
      </div>

      <Row className="g-4 mb-4">
        <Col md={6} lg={7}>
          <Card className="h-100 border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header
              className="bg-gradient"
              style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}
            >
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-warning" />
                INFORMATIONS GÉNÉRALES
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <dl className="row mb-0 dl-compact">
                <dt className="col-sm-4 text-muted fw-semibold">Code:</dt>
                <dd className="col-sm-8 fw-bold text-dark" style={{ color: "#212529" }}>
                  {displayData(conventionData.Code)}
                </dd>
                {/* ADDED: Display code_provisoire if it exists */}
                {conventionData.code_provisoire && (
                    <>
                        <dt className="col-sm-4 text-muted fw-semibold">Code Provisoire:</dt>
                        <dd className="col-sm-8 text-dark">{displayData(conventionData.code_provisoire)}</dd>
                    </>
                )}
                <dt className="col-sm-4 text-muted fw-semibold">Intitulé:</dt>
                <dd className="col-sm-8 text-dark">{displayData(conventionData.Intitule)}</dd>
                <dt className="col-sm-4 text-muted fw-semibold">Référence:</dt>
                <dd className="col-sm-8 text-dark">{displayData(conventionData.Reference)}</dd>
                <dt className="col-sm-4 text-muted fw-semibold">Année Conv:</dt>
                <dd className="col-sm-8 text-dark">{displayData(conventionData.Annee_Convention)}</dd>
                <dt className="col-sm-4 text-muted fw-semibold">Durée:</dt>
                <dd className="col-sm-8 text-dark">
                  <Badge bg="warning" text="dark" className="px-2 py-1">
                    {displayData(conventionData.duree_convention)} mois
                  </Badge>
                </dd>
                <dt className="col-sm-4 text-muted fw-semibold">N° Approbation:</dt>
                <dd className="col-sm-8 text-dark">{displayData(conventionData.numero_approbation)}</dd>
                <dt className="col-sm-4 text-muted fw-semibold">Session:</dt>
                <dd className="col-sm-8 text-dark">{getMonthName(conventionData.session)}</dd>
                <dt className="col-sm-4 text-muted fw-semibold">Maitre Ouvrage:</dt>
                <dd className="col-sm-8 text-dark fw-medium">{displayData(conventionData.Maitre_Ouvrage)}</dd>
                <dt className="col-sm-4 text-muted fw-semibold">M.O. Délégué:</dt>
                <dd className="col-sm-8 text-dark">{displayData(conventionData.maitre_ouvrage_delegue)}</dd>
              </dl>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={5}>
          <Card className="h-100 border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header
              className="bg-gradient"
              style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}
            >
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faTasks} className="me-2 text-warning" />
                STATUT & GROUPE
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <dl className="row mb-0 dl-compact">
                <dt className="col-sm-5 text-muted fw-semibold">Statut:</dt>
                <dd className="col-sm-7">
                  <Badge
                    bg={getStatusColor(conventionData.Statut)}
                    text={["warning", "light"].includes(getStatusColor(conventionData.Statut)) ? "dark" : "white"}
                    className="px-3 py-2 rounded-pill shadow-sm"
                    style={{ fontSize: "0.85rem" }}
                  >
                    {displayData(conventionData.Statut)}
                  </Badge>
                </dd>
                {conventionData.Statut === "visé" && (
                  <>
                    {conventionData.date_visa && (
                      <>
                        <dt className="col-sm-5 text-muted fw-semibold">Date Visa:</dt>
                        <dd className="col-sm-7 fw-medium text-success">{displayData(conventionData.date_visa)}</dd>
                      </>
                    )}
                    {conventionData.date_reception_vise && (
                      <>
                        <dt className="col-sm-5 text-muted fw-semibold">Date Réception:</dt>
                        <dd className="col-sm-7 fw-medium text-success">
                          {displayData(conventionData.date_reception_vise)}
                        </dd>
                      </>
                    )}
                  </>
                )}
                <dt className="col-sm-5 text-muted fw-semibold">Operationnel:</dt>
                <dd className="col-sm-7 text-dark">{displayData(conventionData.Operationalisation)}</dd>
              </dl>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col>
          <Card className="h-100 border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header
              className="bg-gradient"
              style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}
            >
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faProjectDiagram} className="me-2 text-warning" />
                TYPE & RATTACHEMENT
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <div className="text-center mb-4">
                <Badge
                  pill
                  bg="warning"
                  text="dark"
                  className="px-4 py-2 shadow-sm"
                  style={{ fontSize: "1.1rem", fontWeight: "600" }}
                >
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  {displayData(conventionData.type).toUpperCase()}
                </Badge>
              </div>

              {conventionData.type === "cadre" && (
                <div
                  className="text-center p-3 rounded-3"
                  style={{ backgroundColor: "#fff8e1", border: "1px solid #ffc107" }}
                >
                  <FontAwesomeIcon icon={faClipboardList} className="text-warning fa-2x mb-2" />
                  <h6 className="fw-bold text-dark mb-1">Programme Associé</h6>
                  <p className="mb-0 fw-medium text-dark">{displayData(conventionData.programme?.Description)}</p>
                </div>
              )}

              {/* MODIFIED: Updated this block to show both parent convention and project */}
              {conventionData.type === "specifique" && (
                <Row>
                    <Col md={6} className="mb-3 mb-md-0">
                        <div className="h-100 text-center p-3 rounded-3" style={{ backgroundColor: "#fff8e1", border: "1px solid #ffc107" }}>
                            <FontAwesomeIcon icon={faSitemap} className="text-warning fa-2x mb-2" />
                            <h6 className="fw-bold text-dark mb-1">Rattachée à la Convention Cadre</h6>
                            <p className="mb-0 fw-medium text-dark">{displayData(conventionData.convention_cadre?.code)}</p>
                            <small className="text-muted">{displayData(conventionData.convention_cadre?.intitule, '')}</small>
                        </div>
                    </Col>
                    <Col md={6}>
                        <div className="h-100 text-center p-3 rounded-3" style={{ backgroundColor: "#fff8e1", border: "1px solid #ffc107" }}>
                            <FontAwesomeIcon icon={faProjectDiagram} className="text-warning fa-2x mb-2" />
                            <h6 className="fw-bold text-dark mb-1">Projet Associé</h6>
                            <p className="mb-0 fw-medium text-dark">{displayData(conventionData.projet?.Nom_Projet)}</p>
                        </div>
                    </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* START: ADDED NEW SECTION FOR CHILD CONVENTIONS */}
      {conventionData.type === 'cadre' && (
        <Row className="g-4 mb-4">
            <Col>
                <Card className="border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
                    <Card.Header className="bg-gradient" style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}>
                        <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                            <FontAwesomeIcon icon={faSitemap} className="me-2 text-warning" />
                            CONVENTIONS SPÉCIFIQUES RATTACHÉES
                        </Card.Title>
                    </Card.Header>
                    <Card.Body className="p-0" style={{ backgroundColor: "#fefefe" }}>
                        {conventionData.conventions_specifiques && conventionData.conventions_specifiques.length > 0 ? (
                            <ListGroup variant="flush">
                                {conventionData.conventions_specifiques.map(specifique => (
                                    <ListGroup.Item key={specifique.id} className="px-3 py-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className="flex-grow-1 me-3">
                                                <h6 className="mb-0 fw-bold text-dark">{specifique.code}</h6>
                                                <p className="mb-1 text-muted small">{specifique.intitule}</p>
                                                {specifique.projet && (
                                                    <Badge bg="light" text="dark" className="border">
                                                        <FontAwesomeIcon icon={faProjectDiagram} className="me-1"/>
                                                        {specifique.projet.Nom_Projet}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex-shrink-0">
                                                <Badge
                                                    bg={getStatusColor(specifique.Statut)}
                                                    text={["warning", "light"].includes(getStatusColor(specifique.Statut)) ? "dark" : "white"}
                                                    className="px-2 py-1"
                                                >
                                                    {displayData(specifique.Statut)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        ) : (
                            <div className="text-center py-4">
                                <FontAwesomeIcon icon={faInfoCircle} className="text-muted fa-2x mb-2" />
                                <p className="text-muted mb-0 fst-italic">Aucune convention spécifique n'est rattachée.</p>
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
      )}
      {/* END: ADDED NEW SECTION */}

      <Row className="g-4 mb-4">
        <Col lg={6}>
          <Card className="h-100 border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header
              className="bg-gradient"
              style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}
            >
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faClipboardList} className="me-2 text-warning" />
                OBJET & OBJECTIFS
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <div className="mb-4">
                <div className="d-flex align-items-center mb-2">
                  <div className="bg-warning rounded-circle p-1 me-2" style={{ width: "8px", height: "8px" }}></div>
                  <h6 className="fw-bold mb-0 text-dark">Objet</h6>
                </div>
                <p className="mb-0 text-muted ps-3" style={{ lineHeight: "1.6" }}>
                  {displayData(conventionData.Objet)}
                </p>
              </div>

              <div className="mb-4">
                <div className="d-flex align-items-center mb-2">
                  <div className="bg-warning rounded-circle p-1 me-2" style={{ width: "8px", height: "8px" }}></div>
                  <h6 className="fw-bold mb-0 text-dark">Objectifs</h6>
                </div>
                <p className="mb-0 text-muted ps-3" style={{ lineHeight: "1.6" }}>
                  {displayData(conventionData.Objectifs)}
                </p>
              </div>

              <div className="border-top pt-3" style={{ borderColor: "#ffc107 !important" }}>
                <div className="d-flex align-items-center mb-2">
                  <FontAwesomeIcon icon={faCommentDots} className="me-2 text-warning" />
                  <h6 className="fw-bold mb-0 text-dark">Observations</h6>
                </div>
                <div className="p-2 rounded-3" style={{ backgroundColor: "#fff8e1" }}>
                  <p className="mb-0 text-muted fst-italic">
                    {displayData(conventionData.observations, "Aucune observation.")}
                  </p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="h-100 border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header
              className="bg-gradient"
              style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}
            >
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-warning" />
                LOCALISATION & POINTS FOCAUX
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <div className="mb-4">
                <div className="d-flex align-items-center mb-3">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-warning" />
                  <h6 className="fw-bold mb-0 text-dark">Localisation</h6>
                </div>
                <div className="ps-3">{getProvinceNames(conventionData.localisation)}</div>
              </div>

              <div className="border-top pt-3" style={{ borderColor: "#ffc107 !important" }}>
                <div className="d-flex align-items-center mb-3">
                  <FontAwesomeIcon icon={faUserTie} className="me-2 text-warning" />
                  <h6 className="fw-bold mb-0 text-dark">Points Focaux</h6>
                </div>
                <div className="ps-3">{getFonctionnaireNames(conventionData.id_fonctionnaire)}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col>
          <Card className="border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header
              className="bg-gradient"
              style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}
            >
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faFilePdf} className="me-2 text-warning" />
                FICHIERS ASSOCIÉS
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              {conventionData.documents && conventionData.documents.length > 0 ? (
                <div className="d-flex flex-row flex-wrap justify-content-start gap-3">
                  {conventionData.documents.map((doc) => {
                    const fileDisplayUrl =
                      appBaseUrl && doc.file_path ? `${appBaseUrl}/${doc.file_path.replace(/^\\/, "")}` : doc.url
                    const fileIcon = getFileIcon(doc.file_type || doc.file_name)
                    const fileSizeMB = doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) : null
                    const mainTitle = doc.Intitule || doc.file_name || 'Fichier'
                    const secondaryTitle = doc.Intitule ? (doc.file_name || '') : ''
                    return (
                      <div
                        key={doc.Id_Doc}
                        className="p-3 rounded-4 shadow-sm border position-relative"
                        style={{
                          minWidth: "280px",
                          maxWidth: "45%",
                          background: "linear-gradient(135deg, #212529 0%, #343a40 100%)",
                          borderColor: "#ffc107 !important",
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className="p-2 rounded-3 me-3" style={{ backgroundColor: "#ffc107" }}>
                            <FontAwesomeIcon
                              icon={fileIcon}
                              className="text-dark fa-lg"
                              style={{ width: "20px" }}
                              title={doc.file_type || "Type inconnu"}
                            />
                          </div>
                          <div className="flex-grow-1 text-truncate me-2">
                            {fileDisplayUrl ? (
                              <a
                                href={fileDisplayUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="link-light text-decoration-none fw-medium stretched-link"
                                title={`Ouvrir: ${displayData(mainTitle, "Fichier")}`}
                              >
                                {displayData(mainTitle, "Fichier sans nom")}
                              </a>
                            ) : (
                              <span className="text-white fw-medium" title={displayData(mainTitle, "")}>
                                {displayData(mainTitle, "Fichier (lien indisponible)")}
                              </span>
                            )}
                            <small className="d-block text-warning">
                              {secondaryTitle || ''}{secondaryTitle && fileSizeMB ? ' - ' : ''}{fileSizeMB ? `${fileSizeMB} Mo` : ''}
                            </small>
                          </div>
                          {fileDisplayUrl && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="ms-2 flex-shrink-0 rounded-3"
                              onClick={() => window.open(fileDisplayUrl, "_blank")}
                              title="Ouvrir dans un nouvel onglet"
                            >
                              <FontAwesomeIcon icon={faExternalLinkAlt} />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FontAwesomeIcon icon={faFileAlt} className="text-muted fa-3x mb-3" />
                  <p className="text-muted mb-0 fst-italic">Aucun fichier associé.</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col>
          <Card className="border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header
              className="bg-gradient"
              style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}
            >
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faUsers} className="me-2 text-warning" />
                COMITÉS DE SUIVI
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <Row>
                <Col md={6} className="mb-3 mb-md-0">
                  <div
                    className="h-100 p-3 rounded-3"
                    
                  >
                    <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                      <FontAwesomeIcon icon={faUsers} className="me-2 text-warning" />
                      Comité Technique
                    </h6>
                    {conventionData.membres_comite_technique && conventionData.membres_comite_technique.length > 0 ? (
                      <div className="d-flex flex-row gap-2">
                        {conventionData.membres_comite_technique.map((member, index) => (
                          <div key={index} className="d-flex align-items-center  p-2 bg-white rounded-2 shadow-sm">
                            <FontAwesomeIcon icon={faUserTie} className="me-2 text-dark" />
                            <span className="text-dark">{member}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <FontAwesomeIcon icon={faUsers} className="text-muted fa-2x mb-2" />
                        <p className="text-muted mb-0 fst-italic">Aucun membre défini.</p>
                      </div>
                    )}
                  </div>
                </Col>
                <Col md={6}>
                  <div
                    className="h-100 p-3 rounded-3"
                  >
                    <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                      <FontAwesomeIcon icon={faUsers} className="me-2 text-warning" />
                      Comité de Pilotage
                    </h6>
                    {conventionData.membres_comite_pilotage && conventionData.membres_comite_pilotage.length > 0 ? (
                      <div className="d-flex flex-row gap-2">
                        {conventionData.membres_comite_pilotage.map((member, index) => (
                          <div key={index} className="d-flex align-items-center p-2 bg-white rounded-2 shadow-sm">
                            <FontAwesomeIcon icon={faUserTie} className="me-2 text-dark" />
                            <span className="text-dark">{member}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <FontAwesomeIcon icon={faUsers} className="text-muted fa-2x mb-2" />
                        <p className="text-muted mb-0 fst-italic">Aucun membre défini.</p>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col>
          <Card className="border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header
              className="bg-gradient"
              style={{ background: "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)" }}
            >
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faHandHoldingUsd} className="me-2 text-warning" />
                ENGAGEMENTS PARTENAIRES
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              {conventionData.partner_commitments && conventionData.partner_commitments.length > 0 ? (
                <div
                  className="partner-list-container"
                  style={{ maxHeight: "450px", overflowY: "auto", paddingRight: "10px" }}
                >
                  <div className="d-flex flex-row wrap  justify-content-between" >
                    {conventionData.partner_commitments.map((p, index) => {
                      const montantConvenu = Number.parseFloat(p.Montant_Convenu) || 0
                      const montantVerse = Number.parseFloat(p.Montant_Verse) || 0
                      const solde = montantConvenu - montantVerse
                      return (
                        <div
                          key={p.Id_CP || index}
                          className="p-3 rounded-3 m-1 w-100 shadow-sm"
                          style={{
                            border: "0.1px solid #c2c2c2ff",
                          }}
                        >
                          <Row className="align-items-center mb-3" >
                            <Col md={8}>
                              <div className="d-flex align-items-center">
                                <FontAwesomeIcon icon={faBuilding} className="me-2 text-warning fa-lg" />
                                <strong className="text-dark fs-6">{displayData(p.label)}</strong>
                              </div>
                            </Col>
                            <Col md={4} className="text-md-end">
                              {p.is_signatory ? (
                                <Badge bg="success" pill className="px-3 py-2 shadow-sm">
                                  <FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Signataire
                                </Badge>
                              ) : (
                                <Badge bg="secondary" pill className="px-3 py-2 shadow-sm">
                                  <FontAwesomeIcon icon={faTimesCircle} className="me-1" /> Non Signataire
                                </Badge>
                              )}
                            </Col>
                          </Row>

                          {p.autre_engagement ? (
                            <div className="p-3  rounded-3  shadow-sm" style={{backgroundColor:"#f8f8f8ff"}}>
                              <div className="d-flex align-items-center mb-2">
                                <FontAwesomeIcon icon={faGift} className="me-2 text-warning" />
                                <h6 className="mb-0 fw-bold text-dark">Engagement Non-Financier</h6>
                              </div>
                              <p className="mb-0 fw-medium fst-italic text-dark">{p.autre_engagement}</p>
                            </div>
                          ) : (
                            <div className="p-3  rounded-3 shadow-sm" style={{backgroundColor:"#f8f8f8ff"}}>
                              <Row className="mb-2" >
                                <Col xs={6} className="text-muted fw-semibold">
                                  Montant Convenu:
                                </Col>
                                <Col xs={6} className="fw-bold text-dark text-end">
                                  {formatCurrency(montantConvenu)}
                                </Col>
                              </Row>
                              <Row className="mb-2">
                                <Col xs={6} className="text-muted fw-semibold">
                                  Montant Versé:
                                </Col>
                                <Col xs={6} className="text-success fw-bold text-end">
                                  {formatCurrency(montantVerse)}
                                </Col>
                              </Row>
                              <hr className="my-2" style={{ borderColor: "#ffc107" }} />
                              <Row>
                                <Col xs={6} className="fw-bold text-dark">
                                  Solde:
                                </Col>
                                <Col xs={6} className="text-end">
                                  {montantVerse >= montantConvenu ? (
                                    <Badge bg="success" className="px-2 py-1">
                                      Soldé <FontAwesomeIcon icon={faCheckCircle} />
                                    </Badge>
                                  ) : (
                                    <Badge bg="danger" className="px-2 py-1">
                                      Reste: {formatCurrency(solde)}
                                    </Badge>
                                  )}
                                </Col>
                              </Row>
                                {p.engagements_annuels && p.engagements_annuels.length > 0 && (
                        <div className="mt-3 border-top pt-2" style={{ borderColor: "#e9ecef" }}>
                            <Button
                                onClick={() => handleTogglePartner(p.Id_CP)}
                                variant="link"
                                className="d-flex justify-content-between align-items-center w-100 text-decoration-none p-0"
                                aria-controls={`collapse-partner-${p.Id_CP}`}
                                aria-expanded={openPartnerId === p.Id_CP}
                            >
                                <h6 className="small fw-bold text-dark mb-0">
                                    Répartition Annuelle
                                </h6>
                                <FontAwesomeIcon
                                    icon={openPartnerId === p.Id_CP ? faChevronUp : faChevronDown}
                                    className="text-muted"
                                />
                            </Button>
                            <Collapse in={openPartnerId === p.Id_CP}>
                                <div id={`collapse-partner-${p.Id_CP}`}>
                                    {renderYearlyBreakdown(p.engagements_annuels)}
                                </div>
                            </Collapse>
                        </div>
                    )}
                
                            </div>
                          )}

                          {p.is_signatory && (p.date_signature || p.details_signature) && (
                            <div className="mt-3 p-2 rounded-3 border-start border-warning border-3" style={{backgroundColor:"#fff8e1"}}>
                              <small className="text-muted">
                                <strong>Signature:</strong> {displayData(p.date_signature)}
                                {p.date_signature && p.details_signature && <span className="mx-2">|</span>}
                                {displayData(p.details_signature)}
                              </small>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-5">
                  <FontAwesomeIcon icon={faHandHoldingUsd} className="text-muted fa-3x mb-3" />
                  <p className="text-muted mb-0 fst-italic">Aucun engagement partenaire associé.</p>
                </div>
              )}
            </Card.Body>

            <div className="border-top" style={{ borderColor: "#ffc107 !important" }}>
              <Card.Body className="pt-4" >
                <h6 className="mb-4 fw-bold text-dark text-center d-flex align-items-center justify-content-center">
                  <FontAwesomeIcon icon={faPiggyBank} className="me-2 text-warning" />
                  SYNTHÈSE FINANCIÈRE GLOBALE
                </h6>
                <Row className="align-items-center">
                  <Col md={6}>
                    <div className="p-3 bg-white rounded-3 shadow-sm">
                      <dl className="row mb-0">
                        <dt className="col-sm-7 text-muted">
                          <FontAwesomeIcon icon={faPiggyBank} className="me-2 text-warning" />
                          Coût Global Conv.:
                        </dt>
                        <dd className="col-sm-5 fw-bold text-dark text-end">{formatCurrency(coutGlobal)}</dd>
                        <dt className="col-sm-7 text-muted">
                          <FontAwesomeIcon icon={faHandHoldingUsd} className="me-2 text-success" />
                          Total Versé:
                        </dt>
                        <dd className="col-sm-5 fw-bold text-success text-end">{formatCurrency(totalMontantVerse)}</dd>
                      </dl>
                    </div>
                  </Col>
                  <Col md={6} className="d-flex align-items-center mt-3 mt-md-0">
                    {isComplete ? (
                      <div className="w-100 p-3 bg-success text-white text-center rounded-3 shadow-sm">
                        <FontAwesomeIcon icon={faCheckCircle} className="me-2 fa-lg" />
                        <strong>Financement Atteint!</strong>
                      </div>
                    ) : (
                      <div className="w-100">
                        <div className="d-flex justify-content-between mb-2">
                          <span className="fw-bold text-dark">
                            <FontAwesomeIcon icon={faTasks} className="me-1 text-danger" />
                            Reste: {formatCurrency(resteAFinancer)}
                          </span>
                          <Badge bg="warning" text="dark" className="px-2 py-1">
                            {progression.toFixed(1)}%
                          </Badge>
                        </div>
                        <ProgressBar
                          now={progression}
                          variant="warning"
                          style={{ height: "12px" }}
                          className="shadow-sm rounded-pill"
                          title={`Progression: ${progression.toFixed(1)}%`}
                        />
                      </div>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

// --- PropTypes ---
ConventionVisualisation.propTypes = {
  itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired,
  baseApiUrl: PropTypes.string,
}

// --- Default Props ---
ConventionVisualisation.defaultProps = {
  baseApiUrl: "http://localhost:8000/api",
}

export default ConventionVisualisation;
