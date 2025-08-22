import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

const TaskItem = ({
  item,
  index,
  toggleTaskCompletion,
  deleteTask,
  dumpTask,
  categoryColor,
  openEditModal,
}) => {
  return (
    <View style={[styles.taskItem, { borderLeftColor: categoryColor }]}>
      <TouchableOpacity
        onPress={() => {
          console.log(`Toggling task completion: ${item.id}`);
          toggleTaskCompletion(item.id);
        }}
      >
        <Ionicons
          name={item.completed ? "checkbox" : "square-outline"}
          size={24}
          color={item.completed ? categoryColor : "#6B7280"}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.taskContent}
        onPress={() => {
          console.log(`Opening edit modal for task: ${item.id}`);
          openEditModal(item);
        }}
      >
        <Text style={[styles.taskText, item.completed && styles.completedTask]}>
          {item.text}
        </Text>
        <Text style={styles.intentionText}>
          Intention: {item.intention || "None"}
        </Text>
        <Text style={styles.createdAtText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
      <View style={styles.taskActions}>
        {!item.completed && (
          <TouchableOpacity
            onPress={() => {
              console.log(`Dumping task: ${item.id}`);
              dumpTask(item.id);
            }}
          >
            <Ionicons name="archive-outline" size={24} color="#6B7280" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => {
            console.log(`Deleting task: ${item.id}`);
            deleteTask(item.id);
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function CategoryTasks() {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [intention, setIntention] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);

  const categoryColors = {
    "2-Minute": "#10B981",
    Urgent: "#EF4444",
    Important: "#8B5CF6",
    "Low Energy": "#3B82F6",
  };

  const categoryColor = categoryColors[category] || "#10B981";

  useEffect(() => {
    console.log(`Loading tasks for category: ${category}`);
    const loadTasks = async () => {
      try {
        const tasksData = await AsyncStorage.getItem("tasks");
        if (tasksData) {
          const parsedTasks = JSON.parse(tasksData);
          const categoryTasks = parsedTasks[category] || [];
          setTasks(categoryTasks);
        }
      } catch (error) {
        console.error("Error loading tasks:", error);
      }
    };

    loadTasks();

    // Schedule task dump at midnight
    const checkTime = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        console.log("Running midnight dump");
        dumpPendingTasks();
      }
    };

    const interval = setInterval(checkTime, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [category]);

  const dumpPendingTasks = async () => {
    try {
      const tasksData = await AsyncStorage.getItem("tasks");
      const carriedOverData = await AsyncStorage.getItem("carriedOverTasks");
      const parsedTasks = tasksData
        ? JSON.parse(tasksData)
        : { [category]: [] };
      const parsedCarriedOver = carriedOverData
        ? JSON.parse(carriedOverData)
        : { [category]: [] };

      const pendingTasks =
        parsedTasks[category]?.filter((task) => !task.completed) || [];
      const carriedOverTasks = pendingTasks.map((task) => ({
        ...task,
        carriedOverAt: new Date().toISOString(),
      }));

      parsedCarriedOver[category] = [
        ...(parsedCarriedOver[category] || []),
        ...carriedOverTasks,
      ];

      await AsyncStorage.setItem(
        "carriedOverTasks",
        JSON.stringify(parsedCarriedOver)
      );
    } catch (error) {
      console.error("Error dumping pending tasks:", error);
    }
  };

  const toggleTaskCompletion = async (taskId) => {
    try {
      const tasksData = await AsyncStorage.getItem("tasks");
      if (tasksData) {
        const parsedTasks = JSON.parse(tasksData);
        const updatedTasks = parsedTasks[category].map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        parsedTasks[category] = updatedTasks;
        await AsyncStorage.setItem("tasks", JSON.stringify(parsedTasks));
        setTasks(updatedTasks);
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const tasksData = await AsyncStorage.getItem("tasks");
      if (tasksData) {
        const parsedTasks = JSON.parse(tasksData);
        parsedTasks[category] = parsedTasks[category].filter(
          (task) => task.id !== taskId
        );
        await AsyncStorage.setItem("tasks", JSON.stringify(parsedTasks));
        setTasks(parsedTasks[category]);
      }
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const dumpTask = async (taskId) => {
    try {
      const tasksData = await AsyncStorage.getItem("tasks");
      const carriedOverData = await AsyncStorage.getItem("carriedOverTasks");
      const parsedTasks = tasksData
        ? JSON.parse(tasksData)
        : { [category]: [] };
      const parsedCarriedOver = carriedOverData
        ? JSON.parse(carriedOverData)
        : { [category]: [] };

      const taskToDump = parsedTasks[category].find(
        (task) => task.id === taskId
      );
      if (taskToDump) {
        parsedCarriedOver[category] = [
          ...(parsedCarriedOver[category] || []),
          { ...taskToDump, carriedOverAt: new Date().toISOString() },
        ];
        parsedTasks[category] = parsedTasks[category].filter(
          (task) => task.id !== taskId
        );

        await AsyncStorage.setItem(
          "carriedOverTasks",
          JSON.stringify(parsedCarriedOver)
        );
        await AsyncStorage.setItem("tasks", JSON.stringify(parsedTasks));
        setTasks(parsedTasks[category]);
      }
    } catch (error) {
      console.error("Error dumping task:", error);
    }
  };

  const addOrUpdateTask = async () => {
    if (newTask.trim()) {
      try {
        const tasksData = await AsyncStorage.getItem("tasks");
        const parsedTasks = tasksData
          ? JSON.parse(tasksData)
          : {
              "2-Minute": [],
              Urgent: [],
              Important: [],
              "Low Energy": [],
            };

        if (editingTaskId) {
          // Update existing task
          const updatedTasks = parsedTasks[category].map((task) =>
            task.id === editingTaskId
              ? { ...task, text: newTask, intention }
              : task
          );
          parsedTasks[category] = updatedTasks;
          await AsyncStorage.setItem("tasks", JSON.stringify(parsedTasks));
          setTasks(updatedTasks);
        } else {
          // Add new task
          const newTaskObj = {
            id: Date.now().toString(),
            text: newTask,
            intention,
            category,
            completed: false,
            createdAt: new Date().toISOString(),
          };
          parsedTasks[category] = [
            ...(parsedTasks[category] || []),
            newTaskObj,
          ];
          await AsyncStorage.setItem("tasks", JSON.stringify(parsedTasks));
          setTasks([...tasks, newTaskObj]);
        }

        setNewTask("");
        setIntention("");
        setEditingTaskId(null);
        setModalVisible(false);
      } catch (error) {
        console.error("Error adding/updating task:", error);
      }
    }
  };

  const openModal = () => {
    console.log("Opening add task modal");
    setEditingTaskId(null);
    setNewTask("");
    setIntention("");
    setModalVisible(true);
  };

  const openEditModal = (task) => {
    console.log(`Opening edit modal for task: ${task.id}`);
    setEditingTaskId(task.id);
    setNewTask(task.text);
    setIntention(task.intention || "");
    setModalVisible(true);
  };

  const closeModal = () => {
    console.log("Closing modal");
    setModalVisible(false);
    setEditingTaskId(null);
    setNewTask("");
    setIntention("");
  };

  const openCarriedOverScreen = () => {
    console.log(`Navigating to carried-over screen for category: ${category}`);
    router.push(`/tasks/${category}/carried-over`);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: `${categoryColor}30` },
        ]}
      >
        <Text style={[styles.header, { color: categoryColor }]}>
          {category} Tasks
        </Text>
      </View>
      <FlatList
        data={tasks}
        renderItem={({ item, index }) => (
          <TaskItem
            item={item}
            index={index}
            toggleTaskCompletion={toggleTaskCompletion}
            deleteTask={deleteTask}
            dumpTask={dumpTask}
            categoryColor={categoryColor}
            openEditModal={openEditModal}
          />
        )}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="sad-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>
              No tasks in this category yet. Add one to get started!
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
      <TouchableOpacity
        style={[
          styles.shortcutButton,
          { backgroundColor: `${categoryColor}30`, zIndex: 1000 },
        ]}
        onPress={openCarriedOverScreen}
      >
        <Ionicons name="time-outline" size={24} color="#111827" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: categoryColor, zIndex: 1000 }]}
        onPress={openModal}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View
              style={[
                styles.modalGradient,
                { backgroundColor: `${categoryColor}10` },
              ]}
            >
              <Text style={styles.modalTitle}>
                {editingTaskId
                  ? `Edit ${category} Task`
                  : `Add New ${category} Task`}
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Task description..."
                placeholderTextColor="#9CA3AF"
                value={newTask}
                onChangeText={setNewTask}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Set an intention (e.g., Build clarity)"
                placeholderTextColor="#9CA3AF"
                value={intention}
                onChangeText={setIntention}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={closeModal}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.addButton,
                    { backgroundColor: categoryColor },
                  ]}
                  onPress={addOrUpdateTask}
                >
                  <Text style={styles.modalButtonText}>
                    {editingTaskId ? "Save Changes" : "Add Task"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerContainer: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  header: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
  },
  taskContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  completedTask: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  intentionText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 6,
  },
  createdAtText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
  },
  shortcutButton: {
    position: "absolute",
    bottom: 20,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    marginHorizontal: 24,
    borderRadius: 20,
    overflow: "hidden",
  },
  modalGradient: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  modalInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 8,
  },
  addButton: {
    backgroundColor: "#10B981",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
});
