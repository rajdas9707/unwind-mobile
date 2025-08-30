import React, { createContext, useContext, useEffect, useState } from "react";
import * as SQLite from "expo-sqlite";
import { DatabaseLoadingScreen } from "../components/DatabaseLoadingScreen";

// Import all database initialization functions
import { initJournalDb } from "../storage/journalDb";
import { initMistakesDb } from "../storage/mistakesDb";
import { initOverthinkingDb } from "../storage/overthinkingDb";
import { initTodoDb } from "../storage/todoDb";

// Create the context
const DatabaseContext = createContext();

// Database connection management
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

// Initialize all database tables
async function initializeAllDatabases() {
  try {
    console.log("Initializing all databases...");

    // Initialize each database module
    await initJournalDb();
    console.log("Journal database initialized");

    await initMistakesDb();
    console.log("Mistakes database initialized");

    await initOverthinkingDb();
    console.log("Overthinking database initialized");

    await initTodoDb();
    console.log("Todo database initialized");

    console.log("All databases initialized successfully");
    return true;
  } catch (error) {
    console.error("Error initializing databases:", error);
    throw error;
  }
}

// Test database connectivity
async function testDatabaseConnection() {
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

// Reset database connection (useful for debugging)
function resetDbConnection() {
  dbPromise = null;
  isInitializing = false;
  initializationPromise = null;
  console.log("Database connection reset");
}

// Force reconnection to database
async function forceReconnect() {
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

// Database Provider Component
export function DatabaseProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initializeDatabase() {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize all database tables
        await initializeAllDatabases();

        // Test the connection
        const isConnected = await testDatabaseConnection();
        if (!isConnected) {
          throw new Error("Database connection test failed");
        }

        setIsInitialized(true);
        console.log("Database context initialized successfully");
      } catch (err) {
        console.error("Failed to initialize database:", err);
        setError(err.message);
        setIsInitialized(false);
      } finally {
        setIsLoading(false);
      }
    }

    initializeDatabase();
  }, []);

  const value = {
    isInitialized,
    isLoading,
    error,
    getDb,
    testDatabaseConnection,
    resetDbConnection,
    forceReconnect,
    initializeAllDatabases,
  };

  // Show loading screen while initializing or if there's an error
  if (isLoading || !isInitialized) {
    return <DatabaseLoadingScreen error={error} />;
  }

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
}

// Custom hook to use the database context
export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
}

// Export the context for direct access if needed
export { DatabaseContext };
