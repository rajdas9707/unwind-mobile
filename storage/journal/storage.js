import { Alert } from "react-native";
import * as db from "./db";
import { createJournalEntry, deleteJournalEntry } from "../../api/client";
import { useNetworkStatus } from "../../utils/networkUtils";

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
    content: content.trim()
  };
};

// Get basic sentiment emoji based on keywords
const getSentimentEmoji = (content) => {
  const lowerContent = content.toLowerCase();
  
  // Positive keywords
  const positiveWords = ["happy", "joy", "excited", "grateful", "amazing", "wonderful", "great", "love", "good", "awesome", "fantastic", "excellent"];
  const negativeWords = ["sad", "angry", "frustrated", "upset", "terrible", "awful", "hate", "bad", "horrible", "depressed", "anxious", "worry"];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    if (lowerContent.includes(word)) positiveCount++;
  });
  
  negativeWords.forEach(word => {
    if (lowerContent.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return "😊";
  if (negativeCount > positiveCount) return "😔";
  return "😐";
};

// Create new journal entry with validation and rate limiting
export const createJournalEntryLocal = async ({ title, content, idToken }) => {
  try {
    // Validate input
    const validatedData = validateJournalEntry(content, title);
    
    // Check daily limit (3 entries per day)
    const today = new Date().toISOString().split('T')[0];
    const todayCount = await db.getJournalEntriesCountForDate(today);
    
    if (todayCount >= 3) {
      throw new Error("You can only create 3 journal entries per day. Try again tomorrow!");
    }
    
    // Create timestamps
    const now = new Date().toISOString();
    
    // Insert locally first
    const localEntry = await db.insertJournalEntry({
      title: validatedData.title,
      content: validatedData.content,
      created_at: now,
      updated_at: now
    });
    
    return {
      ...localEntry,
      sentiment: getSentimentEmoji(validatedData.content)
    };
  } catch (error) {
    console.error("Error creating journal entry:", error);
    throw error;
  }
};

// Sync single journal entry to server
export const syncJournalEntryToServer = async ({ entry, idToken }) => {
  try {
    if (!idToken) {
      throw new Error("Authentication required for syncing");
    }
    
    if (entry.synced) {
      return entry; // Already synced
    }
    
    // Create entry on server
    const serverEntry = await createJournalEntry({
      idToken,
      content: entry.content,
      date: entry.created_at.split('T')[0],
      title: entry.title
    });
    
    // Mark as synced locally
    const syncedEntry = await db.markJournalEntrySynced({
      id: entry.id,
      server_id: serverEntry._id,
      server_meta: {
        createdAt: serverEntry.createdAt,
        updatedAt: serverEntry.updatedAt,
        tags: serverEntry.tags || [],
        mood: serverEntry.mood || null
      }
    });
    
    return syncedEntry;
  } catch (error) {
    console.error("Error syncing journal entry to server:", error);
    throw error;
  }
};

// Sync all unsynced journal entries with rate limiting
export const syncAllJournalEntries = async ({ idToken }) => {
  try {
    if (!idToken) {
      throw new Error("Authentication required for syncing");
    }
    
    // Check daily sync limit (3 syncs per day)
    const todaySyncCount = await db.getSyncAttemptsCountToday();
    if (todaySyncCount >= 3) {
      throw new Error("You can only sync 3 times per day. Try again tomorrow!");
    }
    
    const unsyncedEntries = await db.getUnsyncedJournalEntries();
    
    if (unsyncedEntries.length === 0) {
      return { syncedCount: 0, failedCount: 0 };
    }
    
    let syncedCount = 0;
    let failedCount = 0;
    const errors = [];
    
    for (const entry of unsyncedEntries) {
      try {
        await syncJournalEntryToServer({ entry, idToken });
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
      total: unsyncedEntries.length
    };
  } catch (error) {
    console.error("Error syncing all journal entries:", error);
    throw error;
  }
};

// Fetch recent journal entries with sentiment
export const fetchRecentJournalEntries = async (limit = 10) => {
  try {
    const entries = await db.getRecentJournalEntries(limit);
    
    return entries.map(entry => ({
      ...entry,
      sentiment: getSentimentEmoji(entry.content),
      truncatedContent: entry.content.length > 100 
        ? entry.content.substring(0, 100) + "..."
        : entry.content
    }));
  } catch (error) {
    console.error("Error fetching recent journal entries:", error);
    throw error;
  }
};

// Fetch journal entries by date with sentiment
export const fetchJournalsByDate = async (date) => {
  try {
    const entries = await db.getJournalEntriesByDate(date);
    
    return entries.map(entry => ({
      ...entry,
      sentiment: getSentimentEmoji(entry.content),
      truncatedContent: entry.content.length > 100 
        ? entry.content.substring(0, 100) + "..."
        : entry.content
    }));
  } catch (error) {
    console.error("Error fetching journal entries by date:", error);
    throw error;
  }
};

// Get single journal entry by ID
export const fetchJournalEntryById = async (id) => {
  try {
    const entry = await db.getJournalEntryById(id);
    
    if (!entry) return null;
    
    return {
      ...entry,
      sentiment: getSentimentEmoji(entry.content)
    };
  } catch (error) {
    console.error("Error fetching journal entry by ID:", error);
    throw error;
  }
};

// Update journal entry with validation
export const updateJournalEntryLocal = async ({ id, title, content }) => {
  try {
    // Validate input
    const validatedData = validateJournalEntry(content, title);
    
    const updatedEntry = await db.updateJournalEntry({
      id,
      title: validatedData.title,
      content: validatedData.content,
      updated_at: new Date().toISOString()
    });
    
    return {
      ...updatedEntry,
      sentiment: getSentimentEmoji(validatedData.content)
    };
  } catch (error) {
    console.error("Error updating journal entry:", error);
    throw error;
  }
};

// Delete journal entry locally and from server
export const deleteJournalEntryLocal = async ({ entry, idToken }) => {
  try {
    // Delete from local database first
    await db.deleteJournalEntryById(entry.id);
    
    // If entry was synced, also delete from server
    if (entry.synced && entry.server_id && idToken) {
      try {
        await deleteJournalEntry({ idToken, id: entry.server_id });
      } catch (serverError) {
        console.warn("Failed to delete from server, but local deletion succeeded:", serverError);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting journal entry:", error);
    throw error;
  }
};

// Get unsynced entries count
export const getUnsyncedCount = async () => {
  try {
    const unsyncedEntries = await db.getUnsyncedJournalEntries();
    return unsyncedEntries.length;
  } catch (error) {
    console.error("Error getting unsynced count:", error);
    return 0;
  }
};

// Check if user can create more entries today
export const canCreateEntryToday = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = await db.getJournalEntriesCountForDate(today);
    return todayCount < 3;
  } catch (error) {
    console.error("Error checking daily limit:", error);
    return false;
  }
};

// Check if user can sync today
export const canSyncToday = async () => {
  try {
    const todaySyncCount = await db.getSyncAttemptsCountToday();
    return todaySyncCount < 3;
  } catch (error) {
    console.error("Error checking sync limit:", error);
    return false;
  }
};

// Sync from server (download server entries to local)
export const syncFromServer = async ({ idToken }) => {
  try {
    if (!idToken) {
      return { downloaded: 0 };
    }
    
    // This would need to be implemented in your API client
    // For now, we'll skip this as it's not in the existing client.js
    console.log("Server sync not yet implemented");
    return { downloaded: 0 };
  } catch (error) {
    console.error("Error syncing from server:", error);
    throw error;
  }
};