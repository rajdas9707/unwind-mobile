import { openDB } from "../mainDb";

// Initialize reminders table
export const initRemindersTable = async (db) => {
  try {
    // Create task_reminders table with todo integration
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS task_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        datetime TEXT NOT NULL,
        todo_id INTEGER,
        todo_category TEXT,
        notification_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        server_id TEXT,
        server_meta TEXT,
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE SET NULL
      );
    `);

    // Create indexes for better performance
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_task_reminders_datetime ON task_reminders(datetime);
      CREATE INDEX IF NOT EXISTS idx_task_reminders_todo_id ON task_reminders(todo_id);
      CREATE INDEX IF NOT EXISTS idx_task_reminders_synced ON task_reminders(synced);
      CREATE INDEX IF NOT EXISTS idx_task_reminders_server_id ON task_reminders(server_id);
    `);

    console.log("✅ Reminders database initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing reminders database:", error);
    throw error;
  }
};

// Insert new reminder entry
export const insertReminderEntry = async ({
  name,
  description = "",
  datetime,
  todo_id = null,
  todo_category = null,
  notification_id = null,
  created_at,
  updated_at,
}) => {
  try {
    const db = await openDB();
    const result = await db.runAsync(
      "INSERT INTO task_reminders (name, description, datetime, todo_id, todo_category, notification_id, created_at, updated_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
      [name, description, datetime, todo_id, todo_category, notification_id, created_at, updated_at]
    );

    // Return the newly created entry
    const newEntry = await db.getFirstAsync(
      "SELECT * FROM task_reminders WHERE id = ?",
      [result.lastInsertRowId]
    );

    return {
      ...newEntry,
      server_meta: newEntry.server_meta
        ? JSON.parse(newEntry.server_meta)
        : null,
    };
  } catch (error) {
    console.error("Error inserting reminder entry:", error);
    throw error;
  }
};

// Get all reminders
export const getAllReminders = async () => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM task_reminders ORDER BY datetime ASC"
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting all reminders:", error);
    throw error;
  }
};

// Get reminders by todo_id
export const getRemindersByTodoId = async (todo_id) => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM task_reminders WHERE todo_id = ? ORDER BY datetime ASC",
      [todo_id]
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting reminders by todo_id:", error);
    throw error;
  }
};

// Get reminder by ID
export const getReminderById = async (id) => {
  try {
    const db = await openDB();
    const row = await db.getFirstAsync("SELECT * FROM task_reminders WHERE id = ?", [id]);

    if (!row) return null;

    return {
      ...row,
      synced: row.synced === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    };
  } catch (error) {
    console.error("Error getting reminder by ID:", error);
    throw error;
  }
};

// Update reminder entry
export const updateReminderEntry = async ({
  id,
  name,
  description,
  datetime,
  todo_id,
  todo_category,
  notification_id,
  updated_at,
}) => {
  try {
    const db = await openDB();
    await db.runAsync(
      "UPDATE task_reminders SET name = ?, description = ?, datetime = ?, todo_id = ?, todo_category = ?, notification_id = ?, updated_at = ?, synced = 0 WHERE id = ?",
      [name, description, datetime, todo_id, todo_category, notification_id, updated_at, id]
    );

    return await getReminderById(id);
  } catch (error) {
    console.error("Error updating reminder entry:", error);
    throw error;
  }
};

// Delete reminder entry by ID
export const deleteReminderEntryById = async (id) => {
  try {
    const db = await openDB();
    
    // First check if the reminder exists
    const existingReminder = await db.getFirstAsync("SELECT id FROM task_reminders WHERE id = ?", [id]);
    if (!existingReminder) {
      throw new Error("Reminder not found in database");
    }
    
    const result = await db.runAsync("DELETE FROM task_reminders WHERE id = ?", [id]);
    
    return true;
  } catch (error) {
    console.error("Error deleting reminder entry:", error);
    throw error;
  }
};

// Get unsynced reminder entries
export const getUnsyncedReminderEntries = async () => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM task_reminders WHERE synced = 0 ORDER BY created_at ASC"
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting unsynced reminder entries:", error);
    throw error;
  }
};

// Mark reminder entry as synced with server
export const markReminderEntrySynced = async ({
  id,
  server_id,
  server_meta = null,
}) => {
  try {
    const db = await openDB();
    const metaJson = server_meta ? JSON.stringify(server_meta) : null;

    await db.runAsync(
      "UPDATE task_reminders SET synced = 1, server_id = ?, server_meta = ? WHERE id = ?",
      [server_id, metaJson, id]
    );

    return await getReminderById(id);
  } catch (error) {
    console.error("Error marking reminder entry as synced:", error);
    throw error;
  }
};
