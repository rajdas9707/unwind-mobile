import { Alert } from "react-native";
import * as db from "./db";
import { useNetworkStatus } from "../../utils/networkUtils";

// Business logic and validation layer for todo entries

// Predefined categories for todos
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

// Validate todo entry content
const validateTodoEntry = (title, description = "", category = "2-Minute", priority = "medium") => {
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    throw new Error("Todo title is required and cannot be empty");
  }
  
  if (title.trim().length > 200) {
    throw new Error("Todo title must be less than 200 characters");
  }
  
  if (description && description.length > 1000) {
    throw new Error("Description must be less than 1000 characters");
  }
  
  // Validate category
  if (!TODO_CATEGORIES.includes(category)) {
    category = "2-Minute"; // Default to 2-Minute if invalid
  }
  
  // Validate priority
  const validPriorities = ["low", "medium", "high"];
  if (!validPriorities.includes(priority)) {
    priority = "medium"; // Default to medium if invalid
  }
  
  return {
    title: title.trim(),
    description: description?.trim() || "",
    category,
    priority
  };
};

// Get category color
export const getCategoryColor = (category) => {
  const colors = {
    "2-Minute": "#10B981",
    "Urgent": "#EF4444", 
    "Important": "#8B5CF6",
    "Low Energy": "#3B82F6"
  };
  return colors[category] || "#10B981";
};

// Get priority emoji
const getPriorityEmoji = (priority) => {
  const emojis = {
    "low": "🟢",
    "medium": "🟡", 
    "high": "🔴"
  };
  return emojis[priority] || "🟡";
};

// Get category emoji for UI display
export const getCategoryEmoji = (category) => {
  const emojis = {
    "2-Minute": "⚡",
    "Urgent": "🚨",
    "Important": "⭐", 
    "Low Energy": "😴"
  };
  return emojis[category] || "⚡";
};

// Create new todo entry with validation
export const createTodoEntryLocal = async ({ title, description, category, priority }) => {
  try {
    // Validate input
    const validatedData = validateTodoEntry(title, description, category, priority);
    
    // Check daily limit (10 todos per day)
    const today = new Date().toISOString().split('T')[0];
    const todayCount = await db.getTodoEntriesCountForDate(today);
    
    if (todayCount >= 10) {
      throw new Error("You can only create 10 todos per day. Try again tomorrow!");
    }
    
    // Create timestamps
    const now = new Date().toISOString();
    console.log("Creating todo with timestamp:", now);
    
    // Insert locally first
    const localEntry = await db.insertTodoEntry({
      title: validatedData.title,
      description: validatedData.description,
      category: validatedData.category,
      priority: validatedData.priority,
      due_date: null,
      created_at: now,
      updated_at: now
    });
    
    console.log("Created todo entry:", localEntry);
    
    return {
      ...localEntry,
      priorityEmoji: getPriorityEmoji(validatedData.priority),
      categoryEmoji: getCategoryEmoji(validatedData.category)
    };
  } catch (error) {
    console.error("Error creating todo entry:", error);
    throw error;
  }
};

// Fetch recent todo entries with emojis
export const fetchRecentTodoEntries = async (limit = 10) => {
  try {
    const entries = await db.getRecentTodoEntries(limit);
    
    return entries.map(entry => ({
      ...entry,
      priorityEmoji: getPriorityEmoji(entry.priority),
      categoryEmoji: getCategoryEmoji(entry.category),
      truncatedTitle: entry.title.length > 50 
        ? entry.title.substring(0, 50) + "..."
        : entry.title
    }));
  } catch (error) {
    console.error("Error fetching recent todo entries:", error);
    throw error;
  }
};

// Fetch todos by category with emojis
export const fetchTodosByCategory = async (category) => {
  try {
    const entries = await db.getTodosByCategory(category);
    
    console.log("Raw entries from database:", entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      created_at: entry.created_at,
      updated_at: entry.updated_at
    })));
    
    return entries.map(entry => ({
      ...entry,
      priorityEmoji: getPriorityEmoji(entry.priority),
      categoryEmoji: getCategoryEmoji(entry.category),
      truncatedTitle: entry.title.length > 50 
        ? entry.title.substring(0, 50) + "..."
        : entry.title
    }));
  } catch (error) {
    console.error("Error fetching todos by category:", error);
    throw error;
  }
};

// Fetch carried over todos by category with emojis
export const fetchCarriedOverTodosByCategory = async (category) => {
  try {
    const entries = await db.getCarriedOverTodosByCategory(category);
    
    console.log("Raw carried-over entries from database:", entries.map(entry => ({
      id: entry.id,
      title: entry.title,
      carried_over_at: entry.carried_over_at,
      original_created_at: entry.original_created_at
    })));
    
    return entries.map(entry => ({
      ...entry,
      priorityEmoji: getPriorityEmoji(entry.priority),
      categoryEmoji: getCategoryEmoji(entry.category),
      truncatedTitle: entry.title.length > 50 
        ? entry.title.substring(0, 50) + "..."
        : entry.title
    }));
  } catch (error) {
    console.error("Error fetching carried over todos by category:", error);
    throw error;
  }
};

// Get single todo entry by ID
export const fetchTodoEntryById = async (id) => {
  try {
    const entry = await db.getTodoEntryById(id);
    
    if (!entry) return null;
    
    return {
      ...entry,
      priorityEmoji: getPriorityEmoji(entry.priority),
      categoryEmoji: getCategoryEmoji(entry.category)
    };
  } catch (error) {
    console.error("Error fetching todo entry by ID:", error);
    throw error;
  }
};

// Update todo entry with validation
export const updateTodoEntryLocal = async ({ id, title, description, category, priority }) => {
  try {
    // Validate input
    const validatedData = validateTodoEntry(title, description, category, priority);
    
    const updatedEntry = await db.updateTodoEntry({
      id,
      title: validatedData.title,
      description: validatedData.description,
      category: validatedData.category,
      priority: validatedData.priority,
      due_date: null,
      updated_at: new Date().toISOString()
    });
    
    return {
      ...updatedEntry,
      priorityEmoji: getPriorityEmoji(validatedData.priority),
      categoryEmoji: getCategoryEmoji(validatedData.category)
    };
  } catch (error) {
    console.error("Error updating todo entry:", error);
    throw error;
  }
};

// Toggle todo completion status
export const toggleTodoCompleteLocal = async ({ id, completed }) => {
  try {
    const updatedEntry = await db.toggleTodoComplete({ 
      id, 
      completed, 
      updated_at: new Date().toISOString() 
    });
    
    return {
      ...updatedEntry,
      priorityEmoji: getPriorityEmoji(updatedEntry.priority),
      categoryEmoji: getCategoryEmoji(updatedEntry.category)
    };
  } catch (error) {
    console.error("Error toggling todo completion:", error);
    throw error;
  }
};

// Toggle carried-over completion status
export const toggleCarriedOverCompleteLocal = async ({ id, completed }) => {
  try {
    const updatedEntry = await db.toggleCarriedOverComplete({ 
      id, 
      completed, 
      updated_at: new Date().toISOString() 
    });
    return {
      ...updatedEntry,
      priorityEmoji: getPriorityEmoji(updatedEntry.priority),
      categoryEmoji: getCategoryEmoji(updatedEntry.category)
    };
  } catch (error) {
    console.error("Error toggling carried over completion:", error);
    throw error;
  }
};

// Move task to carried over
export const moveTaskToCarriedOverLocal = async (taskId) => {
  try {
    const result = await db.moveTaskToCarriedOver(taskId);
    return result;
  } catch (error) {
    console.error("Error moving task to carried over:", error);
    throw error;
  }
};

// Delete todo entry locally
export const deleteTodoEntryLocal = async (id) => {
  try {
    console.log("deleteTodoEntryLocal called with ID:", id);
    console.log("ID type:", typeof id);
    
    const result = await db.deleteTodoEntryById(id);
    console.log("deleteTodoEntryById result:", result);
    
    return true;
  } catch (error) {
    console.error("Error deleting todo entry:", error);
    throw error;
  }
};

// Get unsynced entries count
export const getUnsyncedTodoCount = async () => {
  try {
    const unsyncedEntries = await db.getUnsyncedTodoEntries();
    return unsyncedEntries.length;
  } catch (error) {
    console.error("Error getting unsynced todo count:", error);
    return 0;
  }
};

// Check if user can create more entries today
export const canCreateTodoToday = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const todayCount = await db.getTodoEntriesCountForDate(today);
    return todayCount < 10;
  } catch (error) {
    console.error("Error checking daily todo limit:", error);
    return false;
  }
};

// Check if user can sync today
export const canSyncTodosToday = async () => {
  try {
    const todaySyncCount = await db.getTodoSyncAttemptsCountToday();
    return todaySyncCount < 3;
  } catch (error) {
    console.error("Error checking todo sync limit:", error);
    return false;
  }
};

// Perform daily cleanup
export const performDailyCleanupLocal = async () => {
  try {
    const movedCount = await db.performDailyCleanup();
    return movedCount;
  } catch (error) {
    console.error("Error during daily cleanup:", error);
    throw error;
  }
};