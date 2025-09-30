import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const SYNC_SETTINGS_KEY = "dataSyncSettings";

export const getSyncSettings = async () => {
  try {
    const storedSettings = await AsyncStorage.getItem(SYNC_SETTINGS_KEY);
    if (storedSettings) {
      return JSON.parse(storedSettings);
    }
    return { dataSyncEnabled: true, lastSyncDate: null };
  } catch (error) {
    console.error("Error loading sync settings:", error);
    return { dataSyncEnabled: true, lastSyncDate: null };
  }
};

export const isSyncEnabled = async () => {
  const settings = await getSyncSettings();
  return settings.dataSyncEnabled;
};

export const setSyncSettings = async (newSettings) => {
  try {
    await AsyncStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(newSettings));
    return true;
  } catch (error) {
    console.error("Error saving sync settings:", error);
    return false;
  }
};

export const enableDataSync = async () => {
  try {
    const currentSettings = await getSyncSettings();
    const newSettings = {
      ...currentSettings,
      dataSyncEnabled: true,
      lastSyncDate: new Date().toISOString(),
    };
    
    const success = await setSyncSettings(newSettings);
    if (success) {
      return newSettings;
    }
    return null;
  } catch (error) {
    console.error("Error enabling sync:", error);
    return null;
  }
};

export const showSyncDisabledAlert = (action = "sync data", onSyncEnabled = null) => {
  Alert.alert(
    "🚫 Data Sync Disabled",
    `Cannot ${action} because cloud data sync is currently disabled.\n\nEnabling sync will allow your data to be safely backed up to our secure cloud servers and accessible across your devices.`,
    [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Go to Settings",
        onPress: () => {
          router.push("/settings/privacy");
        },
      },
      {
        text: "Enable Sync Now",
        style: "default",
        onPress: async () => {
          const result = await enableDataSync();
          if (result) {
            Alert.alert(
              "✅ Data Sync Enabled!",
              "Your data will now sync to secure cloud servers. This helps keep your data safe and accessible across devices.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    if (onSyncEnabled) {
                      onSyncEnabled();
                    }
                  },
                },
              ]
            );
          } else {
            Alert.alert(
              "Error",
              "Failed to enable data sync. Please try again or check your settings."
            );
          }
        },
      },
    ]
  );
};

export const showSyncEnabledAlert = () => {
  Alert.alert(
    "Data Sync Enabled",
    "Your data will now sync to secure cloud servers. This helps keep your data safe and accessible across devices."
  );
};

// Handle API errors related to sync
export const handleSyncError = (error, defaultAction = "perform this action", onSyncEnabled = null) => {
  if (error?.message?.includes("Data sync is disabled")) {
    showSyncDisabledAlert(defaultAction, onSyncEnabled);
    return true; // Handled
  }
  return false; // Not handled
};

// Update sync timestamp
export const updateLastSyncDate = async () => {
  try {
    const settings = await getSyncSettings();
    const updatedSettings = {
      ...settings,
      lastSyncDate: new Date().toISOString(),
    };
    await AsyncStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(updatedSettings));
  } catch (error) {
    console.error("Error updating sync date:", error);
  }
};

// Check sync before performing action
export const checkSyncBeforeAction = async (actionName, onProceed) => {
  const syncEnabled = await isSyncEnabled();
  
  if (!syncEnabled) {
    showSyncDisabledAlert(actionName, onProceed);
    return false;
  }
  
  if (onProceed) {
    onProceed();
  }
  return true;
};

// Utility to retry API calls with sync checking
export const retryWithSyncCheck = async (apiCall, actionDescription, onSuccess = null, onError = null) => {
  const attemptCall = async () => {
    try {
      const result = await apiCall();
      if (onSuccess) {
        onSuccess(result);
      }
      return result;
    } catch (error) {
      const handled = handleSyncError(error, actionDescription, attemptCall);
      if (!handled && onError) {
        onError(error);
      } else if (!handled) {
        throw error; // Re-throw if not a sync error and no custom handler
      }
    }
  };
  
  return await attemptCall();
};
