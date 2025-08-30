import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  listTodosByCategory,
  insertLocalTodo,
  updateTodo,
  toggleTodoComplete,
  deleteTodoById,
  moveTaskToCarriedOver,
} from "../../storage/todoDb";

const TaskItem = ({
  item,
  index,
  toggleTaskCompletion,
  deleteTask,
  moveToCarriedOver,
  categoryColor,
  openEditModal,
}) => {
  return (
    <View style={[styles.taskItem, { borderLeftColor: categoryColor }]}>
      <TouchableOpacity
        onPress={() => {
          console.log(`Toggling task completion: ${item.localId}`);
          toggleTaskCompletion(item.localId);
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
          console.log(`Opening edit modal for task: ${item.localId}`);
          openEditModal(item);
        }}
      >
        <Text style={[styles.taskText, item.completed && styles.completedTask]}>
          {item.title}
        </Text>
        <Text style={styles.intentionText}>
          Intention: {item.description || "None"}
        </Text>
        <Text style={styles.createdAtText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
      <View style={styles.taskActions}>
        {!item.completed && (
          <TouchableOpacity
            onPress={() => {
              console.log(`Moving task to carried over: ${item.localId}`);
              moveToCarriedOver(item.localId);
            }}
          >
            <Ionicons name="time-outline" size={24} color="#F59E0B" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => {
            console.log(`Deleting task: ${item.localId}`);
            deleteTask(item.localId);
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
    (async () => {
      await loadTasks();
    })();
  }, [category]);

  const loadTasks = async () => {
    try {
      console.log(`Loading tasks for category: ${category}`);
      const categoryTasks = await listTodosByCategory(category);
      // Filter for incomplete tasks
      const incompleteTasks = categoryTasks.filter((task) => !task.completed);
      setTasks(incompleteTasks);
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const moveToCarriedOver = async (taskId) => {
    try {
      await moveTaskToCarriedOver(taskId);
      await loadTasks();
      Alert.alert("Task Moved", "Task has been moved to carried over tasks.", [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error moving task to carried over:", error);
      Alert.alert(
        "Error",
        "Failed to move task to carried over. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const toggleTaskCompletion = async (taskId) => {
    try {
      const task = tasks.find((t) => t.localId === taskId);
      if (!task) return;

      const newCompleted = !task.completed;
      const updatedAt = new Date().toISOString();

      await toggleTodoComplete({
        localId: taskId,
        completed: newCompleted,
        updatedAt,
      });

      await loadTasks();

      // Try to sync if online
      if (isOnline && task.synced) {
        try {
          const idToken = await getIdToken();
          if (idToken) {
            await updateTodoAPI({
              idToken,
              id: task.serverId,
              title: task.title,
              description: task.description,
              category: task.category,
              priority: task.priority,
              dueDate: task.dueDate,
              completed: newCompleted,
            });
          }
        } catch (e) {
          console.log("Failed to sync task completion:", e);
        }
      }
    } catch (error) {
      console.error("Error toggling task completion:", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const task = tasks.find((t) => t.localId === taskId);
      if (!task) return;

      await deleteTodoById({ localId: taskId, serverId: task.serverId });

      // Try to sync deletion if online and task was synced
      if (isOnline && task.synced) {
        try {
          const idToken = await getIdToken();
          if (idToken) {
            await deleteTodo({ idToken, id: task.serverId });
          }
        } catch (e) {
          console.log("Failed to sync task deletion:", e);
        }
      }

      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  const dumpTask = async (taskId) => {
    try {
      const task = tasks.find((t) => t.localId === taskId);
      if (!task) return;

      // Mark task as completed (dumped)
      const updatedAt = new Date().toISOString();
      await toggleTodoComplete({
        localId: taskId,
        completed: true,
        updatedAt,
      });

      await loadTasks();
    } catch (error) {
      console.error("Error dumping task:", error);
    }
  };

  const openEditModal = (task) => {
    setEditingTaskId(task.localId);
    setNewTask(task.title);
    setIntention(task.description || "");
    setModalVisible(true);
  };

  const saveEditedTask = async () => {
    if (!newTask.trim()) return;

    try {
      const updatedAt = new Date().toISOString();
      await updateTodo({
        localId: editingTaskId,
        title: newTask.trim(),
        description: intention.trim(),
        category,
        priority: "medium",
        dueDate: null,
        updatedAt,
      });

      await loadTasks();
      setModalVisible(false);
      setNewTask("");
      setIntention("");
      setEditingTaskId(null);
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const addNewTask = async () => {
    if (!newTask.trim()) return;

    try {
      console.log("Adding new task:", { title: newTask.trim(), category });



      const createdAt = new Date().toISOString();
      const updatedAt = createdAt;

      const newTaskObj = await insertLocalTodo({
        title: newTask.trim(),
        description: intention.trim(),
        category,
        priority: "medium",
        dueDate: null,
        createdAt,
        updatedAt,
      });

      setNewTask("");
      setIntention("");
      await loadTasks();

      Alert.alert("Task Added", "Your task has been saved successfully!", [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error adding task:", error);

      // If it's a database connection error, try to reset and retry
      if (error.message && error.message.includes("NullPointerException")) {
        try {
          console.log("Attempting to reset database connection...");
          Alert.alert(
            "Database Reset",
            "Database connection has been reset. Please try adding the task again.",
            [{ text: "OK" }]
          );
        } catch (resetError) {
          console.error("Error resetting database:", resetError);
          Alert.alert(
            "Database Error",
            "Unable to reset database connection. Please restart the app and try again.",
            [{ text: "OK" }]
          );
        }
      } else {
        Alert.alert(
          "Error Adding Task",
          `Failed to add task: ${
            error.message || "Database error"
          }. Please try again.`,
          [{ text: "OK" }]
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: `${categoryColor}30` },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              console.log("Navigating back to main task list");
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={categoryColor} />
          </TouchableOpacity>
          <Text style={[styles.header, { color: categoryColor }]}>
            {category} Tasks
          </Text>
        </View>
      </View>

      <FlatList
        data={tasks}
        renderItem={({ item, index }) => (
          <TaskItem
            item={item}
            index={index}
            toggleTaskCompletion={toggleTaskCompletion}
            deleteTask={deleteTask}
            moveToCarriedOver={moveToCarriedOver}
            categoryColor={categoryColor}
            openEditModal={openEditModal}
          />
        )}
        keyExtractor={(item) => item.localId.toString()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="checkmark-circle-outline"
              size={64}
              color="#9CA3AF"
            />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first task to get started
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      <View style={styles.floatingButtonsContainer}>
        <TouchableOpacity
          style={[styles.pendingButton, { backgroundColor: "#F59E0B" }]}
          onPress={() => router.push(`/tasks/${category}/carried-over`)}
        >
          <Ionicons name="time-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: categoryColor }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
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
                {editingTaskId ? "Edit Task" : "Add New Task"}
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
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalAddButton,
                    { backgroundColor: categoryColor },
                  ]}
                  onPress={editingTaskId ? saveEditedTask : addNewTask}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  header: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    flex: 1,
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
  unsyncedText: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "500",
    marginTop: 4,
  },
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  syncButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
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
  modalAddButton: {
    backgroundColor: "#8B5CF6",
  },
  floatingButtonsContainer: {
    position: "absolute",
    bottom: 30,
    right: 30,
    flexDirection: "row",
    gap: 16,
  },
  pendingButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
});
