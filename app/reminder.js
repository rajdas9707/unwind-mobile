import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  ScrollView,
  Animated,
  Alert,
} from "react-native";
import * as SQLite from "expo-sqlite";
import * as Notifications from "expo-notifications";
import { Calendar } from "react-native-calendars";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TopBarToggle from "../components/shared/TopBarToggle";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width, height } = Dimensions.get("window");

// ✅ Configure notifications (important for Android)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function ReminderScreen() {
  const [reminders, setReminders] = useState([]);
  const [selectedKey, setSelectedKey] = useState("today"); // 'today' => Upcoming, 'backlogs' => Missed
  const [modalVisible, setModalVisible] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [hour, setHour] = useState("12");
  const [minute, setMinute] = useState("00");
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef();
  const modalScrollRef = useRef();
  const dbRef = useRef(null);

  // Get database connection
  const getDatabase = async () => {
    if (!dbRef.current) {
      dbRef.current = await SQLite.openDatabaseAsync("remindertask.db");
    }
    return dbRef.current;
  };

  // Create table on first load
  useEffect(() => {
    const initDatabase = async () => {
      try {
        const db = await getDatabase();
        await db.execAsync(
          "CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, datetime TEXT);"
        );
        await fetchReminders();
      } catch (error) {
        console.error("Database initialization error:", error);
      }
    };

    initDatabase();
    initializeDefaults();

    // Android Notification Channel
    Notifications.setNotificationChannelAsync("reminder-channel", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }, []);

  const initializeDefaults = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const dd = now.getDate().toString().padStart(2, "0");
    setSelectedDate(`${yyyy}-${mm}-${dd}`); // Local date (no UTC shift)
    setHour(now.getHours().toString().padStart(2, "0"));
    setMinute(now.getMinutes().toString().padStart(2, "0"));
  };

  // Fetch all reminders
  const fetchReminders = async () => {
    try {
      const db = await getDatabase();
      const result = await db.getAllAsync(
        "SELECT * FROM reminders ORDER BY datetime ASC"
      );
      setReminders(result);
    } catch (error) {
      console.error("Error fetching reminders:", error);
    }
  };

  const upcoming = useMemo(() => {
    const now = new Date();
    return reminders.filter((r) => new Date(r.datetime) > now);
  }, [reminders]);

  const missed = useMemo(() => {
    const now = new Date();
    return reminders.filter((r) => new Date(r.datetime) <= now);
  }, [reminders]);

  const visibleReminders = useMemo(() => {
    return selectedKey === "backlogs" ? missed : upcoming;
  }, [selectedKey, upcoming, missed]);

  // Modal animation helpers
  const openModal = (useDefaults = true) => {
    console.log("Opening modal...");
    setModalVisible(true);
    modalAnimation.setValue(0);
    // Set defaults to current local date and time when opening (only for new reminder)
    if (useDefaults) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = (now.getMonth() + 1).toString().padStart(2, "0");
      const dd = now.getDate().toString().padStart(2, "0");
      setSelectedDate(`${yyyy}-${mm}-${dd}`);
      setHour(now.getHours().toString().padStart(2, "0"));
      setMinute(now.getMinutes().toString().padStart(2, "0"));
    }
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      resetForm();
    });
  };

  const resetForm = () => {
    setTaskName("");
    setTaskDesc("");
    setShowCalendar(false);
    setShowTimePicker(false);
    setIsEditing(false);
    setEditingId(null);
    const today = new Date();
    setSelectedDate(today.toISOString().split("T")[0]);
    setHour(today.getHours().toString().padStart(2, "0"));
    setMinute(today.getMinutes().toString().padStart(2, "0"));
  };

  const handleReminderTimeChange = (event, selectedTime) => {
    if (event.type === "set" && selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, "0");
      const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
      const candidate = new Date(`${selectedDate}T${hours}:${minutes}:00`);
      const now = new Date();
      if (candidate <= now) {
        Alert.alert("Invalid Time", "Please choose a future time.");
      } else {
        setHour(hours);
        setMinute(minutes);
      }
    }
    setShowTimePicker(false);
  };

  // Add or update reminder
  const addReminder = async () => {
    if (!taskName.trim()) {
      Alert.alert("Missing Field", "Task name is required.");
      return;
    }
    if (!selectedDate) {
      Alert.alert("Missing Field", "Please select a date.");
      return;
    }
    if (!hour || !minute) {
      Alert.alert("Missing Field", "Please select a valid time.");
      return;
    }

    const datetime = `${selectedDate}T${hour}:${minute}:00`;
    const reminderDate = new Date(datetime);
    if (isNaN(reminderDate.getTime())) {
      Alert.alert("Invalid Date/Time", "Please choose a valid date and time.");
      return;
    }
    if (reminderDate <= new Date()) {
      Alert.alert("Invalid Date/Time", "Please choose a future date and time.");
      return;
    }

    try {
      const db = await getDatabase();

      if (isEditing && editingId) {
        // Update existing reminder
        await db.runAsync(
          "UPDATE reminders SET name = ?, description = ?, datetime = ? WHERE id = ?",
          [taskName, taskDesc, reminderDate.toISOString(), editingId]
        );
      } else {
        // Add new reminder
        await db.runAsync(
          "INSERT INTO reminders (name, description, datetime) VALUES (?, ?, ?)",
          [taskName, taskDesc, reminderDate.toISOString()]
        );

        // Schedule local notification
        if (reminderDate > new Date()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: taskName,
              body: taskDesc || "Reminder!",
            },
            trigger: reminderDate,
          });
        }
      }

      await fetchReminders();
      closeModal();
    } catch (error) {
      console.error("Error adding/updating reminder:", error);
    }
  };

  // Edit reminder
  const editReminder = (reminder) => {
    console.log("Edit button pressed for:", reminder.id);
    const reminderDate = new Date(reminder.datetime);
    setTaskName(reminder.name);
    setTaskDesc(reminder.description);
    setSelectedDate(reminderDate.toISOString().split("T")[0]);
    setHour(reminderDate.getHours().toString().padStart(2, "0"));
    setMinute(reminderDate.getMinutes().toString().padStart(2, "0"));
    setIsEditing(true);
    setEditingId(reminder.id);
    openModal(false);
  };

  // Delete reminder
  const deleteReminder = async (id) => {
    try {
      const db = await getDatabase();
      await db.runAsync("DELETE FROM reminders WHERE id = ?", [id]);
      await fetchReminders();
    } catch (error) {
      console.error("Error deleting reminder:", error);
    }
  };

  // Helper functions
  const isToday = (dateString) => {
    const today = new Date().toISOString().split("T")[0];
    const reminderDate = new Date(dateString).toISOString().split("T")[0];
    return today === reminderDate;
  };

  const getTimeUntil = (dateTime) => {
    const now = new Date();
    const reminderTime = new Date(dateTime);
    const diffMs = reminderTime - now;

    if (diffMs < 0) return "Past due";

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `in ${diffDays} day${diffDays > 1 ? "s" : ""}`;
    } else if (diffHours > 0) {
      return `in ${diffHours}h ${diffMinutes}m`;
    } else {
      return `in ${diffMinutes}m`;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Background Gradient */}
      <LinearGradient
        colors={["#667eea", "#764ba2", "#f093fb"]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Reminders</Text>
          <Text style={styles.headerSubtitle}>
            {reminders.length}{" "}
            {reminders.length === 1 ? "reminder" : "reminders"}
          </Text>
        </View>

        {/* Toggle and counts */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <TopBarToggle
            selected={selectedKey}
            leftText="Upcoming"
            rightText="Missed"
            counts={{ left: upcoming.length, right: missed.length }}
            primaryColor="#111827"
            activeTextColor="#FFFFFF"
            inactiveTextColor="#111827"
            backgroundColor="#FFFFFF"
            borderColor="#E5E7EB"
            containerStyle={{ width: 260, alignSelf: "center" }}
            onChange={(val) => setSelectedKey(val)}
          />
        </View>

        {/* Reminders List */}
        {visibleReminders.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.8)"]}
              style={styles.emptyStateCard}
            >
              <Ionicons name="calendar-outline" size={64} color="#667eea" />
              <Text style={styles.emptyStateText}>No {selectedKey === "backlogs" ? "Missed" : "Upcoming"} Reminders</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to add reminders and stay organized.
              </Text>
            </LinearGradient>
          </View>
        ) : (
          <FlatList
            data={visibleReminders}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: 100,
            }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isItemToday = isToday(item.datetime);
              return (
                <View style={styles.cardWrapper}>
                  <LinearGradient
                    colors={
                      isItemToday
                        ? ["#ff9a56", "#ff6b95", "#c44569"]
                        : ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.8)"]
                    }
                    style={styles.card}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text
                          style={[
                            styles.title,
                            isItemToday && styles.todayTitle,
                          ]}
                        >
                          {item.name}
                        </Text>
                        {isItemToday && (
                          <View style={styles.todayBadge}>
                            <Text style={styles.todayBadgeText}>TODAY</Text>
                          </View>
                        )}
                      </View>

                      {item.description ? (
                        <Text
                          style={[
                            styles.description,
                            isItemToday && styles.todayDescription,
                          ]}
                        >
                          {item.description}
                        </Text>
                      ) : null}

                      <View style={styles.dateTimeContainer}>
                        <View style={styles.dateTimeInfo}>
                          <Ionicons
                            name="calendar"
                            size={16}
                            color={isItemToday ? "white" : "#667eea"}
                          />
                          <Text
                            style={[
                              styles.dateText,
                              isItemToday && styles.todayText,
                            ]}
                          >
                            {new Date(item.datetime).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </Text>

                          <Ionicons
                            name="time"
                            size={16}
                            color={isItemToday ? "white" : "#f093fb"}
                          />
                          <Text
                            style={[
                              styles.timeText,
                              isItemToday && styles.todayText,
                            ]}
                          >
                            {new Date(item.datetime).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              }
                            )}
                          </Text>
                        </View>

                        <Text
                          style={[
                            styles.timeUntil,
                            isItemToday && styles.todayTimeUntil,
                          ]}
                        >
                          {getTimeUntil(item.datetime)}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[
                          styles.editBtn,
                          isItemToday && styles.todayActionBtn,
                        ]}
                        onPress={() => editReminder(item)}
                      >
                        <Ionicons
                          name="pencil"
                          size={20}
                          color={isItemToday ? "white" : "#667eea"}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.deleteBtn,
                          isItemToday && styles.todayActionBtn,
                        ]}
                        onPress={() => deleteReminder(item.id)}
                      >
                        <Ionicons
                          name="trash"
                          size={20}
                          color={isItemToday ? "white" : "#ff6b6b"}
                        />
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              );
            }}
          />
        )}

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            console.log("FAB pressed, opening modal...");
            openModal();
          }}
        >
          <LinearGradient
            colors={["#ff6b95", "#ff9a56"]}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={32} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Simple Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeModal}
      >
        <View style={styles.simpleModalContainer}>
          {/* Modal Header */}
          <View style={styles.simpleModalHeader}>
            <Text style={styles.simpleModalTitle}>
              {isEditing ? "Edit Reminder" : "New Reminder"}
            </Text>
            <TouchableOpacity
              style={styles.simpleCloseButton}
              onPress={closeModal}
            >
              <Ionicons name="close" size={24} color="#667eea" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={modalScrollRef}
            style={styles.simpleModalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Task Details Section */}
            <View style={styles.simpleFormSection}>
              <Text style={styles.simpleSectionTitle}>Task Details</Text>

              <View style={styles.simpleInputGroup}>
                <Text style={styles.simpleInputLabel}>Task Name *</Text>
                <TextInput
                  style={styles.simpleInput}
                  placeholder="Enter task name..."
                  placeholderTextColor="#999"
                  value={taskName}
                  onChangeText={setTaskName}
                />
              </View>

              <View style={styles.simpleInputGroup}>
                <Text style={styles.simpleInputLabel}>
                  Description (Optional)
                </Text>
                <TextInput
                  style={[styles.simpleInput, styles.simpleTextArea]}
                  placeholder="Add more details..."
                  placeholderTextColor="#999"
                  value={taskDesc}
                  onChangeText={setTaskDesc}
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Date & Time Section */}
            <View style={styles.simpleFormSection}>
              <Text style={styles.simpleSectionTitle}>Date & Time</Text>

              {/* Date Selector */}
              <View style={styles.simpleInputGroup}>
                <Text style={styles.simpleInputLabel}>Select Date *</Text>
                <TouchableOpacity
                  style={styles.simpleDateButton}
                  onPress={() => {
                    setShowCalendar(!showCalendar);
                    if (!showCalendar) {
                      setTimeout(
                        () =>
                          modalScrollRef.current?.scrollToEnd({
                            animated: true,
                          }),
                        100
                      );
                    }
                  }}
                >
                  <Ionicons name="calendar" size={20} color="#667eea" />
                  <Text style={styles.simpleDateText}>
                    {selectedDate
                      ? new Date(selectedDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Choose a date"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Time Selector */}
              <View style={styles.simpleInputGroup}>
                <Text style={styles.simpleInputLabel}>Select Time</Text>
                <TouchableOpacity
                  style={styles.simpleDateButton}
                  onPress={() => {
                    setShowTimePicker(!showTimePicker);
                    if (!showTimePicker) {
                      setTimeout(
                        () =>
                          modalScrollRef.current?.scrollToEnd({
                            animated: true,
                          }),
                        100
                      );
                    }
                  }}
                >
                  <Ionicons name="time" size={20} color="#667eea" />
                  <Text style={styles.simpleDateText}>
                    {new Date(
                      `2000-01-01T${hour}:${minute}:00`
                    ).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Calendar Picker */}
              {showCalendar && (
                <View style={styles.simpleCalendarContainer}>
                  <Calendar
                    onDayPress={(day) => {
                      setSelectedDate(day.dateString);
                      setShowCalendar(false);
                    }}
                    markedDates={{
                      [selectedDate]: {
                        selected: true,
                        selectedColor: "#667eea",
                        selectedTextColor: "white",
                      },
                    }}
                    theme={{
                      backgroundColor: "white",
                      calendarBackground: "white",
                      textSectionTitleColor: "#667eea",
                      selectedDayBackgroundColor: "#667eea",
                      selectedDayTextColor: "#ffffff",
                      todayTextColor: "#f093fb",
                      dayTextColor: "#2d4150",
                      textDisabledColor: "#d9e1e8",
                      arrowColor: "#667eea",
                      monthTextColor: "#667eea",
                      indicatorColor: "#667eea",
                    }}
                  />
                </View>
              )}

              {/* Time picker handled by native modal below */}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.simpleButtonContainer}>
            <TouchableOpacity
              style={styles.simpleCancelButton}
              onPress={closeModal}
            >
              <Text style={styles.simpleCancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.simpleSaveButton}
              onPress={addReminder}
            >
              <Text style={styles.simpleSaveButtonText}>
                {isEditing ? "Update" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {showTimePicker && (
        <DateTimePicker
          value={(() => {
            const date = new Date();
            date.setHours(parseInt(hour, 10) || 0, parseInt(minute, 10) || 0, 0, 0);
            return date;
          })()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleReminderTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
    paddingTop: StatusBar.currentHeight || 50,
  },

  // Header Styles
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    fontWeight: "500",
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyStateCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#667eea",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: "#8e8e93",
    textAlign: "center",
    lineHeight: 22,
  },

  // Card Styles
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c2c2e",
    flex: 1,
  },
  todayTitle: {
    color: "white",
  },
  description: {
    fontSize: 15,
    color: "#8e8e93",
    lineHeight: 21,
    marginBottom: 16,
  },
  todayDescription: {
    color: "rgba(255,255,255,0.9)",
  },
  dateTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateTimeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#667eea",
  },
  timeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#f093fb",
  },
  todayText: {
    color: "white",
  },
  timeUntil: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8e8e93",
  },
  todayTimeUntil: {
    color: "rgba(255,255,255,0.9)",
  },
  todayBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  todayBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "column",
    gap: 12,
    marginLeft: 16,
  },
  editBtn: {
    backgroundColor: "rgba(102, 126, 234, 0.15)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(102, 126, 234, 0.3)",
  },
  deleteBtn: {
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  todayActionBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.4)",
  },

  // FAB Styles
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    width: "100%",
    maxHeight: height * 0.9,
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalGradient: {
    flex: 1,
    backgroundColor: "white",
  },
  modalHeader: {
    overflow: "hidden",
  },
  modalHeaderGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: "white",
  },
  modalContent: {
    paddingVertical: 20,
  },

  // Form Styles
  formSection: {
    marginBottom: 25,
  },
  formCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c2c2e",
    marginBottom: 20,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3c3c43",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    minHeight: 50,
  },
  inputError: {
    borderColor: "#ff6b6b",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },

  // Date Time Input
  dateTimeInput: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateTimeGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  dateTimeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1d1d1f",
  },
  placeholder: {
    color: "#8e8e93",
  },
  chevronIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Calendar
  calendarContainer: {
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  calendarGradient: {
    padding: 16,
  },

  // Time Picker
  timePickerContainer: {
    marginTop: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  timePickerGradient: {
    padding: 24,
  },
  timePickerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c2c2e",
    textAlign: "center",
    marginBottom: 20,
  },
  timePickerRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  timePickerSection: {
    flex: 1,
    alignItems: "center",
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3c3c43",
    marginBottom: 12,
  },
  pickerWrapper: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(102, 126, 234, 0.2)",
    width: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  picker: {
    width: 120,
    height: 140,
  },
  doneButton: {
    alignSelf: "center",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  doneButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  // Button Container
  buttonContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
    gap: 16,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "rgba(142, 142, 147, 0.12)",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(142, 142, 147, 0.2)",
  },
  cancelButtonText: {
    color: "#3c3c43",
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  disabledButton: {
    shadowOpacity: 0.1,
    elevation: 2,
  },

  // Simple Modal Styles
  simpleModalContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  simpleModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  simpleModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  simpleCloseButton: {
    padding: 5,
  },
  simpleModalContent: {
    flex: 1,
    padding: 20,
  },
  simpleFormSection: {
    marginBottom: 30,
  },
  simpleSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 15,
  },
  simpleInputGroup: {
    marginBottom: 20,
  },
  simpleInputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#555",
    marginBottom: 8,
  },
  simpleInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  simpleTextArea: {
    height: 80,
    textAlignVertical: "top",
  },
  simpleDateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
  },
  simpleDateText: {
    fontSize: 16,
    color: "#333",
  },
  simpleButtonContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  simpleCancelButton: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  simpleCancelButtonText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  simpleSaveButton: {
    flex: 1,
    backgroundColor: "#667eea",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  simpleSaveButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },

  // Simple Calendar Styles
  simpleCalendarContainer: {
    marginTop: 10,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 10,
  },

  // Clock Style Time Picker
  clockContainer: {
    marginTop: 15,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clockTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 20,
  },
  clockFace: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 25,
  },
  clockCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#f8f9fa",
    borderWidth: 2,
    borderColor: "#e0e0e0",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  clockNumber: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  clockNumberSelected: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  clockNumberText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  clockNumberTextSelected: {
    color: "white",
  },
  clockCenter: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#667eea",
  },
  ampmContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  ampmButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  ampmButtonSelected: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  ampmText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  ampmTextSelected: {
    color: "white",
  },
  minutesContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  minutesLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
  },
  minuteControls: {
    // flexDirection: 'row',
    alignItems: "center",
    gap: 8,
  },
  minuteArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  minuteDisplay: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#667eea",
    borderRadius: 12,
    minWidth: 60,
    alignItems: "center",
  },
  minuteDisplayText: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  clockDoneButton: {
    backgroundColor: "#667eea",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  clockDoneText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
