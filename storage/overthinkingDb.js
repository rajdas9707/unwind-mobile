import * as SQLite from "expo-sqlite";

import { getDb } from "./db";

export async function initOverthinkingDb() {
  const db = await getDb();
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS overthinking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT,
      date TEXT NOT NULL,
      thought TEXT NOT NULL,
      solution TEXT,
      timestamp TEXT NOT NULL,
      dumped INTEGER NOT NULL DEFAULT 0,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_overthinking_date ON overthinking(date);
    CREATE INDEX IF NOT EXISTS idx_overthinking_server ON overthinking(server_id);`
  );
}

export async function listAllOverthinkingEntries() {
  const db = await getDb();
  const res = await db.getAllAsync(
    "SELECT id AS localId, server_id AS serverId, date, thought, solution, timestamp, dumped, synced FROM overthinking ORDER BY datetime(timestamp) ASC"
  );
  return res;
}

export async function listOverthinkingEntriesByDate(date) {
  const db = await getDb();
  const res = await db.getAllAsync(
    "SELECT id AS localId, server_id AS serverId, date, thought, solution, timestamp, dumped, synced FROM overthinking WHERE date = ? ORDER BY datetime(timestamp) ASC",
    [date]
  );
  return res;
}

export async function listLatestOverthinkingEntries(limit = 10) {
  const db = await getDb();
  const res = await db.getAllAsync(
    "SELECT id AS localId, server_id AS serverId, date, thought, solution, timestamp, dumped, synced FROM overthinking ORDER BY datetime(timestamp) DESC LIMIT ?",
    [limit]
  );
  return res;
}

export async function insertLocalOverthinkingEntry({
  date,
  thought,
  solution,
  timestamp,
}) {
  const db = await getDb();
  const result = await db.runAsync(
    "INSERT INTO overthinking (server_id, date, thought, solution, timestamp, dumped, synced) VALUES (?, ?, ?, ?, ?, 0, 0)",
    [null, date, thought, solution, timestamp]
  );
  const localId = result.lastInsertRowId;
  return {
    localId,
    serverId: null,
    date,
    thought,
    solution,
    timestamp,
    dumped: 0,
    synced: 0,
  };
}

export async function markOverthinkingSynced({ localId, serverId, timestamp }) {
  const db = await getDb();
  const result = await db.runAsync(
    "UPDATE overthinking SET server_id = ?, timestamp = ?, synced = 1 WHERE id = ?",
    [serverId, timestamp, localId]
  );
  return result;
}

export async function toggleOverthinkingDumped({ localId, dumped }) {
  const db = await getDb();
  const result = await db.runAsync(
    "UPDATE overthinking SET dumped = ? WHERE id = ?",
    [dumped ? 1 : 0, localId]
  );
  return result;
}

export async function deleteOverthinkingById({ localId, serverId }) {
  const db = await getDb();
  if (localId != null) {
    await db.runAsync("DELETE FROM overthinking WHERE id = ?", [localId]);
  } else if (serverId) {
    await db.runAsync("DELETE FROM overthinking WHERE server_id = ?", [
      serverId,
    ]);
  }
}
