import { Alert } from "react-native";
import * as db from "./db";
import {
  createOverthinkingEntry,
  deleteOverthinkingEntry,
} from "../../api/client";

// Business logic and validation layer for overthinking entries

// Validate overthinking entry content
const validateOverthinkingEntry = (thought, title = "", solution = "") => {
  if (!thought || typeof thought !== "string" || thought.trim().length === 0) {
    throw new Error("Overthinking thought is required and cannot be empty");
  }

  if (thought.trim().length > 5000) {
    throw new Error("Thought must be less than 5000 characters");
  }

  if (title && title.length > 200) {
    throw new Error("Title must be less than 200 characters");
  }

  if (solution && solution.length > 2000) {
    throw new Error("Solution must be less than 2000 characters");
  }

  return {
    title: title?.trim() || "",
    thought: thought.trim(),
    solution: solution?.trim() || "",
  };
};

// Get mood emoji based on thought content
const getMoodEmoji = (thought) => {
  const lowerThought = thought.toLowerCase();

  // Anxiety keywords
  const anxiousWords = [
    "worry",
    "anxious",
    "nervous",
    "stress",
    "panic",
    "fear",
    "scared",
    "overthink",
    "spiral",
  ];
  const reliefWords = [
    "calm",
    "peace",
    "better",
    "solved",
    "clear",
    "understand",
    "relief",
    "resolved",
  ];

  let anxiousCount = 0;
  let reliefCount = 0;

  anxiousWords.forEach((word) => {
    if (lowerThought.includes(word)) anxiousCount++;
  });

  reliefWords.forEach((word) => {
    if (lowerThought.includes(word)) reliefCount++;
  });

  if (reliefCount > anxiousCount) return "😌";
  if (anxiousCount > reliefCount) return "😰";
  return "🤔";
};

// Create new overthinking entry with validation and rate limiting
export const createOverthinkingEntryLocal = async ({
  title,
  thought,
  solution,
}) => {
  try {
    // Validate input
    const validatedData = validateOverthinkingEntry(thought, title, solution);

    // Check daily limit (5 entries per day for overthinking)
    const today = new Date().toISOString().split("T")[0];
    const todayCount = await db.getOverthinkingEntriesCountForDate(today);

    if (todayCount >= 5) {
      throw new Error(
        "You can only create 5 overthinking entries per day. Try again tomorrow!"
      );
    }

    // Create timestamps
    const now = new Date().toISOString();

    // Insert locally first
    const localEntry = await db.insertOverthinkingEntry({
      title: validatedData.title,
      thought: validatedData.thought,
      solution: validatedData.solution,
      created_at: now,
      updated_at: now,
    });

    return {
      ...localEntry,
      mood: getMoodEmoji(validatedData.thought),
    };
  } catch (error) {
    console.error("Error creating overthinking entry:", error);
    throw error;
  }
};

// Sync single overthinking entry to server
export const syncOverthinkingEntryToServer = async ({ entry }) => {
  if (entry.synced) {
    return entry; // Already synced
  }

  // Create entry on server - error handling is now centralized
  const serverEntry = await createOverthinkingEntry({
    thought: entry.thought,
    solution: entry.solution,
    date: entry.created_at.split("T")[0],
  });

  // Mark as synced locally
  const syncedEntry = await db.markOverthinkingEntrySynced({
    id: entry.id,
    server_id: serverEntry._id,
    server_meta: {
      createdAt: serverEntry.createdAt,
      updatedAt: serverEntry.updatedAt,
      tags: serverEntry.tags || [],
      mood: serverEntry.mood || null,
    },
  });

  return syncedEntry;
};

// Sync all unsynced overthinking entries with rate limiting
export const syncAllOverthinkingEntries = async () => {
  // Check daily sync limit (3 syncs per day)
  const todaySyncCount = await db.getOverthinkingSyncAttemptsCountToday();
  if (todaySyncCount >= 3) {
    throw new Error("You can only sync 3 times per day. Try again tomorrow!");
  }

  const unsyncedEntries = await db.getUnsyncedOverthinkingEntries();

  if (unsyncedEntries.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors = [];

  for (const entry of unsyncedEntries) {
    try {
      await syncOverthinkingEntryToServer({ entry });
      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync overthinking entry ${entry.id}:`, error);
      failedCount++;
      errors.push(`Entry ${entry.id}: ${error.message}`);
    }
  }

  return {
    syncedCount,
    failedCount,
    errors,
    total: unsyncedEntries.length,
  };
};

// Fetch recent overthinking entries with mood
export const fetchRecentOverthinkingEntries = async (limit = 10, signal) => {
  const entries = await db.getRecentOverthinkingEntries(limit);

  return entries.map((entry) => ({
    ...entry,
    mood: getMoodEmoji(entry.thought),
    truncatedThought:
      entry.thought.length > 100
        ? entry.thought.substring(0, 100) + "..."
        : entry.thought,
  }));
};

// Fetch overthinking entries by date with mood
export const fetchOverthinkingByDate = async (date, signal) => {
  const entries = await db.getOverthinkingEntriesByDate(date);

  return entries.map((entry) => ({
    ...entry,
    mood: getMoodEmoji(entry.thought),
    truncatedThought:
      entry.thought.length > 100
        ? entry.thought.substring(0, 100) + "..."
        : entry.thought,
  }));
};

// Get single overthinking entry by ID
export const fetchOverthinkingEntryById = async (id) => {
  const entry = await db.getOverthinkingEntryById(id);

  if (!entry) return null;

  return {
    ...entry,
    mood: getMoodEmoji(entry.thought),
  };
};

// Update overthinking entry with validation
export const updateOverthinkingEntryLocal = async ({
  id,
  title,
  thought,
  solution,
}) => {
  // Validate input
  const validatedData = validateOverthinkingEntry(thought, title, solution);

  const updatedEntry = await db.updateOverthinkingEntry({
    id,
    title: validatedData.title,
    thought: validatedData.thought,
    solution: validatedData.solution,
    updated_at: new Date().toISOString(),
  });

  return {
    ...updatedEntry,
    mood: getMoodEmoji(validatedData.thought),
  };
};

// Toggle dumped status for overthinking entry
export const toggleOverthinkingDumpedLocal = async ({ id, dumped }) => {
  const updatedEntry = await db.toggleOverthinkingDumped({ id, dumped });

  return {
    ...updatedEntry,
    mood: getMoodEmoji(updatedEntry.thought),
  };
};

// Delete overthinking entry locally and from server
export const deleteOverthinkingEntryLocal = async ({ entry }) => {
  // Delete from local database first
  await db.deleteOverthinkingEntryById(entry.id);

  // If entry was synced, also delete from server
  if (entry.synced && entry.server_id) {
    try {
      await deleteOverthinkingEntry({ id: entry.server_id });
    } catch (serverError) {
      console.warn(
        "Failed to delete from server, but local deletion succeeded:",
        serverError
      );
    }
  }

  return true;
};

// Get unsynced entries count
export const getUnsyncedOverthinkingCount = async () => {
  const unsyncedEntries = await db.getUnsyncedOverthinkingEntries();
  return unsyncedEntries.length;
};

// Check if user can create more entries today
export const canCreateOverthinkingEntryToday = async () => {
  const today = new Date().toISOString().split("T")[0];
  const todayCount = await db.getOverthinkingEntriesCountForDate(today);
  return todayCount < 5;
};

// Check if user can sync today
export const canSyncOverthinkingToday = async () => {
  const todaySyncCount = await db.getOverthinkingSyncAttemptsCountToday();
  return todaySyncCount < 3;
};
