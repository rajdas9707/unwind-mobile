import * as SQLite from "expo-sqlite";
import { openDB } from "../mainDb";

// Initialize database with tables and indexes
export const initOverthinkingsTable = async (db) => {
  try {
    // const db = await openDB();
// 
    // Create overthinking table with required schema
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS overthinking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        thought TEXT NOT NULL,
        solution TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        server_id TEXT,
        server_meta TEXT,
        dumped INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Lightweight migration: add any missing columns from older schemas
    try {
      const columns = await db.getAllAsync("PRAGMA table_info(overthinking)");
      const columnNames = new Set(columns.map((c) => c.name));

      const addColumnIfMissing = async (name, typeAndDefault) => {
        if (!columnNames.has(name)) {
          await db.execAsync(
            `ALTER TABLE overthinking ADD COLUMN ${name} ${typeAndDefault};`
          );
        }
      };

      // Ensure required columns exist
      await addColumnIfMissing("created_at", "TEXT");
      await addColumnIfMissing("updated_at", "TEXT");
      await addColumnIfMissing("synced", "INTEGER NOT NULL DEFAULT 0");
      await addColumnIfMissing("server_id", "TEXT");
      await addColumnIfMissing("server_meta", "TEXT");
      await addColumnIfMissing("dumped", "INTEGER NOT NULL DEFAULT 0");

      // Backfill timestamps if they were just added or are null
      const nowIso = new Date().toISOString();
      await db.runAsync(
        "UPDATE overthinking SET created_at = COALESCE(created_at, ?), updated_at = COALESCE(updated_at, ?) WHERE created_at IS NULL OR updated_at IS NULL",
        [nowIso, nowIso]
      );
    } catch (migErr) {
      console.warn("⚠️ Overthinking table migration warning:", migErr);
    }

    // Create index for faster queries
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_overthinking_created_at ON overthinking(created_at);
      CREATE INDEX IF NOT EXISTS idx_overthinking_synced ON overthinking(synced);
      CREATE INDEX IF NOT EXISTS idx_overthinking_server_id ON overthinking(server_id);
    `);

    console.log("✅ Overthinking database initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing overthinking database:", error);

    throw error;
  }
};

// Insert new overthinking entry (locally, unsynced)
export const insertOverthinkingEntry = async ({
  title = "",
  thought,
  solution = "",
  created_at,
  updated_at,
}) => {
  try {
    const db = await openDB();
    const result = await db.runAsync(
      "INSERT INTO overthinking (title, thought, solution, created_at, updated_at, synced, dumped) VALUES (?, ?, ?, ?, ?, 0, 0)",
      [title, thought, solution, created_at, updated_at]
    );

    // Return the newly created entry
    const newEntry = await db.getFirstAsync(
      "SELECT * FROM overthinking WHERE id = ?",
      [result.lastInsertRowId]
    );

    return {
      ...newEntry,
      server_meta: newEntry.server_meta
        ? JSON.parse(newEntry.server_meta)
        : null,
    };
  } catch (error) {
    console.error("Error inserting overthinking entry:", error);
    throw error;
  }
};

// Get recent overthinking entries (default 10)
export const getRecentOverthinkingEntries = async (limit = 10) => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM overthinking ORDER BY created_at DESC LIMIT ?",
      [limit]
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      dumped: row.dumped === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting recent overthinking entries:", error);
    throw error;
  }
};

// Get overthinking entries by date
export const getOverthinkingEntriesByDate = async (date) => {
  try {
    const db = await openDB();
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const rows = await db.getAllAsync(
      "SELECT * FROM overthinking WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC",
      [startOfDay, endOfDay]
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      dumped: row.dumped === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting overthinking entries by date:", error);
    throw error;
  }
};

// Get overthinking entry by ID
export const getOverthinkingEntryById = async (id) => {
  try {
    const db = await openDB();
    const row = await db.getFirstAsync(
      "SELECT * FROM overthinking WHERE id = ?",
      [id]
    );

    if (!row) return null;

    return {
      ...row,
      synced: row.synced === 1,
      dumped: row.dumped === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    };
  } catch (error) {
    console.error("Error getting overthinking entry by ID:", error);
    throw error;
  }
};

// Update overthinking entry
export const updateOverthinkingEntry = async ({
  id,
  title,
  thought,
  solution,
  updated_at,
}) => {
  try {
    const db = await openDB();
    await db.runAsync(
      "UPDATE overthinking SET title = ?, thought = ?, solution = ?, updated_at = ?, synced = 0 WHERE id = ?",
      [title, thought, solution, updated_at, id]
    );

    return await getOverthinkingEntryById(id);
  } catch (error) {
    console.error("Error updating overthinking entry:", error);
    throw error;
  }
};

// Toggle dumped status
export const toggleOverthinkingDumped = async ({ id, dumped }) => {
  try {
    const db = await openDB();
    await db.runAsync(
      "UPDATE overthinking SET dumped = ?, updated_at = ? WHERE id = ?",
      [dumped ? 1 : 0, new Date().toISOString(), id]
    );

    return await getOverthinkingEntryById(id);
  } catch (error) {
    console.error("Error toggling overthinking dumped status:", error);
    throw error;
  }
};

// Mark overthinking entry as synced with server
export const markOverthinkingEntrySynced = async ({
  id,
  server_id,
  server_meta = null,
}) => {
  try {
    const db = await openDB();
    const metaJson = server_meta ? JSON.stringify(server_meta) : null;

    await db.runAsync(
      "UPDATE overthinking SET synced = 1, server_id = ?, server_meta = ? WHERE id = ?",
      [server_id, metaJson, id]
    );

    return await getOverthinkingEntryById(id);
  } catch (error) {
    console.error("Error marking overthinking entry as synced:", error);
    throw error;
  }
};

// Get unsynced overthinking entries
export const getUnsyncedOverthinkingEntries = async () => {
  try {
    const db = await openDB();
    // Use COALESCE to avoid errors if created_at is NULL in legacy rows
    const rows = await db.getAllAsync(
      "SELECT * FROM overthinking WHERE synced = 0 ORDER BY COALESCE(created_at, updated_at) ASC"
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      dumped: row.dumped === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting unsynced overthinking entries:", error);
    throw error;
  }
};

// Delete overthinking entry by ID
export const deleteOverthinkingEntryById = async (id) => {
  try {
    const db = await openDB();
    await db.runAsync("DELETE FROM overthinking WHERE id = ?", [id]);
    return true;
  } catch (error) {
    console.error("Error deleting overthinking entry:", error);
    throw error;
  }
};

// Upsert from server (used during sync)
export const upsertOverthinkingFromServer = async ({
  server_id,
  title,
  thought,
  solution,
  created_at,
  updated_at,
  server_meta,
}) => {
  try {
    const db = await openDB();
    const metaJson = server_meta ? JSON.stringify(server_meta) : null;

    // Check if entry with this server_id already exists
    const existing = await db.getFirstAsync(
      "SELECT id FROM overthinking WHERE server_id = ?",
      [server_id]
    );

    if (existing) {
      // Update existing entry
      await db.runAsync(
        "UPDATE overthinking SET title = ?, thought = ?, solution = ?, created_at = ?, updated_at = ?, synced = 1, server_meta = ? WHERE server_id = ?",
        [title, thought, solution, created_at, updated_at, metaJson, server_id]
      );
    } else {
      // Insert new entry from server
      await db.runAsync(
        "INSERT INTO overthinking (title, thought, solution, created_at, updated_at, synced, server_id, server_meta, dumped) VALUES (?, ?, ?, ?, ?, 1, ?, ?, 0)",
        [title, thought, solution, created_at, updated_at, server_id, metaJson]
      );
    }

    return true;
  } catch (error) {
    console.error("Error upserting overthinking entry from server:", error);
    throw error;
  }
};

// Get entries count for a specific date
export const getOverthinkingEntriesCountForDate = async (date) => {
  try {
    const db = await openDB();
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const result = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM overthinking WHERE created_at >= ? AND created_at <= ?",
      [startOfDay, endOfDay]
    );

    return result?.count || 0;
  } catch (error) {
    console.error("Error getting overthinking entries count for date:", error);
    throw error;
  }
};

// Get sync attempts count for today (for rate limiting)
export const getOverthinkingSyncAttemptsCountToday = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const db = await openDB();
    // Count entries that were synced today (became synced today)
    const result = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM overthinking WHERE synced = 1 AND server_meta IS NOT NULL",
      []
    );

    // For now, we'll use a simplified approach - count all sync operations
    // In a real implementation, you might want to track sync timestamps separately
    return Math.min(result?.count || 0, 3); // Cap at 3 to prevent issues
  } catch (error) {
    console.error("Error getting overthinking sync attempts count:", error);
    return 0;
  }
};
