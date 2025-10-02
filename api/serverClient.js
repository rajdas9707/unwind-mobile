// Backend Server API Client (Non-AI operations)
import axios from "axios";
import { auth } from "../firebaseConfig";

const SERVER_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://20.255.57.181:5000";

const API_DEBUG = process.env.EXPO_PUBLIC_API_DEBUG === "true";

// Centralized error handling result type
export const ServerApiResult = {
  success: (data, status = 200) => ({ success: true, data, status }),
  error: (message, status = 500, code = "UNKNOWN_ERROR") => ({
    success: false,
    error: { message, status, code },
  }),
};

const serverClient = axios.create({
  baseURL: SERVER_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // 10 seconds for regular server operations
});

// Respect data sync settings from AsyncStorage
let SYNC_ENABLED_CACHE = true;

async function isSyncEnabled() {
  try {
    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const raw = await AsyncStorage.getItem("dataSyncSettings");
    if (!raw) return true;
    const parsed = JSON.parse(raw);
    return parsed?.dataSyncEnabled !== false;
  } catch (e) {
    return true;
  }
}

export async function setSyncEnabledInCache(enabled) {
  SYNC_ENABLED_CACHE = !!enabled;
}

// Enhanced error handling for server operations
const handleServerError = (error) => {
  if (API_DEBUG) {
    console.log("Server API Error:", error);
  }

  if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
    return ServerApiResult.error("Request was cancelled", 0, "CANCELLED");
  }

  if (!error.response) {
    return ServerApiResult.error(
      "Cannot reach the server. Please check your internet connection and try again.",
      0,
      "NETWORK_ERROR"
    );
  }

  const status = error.response.status;
  const serverMessage =
    error.response.data?.message || error.response.data?.error;

  switch (status) {
    case 401:
      return ServerApiResult.error(
        "Your session has expired. Please login again.",
        401,
        "UNAUTHORIZED"
      );
    case 400:
      return ServerApiResult.error(
        serverMessage || "Invalid request. Please check your input.",
        400,
        "BAD_REQUEST"
      );
    case 403:
      return ServerApiResult.error(
        "You do not have permission to perform this action.",
        403,
        "FORBIDDEN"
      );
    case 404:
      return ServerApiResult.error(
        "The requested resource was not found.",
        404,
        "NOT_FOUND"
      );
    case 429:
      return ServerApiResult.error(
        "Too many requests. Please wait a moment and try again.",
        429,
        "RATE_LIMITED"
      );
    case 500:
    case 502:
    case 503:
    case 504:
      return ServerApiResult.error(
        "Server error. Please try again later.",
        status,
        "SERVER_ERROR"
      );
    default:
      return ServerApiResult.error(
        serverMessage || "An unexpected error occurred.",
        status,
        "UNKNOWN_ERROR"
      );
  }
};

// Request interceptor for authentication and sync check
serverClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Check if sync is enabled for non-auth endpoints
      const isAuthEndpoint = config.url.includes('/auth/');
      if (!isAuthEndpoint) {
        const syncEnabled = await isSyncEnabled();
        if (!syncEnabled) {
          throw new Error('Data sync is disabled. Enable sync in Privacy settings to use cloud features.');
        }
      }
    } catch (error) {
      if (error.message.includes('Data sync is disabled')) {
        throw error;
      }
      console.log("Failed to get auth token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for centralized error handling
serverClient.interceptors.response.use(
  (response) => {
    return ServerApiResult.success(response.data, response.status);
  },
  (error) => {
    return Promise.resolve(handleServerError(error));
  }
);

// ===== AUTHENTICATION FUNCTIONS =====

export async function signup({ uid, email, name, trialStart }) {
  if (API_DEBUG) {
    console.log("Signup called with:", { uid, email, name, trialStart });
  }
  const body = JSON.stringify({ uid, email, name, trialStart });

  const result = await serverClient.post(`/api/auth/signup`, body, {});

  if (result.success) {
    if (API_DEBUG) {
      console.log("Signup response:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      console.log("Signup error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

export async function getProfile({ uid, signal } = {}) {
  const result = await serverClient.get(`/api/auth/profile`, { signal });
  if (!result.success) {
    throw new Error(result.error.message);
  }
  return result.data;
}

// ===== JOURNAL FUNCTIONS (NON-AI OPERATIONS) =====

export async function listJournalEntries({
  date,
  page = 1,
  limit = 50,
  signal,
} = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  
  if (API_DEBUG) {
    console.log("listJournalEntries query:", qs);
  }

  const result = await serverClient.get(`/api/journal${qs}`, { signal });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

export async function getJournalEntry({ id, signal }) {
  const result = await serverClient.get(`/api/journal/${id}`, { signal });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

export async function deleteJournalEntry({ id }) {
  const result = await serverClient.delete(`/api/journal/${id}`);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

export async function updateJournalEntry({ id, content, tags, mood }) {
  const body = { content, tags, mood };
  const result = await serverClient.put(`/api/journal/${id}`, body);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

// ===== ANALYZED JOURNAL FUNCTIONS =====

export async function getAnalyzedJournalEntries({
  sentiment,
  minScore,
  maxScore,
  hasIssues,
  date,
  page = 1,
  limit = 50,
  signal
} = {}) {
  const params = new URLSearchParams();
  if (sentiment) params.set("sentiment", sentiment);
  if (minScore !== undefined) params.set("minScore", String(minScore));
  if (maxScore !== undefined) params.set("maxScore", String(maxScore));
  if (hasIssues !== undefined) params.set("hasIssues", String(hasIssues));
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  
  const qs = params.toString() ? `?${params.toString()}` : "";
  
  if (API_DEBUG) {
    console.log("getAnalyzedJournalEntries query:", qs);
  }

  const result = await serverClient.get(`/api/journal/analyzed${qs}`, { signal });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

// ===== OTHER ENTITY FUNCTIONS =====

// Overthinking endpoints
export async function listOverthinkingEntries({
  date,
  page = 1,
  limit = 50,
  signal,
} = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const result = await serverClient.get(`/api/overthinking${qs}`, { signal });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

export async function createOverthinkingEntry({ thought, solution, date }) {
  const body = { thought, solution, date };
  
  if (API_DEBUG) {
    console.log("createOverthinkingEntry called with:", body);
  }

  const result = await serverClient.post(`/api/overthinking`, body);

  if (result.success) {
    if (API_DEBUG) {
      console.log("createOverthinkingEntry result:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      console.log("createOverthinkingEntry error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

export async function deleteOverthinkingEntry({ id }) {
  const result = await serverClient.delete(`/api/overthinking/${id}`);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

// Mistakes endpoints
export async function listMistakesEntries({
  date,
  page = 1,
  limit = 50,
  signal,
} = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const result = await serverClient.get(`/api/mistakes${qs}`, { signal });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

export async function createMistakeEntry({
  mistake,
  solution,
  category,
  date,
}) {
  const body = { mistake, solution, category, date };

  const result = await serverClient.post(`/api/mistakes`, body);

  if (result.success) {
    if (API_DEBUG) {
      console.log("createMistakeEntry result:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      console.log("createMistakeEntry error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

export async function deleteMistakeEntry({ id }) {
  const result = await serverClient.delete(`/api/mistakes/${id}`);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

// ===== USER ACCOUNT FUNCTIONS =====

export async function deleteUserAccount() {
  if (API_DEBUG) {
    console.log("deleteUserAccount called");
  }

  const result = await serverClient.delete(`/api/auth/account`);

  if (result.success) {
    if (API_DEBUG) {
      console.log("deleteUserAccount result:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      console.log("deleteUserAccount error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

export function getHelpCenterUrl() {
  return `${SERVER_BASE_URL}/help-center`;
}

export { SERVER_BASE_URL };
export default serverClient;