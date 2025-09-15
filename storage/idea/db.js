import * as SQLite from "expo-sqlite";

// open database asynchronously
export const openDB = async () => {
  try {
    const db = await SQLite.openDatabaseAsync("ideas.db", {
      useNewConnection: true,
    });
    if (db) {
      return db;
    }

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

    return db;
  } catch (error) {
    console.log("error from storage/idea/db.js", error);
  }
};

export const insertIdea = async ({
  idea,
  urls = [],
  files = [],
  tag = "miscellaneous",
}) => {
  try {
    const db = await openDB();
    const urlsJson = JSON.stringify(urls);
    const filesJson = JSON.stringify(files);
    const result = await db.runAsync(
      "INSERT INTO ideas (idea, urls, files, tag) VALUES (?, ?, ?, ?)",
      [idea, urlsJson, filesJson, tag]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.log("error from insertIdea of storage/idea/db.js", error);
  }
};

export const updateIdea = async ({ id, idea, urls, files, tag }) => {
  try {
    const db = await openDB();
    const existing = await db.getFirstAsync(
      "SELECT * FROM ideas WHERE id = ?",
      [id]
    );
    if (!existing) return;

    const nextIdea = typeof idea === "string" ? idea : existing.idea;
    const nextUrls = urls !== undefined ? JSON.stringify(urls) : existing.urls;
    const nextFiles =
      files !== undefined ? JSON.stringify(files) : existing.files;
    const nextTag = tag || existing.tag;

    await db.runAsync(
      "UPDATE ideas SET idea = ?, urls = ?, files = ?, tag = ? WHERE id = ?",
      [nextIdea, nextUrls, nextFiles, nextTag, id]
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
