import React, { useState, useEffect, useContext } from "react";
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { Calendar } from "react-native-calendars";
import { useNetworkStatus } from "../../utils/networkUtils";
import { useDatabaseReady } from "../../hooks/useDatabaseReady";
import { AuthContext } from "../../context/AuthProvider";

// Import new storage layer
import {
  fetchRecentOverthinkingEntries,
  fetchOverthinkingByDate,
  createOverthinkingEntryLocal,
  syncOverthinkingEntryToServer,
  syncAllOverthinkingEntries,
  deleteOverthinkingEntryLocal,
  toggleOverthinkingDumpedLocal,
  getUnsyncedOverthinkingCount,
  canCreateOverthinkingEntryToday,
  canSyncOverthinkingToday
} from "../../storage/overthinking/storage";

// Import database health check
import { checkOverthinkingDatabaseHealth } from "../../storage/overthinking/db";

export default function OverthinkingScreen() {
  const { isReady } = useDatabaseReady();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newThought, setNewThought] = useState("");
  const [newSolution, setNewSolution] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOnline = useNetworkStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [syncingEntries, setSyncingEntries] = useState(new Set());
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const { idToken } = useContext(AuthContext);
  
  // Spinning animation for sync icon
  const spinValue = useSharedValue(0);

  const spinStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${spinValue.value}deg` }],
    };
  });

  // Start spinning animation when syncing
  useEffect(() => {
    if (syncingEntries.size > 0 || isSyncingAll) {
      spinValue.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1
      );
    } else {
      spinValue.value = withTiming(0, { duration: 0 });
    }
  }, [syncingEntries.size, isSyncingAll]);

  // Load entries when the component mounts or when selectedDate changes
  useEffect(() => {
    if (isReady) {
      loadEntries();
    }
  }, [isReady, selectedDate]);
  
  // Refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isReady) {
        loadEntries();
        updateUnsyncedCount();
      }
      
      // Cleanup function
      return () => {
        console.log("Screen is losing focus, resetting selectedDate to null.");
        setSelectedDate(null);
      };
    }, [isReady])
  );
  
  // Update unsynced count periodically
  useEffect(() => {
    if (!isReady) return;
    
    const interval = setInterval(() => {
      updateUnsyncedCount();
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [isReady]);

  // Load entries based on whether a date is selected or not
  const loadEntries = async () => {
    try {
      setLoading(true);
      
      // Check database health first
      const healthCheck = await checkOverthinkingDatabaseHealth();
      if (!healthCheck.healthy) {
        console.error("Database health check failed:", healthCheck);
        Alert.alert(
          "Database Error", 
          "There's an issue with the overthinking database. Please restart the app.",
          [{ text: "OK" }]
        );
        return;
      }
      
      let loadedEntries;
      
      if (selectedDate) {
        console.log("Loading overthinking entries for date:", selectedDate);
        loadedEntries = await fetchOverthinkingByDate(selectedDate);
      } else {
        console.log("Loading recent overthinking entries");
        loadedEntries = await fetchRecentOverthinkingEntries(10);
      }
      
      console.log("Loaded overthinking entries:", loadedEntries);
      setEntries(loadedEntries || []);
      
      // Update unsynced count
      updateUnsyncedCount();
    } catch (error) {
      console.error("Error loading overthinking entries:", error);
      
      // Check if it's a database lock error
      if (error.message && error.message.includes('database is locked')) {
        Alert.alert(
          "Database Busy", 
          "The database is currently busy. Please try again in a moment.",
          [{ text: "Retry", onPress: () => setTimeout(() => loadEntries(), 1000) }]
        );
      } else {
        Alert.alert("Error", "Failed to load overthinking entries: " + (error.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Update the count of unsynced entries
  const updateUnsyncedCount = async () => {
    try {
      const count = await getUnsyncedOverthinkingCount();
      setPendingSyncCount(count);
    } catch (error) {
      console.error("Error updating unsynced overthinking count:", error);
    }
  };

  // Sync all pending entries
  const syncPendingEntries = async () => {
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
      
      // Check if authenticated
      if (!idToken) {
        Alert.alert(
          "Authentication Required",
          "Please log in to sync your entries.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // Start syncing
      setIsSyncingAll(true);
      
      try {
        const result = await syncAllOverthinkingEntries({ idToken });
        
        if (result.syncedCount > 0 || result.failedCount > 0) {
          Alert.alert(
            "Sync Complete",
            `Successfully synced ${result.syncedCount} entries. ${result.failedCount > 0 ? `Failed to sync ${result.failedCount} entries.` : ''}`
          );
        } else {
          Alert.alert("No Entries to Sync", "All your entries are already synced.");
        }
        
        // Refresh the list
        loadEntries();
      } catch (error) {
        console.error("Error syncing all entries:", error);
        Alert.alert("Sync Failed", error.message || "Failed to sync entries. Please try again later.");
      } finally {
        setIsSyncingAll(false);
      }
    } catch (e) {
      console.error("Error in syncPendingEntries:", e);
      setIsSyncingAll(false);
    }
  };

  // Sync a single entry to the server
  const manualSync = async (entry) => {
    if (entry.synced) return;

    console.log("Starting manual sync for overthinking entry:", entry);

    // Check network status before attempting sync
    if (!isOnline) {
      Alert.alert(
        "No Network Connection",
        "Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      if (!idToken) {
        Alert.alert(
          "Authentication Required",
          "Please log in to sync your entries.",
          [{ text: "OK" }]
        );
        return;
      }

      // Check daily sync limit
      const canSync = await canSyncOverthinkingToday();
      if (!canSync) {
        Alert.alert(
          "Sync Limit Reached",
          "You can only sync 3 times per day. Try again tomorrow.",
          [{ text: "OK" }]
        );
        return;
      }

      // Set loading state for this entry
      setSyncingEntries((prev) => new Set(prev).add(entry.id));

      // Use the new sync function
      await syncOverthinkingEntryToServer({ entry, idToken });
      
      // Refresh the entries list
      await loadEntries();

      // Show success message
      Alert.alert(
        "Sync Successful",
        "Your overthinking entry has been saved to the cloud!",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert(
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
  
  // Navigate to overthinking detail screen
  const viewOverthinkingEntry = (entry) => {
    router.push(`/overthinking/${entry.id}`);
  };

  // Add a new overthinking entry
  const addEntry = async () => {
    try {
      if (!isReady) {
        Alert.alert("Database Not Ready", "Please wait a moment and try again.");
        return;
      }
      
      if (!newThought.trim()) {
        Alert.alert("Error", "Please describe your overthinking pattern");
        return;
      }
      
      // Create entry locally
      const entry = await createOverthinkingEntryLocal({
        title: newTitle.trim(),
        thought: newThought.trim(),
        solution: newSolution.trim(),
        idToken
      });
      
      // Reset form and close modal
      setNewThought("");
      setNewSolution("");
      setNewTitle("");
      setShowAddModal(false);
      
      // Add to current entries list
      setEntries([entry, ...entries]);
      
      // Update unsynced count
      updateUnsyncedCount();
      
      // Show appropriate alert based on network status
      if (!isOnline) {
        Alert.alert(
          "Entry Saved Offline",
          "Your overthinking entry has been saved locally. It will be synced when you're back online.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // Try to sync immediately if online
      if (isOnline && idToken) {
        try {
          setSyncingEntries((prev) => new Set(prev).add(entry.id));
          await syncOverthinkingEntryToServer({ entry, idToken });
          await loadEntries(); // Refresh the list
        } catch (syncError) {
          console.error("Failed to sync new entry:", syncError);
          Alert.alert(
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
      Alert.alert("Error", error.message || "Failed to create overthinking entry");
    }
  };

  // Delete an overthinking entry
  const deleteEntry = (entry) => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // Remove from UI immediately for responsive feel
            setEntries(entries.filter((e) => e.id !== entry.id));
            
            // Delete from storage
            await deleteOverthinkingEntryLocal({ entry, idToken });
            
            // Update unsynced count
            updateUnsyncedCount();
          } catch (error) {
            console.error("Error deleting entry:", error);
            Alert.alert("Error", "Failed to delete entry");
            // Refresh the list to show the entry again if deletion failed
            loadEntries();
          }
        },
      },
    ]);
  };

  // Toggle dumped status
  const dumpThought = async (entry) => {
    Alert.alert(
      "Release Thought",
      "Are you ready to let go of this overthinking pattern?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Release",
          onPress: async () => {
            try {
              await toggleOverthinkingDumpedLocal({
                id: entry.id,
                dumped: !entry.dumped,
              });
              await loadEntries();
            } catch (error) {
              console.error("Error toggling dumped status:", error);
              Alert.alert("Error", "Failed to update entry");
            }
          },
        },
      ]
    );
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
      const date = entry.created_at.split('T')[0];
      marked[date] = {
        marked: true,
        dotColor: "#8B5CF6",
        selectedColor: "#8B5CF6",
      };
    });
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: "#8B5CF6",
      };
    }
    return marked;
  };

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
              disabled={isSyncingAll}
            >
              {isSyncingAll ? (
                <Animated.View style={spinStyle}>
                  <Ionicons name="sync" size={16} color="#FFFFFF" />
                </Animated.View>
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
            <Ionicons name="calendar" size={20} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.dateRow}>
        <Text style={styles.dateText}>
          {selectedDate ? formatDate(selectedDate) : "Latest Entries"}
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
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      ) : (
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
              <TouchableOpacity
                key={entry.id}
                style={[styles.entryCard, entry.dumped && styles.dumpedCard]}
                onPress={() => viewOverthinkingEntry(entry)}
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
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
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
                        <Animated.View style={syncingEntries.has(entry.id) ? spinStyle : {}}>
                          <Ionicons
                            name={syncingEntries.has(entry.id) ? "sync" : "cloud-upload-outline"}
                            size={18}
                            color={syncingEntries.has(entry.id) ? "#9CA3AF" : "#8B5CF6"}
                          />
                        </Animated.View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                
                {entry.title ? (
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                ) : null}
                
                <View style={styles.contentRow}>
                  <Text style={styles.moodEmoji}>{entry.mood}</Text>
                  <View style={styles.thoughtSection}>
                    <Text style={styles.thoughtLabel}>Thought:</Text>
                    <Text style={styles.thoughtContent}>{entry.truncatedThought}</Text>
                  </View>
                </View>

                {entry.solution && (
                  <View style={styles.solutionSection}>
                    <Text style={styles.solutionLabel}>Solution:</Text>
                    <Text style={styles.solutionContent}>{entry.solution}</Text>
                  </View>
                )}

                <View style={styles.entryFooter}>
                  {!entry.dumped ? (
                    <TouchableOpacity
                      style={styles.dumpButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        dumpThought(entry);
                      }}
                    >
                      <Text style={styles.dumpButtonText}>Release Thought</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.dumpedIndicator}>
                      <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                      <Text style={styles.dumpedText}>Released</Text>
                    </View>
                  )}
                  
                  <View style={styles.syncStatusContainer}>
                    {!entry.synced && (
                      <View style={styles.syncStatus}>
                        <Ionicons name="time-outline" size={14} color="#F59E0B" />
                        <Text style={styles.unsyncedText}>Pending sync</Text>
                      </View>
                    )}
                    {entry.synced && (
                      <View style={styles.syncStatus}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.syncedText}>Synced</Text>
                      </View>
                    )}
                  </View>
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
            <Text style={styles.modalTitle}>Log Overthinking</Text>
            <TouchableOpacity onPress={addEntry} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScrollView}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Title (Optional)</Text>
              <TextInput
                style={styles.titleInput}
                placeholder="Brief summary..."
                placeholderTextColor="#9CA3AF"
                value={newTitle}
                onChangeText={setNewTitle}
                maxLength={200}
              />
            </View>

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
  dumpedCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
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
  moodEmoji: {
    fontSize: 24,
    marginRight: 8,
    marginTop: 2,
  },
  thoughtSection: {
    flex: 1,
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
  },
  solutionSection: {
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
  },
  entryFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  dumpButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  dumpButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  dumpedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dumpedText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
    marginLeft: 4,
  },
  syncStatusContainer: {
    alignItems: "flex-end",
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
  titleInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#374151",
    backgroundColor: "#FFFFFF",
    minHeight: 50,
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
    textAlignVertical: "top",
  },
});