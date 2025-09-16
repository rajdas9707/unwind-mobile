import * as SQLite from 'expo-sqlite';

class BuyItemsDatabase {
  constructor() {
    this.db = null;
    this.initDB();
  }

  async initDB() {
    try {
      this.db = await SQLite.openDatabaseAsync('buyItems.db');
      await this.createTables();
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async createTables() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Create shopping lists table
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS shopping_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create shopping items table
      await this.db.execAsync(`
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
      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_shopping_items_list_id ON shopping_items(list_id);
      `);

      await this.db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_at ON shopping_lists(created_at DESC);
      `);

    } catch (error) {
      console.error('Error creating tables:', error);
      throw error;
    }
  }

  async ensureDB() {
    if (!this.db) {
      await this.initDB();
    }
    return this.db;
  }

  // Shopping Lists CRUD operations
  async createList(name) {
    const db = await this.ensureDB();
    try {
      const result = await db.runAsync(
        'INSERT INTO shopping_lists (name) VALUES (?)',
        [name]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error creating list:', error);
      throw error;
    }
  }

  async getAllLists() {
    const db = await this.ensureDB();
    try {
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
      console.error('Error getting lists:', error);
      throw error;
    }
  }

  async getListById(listId) {
    const db = await this.ensureDB();
    try {
      const list = await db.getFirstAsync(
        'SELECT * FROM shopping_lists WHERE id = ?',
        [listId]
      );
      return list;
    } catch (error) {
      console.error('Error getting list by id:', error);
      throw error;
    }
  }

  async updateList(listId, name) {
    const db = await this.ensureDB();
    try {
      await db.runAsync(
        'UPDATE shopping_lists SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, listId]
      );
    } catch (error) {
      console.error('Error updating list:', error);
      throw error;
    }
  }

  async deleteList(listId) {
    const db = await this.ensureDB();
    try {
      // Delete all items first (cascade should handle this, but being explicit)
      await db.runAsync('DELETE FROM shopping_items WHERE list_id = ?', [listId]);
      // Delete the list
      await db.runAsync('DELETE FROM shopping_lists WHERE id = ?', [listId]);
    } catch (error) {
      console.error('Error deleting list:', error);
      throw error;
    }
  }

  // Shopping Items CRUD operations
  async createItem(listId, name, location = '') {
    const db = await this.ensureDB();
    try {
      const result = await db.runAsync(
        'INSERT INTO shopping_items (list_id, name, location) VALUES (?, ?, ?)',
        [listId, name, location]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  async getItemsByListId(listId) {
    const db = await this.ensureDB();
    try {
      const items = await db.getAllAsync(
        'SELECT * FROM shopping_items WHERE list_id = ? ORDER BY is_bought ASC, created_at DESC',
        [listId]
      );
      return items;
    } catch (error) {
      console.error('Error getting items:', error);
      throw error;
    }
  }

  async getItemById(itemId) {
    const db = await this.ensureDB();
    try {
      const item = await db.getFirstAsync(
        'SELECT * FROM shopping_items WHERE id = ?',
        [itemId]
      );
      return item;
    } catch (error) {
      console.error('Error getting item by id:', error);
      throw error;
    }
  }

  async updateItem(itemId, name, location) {
    const db = await this.ensureDB();
    try {
      await db.runAsync(
        'UPDATE shopping_items SET name = ?, location = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, location, itemId]
      );
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async toggleItemBought(itemId) {
    const db = await this.ensureDB();
    try {
      await db.runAsync(
        'UPDATE shopping_items SET is_bought = NOT is_bought, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [itemId]
      );
    } catch (error) {
      console.error('Error toggling item bought status:', error);
      throw error;
    }
  }

  async deleteItem(itemId) {
    const db = await this.ensureDB();
    try {
      await db.runAsync('DELETE FROM shopping_items WHERE id = ?', [itemId]);
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  // Utility methods
  async clearAllData() {
    const db = await this.ensureDB();
    try {
      await db.runAsync('DELETE FROM shopping_items');
      await db.runAsync('DELETE FROM shopping_lists');
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new BuyItemsDatabase();