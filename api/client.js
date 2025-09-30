// Lightweight API client for authorized requests to the backend
import axios from "axios";
import { auth } from "../firebaseConfig";
// import { Alert } from "react-native";
// import { useNetworkStatus } from "../utils/networkUtils";
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.29.225:5000";
const API_DEBUG = process.env.EXPO_PUBLIC_API_DEBUG === "true";

// Centralized error handling result type
export const ApiResult = {
  success: (data, status = 200) => ({ success: true, data, status }),
  error: (message, status = 500, code = "UNKNOWN_ERROR") => ({
    success: false,
    error: { message, status, code },
  }),
};

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000, // 10 seconds timeout for all requests
});

// Respect data sync settings from AsyncStorage
let SYNC_ENABLED_CACHE = true; // default true

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

// Enhanced error handling for AbortController
const handleApiError = (error) => {
  if (API_DEBUG) {
    // eslint-disable-next-line no-console
    console.log("API Error:", error);
  }

  // Handle AbortController cancellation
  if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
    return ApiResult.error("Request was cancelled", 0, "CANCELLED");
  }

  if (!error.response) {
    // Network/server unreachable
    return ApiResult.error(
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
      return ApiResult.error(
        "Your session has expired. Please login again.",
        401,
        "UNAUTHORIZED"
      );
    case 400:
      return ApiResult.error(
        serverMessage || "Invalid request. Please check your input.",
        400,
        "BAD_REQUEST"
      );
    case 403:
      return ApiResult.error(
        "You do not have permission to perform this action.",
        403,
        "FORBIDDEN"
      );
    case 404:
      return ApiResult.error(
        "The requested resource was not found.",
        404,
        "NOT_FOUND"
      );
    case 429:
      return ApiResult.error(
        "Too many requests. Please wait a moment and try again.",
        429,
        "RATE_LIMITED"
      );
    case 500:
    case 502:
    case 503:
    case 504:
      return ApiResult.error(
        "Server error. Please try again later.",
        status,
        "SERVER_ERROR"
      );
    default:
      return ApiResult.error(
        serverMessage || "An unexpected error occurred.",
        status,
        "UNKNOWN_ERROR"
      );
  }
};

// Request interceptor for authentication and sync check
apiClient.interceptors.request.use(
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
      // Don't block the request, let the server handle auth errors
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => {
    // Success response - return standardized format
    return ApiResult.success(response.data, response.status);
  },
  (error) => {
    // Error response - return standardized error format
    return Promise.resolve(handleApiError(error));
  }
);
export const client = apiClient;

export async function signup({ uid, email, name, trialStart }) {
  if (API_DEBUG) {
    // eslint-disable-next-line no-console
    console.log("Signup called with:", { uid, email, name, trialStart });
  }
  const body = JSON.stringify({ uid, email, name, trialStart });

  const result = await client.post(`/api/auth/signup`, body, {});

  if (result.success) {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.log("Signup response:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.log("Signup error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

export async function getProfile({ uid, signal } = {}) {
  const profileResult = await client.get(`/api/auth/profile`, { signal });
  if (!profileResult.success) {
    throw new Error(profileResult.error.message);
  }

  const params = new URLSearchParams();
  if (uid) params.set("uid", uid);

  const qs = params.toString() ? `?${params.toString()}` : "";

  const result = await client.get(`/api/journal${qs}`, { signal });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

// Legacy function - now handled by interceptors
// This function is deprecated and will be removed
export async function authorizedFetch(path, options = {}) {
  console.warn("authorizedFetch is deprecated. Use client methods directly.");

  const method = (options.method || "GET").toLowerCase();
  let data;

  if (typeof options.body === "string") {
    try {
      data = JSON.parse(options.body);
    } catch {
      data = options.body;
    }
  } else if (options.body !== undefined) {
    data = options.body;
  }

  const result = await client.request({
    url: path,
    method,
    data,
    params: options.params,
    signal: options.signal, // Support AbortController
  });

  if (result.success) {
    return { data: result.data, status: result.status };
  } else {
    throw new Error(result.error.message);
  }
}

export { API_BASE_URL };

export function getHelpCenterUrl() {
  return `${API_BASE_URL}/help-center`;
}

// Meditation is now served locally inside the app; no remote URL

// Journal endpoints
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
    // eslint-disable-next-line no-console
    console.log("qs", qs);
  }

  const result = await client.get(`/api/journal${qs}`, { signal });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

export async function createJournalEntry({ content, date, tags, mood }) {
  const body = { content, date, tags, mood };
  if (API_DEBUG) {
    // eslint-disable-next-line no-console
    console.log("createJournalEntry called with:", body);
  }

  const result = await client.post(`/api/journal`, body);

  if (result.success) {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.log("createJournalEntry result:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.log("createJournalEntry error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

export async function deleteJournalEntry({ id }) {
  const result = await client.delete(`/api/journal/${id}`);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

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

  const result = await client.get(`/api/overthinking${qs}`, { signal });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

export async function createOverthinkingEntry({ thought, solution, date }) {
  const body = { thought, solution, date };
  if (API_DEBUG) {
    // eslint-disable-next-line no-console
    console.log("createOverthinkingEntry called with:", body);
  }

  const result = await client.post(`/api/overthinking`, body);

  if (result.success) {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.log("createoverthinking result:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.log("createOverthinkingEntry error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

export async function deleteOverthinkingEntry({ id }) {
  const result = await client.delete(`/api/overthinking/${id}`);

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

  const result = await client.get(`/api/mistakes${qs}`, { signal });

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

  const result = await client.post(`/api/mistakes`, body);

  if (result.success) {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.log("createMistakeEntry result:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.log("createMistakeEntry error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

export async function deleteMistakeEntry({ id }) {
  const result = await client.delete(`/api/mistakes/${id}`);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

// Todo endpoints
export async function listTodos({
  category,
  page = 1,
  limit = 50,
  signal,
} = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const result = await client.get(`/api/todos${qs}`, { signal });

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

export async function createTodo({
  title,
  description,
  category,
  priority,
  dueDate,
}) {
  const body = {
    title,
    description,
    category,
    priority,
    dueDate,
  };

  const result = await client.post(`/api/todos`, body);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

export async function updateTodo({
  id,
  title,
  description,
  category,
  priority,
  dueDate,
  completed,
}) {
  const body = {
    title,
    description,
    category,
    priority,
    dueDate,
    completed,
  };

  const result = await client.put(`/api/todos/${id}`, body);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

export async function deleteTodo({ id }) {
  const result = await client.delete(`/api/todos/${id}`);

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}

// Delete user account endpoint
export async function deleteUserAccount() {
  if (API_DEBUG) {
    // eslint-disable-next-line no-console
    console.log("deleteUserAccount called");
  }

  const result = await client.delete(`/api/auth/account`);

  if (result.success) {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.log("deleteUserAccount result:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      // eslint-disable-next-line no-console
      console.log("deleteUserAccount error:", result.error);
    }
    throw new Error(result.error.message);
  }
}
