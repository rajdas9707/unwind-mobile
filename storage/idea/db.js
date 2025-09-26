import * as SQLite from "expo-sqlite";
import { openDB } from "../mainDb";

// open database asynchronously
export const initIdeasTable = async (db) => {
  try {
    // const db = await openDB();

    // create table
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      idea TEXT NOT NULL,
      urls TEXT,
      time DATETIME DEFAULT CURRENT_TIMESTAMP,
      files TEXT,
      tag TEXT DEFAULT 'miscellaneous'
    );
  `);

    console.log("Idea table initialized");
  } catch (error) {
    console.log("error from storage/idea/db.js", error);
  }
};

export const insertIdea = async ({
  name = "",
  idea,
  urls = [],
  files = [],
  tag = "miscellaneous",
}) => {
  try {
    const db = await openDB();
    const urlsJson = JSON.stringify(urls);
    const filesJson = JSON.stringify(files);
    
    const currentTimestamp = new Date().toISOString();
    console.log("Creating idea with timestamp:", currentTimestamp);
    
    const result = await db.runAsync(
      "INSERT INTO ideas (name, idea, urls, files, tag, time) VALUES (?, ?, ?, ?, ?, ?)",
      [name, idea, urlsJson, filesJson, tag, currentTimestamp]
    );
    
    console.log("Idea created with ID:", result.lastInsertRowId);
    
    // Verify the created record
    const createdIdea = await db.getFirstAsync(
      "SELECT * FROM ideas WHERE id = ?",
      [result.lastInsertRowId]
    );
    console.log("Created idea record:", createdIdea);
    
    return result.lastInsertRowId;
  } catch (error) {
    console.log("error from insertIdea of storage/idea/db.js", error);
  }
};

export const updateIdea = async ({ id, name, idea, urls, files, tag }) => {
  try {
    const db = await openDB();
    const existing = await db.getFirstAsync(
      "SELECT * FROM ideas WHERE id = ?",
      [id]
    );
    if (!existing) return;

    const nextName = name !== undefined ? name : existing.name;
    const nextIdea = typeof idea === "string" ? idea : existing.idea;
    const nextUrls = urls !== undefined ? JSON.stringify(urls) : existing.urls;
    const nextFiles =
      files !== undefined ? JSON.stringify(files) : existing.files;
    const nextTag = tag || existing.tag;

    await db.runAsync(
      "UPDATE ideas SET name = ?, idea = ?, urls = ?, files = ?, tag = ? WHERE id = ?",
      [nextName, nextIdea, nextUrls, nextFiles, nextTag, id]
    );
    return id;
  } catch (error) {
    console.log("error from updateIdea of storage/idea/db.js", error);
  }
};

export const getIdeas = async () => {
  try {
    const db = await openDB();
    const rows = await db.getAllAsync("SELECT * FROM ideas ORDER BY time DESC");
    
    console.log("Retrieved ideas with timestamps:", rows.map(r => ({
      id: r.id,
      name: r.name,
      time: r.time,
      timeType: typeof r.time,
      parsedDate: new Date(r.time).toISOString(),
      currentTime: new Date().toISOString()
    })));
    
    return rows.map((r) => ({
      ...r,
      urls: r.urls ? JSON.parse(r.urls) : [],
      files: r.files ? JSON.parse(r.files) : [],
    }));
  } catch (error) {
    console.log("error from getIdeas of storage/idea/db.js", error);
  }
};

export const getIdeaById = async (id) => {
  try {
    const db = await openDB();
    const row = await db.getFirstAsync("SELECT * FROM ideas WHERE id = ?", [
      id,
    ]);
    if (!row) return null;
    return {
      ...row,
      urls: row.urls ? JSON.parse(row.urls) : [],
      files: row.files ? JSON.parse(row.files) : [],
    };
  } catch (error) {
    console.log("error from getIdeaById of storage/idea/db.js", error);
  }
};

export const deleteIdea = async (id) => {
  try {
    const db = await openDB();
    await db.runAsync("DELETE FROM ideas WHERE id = ?", [id]);
  } catch (error) {
    console.log("error from deleteIdea of storage/idea/db.js", error);
  }
};
