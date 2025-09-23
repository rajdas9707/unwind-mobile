import * as SQLite from "expo-sqlite";
import { openDB } from "../mainDb";

// Initialize database with tables and indexes
export const initMistakesTable = async (db) => {
  try {
    // const db = await openDB();

    // Create mistakes table with required schema
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS mistakes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        mistake TEXT NOT NULL,
        solution TEXT NOT NULL,
        category TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        server_id TEXT,
        server_meta TEXT,
        avoided INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Create index for faster queries
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_mistakes_created_at ON mistakes(created_at);
      CREATE INDEX IF NOT EXISTS idx_mistakes_synced ON mistakes(synced);
      CREATE INDEX IF NOT EXISTS idx_mistakes_server_id ON mistakes(server_id);
      CREATE INDEX IF NOT EXISTS idx_mistakes_category ON mistakes(category);
    `);

    console.log("✅ Mistakes database initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing mistakes database:", error);
    // Reset the instance so we can retry

    throw error;
  }
};

// Insert new mistakes entry (locally, unsynced)
export const insertMistakesEntry = async ({
  title = "",
  mistake,
  solution,
  category,
  created_at,
  updated_at,
}) => {
  try {
    const db = await openDB();
    const result = await db.runAsync(
      "INSERT INTO mistakes (title, mistake, solution, category, created_at, updated_at, synced, avoided) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
      [title, mistake, solution, category, created_at, updated_at]
    );

    // Return the newly created entry
    const newEntry = await db.getFirstAsync(
      "SELECT * FROM mistakes WHERE id = ?",
      [result.lastInsertRowId]
    );

    return {
      ...newEntry,
      server_meta: newEntry.server_meta
        ? JSON.parse(newEntry.server_meta)
        : null,
    };
  } catch (error) {
    console.error("Error inserting mistakes entry:", error);
    throw error;
  }
};

// Get recent mistakes entries (default 10)
export const getRecentMistakesEntries = async (limit = 10) => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM mistakes ORDER BY created_at DESC LIMIT ?",
      [limit]
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      avoided: row.avoided === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting recent mistakes entries:", error);
    throw error;
  }
};

// Get mistakes entries by date
export const getMistakesEntriesByDate = async (date) => {
  try {
    const db = await openDB();
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const rows = await db.getAllAsync(
      "SELECT * FROM mistakes WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC",
      [startOfDay, endOfDay]
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      avoided: row.avoided === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting mistakes entries by date:", error);
    throw error;
  }
};

// Get mistakes entry by ID
export const getMistakesEntryById = async (id) => {
  try {
    const db = await openDB();
    const row = await db.getFirstAsync("SELECT * FROM mistakes WHERE id = ?", [
      id,
    ]);

    if (!row) return null;

    return {
      ...row,
      synced: row.synced === 1,
      avoided: row.avoided === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    };
  } catch (error) {
    console.error("Error getting mistakes entry by ID:", error);
    throw error;
  }
};

// Update mistakes entry
export const updateMistakesEntry = async ({
  id,
  title,
  mistake,
  solution,
  category,
  updated_at,
}) => {
  try {
    const db = await openDB();
    await db.runAsync(
      "UPDATE mistakes SET title = ?, mistake = ?, solution = ?, category = ?, updated_at = ?, synced = 0 WHERE id = ?",
      [title, mistake, solution, category, updated_at, id]
    );

    return await getMistakesEntryById(id);
  } catch (error) {
    console.error("Error updating mistakes entry:", error);
    throw error;
  }
};

// Toggle avoided status
export const toggleMistakesAvoided = async ({ id, avoided }) => {
  try {
    const db = await openDB();
    await db.runAsync(
      "UPDATE mistakes SET avoided = ?, updated_at = ? WHERE id = ?",
      [avoided ? 1 : 0, new Date().toISOString(), id]
    );

    return await getMistakesEntryById(id);
  } catch (error) {
    console.error("Error toggling mistakes avoided status:", error);
    throw error;
  }
};

// Mark mistakes entry as synced with server
export const markMistakesEntrySynced = async ({
  id,
  server_id,
  server_meta = null,
}) => {
  try {
    const db = await openDB();
    const metaJson = server_meta ? JSON.stringify(server_meta) : null;

    await db.runAsync(
      "UPDATE mistakes SET synced = 1, server_id = ?, server_meta = ? WHERE id = ?",
      [server_id, metaJson, id]
    );

    return await getMistakesEntryById(id);
  } catch (error) {
    console.error("Error marking mistakes entry as synced:", error);
    throw error;
  }
};

// Get unsynced mistakes entries
export const getUnsyncedMistakesEntries = async () => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM mistakes WHERE synced = 0 ORDER BY created_at ASC"
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      avoided: row.avoided === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting unsynced mistakes entries:", error);
    throw error;
  }
};

// Delete mistakes entry by ID
export const deleteMistakesEntryById = async (id) => {
  try {
    const db = await openDB();
    await db.runAsync("DELETE FROM mistakes WHERE id = ?", [id]);
    return true;
  } catch (error) {
    console.error("Error deleting mistakes entry:", error);
    throw error;
  }
};

// Upsert from server (used during sync)
export const upsertMistakesFromServer = async ({
  server_id,
  title,
  mistake,
  solution,
  category,
  created_at,
  updated_at,
  server_meta,
}) => {
  try {
    const db = await openDB();
    const metaJson = server_meta ? JSON.stringify(server_meta) : null;

    // Check if entry with this server_id already exists
    const existing = await db.getFirstAsync(
      "SELECT id FROM mistakes WHERE server_id = ?",
      [server_id]
    );

    if (existing) {
      // Update existing entry
      await db.runAsync(
        "UPDATE mistakes SET title = ?, mistake = ?, solution = ?, category = ?, created_at = ?, updated_at = ?, synced = 1, server_meta = ? WHERE server_id = ?",
        [
          title,
          mistake,
          solution,
          category,
          created_at,
          updated_at,
          metaJson,
          server_id,
        ]
      );
    } else {
      // Insert new entry from server
      await db.runAsync(
        "INSERT INTO mistakes (title, mistake, solution, category, created_at, updated_at, synced, server_id, server_meta, avoided) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 0)",
        [
          title,
          mistake,
          solution,
          category,
          created_at,
          updated_at,
          server_id,
          metaJson,
        ]
      );
    }

    return true;
  } catch (error) {
    console.error("Error upserting mistakes entry from server:", error);
    throw error;
  }
};

// Get entries count for a specific date
export const getMistakesEntriesCountForDate = async (date) => {
  try {
    const db = await openDB();
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const result = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM mistakes WHERE created_at >= ? AND created_at <= ?",
      [startOfDay, endOfDay]
    );

    return result?.count || 0;
  } catch (error) {
    console.error("Error getting mistakes entries count for date:", error);
    throw error;
  }
};

// Get sync attempts count for today (for rate limiting)
export const getMistakesSyncAttemptsCountToday = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const db = await openDB();
    // Count entries that were synced today (became synced today)
    const result = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM mistakes WHERE synced = 1 AND server_meta IS NOT NULL",
      []
    );

    // For now, we'll use a simplified approach - count all sync operations
    // In a real implementation, you might want to track sync timestamps separately
    return Math.min(result?.count || 0, 3); // Cap at 3 to prevent issues
  } catch (error) {
    console.error("Error getting mistakes sync attempts count:", error);
    return 0;
  }
};
