import React, { useEffect, useState, useRef } from "react";
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
  Animated
} from "react-native";
import * as SQLite from "expo-sqlite";
import * as Notifications from "expo-notifications";
import { Calendar } from "react-native-calendars";
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Open database
const db = SQLite.openDatabase("remindertask.db");

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

  // Create table on first load
  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, datetime TEXT);"
      );
    });
    fetchReminders();
    initializeDefaults();

    // Android Notification Channel
    Notifications.setNotificationChannelAsync("reminder-channel", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }, []);

  const initializeDefaults = () => {
    const today = new Date();
    setSelectedDate(today.toISOString().split('T')[0]);
    setHour(today.getHours().toString().padStart(2, '0'));
    setMinute(today.getMinutes().toString().padStart(2, '0'));
  };

  // Fetch all reminders
  const fetchReminders = () => {
    db.transaction((tx) => {
      tx.executeSql("SELECT * FROM reminders ORDER BY datetime ASC;", [], (_, { rows }) => {
        setReminders(rows._array);
      });
    });
  };

  // Modal animation helpers
  const openModal = () => {
    console.log('Opening modal...');
    setModalVisible(true);
    Animated.timing(modalAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnimation, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
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
    setSelectedDate(today.toISOString().split('T')[0]);
    setHour(today.getHours().toString().padStart(2, '0'));
    setMinute(today.getMinutes().toString().padStart(2, '0'));
  };

  // Add or update reminder
  const addReminder = async () => {
    if (!taskName.trim() || !selectedDate) return;

    const datetime = `${selectedDate}T${hour}:${minute}:00`;
    const reminderDate = new Date(datetime);

    if (isEditing && editingId) {
      // Update existing reminder
      db.transaction((tx) => {
        tx.executeSql(
          "UPDATE reminders SET name = ?, description = ?, datetime = ? WHERE id = ?;",
          [taskName, taskDesc, reminderDate.toISOString(), editingId],
          () => {
            fetchReminders();
            closeModal();
          }
        );
      });
    } else {
      // Add new reminder
      db.transaction((tx) => {
        tx.executeSql(
          "INSERT INTO reminders (name, description, datetime) values (?, ?, ?);",
          [taskName, taskDesc, reminderDate.toISOString()],
          () => {
            fetchReminders();
            closeModal();
          }
        );
      });

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
  };

  // Edit reminder
  const editReminder = (reminder) => {
    console.log('Edit button pressed for:', reminder.id);
    const reminderDate = new Date(reminder.datetime);
    setTaskName(reminder.name);
    setTaskDesc(reminder.description);
    setSelectedDate(reminderDate.toISOString().split('T')[0]);
    setHour(reminderDate.getHours().toString().padStart(2, '0'));
    setMinute(reminderDate.getMinutes().toString().padStart(2, '0'));
    setIsEditing(true);
    setEditingId(reminder.id);
    openModal();
  };

  // Delete reminder
  const deleteReminder = (id) => {
    db.transaction((tx) => {
      tx.executeSql("DELETE FROM reminders WHERE id = ?;", [id], () => {
        fetchReminders();
      });
    });
  };

  // Helper functions
  const isToday = (dateString) => {
    const today = new Date().toISOString().split('T')[0];
    const reminderDate = new Date(dateString).toISOString().split('T')[0];
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
      return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `in ${diffHours}h ${diffMinutes}m`;
    } else {
      return `in ${diffMinutes}m`;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Reminders</Text>
          <Text style={styles.headerSubtitle}>
            {reminders.length} {reminders.length === 1 ? 'reminder' : 'reminders'}
          </Text>
        </View>

        {/* Reminders List */}
        {reminders.length === 0 ? (
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
              style={styles.emptyStateCard}
            >
              <Ionicons name="calendar-outline" size={64} color="#667eea" />
              <Text style={styles.emptyStateText}>No Reminders Yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to create your first reminder and stay organized!
              </Text>
            </LinearGradient>
          </View>
        ) : (
          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isItemToday = isToday(item.datetime);
              return (
                <View style={styles.cardWrapper}>
                  <LinearGradient
                    colors={isItemToday ? 
                      ['#ff9a56', '#ff6b95', '#c44569'] : 
                      ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']
                    }
                    style={styles.card}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <Text style={[styles.title, isItemToday && styles.todayTitle]}>
                          {item.name}
                        </Text>
                        {isItemToday && (
                          <View style={styles.todayBadge}>
                            <Text style={styles.todayBadgeText}>TODAY</Text>
                          </View>
                        )}
                      </View>
                      
                      {item.description ? (
                        <Text style={[styles.description, isItemToday && styles.todayDescription]}>
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
                          <Text style={[styles.dateText, isItemToday && styles.todayText]}>
                            {new Date(item.datetime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </Text>
                          
                          <Ionicons 
                            name="time" 
                            size={16} 
                            color={isItemToday ? "white" : "#f093fb"} 
                          />
                          <Text style={[styles.timeText, isItemToday && styles.todayText]}>
                            {new Date(item.datetime).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </Text>
                        </View>
                        
                        <Text style={[styles.timeUntil, isItemToday && styles.todayTimeUntil]}>
                          {getTimeUntil(item.datetime)}
                        </Text>
                      </View>
                    </View>
                    
                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={[styles.editBtn, isItemToday && styles.todayActionBtn]}
                        onPress={() => editReminder(item)}
                      >
                        <Ionicons 
                          name="pencil" 
                          size={20} 
                          color={isItemToday ? "white" : "#667eea"} 
                        />
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.deleteBtn, isItemToday && styles.todayActionBtn]}
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
            console.log('FAB pressed, opening modal...');
            openModal();
          }}
        >
          <LinearGradient
            colors={['#ff6b95', '#ff9a56']}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={32} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      {/* Enhanced Modal */}
      <Modal 
        visible={modalVisible} 
        animationType="slide" 
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={20} style={styles.modalOverlay}>
            <Animated.View 
              style={[
                styles.modalContainer,
                {
                  transform: [{
                    translateY: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [height, 0],
                    })
                  }]
                }
              ]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(240,248,255,0.95)']}
                style={styles.modalGradient}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.modalHeaderGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.modalTitle}>
                      {isEditing ? 'Edit Reminder' : 'New Reminder'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.closeButton}
                      onPress={closeModal}
                    >
                      <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>

                <ScrollView 
                  ref={scrollViewRef}
                  style={styles.modalScrollView}
                  contentContainerStyle={styles.modalContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Task Details Section */}
                  <View style={styles.formSection}>
                    <LinearGradient
                      colors={['rgba(102, 126, 234, 0.1)', 'rgba(240, 147, 251, 0.1)']}
                      style={styles.formCard}
                    >
                      <Text style={styles.sectionTitle}>What do you need to remember?</Text>
                      
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Task Name *</Text>
                        <TextInput
                          style={[styles.input, !taskName.trim() && styles.inputError]}
                          placeholder="Enter task name..."
                          placeholderTextColor="#999"
                          value={taskName}
                          onChangeText={setTaskName}
                        />
                      </View>
                      
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Description (Optional)</Text>
                        <TextInput
                          style={[styles.input, styles.textArea]}
                          placeholder="Add more details..."
                          placeholderTextColor="#999"
                          value={taskDesc}
                          onChangeText={setTaskDesc}
                          multiline
                          textAlignVertical="top"
                        />
                      </View>
                    </LinearGradient>
                  </View>

                  {/* Date & Time Section */}
                  <View style={styles.formSection}>
                    <LinearGradient
                      colors={['rgba(240, 147, 251, 0.1)', 'rgba(255, 154, 86, 0.1)']}
                      style={styles.formCard}
                    >
                      <Text style={styles.sectionTitle}>When should we remind you?</Text>
                      
                      {/* Date Selector */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Select Date *</Text>
                        <TouchableOpacity 
                          style={styles.dateTimeInput}
                          onPress={() => {
                            setShowCalendar(!showCalendar);
                            if (scrollViewRef.current) {
                              setTimeout(() => scrollViewRef.current.scrollToEnd({ animated: true }), 100);
                            }
                          }}
                        >
                          <LinearGradient
                            colors={['rgba(102, 126, 234, 0.15)', 'rgba(240, 147, 251, 0.15)']}
                            style={styles.dateTimeGradient}
                          >
                            <View style={styles.dateTimeIcon}>
                              <Ionicons name="calendar" size={24} color="#667eea" />
                            </View>
                            <View style={styles.dateTimeTextContainer}>
                              <Text style={[styles.dateTimeLabel, !selectedDate && styles.placeholder]}>
                                {selectedDate ? 
                                  new Date(selectedDate).toLocaleDateString('en-US', { 
                                    weekday: 'long',
                                    month: 'long', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  }) : 
                                  'Choose a date'
                                }
                              </Text>
                            </View>
                            <View style={styles.chevronIcon}>
                              <Ionicons 
                                name={showCalendar ? "chevron-up" : "chevron-down"} 
                                size={20} 
                                color="#667eea" 
                              />
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>

                      {/* Time Selector */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Select Time</Text>
                        <TouchableOpacity 
                          style={styles.dateTimeInput}
                          onPress={() => {
                            setShowTimePicker(!showTimePicker);
                            if (scrollViewRef.current) {
                              setTimeout(() => scrollViewRef.current.scrollToEnd({ animated: true }), 100);
                            }
                          }}
                        >
                          <LinearGradient
                            colors={['rgba(240, 147, 251, 0.15)', 'rgba(255, 154, 86, 0.15)']}
                            style={styles.dateTimeGradient}
                          >
                            <View style={styles.dateTimeIcon}>
                              <Ionicons name="time" size={24} color="#f093fb" />
                            </View>
                            <View style={styles.dateTimeTextContainer}>
                              <Text style={styles.dateTimeLabel}>
                                {new Date(`2000-01-01T${hour}:${minute}:00`).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </Text>
                            </View>
                            <View style={styles.chevronIcon}>
                              <Ionicons 
                                name={showTimePicker ? "chevron-up" : "chevron-down"} 
                                size={20} 
                                color="#f093fb" 
                              />
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                      
                      {/* Calendar Picker */}
                      {showCalendar && (
                        <View style={styles.calendarContainer}>
                          <LinearGradient
                            colors={['rgba(255,255,255,0.95)', 'rgba(240,248,255,0.95)']}
                            style={styles.calendarGradient}
                          >
                            <Calendar
                              onDayPress={(day) => {
                                setSelectedDate(day.dateString);
                                setShowCalendar(false);
                              }}
                              markedDates={{ 
                                [selectedDate]: { 
                                  selected: true, 
                                  selectedColor: "#667eea",
                                  selectedTextColor: "white"
                                } 
                              }}
                              theme={{
                                backgroundColor: 'transparent',
                                calendarBackground: 'transparent',
                                textSectionTitleColor: '#667eea',
                                selectedDayBackgroundColor: '#667eea',
                                selectedDayTextColor: '#ffffff',
                                todayTextColor: '#f093fb',
                                dayTextColor: '#2d4150',
                                textDisabledColor: '#d9e1e8',
                                arrowColor: '#667eea',
                                monthTextColor: '#667eea',
                                indicatorColor: '#667eea',
                              }}
                            />
                          </LinearGradient>
                        </View>
                      )}

                      {/* Time Picker */}
                      {showTimePicker && (
                        <View style={styles.timePickerContainer}>
                          <LinearGradient
                            colors={['rgba(240, 147, 251, 0.1)', 'rgba(255, 154, 86, 0.1)']}
                            style={styles.timePickerGradient}
                          >
                            <Text style={styles.timePickerTitle}>Choose Time</Text>
                            <View style={styles.timePickerRow}>
                              <View style={styles.timePickerSection}>
                                <Text style={styles.timePickerLabel}>Hour</Text>
                                <View style={styles.pickerWrapper}>
                                  <Picker 
                                    selectedValue={hour} 
                                    style={styles.picker} 
                                    onValueChange={(val) => setHour(val)}
                                  >
                                    {Array.from({ length: 24 }, (_, i) => {
                                      const hourStr = i.toString().padStart(2, "0");
                                      return (
                                        <Picker.Item key={i} label={hourStr} value={hourStr} />
                                      );
                                    })}
                                  </Picker>
                                </View>
                              </View>
                              
                              <View style={styles.timePickerSection}>
                                <Text style={styles.timePickerLabel}>Minute</Text>
                                <View style={styles.pickerWrapper}>
                                  <Picker 
                                    selectedValue={minute} 
                                    style={styles.picker} 
                                    onValueChange={(val) => setMinute(val)}
                                  >
                                    {["00", "15", "30", "45"].map((m) => (
                                      <Picker.Item key={m} label={m} value={m} />
                                    ))}
                                  </Picker>
                                </View>
                              </View>
                            </View>
                            
                            <TouchableOpacity 
                              style={styles.doneButton}
                              onPress={() => setShowTimePicker(false)}
                            >
                              <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.doneButtonGradient}
                              >
                                <Text style={styles.doneButtonText}>Done</Text>
                              </LinearGradient>
                            </TouchableOpacity>
                          </LinearGradient>
                        </View>
                      )}
                    </LinearGradient>
                  </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={closeModal}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.saveButton, (!taskName.trim() || !selectedDate) && styles.disabledButton]} 
                    onPress={addReminder}
                    disabled={!taskName.trim() || !selectedDate}
                  >
                    <LinearGradient
                      colors={(!taskName.trim() || !selectedDate) ? 
                        ['#cccccc', '#aaaaaa'] : 
                        ['#667eea', '#764ba2']
                      }
                      style={styles.saveButtonGradient}
                    >
                      <Text style={styles.saveButtonText}>
                        {isEditing ? 'Update' : 'Save'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          </BlurView>
        </View>
      </Modal>
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
    fontWeight: '800',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '500',
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyStateCard: {
    padding: 40,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  emptyStateText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // Card Styles
  cardWrapper: {
    marginBottom: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2c2e',
    flex: 1,
  },
  todayTitle: {
    color: 'white',
  },
  description: {
    fontSize: 15,
    color: '#8e8e93',
    lineHeight: 21,
    marginBottom: 16,
  },
  todayDescription: {
    color: 'rgba(255,255,255,0.9)',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dateTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f093fb',
  },
  todayText: {
    color: 'white',
  },
  timeUntil: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8e8e93',
  },
  todayTimeUntil: {
    color: 'rgba(255,255,255,0.9)',
  },
  todayBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  todayBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
    marginLeft: 16,
  },
  editBtn: {
    backgroundColor: 'rgba(102, 126, 234, 0.15)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  todayActionBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.4)',
  },
  
  // FAB Styles
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    maxHeight: height * 0.9,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    overflow: 'hidden',
  },
  modalHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 30,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollView: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalContent: {
    paddingVertical: 20,
  },
  
  // Form Styles
  formSection: {
    marginBottom: 25,
  },
  formCard: {
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c2c2e',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3c3c43',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1d1d1f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  
  // Date Time Input
  dateTimeInput: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateTimeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  dateTimeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dateTimeTextContainer: {
    flex: 1,
  },
  dateTimeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d1d1f',
  },
  placeholder: {
    color: '#8e8e93',
  },
  chevronIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Calendar
  calendarContainer: {
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
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
    overflow: 'hidden',
    shadowColor: '#000',
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
    fontWeight: '700',
    color: '#2c2c2e',
    textAlign: 'center',
    marginBottom: 20,
  },
  timePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  timePickerSection: {
    flex: 1,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3c3c43',
    marginBottom: 12,
  },
  pickerWrapper: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
    width: 120,
    shadowColor: '#000',
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
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  doneButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Button Container
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
    gap: 16,
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142, 142, 147, 0.2)',
  },
  cancelButtonText: {
    color: '#3c3c43',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
});
