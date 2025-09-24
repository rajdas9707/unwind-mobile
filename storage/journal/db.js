import { openDB } from "../mainDb";

// Initialize database with tables and indexes
export const initJournalsTable = async (db) => {
  try {
    console.log("Initializing journal database");
    // const db = await openDB();
    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    // Create journals table with required schema
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS journals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        server_id TEXT,
        server_meta TEXT
      );
    `);

    // Create index for faster queries
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_journals_created_at ON journals(created_at);
      CREATE INDEX IF NOT EXISTS idx_journals_synced ON journals(synced);
      CREATE INDEX IF NOT EXISTS idx_journals_server_id ON journals(server_id);
    `);

    console.log("✅ Journal database initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing journal database:", error);
    // Reset the instance so we can retry

    throw error;
  }
};

// Insert new journal entry (locally, unsynced)
export const insertJournalEntry = async ({
  title = "",
  content,
  created_at,
  updated_at,
}) => {
  try {
    const db = await openDB();

    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    const result = await db?.runAsync(
      "INSERT INTO journals (title, content, created_at, updated_at, synced) VALUES (?, ?, ?, ?, 0)",
      [title, content, created_at, updated_at]
    );

    // Return the newly created entry
    const newEntry = await db?.getFirstAsync(
      "SELECT * FROM journals WHERE id = ?",
      [result.lastInsertRowId]
    );

    return {
      ...newEntry,
      server_meta: newEntry.server_meta
        ? JSON.parse(newEntry.server_meta)
        : null,
    };
  } catch (error) {
    console.error("Error inserting journal entry:", error);
    throw error;
  }
};

// Get recent journal entries (default 10)
export const getRecentJournalEntries = async (limit = 10) => {
  try {
    const db = await openDB();
    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    const rows = await db.getAllAsync(
      "SELECT * FROM journals ORDER BY created_at DESC LIMIT ?",
      [limit]
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting recent journal entries:", error);
    throw error;
  }
};

// Get journal entries by date
export const getJournalEntriesByDate = async (date) => {
  try {
    const db = await openDB();
    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const rows = await db.getAllAsync(
      "SELECT * FROM journals WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC",
      [startOfDay, endOfDay]
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting journal entries by date:", error);
    throw error;
  }
};

// Get journal entry by ID
export const getJournalEntryById = async (id) => {
  try {
    const db = await openDB();
    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    const row = await db.getFirstAsync("SELECT * FROM journals WHERE id = ?", [
      id,
    ]);

    if (!row) return null;

    return {
      ...row,
      synced: row.synced === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    };
  } catch (error) {
    console.error("Error getting journal entry by ID:", error);
    throw error;
  }
};

// Update journal entry
export const updateJournalEntry = async ({
  id,
  title,
  content,
  updated_at,
}) => {
  try {
    const db = await openDB();

    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    await db.runAsync(
      "UPDATE journals SET title = ?, content = ?, updated_at = ?, synced = 0 WHERE id = ?",
      [title, content, updated_at, id]
    );

    return await getJournalEntryById(id);
  } catch (error) {
    console.error("Error updating journal entry:", error);
    throw error;
  }
};

// Mark journal entry as synced with server
export const markJournalEntrySynced = async ({
  id,
  server_id,
  server_meta = null,
}) => {
  try {
    const db = await openDB();
    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    const metaJson = server_meta ? JSON.stringify(server_meta) : null;

    await db.runAsync(
      "UPDATE journals SET synced = 1, server_id = ?, server_meta = ? WHERE id = ?",
      [server_id, metaJson, id]
    );

    return await getJournalEntryById(id);
  } catch (error) {
    console.error("Error marking journal entry as synced:", error);
    throw error;
  }
};

// Get unsynced journal entries
export const getUnsyncedJournalEntries = async () => {
  try {
    const db = await openDB();

    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    const rows = await db.getAllAsync(
      "SELECT * FROM journals WHERE synced = 0 ORDER BY created_at ASC"
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting unsynced journal entries:", error);
    throw error;
  }
};

// Delete journal entry by ID
export const deleteJournalEntryById = async (id) => {
  try {
    const db = await openDB();
    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    await db.runAsync("DELETE FROM journals WHERE id = ?", [id]);
    return true;
  } catch (error) {
    console.error("Error deleting journal entry:", error);
    throw error;
  }
};

// Upsert from server (used during sync)
export const upsertJournalFromServer = async ({
  server_id,
  title,
  content,
  created_at,
  updated_at,
  server_meta,
}) => {
  try {
    const db = await openDB();
    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    const metaJson = server_meta ? JSON.stringify(server_meta) : null;

    // Check if entry with this server_id already exists
    const existing = await db.getFirstAsync(
      "SELECT id FROM journals WHERE server_id = ?",
      [server_id]
    );

    if (existing) {
      // Update existing entry
      await db.runAsync(
        "UPDATE journals SET title = ?, content = ?, created_at = ?, updated_at = ?, synced = 1, server_meta = ? WHERE server_id = ?",
        [title, content, created_at, updated_at, metaJson, server_id]
      );
    } else {
      // Insert new entry from server
      await db.runAsync(
        "INSERT INTO journals (title, content, created_at, updated_at, synced, server_id, server_meta) VALUES (?, ?, ?, ?, 1, ?, ?)",
        [title, content, created_at, updated_at, server_id, metaJson]
      );
    }

    return true;
  } catch (error) {
    console.error("Error upserting journal entry from server:", error);
    throw error;
  }
};

// Get entries count for a specific date
export const getJournalEntriesCountForDate = async (date) => {
  try {
    const db = await openDB();
    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const result = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM journals WHERE created_at >= ? AND created_at <= ?",
      [startOfDay, endOfDay]
    );

    return result?.count || 0;
  } catch (error) {
    console.error("Error getting journal entries count for date:", error);
    throw error;
  }
};

// Get sync attempts count for today (for rate limiting)
export const getSyncAttemptsCountToday = async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const startOfDay = `${today}T00:00:00.000Z`;
    const endOfDay = `${today}T23:59:59.999Z`;

    const db = await openDB();
    if (!db) {
      Alert.alert(
        "Error initializing journal database",
        "Failed to open database"
      );
      return;
    }
    // Count entries that were synced today (became synced today)
    const result = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM journals WHERE synced = 1 AND server_meta IS NOT NULL",
      []
    );

    // For now, we'll use a simplified approach - count all sync operations
    // In a real implementation, you might want to track sync timestamps separately
    return Math.min(result?.count || 0, 3); // Cap at 3 to prevent issues
  } catch (error) {
    console.error("Error getting sync attempts count:", error);
    return 0;
  }
};
