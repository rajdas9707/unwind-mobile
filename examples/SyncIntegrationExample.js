// Example of how to integrate sync checking in your components

import React from "react";
import { TouchableOpacity, Text, Alert } from "react-native";
import { checkSyncBeforeAction, handleSyncError, retryWithSyncCheck } from "../utils/syncUtils";
import { createJournalEntry } from "../api/client";

const JournalExample = () => {
  
  // Example: Check sync before manual sync action
  const handleManualSync = async () => {
    const canProceed = await checkSyncBeforeAction("sync your journal entries", async () => {
      try {
        // Perform sync action
        console.log("Syncing journal entries...");
        // Your sync logic here
      } catch (error) {
        Alert.alert("Sync Failed", "Unable to sync journal entries");
      }
    });
    
    if (!canProceed) {
      // User was shown sync disabled alert
      return;
    }
  };

  // Example: Handle API errors with sync checking and retry after enabling
  const saveJournalEntry = async (content, date, tags, mood) => {
    const attemptSave = async () => {
      try {
        const result = await createJournalEntry({ content, date, tags, mood });
        console.log("Journal entry saved:", result);
        Alert.alert("Success", "Journal entry saved successfully!");
      } catch (error) {
        // Check if it's a sync-related error with retry callback
        const handled = handleSyncError(error, "save journal entries", () => {
          // This will be called if user enables sync from the alert
          attemptSave(); // Retry the save operation
        });
        
        if (!handled) {
          // Handle other types of errors
          Alert.alert("Error", "Failed to save journal entry");
        }
      }
    };
    
    await attemptSave();
  };

  // Example: Even simpler with retryWithSyncCheck utility
  const saveJournalEntrySimple = async (content, date, tags, mood) => {
    await retryWithSyncCheck(
      () => createJournalEntry({ content, date, tags, mood }),
      "save journal entries",
      (result) => Alert.alert("Success", "Journal entry saved!"), // onSuccess
      (error) => Alert.alert("Error", "Failed to save journal entry") // onError
    );
  };

  return (
    <>
      <TouchableOpacity onPress={handleManualSync}>
        <Text>Manual Sync</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => saveJournalEntry("Test", new Date(), [], "happy")}>
        <Text>Save Journal Entry (Manual Retry)</Text>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={() => saveJournalEntrySimple("Test", new Date(), [], "happy")}>
        <Text>Save Journal Entry (Simple)</Text>
      </TouchableOpacity>
    </>
  );
};

/* 
  HOW TO USE IN YOUR EXISTING COMPONENTS:

  1. Import sync utilities:
     import { checkSyncBeforeAction, handleSyncError } from "../utils/syncUtils";

  2. Before any manual sync action:
     const canProceed = await checkSyncBeforeAction("sync your data", () => {
       // Your sync logic here
     });

  3. In API error handling with retry functionality:
     const attemptAction = async () => {
       try {
         // Your API call here
       } catch (error) {
         const handled = handleSyncError(error, "perform this action", () => {
           attemptAction(); // Retry after enabling sync
         });
         if (!handled) {
           // Handle other errors
         }
       }
     };

  4. The API client automatically blocks requests when sync is disabled,
     so existing API calls will automatically show the sync alert.
*/

export default JournalExample;