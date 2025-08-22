import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const MindfulMomentumTasks = () => {
  const [task, setTask] = useState("");
  const [intention, setIntention] = useState("");
  const [category, setCategory] = useState("2-Minute");
  const [tasks, setTasks] = useState({
    "2-Minute": [],
    Urgent: [],
    Important: [],
    "Low Energy": [],
  });
  const [fadeAnim] = useState(new Animated.Value(0));

  const categories = ["2-Minute", "Urgent", "Important", "Low Energy"];

  const addTask = () => {
    if (task.trim()) {
      setTasks({
        ...tasks,
        [category]: [
          ...tasks[category],
          { id: Date.now().toString(), text: task, intention },
        ],
      });
      setTask("");
      setIntention("");
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start(() => fadeAnim.setValue(0));
    }
  };

  const renderTask = ({ item }) => (
    <Animated.View style={[styles.taskItem, { opacity: fadeAnim }]}>
      <Text style={styles.taskText}>{item.text}</Text>
      <Text style={styles.intentionText}>
        Intention: {item.intention || "None"}
      </Text>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mindful Momentum Tasks</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a task..."
          placeholderTextColor="#999"
          value={task}
          onChangeText={setTask}
        />
        <TextInput
          style={styles.input}
          placeholder="Set an intention (e.g., Build clarity)"
          placeholderTextColor="#999"
          value={intention}
          onChangeText={setIntention}
        />
        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                category === cat && styles.selectedCategory,
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text style={styles.categoryText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={addTask}>
          <Ionicons name="add-circle" size={30} color="#6B7280" />
        </TouchableOpacity>
      </View>
      <View style={styles.taskListContainer}>
        {categories.map((cat) => (
          <View key={cat} style={styles.categorySection}>
            <Text style={styles.categoryHeader}>{cat} Tasks</Text>
            <FlatList
              data={tasks[cat]}
              renderItem={renderTask}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No tasks yet</Text>
              }
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4B5563",
    textAlign: "center",
    marginVertical: 20,
  },
  inputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    color: "#4B5563",
  },
  categoryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  categoryButton: {
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flex: 1,
    marginHorizontal: 5,
  },
  selectedCategory: {
    backgroundColor: "#A7F3D0",
  },
  categoryText: {
    textAlign: "center",
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    alignSelf: "center",
    marginTop: 10,
  },
  taskListContainer: {
    flex: 1,
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeader: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 10,
  },
  taskItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  taskText: {
    fontSize: 16,
    color: "#4B5563",
    fontWeight: "500",
  },
  intentionText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 5,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 20,
  },
});

export default MindfulMomentumTasks;
