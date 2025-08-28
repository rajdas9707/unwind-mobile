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
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import {
  initOverthinkingDb,
  listLatestOverthinkingEntries,
  listOverthinkingEntriesByDate,
  insertLocalOverthinkingEntry,
  toggleOverthinkingDumped,
  deleteOverthinkingById,
  markOverthinkingSynced,
} from "../../storage/overthinkingDb";
import {
  checkNetworkStatus,
  addNetworkListener,
  getNetworkStatus,
  startNetworkMonitoring,
} from "../../utils/networkUtils";
import { auth } from "../../firebaseConfig";
import {
  createOverthinkingEntry,
  deleteOverthinkingEntry,
} from "../../api/client";

export default function OverthinkingScreen() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newThought, setNewThought] = useState("");
  const [newSolution, setNewSolution] = useState("");
  const [entries, setEntries] = useState([]);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncingEntries, setSyncingEntries] = useState(new Set());

  useEffect(() => {
    let stopMonitoring;
    let removeListener;

    (async () => {
      await initOverthinkingDb();
      await loadLatestEntries();

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
              "Your internet connection is back. Syncing your overthinking entries...",
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

  const loadLatestEntries = async () => {
    try {
      const rows = await listLatestOverthinkingEntries(10);
      const normalized = rows.map((r) => ({
        localId: r.localId,
        id: r.serverId || `local-${r.localId}`,
        serverId: r.serverId || null,
        date: r.date,
        thought: r.thought,
        solution: r.solution,
        timestamp: r.timestamp,
        dumped: r.dumped === 1,
        synced: r.synced === 1,
      }));
      setEntries(normalized);

      // Update pending sync count
      const unsyncedCount = normalized.filter((entry) => !entry.synced).length;
      setPendingSyncCount(unsyncedCount);
    } catch (error) {
      console.error("Error loading entries:", error);
    }
  };

  const loadEntriesForDate = async (date) => {
    try {
      const rows = await listOverthinkingEntriesByDate(date);
      const normalized = rows.map((r) => ({
        localId: r.localId,
        id: r.serverId || `local-${r.localId}`,
        serverId: r.serverId || null,
        date: r.date,
        thought: r.thought,
        solution: r.solution,
        timestamp: r.timestamp,
        dumped: r.dumped === 1,
        synced: r.synced === 1,
      }));
      setEntries(normalized);

      // Update pending sync count
      const unsyncedCount = normalized.filter((entry) => !entry.synced).length;
      setPendingSyncCount(unsyncedCount);
    } catch (error) {
      console.error("Error loading entries for date:", error);
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

  const manualSync = async (entry) => {
    if (entry.synced) return;

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

      // Set loading state for this entry
      setSyncingEntries((prev) => new Set(prev).add(entry.localId));

      // Make POST request to server
      const created = await createOverthinkingEntry({
        idToken,
        thought: entry.thought,
        solution: entry.solution,
        date: entry.date,
      });

      // Update local database to mark as synced
      await markOverthinkingSynced({
        localId: entry.localId,
        serverId: created._id,
        timestamp: created.createdAt,
      });

      // Refresh the entries list
      await loadLatestEntries();

      // Show success message
      Alert.alert(
        "Sync Successful",
        "Your overthinking entry has been saved to the cloud!",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.log("Sync error:", error);
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

  const syncPendingEntries = async () => {
    try {
      const unsyncedEntries = entries.filter((entry) => !entry.synced);
      if (unsyncedEntries.length === 0) return;

      const idToken = await getIdToken();
      if (!idToken) return;

      let syncedCount = 0;
      for (const entry of unsyncedEntries) {
        try {
          const created = await createOverthinkingEntry({
            idToken,
            thought: entry.thought,
            solution: entry.solution,
            date: entry.date,
          });
          await markOverthinkingSynced({
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
          `Successfully synced ${syncedCount} overthinking entries.`,
          [{ text: "OK" }]
        );
      }
    } catch (e) {
      console.log("Error syncing pending entries:", e);
    }
  };

  const addEntry = async () => {
    if (!newThought.trim()) {
      Alert.alert("Error", "Please describe your overthinking pattern");
      return;
    }

    // Check network status before saving
    const networkAvailable = await checkNetworkStatus();

    const timestamp = new Date().toISOString();
    const local = await insertLocalOverthinkingEntry({
      date: selectedDate,
      thought: newThought.trim(),
      solution: newSolution.trim(),
      timestamp,
    });

    const newEntryObj = {
      localId: local.localId,
      id: `local-${local.localId}`,
      serverId: null,
      date: selectedDate,
      thought: newThought.trim(),
      solution: newSolution.trim(),
      timestamp,
      dumped: false,
      synced: false,
    };

    setEntries([newEntryObj, ...entries]);
    setNewThought("");
    setNewSolution("");
    setShowAddModal(false);

    // Show appropriate alert based on network status
    if (!networkAvailable) {
      Alert.alert(
        "Entry Saved Offline",
        "Your overthinking entry has been saved locally. When network connectivity restores, it will be automatically synced to the cloud.",
        [{ text: "OK" }]
      );
    }

    // Try background sync to backend if network is available
    if (networkAvailable) {
      (async () => {
        try {
          const idToken = await getIdToken();
          if (!idToken) return;
          const created = await createOverthinkingEntry({
            idToken,
            thought: newThought.trim(),
            solution: newSolution.trim(),
            date: selectedDate,
          });
          await markOverthinkingSynced({
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

  const dumpThought = async (entry) => {
    Alert.alert(
      "Release Thought",
      "Are you ready to let go of this overthinking pattern?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release",
          onPress: async () => {
            await toggleOverthinkingDumped({
              localId: entry.localId,
              dumped: !entry.dumped,
            });
            await loadLatestEntries();
          },
        },
      ]
    );
  };

  const deleteEntry = async (entry) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteOverthinkingById({
            localId: entry.localId,
            serverId: entry.serverId,
          });
          await loadLatestEntries();
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
        dotColor: "#8B5CF6",
        selectedColor: "#8B5CF6",
      };
    });
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: "#8B5CF6",
    };
    return marked;
  };

  const todaysEntries = getEntriesForDate(selectedDate);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Overthinking</Text>
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
            <Ionicons name="calendar" size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateText}>
          {selectedDate === new Date().toISOString().split("T")[0]
            ? "Latest Entries"
            : formatDate(selectedDate)}
        </Text>
        <View style={styles.dateActions}>
          {selectedDate !== new Date().toISOString().split("T")[0] && (
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => {
                setSelectedDate(new Date().toISOString().split("T")[0]);
                loadLatestEntries();
              }}
            >
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>
          )}
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
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bulb-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>
              No overthinking entries yet
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Track and release your racing thoughts
            </Text>
          </View>
        ) : (
          entries.map((entry) => (
            <View
              key={entry.id}
              style={[styles.entryCard, entry.dumped && styles.dumpedCard]}
            >
              <View style={styles.entryHeader}>
                <Text style={styles.entryTime}>
                  {new Date(entry.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <View style={styles.actionsColumn}>
                  <TouchableOpacity
                    onPress={() => deleteEntry(entry)}
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
                            : "#8B5CF6"
                        }
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <Text style={styles.thoughtLabel}>Thought:</Text>
              <Text style={styles.thoughtContent}>{entry.thought}</Text>

              {entry.solution && (
                <>
                  <Text style={styles.solutionLabel}>Solution:</Text>
                  <Text style={styles.solutionContent}>{entry.solution}</Text>
                </>
              )}

              {!entry.dumped ? (
                <TouchableOpacity
                  style={styles.dumpButton}
                  onPress={() => dumpThought(entry)}
                >
                  <Text style={styles.dumpButtonText}>Release Thought</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.dumpedIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.dumpedText}>Released</Text>
                </View>
              )}
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
            <Text style={styles.modalTitle}>Log Overthinking</Text>
            <TouchableOpacity onPress={addEntry} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                What are you overthinking about?
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Describe your racing thoughts..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                value={newThought}
                onChangeText={setNewThought}
                textAlignVertical="top"
                autoFocus
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                Potential Solution (Optional)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="What could help resolve this?"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={newSolution}
                onChangeText={setNewSolution}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
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
              loadEntriesForDate(day.dateString);
            }}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: "#FFFFFF",
              calendarBackground: "#FFFFFF",
              textSectionTitleColor: "#6B7280",
              selectedDayBackgroundColor: "#8B5CF6",
              selectedDayTextColor: "#FFFFFF",
              todayTextColor: "#8B5CF6",
              dayTextColor: "#2D3748",
              textDisabledColor: "#CBD5E0",
              dotColor: "#8B5CF6",
              selectedDotColor: "#FFFFFF",
              arrowColor: "#8B5CF6",
              monthTextColor: "#2D3748",
              indicatorColor: "#8B5CF6",
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
    backgroundColor: "#8B5CF6",
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
    backgroundColor: "#F3E8FF",
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
  dateActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#8B5CF6",
    borderRadius: 16,
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
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
  dumpedCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  entryTime: {
    fontSize: 12,
    color: "#6B7280",
  },
  actionsColumn: {
    alignItems: "flex-end",
  },
  deleteButton: {
    padding: 4,
  },
  syncButton: {
    padding: 6,
    marginTop: 4,
    backgroundColor: "#F3E8FF",
    borderRadius: 6,
  },
  thoughtLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B5CF6",
    marginBottom: 4,
  },
  thoughtContent: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 12,
  },
  solutionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
    marginBottom: 4,
  },
  solutionContent: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 12,
  },
  dumpButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  dumpButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  dumpedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dumpedText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
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
    backgroundColor: "#8B5CF6",
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
    backgroundColor: "#8B5CF6",
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  placeholder: {
    width: 40,
  },
  modalScrollView: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#374151",
    backgroundColor: "#FFFFFF",
    minHeight: 100,
  },
});
