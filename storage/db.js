// db.js
import * as SQLite from "expo-sqlite";


let dbInstance = null;

// Get the singleton database instance
export async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync("unwind.db");

    // Promise-based query helpers
   
    dbInstance.getAllAsync = (sql, args = []) =>
      dbInstance.execAsync(sql, args).then(r => r.rows._array);

    dbInstance.getFirstAsync = (sql, args = []) =>
      dbInstance.execAsync(sql, args).then(r => r.rows._array[0]);
  }
  return dbInstance;
}

// Initialize all tables
export async function initDb() {
  const db = await getDb();

  // --- TODOS ---
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

  // --- JOURNAL ---
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    )
  `);

  // --- MISTAKES ---
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS mistakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      solution TEXT,
      timestamp TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    )
  `);

  // --- OVERTHINKING ---
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS overthinking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT,
      date TEXT NOT NULL,
      topic TEXT NOT NULL,
      thought TEXT NOT NULL,
      solution TEXT,
      timestamp TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    )
  `);

  // --- INDEXES ---
  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category)`);
  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed)`);
  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_carried_over_category ON carried_over_todos(category)`);
  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_carried_over_completed ON carried_over_todos(completed)`);
  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_journal_date ON journal(date)`);
  await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_journal_server ON journal(server_id)`);

  console.log("All tables initialized successfully");
}
