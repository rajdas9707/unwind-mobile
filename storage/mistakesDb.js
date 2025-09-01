// mistakesDb.js
import { getDb } from "./db";

// -------------------- CRUD --------------------

// List all mistakes
export async function listAllMistakesEntries() {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT id AS localId, server_id AS serverId, date, mistake, solution, category, timestamp, avoided, synced
    FROM mistakes
    ORDER BY datetime(timestamp) ASC
  `);
}

// List mistakes by date
export async function listMistakesEntriesByDate(date) {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT id AS localId, server_id AS serverId, date, mistake, solution, category, timestamp, avoided, synced
    FROM mistakes
    WHERE date = ?
    ORDER BY datetime(timestamp) ASC
  `, [date]);
}

// List latest N mistakes
export async function listLatestMistakesEntries(limit = 10) {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT id AS localId, server_id AS serverId, date, mistake, solution, category, timestamp, avoided, synced
    FROM mistakes
    ORDER BY datetime(timestamp) DESC
    LIMIT ?
  `, [limit]);
}

// Insert a new mistake entry
export async function insertLocalMistakeEntry({ date, mistake, solution, category, timestamp }) {
  const db = await getDb();
  const result = await db.execAsync(`
    INSERT INTO mistakes (server_id, date, mistake, solution, category, timestamp, avoided, synced)
    VALUES (?, ?, ?, ?, ?, ?, 0, 0)
  `, [null, date, mistake, solution, category, timestamp]);

  return {
    localId: result.insertId || result.lastInsertRowId,
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

// Mark entry as synced
export async function markMistakeSynced({ localId, serverId, timestamp }) {
  const db = await getDb();
  await db.execAsync(`
    UPDATE mistakes
    SET server_id = ?, timestamp = ?, synced = 1
    WHERE id = ?
  `, [serverId, timestamp, localId]);
}

// Toggle avoided flag
export async function toggleMistakeAvoided({ localId, avoided }) {
  const db = await getDb();
  await db.execAsync(`
    UPDATE mistakes
    SET avoided = ?
    WHERE id = ?
  `, [avoided ? 1 : 0, localId]);
}

// Delete entry by localId or serverId
export async function deleteMistakeById({ localId, serverId }) {
  const db = await getDb();
  if (localId != null) {
    await db.execAsync(`DELETE FROM mistakes WHERE id = ?`, [localId]);
  } else if (serverId) {
    await db.execAsync(`DELETE FROM mistakes WHERE server_id = ?`, [serverId]);
  }
}
