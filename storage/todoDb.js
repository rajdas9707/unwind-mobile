import * as SQLite from "expo-sqlite";

let dbPromise = null;
let isInitializing = false;
let initializationPromise = null;

async function getDb() {
  // If we're already initializing, wait for that to complete
  if (isInitializing && initializationPromise) {
    return await initializationPromise;
  }

  // If we have a valid connection, return it
  if (dbPromise) {
    try {
      // Test the connection to make sure it's still valid
      const db = await dbPromise;
      await db.execAsync("SELECT 1");
      return db;
    } catch (error) {
      console.log("Database connection test failed, reconnecting...");
      dbPromise = null;
    }
  }

  // Start initialization
  isInitializing = true;
  initializationPromise = createDatabaseConnection();

  try {
    const db = await initializationPromise;
    return db;
  } finally {
    isInitializing = false;
    initializationPromise = null;
  }
}

async function createDatabaseConnection() {
  try {
    console.log("Opening database connection...");
    const db = await SQLite.openDatabaseAsync("unwind.db");
    console.log("Database connection opened successfully");

    // Test the connection
    await db.execAsync("SELECT 1");
    console.log("Database connection test successful");

    return db;
  } catch (error) {
    console.error("Error opening database:", error);
    // Reset the promise so we can try again
    dbPromise = null;
    throw error;
  }
}

export async function initTodoDb() {
  try {
    console.log("Initializing todo database...");
    const db = await getDb();
    console.log("Database connection established");

    // Create todos table first
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
        updated_at TEXT NOT NULL
      )
    `);
    console.log("Todos table created successfully");

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
        FOREIGN KEY (original_task_id) REFERENCES todos(id)
      )
    `);
    console.log("Carried over todos table created successfully");

    // Create indexes separately
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category)
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed)
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_carried_over_category ON carried_over_todos(category)
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_carried_over_completed ON carried_over_todos(completed)
    `);
    console.log("Indexes created successfully");
    console.log("Todo database initialized successfully");
  } catch (error) {
    console.error("Error initializing todo database:", error);
    // Reset connection on error
    dbPromise = null;
    throw error;
  }
}

export async function listAllTodos() {
  const db = await getDb();
  const res = await db.getAllAsync(
    "SELECT id AS localId, title, description, category, priority, completed, due_date, created_at, updated_at FROM todos ORDER BY created_at DESC"
  );
  return res;
}

export async function listTodosByCategory(category) {
  const db = await getDb();
  const res = await db.getAllAsync(
    "SELECT id AS localId, title, description, category, priority, completed, due_date, created_at, updated_at FROM todos WHERE category = ? ORDER BY created_at DESC",
    [category]
  );
  return res;
}

export async function listCarriedOverTodosByCategory(category) {
  const db = await getDb();
  const res = await db.getAllAsync(
    "SELECT id AS localId, original_task_id, title, description, category, priority, completed, due_date, original_created_at, carried_over_at, updated_at FROM carried_over_todos WHERE category = ? ORDER BY carried_over_at DESC",
    [category]
  );
  return res;
}

export async function insertLocalTodo({
  title,
  description,
  category,
  priority,
  dueDate,
  createdAt,
  updatedAt,
}) {
  try {
    console.log("Inserting local todo:", { title, category });
    const db = await getDb();

    const result = await db.runAsync(
      "INSERT INTO todos (title, description, category, priority, completed, due_date, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?)",
      [title, description, category, priority, dueDate, createdAt, updatedAt]
    );

    console.log("Task inserted, getting inserted row...");
    // Get the inserted row to ensure we have the correct data
    const insertedRow = await db.getFirstAsync(
      "SELECT id AS localId, title, description, category, priority, completed, due_date, created_at, updated_at FROM todos WHERE id = ?",
      [result.lastInsertRowId]
    );

    console.log("Inserted row retrieved:", insertedRow);
    return {
      localId: insertedRow.localId,
      title: insertedRow.title,
      description: insertedRow.description,
      category: insertedRow.category,
      priority: insertedRow.priority,
      completed: insertedRow.completed === 1,
      dueDate: insertedRow.due_date,
      createdAt: insertedRow.created_at,
      updatedAt: insertedRow.updated_at,
    };
  } catch (error) {
    console.error("Error in insertLocalTodo:", error);
    throw error;
  }
}

export async function updateTodo({
  localId,
  title,
  description,
  category,
  priority,
  dueDate,
  updatedAt,
}) {
  const db = await getDb();
  const result = await db.runAsync(
    "UPDATE todos SET title = ?, description = ?, category = ?, priority = ?, due_date = ?, updated_at = ? WHERE id = ?",
    [title, description, category, priority, dueDate, updatedAt, localId]
  );
  return result;
}

export async function toggleTodoComplete({ localId, completed, updatedAt }) {
  const db = await getDb();
  const result = await db.runAsync(
    "UPDATE todos SET completed = ?, updated_at = ? WHERE id = ?",
    [completed ? 1 : 0, updatedAt, localId]
  );
  return result;
}

export async function deleteTodoById({ localId }) {
  const db = await getDb();
  await db.runAsync("DELETE FROM todos WHERE id = ?", [localId]);
}

export async function moveTaskToCarriedOver(taskId) {
  try {
    console.log("Moving task to carried over:", taskId);
    const db = await getDb();

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
      "INSERT INTO carried_over_todos (original_task_id, title, description, category, priority, completed, due_date, original_created_at, carried_over_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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

    console.log("Task moved to carried over successfully");
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error moving task to carried over:", error);
    throw error;
  }
}

export async function moveAllPendingTasksToCarriedOver() {
  try {
    console.log("Moving all pending tasks to carried over...");
    const db = await getDb();

    // Get all incomplete tasks
    const pendingTasks = await db.getAllAsync(
      "SELECT * FROM todos WHERE completed = 0"
    );

    console.log(`Found ${pendingTasks.length} pending tasks to move`);

    for (const task of pendingTasks) {
      await moveTaskToCarriedOver(task.id);
    }

    console.log("All pending tasks moved to carried over successfully");
    return pendingTasks.length;
  } catch (error) {
    console.error("Error moving all pending tasks:", error);
    throw error;
  }
}

export async function getTodoById(localId) {
  const db = await getDb();
  const res = await db.getFirstAsync(
    "SELECT id AS localId, title, description, category, priority, completed, due_date, created_at, updated_at FROM todos WHERE id = ?",
    [localId]
  );
  return res;
}

// Reset database connection (useful for debugging)
export function resetDbConnection() {
  dbPromise = null;
  isInitializing = false;
  initializationPromise = null;
  console.log("Database connection reset");
}

// Test database connectivity
export async function testDatabaseConnection() {
  try {
    const db = await getDb();
    await db.execAsync("SELECT 1");
    console.log("Database connection test successful");
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

// Force reconnection to database
export async function forceReconnect() {
  console.log("Forcing database reconnection...");
  resetDbConnection();
  try {
    const db = await getDb();
    await testDatabaseConnection();
    console.log("Database reconnection successful");
    return true;
  } catch (error) {
    console.error("Database reconnection failed:", error);
    return false;
  }
}

// Daily cleanup function to move all pending tasks to carried over
export async function performDailyCleanup() {
  try {
    console.log("Performing daily cleanup...");
    const movedCount = await moveAllPendingTasksToCarriedOver();
    console.log(
      `Daily cleanup completed. Moved ${movedCount} tasks to carried over.`
    );
    return movedCount;
  } catch (error) {
    console.error("Error during daily cleanup:", error);
    throw error;
  }
}
