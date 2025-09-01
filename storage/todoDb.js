// todoDb.js
import { getDb } from "./db";

// -------------------- TODOS --------------------

export async function listAllTodos() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT id AS localId, title, description, category, priority, completed, due_date, created_at, updated_at
     FROM todos
     ORDER BY created_at DESC`
  );
}

export async function listTodosByCategory(category) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT id AS localId, title, description, category, priority, completed, due_date, created_at, updated_at
     FROM todos
     WHERE category = ?
     ORDER BY created_at DESC`,
    [category]
  );
}

export async function insertTodo({ title, description, category, priority = "medium", dueDate, createdAt, updatedAt }) {
  const db = await getDb();
  const result = await db.execAsync(
    `INSERT INTO todos (title, description, category, priority, completed, due_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?)`,
    [title, description, category, priority, dueDate, createdAt, updatedAt]
  );

  const inserted = await db.getFirstAsync(
    `SELECT id AS localId, title, description, category, priority, completed, due_date, created_at, updated_at
     FROM todos WHERE id = ?`,
    [result.insertId || result.lastInsertRowId]
  );

  return { ...inserted, completed: inserted.completed === 1 };
}

export async function updateTodo({ localId, title, description, category, priority, dueDate, updatedAt }) {
  const db = await getDb();
  await db.execAsync(
    `UPDATE todos
     SET title = ?, description = ?, category = ?, priority = ?, due_date = ?, updated_at = ?
     WHERE id = ?`,
    [title, description, category, priority, dueDate, updatedAt, localId]
  );
}

export async function toggleTodoComplete({ localId, completed, updatedAt }) {
  const db = await getDb();
  await db.execAsync(
    `UPDATE todos SET completed = ?, updated_at = ? WHERE id = ?`,
    [completed ? 1 : 0, updatedAt, localId]
  );
}

export async function deleteTodoById(localId) {
  const db = await getDb();
  await db.execAsync(`DELETE FROM todos WHERE id = ?`, [localId]);
}

export async function getTodoById(localId) {
  const db = await getDb();
  return db.getFirstAsync(
    `SELECT id AS localId, title, description, category, priority, completed, due_date, created_at, updated_at
     FROM todos WHERE id = ?`,
    [localId]
  );
}

// -------------------- CARRIED OVER TODOS --------------------

export async function listCarriedOverTodosByCategory(category) {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT id AS localId, original_task_id, title, description, category, priority, completed, due_date, original_created_at, carried_over_at, updated_at
     FROM carried_over_todos
     WHERE category = ?
     ORDER BY carried_over_at DESC`,
    [category]
  );
}

export async function moveTaskToCarriedOver(localId) {
  const db = await getDb();

  // Get original task
  const task = await getTodoById(localId);
  if (!task) throw new Error("Task not found");

  const now = new Date().toISOString();

  await db.execAsync(
    `INSERT INTO carried_over_todos
     (original_task_id, title, description, category, priority, completed, due_date, original_created_at, carried_over_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      task.localId,
      task.title,
      task.description,
      task.category,
      task.priority,
      task.completed ? 1 : 0,
      task.due_date,
      task.created_at,
      now,
      now,
    ]
  );

  // Delete from original todos
  await deleteTodoById(localId);
}

export async function moveAllPendingToCarriedOver() {
  const todos = await listAllTodos();
  const pending = todos.filter(t => !t.completed);

  for (const t of pending) {
    await moveTaskToCarriedOver(t.localId);
  }

  return pending.length;
}
