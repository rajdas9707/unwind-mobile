// Centralized categories configuration
// Add or remove categories here to update them across the app

export const CATEGORIES = [
  "All",
  "Bank", 
  "Work",
  "Personal",
  "ID",
  "Medical",
  "Legal",
  "Education",
  "Travel",
  "Insurance"
];

// Default category for new documents
export const DEFAULT_CATEGORY = "Personal";

// Get categories excluding "All" for form selection
export const getFormCategories = () => {
  return CATEGORIES.filter(category => category !== "All");
};

// Validate if a category exists
export const isValidCategory = (category) => {
  return CATEGORIES.includes(category);
};
