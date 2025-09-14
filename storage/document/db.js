import * as SQLite from "expo-sqlite";

// open database asynchronously
export const openDB = async () => {
    try {
        
   
  const db = await SQLite.openDatabaseAsync("docs.db");

  // create table
 await db.execAsync(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      docName TEXT UNIQUE NOT NULL,
      files TEXT, -- JSON array of files
      tags TEXT,
      category TEXT,
      createdAt TEXT
    );
  `);

  return db;
   } catch (error) {
        console.log("error from storage/document/db.js",error)
    }
};
