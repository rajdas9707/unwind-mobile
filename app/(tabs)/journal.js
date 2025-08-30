import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { auth } from "../../firebaseConfig";
import {
  listJournalEntries,
  createJournalEntry,
  deleteJournalEntry,
} from "../../api/client";
import { Calendar } from "react-native-calendars";
import {
  listEntriesByDate,
  listLatestEntries,
  insertLocalEntry,
  markSynced,
  upsertFromServer,
  deleteLocalByIds,
} from "../../storage/journalDb";
import {
  checkNetworkStatus,
  addNetworkListener,
  getNetworkStatus,
  startNetworkMonitoring,
} from "../../utils/networkUtils";
import { useDatabaseReady } from "../../hooks/useDatabaseReady";

export default function JournalScreen() {
  const { isReady } = useDatabaseReady();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newEntry, setNewEntry] = useState("");
  const [entries, setEntries] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncingEntries, setSyncingEntries] = useState(new Set());

  // Spinning animation for sync icon
  const spinValue = useSharedValue(0);

  const spinStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${spinValue.value}deg` }],
    };
  });

  // Start spinning animation when syncing
  useEffect(() => {
    if (syncingEntries.size > 0) {
      spinValue.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1
      );
    } else {
      spinValue.value = withTiming(0, { duration: 0 });
    }
  }, [syncingEntries.size]);

  const syncPendingEntries = async () => {
    try {
      const unsyncedEntries = entries.filter((entry) => !entry.synced);
      if (unsyncedEntries.length === 0) return;

      const idToken = await getIdToken();
      if (!idToken) return;

      let syncedCount = 0;
      for (const entry of unsyncedEntries) {
        try {
          const created = await createJournalEntry({
            idToken,
            content: entry.content,
            date: entry.date,
          });
          await markSynced({
            localId: entry.localId,
            serverId: created._id,
            timestamp: created.createdAt,
          });
          syncedCount++;
        } catch (e) {
          console.log("Failed to sync entry:", entry.localId, e);
        }
      }

      if (syncedCount > 0) {
        await loadLatestEntries();
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${syncedCount} journal entries.`,
          [{ text: "OK" }]
        );
      }
    } catch (e) {
      console.log("Error syncing pending entries:", e);
    }
  };

  useEffect(() => {
    if (!isReady) return;

    let stopMonitoring;
    let removeListener;

    (async () => {
      await loadLatestEntries();
      await syncFromBackend();

      // Start network monitoring
      stopMonitoring = startNetworkMonitoring();

      // Add network status listener
      removeListener = addNetworkListener((online) => {
        try {
          const wasOffline = !isOnline;
          setIsOnline(online);

          if (online && wasOffline) {
            // Network restored - show notification and try to sync pending entries
            Alert.alert(
              "Network Restored",
              "Your internet connection is back. Syncing your journal entries...",
              [{ text: "OK" }]
            );
            syncPendingEntries();
          }
        } catch (error) {
          console.log("Error in network listener:", error);
        }
      });

      // Initial network status check
      try {
        const initialStatus = await checkNetworkStatus();
        setIsOnline(initialStatus);
      } catch (error) {
        console.log("Error checking initial network status:", error);
        setIsOnline(false); // Assume offline if we can't check
      }
    })();

    return () => {
      if (stopMonitoring) stopMonitoring();
      if (removeListener) removeListener();
    };
  }, []);

  useEffect(() => {
    (async () => {
      // Load latest entries instead of date-specific entries
      await loadLatestEntries();
    })();
  }, [selectedDate]);

  const loadFromDb = async (date) => {
    try {
      console.log("Loading entries for date:", date);
      const rows = await listEntriesByDate(date);
      console.log("Raw database rows:", rows);

      const normalized = rows.map((r) => ({
        localId: r.localId,
        id: r.serverId || `local-${r.localId}`,
        serverId: r.serverId || null,
        date: r.date,
        content: r.content,
        timestamp: r.timestamp,
        synced: r.synced === 1,
      }));

      console.log("Normalized entries:", normalized);
      setEntries(normalized);

      // Update pending sync count
      const unsyncedCount = normalized.filter((entry) => !entry.synced).length;
      setPendingSyncCount(unsyncedCount);
      console.log("Unsynced count:", unsyncedCount);
    } catch (e) {
      console.log("Error loading from database:", e);
    }
  };

  const loadLatestEntries = async () => {
    try {
      console.log("Loading latest 10 entries");
      const rows = await listLatestEntries(10);
      console.log("Latest database rows:", rows);

      const normalized = rows.map((r) => ({
        localId: r.localId,
        id: r.serverId || `local-${r.localId}`,
        serverId: r.serverId || null,
        date: r.date,
        content: r.content,
        timestamp: r.timestamp,
        synced: r.synced === 1,
      }));

      console.log("Normalized latest entries:", normalized);
      setEntries(normalized);

      // Update pending sync count
      const unsyncedCount = normalized.filter((entry) => !entry.synced).length;
      setPendingSyncCount(unsyncedCount);
      console.log("Unsynced count:", unsyncedCount);
    } catch (e) {
      console.log("Error loading latest entries:", e);
    }
  };

  const manualSync = async (entry) => {
    if (entry.synced) return;

    console.log("Starting manual sync for entry:", entry);

    // Check network status before attempting sync
    const networkAvailable = await checkNetworkStatus();
    if (!networkAvailable) {
      Alert.alert(
        "No Network Connection",
        "Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      const idToken = await getIdToken();
      if (!idToken) {
        Alert.alert(
          "Authentication Required",
          "Please log in to sync your entries.",
          [{ text: "OK" }]
        );
        return;
      }

      console.log("Got ID token, making POST request...");

      // Set loading state for this entry
      setSyncingEntries((prev) => new Set(prev).add(entry.localId));

      // Make POST request to server
      const created = await createJournalEntry({
        idToken,
        content: entry.content,
        date: entry.date,
      });

      console.log("Server response:", created);

      // Update local database to mark as synced
      console.log("Updating local database...");
      await markSynced({
        localId: entry.localId,
        serverId: created._id,
        timestamp: created.createdAt,
      });

      console.log("Local database updated, refreshing entries...");

      // Refresh the entries list
      await loadLatestEntries();

      console.log("Entries refreshed successfully");

      // Show success message
      Alert.alert(
        "Sync Successful",
        "Your journal entry has been saved to the cloud!",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.log("Sync error details:", error);
      console.log("Error message:", error.message);
      console.log("Error stack:", error.stack);
      Alert.alert(
        "Sync Failed",
        `Failed to sync entry: ${
          error.message || "Unknown error"
        }. Please try again later.`,
        [{ text: "OK" }]
      );
    } finally {
      // Clear loading state
      setSyncingEntries((prev) => {
        const newSet = new Set(prev);
        newSet.delete(entry.localId);
        return newSet;
      });
    }
  };

  const getIdToken = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      return await currentUser.getIdToken();
    } catch (e) {
      return null;
    }
  };

  const syncFromBackend = async () => {
    try {
      const idToken = await getIdToken();
      if (!idToken) return; // user not logged in
      const data = await listJournalEntries({
        date: undefined,
        page: 1,
        limit: 200,
      });
      if (data?.entries) {
        for (const e of data.entries) {
          await upsertFromServer({
            serverId: e._id,
            date: e.date,
            content: e.content,
            timestamp: e.createdAt,
          });
        }
        await loadLatestEntries();
      }
    } catch (e) {
      // ignore network/auth errors to keep offline UX working
    }
  };

  const addEntry = async () => {
    if (!newEntry.trim()) {
      Alert.alert("Error", "Please write something in your journal");
      return;
    }

    // Check network status before saving
    const networkAvailable = await checkNetworkStatus();

    // Insert locally first as unsynced
    const localTimestamp = new Date().toISOString();
    const local = await insertLocalEntry({
      date: selectedDate,
      content: newEntry.trim(),
      timestamp: localTimestamp,
    });

    const newEntryObj = {
      localId: local.localId,
      id: `local-${local.localId}`,
      serverId: null,
      date: selectedDate,
      content: newEntry.trim(),
      timestamp: localTimestamp,
      synced: false,
    };

    setEntries([...entries, newEntryObj]);
    setNewEntry("");
    setShowAddModal(false);

    // Show appropriate alert based on network status
    if (!networkAvailable) {
      Alert.alert(
        "Entry Saved Offline",
        "Your journal entry has been saved locally. When network connectivity restores, it will be automatically synced to the cloud.",
        [{ text: "OK" }]
      );
    }

    // Try background sync to backend if network is available
    if (networkAvailable) {
      (async () => {
        try {
          const idToken = await getIdToken();
          if (!idToken) return;
          const created = await createJournalEntry({
            idToken,
            content: newEntry.trim(),
            date: selectedDate,
          });
          await markSynced({
            localId: local.localId,
            serverId: created._id,
            timestamp: created.createdAt,
          });
          await loadLatestEntries();
        } catch (e) {
          // If sync fails, show alert that entry is saved locally
          Alert.alert(
            "Sync Failed",
            "Your entry was saved locally but couldn't be synced to the cloud. It will be synced when network connectivity improves.",
            [{ text: "OK" }]
          );
        }
      })();
    }
  };

  const deleteEntry = (entryId) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          const entry = entries.find((e) => e.id === entryId);
          setEntries(entries.filter((e) => e.id !== entryId));
          (async () => {
            try {
              await deleteLocalByIds({
                localId: entry?.localId ?? null,
                serverId: entry?.serverId ?? null,
              });
              const idToken = await getIdToken();
              if (idToken && entry?.serverId) {
                await deleteJournalEntry({ idToken, id: entry.serverId });
              }
            } catch (e) {}
          })();
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

  const todaysEntries = getEntriesForDate(selectedDate);

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
            >
              <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
              <Text style={styles.syncAllText}>{pendingSyncCount}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowCalendar(true)}
          >
            <Ionicons name="calendar" size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.calendarButton, { marginLeft: 8 }]}
            onPress={async () => {
              console.log("=== DEBUG INFO ===");
              console.log("Current entries state:", entries);
              console.log("Syncing entries:", syncingEntries);
              console.log("Pending sync count:", pendingSyncCount);
              console.log("Selected date:", selectedDate);
              console.log("Is online:", isOnline);

              // Test database directly
              try {
                const rows = await listEntriesByDate(selectedDate);
                console.log("Direct database query result:", rows);
              } catch (error) {
                console.log("Database test error:", error);
              }
            }}
          >
            <Ionicons name="bug" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateText}>Latest Entries</Text>
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
        </View>
      </View>

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
          todaysEntries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTime}>
                  {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <View style={styles.actionsColumn}>
                  <TouchableOpacity
                    onPress={() => deleteEntry(entry.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                  {!entry.synced && (
                    <TouchableOpacity
                      onPress={() => manualSync(entry)}
                      style={styles.syncButton}
                      disabled={syncingEntries.has(entry.localId)}
                    >
                      <Animated.View
                        style={
                          syncingEntries.has(entry.localId) ? spinStyle : {}
                        }
                      >
                        <Ionicons
                          name={
                            syncingEntries.has(entry.localId)
                              ? "sync"
                              : "cloud-upload"
                          }
                          size={16}
                          color={
                            syncingEntries.has(entry.localId)
                              ? "#9CA3AF"
                              : "#3B82F6"
                          }
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <Text style={styles.entryContent}>{entry.content}</Text>
              {!entry.synced && (
                <Text style={styles.unsyncedText}>Not synced</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>

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
            <TouchableOpacity onPress={addEntry} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

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
    alignItems: "center",
    marginBottom: 8,
  },
  entryTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  deleteButton: {
    padding: 4,
  },
  actionsColumn: {
    alignItems: "flex-end",
  },
  syncButton: {
    padding: 6,
    marginTop: 4,
    backgroundColor: "#EBF4FF",
    borderRadius: 6,
  },
  entryContent: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  unsyncedText: {
    marginTop: 6,
    fontSize: 12,
    color: "#F59E0B",
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
  placeholder: {
    width: 40,
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
});
