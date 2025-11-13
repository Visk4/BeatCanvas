import axios from "axios";

// This is your FastAPI backend URL
const API_URL = "http://localhost:8000/api/v1";

const client = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// ---- Auth token handling ----
export const authTokenKey = "bc_auth_token";

export const getToken = () => localStorage.getItem(authTokenKey);
export const setToken = (token) => localStorage.setItem(authTokenKey, token);
export const clearToken = () => localStorage.removeItem(authTokenKey);

client.interceptors.request.use((config) => {
    const token = getToken();
    if (token) {
        config.headers = config.headers || {};
        config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
});

// --- Helper Functions to mimic Base 44 ---

// Mimics base44.integrations.Core.UploadFile
const Core = {
    UploadFile: async ({ file }) => {
        const formData = new FormData();
        formData.append("file", file);

        // We use a different endpoint from the main API_URL
        const { data } = await axios.post("http://localhost:8000/core/uploadfile", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return data; // { file_url: "..." }
    },
};

// Generic entity handler
const createEntityClient = (name) => ({
    create: async (data) => {
        // This is a special case for the *Beat* detector
        if (name === 'BeatAnalysis') {
            const formData = new FormData();
            formData.append("file", data.audioFile); // Assumes audioFile is passed

            const { data: result } = await client.post("/analyze-audio", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return result;
        }

        // This is for creating a *VideoAnalysis* (which is now done by /analyze-video)
        // This function shouldn't be called by VideoUploader anymore, but we leave it
        // for compatibility with the History/Templates page logic if needed.
        const { data: result } = await client.post(`/entities/${name}/create`, data);
        return result;
    },

    update: async (id, data) => {
        const { data: result } = await client.post(`/analyses/${id}`, data);
        return result;
    },

    get: async (id) => {
        const { data } = await client.get(`/analyses/${id}`);
        return data;
    },

    list: async (sortKey, limit) => {
        // This now only lists VIDEO analyses
        const { data } = await client.get("/analyses");
        return data;
    },

    delete: async (id) => {
        const { data } = await client.delete(`/analyses/${id}`);
        return data;
    },
});

// Export the 'base44' object
export const base44 = {
    entities: {
        VideoAnalysis: createEntityClient("VideoAnalysis"),
        BeatAnalysis: createEntityClient("BeatAnalysis"),
    },
    integrations: {
        Core: Core,
    },
    auth: {
        async register({ email, password }) {
            const { data } = await client.post(`/auth/register`, { email, password });
            if (data?.access_token) setToken(data.access_token);
            return data;
        },
        async login({ email, password }) {
            const { data } = await client.post(`/auth/login`, { email, password });
            if (data?.access_token) setToken(data.access_token);
            return data;
        },
        async me() {
            const { data } = await client.get(`/auth/me`);
            return data;
        },
        logout() {
            clearToken();
        }
    }
};

// Export the raw client for our new logic
export default client;