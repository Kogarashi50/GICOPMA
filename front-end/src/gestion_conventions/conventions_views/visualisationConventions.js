// src/pages/visualisationConventions.jsx (Full Merged & Final Version)

import { useState, useEffect, useCallback, useMemo } from "react"
import axios from "axios"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faExclamationTriangle, faExternalLinkAlt, faCheckCircle, faTimesCircle, faUsers,
  faFilePdf, faFileWord, faFileImage, faFileExcel, faFileAlt, faCommentDots,
  faPiggyBank, faHandHoldingUsd, faTasks, faUserTie, faBuilding, faChevronDown, faChevronUp,
  faMapMarkerAlt, faProjectDiagram, faClipboardList, faInfoCircle, faGift, faSitemap,
  faHandshake, faTools,faGavel,
faMapPin, faClock, faClipboardCheck
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
import ListGroup from "react-bootstrap/ListGroup";
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
  const [communesList, setCommunesList] = useState([]); // --- ADD THIS LINE ---
  const [openPartnerId, setOpenPartnerId] = useState(null);
    const [maitresOuvrageList, setMaitresOuvrageList] = useState([]); // <-- ADD THIS
  const [maitresOuvrageDeleguesList, setMaitresOuvrageDeleguesList] = useState([]); 

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
    setMaitresOuvrageList([]); // <-- ADD THIS
    setMaitresOuvrageDeleguesList([]);

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
          axios.get(`${baseApiUrl}/options/maitre-ouvrage`, { withCredentials: true }),
          axios.get(`${baseApiUrl}/options/maitre-ouvrage-delegue`, { withCredentials: true }),
          axios.get(`${baseApiUrl}/options/communes`, { withCredentials: true }), // --- ADD THIS LINE ---

        ])
const getArray = (res) => (Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.data) ? res.data.data : []));
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
          console.log(provincesList)
        } else {
          console.warn("VISU CONV: Could not fetch provinces list:", auxiliaryFetches[0].reason?.message)
        }
        if (auxiliaryFetches[4].status === "fulfilled") {
    const communesRes = auxiliaryFetches[4].value;
    const comDataPayload = communesRes.data.communes || communesRes.data.data || communesRes.data;
    const comDataArray = Array.isArray(comDataPayload) ? comDataPayload : [];
    setCommunesList(
        comDataArray.map((c) => ({
            value: c.Id || c.id || c.value,
            label: c.Description || c.Nom || c.label || `ID: ${c.Id || c.id}`,
        }))
    );
} else {
    console.warn("VISU CONV: Could not fetch communes list:", auxiliaryFetches[4].reason?.message);
}
        if (auxiliaryFetches[1].status === "fulfilled") {
          const foncRes = auxiliaryFetches[1].value
          const foncDataPayload = foncRes.data.fonctionnaires
          console.log(foncDataPayload)

          if (Array.isArray(foncDataPayload)) {
            setFonctionnairesList(foncDataPayload.map(fc=>({
              value:fc.id,
              label:fc.nom_complet
            })))
            console.log(`VISU CONV: Processed ${foncDataPayload.length} fonctionnaires.`)
          } else {
            console.error("VISU CONV: Data for /options/fonctionnaires was NOT an array.", foncDataPayload)
            setError((prev) => (prev ? prev + "\n" : "") + "Format incorrect pour la liste des fonctionnaires.")
          }
        } else {
          console.warn("VISU CONV: Could not fetch fonctionnaires list:", auxiliaryFetches[1].reason?.message)

          setError((prev) => (prev ? prev + "\n" : "") + "Erreur de chargement des fonctionnaires.")

        }
                   if (auxiliaryFetches[2].status === 'fulfilled') {
            setMaitresOuvrageList(getArray(auxiliaryFetches[2].value));
        } else {
            console.warn("VISU CONV: Could not fetch maitres ouvrage list:", auxiliaryFetches[2].reason?.message);
        }

        if (auxiliaryFetches[3].status === 'fulfilled') {
            setMaitresOuvrageDeleguesList(getArray(auxiliaryFetches[3].value));
        } else {
            console.warn("VISU CONV: Could not fetch maitres ouvrage delegues list:", auxiliaryFetches[3].reason?.message);
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
const getPrincipalNameById = useCallback((id, list) => {
      if (!id || !Array.isArray(list) || list.length === 0) {

          return displayData(id);
      }
      const found = list.find(item => String(item.value) === String(id));
      console.log(found)
      return found ? found.label : displayData(id, `ID Introuvable: ${id}`);
  }, []);
  const getProvinceNames = useCallback(
    (localisationString) => {
      if (!localisationString || typeof localisationString !== "string" || !Array.isArray(provincesList) || provincesList.length === 0)
        return displayData(null)
      const ids = JSON.parse(localisationString)
      if (ids.length === 0 || !Array.isArray(ids)) return displayData(null)
      return (
        <Stack direction="horizontal" gap={1} wrap="wrap">
          {ids?.map((id) => {
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
const getCommuneNames = useCallback(
(communesArray) => {
if (!communesArray || !Array.isArray(communesArray) || communesArray.length === 0 || communesList.length === 0) {
return displayData(null);
}
return (
<Stack direction="horizontal" gap={1} wrap="wrap">
{communesArray.map((commune) => {

const communeDetails = communesList.find((c) => String(c.value) === String(commune.Id));
return (
<Badge key={commune.Id} pill bg="secondary" text="white" className="border me-1 mb-1">
<FontAwesomeIcon icon={faMapPin} className="me-1" />
{communeDetails?.label || communeDetails?.Description ||`ID ${commune.Id}`}
</Badge>
);
})}
</Stack>
);
},
[communesList]
);
  const getFonctionnaireNames = useCallback(
    (fonctionnaireIdString) => {
      if (!fonctionnaireIdString || typeof fonctionnaireIdString !== "string") return displayData(null, "Aucun ID")
      if (!Array.isArray(fonctionnairesList)) {
        return <span className="text-danger">Erreur: Liste fonctionnaires invalide</span>
      }
      if (fonctionnairesList.length === 0 && fonctionnaireIdString.trim() !== "") {
        return <span className="text-warning fst-italic">Chargement... (IDs: {fonctionnaireIdString})</span>
      }
      const ids = JSON.parse(fonctionnaireIdString)
      if (ids.length === 0 || !Array.isArray(ids)) return displayData(null, "Non spécifié")
      return (
        <Stack direction="horizontal" gap={1} wrap="wrap">
          {ids?.map((id) => {
            const fonctionnaire = fonctionnairesList.find((f) => String(f.value) === String(id))
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
    
  const groupedPartnerEngagements = useMemo(() => {
      if (!conventionData?.partner_commitments) return {};
      return conventionData.partner_commitments.reduce((acc, commitment) => {
          const partnerId = commitment.Id_Partenaire;
          if (!acc[partnerId]) {
              acc[partnerId] = {
                  label: commitment.label,
                  is_signatory: commitment.is_signatory,
                  date_signature: commitment.date_signature,
                  details_signature: commitment.details_signature,
                  engagements: [],
              };
          }
          acc[partnerId].engagements.push(commitment);
          return acc;
      }, {});
  }, [conventionData]);

  const globalFinancialSummary = useMemo(() => {
    if (!conventionData)
      return { coutGlobal: 0, totalMontantVerse: 0, resteAFinancer: 0, progression: 0, isComplete: false }
    const coutGlobal = Number.parseFloat(conventionData.Cout_Global) || 0
    const totalMontantVerse = (conventionData.partner_commitments || [])
      .filter((p) => p.engagement_type_label === 'Financier')
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
            <Card.Header className="bg-gradient-yellow">
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faInfoCircle} className="me-2 text-warning" />
                INFORMATIONS GÉNÉRALES
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <dl className="row mb-0 dl-compact">
                <dt className="col-sm-4 text-muted fw-semibold">Code:</dt>
                <dd className="col-sm-8 fw-bold text-dark">{displayData(conventionData.Code)}</dd>
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
                <dt className="col-sm-4 text-muted fw-semibold">Secteur:</dt>
                <dd className="col-sm-8 text-dark">
                  {conventionData.secteur ? (
                    <Badge bg="info" text="dark" className="px-2 py-1">
                      {displayData(conventionData.secteur.description_fr)}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </dd>
                <dt className="col-sm-4 text-muted fw-semibold">Année de Session:</dt>
                <dd className="col-sm-8 text-dark">{displayData(conventionData.Annee_Convention)}</dd>
                <dt className="col-sm-4 text-muted fw-semibold">Durée:</dt>
                <dd className="col-sm-8 text-dark">
                  <Badge bg="warning" text="dark" className="px-2 py-1">
                    {displayData(conventionData.duree_convention)} mois
                  </Badge>
                </dd>
                <dt className="col-sm-4 text-muted fw-semibold">
                    <FontAwesomeIcon icon={faGavel} className="me-1 text-muted"/>
                    Approb. Conseil:
                </dt>
                <dd className="col-sm-8 text-dark fw-bold">
                    {conventionData.requires_council_approval ? 
                        <span className="text-success">Oui</span> : 
                        <span className="text-danger">Non</span>
                    }
                </dd>
                {conventionData.requires_council_approval && (
                    <>
                        <dt className="col-sm-4 text-muted fw-semibold">N° Approbation:</dt>
                        <dd className="col-sm-8 text-dark">{displayData(conventionData.numero_approbation)}</dd>
                        
                        <dt className="col-sm-4 text-muted fw-semibold">Session:</dt>
                        <dd className="col-sm-8 text-dark">{getMonthName(conventionData.session)}</dd>
                    </>
                )}
                
              </dl>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6} lg={5}>
          <Card className="h-100 border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient-yellow">
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faTasks} className="me-2 text-warning" />
                STATUT & GROUPE
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <dl className="row mb-0 dl-compact">
                <dt className="col-sm-5 text-muted fw-semibold">Statut:</dt>
                <dd className="col-sm-7">
                  <Badge bg={getStatusColor(conventionData.Statut)} text={["warning", "light"].includes(getStatusColor(conventionData.Statut)) ? "dark" : "white"} className="px-3 py-2 rounded-pill shadow-sm" style={{ fontSize: "0.85rem" }}>
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
                        <dd className="col-sm-7 fw-medium text-success">{displayData(conventionData.date_reception_vise)}</dd>
                      </>
                    )}
                  </>
                )}
                <dt className="col-sm-5 text-muted fw-semibold">Operationnel:</dt>
                <dd className="col-sm-7 text-dark">{displayData(conventionData.Operationalisation)}</dd>
                {conventionData.sous_type && (
                    <Col md={6} className="mb-3">
                        <dt className="text-muted fw-semibold">Sous-type</dt>
                        <dd>
                            <Badge pill bg="light" text="dark" className="px-4 py-2 shadow-sm border" style={{ fontSize: "1rem" }}>
                                {displayData(conventionData.sous_type)}
                            </Badge>
                        </dd>
                    </Col>
                  )}
              </dl>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
          <Card className="h-100 border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient-yellow">
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faProjectDiagram} className="me-2 text-warning" />
                TYPE & RATTACHEMENT
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefeff" }}>
              <div className="text-center mb-4">
                <Badge pill bg="warning" text="dark" className="px-4 py-2 shadow-sm" style={{ fontSize: "1.1rem", fontWeight: "600" }}>
                  <FontAwesomeIcon icon={faInfoCircle} className="me-2" />
                  {displayData(conventionData.type).toUpperCase()}
                </Badge>
              </div>
<Row>
              {["cadre","convention"].includes(conventionData.type) && (
                <Col className="text-center p-3 rounded-3 bg-light-yellow border border-warning">
                  <FontAwesomeIcon icon={faClipboardList} className="text-warning fa-2x mb-2" />
                  <h6 className="fw-bold text-dark mb-1">Programme Associé</h6>
                  <p className="mb-0 fw-medium text-dark">{displayData(conventionData.programme?.Description)}</p>
                </Col>
              )}
              {conventionData.type === "specifique" && (
                
                    <Col  className="mb-3 mb-md-0">
                        <div className="h-100 text-center p-3 rounded-3 bg-light-yellow border border-warning">
                            <FontAwesomeIcon icon={faSitemap} className="text-warning fa-2x mb-2" />
                            <h6 className="fw-bold text-dark mb-1">Rattachée à la Convention Cadre</h6>
                            <p className="mb-0 fw-medium text-dark">{displayData(conventionData.convention_cadre?.code)}</p>
                            <small className="text-muted">{displayData(conventionData.convention_cadre?.intitule, '')}</small>
                        </div>
                    </Col>
              )}
              {["specifique","convention"].includes(conventionData.type) &&(
                    <Col>
                        <div className="h-100 text-center p-3 rounded-3 bg-light-yellow border border-warning">
                            <FontAwesomeIcon icon={faProjectDiagram} className="text-warning fa-2x mb-2" />
                            <h6 className="fw-bold text-dark mb-1">Projet Associé</h6>
                            <p className="mb-0 fw-medium text-dark">{displayData(conventionData.projet?.Nom_Projet)}</p>
                        </div>
                    </Col>)}
            </Row>
            </Card.Body>
            
          </Card>
      </Row>

      {conventionData.type === 'cadre' && conventionData.conventions_specifiques && conventionData.conventions_specifiques.length > 0 && (
        <Row className="g-4 mb-4">
            <Col>
                <Card className="border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
                    <Card.Header className="bg-gradient-yellow">
                        <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                            <FontAwesomeIcon icon={faSitemap} className="me-2 text-warning" />
                            CONVENTIONS SPÉCIFIQUES RATTACHÉES
                        </Card.Title>
                    </Card.Header>
                    <Card.Body className="p-0" style={{ backgroundColor: "#fefefe" }}>
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
                                            <Badge bg={getStatusColor(specifique.Statut)} text={["warning", "light"].includes(getStatusColor(specifique.Statut)) ? "dark" : "white"} className="px-2 py-1">
                                                {displayData(specifique.Statut)}
                                            </Badge>
                                        </div>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
      )}

      <Row className="g-4 mb-4">
        <Col lg={4}>
          <Card className="h-100 border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient-yellow">
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faClipboardList} className="me-2 text-warning" />
                OBJET & OBJECTIFS
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <h6 className="fw-bold mb-2 text-dark">Objet</h6>
              <p className="mb-3 text-muted" style={{ lineHeight: "1.6" }}>{displayData(conventionData.Objet)}</p>

              <h6 className="fw-bold mb-2 text-dark">Objectifs</h6>
              <p className="mb-3 text-muted" style={{ lineHeight: "1.6" }}>{displayData(conventionData.Objectifs)}</p>
<h6 className="fw-bold mb-2 text-dark">Indicateur d’évaluation / de suivi</h6>
<p className="mb-3 text-muted" style={{ lineHeight: "1.6" }}>{displayData(conventionData.indicateur_suivi)}</p>
              <div className="border-top pt-3">
                <h6 className="fw-bold mb-2 text-dark">Observations</h6>
                <div className="p-2 rounded-3 bg-light-yellow">
                  <p className="mb-0 text-muted fst-italic">{displayData(conventionData.observations, "Aucune observation.")}</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4}>
      <Card className="h-100 border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #6c757d" }}>
          <Card.Header className="bg-gradient-secondary">
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                  <FontAwesomeIcon icon={faClipboardCheck} className="me-2 text-secondary" />
                  DÉTAILS ADDITIONNELS
              </Card.Title>
          </Card.Header>
          <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <dl className="row mb-0 dl-compact">
                  <dt className="col-sm-4 text-muted fw-semibold">
                      <FontAwesomeIcon icon={faClock} className="me-2"/>
                      Cadence de Réunion:
                  </dt>
                  <dd className="col-sm-8 text-dark">{displayData(conventionData.cadence_reunion)}</dd>
                  
                  {conventionData.has_audit && (
                      <>
                          <dt className="col-sm-12 mt-3 text-muted fw-semibold border-top pt-3">
                              <FontAwesomeIcon icon={faClipboardCheck} className="me-2"/>
                              Suivi par Audit:
                          </dt>
                          <dd className="col-sm-12 text-dark fst-italic bg-light p-2 rounded">
                              {displayData(conventionData.audit_text)}
                          </dd>
                      </>
                  )}
              </dl>
          </Card.Body>
      </Card>
  </Col>
        <Col lg={4}>
          <Card className="h-100 border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient-yellow">
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-warning" />
                LOCALISATION & POINTS FOCAUX
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <div className="mb-4">
                <h6 className="fw-bold mb-3 text-dark">Localisation</h6>
                <div>{getProvinceNames(conventionData.localisation)}</div>
              </div>
              <div className="mb-4">
      <h6 className="fw-bold mb-3 text-dark">Communes</h6>
      <div>{getCommuneNames(conventionData.communes)}</div>
  </div>
              <div className="border-top pt-3">
                <h6 className="fw-bold mb-3 text-dark">Points Focaux</h6>
                <div>{getFonctionnaireNames(conventionData.id_fonctionnaire)}</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row className="g-4 mb-4">
        <Col>
          <Card className="border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #6f42c1" }}>
            <Card.Header className="bg-gradient-purple">
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faBuilding} className="me-2 text-purple" />
                MAÎTRISE D'OUVRAGE
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <Row>
                {/* Maître d'Ouvrage Column */}
                <Col md={6} className="mb-4 mb-md-0">
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                      <FontAwesomeIcon icon={faBuilding} className="me-2 text-muted" />
                      Maître d'Ouvrage Principal
                    </h6>
                    
                    {/* Primary Responsible - Legacy Data */}
                    <div className="p-3 rounded-3 bg-light border-start border-4 border-success mb-3">
                      <div className="d-flex align-items-start">
                        <FontAwesomeIcon icon={faBuilding} className="mt-1 me-2 text-success" />
                        <div>
<div className="fw-bold text-dark fs-6">{getPrincipalNameById(conventionData.Maitre_Ouvrage, maitresOuvrageList)}</div>
                          <small className="text-muted">Responsable Premier</small>
                        </div>
                      </div>
                    </div>

                    {/* Additional Maîtres d'Ouvrage */}
                    {conventionData.maitres_ouvrage && conventionData.maitres_ouvrage?.length > 0 && (
                      <div className="mt-4">
                        <h6 className="fw-bold mb-2 text-dark d-flex align-items-center small">
                          <FontAwesomeIcon icon={faUsers} className="me-2 text-muted" />
                          Autres Maîtres d'Ouvrage Associés
                        </h6>
                        <ListGroup variant="flush">
                          {conventionData.maitres_ouvrage.map(mo => (
                            <ListGroup.Item key={mo.id} className="px-0 py-2 border-start bg-light-success rounded-2 mb-2">
                              <div className="ms-2">{mo.nom}</div>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      </div>
                    )}
                  </div>
                </Col>

                {/* Maître d'Ouvrage Délégué Column */}
                <Col md={6}>
                  <div className="mb-4">
                    <h6 className="fw-bold mb-3 text-dark d-flex align-items-center">
                      <FontAwesomeIcon icon={faUserTie} className="me-2 text-muted" />
                      Maître d'Ouvrage Délégué Principal
                    </h6>

                    {/* Primary Delegate - Legacy Data */}
                    <div className="p-3 rounded-3  bg-light border-start border-4 border-primary mb-3">
                      <div className="d-flex align-items-start">
                        <FontAwesomeIcon icon={faUserTie} className="mt-1 me-2 text-primary" />
                        <div>
<div className="fw-bold text-dark fs-6">{getPrincipalNameById(conventionData.maitre_ouvrage_delegue, maitresOuvrageDeleguesList)}</div>
                          <small className="text-muted">Délégué Premier</small>
                        </div>
                      </div>
                    </div>

                    {/* Additional Délégués */}
                    {conventionData.maitres_ouvrage_delegues && conventionData.maitres_ouvrage_delegues.length > 0 && (
                      <div className="mt-4">
                        <h6 className="fw-bold mb-2 text-dark d-flex align-items-center small">
                          <FontAwesomeIcon icon={faUsers} className="me-2 text-muted" />
                          Autres Maîtres d'Ouvrage Délégués
                        </h6>
                        <ListGroup variant="flush">
                          {conventionData.maitres_ouvrage_delegues.map(mod => (
                            <ListGroup.Item key={mod.id} className="px-0 py-2 bg-light-primary rounded-2 mb-2">
                              <div className="ms-2">{mod.nom}</div>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      </div>
                    )}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col>
          <Card className="border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient-yellow">
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faUsers} className="me-2 text-warning" />
                COMITÉS DE SUIVI
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              <Row>
                <Col md={6} className="mb-3 mb-md-0">
                  <h6 className="fw-bold mb-3 text-dark">Comité Technique</h6>
                  {conventionData.membres_comite_technique && conventionData.membres_comite_technique.length > 0 ? (
                    <div className="d-flex flex-row flex-wrap gap-2">
                      {conventionData.membres_comite_technique.map((member, index) => (
                        <div key={index} className="d-flex align-items-center p-2 bg-light rounded-2 shadow-sm border">
                          <FontAwesomeIcon icon={faUserTie} className="me-2 text-muted" />
                          <span className="text-dark small">{member}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted fst-italic">Aucun membre défini.</p>
                  )}
                </Col>
                <Col md={6}>
                  <h6 className="fw-bold mb-3 text-dark">Comité de Pilotage</h6>
                  {conventionData.membres_comite_pilotage && conventionData.membres_comite_pilotage.length > 0 ? (
                    <div className="d-flex flex-row flex-wrap gap-2">
                      {conventionData.membres_comite_pilotage.map((member, index) => (
                        <div key={index} className="d-flex align-items-center p-2 bg-light rounded-2 shadow-sm border">
                          <FontAwesomeIcon icon={faUserTie} className="me-2 text-muted" />
                          <span className="text-dark small">{member}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted fst-italic">Aucun membre défini.</p>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col>
          <Card className="border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #198754" }}>
            <Card.Header className="bg-gradient-green">
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faHandshake} className="me-2 text-success" />
                ENGAGEMENTS PARTENAIRES
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              {Object.keys(groupedPartnerEngagements).length > 0 ? (
                <div className="partner-list-container">
                  {Object.entries(groupedPartnerEngagements).map(([partnerId, partnerData]) => (
                    <Card key={partnerId} className="mb-3 shadow-sm">
                      <Card.Header className="d-flex justify-content-between align-items-center bg-light">
                          <strong className="text-dark fs-6">
                            <FontAwesomeIcon icon={faBuilding} className="me-2 text-success" />
                            {partnerData.label}
                          </strong>
                          {partnerData.is_signatory ? (
                            <Badge bg="success" pill className="px-3 py-2 shadow-sm">
                              <FontAwesomeIcon icon={faCheckCircle} className="me-1" /> Signé
                            </Badge>
                          ) : (
                            <Badge bg="secondary" pill className="px-3 py-2 shadow-sm">
                              <FontAwesomeIcon icon={faTimesCircle} className="me-1" /> Non Signé
                            </Badge>
                          )}
                      </Card.Header>
                      <ListGroup variant="flush">
                        {partnerData.engagements.map((engagement, index) => (
                          <ListGroup.Item key={index}>
                            <div className="fw-bold mb-2">
                              {engagement.engagement_type_label === 'Financier' && <FontAwesomeIcon icon={faHandHoldingUsd} className="me-2 text-success" />}
                              {engagement.engagement_type_label === 'Assistance Technique' && <FontAwesomeIcon icon={faTools} className="me-2 text-info" />}
                              {engagement.engagement_type_label === 'Mise à disposition du foncier' && <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2 text-warning" />}
                              {engagement.engagement_type_label === 'Autre' && <FontAwesomeIcon icon={faGift} className="me-2 text-secondary" />}
                              Engagement: {engagement.engagement_type_label || 'Non défini'}
                            </div>

{/* --- REPLACE THE ENTIRE LOGIC BLOCK WITH THIS --- */}
{engagement.engagement_type_label === 'Financier' ? (
    <div className="ps-3">
        <Row>
            <Col xs={6} className="text-muted">Montant Convenu:</Col>
            <Col xs={6} className="fw-bold text-dark text-end">{formatCurrency(engagement.Montant_Convenu)}</Col>
        </Row>
        {/* --- DÉBUT DU BLOC À AJOUTER --- */}
{(() => {
    const coutGlobalNum = parseFloat(conventionData.Cout_Global) || 0;
    const montantConvenuNum = parseFloat(engagement.Montant_Convenu) || 0;

    if (coutGlobalNum > 0 && montantConvenuNum > 0) {
        const rate = (montantConvenuNum / coutGlobalNum) * 100;
        return (
            <Row>
                <Col xs={6} className="text-muted fst-italic">Taux participation :</Col>
                <Col xs={6} className="fw-bold text-info text-end">
                    {rate.toFixed(2)}%
                </Col>
            </Row>
        );
    }
    return null;
})()}
        <Row>
            <Col xs={6} className="text-muted">Montant Versé:</Col>
            <Col xs={6} className="text-success fw-bold text-end">{formatCurrency(engagement.Montant_Verse)}</Col>
        </Row>

        {/* --- START: New Yearly Breakdown Display --- */}
        {Array.isArray(engagement.engagements_annuels) && engagement.engagements_annuels.length > 0 && (
            <div className="mt-2 pt-2 border-top">
                <h6 className="small text-muted fw-bold">Décomposition Annuelle Prévue:</h6>
                {engagement.engagements_annuels.map(yearly => (
                    <Row key={yearly.id} className="ps-2">
                        <Col xs={6} className="text-muted small">{yearly.annee}:</Col>
                        <Col xs={6} className="text-dark text-end small">{formatCurrency(yearly.montant_prevu)}</Col>
                    </Row>
                ))}
            </div>
        )}
        {/* --- END: New Yearly Breakdown Display --- */}

    </div>
) : (
    <p className="fst-italic text-dark ps-3">{displayData(engagement.autre_engagement)}</p>
)}

                            {engagement.engagement_description && (
                                <div className="mt-2 p-2 bg-light rounded border-start border-3 border-secondary">
                                    <small className="text-muted d-block">Description:</small>
                                    <small>{engagement.engagement_description}</small>
                                </div>
                            )}
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                       {partnerData.is_signatory && (partnerData.date_signature || partnerData.details_signature) && (
                            <Card.Footer className="bg-light">
                              <small className="text-muted">
                                <strong>Signature:</strong> {displayData(partnerData.date_signature)}
                                {partnerData.date_signature && partnerData.details_signature && <span className="mx-2">|</span>}
                                {displayData(partnerData.details_signature)}
                              </small>
                            </Card.Footer>
                        )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <FontAwesomeIcon icon={faHandshake} className="text-muted fa-3x mb-3" />
                  <p className="text-muted mb-0 fst-italic">Aucun engagement partenaire associé.</p>
                </div>
              )}
            </Card.Body>

            <div className="border-top">
                <Card.Body className="pt-4">
                  <h6 className="mb-4 fw-bold text-dark text-center d-flex align-items-center justify-content-center">
                    <FontAwesomeIcon icon={faPiggyBank} className="me-2 text-success" />
                    SYNTHÈSE FINANCIÈRE GLOBALE
                  </h6>
                  <Row className="align-items-center">
                    <Col md={6}>
                      <div className="p-3 bg-white rounded-3 shadow-sm">
                        <dl className="row mb-0">
                          <dt className="col-sm-7 text-muted">Coût Global Conv.:</dt>
                          <dd className="col-sm-5 fw-bold text-dark text-end">{formatCurrency(coutGlobal)}</dd>
                          <dt className="col-sm-7 text-muted">Total Versé:</dt>
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
                            <span className="fw-bold text-dark">Reste: {formatCurrency(resteAFinancer)}</span>
                            <Badge bg="success" text="white" className="px-2 py-1">{progression.toFixed(1)}%</Badge>
                          </div>
                          <ProgressBar now={progression} variant="success" style={{ height: "12px" }} className="shadow-sm rounded-pill" title={`Progression: ${progression.toFixed(1)}%`}/>
                        </div>
                      )}
                    </Col>
                  </Row>
                </Card.Body>
            </div>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col>
          <Card className="border-0 shadow-sm card-visual" style={{ borderLeft: "4px solid #ffc107" }}>
            <Card.Header className="bg-gradient-yellow">
              <Card.Title as="h6" className="mb-0 fw-bold text-dark d-flex align-items-center">
                <FontAwesomeIcon icon={faFilePdf} className="me-2 text-warning" />
                FICHIERS ASSOCIÉS
              </Card.Title>
            </Card.Header>
            <Card.Body className="pt-3" style={{ backgroundColor: "#fefefe" }}>
              {conventionData.documents && conventionData.documents.length > 0 ? (
                <div className="d-flex flex-row flex-wrap justify-content-start gap-3">
                  {conventionData.documents.map((doc) => {
                    const fileDisplayUrl = appBaseUrl && doc.file_path ? `${appBaseUrl}/${doc.file_path.replace(/^\\/, "")}` : doc.url
                    const fileIcon = getFileIcon(doc.file_type || doc.file_name)
                    const fileSizeMB = doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) : null
                    const mainTitle = doc.Intitule || doc.file_name || 'Fichier'
                    const secondaryTitle = doc.Intitule ? (doc.file_name || '') : ''
                    return (
                      <div key={doc.Id_Doc} className="p-3 rounded-4 shadow-sm border position-relative bg-dark" style={{ minWidth: "280px", maxWidth: "45%" }}>
                        <div className="d-flex align-items-center">
                          <div className="p-2 rounded-3 me-3" style={{ backgroundColor: "#ffc107" }}>
                            <FontAwesomeIcon icon={fileIcon} className="text-dark fa-lg" style={{ width: "20px" }} title={doc.file_type || "Type inconnu"}/>
                          </div>
                          <div className="flex-grow-1 text-truncate me-2">
                            {fileDisplayUrl ? (
                              <a href={fileDisplayUrl} target="_blank" rel="noopener noreferrer" className="link-light text-decoration-none fw-medium stretched-link" title={`Ouvrir: ${displayData(mainTitle, "Fichier")}`}>
                                {displayData(mainTitle, "Fichier sans nom")}
                              </a>
                            ) : (
                              <span className="text-white fw-medium" title={displayData(mainTitle, "")}>
                                {displayData(mainTitle, "Fichier (lien indisponible)")}
                              </span>
                            )}
                            <small className="d-block text-warning">{secondaryTitle || ''}{secondaryTitle && fileSizeMB ? ' - ' : ''}{fileSizeMB ? `${fileSizeMB} Mo` : ''}</small>
                          </div>
                          {fileDisplayUrl && (
                            <Button variant="outline-warning" size="sm" className="ms-2 flex-shrink-0 rounded-3" onClick={() => window.open(fileDisplayUrl, "_blank")} title="Ouvrir dans un nouvel onglet">
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
    </div>
  )
}

// --- PropTypes & Default Props ---
ConventionVisualisation.propTypes = {
  itemId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onClose: PropTypes.func.isRequired,
  baseApiUrl: PropTypes.string,
}

ConventionVisualisation.defaultProps = {
  baseApiUrl: "http://localhost:8000/api",
}

export default ConventionVisualisation;