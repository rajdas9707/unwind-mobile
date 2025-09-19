import * as SQLite from 'expo-sqlite';

let db = null;
let initPromise = null;

/**
 * Initialize the SQLite database and create tables if they don't exist
 */
export const initDatabase = async () => {
  // If already initializing, wait for that to complete
  if (initPromise) {
    console.log('Database initialization already in progress, waiting...');
    return await initPromise;
  }

  // If already initialized, return immediately
  if (db) {
    console.log('Database already initialized');
    return;
  }

  // Start initialization
  initPromise = (async () => {
    try {
      console.log('Starting database initialization...');
      db = await SQLite.openDatabaseAsync('topics.db');
      console.log('Database opened successfully');
      
    // Create cards table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        is_completed BOOLEAN DEFAULT 0,
        completed_at DATETIME,
        total_topics INTEGER DEFAULT 0,
        completed_topics INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
      console.log('Cards table created/verified');

    // Create topics table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS topics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_completed BOOLEAN DEFAULT 0,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id) REFERENCES cards (id) ON DELETE CASCADE
      );
    `);
      console.log('Topics table created/verified');

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
      console.log('Links table created/verified');

      // Add migration logic for existing tables
      try {
        // Check if completion columns exist in topics table
        await db.execAsync(`
          ALTER TABLE topics ADD COLUMN is_completed BOOLEAN DEFAULT 0;
        `);
        console.log('Added is_completed column to topics table');
      } catch (error) {
        // Column might already exist, ignore error
        if (!error.message.includes('duplicate column')) {
          console.warn('Error adding is_completed to topics:', error.message);
        }
      }

      try {
        await db.execAsync(`
          ALTER TABLE topics ADD COLUMN completed_at DATETIME;
        `);
        console.log('Added completed_at column to topics table');
      } catch (error) {
        if (!error.message.includes('duplicate column')) {
          console.warn('Error adding completed_at to topics:', error.message);
        }
      }

      try {
        // Check if completion columns exist in cards table
        await db.execAsync(`
          ALTER TABLE cards ADD COLUMN is_completed BOOLEAN DEFAULT 0;
        `);
        console.log('Added is_completed column to cards table');
      } catch (error) {
        if (!error.message.includes('duplicate column')) {
          console.warn('Error adding is_completed to cards:', error.message);
        }
      }

      try {
        await db.execAsync(`
          ALTER TABLE cards ADD COLUMN completed_at DATETIME;
        `);
        console.log('Added completed_at column to cards table');
      } catch (error) {
        if (!error.message.includes('duplicate column')) {
          console.warn('Error adding completed_at to cards:', error.message);
        }
      }

      try {
        await db.execAsync(`
          ALTER TABLE cards ADD COLUMN total_topics INTEGER DEFAULT 0;
        `);
        console.log('Added total_topics column to cards table');
      } catch (error) {
        if (!error.message.includes('duplicate column')) {
          console.warn('Error adding total_topics to cards:', error.message);
        }
      }

      try {
        await db.execAsync(`
          ALTER TABLE cards ADD COLUMN completed_topics INTEGER DEFAULT 0;
        `);
        console.log('Added completed_topics column to cards table');
      } catch (error) {
        if (!error.message.includes('duplicate column')) {
          console.warn('Error adding completed_topics to cards:', error.message);
        }
      }

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      db = null; // Reset on error
      throw error;
    } finally {
      initPromise = null; // Clear the promise
    }
  })();

  return await initPromise;
};

/**
 * Get the database instance
 */
export const getDatabase = async () => {
  // If initialization is in progress, wait for it
  if (initPromise) {
    console.log('Waiting for database initialization to complete...');
    await initPromise;
  }
  
  // If still no database after waiting, try to initialize
  if (!db) {
    console.log('Database not initialized, initializing now...');
    await initDatabase();
  }
  
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
  const database = await getDatabase();
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
    const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
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
  const database = await getDatabase();
  try {
    await database.runAsync('DELETE FROM links WHERE id = ?', [id]);
  } catch (error) {
    console.error('Failed to delete link:', error);
    throw error;
  }
};

// COMPLETION OPERATIONS

/**
 * Toggle topic completion status
 */
export const toggleTopicCompletion = async (topicId) => {
  const database = await getDatabase();
  try {
    // Get current completion status
    const topic = await database.getFirstAsync('SELECT is_completed, card_id FROM topics WHERE id = ?', [topicId]);
    if (!topic) {
      throw new Error('Topic not found');
    }

    const newCompletionStatus = !topic.is_completed;
    const completedAt = newCompletionStatus ? new Date().toISOString() : null;

    // Update topic completion status
    await database.runAsync(
      'UPDATE topics SET is_completed = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newCompletionStatus, completedAt, topicId]
    );

    // Update card progress
    await updateCardProgress(topic.card_id);

    return newCompletionStatus;
  } catch (error) {
    console.error('Failed to toggle topic completion:', error);
    throw error;
  }
};

/**
 * Update card progress and completion status
 */
export const updateCardProgress = async (cardId) => {
  const database = await getDatabase();
  try {
    // Get topic counts for this card
    const counts = await database.getFirstAsync(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
      FROM topics 
      WHERE card_id = ?
    `, [cardId]);

    const totalTopics = counts.total || 0;
    const completedTopics = counts.completed || 0;
    const isCardCompleted = totalTopics > 0 && completedTopics === totalTopics;
    const cardCompletedAt = isCardCompleted ? new Date().toISOString() : null;

    // Update card with progress and completion status
    await database.runAsync(`
      UPDATE cards 
      SET total_topics = ?, completed_topics = ?, is_completed = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [totalTopics, completedTopics, isCardCompleted, cardCompletedAt, cardId]);

    // If card is completed (100% progress), mark for deletion but don't delete immediately
    // The UI will handle the deletion after showing celebration
    if (isCardCompleted) {
      console.log(`Card ${cardId} completed - ready for deletion`);
    }

    return {
      totalTopics,
      completedTopics,
      isCompleted: isCardCompleted,
      progress: totalTopics > 0 ? (completedTopics / totalTopics) * 100 : 0,
      willBeDeleted: isCardCompleted
    };
  } catch (error) {
    console.error('Failed to update card progress:', error);
    throw error;
  }
};

/**
 * Get card progress information
 */
export const getCardProgress = async (cardId) => {
  const database = await getDatabase();
  try {
    const card = await database.getFirstAsync(`
      SELECT total_topics, completed_topics, is_completed 
      FROM cards 
      WHERE id = ?
    `, [cardId]);

    if (!card) {
      throw new Error('Card not found');
    }

    return {
      totalTopics: card.total_topics || 0,
      completedTopics: card.completed_topics || 0,
      isCompleted: !!card.is_completed,
      progress: card.total_topics > 0 ? (card.completed_topics / card.total_topics) * 100 : 0
    };
  } catch (error) {
    console.error('Failed to get card progress:', error);
    throw error;
  }
};

/**
 * Recalculate progress for all cards (useful for data consistency)
 */
export const recalculateAllCardProgress = async () => {
  const database = await getDatabase();
  try {
    const cards = await database.getAllAsync('SELECT id FROM cards');
    
    for (const card of cards) {
      await updateCardProgress(card.id);
    }
    
    console.log(`Recalculated progress for ${cards.length} cards`);
  } catch (error) {
    console.error('Failed to recalculate card progress:', error);
    throw error;
  }
};
