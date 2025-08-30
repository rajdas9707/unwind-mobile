// db.js - Centralized database connection
import * as SQLite from "expo-sqlite";

let dbPromise = null;
let isInitializing = false;
let initializationPromise = null;

export async function getDb() {
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
