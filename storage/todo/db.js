import { openDB } from "../mainDb";

// Initialize database with tables and indexes
export const initTodosTable = async (db) => {
  try {
    // const db = await openDB();

    // Create todos table with required schema
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        completed INTEGER NOT NULL DEFAULT 0,
        due_date TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        server_id TEXT,
        server_meta TEXT
      );
    `);

    // Create carried_over_todos table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS carried_over_todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_task_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        priority TEXT DEFAULT 'medium',
        completed INTEGER NOT NULL DEFAULT 0,
        due_date TEXT,
        original_created_at TEXT NOT NULL,
        carried_over_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0,
        server_id TEXT,
        server_meta TEXT,
        FOREIGN KEY (original_task_id) REFERENCES todos(id)
      );
    `);

    // Create indexes for faster queries
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
      CREATE INDEX IF NOT EXISTS idx_todos_synced ON todos(synced);
      CREATE INDEX IF NOT EXISTS idx_todos_server_id ON todos(server_id);
      CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category);
      CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
      CREATE INDEX IF NOT EXISTS idx_carried_over_category ON carried_over_todos(category);
      CREATE INDEX IF NOT EXISTS idx_carried_over_completed ON carried_over_todos(completed);
      CREATE INDEX IF NOT EXISTS idx_carried_over_synced ON carried_over_todos(synced);
    `);

    console.log("✅ Todo database initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing todo database:", error);
    throw error;
  }
};

// Insert new todo entry (locally, unsynced)
export const insertTodoEntry = async ({
  title,
  description = "",
  category,
  priority = "medium",
  due_date = null,
  created_at,
  updated_at,
}) => {
  try {
    const db = await openDB();
    const result = await db.runAsync(
      "INSERT INTO todos (title, description, category, priority, completed, due_date, created_at, updated_at, synced) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0)",
      [title, description, category, priority, due_date, created_at, updated_at]
    );

    // Return the newly created entry
    const newEntry = await db.getFirstAsync(
      "SELECT * FROM todos WHERE id = ?",
      [result.lastInsertRowId]
    );

    return {
      ...newEntry,
      server_meta: newEntry.server_meta
        ? JSON.parse(newEntry.server_meta)
        : null,
    };
  } catch (error) {
    console.error("Error inserting todo entry:", error);
    throw error;
  }
};

// Get recent todo entries (default 10)
export const getRecentTodoEntries = async (limit = 10) => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM todos ORDER BY created_at DESC LIMIT ?",
      [limit]
    );

    console.log("Retrieved todo entries:", rows.map(row => ({
      id: row.id,
      title: row.title,
      created_at: row.created_at,
      created_at_type: typeof row.created_at
    })));

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      completed: row.completed === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting recent todo entries:", error);
    throw error;
  }
};

// Get todos by category
export const getTodosByCategory = async (category) => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM todos WHERE category = ? ORDER BY created_at DESC",
      [category]
    );

    console.log(`Retrieved todos for category ${category}:`, rows.map(row => ({
      id: row.id,
      title: row.title,
      created_at: row.created_at,
      created_at_type: typeof row.created_at
    })));

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      completed: row.completed === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting todos by category:", error);
    throw error;
  }
};

// Get carried over todos by category
export const getCarriedOverTodosByCategory = async (category) => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM carried_over_todos WHERE category = ? ORDER BY carried_over_at DESC",
      [category]
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      completed: row.completed === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting carried over todos by category:", error);
    throw error;
  }
};

// Get carried over entry by ID
export const getCarriedOverEntryById = async (id) => {
  try {
    const db = await openDB();
    const row = await db.getFirstAsync("SELECT * FROM carried_over_todos WHERE id = ?", [id]);
    if (!row) return null;
    return {
      ...row,
      synced: row.synced === 1,
      completed: row.completed === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    };
  } catch (error) {
    console.error("Error getting carried over entry by ID:", error);
    throw error;
  }
};

// Get todo entry by ID
export const getTodoEntryById = async (id) => {
  try {
    const db = await openDB();
    const row = await db.getFirstAsync("SELECT * FROM todos WHERE id = ?", [id]);

    if (!row) return null;

    return {
      ...row,
      synced: row.synced === 1,
      completed: row.completed === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    };
  } catch (error) {
    console.error("Error getting todo entry by ID:", error);
    throw error;
  }
};

// Update todo entry
export const updateTodoEntry = async ({
  id,
  title,
  description,
  category,
  priority,
  due_date,
  updated_at,
}) => {
  try {
    const db = await openDB();
    await db.runAsync(
      "UPDATE todos SET title = ?, description = ?, category = ?, priority = ?, due_date = ?, updated_at = ?, synced = 0 WHERE id = ?",
      [title, description, category, priority, due_date, updated_at, id]
    );

    return await getTodoEntryById(id);
  } catch (error) {
    console.error("Error updating todo entry:", error);
    throw error;
  }
};

// Toggle todo completion status
export const toggleTodoComplete = async ({ id, completed, updated_at }) => {
  try {
    const db = await openDB();
    await db.runAsync(
      "UPDATE todos SET completed = ?, updated_at = ?, synced = 0 WHERE id = ?",
      [completed ? 1 : 0, updated_at, id]
    );

    return await getTodoEntryById(id);
  } catch (error) {
    console.error("Error toggling todo completion:", error);
    throw error;
  }
};

// Toggle carried-over completion status
export const toggleCarriedOverComplete = async ({ id, completed, updated_at }) => {
  try {
    const db = await openDB();
    await db.runAsync(
      "UPDATE carried_over_todos SET completed = ?, updated_at = ?, synced = 0 WHERE id = ?",
      [completed ? 1 : 0, updated_at, id]
    );

    return await getCarriedOverEntryById(id);
  } catch (error) {
    console.error("Error toggling carried over completion:", error);
    throw error;
  }
};

// Mark todo entry as synced with server
export const markTodoEntrySynced = async ({
  id,
  server_id,
  server_meta = null,
}) => {
  try {
    const db = await openDB();
    const metaJson = server_meta ? JSON.stringify(server_meta) : null;

    await db.runAsync(
      "UPDATE todos SET synced = 1, server_id = ?, server_meta = ? WHERE id = ?",
      [server_id, metaJson, id]
    );

    return await getTodoEntryById(id);
  } catch (error) {
    console.error("Error marking todo entry as synced:", error);
    throw error;
  }
};

// Get unsynced todo entries
export const getUnsyncedTodoEntries = async () => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM todos WHERE synced = 0 ORDER BY created_at ASC"
    );

    return rows.map((row) => ({
      ...row,
      synced: row.synced === 1,
      completed: row.completed === 1,
      server_meta: row.server_meta ? JSON.parse(row.server_meta) : null,
    }));
  } catch (error) {
    console.error("Error getting unsynced todo entries:", error);
    throw error;
  }
};

// Delete todo entry by ID
export const deleteTodoEntryById = async (id) => {
  try {
    console.log("Attempting to delete todo with ID:", id);
    const db = await openDB();
    
    // First check if the todo exists
    const existingTodo = await db.getFirstAsync("SELECT id FROM todos WHERE id = ?", [id]);
    if (!existingTodo) {
      console.log("Todo not found in database with ID:", id);
      throw new Error("Todo not found in database");
    }
    
    console.log("Todo found, proceeding with deletion");
    const result = await db.runAsync("DELETE FROM todos WHERE id = ?", [id]);
    console.log("Delete result:", result);
    
    // Verify deletion
    const deletedTodo = await db.getFirstAsync("SELECT id FROM todos WHERE id = ?", [id]);
    if (deletedTodo) {
      throw new Error("Failed to delete todo from database");
    }
    
    console.log("Todo successfully deleted from database");
    return true;
  } catch (error) {
    console.error("Error deleting todo entry:", error);
    throw error;
  }
};

// Move task to carried over
export const moveTaskToCarriedOver = async (taskId) => {
  try {
    const db = await openDB();

    // Get the original task
    const originalTask = await db.getFirstAsync(
      "SELECT * FROM todos WHERE id = ?",
      [taskId]
    );

    if (!originalTask) {
      throw new Error("Task not found");
    }

    const carriedOverAt = new Date().toISOString();
    const updatedAt = carriedOverAt;

    // Insert into carried_over_todos table
    const result = await db.runAsync(
      "INSERT INTO carried_over_todos (original_task_id, title, description, category, priority, completed, due_date, original_created_at, carried_over_at, updated_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)",
      [
        originalTask.id,
        originalTask.title,
        originalTask.description,
        originalTask.category,
        originalTask.priority,
        originalTask.completed,
        originalTask.due_date,
        originalTask.created_at,
        carriedOverAt,
        updatedAt,
      ]
    );

    // Delete from original todos table
    await db.runAsync("DELETE FROM todos WHERE id = ?", [taskId]);

    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error moving task to carried over:", error);
    throw error;
  }
};

// Move all pending tasks to carried over
export const moveAllPendingTasksToCarriedOver = async () => {
  try {
    const db = await openDB();

    // Get all incomplete tasks
    const pendingTasks = await db.getAllAsync(
      "SELECT * FROM todos WHERE completed = 0"
    );

    for (const task of pendingTasks) {
      await moveTaskToCarriedOver(task.id);
    }

    return pendingTasks.length;
  } catch (error) {
    console.error("Error moving all pending tasks:", error);
    throw error;
  }
};

// Upsert from server (used during sync)
export const upsertTodoFromServer = async ({
  server_id,
  title,
  description,
  category,
  priority,
  due_date,
  created_at,
  updated_at,
  server_meta,
}) => {
  try {
    const db = await openDB();
    const metaJson = server_meta ? JSON.stringify(server_meta) : null;

    // Check if entry with this server_id already exists
    const existing = await db.getFirstAsync(
      "SELECT id FROM todos WHERE server_id = ?",
      [server_id]
    );

    if (existing) {
      // Update existing entry
      await db.runAsync(
        "UPDATE todos SET title = ?, description = ?, category = ?, priority = ?, due_date = ?, created_at = ?, updated_at = ?, synced = 1, server_meta = ? WHERE server_id = ?",
        [title, description, category, priority, due_date, created_at, updated_at, metaJson, server_id]
      );
    } else {
      // Insert new entry from server
      await db.runAsync(
        "INSERT INTO todos (title, description, category, priority, completed, due_date, created_at, updated_at, synced, server_id, server_meta) VALUES (?, ?, ?, ?, 0, ?, ?, ?, 1, ?, ?)",
        [title, description, category, priority, due_date, created_at, updated_at, server_id, metaJson]
      );
    }

    return true;
  } catch (error) {
    console.error("Error upserting todo entry from server:", error);
    throw error;
  }
};

// Get entries count for a specific date
export const getTodoEntriesCountForDate = async (date) => {
  try {
    const db = await openDB();
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    const result = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM todos WHERE created_at >= ? AND created_at <= ?",
      [startOfDay, endOfDay]
    );

    return result?.count || 0;
  } catch (error) {
    console.error("Error getting todo entries count for date:", error);
    throw error;
  }
};

// Get sync attempts count for today (for rate limiting)
export const getTodoSyncAttemptsCountToday = async () => {
  try {
    const db = await openDB();
    // Count entries that were synced today (became synced today)
    const result = await db.getFirstAsync(
      "SELECT COUNT(*) as count FROM todos WHERE synced = 1 AND server_meta IS NOT NULL",
      []
    );

    // For now, we'll use a simplified approach - count all sync operations
    // In a real implementation, you might want to track sync timestamps separately
    return Math.min(result?.count || 0, 3); // Cap at 3 to prevent issues
  } catch (error) {
    console.error("Error getting todo sync attempts count:", error);
    return 0;
  }
};

// Perform daily cleanup
export const performDailyCleanup = async () => {
  try {
    const movedCount = await moveAllPendingTasksToCarriedOver();
    return movedCount;
  } catch (error) {
    console.error("Error during daily cleanup:", error);
    throw error;
  }
};
