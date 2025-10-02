import { Alert } from "react-native";

import { createJournalEntry, deleteJournalEntry, getJournalEntry } from "../../api/client";
import { useNetworkStatus } from "../../utils/networkUtils";
import {
  deleteJournalEntryById,
  getJournalEntriesByDate,
  getJournalEntriesCountForDate,
  getJournalEntryById,
  getRecentJournalEntries,
  getSyncAttemptsCountToday,
  getUnsyncedJournalEntries,
  insertJournalEntry,
  markJournalEntrySynced,
  updateJournalEntry,
} from "./db";

// Business logic and validation layer for journal entries

// Validate journal entry content
const validateJournalEntry = (content, title = "") => {
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Journal content is required and cannot be empty");
  }

  if (content.trim().length > 5000) {
    throw new Error("Journal content must be less than 5000 characters");
  }

  if (title && title.length > 200) {
    throw new Error("Journal title must be less than 200 characters");
  }

  return {
    title: title?.trim() || "",
    content: content.trim(),
  };
};

// Get basic sentiment emoji based on keywords
const getSentimentEmoji = (content) => {
  const lowerContent = content.toLowerCase();

  // Positive keywords
  const positiveWords = [
    "happy",
    "joy",
    "excited",
    "grateful",
    "amazing",
    "wonderful",
    "great",
    "love",
    "good",
    "awesome",
    "fantastic",
    "excellent",
  ];
  const negativeWords = [
    "sad",
    "angry",
    "frustrated",
    "upset",
    "terrible",
    "awful",
    "hate",
    "bad",
    "horrible",
    "depressed",
    "anxious",
    "worry",
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  positiveWords.forEach((word) => {
    if (lowerContent.includes(word)) positiveCount++;
  });

  negativeWords.forEach((word) => {
    if (lowerContent.includes(word)) negativeCount++;
  });

  if (positiveCount > negativeCount) return "😊";
  if (negativeCount > positiveCount) return "😔";
  return "😐";
};

// Create new journal entry with validation and rate limiting
export const createJournalEntryLocal = async ({ title, content }) => {
  try {
    // Validate input
    const validatedData = validateJournalEntry(content, title);

    // Check daily limit (3 entries per day)
    const today = new Date().toISOString().split("T")[0];
    const todayCount = await getJournalEntriesCountForDate(today);

    if (todayCount >= 3) {
      throw new Error(
        "You can only create 3 journal entries per day. Try again tomorrow!"
      );
    }

    // Create timestamps
    const now = new Date().toISOString();

    // Insert locally first
    const localEntry = await insertJournalEntry({
      title: validatedData.title,
      content: validatedData.content,
      created_at: now,
      updated_at: now,
    });

    return {
      ...localEntry,
      sentiment: getSentimentEmoji(validatedData.content),
    };
  } catch (error) {
    console.error("Error creating journal entry:", error);
    throw error;
  }
};

// Sync single journal entry to server
export const syncJournalEntryToServer = async ({ entry }) => {
  if (entry.synced) {
    return entry; // Already synced
  }

  // Create entry on server - error handling is now centralized in client.js
  const serverEntry = await createJournalEntry({
    content: entry.content,
    date: entry.created_at.split("T")[0],
    title: entry.title,
  });

  console.log("Server entry created:", serverEntry);
  if (!serverEntry || !serverEntry._id) {
    return null;
  }

  // Mark as synced locally
  const syncedEntry = await markJournalEntrySynced({
    id: entry.id,
    server_id: serverEntry?._id,
    server_meta: {
      createdAt: serverEntry?.createdAt,
      updatedAt: serverEntry?.updatedAt,
      tags: serverEntry?.tags || [],
      mood: serverEntry?.mood || null,
    },
  });

  return syncedEntry;
};

// Sync all unsynced journal entries with rate limiting
export const syncAllJournalEntries = async () => {
  // Check daily sync limit (3 syncs per day)
  const todaySyncCount = await getSyncAttemptsCountToday();
  if (todaySyncCount >= 3) {
    throw new Error("You can only sync 3 times per day. Try again tomorrow!");
  }

  const unsyncedEntries = await getUnsyncedJournalEntries();

  if (unsyncedEntries.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;
  const errors = [];

  for (const entry of unsyncedEntries) {
    try {
      await syncJournalEntryToServer({ entry });
      syncedCount++;
    } catch (error) {
      console.error(`Failed to sync entry ${entry.id}:`, error);
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

// Fetch recent journal entries with sentiment
export const fetchRecentJournalEntries = async (limit = 10, signal) => {
  const entries = await getRecentJournalEntries(limit);

  console.log("Recent entries fetched/storage/journal/storage.js:", entries);

  return entries.map((entry) => ({
    ...entry,
    sentiment: getSentimentEmoji(entry.content),
    truncatedContent:
      entry.content.length > 100
        ? entry.content.substring(0, 100) + "..."
        : entry.content,
  }));
};

// Fetch journal entries by date with sentiment
export const fetchJournalsByDate = async (date, signal) => {
  const entries = await getJournalEntriesByDate(date);

  return entries.map((entry) => ({
    ...entry,
    sentiment: getSentimentEmoji(entry.content),
    truncatedContent:
      entry.content.length > 100
        ? entry.content.substring(0, 100) + "..."
        : entry.content,
  }));
};

// Get single journal entry by ID
export const fetchJournalEntryById = async (id) => {
  const entry = await getJournalEntryById(id);

  if (!entry) return null;

  return {
    ...entry,
    sentiment: getSentimentEmoji(entry.content),
  };
};

// Get combined local and server data for a journal entry (if synced)
export const fetchJournalEntryWithServerData = async (id, signal) => {
  // First get the local entry
  const localEntry = await getJournalEntryById(id);
  
  if (!localEntry) return null;

  const result = {
    local: {
      ...localEntry,
      sentiment: getSentimentEmoji(localEntry.content),
    },
    server: null,
    isSynced: localEntry.synced || false
  };

  // If entry is synced and has server_id, try to fetch server data
  if (localEntry.synced && localEntry.server_id) {
    try {
      const serverEntry = await getJournalEntry({ 
        id: localEntry.server_id, 
        signal 
      });
      
      if (serverEntry) {
        result.server = {
          ...serverEntry,
          sentiment: getSentimentEmoji(serverEntry.content || ''),
        };
      }
    } catch (error) {
      console.warn('Failed to fetch server data for journal entry:', error);
      // Don't throw error, just continue without server data
    }
  }

  return result;
};

// Update journal entry with validation
export const updateJournalEntryLocal = async ({ id, title, content }) => {
  // Validate input
  const validatedData = validateJournalEntry(content, title);

  const updatedEntry = await updateJournalEntry({
    id,
    title: validatedData.title,
    content: validatedData.content,
    updated_at: new Date().toISOString(),
  });

  return {
    ...updatedEntry,
    sentiment: getSentimentEmoji(validatedData.content),
  };
};

// Delete journal entry locally and from server
export const deleteJournalEntryLocal = async ({ entry }) => {
  // Delete from local database first
  await deleteJournalEntryById(entry.id);

  // If entry was synced, also delete from server
  if (entry.synced && entry.server_id) {
    try {
      await deleteJournalEntry({ id: entry.server_id });
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
export const getUnsyncedCount = async () => {
  const unsyncedEntries = await getUnsyncedJournalEntries();
  return unsyncedEntries.length;
};

// Check if user can create more entries today
export const canCreateEntryToday = async () => {
  const today = new Date().toISOString().split("T")[0];
  const todayCount = await getJournalEntriesCountForDate(today);
  return todayCount < 3;
};

// Check if user can sync today
export const canSyncToday = async () => {
  const todaySyncCount = await getSyncAttemptsCountToday();
  return todaySyncCount < 3;
};

// Sync from server (download server entries to local)
export const syncFromServer = async () => {
  // idToken removed, now handled in client.js
  // This would need to be implemented in your API client
  // For now, we'll skip this as it's not in the existing client.js
  console.log("Server sync not yet implemented");
  return { downloaded: 0 };
};
