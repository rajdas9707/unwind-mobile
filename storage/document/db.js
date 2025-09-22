
import * as SQLite from "expo-sqlite";

// Singleton database connection
let dbInstance = null;
let dbPromise = null;
let initAttempts = 0;
const MAX_INIT_ATTEMPTS = 3;

// Get or create database connection (singleton pattern)
export const getDocumentDB = async () => {
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
    initAttempts = 0;
    return dbInstance;
  } catch (error) {
    dbPromise = null;
    initAttempts++;
    if (initAttempts < MAX_INIT_ATTEMPTS) {
      console.log(`📄 Document DB init failed, retrying... (attempt ${initAttempts}/${MAX_INIT_ATTEMPTS})`);
      await new Promise(resolve => setTimeout(resolve, 1000 * initAttempts));
      return getDocumentDB();
    }
    throw error;
  }
};

// Initialize database with tables and indexes
const initializeDatabase = async () => {
  try {
    console.log('📄 Initializing document database...');
    if (dbInstance) {
      try { await dbInstance.closeAsync(); } catch (e) {}
      dbInstance = null;
    }
    const db = await SQLite.openDatabaseAsync("docs.db", {
      enableChangeListener: false,
    });
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        docName TEXT NOT NULL UNIQUE,
        files TEXT,
        tag TEXT DEFAULT 'miscellaneous',
        createdAt TEXT NOT NULL DEFAULT (datetime('now')),
        lastOpenedAt TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_documents_createdAt ON documents(createdAt);
      CREATE INDEX IF NOT EXISTS idx_documents_tag ON documents(tag);
    `);
    await db.getFirstAsync("SELECT 1 as test");
    console.log('✅ Document database initialized successfully');
    return db;
  } catch (error) {
    console.error("❌ Error initializing document database:", error);
    dbInstance = null;
    throw error;
  }
};

// Legacy function for backward compatibility
export const openDB = getDocumentDB;

export const insertDocument = async ({ docName, files = [], tag = "miscellaneous" }) => {
  try {
    const db = await getDocumentDB();
    const filesJson = JSON.stringify(files);
    const result = await db.runAsync(
      "INSERT INTO documents (docName, files, tag) VALUES (?, ?, ?)",
      [docName, filesJson, tag]
    );
    const newDoc = await db.getFirstAsync("SELECT * FROM documents WHERE id = ?", [result.lastInsertRowId]);
    return {
      ...newDoc,
      files: newDoc.files ? JSON.parse(newDoc.files) : [],
    };
  } catch (error) {
    console.log("error from insertDocument of storage/document/db.js", error);
    throw error;
  }
};

export const updateLastOpened = async (id) => {
  try {
    const db = await getDocumentDB();
    await db.runAsync(
      "UPDATE documents SET lastOpenedAt = datetime('now') WHERE id = ?",
      [id]
    );
  } catch (error) {
    console.log("error from updateLastOpened of storage/document/db.js", error);
  }
};

export const updateDocument = async ({ id, docName, files, tag }) => {
  try {
    const db = await getDocumentDB();
    const existing = await db.getFirstAsync(
      "SELECT * FROM documents WHERE id = ?",
      [id]
    );
    if (!existing) return null;
    const nextDocName = typeof docName === "string" ? docName : existing.docName;
    const nextFiles = files !== undefined ? JSON.stringify(files) : existing.files;
    const nextTag = tag || existing.tag;
    await db.runAsync(
      "UPDATE documents SET docName = ?, files = ?, tag = ? WHERE id = ?",
      [nextDocName, nextFiles, nextTag, id]
    );
    return await getDocumentById(id);
  } catch (error) {
    console.log("error from updateDocument of storage/document/db.js", error);
    throw error;
  }
};

export const getDocuments = async (limit = 20) => {
  try {
    const db = await getDocumentDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM documents ORDER BY createdAt DESC LIMIT ?",
      [limit]
    );
    return rows.map((r) => ({
      ...r,
      files: r.files ? JSON.parse(r.files) : [],
    }));
  } catch (error) {
    console.log("error from getDocuments of storage/document/db.js", error);
    throw error;
  }
};

export const getDocumentById = async (id) => {
  try {
    const db = await getDocumentDB();
    const row = await db.getFirstAsync("SELECT * FROM documents WHERE id = ?", [id]);
    if (!row) return null;
    return {
      ...row,
      files: row.files ? JSON.parse(row.files) : [],
    };
  } catch (error) {
    console.log("error from getDocumentById of storage/document/db.js", error);
    throw error;
  }
};

export const deleteDocument = async (id) => {
  try {
    const db = await getDocumentDB();
    await db.runAsync("DELETE FROM documents WHERE id = ?", [id]);
    return true;
  } catch (error) {
    console.log("error from deleteDocument of storage/document/db.js", error);
    throw error;
  }
};

// Health check for the document database
export const checkDocumentDatabaseHealth = async () => {
  try {
    const db = await getDocumentDB();
    const testResult = await db.getFirstAsync("SELECT 1 as test");
    const tableCheck = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='documents'"
    );
    const count = await db.getFirstAsync("SELECT COUNT(*) as count FROM documents");
    return {
      healthy: true,
      testQuery: testResult?.test === 1,
      tableExists: !!tableCheck,
      entryCount: count?.count || 0,
      message: 'Database is healthy'
    };
  } catch (error) {
    console.error('❌ Document database health check failed:', error);
    return {
      healthy: false,
      error: error.message,
      message: 'Database health check failed'
    };
  }
};
