import React, { useState, useEffect, useContext, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
// Removed animation imports
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { Calendar } from "react-native-calendars";
import { useNetworkStatus } from "../../utils/networkUtils";
// import { AuthContext } from "../../context/AuthProvider";

// Import our new storage layer
import {
  fetchRecentJournalEntries,
  fetchJournalsByDate,
  createJournalEntryLocal,
  syncJournalEntryToServer,
  syncAllJournalEntries,
  deleteJournalEntryLocal,
  getUnsyncedCount,
  canCreateEntryToday,
  canSyncToday,
} from "../../storage/journal/storage";

// Import database health check
// Removed database health/test utilities to avoid errors

export default function JournalScreen() {
  // const { isReady } = useDatabaseReady();

  // Debug: Log loading state changes
  useEffect(() => {
    console.log("loading changed:", loading);
  }, [loading]);
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newEntry, setNewEntry] = useState("");
  const [newEntryTitle, setNewEntryTitle] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useNetworkStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncingEntries, setSyncingEntries] = useState(new Set());
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Additional loading states for different operations
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [isDeletingEntry, setIsDeletingEntry] = useState(new Set());
  const [isUpdatingUnsyncedCount, setIsUpdatingUnsyncedCount] = useState(false);
  // const { idToken } = useContext(AuthContext); // removed, now handled in client.js

  const isScreenActiveRef = useRef(true);
  const showAlert = (title, message, buttons) => {
    if (!isScreenActiveRef.current) return;
    Alert.alert(title, message, buttons);
  };
  const logError = (...args) => {
    if (!isScreenActiveRef.current) return;
    // eslint-disable-next-line no-console
    console.error(...args);
  };

  // Removed animation logic

  // Sync all pending entries
  const syncPendingEntries = async () => {
    let isMounted = true;

    try {
      // Check if online
      if (!isOnline) {
        Alert.alert(
          "No Internet Connection",
          "Please check your connection and try again.",
          [{ text: "OK" }]
        );
        return;
      }

      // Start syncing
      setIsSyncingAll(true);

      try {
        const result = await syncAllJournalEntries();

        if (result.syncedCount > 0 || result.failedCount > 0) {
          showAlert(
            "Sync Complete",
            `Successfully synced ${result.syncedCount} entries. ${
              result.failedCount > 0
                ? `Failed to sync ${result.failedCount} entries.`
                : ""
            }`
          );
        } else {
          showAlert(
            "No Entries to Sync",
            "All your entries are already synced."
          );
        }

        // Refresh the list
        if (isMounted) {
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
            console.error("Error refreshing entries:", error);
          } finally {
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error syncing all entries:", error);
        showAlert(
          "Sync Failed",
          error.message || "Failed to sync entries. Please try again later."
        );
      } finally {
        setIsSyncingAll(false);
      }
    } catch (e) {
      console.error("Error in syncPendingEntries:", e);
      setIsSyncingAll(false);
    }
  };

  // useEffect(() => {
  //   if (!isReady) return;

  //   let stopMonitoring;
  //   let removeListener;

  //   (async () => {
  //     await loadLatestEntries();
  //     await syncFromBackend();

  //     // Start network monitoring
  //     stopMonitoring = startNetworkMonitoring();

  //     // Add network status listener
  //     removeListener = addNetworkListener((online) => {
  //       try {
  //         const wasOffline = !isOnline;
  //         setIsOnline(online);

  //         if (online && wasOffline) {
  //           // Network restored - show notification and try to sync pending entries
  //           Alert.alert(
  //             "Network Restored",
  //             "Your internet connection is back. Syncing your journal entries...",
  //             [{ text: "OK" }]
  //           );
  //           syncPendingEntries();
  //         }
  //       } catch (error) {
  //         console.log("Error in network listener:", error);
  //       }
  //     });

  //     // Initial network status check
  //     try {
  //       const initialStatus = await checkNetworkStatus();
  //       setIsOnline(initialStatus);
  //     } catch (error) {
  //       console.log("Error checking initial network status:", error);
  //       setIsOnline(false); // Assume offline if we can't check
  //     }
  //   })();

  //   return () => {
  //     if (stopMonitoring) stopMonitoring();
  //     if (removeListener) removeListener();
  //   };
  // }, []);

  // useEffect(() => {
  //   (async () => {
  //     // Load latest entries instead of date-specific entries

  //     await loadLatestEntries();
  //     console.log("Database is ready, loaded latest entries");
  //   })();
  // }, []);

  // Load entries when the component mounts or when selectedDate changes
  useEffect(() => {
    let isMounted = true;

    const loadEntriesWithAbort = async () => {
      if (!isMounted) return;

      console.log("loadentries function call");
      setLoading(true);

      try {
        let loadedEntries;
        if (selectedDate) {
          loadedEntries = await fetchJournalsByDate(selectedDate);
        } else {
          loadedEntries = await fetchRecentJournalEntries(10);
        }

        if (isMounted) {
          setEntries(loadedEntries || []);
          await updateUnsyncedCount();
        }
      } catch (error) {
        if (!isMounted) return;

        console.error("Error loading entries:", error);
        if (
          error &&
          error.message &&
          error.message.includes("database is locked")
        ) {
          showAlert(
            "Database Busy",
            "The database is currently busy. Please try again in a moment.",
            [{ text: "Retry", onPress: () => loadEntriesWithAbort() }]
          );
        } else {
          showAlert(
            "Error",
            "Failed to load journal entries: " +
              (error && error.message ? error.message : "Unknown error")
          );
        }
      } finally {
        if (isMounted) {
          console.log("In finally block, about to setLoading(false)");
          setLoading(false);
        }
      }
    };

    loadEntriesWithAbort();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      isScreenActiveRef.current = true;
      return () => {
        isScreenActiveRef.current = false;
      };
    }, [])
  );

  // Update unsynced count periodically
  // useEffect(() => {

  //   const interval = setInterval(() => {
  //     updateUnsyncedCount();
  //   }, 10000); // Check every 10 seconds

  //   return () => clearInterval(interval);
  // }, []);

  // Update the count of unsynced entries
  const updateUnsyncedCount = async () => {
    setIsUpdatingUnsyncedCount(true);
    try {
      const count = await getUnsyncedCount();
      setPendingSyncCount(count);
    } catch (error) {
      console.error("Error updating unsynced count:", error);
    } finally {
      setIsUpdatingUnsyncedCount(false);
    }
  };

  // Sync a single entry to the server
  const manualSync = async (entry) => {
    if (entry.synced) return;

    console.log("Starting manual sync for entry:", entry);

    // Check network status before attempting sync
    if (!isOnline) {
      showAlert(
        "No Network Connection",
        "Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
      return;
    }

    // Check daily sync limit
    const canSync = await canSyncToday();
    if (!canSync) {
      showAlert(
        "Sync Limit Reached",
        "You can only sync 3 times per day. Try again tomorrow.",
        [{ text: "OK" }]
      );
      return;
    }

    // Set loading state for this entry
    setSyncingEntries((prev) => new Set(prev).add(entry.id));

    try {
      // Use the new sync function - error handling is now centralized
      const synced = await syncJournalEntryToServer({ entry });

      if (!synced) {
        showAlert(
          "Sync Failed",
          "Failed to sync entry. Please try again later."
        );
        return;
      }

      // Refresh entries
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
        console.error("Error refreshing entries:", error);
      } finally {
        setLoading(false);
      }

      showAlert(
        "Sync Successful",
        "Your journal entry has been saved to the cloud!",
        [{ text: "OK" }]
      );
    } catch (error) {
      logError("Sync error:", error);
      showAlert(
        "Sync Failed",
        error.message || "Failed to sync entry. Please try again later.",
        [{ text: "OK" }]
      );
    } finally {
      // Clear loading state
      setSyncingEntries((prev) => {
        const newSet = new Set(prev);
        newSet.delete(entry.id);
        return newSet;
      });
    }
  };

  // Navigate to journal detail screen
  const viewJournalEntry = (entry) => {
    router.push(`/journal/${entry.id}`);
  };

  // const getIdToken = async () => {
  //   try {
  //     const currentUser = auth.currentUser;
  //     if (!currentUser) return null;
  //     return await currentUser.getIdToken();
  //   } catch (e) {
  //     return null;
  //   }
  // };

  // Add a new journal entry
  const addEntry = async () => {
    console.log("Attempting to add new entry");
    if (!newEntry.trim()) {
      showAlert("Error", "Please write something in your journal");
      return;
    }

    setIsAddingEntry(true);

    try {
      // Create entry locally - error handling is now centralized
      const entry = await createJournalEntryLocal({
        title: newEntryTitle.trim(),
        content: newEntry.trim(),
      });

      // Reset form and close modal
      setNewEntry("");
      setNewEntryTitle("");
      setShowAddModal(false);

      // Add to current entries list
      setEntries([entry, ...entries]);

      // Update unsynced count
      await updateUnsyncedCount();

      // Show appropriate alert based on network status
      if (!isOnline) {
        showAlert(
          "Entry Saved Offline",
          "Your journal entry has been saved locally. It will be synced when you're back online.",
          [{ text: "OK" }]
        );
        return;
      }

      // Try to sync immediately if online
      if (isOnline) {
        setSyncingEntries((prev) => new Set(prev).add(entry.id));

        try {
          const synced = await syncJournalEntryToServer({ entry });
          if (!synced) {
            showAlert(
              "Sync Failed",
              "Entry saved locally but couldn't be synced. You can try again later."
            );
            return;
          }

          // Refresh the list
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
            console.error("Error refreshing entries:", error);
          } finally {
            setLoading(false);
          }
        } catch (syncError) {
          logError("Failed to sync new entry:", syncError);
          showAlert(
            "Sync Failed",
            "Entry saved locally but couldn't be synced. You can try again later.",
            [{ text: "OK" }]
          );
        } finally {
          setSyncingEntries((prev) => {
            const newSet = new Set(prev);
            newSet.delete(entry.id);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error("Error adding entry:", error);
      showAlert("Error", error.message || "Failed to create journal entry");
    } finally {
      setIsAddingEntry(false);
    }
  };

  // Delete a journal entry
  const deleteEntry = (entry) => {
    showAlert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // Set loading state for this specific entry
          setIsDeletingEntry((prev) => new Set(prev).add(entry.id));

          // Remove from UI immediately for responsive feel
          setEntries(entries.filter((e) => e.id !== entry.id));

          try {
            // Delete from storage - error handling is now centralized
            await deleteJournalEntryLocal({ entry });

            // Update unsynced count
            await updateUnsyncedCount();
          } catch (error) {
            console.error("Error deleting entry:", error);
            showAlert("Error", "Failed to delete entry");
            // Refresh the list to show the entry again if deletion failed
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
              console.error("Error refreshing entries:", error);
            } finally {
              setLoading(false);
            }
          } finally {
            // Clear loading state for this entry
            setIsDeletingEntry((prev) => {
              const newSet = new Set(prev);
              newSet.delete(entry.id);
              return newSet;
            });
          }
        },
      },
    ]);
  };

  const getEntriesForDate = (date) => {
    return entries.filter((entry) => entry.date === date);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getMarkedDates = () => {
    const marked = {};
    entries.forEach((entry) => {
      marked[entry.date] = {
        marked: true,
        dotColor: "#3B82F6",
        selectedColor: "#3B82F6",
      };
    });
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: "#3B82F6",
    };
    return marked;
  };

  const todaysEntries = getEntriesForDate(
    new Date().toISOString().split("T")[0]
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <View style={styles.headerActions}>
          {pendingSyncCount > 0 && (
            <TouchableOpacity
              style={styles.syncAllButton}
              onPress={syncPendingEntries}
              disabled={isSyncingAll}
            >
              {isSyncingAll ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.syncAllText}>{pendingSyncCount}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowCalendar(true)}
          >
            <Ionicons name="calendar" size={20} color="#3B82F6" />
          </TouchableOpacity>

          {/* Removed test button */}
        </View>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateText}>
          {selectedDate ? selectedDate : "Latest Entries"}
        </Text>
        <View style={styles.networkStatus}>
          <Ionicons
            name={isOnline ? "wifi" : "wifi-outline"}
            size={16}
            color={isOnline ? "#10B981" : "#EF4444"}
          />
          <Text
            style={[
              styles.networkText,
              { color: isOnline ? "#10B981" : "#EF4444" },
            ]}
          >
            {isOnline ? "Online" : "Offline"}
          </Text>
          {isUpdatingUnsyncedCount && (
            <ActivityIndicator
              size="small"
              color="#3B82F6"
              style={{ marginLeft: 8 }}
            />
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No journal entries yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Start writing to capture your thoughts
              </Text>
            </View>
          ) : (
            entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => viewJournalEntry(entry)}
                activeOpacity={0.7}
              >
                <View style={styles.entryHeader}>
                  <View style={styles.entryHeaderLeft}>
                    <Text style={styles.entryDate}>
                      {new Date(entry.created_at).toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                    <Text style={styles.entryTime}>
                      {new Date(entry.created_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        deleteEntry(entry);
                      }}
                      style={styles.actionButton}
                      disabled={isDeletingEntry.has(entry.id)}
                    >
                      {isDeletingEntry.has(entry.id) ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color="#EF4444"
                        />
                      )}
                    </TouchableOpacity>

                    {!entry.synced && (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          manualSync(entry);
                        }}
                        style={styles.actionButton}
                        disabled={syncingEntries.has(entry.id)}
                      >
                        {syncingEntries.has(entry.id) ? (
                          <ActivityIndicator size="small" color="#3B82F6" />
                        ) : (
                          <Ionicons
                            name="cloud-upload-outline"
                            size={18}
                            color="#3B82F6"
                          />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {entry.title ? (
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                ) : null}

                <View style={styles.contentRow}>
                  <Text style={styles.sentimentEmoji}>{entry.sentiment}</Text>
                  <Text style={styles.entryContent}>
                    {entry.truncatedContent}
                  </Text>
                </View>

                <View style={styles.entryFooter}>
                  {entry.synced ? (
                    <View style={styles.syncStatus}>
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color="#10B981"
                      />
                      <Text style={styles.syncedText}>Synced</Text>
                    </View>
                  ) : syncingEntries.has(entry.id) ? (
                    <View style={styles.syncStatus}>
                      <ActivityIndicator size="small" color="#3B82F6" />
                      <Text style={styles.syncingText}>Syncing...</Text>
                    </View>
                  ) : (
                    <View style={styles.syncStatus}>
                      <Ionicons name="time-outline" size={14} color="#F59E0B" />
                      <Text style={styles.unsyncedText}>Pending sync</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Entry Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowAddModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Journal Entry</Text>
            <TouchableOpacity
              onPress={addEntry}
              style={[
                styles.saveButton,
                isAddingEntry && styles.saveButtonDisabled,
              ]}
              disabled={isAddingEntry}
            >
              {isAddingEntry ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.titleInput}
            placeholder="Title (optional)"
            placeholderTextColor="#9CA3AF"
            value={newEntryTitle}
            onChangeText={setNewEntryTitle}
            maxLength={200}
          />

          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind today?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={10}
            value={newEntry}
            onChangeText={setNewEntry}
            textAlignVertical="top"
            autoFocus
          />
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCalendar(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Date</Text>
            <View style={styles.placeholder} />
          </View>

          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setShowCalendar(false);
            }}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: "#FFFFFF",
              calendarBackground: "#FFFFFF",
              textSectionTitleColor: "#6B7280",
              selectedDayBackgroundColor: "#3B82F6",
              selectedDayTextColor: "#FFFFFF",
              todayTextColor: "#3B82F6",
              dayTextColor: "#2D3748",
              textDisabledColor: "#CBD5E0",
              dotColor: "#3B82F6",
              selectedDotColor: "#FFFFFF",
              arrowColor: "#3B82F6",
              monthTextColor: "#2D3748",
              indicatorColor: "#3B82F6",
              textDayFontWeight: "300",
              textMonthFontWeight: "bold",
              textDayHeaderFontWeight: "300",
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13,
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  syncAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#3B82F6",
    gap: 4,
  },
  syncAllText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  calendarButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#EBF4FF",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  dateText: {
    fontSize: 16,
    color: "#6B7280",
  },
  networkStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  networkText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  entryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  entryHeaderLeft: {
    flexDirection: "column",
  },
  entryDate: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  entryTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  sentimentEmoji: {
    fontSize: 22,
    marginRight: 8,
    marginTop: 2,
  },
  entryContent: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  entryFooter: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 8,
  },
  syncStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  unsyncedText: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "500",
  },
  syncedText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  syncingText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
    opacity: 0.7,
  },
  placeholder: {
    width: 40,
  },
  titleInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: "#111827",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
});
