// Lightweight API client for authorized requests to the backend
import axios from "axios";
import { auth } from "../firebaseConfig";
import { Alert } from "react-native";
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://192.168.29.225:5000";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export async function authorizedFetch(path, options = {}, idToken) {
  // Auto-attach Firebase ID token if available
  let token = idToken;
  try {
    if (!token && auth?.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
  } catch {
    Alert.alert(
      "Authentication Error",
      "Failed to retrieve authentication token. Please log in again."
    );
    throw new Error("Failed to retrieve authentication token");
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

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
    throw new Error(message);
  }
}

export { API_BASE_URL };

// Journal endpoints
export async function listJournalEntries({
  idToken,
  date,
  page = 1,
  limit = 50,
} = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  console.log("qs", qs);

  const result = await authorizedFetch(
    `/api/journal${qs}`,
    { method: "GET" },
    idToken
  );
  
  return result.data;
}

export async function createJournalEntry({
  idToken,
  content,
  date,
  tags,
  mood,
}) {
  console.log("createJournalEntry called with:", { content, date, tags, mood });
  const body = JSON.stringify({ content, date, tags, mood });
  console.log("Request body:", body);

  try {
    const result = await authorizedFetch(
      `/api/journal`,
      { method: "POST", body },
      idToken
    );
    console.log("createJournalEntry result:", result);
    if (result.status !== 201) {
      throw new Error(`Unexpected response status: ${result.status}`);
    }

    return result.data;
  } catch (error) {
    console.log("createJournalEntry error:", error);
    throw error;
  }
}

export async function deleteJournalEntry({ idToken, id }) {
  return authorizedFetch(`/api/journal/${id}`, { method: "DELETE" }, idToken);
}

// Overthinking endpoints
export async function listOverthinkingEntries({
  idToken,
  date,
  page = 1,
  limit = 50,
} = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return authorizedFetch(`/api/overthinking${qs}`, { method: "GET" }, idToken);
}

export async function createOverthinkingEntry({
  idToken,
  thought,
  solution,
  date,
}) {
  const body = JSON.stringify({ thought, solution, date });
  console.log("createOverthinkingEntry called with: client.js ", {
    thought,
    solution,
    date,
  });
  try {
    const result = await authorizedFetch(
      `/api/overthinking`,
      { method: "POST", body },
      idToken
    );

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

export async function deleteOverthinkingEntry({ idToken, id }) {
  return authorizedFetch(
    `/api/overthinking/${id}`,
    { method: "DELETE" },
    idToken
  );
}

// Mistakes endpoints
export async function listMistakesEntries({
  idToken,
  date,
  page = 1,
  limit = 50,
} = {}) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return authorizedFetch(`/api/mistakes${qs}`, { method: "GET" }, idToken);
}

export async function createMistakeEntry({
  idToken,
  mistake,
  solution,
  category,
  date,
}) {
  const body = JSON.stringify({ mistake, solution, category, date });
  try {
    const result = await authorizedFetch(
      `/api/mistakes`,
      { method: "POST", body },
      idToken
    );
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

export async function deleteMistakeEntry({ idToken, id }) {
  return authorizedFetch(`/api/mistakes/${id}`, { method: "DELETE" }, idToken);
}

// Todo endpoints
export async function listTodos({
  idToken,
  category,
  page = 1,
  limit = 50,
} = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return authorizedFetch(`/api/todos${qs}`, { method: "GET" }, idToken);
}

export async function createTodo({
  idToken,
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
  return authorizedFetch(`/api/todos`, { method: "POST", body }, idToken);
}

export async function updateTodo({
  idToken,
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
  return authorizedFetch(`/api/todos/${id}`, { method: "PUT", body }, idToken);
}

export async function deleteTodo({ idToken, id }) {
  return authorizedFetch(`/api/todos/${id}`, { method: "DELETE" }, idToken);
}
