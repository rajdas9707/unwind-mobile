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
  categoryColor,
  openEditModal,
}) => {
  return (
    <View style={[styles.taskItem, { borderLeftColor: "#6B7280" }]}>
      <TouchableOpacity
        onPress={() => {
          console.log(`Toggling carried-over task completion: ${item.id}`);
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
          console.log(`Opening edit modal for carried-over task: ${item.id}`);
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
          Carried Over: {new Date(item.carriedOverAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => {
          console.log(`Deleting carried-over task: ${item.id}`);
          deleteTask(item.id);
        }}
      >
        <Ionicons name="trash-outline" size={24} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
};

export default function CarriedOverTasks() {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  const [carriedOverTasks, setCarriedOverTasks] = useState([]);
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
    console.log(`Loading carried-over tasks for category: ${category}`);
    const loadCarriedOverTasks = async () => {
      try {
        const carriedOverData = await AsyncStorage.getItem("carriedOverTasks");
        if (carriedOverData) {
          const parsedCarriedOver = JSON.parse(carriedOverData);
          const categoryCarriedOver = parsedCarriedOver[category] || [];
          setCarriedOverTasks(categoryCarriedOver);
        }
      } catch (error) {
        console.error("Error loading carried-over tasks:", error);
      }
    };

    loadCarriedOverTasks();
  }, [category]);

  const toggleTaskCompletion = async (taskId) => {
    try {
      const carriedOverData = await AsyncStorage.getItem("carriedOverTasks");
      if (carriedOverData) {
        const parsedCarriedOver = JSON.parse(carriedOverData);
        const updatedTasks = parsedCarriedOver[category].map((task) =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        parsedCarriedOver[category] = updatedTasks;
        await AsyncStorage.setItem(
          "carriedOverTasks",
          JSON.stringify(parsedCarriedOver)
        );
        setCarriedOverTasks(updatedTasks);
      }
    } catch (error) {
      console.error("Error updating carried-over task:", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const carriedOverData = await AsyncStorage.getItem("carriedOverTasks");
      if (carriedOverData) {
        const parsedCarriedOver = JSON.parse(carriedOverData);
        parsedCarriedOver[category] = parsedCarriedOver[category].filter(
          (task) => task.id !== taskId
        );
        await AsyncStorage.setItem(
          "carriedOverTasks",
          JSON.stringify(parsedCarriedOver)
        );
        setCarriedOverTasks(parsedCarriedOver[category]);
      }
    } catch (error) {
      console.error("Error deleting carried-over task:", error);
    }
  };

  const updateTask = async () => {
    if (newTask.trim()) {
      try {
        const carriedOverData = await AsyncStorage.getItem("carriedOverTasks");
        const parsedCarriedOver = carriedOverData
          ? JSON.parse(carriedOverData)
          : { [category]: [] };

        const updatedTasks = parsedCarriedOver[category].map((task) =>
          task.id === editingTaskId
            ? { ...task, text: newTask, intention }
            : task
        );
        parsedCarriedOver[category] = updatedTasks;
        await AsyncStorage.setItem(
          "carriedOverTasks",
          JSON.stringify(parsedCarriedOver)
        );
        setCarriedOverTasks(updatedTasks);

        setNewTask("");
        setIntention("");
        setEditingTaskId(null);
        setModalVisible(false);
      } catch (error) {
        console.error("Error updating carried-over task:", error);
      }
    }
  };

  const openEditModal = (task) => {
    console.log(`Opening edit modal for carried-over task: ${task.id}`);
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
            Carried Over {category} Tasks
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>
      <FlatList
        data={carriedOverTasks}
        renderItem={({ item, index }) => (
          <TaskItem
            item={item}
            index={index}
            toggleTaskCompletion={toggleTaskCompletion}
            deleteTask={deleteTask}
            categoryColor={categoryColor}
            openEditModal={openEditModal}
          />
        )}
        keyExtractor={(item) => item.id + item.carriedOverAt}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="sad-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyText}>No carried-over tasks yet.</Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
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
              <Text style={styles.modalTitle}>Edit {category} Task</Text>
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
                  onPress={updateTask}
                >
                  <Text style={styles.modalButtonText}>Save Changes</Text>
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
