// journalDb.js
import { getDb } from "./db";

// -------------------- CRUD --------------------

// List all journal entries
export async function listAllEntries() {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT id AS localId, server_id AS serverId, date, content, timestamp, synced
    FROM journal
    ORDER BY datetime(timestamp) ASC
  `);
}

// List entries by date
export async function listEntriesByDate(date) {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT id AS localId, server_id AS serverId, date, content, timestamp, synced
    FROM journal
    WHERE date = ?
    ORDER BY datetime(timestamp) ASC
  `, [date]);
}

// List latest N entries
export async function listLatestEntries(limit = 10) {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT id AS localId, server_id AS serverId, date, content, timestamp, synced
    FROM journal
    ORDER BY datetime(timestamp) DESC
    LIMIT ?
  `, [limit]);
}

// Insert a new journal entry
export async function insertLocalEntry({ date, content, timestamp }) {
  const db = await getDb();
  const result = await db.execAsync(`
    INSERT INTO journal (server_id, date, content, timestamp, synced)
    VALUES (?, ?, ?, ?, 0)
  `, [null, date, content, timestamp]);

  return {
    localId: result.insertId || result.lastInsertRowId,
    serverId: null,
    date,
    content,
    timestamp,
    synced: 0,
  };
}

// Mark entry as synced
export async function markSynced({ localId, serverId, timestamp }) {
  const db = await getDb();
  await db.execAsync(`
    UPDATE journal
    SET server_id = ?, timestamp = ?, synced = 1
    WHERE id = ?
  `, [serverId, timestamp, localId]);
}

// Upsert from server
export async function upsertFromServer({ serverId, date, content, timestamp }) {
  const db = await getDb();
  const existing = await db.getFirstAsync(
    "SELECT id FROM journal WHERE server_id = ?",
    [serverId]
  );

  if (existing) {
    await db.execAsync(`
      UPDATE journal
      SET date = ?, content = ?, timestamp = ?, synced = 1
      WHERE server_id = ?
    `, [date, content, timestamp, serverId]);
    return existing.id;
  } else {
    const result = await db.execAsync(`
      INSERT INTO journal (server_id, date, content, timestamp, synced)
      VALUES (?, ?, ?, ?, 1)
    `, [serverId, date, content, timestamp]);
    return result.insertId || result.lastInsertRowId;
  }
}

// Delete entry by localId or serverId
export async function deleteLocalByIds({ localId, serverId }) {
  const db = await getDb();
  if (localId != null) {
    await db.execAsync(`DELETE FROM journal WHERE id = ?`, [localId]);
  } else if (serverId) {
    await db.execAsync(`DELETE FROM journal WHERE server_id = ?`, [serverId]);
  }
}
