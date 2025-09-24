// Lightweight API client for authorized requests to the backend
import axios from "axios";
import { auth } from "../firebaseConfig";
import { Alert } from "react-native";
// import { useNetworkStatus } from "../utils/networkUtils";
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.29.225:5000";


const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 1000, // 1 seconds timeout for all requests
});



//to check whether my server is up and running

// {Response interceptor for centralized error handling}

apiClient.interceptors.response.use(
  response => response,
  

  error => {

    console.log("error",error)
    // Handle network/server errors
    if (!error.response) {
      // No response means network/server unreachable
      Alert.alert('Server Error', 'Cannot reach the server. Please try again later.');
    } else {
      // Server responded with a status code
      const status = error.response.status;

      if (status >= 500) {
        Alert.alert('Server Error', 'Something went wrong on the server.');
      } else if (status === 401) {
        Alert.alert('Unauthorized', 'Your session has expired. Please login again.');
        // Optionally, logout user here
      } else if (status === 400) {
        Alert.alert('Bad Request', error.response.data.message || 'Invalid request');
      } else {
        Alert.alert('Error', error.response.data.message || 'An error occurred');
      }
    }
    return Promise.reject(error);
  }
);
export const client=apiClient



export async function signup({ uid, email, name, trialStart }) {
  console.log("Signup called with:", { uid, email, name, trialStart });
  const body = JSON.stringify({ uid, email, name, trialStart });
  try {
    const response = await client.post(`/api/auth/signup`, body, {});
    console.log("Signup response:", response.data);
    return response.data;
  } catch (error) {
    console.log("Signup error:", error.response?.data || error.message);
    throw error;
  }
}

export async function getProfile({ uid }) {
  await authorizedFetch(`/api/auth/profile`, { method: "GET" });

  const params = new URLSearchParams();
  if (uid) params.set("uid", uid);

  const qs = params.toString() ? `?${params.toString()}` : "";
  // console.log("qs", qs);

  const result = await authorizedFetch(`/api/journal${qs}`, { method: "GET" });

  return result.data;
}

export async function authorizedFetch(path, options = {}) {
  let token;

  try {
  
    // console.log("currentuser", await auth.currentUser);
    token = await auth.currentUser.getIdToken();
  } catch (error) {
    console.log("Failed to retrieve authentication token", error);
    Alert.alert(
      "Authentication Error",
      "Failed to retrieve authentication token. Please log in again."
    );
    // throw new Error("Failed to retrieve authentication token");
  }
  if (!token) {
    console.log("No authentication token available");
    Alert.alert(
      "Authentication Error",
      "No authentication token available. Please log in again."
    );
    return;
  }
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  headers.Authorization = `Bearer ${token}`;
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

  try {
    const response = await client.request({
      url: path,
      method,
      headers,
      data,
      params: options.params,
    });
    return { data: response.data, status: response.status };
  } catch (error) {
    const status = error?.response?.status;
    const payload = error?.response?.data;
    const message =
      (payload && (payload.error || payload.message)) ||
      error?.message ||
      (status ? `Request failed with ${status}` : "Network request failed");
    console.log(message);
  }
}

export { API_BASE_URL };

// Journal endpoints
export async function listJournalEntries({ date, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  console.log("qs", qs);

  const result = await authorizedFetch(`/api/journal${qs}`, { method: "GET" });

  return result.data;
}

export async function createJournalEntry({ content, date, tags, mood }) {
  // console.log("createJournalEntry called with:", { content, date, tags, mood });
  const body = JSON.stringify({ content, date, tags, mood });
  // console.log("Request body:", body);

  try {
    const result = await authorizedFetch(`/api/journal`, {
      method: "POST",
      body,
    });
    console.log("createJournalEntry result:", result);
    if (result.status !== 201) {
      console.log(`Unexpected response status: ${result.status}`);
    }

    return result.data;
  } catch (error) {
    console.log("createJournalEntry error:", error);
  }
}

export async function deleteJournalEntry({ id }) {
  return authorizedFetch(`/api/journal/${id}`, { method: "DELETE" });
}

// Overthinking endpoints
export async function listOverthinkingEntries({
  date,
  page = 1,
  limit = 50,
} = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return authorizedFetch(`/api/overthinking${qs}`, { method: "GET" });
}

export async function createOverthinkingEntry({ thought, solution, date }) {
  const body = JSON.stringify({ thought, solution, date });
  console.log("createOverthinkingEntry called with: client.js ", {
    thought,
    solution,
    date,
  });
  try {
    const result = await authorizedFetch(`/api/overthinking`, {
      method: "POST",
      body,
    });

    console.log("createoverthinking result:", result);
    if (result.status !== 201) {
      throw new Error(`Unexpected response status: ${result.status}`);
    }

    return result.data;
  } catch (error) {
    console.log("createJournalEntry error:", error);
    throw error;
  }
}

export async function deleteOverthinkingEntry({ id }) {
  return authorizedFetch(`/api/overthinking/${id}`, { method: "DELETE" });
}

// Mistakes endpoints
export async function listMistakesEntries({ date, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return authorizedFetch(`/api/mistakes${qs}`, { method: "GET" });
}

export async function createMistakeEntry({
  mistake,
  solution,
  category,
  date,
}) {
  const body = JSON.stringify({ mistake, solution, category, date });
  try {
    const result = await authorizedFetch(`/api/mistakes`, {
      method: "POST",
      body,
    });
    console.log("createMistakeEntry result:", result);

    if (result.status !== 201) {
      throw new Error(`Unexpected response status: ${result.status}`);
    }

    return result.data;
  } catch (error) {
    console.log("createmistakeEntry error:", error);
    throw error;
  }
}

export async function deleteMistakeEntry({ id }) {
  return authorizedFetch(`/api/mistakes/${id}`, { method: "DELETE" });
}

// Todo endpoints
export async function listTodos({ category, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return authorizedFetch(`/api/todos${qs}`, { method: "GET" });
}

export async function createTodo({
  title,
  description,
  category,
  priority,
  dueDate,
}) {
  const body = JSON.stringify({
    title,
    description,
    category,
    priority,
    dueDate,
  });
  return authorizedFetch(`/api/todos`, { method: "POST", body });
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
  const body = JSON.stringify({
    title,
    description,
    category,
    priority,
    dueDate,
    completed,
  });
  return authorizedFetch(`/api/todos/${id}`, { method: "PUT", body });
}

export async function deleteTodo({ id }) {
  return authorizedFetch(`/api/todos/${id}`, { method: "DELETE" });
}
