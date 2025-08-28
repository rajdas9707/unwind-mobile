import * as SQLite from "expo-sqlite";

let dbPromise;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("unwind.db");
  }
  return dbPromise;
}

export async function initJournalDb() {
  const db = await getDb();
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT,
      date TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_journal_date ON journal(date);
    CREATE INDEX IF NOT EXISTS idx_journal_server ON journal(server_id);`
  );
}

export async function listAllEntries() {
  const db = await getDb();
  const res = await db.getAllAsync(
    "SELECT id AS localId, server_id AS serverId, date, content, timestamp, synced FROM journal ORDER BY datetime(timestamp) ASC"
  );
  return res;
}

export async function listEntriesByDate(date) {
  console.log("listEntriesByDate called with date:", date);
  const db = await getDb();

  try {
    const res = await db.getAllAsync(
      "SELECT id AS localId, server_id AS serverId, date, content, timestamp, synced FROM journal WHERE date = ? ORDER BY datetime(timestamp) ASC",
      [date]
    );
    console.log("listEntriesByDate result:", res);
    return res;
  } catch (error) {
    console.log("Error in listEntriesByDate:", error);
    throw error;
  }
}

export async function listLatestEntries(limit = 10) {
  console.log("listLatestEntries called with limit:", limit);
  const db = await getDb();

  try {
    const res = await db.getAllAsync(
      "SELECT id AS localId, server_id AS serverId, date, content, timestamp, synced FROM journal ORDER BY datetime(timestamp) DESC LIMIT ?",
      [limit]
    );
    console.log("listLatestEntries result:", res);
    return res;
  } catch (error) {
    console.log("Error in listLatestEntries:", error);
    throw error;
  }
}

export async function insertLocalEntry({ date, content, timestamp }) {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO journal (server_id, date, content, timestamp, synced) VALUES (?, ?, ?, ?, 0)",
    [null, date, content, timestamp]
  );
  const localId = result.lastInsertRowId;
  return {
    localId,
    serverId: null,
    date,
    content,
    timestamp,
    synced: 0,
  };
}

export async function markSynced({ localId, serverId, timestamp }) {
  console.log("markSynced called with:", { localId, serverId, timestamp });
  const db = await getDb();

  try {
    const result = await db.runAsync(
      "UPDATE journal SET server_id = ?, timestamp = ?, synced = 1 WHERE id = ?",
      [serverId, timestamp, localId]
    );
    console.log("markSynced result:", result);

    // Verify the update worked
    const updated = await db.getFirstAsync(
      "SELECT * FROM journal WHERE id = ?",
      [localId]
    );
    console.log("Updated entry:", updated);

    return result;
  } catch (error) {
    console.log("Error in markSynced:", error);
    throw error;
  }
}

export async function upsertFromServer({ serverId, date, content, timestamp }) {
  const db = await getDb();
  const existing = await db.getFirstAsync(
    "SELECT id FROM journal WHERE server_id = ?",
    [serverId]
  );
  if (existing) {
    await db.runAsync(
      "UPDATE journal SET date = ?, content = ?, timestamp = ?, synced = 1 WHERE server_id = ?",
      [date, content, timestamp, serverId]
    );
    return existing.id;
  } else {
    const result = await db.runAsync(
      "INSERT INTO journal (server_id, date, content, timestamp, synced) VALUES (?, ?, ?, ?, 1)",
      [serverId, date, content, timestamp]
    );
    return result.lastInsertRowId;
  }
}

export async function deleteLocalByIds({ localId, serverId }) {
  const db = await getDb();
  if (localId != null) {
    await db.runAsync("DELETE FROM journal WHERE id = ?", [localId]);
  } else if (serverId) {
    await db.runAsync("DELETE FROM journal WHERE server_id = ?", [serverId]);
  }
}
