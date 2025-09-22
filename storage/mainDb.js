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
    console.log("📖 Initializing journal database...");

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

    console.log("✅ unwind database initialized successfully");
    return db;
  } catch (error) {
    console.error("❌ Error initializing unwind database:", error);
    // Reset the instance so we can retry
    dbInstance = null;
    throw error;
  }
};
