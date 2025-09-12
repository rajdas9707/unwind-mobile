# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Building and Running
```bash
# Start Expo development server
npm run start

# Run on Android device/emulator
npm run android

# Run on iOS device/simulator
npm run ios

# Run in web browser
npm run web
```

### Database Management
```bash
# Test database connection (from app/testDb.js)
npx expo start --dev-client
# Then navigate to /testDb in the app
```

## Project Architecture

### Core Framework
This is a **React Native Expo** app using:
- **Expo Router** for file-based routing
- **SQLite** (expo-sqlite) for local data storage
- **Firebase** for authentication and cloud sync
- **React Navigation** with tab-based navigation

### Centralized Database System
The app uses a sophisticated centralized database management system:

**Key Components:**
- `DatabaseProvider` - Initializes all databases on app startup
- `storage/db.js` - Centralized SQLite connection management
- `useDatabaseReady` hook - Ensures components wait for DB initialization

**Database Tables:**
- `journal` - Daily journal entries with server sync
- `mistakes` - Learning from mistakes with solutions
- `overthinking` - Thought dumping with optional solutions
- `todos` & `carried_over_todos` - Task management

**Critical Pattern:**
All components MUST use `useDatabaseReady()` before performing database operations:
```javascript
const { isReady, isLoading, error } = useDatabaseReady();
useEffect(() => {
  if (!isReady) return;
  // Database operations here
}, [isReady]);
```

### App Structure
```
app/
├── _layout.js           # Root layout with providers
├── (tabs)/             # Tab navigation screens
│   ├── index.js        # Home/dashboard
│   ├── journal.js      # Daily journaling
│   ├── overthinking.js # Thought dumping
│   ├── mistakes.js     # Mistake tracking
│   └── account.js      # User account
├── auth.js             # Authentication flow
├── onboarding.js       # First-time user setup
└── meditation.js       # Meditation features
```

### Context Architecture
The app uses a layered context system:
1. `SafeAreaProvider` (outermost)
2. `DatabaseProvider` - Manages all SQLite operations
3. `AuthProvider` - Handles Firebase authentication
4. App content (innermost)

### API Integration
- `api/client.js` - Centralized HTTP client with Firebase auth
- Offline-first approach with local SQLite storage
- Background sync when network available
- All API calls use Firebase ID tokens for authorization

### Storage Pattern
Each data type has its own storage module (`storage/*Db.js`):
- Consistent interface across all modules
- Local-first with server sync capabilities
- Proper error handling and connection management
- Database schema versioning ready

### Authentication Flow
- Firebase Auth with AsyncStorage persistence
- Email/password and social login support
- Automatic token refresh
- Protected routes based on auth state

### Development Notes
- Uses React 19.0 and React Native 0.79.5
- Expo SDK ~53
- New React Native architecture enabled (`newArchEnabled: true`)
- Tab navigation with custom styling
- Network status monitoring via `utils/networkUtils.js`

### Common Patterns
1. **Database Operations**: Always check `isReady` before DB operations
2. **API Calls**: Use `authorizedFetch` from `api/client.js`
3. **Loading States**: Show loading indicators during DB initialization
4. **Error Handling**: Graceful degradation with user feedback
5. **Offline Support**: Local storage with sync when online

### Critical Files to Understand
- `context/DatabaseProvider.js` - Database initialization and management
- `storage/db.js` - Core database connection logic
- `DATABASE_CONTEXT_README.md` - Complete database system documentation
- `api/client.js` - API communication layer
- `firebaseConfig.js` - Firebase setup and configuration