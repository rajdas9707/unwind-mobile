import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Modal, TextInput, Button, TouchableOpacity, StyleSheet } from "react-native";
import * as SQLite from "expo-sqlite";
import * as Notifications from "expo-notifications";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Calendar } from "react-native-calendars";

// ✅ Open database
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [filterDate, setFilterDate] = useState(null);

  // ✅ Create table on first load
  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS reminders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, datetime TEXT);"
      );
    });
    fetchReminders();

    // Android Notification Channel
    Notifications.setNotificationChannelAsync("reminder-channel", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }, []);

  // ✅ Fetch all reminders
  const fetchReminders = () => {
    db.transaction((tx) => {
      tx.executeSql("SELECT * FROM reminders;", [], (_, { rows }) => {
        setReminders(rows._array);
      });
    });
  };

  // ✅ Add reminder
  const addReminder = async () => {
    if (!taskName || !selectedDate) return;

    const datetime = selectedDate.toISOString();

    db.transaction((tx) => {
      tx.executeSql(
        "INSERT INTO reminders (name, description, datetime) values (?, ?, ?);",
        [taskName, taskDesc, datetime],
        () => fetchReminders()
      );
    });

    // ✅ Schedule local notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: taskName,
        body: taskDesc || "Reminder!",
      },
      trigger: new Date(datetime),
    });

    setTaskName("");
    setTaskDesc("");
    setModalVisible(false);
  };

  // ✅ Filter reminders based on calendar
  const filteredReminders = filterDate
    ? reminders.filter((item) => item.datetime.startsWith(filterDate))
    : reminders;

  return (
    <View style={styles.container}>
      {/* Calendar filter */}
      <Calendar
        onDayPress={(day) => setFilterDate(day.dateString)}
        markedDates={{ [filterDate]: { selected: true, selectedColor: "blue" } }}
      />

      {/* Reminders list */}
      <FlatList
        data={filteredReminders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.name}</Text>
            <Text>{item.description}</Text>
            <Text style={styles.date}>{new Date(item.datetime).toLocaleString()}</Text>
          </View>
        )}
      />

      {/* Floating button */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add reminder modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalView}>
          <TextInput
            placeholder="Task Name"
            style={styles.input}
            value={taskName}
            onChangeText={setTaskName}
          />
          <TextInput
            placeholder="Task Description"
            style={styles.input}
            value={taskDesc}
            onChangeText={setTaskDesc}
          />
          <Button title="Pick Date & Time" onPress={() => setDatePickerVisibility(true)} />
          <DateTimePickerModal
            isVisible={isDatePickerVisible}
            mode="datetime"
            onConfirm={(date) => {
              setSelectedDate(date);
              setDatePickerVisibility(false);
            }}
            onCancel={() => setDatePickerVisibility(false)}
          />
          <Button title="Save Reminder" onPress={addReminder} />
          <Button title="Cancel" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  card: { backgroundColor: "#f9f9f9", padding: 10, margin: 5, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: "bold" },
  date: { fontSize: 12, color: "gray" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    backgroundColor: "#2196F3",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  fabText: { fontSize: 28, color: "white" },
  modalView: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "white",
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "gray",
    padding: 10,
    marginVertical: 5,
    borderRadius: 5,
  },
});
