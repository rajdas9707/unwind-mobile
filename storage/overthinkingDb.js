// overthinkingDb.js
import { getDb } from "./db";

// -------------------- CRUD --------------------

// List all entries
export async function listAllOverthinkingEntries() {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT id AS localId, server_id AS serverId, date, thought, solution, timestamp, dumped, synced
    FROM overthinking
    ORDER BY datetime(timestamp) ASC
  `);
}

// List entries by date
export async function listOverthinkingEntriesByDate(date) {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT id AS localId, server_id AS serverId, date, thought, solution, timestamp, dumped, synced
    FROM overthinking
    WHERE date = ?
    ORDER BY datetime(timestamp) ASC
  `, [date]);
}

// List latest N entries
export async function listLatestOverthinkingEntries(limit = 10) {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT id AS localId, server_id AS serverId, date, thought, solution, timestamp, dumped, synced
    FROM overthinking
    ORDER BY datetime(timestamp) DESC
    LIMIT ?
  `, [limit]);
}

// Insert a new local entry
export async function insertLocalOverthinkingEntry({ date, thought, solution, timestamp }) {
  const db = await getDb();
  const result = await db.execAsync(`
    INSERT INTO overthinking (server_id, date, thought, solution, timestamp, dumped, synced)
    VALUES (?, ?, ?, ?, ?, 0, 0)
  `, [null, date, thought, solution, timestamp]);

  return {
    localId: result.insertId || result.lastInsertRowId,
    serverId: null,
    date,
    thought,
    solution,
    timestamp,
    dumped: 0,
    synced: 0,
  };
}

// Mark entry as synced
export async function markOverthinkingSynced({ localId, serverId, timestamp }) {
  const db = await getDb();
  await db.execAsync(`
    UPDATE overthinking
    SET server_id = ?, timestamp = ?, synced = 1
    WHERE id = ?
  `, [serverId, timestamp, localId]);
}

// Toggle dumped flag
export async function toggleOverthinkingDumped({ localId, dumped }) {
  const db = await getDb();
  await db.execAsync(`
    UPDATE overthinking
    SET dumped = ?
    WHERE id = ?
  `, [dumped ? 1 : 0, localId]);
}

// Delete entry by localId or serverId
export async function deleteOverthinkingById({ localId, serverId }) {
  const db = await getDb();
  if (localId != null) {
    await db.execAsync(`DELETE FROM overthinking WHERE id = ?`, [localId]);
  } else if (serverId) {
    await db.execAsync(`DELETE FROM overthinking WHERE server_id = ?`, [serverId]);
  }
}
