// Centralized error handling utilities
import { Alert } from "react-native";

// Error types for consistent handling
export const ErrorTypes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

// Error handler that provides consistent user feedback
export const handleError = (error, context = '') => {
  console.error(`Error in ${context}:`, error);
  
  // Extract error message
  const message = error?.message || error?.error?.message || 'An unexpected error occurred';
  
  // Determine error type for specific handling
  let errorType = ErrorTypes.UNKNOWN_ERROR;
  
  if (message.includes('network') || message.includes('connection')) {
    errorType = ErrorTypes.NETWORK_ERROR;
  } else if (message.includes('auth') || message.includes('unauthorized')) {
    errorType = ErrorTypes.AUTH_ERROR;
  } else if (message.includes('validation') || message.includes('invalid')) {
    errorType = ErrorTypes.VALIDATION_ERROR;
  } else if (message.includes('database') || message.includes('locked')) {
    errorType = ErrorTypes.DATABASE_ERROR;
  } else if (message.includes('server')) {
    errorType = ErrorTypes.SERVER_ERROR;
  }
  
  // Show appropriate alert based on error type
  switch (errorType) {
    case ErrorTypes.NETWORK_ERROR:
      Alert.alert(
        "Connection Error",
        "Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
      break;
      
    case ErrorTypes.AUTH_ERROR:
      Alert.alert(
        "Authentication Error",
        "Your session has expired. Please log in again.",
        [{ text: "OK" }]
      );
      break;
      
    case ErrorTypes.VALIDATION_ERROR:
      Alert.alert(
        "Invalid Input",
        message,
        [{ text: "OK" }]
      );
      break;
      
    case ErrorTypes.DATABASE_ERROR:
      Alert.alert(
        "Database Error",
        "The database is currently busy. Please try again in a moment.",
        [{ text: "Retry", onPress: () => window.location.reload() }]
      );
      break;
      
    case ErrorTypes.SERVER_ERROR:
      Alert.alert(
        "Server Error",
        "Something went wrong on the server. Please try again later.",
        [{ text: "OK" }]
      );
      break;
      
    default:
      Alert.alert(
        "Error",
        message,
        [{ text: "OK" }]
      );
  }
  
  return { errorType, message };
};

// Wrapper for async functions with centralized error handling
export const withErrorHandling = (asyncFn, context = '') => {
  return async (...args) => {
    try {
      return await asyncFn(...args);
    } catch (error) {
      handleError(error, context);
      throw error; // Re-throw for caller to handle if needed
    }
  };
};

// Specific error handlers for common scenarios
export const handleApiError = (error) => {
  if (error?.response?.status === 401) {
    return {
      type: ErrorTypes.AUTH_ERROR,
      message: 'Your session has expired. Please log in again.'
    };
  }
  
  if (error?.response?.status >= 500) {
    return {
      type: ErrorTypes.SERVER_ERROR,
      message: 'Server error. Please try again later.'
    };
  }
  
  if (!error?.response) {
    return {
      type: ErrorTypes.NETWORK_ERROR,
      message: 'Cannot reach the server. Please check your connection.'
    };
  }
  
  return {
    type: ErrorTypes.UNKNOWN_ERROR,
    message: error?.response?.data?.message || error?.message || 'An error occurred'
  };
};

// Database error handler
export const handleDatabaseError = (error) => {
  if (error?.message?.includes('database is locked')) {
    return {
      type: ErrorTypes.DATABASE_ERROR,
      message: 'Database is busy. Please try again in a moment.'
    };
  }
  
  return {
    type: ErrorTypes.DATABASE_ERROR,
    message: 'Database error occurred.'
  };
};
