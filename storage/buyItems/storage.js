import { Alert } from "react-native";
import * as database from "./db.js";

export function validateListName(name) {
  if (!name || typeof name !== "string") {
    return { isValid: false, error: "List name is required" };
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { isValid: false, error: "List name cannot be empty" };
  }

  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: "List name is too long (max 100 characters)",
    };
  }

  return { isValid: true, name: trimmedName };
}

function validateItemName(name) {
  if (!name || typeof name !== "string") {
    return { isValid: false, error: "Item name is required" };
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    return { isValid: false, error: "Item name cannot be empty" };
  }

  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: "Item name is too long (max 100 characters)",
    };
  }

  return { isValid: true, name: trimmedName };
}

export function validateLocation(location) {
  if (!location) {
    return { isValid: true, location: "" };
  }

  if (typeof location !== "string") {
    return { isValid: false, error: "Location must be text" };
  }

  const trimmedLocation = location.trim();
  if (trimmedLocation.length > 100) {
    return {
      isValid: false,
      error: "Location is too long (max 100 characters)",
    };
  }

  return { isValid: true, location: trimmedLocation };
}

// Error handling helper
export function handleError(
  error,
  defaultMessage = "An unexpected error occurred"
) {
  console.error("BuyItemsStorage Error:", error);

  let message = defaultMessage;
  if (error?.message) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  Alert.alert("Error", message);
  throw error;
}

// Shopping Lists operations
export async function createList(name) {
  try {
    const validation = validateListName(name);
    if (!validation.isValid) {
      handleError(validation.error, validation.error);
      return null;
    }

    const listId = await database.createList(validation.name);
    return listId;
  } catch (error) {
    handleError(error, "Failed to create shopping list");
    return null;
  }
}

export async function getAllLists() {
  try {
    const lists = await database.getAllLists();
    return lists || [];
  } catch (error) {
    handleError(error, "Failed to load shopping lists");
    return [];
  }
}

export async function getListById(listId) {
  try {
    if (!listId || !Number.isInteger(Number(listId))) {
      handleError("Invalid list ID", "Invalid list ID");
      return null;
    }

    const list = await database.getListById(listId);
    return list;
  } catch (error) {
    handleError(error, "Failed to load shopping list");
    return null;
  }
}

export async function updateList(listId, name) {
  try {
    if (!listId || !Number.isInteger(Number(listId))) {
      handleError("Invalid list ID", "Invalid list ID");
      return false;
    }

    const validation = validateListName(name);
    if (!validation.isValid) {
      handleError(validation.error, validation.error);
      return false;
    }

    await database.updateList(listId, validation.name);
    return true;
  } catch (error) {
    handleError(error, "Failed to update shopping list");
    return false;
  }
}

export async function deleteList(listId) {
  try {
    if (!listId || !Number.isInteger(Number(listId))) {
      handleError("Invalid list ID", "Invalid list ID");
      return false;
    }

    return new Promise((resolve) => {
      Alert.alert(
        "Delete List",
        "Are you sure you want to delete this shopping list? All items will be removed.",
        [
          {
            text: "Cancel",
            onPress: () => resolve(false),
            style: "cancel",
          },
          {
            text: "Delete",
            onPress: async () => {
              try {
                await database.deleteList(listId);
                resolve(true);
              } catch (error) {
                handleError(error, "Failed to delete shopping list");
                resolve(false);
              }
            },
            style: "destructive",
          },
        ]
      );
    });
  } catch (error) {
    handleError(error, "Failed to delete shopping list");
    return false;
  }
}

// Shopping Items operations
export async function createItem(listId, name, location = "") {
  try {
    if (!listId || !Number.isInteger(Number(listId))) {
      handleError("Invalid list ID", "Invalid list ID");
      return null;
    }

    const nameValidation = validateItemName(name);
    if (!nameValidation.isValid) {
      handleError(nameValidation.error, nameValidation.error);
      return null;
    }

    const locationValidation = validateLocation(location);
    if (!locationValidation.isValid) {
      handleError(locationValidation.error, locationValidation.error);
      return null;
    }

    const itemId = await database.createItem(
      listId,
      nameValidation.name,
      locationValidation.location
    );
    return itemId;
  } catch (error) {
    handleError(error, "Failed to create shopping item");
    return null;
  }
}

export async function getItemsByListId(listId) {
  try {
    if (!listId || !Number.isInteger(Number(listId))) {
      handleError("Invalid list ID", "Invalid list ID");
      return [];
    }

    const items = await database.getItemsByListId(listId);
    return items || [];
  } catch (error) {
    handleError(error, "Failed to load shopping items");
    return [];
  }
}

export async function getItemById(itemId) {
  try {
    if (!itemId || !Number.isInteger(Number(itemId))) {
      handleError("Invalid item ID", "Invalid item ID");
      return null;
    }

    const item = await database.getItemById(itemId);
    return item;
  } catch (error) {
    handleError(error, "Failed to load shopping item");
    return null;
  }
}

export async function updateItem(itemId, name, location = "") {
  try {
    if (!itemId || !Number.isInteger(Number(itemId))) {
      handleError("Invalid item ID", "Invalid item ID");
      return false;
    }

    const nameValidation = validateItemName(name);
    if (!nameValidation.isValid) {
      handleError(nameValidation.error, nameValidation.error);
      return false;
    }

    const locationValidation = validateLocation(location);
    if (!locationValidation.isValid) {
      handleError(locationValidation.error, locationValidation.error);
      return false;
    }

    await database.updateItem(
      itemId,
      nameValidation.name,
      locationValidation.location
    );
    return true;
  } catch (error) {
    handleError(error, "Failed to update shopping item");
    return false;
  }
}

export async function toggleItemBought(itemId) {
  try {
    if (!itemId || !Number.isInteger(Number(itemId))) {
      handleError("Invalid item ID", "Invalid item ID");
      return false;
    }

    await database.toggleItemBought(itemId);
    return true;
  } catch (error) {
    handleError(error, "Failed to update item status");
    return false;
  }
}

export async function deleteItem(itemId) {
  try {
    if (!itemId || !Number.isInteger(Number(itemId))) {
      handleError("Invalid item ID", "Invalid item ID");
      return false;
    }

    return new Promise((resolve) => {
      Alert.alert("Delete Item", "Are you sure you want to delete this item?", [
        {
          text: "Cancel",
          onPress: () => resolve(false),
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await database.deleteItem(itemId);
              resolve(true);
            } catch (error) {
              handleError(error, "Failed to delete shopping item");
              resolve(false);
            }
          },
          style: "destructive",
        },
      ]);
    });
  } catch (error) {
    handleError(error, "Failed to delete shopping item");
    return false;
  }
}

// Utility functions
export async function clearAllData() {
  try {
    return new Promise((resolve) => {
      Alert.alert(
        "Clear All Data",
        "Are you sure you want to delete all shopping lists and items? This action cannot be undone.",
        [
          {
            text: "Cancel",
            onPress: () => resolve(false),
            style: "cancel",
          },
          {
            text: "Clear All",
            onPress: async () => {
              try {
                await database.clearAllData();
                resolve(true);
              } catch (error) {
                handleError(error, "Failed to clear all data");
                resolve(false);
              }
            },
            style: "destructive",
          },
        ]
      );
    });
  } catch (error) {
    handleError(error, "Failed to clear all data");
    return false;
  }
}

// Helper function to get today's date as default list name

export function getDefaultListName() {
  const today = new Date();
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return `Shopping List - ${today.toLocaleDateString("en-US", options)}`;
}

// Format date for display
export function formatDate(dateString) {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      });
    }
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString;
  }
}

// Calculate completion percentage for a list
export function calculateCompletionPercentage(totalItems, boughtItems) {
  if (totalItems === 0) return 0;
  return Math.round((boughtItems / totalItems) * 100);
}
