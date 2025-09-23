import * as SQLite from "expo-sqlite";
import * as Notifications from "expo-notifications";
import { openDB } from "../mainDb";

export const initwaterRemindersTable = async (db) => {
  try {
    // const db = await openDB();

    // Create reminders table with simple schema
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        interval_value INTEGER NOT NULL,
        interval_unit TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      )`
    );

    // Create checkpoints table with simple schema
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS checkpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reminder_id INTEGER NOT NULL,
        checkpoint_time TEXT NOT NULL,
        is_completed INTEGER DEFAULT 0,
        completed_at TEXT,
        notification_id TEXT
      )`
    );

    console.log("Water reminder database initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
};

// Reminder CRUD operations
export const createReminder = async (reminderData) => {
  try {
    const database = await openDB();
    const { startTime, endTime, intervalValue, intervalUnit, quantity } =
      reminderData;
    const currentTimestamp = new Date().toISOString();

    const result = await database.runAsync(
      `INSERT INTO reminders (start_time, end_time, interval_value, interval_unit, quantity, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        startTime,
        endTime,
        intervalValue,
        intervalUnit,
        quantity,
        currentTimestamp,
        currentTimestamp,
      ]
    );

    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error creating reminder:", error);
    throw error;
  }
};

export const getAllReminders = async () => {
  try {
    const database = await openDB();
    const reminders = await database.getAllAsync(
      "SELECT * FROM reminders WHERE is_active = 1 ORDER BY created_at DESC"
    );
    return reminders;
  } catch (error) {
    console.error("Error fetching reminders:", error);
    throw error;
  }
};

export const getReminderById = async (id) => {
  try {
    const database = await openDB();
    const reminder = await database.getFirstAsync(
      "SELECT * FROM reminders WHERE id = ? AND is_active = 1",
      [id]
    );
    return reminder;
  } catch (error) {
    console.error("Error fetching reminder by id:", error);
    throw error;
  }
};

export const updateReminder = async (id, reminderData) => {
  try {
    const database = await openDB();
    const { startTime, endTime, intervalValue, intervalUnit, quantity } =
      reminderData;
    const currentTimestamp = new Date().toISOString();

    await database.runAsync(
      `UPDATE reminders 
       SET start_time = ?, end_time = ?, interval_value = ?, interval_unit = ?, quantity = ?, updated_at = ?
       WHERE id = ?`,
      [
        startTime,
        endTime,
        intervalValue,
        intervalUnit,
        quantity,
        currentTimestamp,
        id,
      ]
    );

    return true;
  } catch (error) {
    console.error("Error updating reminder:", error);
    throw error;
  }
};

export const deleteReminder = async (id) => {
  try {
    const database = await openDB();

    // Cancel all notifications for this reminder
    const checkpoints = await getCheckpointsByReminderId(id);
    for (const checkpoint of checkpoints) {
      if (checkpoint.notification_id) {
        await Notifications.cancelScheduledNotificationAsync(
          checkpoint.notification_id
        );
      }
    }

    // Delete checkpoints first (cascade should handle this, but being explicit)
    await database.runAsync("DELETE FROM checkpoints WHERE reminder_id = ?", [
      id,
    ]);

    // Soft delete reminder
    const currentTimestamp = new Date().toISOString();
    await database.runAsync(
      "UPDATE reminders SET is_active = 0, updated_at = ? WHERE id = ?",
      [currentTimestamp, id]
    );

    return true;
  } catch (error) {
    console.error("Error deleting reminder:", error);
    throw error;
  }
};

// Checkpoint CRUD operations
export const createCheckpoint = async (checkpointData) => {
  try {
    const database = await openDB();
    const { reminderId, checkpointTime, notificationId } = checkpointData;

    const result = await database.runAsync(
      "INSERT INTO checkpoints (reminder_id, checkpoint_time, notification_id) VALUES (?, ?, ?)",
      [reminderId, checkpointTime, notificationId]
    );

    return result.lastInsertRowId;
  } catch (error) {
    console.error("Error creating checkpoint:", error);
    throw error;
  }
};

export const getCheckpointsByReminderId = async (reminderId) => {
  try {
    const database = await openDB();
    const checkpoints = await database.getAllAsync(
      "SELECT * FROM checkpoints WHERE reminder_id = ? ORDER BY checkpoint_time ASC",
      [reminderId]
    );
    return checkpoints;
  } catch (error) {
    console.error("Error fetching checkpoints:", error);
    throw error;
  }
};

export const updateCheckpointStatus = async (checkpointId, isCompleted) => {
  try {
    const database = await openDB();
    const completedAt = isCompleted ? new Date().toISOString() : null;

    await database.runAsync(
      "UPDATE checkpoints SET is_completed = ?, completed_at = ? WHERE id = ?",
      [isCompleted ? 1 : 0, completedAt, checkpointId]
    );

    return true;
  } catch (error) {
    console.error("Error updating checkpoint status:", error);
    throw error;
  }
};

export const deleteCheckpointsByReminderId = async (reminderId) => {
  try {
    const database = await openDB();

    // Get checkpoints to cancel notifications
    const checkpoints = await getCheckpointsByReminderId(reminderId);
    for (const checkpoint of checkpoints) {
      if (checkpoint.notification_id) {
        await Notifications.cancelScheduledNotificationAsync(
          checkpoint.notification_id
        );
      }
    }

    // Delete checkpoints
    await database.runAsync("DELETE FROM checkpoints WHERE reminder_id = ?", [
      reminderId,
    ]);

    return true;
  } catch (error) {
    console.error("Error deleting checkpoints:", error);
    throw error;
  }
};

// Utility function to get reminder with checkpoints
export const getReminderWithCheckpoints = async (reminderId) => {
  try {
    const reminder = await getReminderById(reminderId);
    if (!reminder) {
      return null;
    }

    const checkpoints = await getCheckpointsByReminderId(reminderId);

    return {
      ...reminder,
      checkpoints,
    };
  } catch (error) {
    console.error("Error fetching reminder with checkpoints:", error);
    throw error;
  }
};
