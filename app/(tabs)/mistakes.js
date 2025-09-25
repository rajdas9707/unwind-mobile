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
// import { AuthContext } from "../../context/AuthProvider";

// Import new storage layer
import {
  fetchRecentMistakesEntries,
  fetchMistakesByDate,
  createMistakeEntryLocal,
  syncMistakeEntryToServer,
  syncAllMistakesEntries,
  deleteMistakeEntryLocal,
  getUnsyncedMistakesCount,
  canCreateMistakeEntryToday,
  canSyncMistakesToday,
  getMistakeCategories,
  getCategoryColor,
  getCategoryEmoji,
} from "../../storage/mistakes/storage";

// Removed database health utilities

export default function MistakesScreen() {
  // const { isReady } = useDatabaseReady();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newLesson, setNewLesson] = useState("");
  const [newCategory, setNewCategory] = useState("Other");
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
    let isMounted = true;

    const loadEntriesWithGuard = async () => {
      if (!isMounted) return;

      setLoading(true);

      try {
        let loadedEntries;

        if (selectedDate) {
          console.log("Loading mistakes entries for date:", selectedDate);
          loadedEntries = await fetchMistakesByDate(selectedDate);
        } else {
          console.log("Loading recent mistakes entries");
          loadedEntries = await fetchRecentMistakesEntries(10);
        }

        if (isMounted) {
          console.log("Loaded mistakes entries:", loadedEntries);
          setEntries(loadedEntries || []);

          // Update unsynced count
          await updateUnsyncedCount();
        }
      } catch (error) {
        if (!isMounted) return;

        console.error("Error loading mistakes entries:", error);

        // Check if it's a database lock error
        if (error.message && error.message.includes("database is locked")) {
          showAlert(
            "Database Busy",
            "The database is currently busy. Please try again in a moment.",
            [
              {
                text: "Retry",
                onPress: () => setTimeout(() => loadEntriesWithGuard(), 1000),
              },
            ]
          );
        } else {
          showAlert(
            "Error",
            "Failed to load mistakes entries: " +
              (error.message || "Unknown error")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEntriesWithGuard();

    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Refresh data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      isScreenActiveRef.current = true;
      let isMounted = true;

      const fetchData = async () => {
        if (!isMounted) return;

        setLoading(true);

        try {
          let loadedEntries;

          if (selectedDate) {
            console.log("Loading mistakes entries for date:", selectedDate);
            loadedEntries = await fetchMistakesByDate(selectedDate);
          } else {
            console.log("Loading recent mistakes entries");
            loadedEntries = await fetchRecentMistakesEntries(10);
          }

          if (isMounted) {
            console.log("Loaded mistakes entries:", loadedEntries);
            setEntries(loadedEntries || []);

            // Update unsynced count
            await updateUnsyncedCount();
          }
        } catch (error) {
          if (!isMounted) return;

          console.error("Error loading mistakes entries:", error);

          // Check if it's a database lock error
          if (error.message && error.message.includes("database is locked")) {
            showAlert(
              "Database Busy",
              "The database is currently busy. Please try again in a moment.",
              [
                {
                  text: "Retry",
                  onPress: () => setTimeout(() => fetchData(), 1000),
                },
              ]
            );
          } else {
            showAlert(
              "Error",
              "Failed to load mistakes entries: " +
                (error.message || "Unknown error")
            );
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      fetchData();

      // Cleanup function
      return () => {
        isMounted = false;
        isScreenActiveRef.current = false;
        console.log("Screen is losing focus, resetting selectedDate to null.");
        setSelectedDate(null);
      };
    }, [selectedDate])
  );

  // Update unsynced count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updateUnsyncedCount();
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Update the count of unsynced entries
  const updateUnsyncedCount = async () => {
    setIsUpdatingUnsyncedCount(true);
    try {
      const count = await getUnsyncedMistakesCount();
      setPendingSyncCount(count);
    } catch (error) {
      console.error("Error updating unsynced mistakes count:", error);
    } finally {
      setIsUpdatingUnsyncedCount(false);
    }
  };

  // Sync all pending entries
  const syncPendingEntries = async () => {
    try {
      // Check if online
      if (!isOnline) {
        showAlert(
          "No Internet Connection",
          "Please check your connection and try again.",
          [{ text: "OK" }]
        );
        return;
      }

      // idToken check removed, handled in client.js

      // Start syncing
      setIsSyncingAll(true);

      try {
        const result = await syncAllMistakesEntries();

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
        setLoading(true);
        try {
          let loadedEntries;

          if (selectedDate) {
            console.log("Loading mistakes entries for date:", selectedDate);
            loadedEntries = await fetchMistakesByDate(selectedDate);
          } else {
            console.log("Loading recent mistakes entries");
            loadedEntries = await fetchRecentMistakesEntries(10);
          }

          console.log("Loaded mistakes entries:", loadedEntries);
          setEntries(loadedEntries || []);

          // Update unsynced count
          await updateUnsyncedCount();
        } catch (error) {
          logError("Error loading mistakes entries:", error);
        } finally {
          setLoading(false);
        }
      } catch (error) {
        logError("Error syncing all entries:", error);
        showAlert(
          "Sync Failed",
          error.message || "Failed to sync entries. Please try again later."
        );
      } finally {
        setIsSyncingAll(false);
      }
    } catch (e) {
      logError("Error in syncPendingEntries:", e);
      setIsSyncingAll(false);
    }
  };

  // Sync a single entry to the server
  const manualSync = async (entry) => {
    if (entry.synced) return;

    console.log("Starting manual sync for mistakes entry:", entry);

    // Check network status before attempting sync
    if (!isOnline) {
      showAlert(
        "No Network Connection",
        "Please check your internet connection and try again.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      // Check daily sync limit
      const canSync = await canSyncMistakesToday();
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

      // Use the new sync function
      await syncMistakeEntryToServer({ entry });

      // Refresh the entries list
      setLoading(true);
      try {
        let loadedEntries;

        if (selectedDate) {
          console.log("Loading mistakes entries for date:", selectedDate);
          loadedEntries = await fetchMistakesByDate(selectedDate);
        } else {
          console.log("Loading recent mistakes entries");
          loadedEntries = await fetchRecentMistakesEntries(10);
        }

        console.log("Loaded mistakes entries:", loadedEntries);
        setEntries(loadedEntries || []);

        // Update unsynced count
        await updateUnsyncedCount();
      } catch (error) {
        logError("Error loading mistakes entries:", error);
      } finally {
        setLoading(false);
      }

      // Show success message
      showAlert(
        "Sync Successful",
        "Your mistake entry has been saved to the cloud!",
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

  // Navigate to mistake detail screen
  const viewMistakeEntry = (entry) => {
    router.push(`/mistakes/${entry.id}`);
  };

  // Add a new mistake entry
  const addEntry = async () => {
    if (!newDescription.trim()) {
      showAlert("Error", "Please describe what happened");
      return;
    }

    setIsAddingEntry(true);

    try {
      // Create entry locally - error handling is now centralized
      const entry = await createMistakeEntryLocal({
        description: newDescription.trim(),
        lesson: newLesson.trim(),
        category: newCategory,
      });

      // Reset form and close modal
      setNewDescription("");
      setNewLesson("");
      setNewCategory("Other");
      setShowAddModal(false);

      // Add to current entries list
      setEntries([entry, ...entries]);

      // Update unsynced count
      await updateUnsyncedCount();

      // Show appropriate alert based on network status
      if (!isOnline) {
        showAlert(
          "Entry Saved Offline",
          "Your mistake entry has been saved locally. It will be synced when you're back online.",
          [{ text: "OK" }]
        );
        return;
      }

      // Try to sync immediately if online
      if (isOnline) {
        setSyncingEntries((prev) => new Set(prev).add(entry.id));

        try {
          await syncMistakeEntryToServer({ entry });
          // Refresh the list
          setLoading(true);
          try {
            let loadedEntries;

            if (selectedDate) {
              console.log("Loading mistakes entries for date:", selectedDate);
              loadedEntries = await fetchMistakesByDate(selectedDate);
            } else {
              console.log("Loading recent mistakes entries");
              loadedEntries = await fetchRecentMistakesEntries(10);
            }

            console.log("Loaded mistakes entries:", loadedEntries);
            setEntries(loadedEntries || []);

            // Update unsynced count
            await updateUnsyncedCount();
          } catch (error) {
            logError("Error loading mistakes entries:", error);
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
      logError("Error adding entry:", error);
      showAlert("Error", error.message || "Failed to create mistake entry");
    } finally {
      setIsAddingEntry(false);
    }
  };

  // Delete a mistake entry
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
            await deleteMistakeEntryLocal({ entry });

            // Update unsynced count
            await updateUnsyncedCount();
          } catch (error) {
            logError("Error deleting entry:", error);
            showAlert("Error", "Failed to delete entry");
            // Refresh the list to show the entry again if deletion failed
            setLoading(true);
            try {
              let loadedEntries;

              if (selectedDate) {
                console.log("Loading mistakes entries for date:", selectedDate);
                loadedEntries = await fetchMistakesByDate(selectedDate);
              } else {
                console.log("Loading recent mistakes entries");
                loadedEntries = await fetchRecentMistakesEntries(10);
              }

              console.log("Loaded mistakes entries:", loadedEntries);
              setEntries(loadedEntries || []);

              // Update unsynced count
              await updateUnsyncedCount();
            } catch (error) {
              logError("Error loading mistakes entries:", error);
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
      const date = entry.created_at.split("T")[0];
      marked[date] = {
        marked: true,
        dotColor: "#F59E0B",
        selectedColor: "#F59E0B",
      };
    });
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: "#F59E0B",
      };
    }
    return marked;
  };

  const renderCategoryPicker = () => {
    const categories = getMistakeCategories();
    return (
      <View style={styles.categoryPicker}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryOption,
              { backgroundColor: getCategoryColor(category) },
              newCategory === category && styles.selectedCategory,
            ]}
            onPress={() => setNewCategory(category)}
          >
            <Text style={styles.categoryEmoji}>
              {getCategoryEmoji(category)}
            </Text>
            <Text style={styles.categoryText}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

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

  useFocusEffect(
    React.useCallback(() => {
      isScreenActiveRef.current = true;
      return () => {
        isScreenActiveRef.current = false;
      };
    }, [])
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Mistakes</Text>
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
            <Ionicons name="calendar" size={20} color="#F59E0B" />
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
          {isUpdatingUnsyncedCount && (
            <ActivityIndicator
              size="small"
              color="#F59E0B"
              style={{ marginLeft: 8 }}
            />
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={styles.loadingText}>Loading entries...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="shield-checkmark-outline"
                size={48}
                color="#9CA3AF"
              />
              <Text style={styles.emptyStateText}>No mistake entries yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Learn and grow from your experiences
              </Text>
            </View>
          ) : (
            entries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => viewMistakeEntry(entry)}
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
                          <ActivityIndicator size="small" color="#F59E0B" />
                        ) : (
                          <Ionicons
                            name="cloud-upload-outline"
                            size={18}
                            color="#F59E0B"
                          />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.categoryRow}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: getCategoryColor(entry.category) },
                    ]}
                  >
                    <Text style={styles.categoryBadgeEmoji}>
                      {getCategoryEmoji(entry.category)}
                    </Text>
                    <Text style={styles.categoryBadgeText}>
                      {entry.category.charAt(0).toUpperCase() +
                        entry.category.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.contentSection}>
                  <Text style={styles.contentLabel}>What happened:</Text>
                  <Text style={styles.contentText}>{entry.description}</Text>
                </View>

                {entry.lesson && (
                  <View style={styles.lessonSection}>
                    <Text style={styles.lessonLabel}>Lesson learned:</Text>
                    <Text style={styles.lessonText}>{entry.lesson}</Text>
                  </View>
                )}

                <View style={styles.entryFooter}>
                  <View style={styles.syncStatusContainer}>
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
                        <ActivityIndicator size="small" color="#F59E0B" />
                        <Text style={styles.syncingText}>Syncing...</Text>
                      </View>
                    ) : (
                      <View style={styles.syncStatus}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color="#F59E0B"
                        />
                        <Text style={styles.unsyncedText}>Pending sync</Text>
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
            <Text style={styles.modalTitle}>Log Mistake</Text>
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

          <ScrollView style={styles.modalScrollView}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Category</Text>
              {renderCategoryPicker()}
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>What happened?</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Describe what went wrong..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                value={newDescription}
                onChangeText={setNewDescription}
                textAlignVertical="top"
                autoFocus
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                What did you learn? (Optional)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="What will you do differently next time?"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={newLesson}
                onChangeText={setNewLesson}
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
              selectedDayBackgroundColor: "#F59E0B",
              selectedDayTextColor: "#FFFFFF",
              todayTextColor: "#F59E0B",
              dayTextColor: "#2D3748",
              textDisabledColor: "#CBD5E0",
              dotColor: "#F59E0B",
              selectedDotColor: "#FFFFFF",
              arrowColor: "#F59E0B",
              monthTextColor: "#2D3748",
              indicatorColor: "#F59E0B",
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
    backgroundColor: "#F59E0B",
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
    backgroundColor: "#FEF3C7",
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
  categoryRow: {
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  categoryBadgeEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  contentSection: {
    marginBottom: 12,
  },
  contentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F59E0B",
    marginBottom: 4,
  },
  contentText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  lessonSection: {
    marginBottom: 12,
  },
  lessonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
    marginBottom: 4,
  },
  lessonText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  entryFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
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
    backgroundColor: "#F59E0B",
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
    backgroundColor: "#F59E0B",
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
  syncingText: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "500",
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
  categoryPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 4,
  },
  selectedCategory: {
    borderWidth: 2,
    borderColor: "#374151",
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
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
