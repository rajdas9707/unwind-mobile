import { Alert } from "react-native";
import * as db from "./db";
import * as Notifications from "expo-notifications";

// Business logic and validation layer for reminder entries

// Predefined categories for todos (same as in todo storage)
const TODO_CATEGORIES = [
  "2-Minute",
  "Urgent", 
  "Important",
  "Low Energy"
];

// Helper function to get all available categories
export const getTodoCategories = () => {
  return TODO_CATEGORIES;
};

// Validate reminder entry content
const validateReminderEntry = (name, description = "", datetime, todo_category = null) => {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Reminder name is required and cannot be empty");
  }
  
  if (name.trim().length > 200) {
    throw new Error("Reminder name must be less than 200 characters");
  }
  
  if (description && description.length > 1000) {
    throw new Error("Description must be less than 1000 characters");
  }
  
  if (!datetime) {
    throw new Error("Reminder datetime is required");
  }
  
  const reminderDate = new Date(datetime);
  if (isNaN(reminderDate.getTime())) {
    throw new Error("Invalid datetime format");
  }
  
  // Validate todo_category if provided
  if (todo_category && !TODO_CATEGORIES.includes(todo_category)) {
    todo_category = "Urgent"; // Default to Urgent if invalid
  }
  
  return {
    name: name.trim(),
    description: description?.trim() || "",
    datetime,
    todo_category
  };
};

// Request notification permissions
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      throw new Error('Notification permissions not granted');
    }
    
    return finalStatus === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    throw error;
  }
};

// Schedule notification for reminder
export const scheduleReminderNotification = async (reminderData) => {
  try {
    const { name, description, datetime } = reminderData;
    const reminderDate = new Date(datetime);
    
    // Only schedule if the reminder is in the future
    if (reminderDate > new Date()) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: name,
          body: description || "Reminder!",
          data: { type: 'reminder' },
        },
        trigger: reminderDate,
      });
      
      return notificationId;
    }
    
    return null;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
};

// Create new reminder entry with validation and notification
export const createReminderEntryLocal = async ({ 
  name, 
  description, 
  datetime, 
  todo_id = null, 
  todo_category = null 
}) => {
  try {
    // Validate input
    const validatedData = validateReminderEntry(name, description, datetime, todo_category);
    
    // Request notification permissions
    await requestNotificationPermissions();
    
    // Schedule notification
    const notificationId = await scheduleReminderNotification({
      name: validatedData.name,
      description: validatedData.description,
      datetime: validatedData.datetime
    });
    
    // Create timestamps
    const now = new Date().toISOString();
    
    // Insert locally first
    const localEntry = await db.insertReminderEntry({
      name: validatedData.name,
      description: validatedData.description,
      datetime: validatedData.datetime,
      todo_id,
      todo_category: validatedData.todo_category,
      notification_id: notificationId,
      created_at: now,
      updated_at: now
    });
    
    console.log("Created reminder entry:", localEntry);
    
    return localEntry;
  } catch (error) {
    console.error("Error creating reminder entry:", error);
    throw error;
  }
};

// Create reminder from todo (when editing todo)
export const createReminderFromTodo = async (todoData, datetime) => {
  try {
    const reminderData = {
      name: todoData.title,
      description: todoData.description || "",
      datetime,
      todo_id: todoData.id,
      todo_category: todoData.category
    };
    
    return await createReminderEntryLocal(reminderData);
  } catch (error) {
    console.error("Error creating reminder from todo:", error);
    throw error;
  }
};

// Fetch all reminders
export const fetchAllReminders = async () => {
  try {
    const reminders = await db.getAllReminders();
    return reminders;
  } catch (error) {
    console.error("Error fetching all reminders:", error);
    throw error;
  }
};

// Fetch reminders by todo ID
export const fetchRemindersByTodoId = async (todo_id) => {
  try {
    const reminders = await db.getRemindersByTodoId(todo_id);
    return reminders;
  } catch (error) {
    console.error("Error fetching reminders by todo ID:", error);
    throw error;
  }
};

// Get single reminder by ID
export const fetchReminderById = async (id) => {
  try {
    const reminder = await db.getReminderById(id);
    return reminder;
  } catch (error) {
    console.error("Error fetching reminder by ID:", error);
    throw error;
  }
};

// Update reminder entry with validation
export const updateReminderEntryLocal = async ({ 
  id, 
  name, 
  description, 
  datetime, 
  todo_id, 
  todo_category 
}) => {
  try {
    // Validate input
    const validatedData = validateReminderEntry(name, description, datetime, todo_category);
    
    // Schedule new notification if datetime changed
    let notificationId = null;
    if (datetime) {
      notificationId = await scheduleReminderNotification({
        name: validatedData.name,
        description: validatedData.description,
        datetime: validatedData.datetime
      });
    }
    
    const updatedEntry = await db.updateReminderEntry({
      id,
      name: validatedData.name,
      description: validatedData.description,
      datetime: validatedData.datetime,
      todo_id,
      todo_category: validatedData.todo_category,
      notification_id: notificationId,
      updated_at: new Date().toISOString()
    });
    
    return updatedEntry;
  } catch (error) {
    console.error("Error updating reminder entry:", error);
    throw error;
  }
};

// Delete reminder entry locally
export const deleteReminderEntryLocal = async (id) => {
  try {
    const result = await db.deleteReminderEntryById(id);
    return result;
  } catch (error) {
    console.error("Error deleting reminder entry:", error);
    throw error;
  }
};

// Get unsynced entries count
export const getUnsyncedReminderCount = async () => {
  try {
    const unsyncedEntries = await db.getUnsyncedReminderEntries();
    return unsyncedEntries.length;
  } catch (error) {
    console.error("Error getting unsynced reminder count:", error);
    return 0;
  }
};
