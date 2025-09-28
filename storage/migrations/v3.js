export const migrate = async (db) => {
  try {
    console.log("🔄 Starting v3 migration - Adding todo-reminder integration...");
    
    // Create task_reminders table (separate from water reminders)
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
    
    console.log("✅ v3 migration completed - Added task_reminders table with todo integration");
  } catch (error) {
    console.error("❌ Error in v3 migration:", error);
    throw error;
  }
};
