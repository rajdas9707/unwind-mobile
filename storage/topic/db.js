import * as SQLite from 'expo-sqlite';

let db = null;

/**
 * Initialize the SQLite database and create tables if they don't exist
 */
export const initDatabase = async () => {
  try {
    db = await SQLite.openDatabaseAsync('topics.db');
    
    // Create cards table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create topics table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
      );
    `);

    // Create links table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE CASCADE
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Get the database instance
 */
export const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
};

// CARD OPERATIONS

/**
 * Insert a new card
 */
export const insertCard = async (title, description) => {
  const database = getDatabase();
  try {
    const result = await database.runAsync(
      'INSERT INTO cards (title, description) VALUES (?, ?)',
      [title, description]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Failed to insert card:', error);
    throw error;
  }
};

/**
 * Get all cards
 */
export const getAllCards = async () => {
  try {
    const database = getDatabase();
    console.log('Database instance:', !!database);
    
    console.log('Executing database query: SELECT * FROM cards ORDER BY updated_at DESC');
    const result = await database.getAllAsync('SELECT * FROM cards ORDER BY updated_at DESC');
    console.log('Database query result:', result);
    console.log('Result type:', typeof result, 'Is array:', Array.isArray(result));
    
    if (!result) {
      console.warn('Query returned null/undefined, returning empty array');
      return [];
    }
    
    if (!Array.isArray(result)) {
      console.warn('Query result is not an array:', result);
      return [];
    }
    
    if (result.length > 0) {
      console.log('First card sample:', result[0]);
      console.log('Card fields:', Object.keys(result[0]));
    }
    
    return result;
  } catch (error) {
    console.error('Database error in getAllCards:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // If it's a table doesn't exist error, return empty array instead of throwing
    if (error.message && error.message.includes('no such table')) {
      console.warn('Cards table does not exist, returning empty array');
      return [];
    }
    
    throw error;
  }
};

/**
 * Update a card
 */
export const updateCard = async (id, title, description) => {
  const database = getDatabase();
  try {
    await database.runAsync(
      'UPDATE cards SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, description, id]
    );
  } catch (error) {
    console.error('Failed to update card:', error);
    throw error;
  }
};

/**
 * Delete a card and all associated topics/links
 */
export const deleteCard = async (id) => {
  const database = getDatabase();
  try {
    await database.runAsync('DELETE FROM cards WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete card:', error);
    throw error;
  }
};

/**
 * Get card by ID
 */
export const getCardById = async (id) => {
  const database = getDatabase();
  try {
    const result = await database.getFirstAsync('SELECT * FROM cards WHERE id = ?', [id]);
    return result;
  } catch (error) {
    console.error('Failed to get card by ID:', error);
    throw error;
  }
};

// TOPIC OPERATIONS

/**
 * Insert a new topic
 */
export const insertTopic = async (cardId, name, description) => {
  const database = getDatabase();
  try {
    const result = await database.runAsync(
      'INSERT INTO topics (card_id, name, description) VALUES (?, ?, ?)',
      [cardId, name, description]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Failed to insert topic:', error);
    throw error;
  }
};

/**
 * Get all topics for a card
 */
export const getTopicsByCardId = async (cardId) => {
  const database = getDatabase();
  try {
    const result = await database.getAllAsync(
      'SELECT * FROM topics WHERE card_id = ? ORDER BY created_at DESC',
      [cardId]
    );
    return result;
  } catch (error) {
    console.error('Failed to get topics:', error);
    throw error;
  }
};

/**
 * Update a topic
 */
export const updateTopic = async (id, name, description) => {
  const database = getDatabase();
  try {
    await database.runAsync(
      'UPDATE topics SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, description, id]
    );
  } catch (error) {
    console.error('Failed to update topic:', error);
    throw error;
  }
};

/**
 * Delete a topic and all associated links
 */
export const deleteTopic = async (id) => {
  const database = getDatabase();
  try {
    await database.runAsync('DELETE FROM topics WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete topic:', error);
    throw error;
  }
};

/**
 * Get topic by ID
 */
export const getTopicById = async (id) => {
  const database = getDatabase();
  try {
    const result = await database.getFirstAsync('SELECT * FROM topics WHERE id = ?', [id]);
    return result;
  } catch (error) {
    console.error('Failed to get topic by ID:', error);
    throw error;
  }
};

// LINK OPERATIONS

/**
 * Insert a new link
 */
export const insertLink = async (topicId, url, title) => {
  const database = getDatabase();
  try {
    const result = await database.runAsync(
      'INSERT INTO links (topic_id, url, title) VALUES (?, ?, ?)',
      [topicId, url, title]
    );
    return result.lastInsertRowId;
  } catch (error) {
    console.error('Failed to insert link:', error);
    throw error;
  }
};

/**
 * Get all links for a topic
 */
export const getLinksByTopicId = async (topicId) => {
  const database = getDatabase();
  try {
    const result = await database.getAllAsync(
      'SELECT * FROM links WHERE topic_id = ? ORDER BY created_at DESC',
      [topicId]
    );
    return result;
  } catch (error) {
    console.error('Failed to get links:', error);
    throw error;
  }
};

/**
 * Update a link
 */
export const updateLink = async (id, url, title) => {
  const database = getDatabase();
  try {
    await database.runAsync(
      'UPDATE links SET url = ?, title = ? WHERE id = ?',
      [url, title, id]
    );
  } catch (error) {
    console.error('Failed to update link:', error);
    throw error;
  }
};

/**
 * Delete a link
 */
export const deleteLink = async (id) => {
  const database = getDatabase();
  try {
    await database.runAsync('DELETE FROM links WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete link:', error);
    throw error;
  }
};