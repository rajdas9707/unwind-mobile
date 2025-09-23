
import * as SQLite from "expo-sqlite";

// Singleton database connection
let dbInstance = null;
let dbPromise = null;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Get or create database connection (singleton pattern)
export const openDB = async () => {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbPromise) {
    return await dbPromise;
  }

  dbPromise = initializeDatabase();
  try {
    dbInstance = await dbPromise;
    dbPromise = null;
    initAttempts = 0; // Reset on success
    return dbInstance;
  } catch (error) {
    dbPromise = null;
    initAttempts++;

    if (initAttempts < MAX_INIT_ATTEMPTS) {
      console.log(
        `📖 Database init failed, retrying... (attempt ${initAttempts}/${MAX_INIT_ATTEMPTS})`
      );
      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000 * initAttempts));
      return openDB(); // Retry
    }

    throw error;
  }
};

// Initialize database with tables and indexes
const initializeDatabase = async () => {
  try {
    console.log("📖 Initializing unwind database...");

    // Close any existing connections first
    if (dbInstance) {
      try {
        await dbInstance.closeAsync();
      } catch (e) {
        // Ignore errors when closing
      }
      dbInstance = null;
    }

    const db = await SQLite.openDatabaseAsync("unwind.db", {
      enableChangeListener: false, // Disable change listener to prevent locks
    });

     await runMigrations(db)

    console.log("✅ unwind database initialized successfully");
    return db;
  } catch (error) {
    console.error("❌ Error initializing unwind database:", error);
    // Reset the instance so we can retry
    dbInstance = null;
    throw error;
  }
};



async function runMigrations(db) {
  try {
  
 
  const result = await db.getFirstAsync("PRAGMA user_version");
  let currentVersion = result.user_version || 0;

  // List of all migrations in order
  // v3 does not exist, only use v1 and v2
  // const migrations = [v1, v2]; after new version addition
  const migrations = [v1,v2];

  for (let i = currentVersion; i < migrations.length; i++) {
    console.log(`Running migration v${i + 1}`);
    await migrations[i].migrate(db);
    await db.execAsync(`PRAGMA user_version = ${i + 1};`);
  }

   } catch (error) {
    console.log("error from mainDB/RUNMIGRATION.js",error);
  }
}
