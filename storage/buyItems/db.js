import * as SQLite from "expo-sqlite";
import { openDB } from "../mainDb";

export const initBuyItemsTable = async (db) => {
  try {
    // const db = await openDB();

    // Create shopping lists table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS shopping_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

    // Create shopping items table
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS shopping_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          list_id INTEGER NOT NULL,
          name TEXT NOT NULL,
          location TEXT,
          is_bought BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (list_id) REFERENCES shopping_lists (id) ON DELETE CASCADE
        );
      `);

    // Create indexes for better performance
    await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_shopping_items_list_id ON shopping_items(list_id);
      `);

    await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_at ON shopping_lists(created_at DESC);
      `);
  } catch (error) {
    console.error("Error creating tables:", error);
    throw error;
  }
};

// Shopping Lists CRUD operations
export const createList = async (name) => {
  try {
    const db = await openDB();

    const result = await db.runAsync(
      "INSERT INTO shopping_lists (name) VALUES (?)",
      [name]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error creating list:", error);
    throw error;
  }
};

export const getAllLists = async () => {
  try {
    const db = await openDB();

    const lists = await db.getAllAsync(`
        SELECT 
          sl.*,
          COUNT(si.id) as total_items,
          COUNT(CASE WHEN si.is_bought = 1 THEN 1 END) as bought_items
        FROM shopping_lists sl
        LEFT JOIN shopping_items si ON sl.id = si.list_id
        GROUP BY sl.id
        ORDER BY sl.created_at DESC
      `);
    return lists;
  } catch (error) {
    console.error("Error getting lists:", error);
    throw error;
  }
};

export const getListById = async (listId) => {
  try {
    const db = await openDB();

    const list = await db.getFirstAsync(
      "SELECT * FROM shopping_lists WHERE id = ?",
      [listId]
    );
    return list;
  } catch (error) {
    console.error("Error getting list by id:", error);
    throw error;
  }
};

export const updateList = async (listId, name) => {
  try {
    const db = await openDB();

    await db.runAsync(
      "UPDATE shopping_lists SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, listId]
    );
  } catch (error) {
    console.error("Error updating list:", error);
    throw error;
  }
};

export const deleteList = async (listId) => {
  try {
    const db = await openDB();

    // Delete all items first (cascade should handle this, but being explicit)
    await db.runAsync("DELETE FROM shopping_items WHERE list_id = ?", [listId]);
    // Delete the list
    await db.runAsync("DELETE FROM shopping_lists WHERE id = ?", [listId]);
  } catch (error) {
    console.error("Error deleting list:", error);
    throw error;
  }
};

// Shopping Items CRUD operations
export const createItem = async (listId, name, location = "") => {
  try {
    const db = await openDB();

    const result = await db.runAsync(
      "INSERT INTO shopping_items (list_id, name, location) VALUES (?, ?, ?)",
      [listId, name, location]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error creating item:", error);
    throw error;
  }
};

export const getItemsByListId = async (listId) => {
  try {
    const db = await openDB();

    const items = await db.getAllAsync(
      "SELECT * FROM shopping_items WHERE list_id = ? ORDER BY is_bought ASC, created_at DESC",
      [listId]
    );
    return items;
  } catch (error) {
    console.error("Error getting items:", error);
    throw error;
  }
};

export const getItemById = async (itemId) => {
  try {
    const db = await openDB();

    const item = await db.getFirstAsync(
      "SELECT * FROM shopping_items WHERE id = ?",
      [itemId]
    );
    return item;
  } catch (error) {
    console.error("Error getting item by id:", error);
    throw error;
  }
};

export const updateItem = async (itemId, name, location) => {
  try {
    const db = await openDB();

    await db.runAsync(
      "UPDATE shopping_items SET name = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, location, itemId]
    );
  } catch (error) {
    console.error("Error updating item:", error);
    throw error;
  }
};

export const toggleItemBought = async (itemId) => {
  try {
    const db = await openDB();
    await db.runAsync(
      "UPDATE shopping_items SET is_bought = NOT is_bought, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [itemId]
    );
  } catch (error) {
    console.error("Error toggling item bought status:", error);
    throw error;
  }
};

export const deleteItem = async (itemId) => {
  try {
    const db = await openDB();
    await db.runAsync("DELETE FROM shopping_items WHERE id = ?", [itemId]);
  } catch (error) {
    console.error("Error deleting item:", error);
    throw error;
  }
};

// Utility methods
export const clearAllData = async () => {
  try {
    const db = await openDB();
    await db.runAsync("DELETE FROM shopping_items");
    await db.runAsync("DELETE FROM shopping_lists");
  } catch (error) {
    console.error("Error clearing all data:", error);
    throw error;
  }
};
