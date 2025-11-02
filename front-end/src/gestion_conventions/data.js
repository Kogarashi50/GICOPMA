// src/gestion_conventions/data.js
import React from 'react'; // Import React for JSX
import {
  faProjectDiagram, faSitemap, faFileContract, faHandshake, faShapes,
  faHelmetSafety, faCity,faClipboardCheck, faMap, faUsersCog, faTasks,
  faFileInvoiceDollar, faChevronDown, faFileSignature, faFileAlt, faTachometerAlt,
  faUserTag, faScroll, faGavel, faCommentDots , faBell// Added faCommentDots for Observations
} from "@fortawesome/free-solid-svg-icons";

// --- Permission Constants ---
// Match these exactly with your backend permission names defined in the seeder
const PERMISSIONS = {
    VIEW_DASHBOARD: 'view dashboard',
    VIEW_CONVENTIONS: 'view conventions',
    CREATE_CONVENTIONS: 'create conventions',
    UPDATE_CONVENTIONS: 'update conventions',
    DELETE_CONVENTIONS: 'delete conventions',
    VIEW_CONVENTION_DETAILS: 'view convention details',
    RECEIVE_CONVENTION_ALERTS: 'receive convention alerts',

    VIEW_PARTENAIRES: 'view partenaires',
    CREATE_PARTENAIRES: 'create partenaires',
    UPDATE_PARTENAIRES: 'update partenaires',
    DELETE_PARTENAIRES: 'delete partenaires',
    VIEW_PARTENAIRE_DETAILS: 'view partenaire details',
    VIEW_PARTENAIRE_SUMMARY: 'view partenaire summary',

    // --- Appel Offre Permissions (Corrected Names & Added Details) ---
    VIEW_APPELOFFRES: 'view appeloffres',           // Corrected: No underscore
    CREATE_APPELOFFRES: 'create appeloffres',         // Corrected: No underscore
    UPDATE_APPELOFFRES: 'update appeloffres',         // Corrected: No underscore
    DELETE_APPELOFFRES: 'delete appeloffres',         // Corrected: No underscore
    VIEW_APPELOFFRE_DETAILS: 'view appeloffre details', // Added this permission
    // -------------------------------------------------------------
    VIEW_OBSERVATIONS: 'view observations',
    CREATE_OBSERVATIONS: 'create observations',
    UPDATE_OBSERVATIONS: 'update observations',
    DELETE_OBSERVATIONS: 'delete observations',
    
    VIEW_CHANTIERS: 'view chantiers', CREATE_CHANTIERS: 'create chantiers', UPDATE_CHANTIERS: 'update chantiers', DELETE_CHANTIERS: 'delete chantiers',
    VIEW_PROGRAMMES: 'view programmes', CREATE_PROGRAMMES: 'create programmes', UPDATE_PROGRAMMES: 'update programmes', DELETE_PROGRAMMES: 'delete programmes',
    VIEW_DOMAINES: 'view domaines', CREATE_DOMAINES: 'create domaines', UPDATE_DOMAINES: 'update domaines', DELETE_DOMAINES: 'delete domaines',
    VIEW_PROJETS: 'view projets', CREATE_PROJETS: 'create projets', UPDATE_PROJETS: 'update projets', DELETE_PROJETS: 'delete projets',
    VIEW_SOUSPROJETS: 'view sousprojets', CREATE_SOUSPROJETS: 'create sousprojets', UPDATE_SOUSPROJETS: 'update sousprojets', DELETE_SOUSPROJETS: 'delete sousprojets',
    VIEW_COMMUNES: 'view communes', CREATE_COMMUNES: 'create communes', UPDATE_COMMUNES: 'update communes', DELETE_COMMUNES: 'delete communes',
    VIEW_PROVINCES: 'view provinces', CREATE_PROVINCES: 'create provinces', UPDATE_PROVINCES: 'update provinces', DELETE_PROVINCES: 'delete provinces',

    VIEW_MARCHES: 'view marches', CREATE_MARCHES: 'create marches', UPDATE_MARCHES: 'update marches', DELETE_MARCHES: 'delete marches',
    VIEW_BON_COMMANDE: 'view bon_commande', CREATE_BON_COMMANDE: 'create bon_commande', UPDATE_BON_COMMANDE: 'update bon_commande', DELETE_BON_COMMANDE: 'delete bon_commande',
    VIEW_CONTRAT_DROIT_COMMUN: 'view contrat_droit_commun', CREATE_CONTRAT_DROIT_COMMUN: 'create contrat_droit_commun', UPDATE_CONTRAT_DROIT_COMMUN: 'update contrat_droit_commun', DELETE_CONTRAT_DROIT_COMMUN: 'delete contrat_droit_commun',
    DOWNLOAD_FICHIERS: 'download fichiers',

    VIEW_ORDRES_SERVICE: 'view ordres_service',
    CREATE_ORDRES_SERVICE: 'create ordres_service',
    UPDATE_ORDRES_SERVICE: 'update ordres_service',
    DELETE_ORDRES_SERVICE: 'delete ordres_service',

    VIEW_ENGAGEMENTS_FINANCIERS: 'view engagements_financiers',
    CREATE_ENGAGEMENTS_FINANCIERS: 'create engagements_financiers',
    UPDATE_ENGAGEMENTS_FINANCIERS: 'update engagements_financiers',
    DELETE_ENGAGEMENTS_FINANCIERS: 'delete engagements_financiers',

    VIEW_VERSEMENTS_PP: 'view versements_pp',
    CREATE_VERSEMENTS_PP: 'create versements_pp',
    UPDATE_VERSEMENTS_PP: 'update versements_pp',
    DELETE_VERSEMENTS_PP: 'delete versements_pp',

    VIEW_VERSEMENTS_CP: 'view versements_cp', // Renamed for clarity in seeder
    CREATE_VERSEMENTS_CP: 'create versements_cp',
    UPDATE_VERSEMENTS_CP: 'update versements_cp',
    DELETE_VERSEMENTS_CP: 'delete versements_cp',

    VIEW_AVENANTS: 'view avenants', // Added from seeder
    CREATE_AVENANTS: 'create avenants',
    UPDATE_AVENANTS: 'update avenants',
    DELETE_AVENANTS: 'delete avenants',

    VIEW_SECTEURS: 'view secteurs', // Added from seeder
    CREATE_SECTEURS: 'create secteurs',
    UPDATE_SECTEURS: 'update secteurs',
    DELETE_SECTEURS: 'delete secteurs',

    DOWNLOAD_REPORT: 'download report',

    // --- Admin ---
    MANAGE_USERS: 'manage users',
    MANAGE_ROLES: 'manage roles',
    VIEW_HISTORY: 'view history',

};
// ---

// --- Main Menu Items with Permissions ---
const menuItems = [
  // Item 1: Brand/Logo
  {
      id: 1,
      icon: null,
      label: (
          <span className="d-flex justify-self-center align-items-center text-center mainItem">
              <img src="/logosite.png" className="align-self-center bg-light Navlogo" width="60" height="60" alt="Logo"/>
          </span>
      ),
      path: "/", // Path to dashboard or home
  },

  // --- Section Heading: GESTION DES CONVENTIONS ---
  { id: 100, type: 'heading', label: "GESTION DES CONVENTIONS", path: '#' },
  { id: 2, icon: faFileContract, label: "Conventions", path: "/convention", hasSubtitles: true, requiredPermission: PERMISSIONS.VIEW_CONVENTIONS },
  { id: 15, icon: faFileAlt, label: "Avenants", path: "/avenants", type: 'subtitle', parentId: 2, requiredPermission: PERMISSIONS.VIEW_AVENANTS },
  { id: 16, icon: faFileInvoiceDollar, label: "Versements (Conv.)", path: "/versements", type: 'subtitle', parentId: 2, requiredPermission: PERMISSIONS.VIEW_VERSEMENTS_CP },
  { id: 3, icon: faHandshake, label: "Partenaires", path: "/partenaire", type: 'item', requiredPermission: PERMISSIONS.VIEW_PARTENAIRES },
  // { id: 4, icon: faHelmetSafety, label: "Chantiers", path: "/chantier", type: 'item', requiredPermission: PERMISSIONS.VIEW_CHANTIERS },
  { id: 5, icon: faTasks, label: "Programmes", path: "/programme", type: 'item', requiredPermission: PERMISSIONS.VIEW_PROGRAMMES },
  { id: 6, icon: faShapes, label: "Axes stratégiques", path: "/axes-strategiques", type: 'item', requiredPermission: PERMISSIONS.VIEW_DOMAINES },
  { id: 7, icon: faProjectDiagram, label: "Projets", path: "/projet", hasSubtitles: true, requiredPermission: PERMISSIONS.VIEW_PROJETS },
  { id: 19, icon: faFileInvoiceDollar, label: "Versements (Proj.)", path: "/versementpp", type: 'subtitle', parentId: 7, requiredPermission: PERMISSIONS.VIEW_VERSEMENTS_PP },
  { id: 8, icon: faSitemap, label: "Sous-Projets", path: "/sousprojet", type: 'item', requiredPermission: PERMISSIONS.VIEW_SOUSPROJETS },

  // --- Section Heading: LOCALISATION ---
  { id: 101, type: 'heading', label: "LOCALISATION", path: '#' },
  { id: 9, icon: faCity, label: "Communes", path: "/commune", type: 'item', requiredPermission: PERMISSIONS.VIEW_COMMUNES },
  { id: 13, icon: faMap, label: "Provinces", path: "/province", type: 'item', requiredPermission: PERMISSIONS.VIEW_PROVINCES },
{ 
  id: 99, // Ensure this ID is unique
  icon: faShapes, 
  label: "Secteurs", 
  path: "/secteurs", 
  type: 'item', 
  requiredPermission: PERMISSIONS.VIEW_SECTEURS 
},
  // --- Section Heading: MARCHÉS & CONTRATS ---
  { id: 102, type: 'heading', label: "MARCHÉS & CONTRATS", path: '#' },
  {
    id: 21, // Ensure unique ID
    icon: faGavel, // Icon for tenders/bids
    label: "Appels d'Offre",
    path: "/appel-offres", // Matches frontend route
    type: 'item', // Standard item
    requiredPermission: PERMISSIONS.VIEW_APPELOFFRES // Permission to view the menu item (Corrected Constant)
  },
  { id: 10, icon: faClipboardCheck, label: "Marchés", path: "/marche", hasSubtitles: true, requiredPermission: PERMISSIONS.VIEW_MARCHES },
  { id: 11, icon: faFileInvoiceDollar, label: "Bon de Commande", path: "/marches/bonCommandes",  requiredPermission: PERMISSIONS.VIEW_BON_COMMANDE,hasSubtitles: false, }, // Made subtitle of Marchés
  { id: 12, icon: faFileSignature, label: "Contrat Droit Commun", path: "/marches/contratsDroitCommun", requiredPermission: PERMISSIONS.VIEW_CONTRAT_DROIT_COMMUN ,hasSubtitles: false,}, // Made subtitle of Marchés
  {
    id: 20, // Ensure unique ID
    label: "Ordre de Service",
    icon: faScroll, // Or faFileSignature
    path: "/ordres-service", // Match route in App.js
    type: 'subtitle', // Make it a subtitle
    parentId: 10,     // Link to "Marchés" (ID 10)
    requiredPermission: PERMISSIONS.VIEW_ORDRES_SERVICE // Use the permission constant
  },

  // --- Section Heading: PARAMÉTRAGE ---
  { id: 103, type: 'heading', label: "PARAMÉTRAGE", path: '#' },
  { id: 14, icon: faUsersCog, label: "Utilisateurs", path: "/users", type: 'item', requiredPermission: PERMISSIONS.MANAGE_USERS },
  { id: 98, icon: faUserTag, label: "Rôles & Permissions", path: "/roles", type: 'item', requiredPermission: PERMISSIONS.MANAGE_ROLES },
  { id: 97, icon: faUserTag, label: "Historique d'activité", path: "/historique", type: 'item', requiredPermission: PERMISSIONS.VIEW_HISTORY },


  // --- New Section Heading: OBSERVATIONS ---
  { id: 104, type: 'heading', label: "OBSERVATIONS", path: '#' },
  {
    id: 33, // Make sure this ID is unique
    label: "Observations",
    path: "/observations",
    icon: faCommentDots, // Using the new icon
    requiredPermission: PERMISSIONS.VIEW_OBSERVATIONS
  },
  { 
    id: 105, // Ensure this ID is unique
    icon: faBell, 
    label: "Types d'Alerte", 
    path: "/alert-types", 
    type: 'item', 
    requiredPermission: PERMISSIONS.MANAGE_ROLES // Re-use 'manage roles' permission for access
  },
];

// Export necessary icons and constants
export { faChevronDown, faFileSignature, faFileAlt, faUserTag, faTachometerAlt };
export { PERMISSIONS }; // Export permissions for potential use elsewhere
export default menuItems; // Export the menu list