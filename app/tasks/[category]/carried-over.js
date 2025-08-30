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
  listCarriedOverTodosByCategory,
  updateTodo,
  toggleTodoComplete,
  deleteTodoById,
  forceReconnect,
  testDatabaseConnection,
} from "../../../storage/todoDb";
import runDatabaseTests from "../../../storage/testDb";

const CarriedOverTaskItem = ({
  item,
  index,
  toggleTaskCompletion,
  deleteTask,
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
        <Text style={styles.carriedOverText}>
          Carried Over: {new Date(item.carried_over_at).toLocaleDateString()}
        </Text>
        <Text style={styles.originalDateText}>
          Originally Created:{" "}
          {new Date(item.original_created_at).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
      <View style={styles.taskActions}>
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

export default function CarriedOverTasks() {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [intention, setIntention] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const categoryColors = {
    "2-Minute": "#10B981",
    Urgent: "#EF4444",
    Important: "#8B5CF6",
    "Low Energy": "#3B82F6",
  };

  const categoryColor = categoryColors[category] || "#10B981";

  useEffect(() => {
    let isMounted = true;

    const initializeAndLoad = async () => {
      try {
        if (isMounted) {
          await loadTasks();
        }
      } catch (error) {
        console.error("Error in useEffect initialization:", error);
        if (isMounted) {
          Alert.alert(
            "Database Error",
            "Failed to initialize database. Please restart the app.",
            [{ text: "OK" }]
          );
        }
      }
    };

    initializeAndLoad();

    return () => {
      isMounted = false;
    };
  }, [category]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      console.log(`Loading carried over tasks for category: ${category}`);
      const categoryTasks = await listCarriedOverTodosByCategory(category);
      setTasks(categoryTasks);
    } catch (error) {
      console.error("Error loading carried over tasks:", error);

      // If it's a database connection error, try to reset and retry once
      if (error.message && error.message.includes("NullPointerException")) {
        console.log(
          "Database connection error detected, attempting to reset and retry..."
        );
        try {
          const reconnected = await forceReconnect();
          if (reconnected) {
            const categoryTasks = await listCarriedOverTodosByCategory(
              category
            );
            setTasks(categoryTasks);
          } else {
            throw new Error("Failed to reconnect to database");
          }
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          // Show user-friendly error message
          Alert.alert(
            "Database Error",
            "Unable to load tasks. Please restart the app and try again.",
            [{ text: "OK" }]
          );
        }
      } else {
        // Show user-friendly error message for other errors
        Alert.alert(
          "Error",
          "Failed to load carried over tasks. Please try again.",
          [{ text: "OK" }]
        );
      }
    } finally {
      setIsLoading(false);
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
    } catch (error) {
      console.error("Error toggling task completion:", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await deleteTodoById({ localId: taskId });
      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
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

  const runDebugTests = async () => {
    try {
      console.log("Running database debug tests...");
      const success = await runDatabaseTests();
      if (success) {
        Alert.alert("Debug Tests", "All database tests passed successfully!");
      } else {
        Alert.alert(
          "Debug Tests",
          "Some database tests failed. Check console for details."
        );
      }
    } catch (error) {
      console.error("Debug tests failed:", error);
      Alert.alert(
        "Debug Tests",
        "Debug tests failed. Check console for details."
      );
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
              console.log("Navigating back to category tasks");
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={categoryColor} />
          </TouchableOpacity>
          <Text style={[styles.header, { color: categoryColor }]}>
            {category} - Carried Over Tasks
          </Text>
          <TouchableOpacity onPress={runDebugTests}>
            <Ionicons name="bug-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading carried over tasks...</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={({ item, index }) => (
            <CarriedOverTaskItem
              item={item}
              index={index}
              toggleTaskCompletion={toggleTaskCompletion}
              deleteTask={deleteTask}
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
              <Text style={styles.emptyText}>No carried over tasks</Text>
              <Text style={styles.emptySubtext}>
                Tasks moved to carried over will appear here
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

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
              <Text style={styles.modalTitle}>Edit Carried Over Task</Text>
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
                    styles.addButton,
                    { backgroundColor: categoryColor },
                  ]}
                  onPress={saveEditedTask}
                >
                  <Text style={[styles.modalButtonText, { color: "#FFFFFF" }]}>
                    Save Changes
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
  },
  header: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    flex: 1,
    marginLeft: 16,
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
  carriedOverText: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "500",
    marginTop: 4,
  },
  originalDateText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  addButton: {
    backgroundColor: "#10B981",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
  },
});
