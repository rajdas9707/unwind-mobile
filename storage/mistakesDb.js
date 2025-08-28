import * as SQLite from "expo-sqlite";

let dbPromise;

function getDb() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync("unwind.db");
  }
  return dbPromise;
}

export async function initMistakesDb() {
  const db = await getDb();
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS mistakes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT,
      date TEXT NOT NULL,
      mistake TEXT NOT NULL,
      solution TEXT NOT NULL,
      category TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      avoided INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_mistakes_date ON mistakes(date);
    CREATE INDEX IF NOT EXISTS idx_mistakes_server ON mistakes(server_id);
    CREATE INDEX IF NOT EXISTS idx_mistakes_category ON mistakes(category);`
  );
}

export async function listAllMistakesEntries() {
  const db = await getDb();
  const res = await db.getAllAsync(
    "SELECT id AS localId, server_id AS serverId, date, mistake, solution, category, timestamp, avoided, synced FROM mistakes ORDER BY datetime(timestamp) ASC"
  );
  return res;
}

export async function listMistakesEntriesByDate(date) {
  const db = await getDb();
  const res = await db.getAllAsync(
    "SELECT id AS localId, server_id AS serverId, date, mistake, solution, category, timestamp, avoided, synced FROM mistakes WHERE date = ? ORDER BY datetime(timestamp) ASC",
    [date]
  );
  return res;
}

export async function listLatestMistakesEntries(limit = 10) {
  const db = await getDb();
  const res = await db.getAllAsync(
    "SELECT id AS localId, server_id AS serverId, date, mistake, solution, category, timestamp, avoided, synced FROM mistakes ORDER BY datetime(timestamp) DESC LIMIT ?",
    [limit]
  );
  return res;
}

export async function insertLocalMistakeEntry({
  date,
  mistake,
  solution,
  category,
  timestamp,
}) {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO mistakes (server_id, date, mistake, solution, category, timestamp, avoided, synced) VALUES (?, ?, ?, ?, ?, ?, 0, 0)",
    [null, date, mistake, solution, category, timestamp]
  );
  const localId = result.lastInsertRowId;
  return {
    localId,
    serverId: null,
    date,
    mistake,
    solution,
    category,
    timestamp,
    avoided: 0,
    synced: 0,
  };
}

export async function markMistakeSynced({ localId, serverId, timestamp }) {
  const db = await getDb();
  const result = await db.runAsync(
    "UPDATE mistakes SET server_id = ?, timestamp = ?, synced = 1 WHERE id = ?",
    [serverId, timestamp, localId]
  );
  return result;
}

export async function toggleMistakeAvoided({ localId, avoided }) {
  const db = await getDb();
  const result = await db.runAsync(
    "UPDATE mistakes SET avoided = ? WHERE id = ?",
    [avoided ? 1 : 0, localId]
  );
  return result;
}

export async function deleteMistakeById({ localId, serverId }) {
  const db = await getDb();
  if (localId != null) {
    await db.runAsync("DELETE FROM mistakes WHERE id = ?", [localId]);
  } else if (serverId) {
    await db.runAsync("DELETE FROM mistakes WHERE server_id = ?", [serverId]);
  }
}
