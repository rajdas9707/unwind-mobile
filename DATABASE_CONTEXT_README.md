# Database Context System

This document describes the centralized database management system for the Unwind mobile app.

## Overview

The database context system provides a centralized way to initialize and manage SQLite database connections across the entire app. It ensures that all database tables (journal, mistakes, overthinking, and todo) are properly initialized before the app becomes interactive.

## Architecture

### Core Components

1. **DatabaseProvider** (`context/DatabaseProvider.js`)
   - Main context provider that initializes all database tables
   - Manages database connection state
   - Provides loading and error states
   - Handles database reconnection logic

2. **Centralized Database Connection** (`storage/db.js`)
   - Single source of truth for database connections
   - Handles connection pooling and reconnection
   - Provides connection testing utilities

3. **Database Loading Screen** (`components/DatabaseLoadingScreen.js`)
   - Shows during database initialization
   - Displays error messages if initialization fails
   - Provides user-friendly feedback

4. **Database Ready Hook** (`hooks/useDatabaseReady.js`)
   - Custom hook for components to check database readiness
   - Provides loading and error states
   - Ensures components wait for database initialization

## Database Tables

The system initializes the following tables:

### Journal Table
```sql
CREATE TABLE journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  synced INTEGER NOT NULL DEFAULT 0
);
```

### Mistakes Table
```sql
CREATE TABLE mistakes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT,
  date TEXT NOT NULL,
  mistake TEXT NOT NULL,
  solution TEXT NOT NULL,
  category TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  avoided INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0
);
```

### Overthinking Table
```sql
CREATE TABLE overthinking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT,
  date TEXT NOT NULL,
  thought TEXT NOT NULL,
  solution TEXT,
  timestamp TEXT NOT NULL,
  dumped INTEGER NOT NULL DEFAULT 0,
  synced INTEGER NOT NULL DEFAULT 0
);
```

### Todo Tables
```sql
CREATE TABLE todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE carried_over_todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_task_id INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  completed INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  original_created_at TEXT NOT NULL,
  carried_over_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (original_task_id) REFERENCES todos(id)
);
```

## Usage

### 1. App Setup

The `DatabaseProvider` is automatically included in the main app layout:

```javascript
// app/_layout.js
import { DatabaseProvider } from "../context/DatabaseProvider";
import { AuthProvider } from "../context/AuthProvider";

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <AuthProvider>
        {/* Your app content */}
      </AuthProvider>
    </DatabaseProvider>
  );
}
```

### 2. Using in Components

Components can use the `useDatabaseReady` hook to ensure the database is ready:

```javascript
import { useDatabaseReady } from "../../hooks/useDatabaseReady";

export default function MyComponent() {
  const { isReady, isLoading, error } = useDatabaseReady();
  
  useEffect(() => {
    if (!isReady) return;
    
    // Perform database operations here
    loadData();
  }, [isReady]);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return <ErrorMessage error={error} />;
  }
  
  // Your component content
}
```

### 3. Direct Database Access

For advanced use cases, you can access the database context directly:

```javascript
import { useDatabase } from "../context/DatabaseProvider";

export default function AdvancedComponent() {
  const { getDb, testDatabaseConnection, forceReconnect } = useDatabase();
  
  const performCustomOperation = async () => {
    const db = await getDb();
    // Custom database operations
  };
}
```

## Error Handling

The system provides comprehensive error handling:

1. **Initialization Errors**: Displayed in the loading screen
2. **Connection Errors**: Automatic reconnection attempts
3. **Component-Level Errors**: Components can handle their own database errors

## Migration from Old System

The following changes were made to migrate from the old system:

1. **Removed Individual Init Calls**: Components no longer call `initJournalDb()`, `initMistakesDb()`, etc.
2. **Centralized Connection**: All database operations use the centralized `getDb()` function
3. **Loading States**: Components wait for database readiness before performing operations
4. **Error Boundaries**: Better error handling and user feedback

## Best Practices

1. **Always Check Database Readiness**: Use `useDatabaseReady()` before performing database operations
2. **Handle Loading States**: Show appropriate loading indicators while database is initializing
3. **Error Handling**: Provide user-friendly error messages for database failures
4. **Connection Management**: Let the context handle connection pooling and reconnection

## Troubleshooting

### Common Issues

1. **Database Not Initialized**: Ensure `DatabaseProvider` wraps your app
2. **Connection Errors**: Check if SQLite is properly configured
3. **Performance Issues**: Database operations are now centralized and optimized

### Debug Commands

```javascript
// Test database connection
const { testDatabaseConnection } = useDatabase();
const isConnected = await testDatabaseConnection();

// Force reconnection
const { forceReconnect } = useDatabase();
await forceReconnect();
```

## Future Enhancements

1. **Database Migrations**: Version-based schema updates
2. **Backup/Restore**: User data backup functionality
3. **Offline Sync**: Enhanced offline-first capabilities
4. **Performance Monitoring**: Database performance metrics
