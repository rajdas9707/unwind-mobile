import * as SQLite from "expo-sqlite";
import { openDB } from "../mainDb";
// open database asynchronously
export const initDocumentsTable = async (db) => {
  try {
    // const db = await openDB();

    // create table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        docName TEXT NOT NULL UNIQUE,
        files TEXT,
        tag TEXT DEFAULT 'miscellaneous',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastOpenedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (error) {
    console.log("error from storage/document/db.js", error);
  }
};

export const insertDocument = async ({
  docName,
  files = [],
  tag = "miscellaneous",
}) => {
  try {
    const db = await openDB();
    const filesJson = JSON.stringify(files);
    const result = await db.runAsync(
      "INSERT INTO documents (docName, files, tag) VALUES (?, ?, ?)",
      [docName, filesJson, tag]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.log("error from insertDocument of storage/document/db.js", error);
    throw error; // Re-throw to handle unique constraint
  }
};

export const updateLastOpened = async (id) => {
  try {
    const db = await openDB();
    await db.runAsync(
      "UPDATE documents SET lastOpenedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
  } catch (error) {
    console.log("error from updateLastOpened of storage/document/db.js", error);
  }
};

export const updateDocument = async ({ id, docName, files, tag }) => {
  try {
    const db = await openDB();
    const existing = await db.getFirstAsync(
      "SELECT * FROM documents WHERE id = ?",
      [id]
    );
    if (!existing) return;

    const nextDocName =
      typeof docName === "string" ? docName : existing.docName;
    const nextFiles =
      files !== undefined ? JSON.stringify(files) : existing.files;
    const nextTag = tag || existing.tag;

    await db.runAsync(
      "UPDATE documents SET docName = ?, files = ?, tag = ? WHERE id = ?",
      [nextDocName, nextFiles, nextTag, id]
    );
    return id;
  } catch (error) {
    console.log("error from updateDocument of storage/document/db.js", error);
  }
};

export const getDocuments = async () => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync(
      "SELECT * FROM documents ORDER BY createdAt DESC"
    );
    return rows.map((r) => ({
      ...r,
      files: r.files ? JSON.parse(r.files) : [],
    }));
  } catch (error) {
    console.log("error from getDocuments of storage/document/db.js", error);
  }
};

export const getDocumentById = async (id) => {
  try {
    const db = await openDB();
    const row = await db.getFirstAsync("SELECT * FROM documents WHERE id = ?", [
      id,
    ]);
    if (!row) return null;
    return {
      ...row,
      files: row.files ? JSON.parse(row.files) : [],
    };
  } catch (error) {
    console.log("error from getDocumentById of storage/document/db.js", error);
  }
};

export const deleteDocument = async (id) => {
  try {
    const db = await openDB();
    await db.runAsync("DELETE FROM documents WHERE id = ?", [id]);
  } catch (error) {
    console.log("error from deleteDocument of storage/document/db.js", error);
  }
};
