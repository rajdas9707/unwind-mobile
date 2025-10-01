import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Animated,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { getAllReminders } from "../../storage/waterreminder/db.js";
import { testDatabase } from "../../storage/waterreminder/test-db.js";
import {
  createWaterReminder,
  updateWaterReminder,
  deleteWaterReminder,
  formatReminderName,
  formatInterval,
  calculateCheckpoints,
  getCurrentTime,
} from "../../storage/waterreminder/storage.js";
import { AuthContext } from "../../context/AuthProvider.js";
// initTable is now called once in tabs layout startup

const { width } = Dimensions.get("window");

export default function IdeaScreen() {
  const { user } = useContext(AuthContext);
  const capitalize = (str) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  // const [userInfo, setUserInfo] = useState({});
  const [taskCount, setTaskCount] = useState(0);

  // Water reminder states
  const [waterReminders, setWaterReminders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fabScale] = useState(new Animated.Value(1));

  // Form states
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("20:00");
  const [intervalValue, setIntervalValue] = useState(2);
  const [intervalUnit, setIntervalUnit] = useState("hours");
  const [quantity, setQuantity] = useState(250);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const motivationalQuotes = [
    "Progress, not perfection.",
    "Small steps lead to big changes.",
    "Clarity comes from action, not thought.",
    "Your potential is endless.",
    "Every day is a new opportunity.",
  ];

  const taskCategories = [
    {
      id: 1,
      title: "2-Minute Tasks",
      subtitle: "Quick wins",
      icon: "timer",
      color: "#10B981",
      route: "tasks/2-Minute",
    },
    {
      id: 2,
      title: "Urgent Tasks",
      subtitle: "Act now",
      icon: "alert-circle",
      color: "#EF4444",
      route: "tasks/Urgent",
    },
    {
      id: 3,
      title: "Important Tasks",
      subtitle: "Focus deeply",
      icon: "star",
      color: "#8B5CF6",
      route: "tasks/Important",
    },
    {
      id: 4,
      title: "Low Energy Tasks",
      subtitle: "Gentle progress",
      icon: "moon",
      color: "#3B82F6",
      route: "tasks/Low Energy",
    },
  ];

  const quickActions = [
    {
      id: 1,
      title: "5-Minute Meditation",
      subtitle: "Clear your mind",
      icon: "heart",
      color: "#EF4444",
      click: () => {
        console.log("clicked meditation");
        router.push("/meditation");
      },
    },
    {
      id: 2,
      title: "My documents",
      subtitle: "Organize your day",
      icon: "checkmark-circle",
      color: "#10B981",
      click: () => router.push("/document"),
    },
    {
      id: 3,
      title: "My ideas",
      subtitle: "Review your progress",
      icon: "trending-up",
      color: "#8B5CF6",
      click: () => {
        console.log("clicked idea");

        router.push("/idea");
      },
    },
    {
      id: 4,
      title: "Set Reminder",
      subtitle: "Schedule reminders easily",
      icon: "notifications-circle",
      color: "#F59E0B",
      click: () => router.push("/reminder"),
    },
    {
      id: 5,
      title: "Shopping Lists",
      subtitle: "Organize your purchases",
      icon: "bag",
      color: "#06B6D4",
      click: () => router.push("/thingsToBuy"),
    },
    {
      id: 6,
      title: "Topics",
      subtitle: "Topics to read",
      icon: "book",
      color: "#06B6D4",
      click: () => router.push("/topic"),
    },
    {
      id: 7,
      title: "Pomodoro Timer",
      subtitle: "Focus with technique",
      icon: "timer",
      color: "#FF6B6B",
      click: () => router.push("/pomodoro"),
    },
  ];

  const guides = [
    {
      id: 1,
      title: "Managing Overthinking",
      description: "Learn techniques to break the cycle of overthinking",
    },
    {
      id: 2,
      title: "Learning from Mistakes",
      description: "Transform setbacks into growth opportunities",
    },
    {
      id: 3,
      title: "Journaling for Clarity",
      description: "Effective writing techniques for self-discovery",
    },
    {
      id: 4,
      title: "Mindful Living",
      description: "Practices for present-moment awareness",
    },
  ];

  const animateFAB = () => {
    Animated.sequence([
      Animated.timing(fabScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fabScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openModal = (reminder = null) => {
    setEditingReminder(reminder);
    if (reminder) {
      setStartTime(reminder.start_time);
      setEndTime(reminder.end_time);
      setIntervalValue(reminder.interval_value);
      setIntervalUnit(reminder.interval_unit);
      setQuantity(reminder.quantity);
    } else {
      // Reset to defaults
      const now = new Date();
      const hh = now.getHours().toString().padStart(2, "0");
      const mm = now.getMinutes().toString().padStart(2, "0");
      setStartTime(`${hh}:${mm}`);
      setEndTime(`${hh}:${mm}`);
      setIntervalValue(2);
      setIntervalUnit("hours");
      setQuantity(250);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingReminder(null);
  };

  const handleSaveReminder = async () => {
    try {
      setLoading(true);

      const reminderData = {
        startTime,
        endTime,
        intervalValue,
        intervalUnit,
        quantity,
      };

      if (editingReminder) {
        await updateWaterReminder(editingReminder.id, reminderData);
        Alert.alert("Success", "Water reminder updated successfully!");
      } else {
        await createWaterReminder(reminderData);
        Alert.alert("Success", "Water reminder created successfully!");
      }

      // Reload reminders
      const reminders = await getAllReminders();
      setWaterReminders(reminders);
      closeModal();
    } catch (error) {
      console.error("Error saving reminder:", error);
      Alert.alert("Error", error.message || "Failed to save reminder");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    Alert.alert(
      "Delete Reminder",
      "Are you sure you want to delete this water reminder? This will also cancel all scheduled notifications.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWaterReminder(reminderId);
              const reminders = await getAllReminders();
              setWaterReminders(reminders);
              Alert.alert("Success", "Water reminder deleted successfully!");
            } catch (error) {
              console.error("Error deleting reminder:", error);
              Alert.alert("Error", "Failed to delete reminder");
            }
          },
        },
      ]
    );
  };

  const formatTimeForDisplay = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  };

  const handleTimeChange = (event, selectedTime, isStart = true) => {
    if (event.type === "set" && selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, "0");
      const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
      const timeString = `${hours}:${minutes}`;

      if (isStart) {
        setStartTime(timeString);
        setShowStartPicker(false);
      } else {
        setEndTime(timeString);
        setShowEndPicker(false);
      }
    } else {
      setShowStartPicker(false);
      setShowEndPicker(false);
    }
  };

  const renderWaterReminderCard = (reminder) => {
    const checkpoints = calculateCheckpoints(
      reminder.start_time,
      reminder.end_time,
      reminder.interval_value,
      reminder.interval_unit
    );

    return (
      <TouchableOpacity
        key={reminder.id}
        style={styles.waterReminderCard}
        onPress={() => router.push(`/reminder/${reminder.id}`)}
      >
        <LinearGradient
          colors={["#3B82F6", "#1D4ED8"]}
          style={styles.waterReminderGradient}
        >
          <View style={styles.waterReminderHeader}>
            <View style={styles.waterReminderIcon}>
              <Ionicons name="water" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.waterReminderActions}>
              <TouchableOpacity
                style={styles.waterReminderActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  openModal(reminder);
                }}
              >
                <Ionicons name="pencil" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.waterReminderActionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteReminder(reminder.id);
                }}
              >
                <Ionicons name="trash" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.waterReminderTitle}>
            {formatReminderName(reminder.start_time, reminder.end_time)}
          </Text>

          <View style={styles.waterReminderDetails}>
            <View style={styles.waterReminderDetail}>
              <Ionicons
                name="time"
                size={14}
                color="rgba(255, 255, 255, 0.8)"
              />
              <Text style={styles.waterReminderDetailText}>
                {formatInterval(
                  reminder.interval_value,
                  reminder.interval_unit
                )}
              </Text>
            </View>
            <View style={styles.waterReminderDetail}>
              <Ionicons
                name="water"
                size={14}
                color="rgba(255, 255, 255, 0.8)"
              />
              <Text style={styles.waterReminderDetailText}>
                {reminder.quantity}ml
              </Text>
            </View>
            <View style={styles.waterReminderDetail}>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color="rgba(255, 255, 255, 0.8)"
              />
              <Text style={styles.waterReminderDetailText}>
                {checkpoints.length} checkpoints
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{`Good morning ${capitalize(
            user?.name
          )} !`}</Text>
          <Text style={styles.subtitle}>How are you feeling today?</Text>
        </View>

        <View style={styles.quoteCard}>
          <View style={styles.quoteIconContainer}>
            <Ionicons name="bulb" size={24} color="#F59E0B" />
          </View>
          <Text style={styles.quote}>
            {
              motivationalQuotes[
                Math.floor(Math.random() * motivationalQuotes.length)
              ]
            }
          </Text>
        </View>

        {/* Water Reminders Section */}
        {waterReminders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Water Reminders 💧</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.waterRemindersContainer}
            >
              {waterReminders.map(renderWaterReminderCard)}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mindful Tasks</Text>
          <View style={styles.taskGrid}>
            {taskCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.taskCard}
                onPress={() => router.push(category.route)}
              >
                <View
                  style={[
                    styles.taskIcon,
                    { backgroundColor: category.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={category.icon}
                    size={24}
                    color={category.color}
                  />
                </View>
                <Text style={styles.taskTitle}>{category.title}</Text>
                <Text style={styles.taskSubtitle}>{category.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionCard}
                onPress={action.click}
              >
                <View
                  style={[
                    styles.actionIcon,
                    { backgroundColor: action.color + "20" },
                  ]}
                >
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Guides & Tutorials</Text>
          {guides.map((guide) => (
            <TouchableOpacity key={guide.id} style={styles.guideCard}>
              <View style={styles.guideContent}>
                <Text style={styles.guideTitle}>{guide.title}</Text>
                <Text style={styles.guideDescription}>{guide.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressItem}>
              <Ionicons name="book" size={20} color="#3B82F6" />
              <Text style={styles.progressLabel}>Journal Entries</Text>
              <Text style={styles.progressValue}>2</Text>
            </View>
            <View style={styles.progressItem}>
              <Ionicons name="bulb" size={20} color="#8B5CF6" />
              <Text style={styles.progressLabel}>Thoughts Released</Text>
              <Text style={styles.progressValue}>1</Text>
            </View>
            <View style={styles.progressItem}>
              <Ionicons name="checkbox" size={20} color="#10B981" />
              <Text style={styles.progressLabel}>Tasks Completed</Text>
              <Text style={styles.progressValue}>{taskCount}</Text>
            </View>
            <View style={styles.progressItem}>
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text style={styles.progressLabel}>Mistakes Avoided</Text>
              <Text style={styles.progressValue}>3</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fab,
          {
            transform: [{ scale: fabScale }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => {
            animateFAB();
            openModal();
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#06B6D4", "#0891B2"]}
            style={styles.fabGradient}
          >
            <Ionicons name="water" size={28} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Water Reminder Modal */}
      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={["#FFFFFF", "#F8FAFC"]}
              style={styles.modalContent}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={closeModal}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editingReminder
                    ? "Edit Water Reminder"
                    : "Create Water Reminder"}
                </Text>
                <View style={styles.modalHeaderSpacer} />
              </View>

              <ScrollView
                style={styles.modalForm}
                showsVerticalScrollIndicator={false}
              >
                {/* Time Pickers */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Schedule</Text>

                  <View style={styles.timePickerRow}>
                    <View style={styles.timePickerContainer}>
                      <Text style={styles.inputLabel}>Start Time</Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => setShowStartPicker(true)}
                      >
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color="#6B7280"
                        />
                        <Text style={styles.timePickerText}>
                          {formatTimeForDisplay(startTime)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.timePickerContainer}>
                      <Text style={styles.inputLabel}>End Time</Text>
                      <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => setShowEndPicker(true)}
                      >
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color="#6B7280"
                        />
                        <Text style={styles.timePickerText}>
                          {formatTimeForDisplay(endTime)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Interval Section */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Reminder Interval</Text>

                  <View style={styles.intervalRow}>
                    <View style={styles.intervalValueContainer}>
                      <Text style={styles.inputLabel}>Every</Text>
                      <TextInput
                        style={styles.intervalInput}
                        value={intervalValue.toString()}
                        onChangeText={(text) => {
                          const num = parseInt(text) || 1;
                          setIntervalValue(Math.max(1, Math.min(24, num)));
                        }}
                        keyboardType="numeric"
                        maxLength={2}
                      />
                    </View>

                    <View style={styles.intervalUnitContainer}>
                      <Text style={styles.inputLabel}>Unit</Text>
                      <View style={styles.pickerContainer}>
                        <Picker
                          selectedValue={intervalUnit}
                          onValueChange={setIntervalUnit}
                          style={styles.picker}
                        >
                          <Picker.Item label="Minutes" value="minutes" />
                          <Picker.Item label="Hours" value="hours" />
                        </Picker>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Water Quantity */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Water Quantity</Text>
                  <View style={styles.quantityContainer}>
                    <TextInput
                      style={styles.quantityInput}
                      value={quantity.toString()}
                      onChangeText={(text) => {
                        const num = parseInt(text) || 50;
                        setQuantity(Math.max(50, Math.min(1000, num)));
                      }}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                    <Text style={styles.quantityLabel}>ml per reminder</Text>
                  </View>
                </View>

                {/* Preview */}
                <View style={styles.formSection}>
                  <Text style={styles.formSectionTitle}>Preview</Text>
                  <View style={styles.previewContainer}>
                    <Text style={styles.previewText}>
                      You'll be reminded to drink {quantity}ml of water{" "}
                      {formatInterval(
                        intervalValue,
                        intervalUnit
                      ).toLowerCase()}{" "}
                      from {formatTimeForDisplay(startTime)} to{" "}
                      {formatTimeForDisplay(endTime)}.
                    </Text>
                    <Text style={styles.previewCheckpoints}>
                      Total checkpoints:{" "}
                      {
                        calculateCheckpoints(
                          startTime,
                          endTime,
                          intervalValue,
                          intervalUnit
                        ).length
                      }
                    </Text>
                  </View>
                </View>
              </ScrollView>

              {/* Modal Actions */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={closeModal}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSaveButton,
                    loading && styles.modalSaveButtonDisabled,
                  ]}
                  onPress={handleSaveReminder}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={
                      loading ? ["#D1D5DB", "#D1D5DB"] : ["#3B82F6", "#1D4ED8"]
                    }
                    style={styles.modalSaveGradient}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSaveText}>
                        {editingReminder
                          ? "Update Reminder"
                          : "Create Reminder"}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Time Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = startTime.split(":").map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date;
          })()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedTime) =>
            handleTimeChange(event, selectedTime, true)
          }
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={(() => {
            const [hours, minutes] = endTime.split(":").map(Number);
            const date = new Date();
            date.setHours(hours, minutes, 0, 0);
            return date;
          })()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, selectedTime) =>
            handleTimeChange(event, selectedTime, false)
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
  },
  quoteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quoteIconContainer: {
    marginRight: 12,
  },
  quote: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  taskGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    width: (width - 48) / 2,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  taskSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  actionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    width: (width - 48) / 2,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  guideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  guideDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  progressLabel: {
    flex: 1,
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 12,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },

  // Water Reminder Styles
  waterRemindersContainer: {
    paddingLeft: 16,
    paddingRight: 16,
  },
  waterReminderCard: {
    marginRight: 16,
    width: width * 0.8,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  waterReminderGradient: {
    padding: 20,
  },
  waterReminderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  waterReminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  waterReminderActions: {
    flexDirection: "row",
  },
  waterReminderActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  waterReminderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
  },
  waterReminderDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  waterReminderDetail: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  waterReminderDetailText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginLeft: 4,
    fontWeight: "500",
  },

  // FAB Styles
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    zIndex: 1000,
  },
  fabButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: "100%",
    height: "100%",
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
    maxHeight: "90%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  modalContent: {
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  modalHeaderSpacer: {
    width: 40,
  },
  modalForm: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  timePickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  timePickerContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  timePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
  },
  timePickerText: {
    fontSize: 16,
    color: "#1F2937",
    marginLeft: 8,
    fontWeight: "500",
  },
  intervalRow: {
    flexDirection: "row",
    gap: 12,
  },
  intervalValueContainer: {
    flex: 1,
  },
  intervalInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    textAlign: "center",
  },
  intervalUnitContainer: {
    flex: 2,
  },
  pickerContainer: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  picker: {
    height: 50,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    textAlign: "center",
    width: 80,
  },
  quantityLabel: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  previewContainer: {
    backgroundColor: "#EBF4FF",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  previewText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
    marginBottom: 8,
  },
  previewCheckpoints: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  modalSaveButton: {
    flex: 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
