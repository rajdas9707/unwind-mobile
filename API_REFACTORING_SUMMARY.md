# API Structure Refactoring Summary

## Overview
This document summarizes the refactoring of the API structure to centralize error handling and eliminate repetitive try/catch blocks across different layers of the application.

## Problem Statement
The original codebase had repetitive try/catch blocks in multiple layers:
- **API Client** (`api/client.js`) - Had interceptors but still used try/catch in individual functions
- **Storage Layer** (`storage/journal/storage.js`) - Had try/catch blocks for each function
- **Component Layer** (`app/(tabs)/journal.js`) - Had try/catch blocks for API calls

## Solution Implemented

### 1. Centralized Error Handling in API Client

#### Enhanced Interceptors (`api/client.js`)
```javascript
// Request interceptor for authentication
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log("Failed to get auth token:", error);
    }
    return config;
  }
);

// Response interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => {
    return ApiResult.success(response.data, response.status);
  },
  (error) => {
    return Promise.resolve(handleApiError(error));
  }
);
```

#### Standardized API Results
```javascript
export const ApiResult = {
  success: (data, status = 200) => ({ success: true, data, status }),
  error: (message, status = 500, code = 'UNKNOWN_ERROR') => ({ 
    success: false, 
    error: { message, status, code } 
  })
};
```

#### Enhanced Error Handling
- **Network errors**: Proper handling for connection issues
- **Authentication errors**: Session expiration handling
- **Server errors**: 5xx status code handling
- **Client errors**: 4xx status code handling
- **Rate limiting**: 429 status code handling

### 2. Simplified API Functions

#### Before (Repetitive try/catch):
```javascript
export async function createJournalEntry({ content, date, tags, mood }) {
  try {
    const result = await authorizedFetch(`/api/journal`, {
      method: "POST",
      body,
    });
    console.log("createJournalEntry result:", result);
    if (result.status !== 201) {
      console.log(`Unexpected response status: ${result.status}`);
    }
    return result.data;
  } catch (error) {
    console.log("createJournalEntry error:", error);
  }
}
```

#### After (Clean and centralized):
```javascript
export async function createJournalEntry({ content, date, tags, mood }) {
  const body = { content, date, tags, mood };
  console.log("createJournalEntry called with:", body);

  const result = await client.post(`/api/journal`, body);
  
  if (result.success) {
    console.log("createJournalEntry result:", result.data);
    return result.data;
  } else {
    console.log("createJournalEntry error:", result.error);
    throw new Error(result.error.message);
  }
}
```

### 3. Storage Layer Simplification

#### Before (Repetitive try/catch):
```javascript
export const fetchRecentJournalEntries = async (limit = 10) => {
  try {
    const entries = await getRecentJournalEntries(limit);
    return entries.map(entry => ({
      ...entry,
      sentiment: getSentimentEmoji(entry.content),
      truncatedContent: entry.content.length > 100 
        ? entry.content.substring(0, 100) + "..."
        : entry.content
    }));
  } catch (error) {
    console.error("Error fetching recent journal entries:", error);
    throw error;
  }
};
```

#### After (Clean and focused):
```javascript
export const fetchRecentJournalEntries = async (limit = 10) => {
  const entries = await getRecentJournalEntries(limit);
  return entries.map(entry => ({
    ...entry,
    sentiment: getSentimentEmoji(entry.content),
    truncatedContent: entry.content.length > 100 
      ? entry.content.substring(0, 100) + "..."
      : entry.content
  }));
};
```

### 4. Component Layer Improvements

#### Before (Complex error handling):
```javascript
const loadEntries = async () => {
  try {
    setLoading(true);
    let loadedEntries;
    if (selectedDate) {
      loadedEntries = await fetchJournalsByDate(selectedDate);
    } else {
      loadedEntries = await fetchRecentJournalEntries(10);
    }
    setEntries(loadedEntries || []);
    await updateUnsyncedCount();
  } catch (error) {
    console.error("Error loading entries:", error);
    if (error && error.message && error.message.includes('database is locked')) {
      Alert.alert("Database Busy", "The database is currently busy. Please try again in a moment.");
    } else {
      Alert.alert("Error", "Failed to load journal entries: " + (error && error.message ? error.message : "Unknown error"));
    }
  } finally {
    setLoading(false);
  }
};
```

#### After (Simplified with centralized error handling):
```javascript
const loadEntries = async () => {
  setLoading(true);
  
  try {
    let loadedEntries;
    if (selectedDate) {
      loadedEntries = await fetchJournalsByDate(selectedDate);
    } else {
      loadedEntries = await fetchRecentJournalEntries(10);
    }
    
    setEntries(loadedEntries || []);
    await updateUnsyncedCount();
  } catch (error) {
    console.error("Error loading entries:", error);
    if (error && error.message && error.message.includes('database is locked')) {
      Alert.alert("Database Busy", "The database is currently busy. Please try again in a moment.");
    } else {
      Alert.alert("Error", "Failed to load journal entries: " + (error && error.message ? error.message : "Unknown error"));
    }
  } finally {
    setLoading(false);
  }
};
```

### 5. Error Handling Utilities

Created `utils/errorHandler.js` with:
- **ErrorTypes**: Standardized error categories
- **handleError**: Centralized error handling with user-friendly messages
- **withErrorHandling**: Wrapper for async functions
- **handleApiError**: Specific API error handling
- **handleDatabaseError**: Database-specific error handling

## Benefits Achieved

### 1. **Reduced Code Duplication**
- Eliminated repetitive try/catch blocks across all layers
- Centralized error handling logic in interceptors
- Consistent error response format

### 2. **Improved Maintainability**
- Single point of error handling configuration
- Easy to modify error messages and behavior
- Consistent user experience across the app

### 3. **Better Error Handling**
- Comprehensive error categorization
- User-friendly error messages
- Proper handling of network, auth, and server errors

### 4. **Cleaner Code Structure**
- API functions are now focused on business logic
- Storage layer functions are simpler and cleaner
- Component layer has minimal error handling boilerplate

### 5. **Enhanced Developer Experience**
- Easier to debug with centralized logging
- Consistent error handling patterns
- Better separation of concerns

## Files Modified

1. **`api/client.js`** - Centralized error handling with interceptors
2. **`storage/journal/storage.js`** - Removed repetitive try/catch blocks
3. **`app/(tabs)/journal.js`** - Simplified error handling in components
4. **`utils/errorHandler.js`** - New utility for error handling (created)

## Migration Guide

### For New API Functions
```javascript
// Use the new pattern
export async function newApiFunction(params) {
  const result = await client.post('/api/endpoint', params);
  
  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error.message);
  }
}
```

### For Storage Functions
```javascript
// Remove try/catch blocks - let errors bubble up
export const newStorageFunction = async (params) => {
  const data = await databaseOperation(params);
  return processData(data);
};
```

### For Components
```javascript
// Minimal error handling - let centralized system handle it
const handleAction = async () => {
  try {
    const result = await apiFunction();
    // Handle success
  } catch (error) {
    // Only handle specific UI-related errors
    console.error("Action failed:", error);
  }
};
```

## Testing Recommendations

1. **Test network error scenarios** - Disconnect internet and verify error messages
2. **Test authentication errors** - Expire tokens and verify re-authentication flow
3. **Test server errors** - Mock 5xx responses and verify error handling
4. **Test database errors** - Simulate database locks and verify retry mechanisms

## Future Enhancements

1. **Error Analytics** - Track error types and frequencies
2. **Retry Logic** - Implement automatic retry for transient errors
3. **Offline Support** - Enhanced offline error handling
4. **Error Recovery** - Automatic recovery mechanisms for common errors

This refactoring provides a solid foundation for maintainable, scalable error handling across the entire application.
