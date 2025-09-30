import React, { useContext, useEffect, useMemo, useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import AnimatedCheckbox from "../../components/shared/AnimatedCheckbox";
import { useLocalSearchParams, useRouter } from "expo-router";
import TopBarToggle from "../../components/shared/TopBarToggle";
import {
  fetchTodosByCategory,
  fetchCarriedOverTodosByCategory,
  createTodoEntryLocal,
  updateTodoEntryLocal,
  toggleTodoCompleteLocal,
  toggleCarriedOverCompleteLocal,
  deleteTodoEntryLocal,
  moveTaskToCarriedOverLocal,
  getCategoryEmoji,
} from "../../storage/todo/storage";
// import { AuthContext } from "../../context/AuthProvider";
import { checkNetworkStatus, useNetworkStatus } from "../../utils/networkUtils";

// Helper function for safe date formatting
const formatDate = (dateString) => {
  if (!dateString) return 'Date not available';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Date not available';
  }
};

const TaskItem = ({
  item,
  index,
  toggleTaskCompletion,
  deleteTask,
  moveToCarriedOver,
  categoryColor,
  openEditModal,
}) => {
  // Debug: Log the item structure to see available fields
  console.log("TaskItem item structure:", {
    id: item.id,
    title: item.title,
    created_at: item.created_at,
    createdAt: item.createdAt,
    updated_at: item.updated_at,
    allKeys: Object.keys(item)
  });
  
  return (
    <View style={[styles.taskItem, { borderLeftColor: categoryColor }]}>
      <AnimatedCheckbox
        checked={!!item.completed}
        activeColor={categoryColor}
        onPress={() => {
          console.log(`Toggling task completion: ${item.id}`);
          toggleTaskCompletion(item.id);
        }}
      />
      <TouchableOpacity
        style={styles.taskContent}
        onPress={() => {
          console.log(`Opening edit modal for task: ${item.id}`);
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
          {formatDate(item.created_at)}
        </Text>
      </TouchableOpacity>
      <View style={styles.taskActions}>
        {!item.completed && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              console.log(`Moving task to carried over: ${item.id}`);
              moveToCarriedOver(item.id);
            }}
          >
            <Ionicons name="time-outline" size={22} color="#F59E0B" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            console.log(`Deleting task: ${item.id}`);
            deleteTask(item.id);
          }}
        >
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CarriedOverTaskRow = ({
  item,
  index,
  toggleTaskCompletion,
  deleteTask,
  categoryColor,
  openEditModal,
}) => {
  return (
    <View style={[styles.taskItem, { borderLeftColor: categoryColor }]}>
      <AnimatedCheckbox
        checked={!!item.completed}
        activeColor={categoryColor}
        onPress={() => {
          toggleTaskCompletion(item.id ?? item.localId);
        }}
      />
      <TouchableOpacity
        style={styles.taskContent}
        onPress={() => openEditModal(item)}
      >
        <Text style={[styles.taskText, item.completed && styles.completedTask]}>
          {item.title}
        </Text>
        <Text style={styles.intentionText}>
          Intention: {item.description || "None"}
        </Text>
        <Text style={styles.createdAtText}>
          Carried Over: {formatDate(item.carried_over_at)} | Originally: {formatDate(item.original_created_at)}
        </Text>
      </TouchableOpacity>
      <View style={styles.taskActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => deleteTask(item.id ?? item.localId)}>
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function CategoryTasks() {
  const { category, status, mode } = useLocalSearchParams();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [backlogs, setBacklogs] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [intention, setIntention] = useState("");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [topSelection, setTopSelection] = useState("today");
  const [carriedCount, setCarriedCount] = useState(0);
  // const {idToken}=useContext(AuthContext) // removed, now handled in client.js
  const isOnline = useNetworkStatus();
  const categoryColors = {
    "2-Minute": "#10B981",
    Urgent: "#EF4444",
    Important: "#8B5CF6",
    "Low Energy": "#3B82F6",
  };

  const categoryGradients = {
    "2-Minute": ["#10B981", "#059669"],
    Urgent: ["#EF4444", "#DC2626"],
    Important: ["#8B5CF6", "#7C3AED"],
    "Low Energy": ["#3B82F6", "#2563EB"],
  };

  const categoryColor = categoryColors[category] || "#10B981";
  const categoryEmoji = getCategoryEmoji(category);

  const { currentPendingCount, currentCompletedCount } = useMemo(() => {
    const source = topSelection === "backlogs" ? backlogs : tasks;
    const pending = source.filter((t) => !t.completed).length;
    const completed = source.filter((t) => t.completed).length;
    return { currentPendingCount: pending, currentCompletedCount: completed };
  }, [tasks, backlogs, topSelection]);

  useEffect(() => {
    (async () => {
      await Promise.all([loadTasks(), loadBacklogs()]);
    })();
  }, [category]);

  useEffect(() => {
    if (status === "completed" || status === "pending") {
      setStatusFilter(status);
    }
  }, [status]);

  useEffect(() => {
    if (mode === "backlogs" || mode === "today") {
      setTopSelection(mode);
    }
  }, [mode]);

  useEffect(() => {
    (async () => {
      try {
        const carried = await fetchCarriedOverTodosByCategory(category);
        setCarriedCount(carried.length);
      } catch (e) {
        console.log("Failed to load carried-over count", e);
      }
    })();
  }, [category, tasks]);

  const loadTasks = async () => {
    try {
      console.log(`Loading tasks for category: ${category}`);
      const categoryTasks = await fetchTodosByCategory(category);

      // Move past-dated tasks to carried over
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const toMove = categoryTasks
        .filter((task) => {
          if (task.completed) return false;
          const dateString = task.due_date || task.created_at;
          if (!dateString) return false;
          const taskDate = new Date(dateString);
          if (isNaN(taskDate.getTime())) return false;
          return taskDate < startOfToday;
        })
        .map((t) => t.id);

      if (toMove.length > 0) {
        console.log(`Moving ${toMove.length} past-dated task(s) to carried over`);
        await Promise.all(toMove.map((id) => moveTaskToCarriedOverLocal(id)));
        // Reload both lists after moving
        const [updatedTasks, updatedBacklogs] = await Promise.all([
          fetchTodosByCategory(category),
          fetchCarriedOverTodosByCategory(category),
        ]);
        setTasks(updatedTasks);
        setBacklogs(updatedBacklogs);
      } else {
        setTasks(categoryTasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    }
  };

  const loadBacklogs = async () => {
    try {
      const carried = await fetchCarriedOverTodosByCategory(category);
      setBacklogs(carried);
    } catch (error) {
      console.error("Error loading backlogs:", error);
    }
  };

  const moveToCarriedOver = async (taskId) => {
    try {
      // Try to find task by both id and localId to handle different ID formats
      const task = tasks.find((t) => t.id === taskId || t.localId === taskId);
      if (!task) {
        console.log("Task not found with ID:", taskId);
        return;
      }

      // Ensure we pass the real DB id
      await moveTaskToCarriedOverLocal(task.id);
      await Promise.all([loadTasks(), loadBacklogs()]);
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
      // First try regular tasks
      let task = tasks.find((t) => t.id === taskId || t.localId === taskId);
      if (task) {
        const newCompleted = !task.completed;
        await toggleTodoCompleteLocal({ id: task.id, completed: newCompleted });
        await loadTasks();
      } else {
        // Try carried-over list
        const backlog = backlogs.find((t) => t.id === taskId || t.localId === taskId);
        if (!backlog) {
          console.log("Task not found with ID:", taskId);
          return;
        }
        const newCompleted = !backlog.completed;
        await toggleCarriedOverCompleteLocal({ id: backlog.id, completed: newCompleted });
        await loadBacklogs();
      }

      // Try to sync if online for regular tasks only
      if (task && isOnline && task.synced && typeof updateTodoAPI === "function") {
        try {
          await updateTodoAPI({
            id: task.server_id,
            title: task.title,
            description: task.description,
            category: task.category,
            priority: task.priority,
            dueDate: task.due_date,
            completed: newCompleted,
          });
        } catch (e) {
          console.log("Failed to sync task completion:", e);
        }
      }
    } catch (error) {
      Alert.alert("Error toggling task completion:", error.message);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      // Try to find task by both id and localId to handle different ID formats
      const task = tasks.find((t) => t.id === taskId || t.localId === taskId);
      if (!task) {
        console.log("Task not found with ID:", taskId);
        Alert.alert("Error", "Task not found. Please try again.");
        return;
      }

      console.log("Deleting task:", task);
      console.log("Using task ID for deletion:", task.id);
      
      // Use the actual task.id for database deletion
      await deleteTodoEntryLocal(task.id);

      // Try to sync deletion if online and task was synced
      if (isOnline && task.synced) {
        try {
          // idToken removed
          await deleteTodo({ id: task.server_id });
        } catch (e) {
          console.log("Failed to sync task deletion:", e);
        }
      }

      await loadTasks();
      console.log("Task deleted successfully");
    } catch (error) {
      console.error("Error deleting task:", error);
      Alert.alert("Error", "Failed to delete task. Please try again.");
    }
  };

  const dumpTask = async (taskId) => {
    try {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      // Mark task as completed (dumped)
      await toggleTodoCompleteLocal({
        id: taskId,
        completed: true,
      });

      await loadTasks();
    } catch (error) {
      console.error("Error dumping task:", error);
    }
  };

  const openEditModal = (task) => {
    setEditingTaskId(task.id);
    setNewTask(task.title);
    setIntention(task.description || "");
    setModalVisible(true);
  };

  const saveEditedTask = async () => {
    if (!newTask.trim()) return;

    try {
      await updateTodoEntryLocal({
        id: editingTaskId,
        title: newTask.trim(),
        description: intention.trim(),
        category,
        priority: "medium",
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

      const newTaskObj = await createTodoEntryLocal({
        title: newTask.trim(),
        description: intention.trim(),
        category,
        priority: "medium",
      });

      setNewTask("");
      setIntention("");
      await loadTasks();
      setModalVisible(false);

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
      <LinearGradient
        colors={[`${categoryColor}15`, `${categoryColor}05`, "transparent"]}
        locations={[0, 0.6, 1]}
        style={styles.headerContainer}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              console.log("Navigating back to main task list");
              router.back();
            }}
            style={[styles.iconButton, { borderColor: categoryColor }]}
          >
            <Ionicons name="arrow-back" size={20} color={categoryColor} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerEmoji}>{categoryEmoji}</Text>
              <Text style={[styles.headerTitleBottom, { color: categoryColor }]}>{category}</Text>
            </View>
          </View>
          <TopBarToggle
            selected={topSelection === "backlogs" ? "backlogs" : "today"}
            counts={{ today: tasks.length, backlogs: backlogs.length }}
            primaryColor={categoryColor}
            containerStyle={{ width: 200 }}
            onChange={(val) => {
              setTopSelection(val === "backlogs" ? "backlogs" : "today");
              router.setParams({ mode: val === "backlogs" ? "backlogs" : "today" });
            }}
          />
        </View>
        <Text style={[styles.headerStatus, { color: categoryColor }]}>
          {topSelection === "backlogs" ? "Backlogs" : "Fresh"}
        </Text>
      </LinearGradient>

      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <TopBarToggle
          selected={statusFilter === "completed" ? "backlogs" : "today"}
          leftText={`Pending`}
          rightText={`Completed`}
          counts={{ left: currentPendingCount, right: currentCompletedCount }}
          primaryColor={categoryColor}
          containerStyle={{ width: 260, alignSelf: "center" }}
          onChange={(val) => {
            const newStatus = val === "backlogs" ? "completed" : "pending";
            setStatusFilter(newStatus);
            router.setParams({ status: newStatus });
          }}
        />
      </View>

      <FlatList
        data={(topSelection === "backlogs" ? backlogs : tasks).filter((t) =>
          statusFilter === "pending" ? !t.completed : t.completed
        )}
        renderItem={({ item, index }) => (
          topSelection === "backlogs" ? (
            <CarriedOverTaskRow
              item={item}
              index={index}
              toggleTaskCompletion={toggleTaskCompletion}
              deleteTask={deleteTask}
              categoryColor={categoryColor}
              openEditModal={openEditModal}
            />
          ) : (
            <TaskItem
              item={item}
              index={index}
              toggleTaskCompletion={toggleTaskCompletion}
              deleteTask={deleteTask}
              moveToCarriedOver={moveToCarriedOver}
              categoryColor={categoryColor}
              openEditModal={openEditModal}
            />
          )
        )}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="checkmark-circle-outline"
              size={64}
              color="#9CA3AF"
            />
            <Text style={styles.emptyText}>
              {statusFilter === "pending" ? "No pending tasks" : "No completed tasks"}
            </Text>
            <Text style={styles.emptySubtext}>
              Add your first task to get started
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />

      <View style={styles.floatingButtonsContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: categoryColor }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView
          style={styles.modalOverlay}
          intensity={20}
          tint="dark"
        >
          <TouchableOpacity
            style={{ flex: 1, justifyContent: "center" }}
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
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerContainer: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  headerToggleBtnLeft: {
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  headerToggleBtnRight: {},
  headerToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  headerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerBadgeNeutral: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerBadgeNeutralText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#374151",
  },
  headerLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
  },
  headerLinkText: {
    fontSize: 12,
    fontWeight: "700",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerEmoji: {
    fontSize: 28,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerTitleTop: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerTitleBottom: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerStatus: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    padding: 20,
    paddingBottom: 120,
    paddingTop: 8,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    backdropFilter: "blur(10px)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  taskContent: {
    flex: 1,
    marginHorizontal: 12,
  },
  taskText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  completedTask: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  intentionText: {
    fontSize: 15,
    color: "#6B7280",
    marginTop: 8,
    lineHeight: 22,
    fontWeight: "500",
    fontStyle: "italic",
  },
  createdAtText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 8,
    fontWeight: "600",
    letterSpacing: 0.2,
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
    gap: 16,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  syncButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#4B5563",
    marginTop: 20,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalContent: {
    marginHorizontal: 0,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    backdropFilter: "blur(20px)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  modalGradient: {
    padding: 28,
    backgroundColor: "transparent",
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1F2937",
    marginBottom: 24,
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.05)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalInput: {
    backgroundColor: "rgba(249, 250, 251, 0.8)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    fontSize: 17,
    color: "#1F2937",
    borderWidth: 2,
    borderColor: "rgba(229, 231, 235, 0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    fontWeight: "500",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
    gap: 16,
  },
  modalButton: {
    backgroundColor: "rgba(243, 244, 246, 0.8)",
    borderRadius: 16,
    padding: 18,
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(229, 231, 235, 0.5)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  modalAddButton: {
    backgroundColor: "#8B5CF6",
  },
  floatingButtonsContainer: {
    position: "absolute",
    bottom: 32,
    right: 24,
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    transform: [{ scale: 1 }],
  },
  modalButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  segmentedControl: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#EEF2F7",
    borderRadius: 14,
    overflow: "hidden",
    padding: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: 12,
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  segmentButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  segmentTextActive: {
    color: "#111827",
  },
  badge: {
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  badgeTextActive: {
    color: "#FFFFFF",
  },
  badgeTextInactive: {
    color: "#374151",
  },
});
