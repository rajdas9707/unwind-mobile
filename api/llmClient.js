// LLM Service API Client
import axios from "axios";
import { auth } from "../firebaseConfig";

const LLM_BASE_URL = 
  process.env.EXPO_PUBLIC_LLM_URL || "http://20.255.57.181:5001";

const API_DEBUG = process.env.EXPO_PUBLIC_API_DEBUG === "true";

// Centralized error handling result type
export const LLMApiResult = {
  success: (data, status = 200) => ({ success: true, data, status }),
  error: (message, status = 500, code = "UNKNOWN_ERROR") => ({
    success: false,
    error: { message, status, code },
  }),
};

const llmClient = axios.create({
  baseURL: LLM_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 45000, // 45 seconds for LLM processing
});

// Enhanced error handling for LLM service
const handleLLMError = (error) => {
  if (API_DEBUG) {
    console.log("LLM API Error:", error);
  }

  if (error.name === "AbortError" || error.code === "ERR_CANCELED") {
    return LLMApiResult.error("Request was cancelled", 0, "CANCELLED");
  }

  if (!error.response) {
    return LLMApiResult.error(
      "Cannot reach the LLM service. Please check your connection.",
      0,
      "NETWORK_ERROR"
    );
  }

  const status = error.response.status;
  const serverMessage =
    error.response.data?.message || error.response.data?.error;

  switch (status) {
    case 401:
      return LLMApiResult.error(
        "Authentication failed with LLM service",
        401,
        "UNAUTHORIZED"
      );
    case 400:
      return LLMApiResult.error(
        serverMessage || "Invalid request to LLM service",
        400,
        "BAD_REQUEST"
      );
    case 429:
      return LLMApiResult.error(
        "LLM service is busy. Please wait and try again.",
        429,
        "RATE_LIMITED"
      );
    case 500:
    case 502:
    case 503:
    case 504:
      return LLMApiResult.error(
        "LLM service error. Please try again later.",
        status,
        "SERVER_ERROR"
      );
    default:
      return LLMApiResult.error(
        serverMessage || "LLM service request failed",
        status,
        "UNKNOWN_ERROR"
      );
  }
};

// Request interceptor for authentication
llmClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log("Failed to get auth token for LLM service:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for centralized error handling
llmClient.interceptors.response.use(
  (response) => {
    return LLMApiResult.success(response.data, response.status);
  },
  (error) => {
    return Promise.resolve(handleLLMError(error));
  }
);

// ===== LLM SERVICE API FUNCTIONS =====

/**
 * Process journal entry with AI analysis
 * This will analyze the journal and then store it in the backend
 */
export async function processJournalWithAI({ 
  content, 
  date, 
  tags, 
  mood, 
  userId,
  signal 
}) {
  const body = { 
    content, 
    date, 
    tags, 
    mood, 
    userId 
  };
  
  if (API_DEBUG) {
    console.log("processJournalWithAI called with:", {
      contentLength: content?.length,
      date,
      tagsCount: tags?.length,
      mood,
      userId
    });
  }

  const result = await llmClient.post(`/api/journal/process`, body, { signal });

  if (result.success) {
    if (API_DEBUG) {
      console.log("processJournalWithAI result:", {
        success: result.data.success,
        sentiment: result.data.analysis?.sentiment,
        score: result.data.analysis?.overallScore,
        stored: result.data.stored
      });
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      console.log("processJournalWithAI error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

/**
 * Get LLM service health status
 */
export async function getLLMServiceStatus() {
  if (API_DEBUG) {
    console.log("getLLMServiceStatus called");
  }

  const result = await llmClient.get(`/api/health`);

  if (result.success) {
    if (API_DEBUG) {
      console.log("getLLMServiceStatus result:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      console.log("getLLMServiceStatus error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

/**
 * Direct AI query (for testing or other AI features)
 */
export async function askAI(prompt, options = {}) {
  const body = { prompt, options };
  
  if (API_DEBUG) {
    console.log("askAI called with:", { promptLength: prompt?.length });
  }

  const result = await llmClient.post(`/api/ask`, body);

  if (result.success) {
    if (API_DEBUG) {
      console.log("askAI result:", {
        provider: result.data.provider,
        model: result.data.model
      });
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      console.log("askAI error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

/**
 * Test LLM service integration
 */
export async function testLLMIntegration() {
  if (API_DEBUG) {
    console.log("testLLMIntegration called");
  }

  const result = await llmClient.post(`/api/test-integration`, {});

  if (result.success) {
    if (API_DEBUG) {
      console.log("testLLMIntegration result:", result.data);
    }
    return result.data;
  } else {
    if (API_DEBUG) {
      console.log("testLLMIntegration error:", result.error);
    }
    throw new Error(result.error.message);
  }
}

export { LLM_BASE_URL };
export default llmClient;