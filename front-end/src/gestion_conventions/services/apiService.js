// src/services/apiService.js

import axios from 'axios';

// --- Configuration ---
const API_URL = 'http://192.168.30.241:81/api'; // Use environment variable or default

// Optional: Create an Axios instance for common settings (like base URL, headers)
const apiClient = axios.create({
    baseURL: API_URL,
    withCredentials: true, // Important for session-based authentication (if used)
    headers: {
        'Accept': 'application/json',
        // 'Content-Type': 'application/json', // Default, will be overridden for FormData
        // Add Authorization header if using token-based auth:
        // 'Authorization': `Bearer ${your_token}`
    }
});

// Optional: Add interceptors for global error handling
apiClient.interceptors.response.use(
    response => response, // Pass through successful responses
    error => {
        // Log detailed error information
        console.error(
            `API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
            "\nStatus:", error.response?.status,
            "\nResponse Data:", error.response?.data,
            "\nRequest Config:", error.config,
            "\nError Object:", error
        );

        // Try to extract a meaningful error message
        const message = error.response?.data?.message || // Laravel standard message
                        error.response?.data?.error ||   // Other common error keys
                        error.message ||                // Axios or network error message
                        'An unknown error occurred';

        // Extract validation errors if present (status 422)
        const errors = error.response?.data?.errors || null;

        // Return a structured error object or re-throw a custom error
        return Promise.reject({ message, status: error.response?.status, errors, originalError: error });
    }
);


// --- Helper Functions ---
/**
 * Handles the response data, assuming a specific structure from Laravel API.
 * Adjust keys ('conventions', 'convention', 'avenants', 'avenant', etc.) as needed.
 */
const handleResponseData = (response, dataKey) => {
    if (response && response.data) {
        // Check if the specific dataKey exists, otherwise return the whole data object
        return response.data[dataKey] !== undefined ? response.data[dataKey] : response.data;
    }
    console.warn("API response or response.data is undefined.");
    return null; // Or throw an error, depending on how you want to handle this
};

// --- Convention API Functions ---

const getConventions = async () => {
    const response = await axios.get(`${API_URL}/conventions`);
    // Assuming backend returns { conventions: [...] }
    // If paginated, response.data might contain more keys (e.g., links, meta)
    return handleResponseData(response, 'conventions');
};

const getConvention = async (id) => {
    const response = await axios.get(`${API_URL}/conventions/${id}`);
    // Assuming backend returns { convention: {...} } which now includes 'documents' and 'avenants'
    return handleResponseData(response, 'convention');
};

/**
 * Create a new Convention.
 * @param {FormData} formData - The FormData object containing all fields and the file.
 */
const createConvention = async (formData) => {
    // No need to set Content-Type header manually, Axios does it for FormData
    const response = await axios.post(`${API_URL}/conventions`, formData);
    // Assuming backend returns { success: "...", convention: {...} }
    return response.data; // Return the full response for success message + data
};

/**
 * Update an existing Convention.
 * @param {string|number} id - The ID of the convention to update.
 * @param {FormData} formData - FormData object including fields, optional file, and _method='PUT'.
 */
const updateConvention = async (id, formData) => {
    // Laravel expects POST for updates with FormData containing _method=PUT
    const response = await apiClient.post(`/conventions/${id}`, formData);
    // Assuming backend returns { success: "...", convention: {...} }
    return response.data;
};

const deleteConvention = async (id) => {
    const response = await apiClient.delete(`/conventions/${id}`);
    // Assuming backend returns { success: "..." }
    return response.data;
};

// --- Avenant API Functions ---

/**
 * Get ALL Avenants (for the main AvenantsPage table).
 */
const getAvenants = async () => {
    const response = await apiClient.get('/avenants');
    // Assuming backend returns { avenants: [...] } including 'convention' and 'documents'
    return handleResponseData(response, 'avenants');
};

/**
 * Get Avenants for a SPECIFIC Convention (for embedded lists).
 * @param {string|number} conventionId
 */
const getAvenantsForConvention = async (conventionId) => {
    const response =  await axios.get(`${API_URL}/conventions/${conventionId}/avenants`);
    // Assuming backend returns { avenants: [...] } including 'documents'
    return handleResponseData(response, 'avenants');
};

/**
 * Get a single Avenant by its ID.
 * @param {string|number} avenantId
 */
const getAvenant = async (avenantId) => {
    const response = await apiClient.get(`/avenants/${avenantId}`);
    // Assuming backend returns { avenant: {...} } including 'convention' and 'documents'
    return handleResponseData(response, 'avenant');
};

/**
 * Create a new Avenant for a specific Convention.
 * @param {string|number} conventionId - The ID of the parent convention.
 * @param {FormData} formData - FormData containing fields and the 'avenant_files[]' array.
 */
const createAvenant = async (conventionId, formData) => {
    // Use the nested route for creation
    const response = await apiClient.post(`/conventions/${conventionId}/avenants`, formData);
    // Assuming backend returns { success: "...", avenant: {...} }
    return response.data;
};

/**
 * Update an existing Avenant.
 * @param {string|number} avenantId - The ID of the avenant to update.
 * @param {FormData} formData - FormData containing fields, optional 'avenant_files[]',
 *                            optional 'delete_doc_ids[]', and _method='PUT'.
 */
const updateAvenant = async (avenantId, formData) => {
    // Use the direct avenant route with POST and _method=PUT
    const response = await apiClient.post(`/avenants/${avenantId}`, formData);
    // Assuming backend returns { success: "...", avenant: {...} }
    return response.data;
};

/**
 * Delete an Avenant by its ID.
 * @param {string|number} avenantId
 */
const deleteAvenant = async (avenantId) => {
    const response = await apiClient.delete(`/avenants/${avenantId}`);
    // Assuming backend returns { success: "..." }
    return response.data;
};


// --- Helper/Dropdown Option API Functions ---

const getProgrammes = async () => {
    const response = await apiClient.get('/programmes'); // Adjust endpoint if different
    // Assuming backend returns { programmes: [...] } or similar
    return handleResponseData(response, 'programmes');
};

const getPartenaires = async () => {
    const response = await apiClient.get('/partenaires'); // Adjust endpoint if different
    // Assuming backend returns { partenaires: [...] } or similar
    return handleResponseData(response, 'partenaires');
};

const getProvinces = async () => {
    const response = await apiClient.get('/provinces'); // Adjust endpoint if different
    // Assuming backend returns { provinces: [...] } or similar
    return handleResponseData(response, 'provinces');
};


// --- Exports ---
export {
    // Conventions
    getConventions,
    getConvention,
    createConvention,
    updateConvention,
    deleteConvention,

    // Avenants
    getAvenants,
    getAvenantsForConvention,
    getAvenant,
    createAvenant,
    updateAvenant,
    deleteAvenant,

    // Options
    getProgrammes,
    getPartenaires,
    getProvinces,
};

// Default export can be the client itself if needed elsewhere
// export default apiClient;