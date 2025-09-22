import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  calculateCompletionPercentage,
  createList,
  deleteList,
  formatDate,
  getAllLists,
  getDefaultListName,
} from "../storage/buyItems/storage.js";

const { width } = Dimensions.get("window");

export default function ThingsToBuy() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);

  // Load lists from storage
  const loadLists = async () => {
    try {
      const allLists = await getAllLists();
      setLists(allLists);
    } catch (error) {
      console.error("Error loading lists:", error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh lists
  const onRefresh = async () => {
    setRefreshing(true);
    await loadLists();
    setRefreshing(false);
  };

  // Focus effect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadLists();
    }, [])
  );

  // Initial load
  useEffect(() => {
    loadLists();
  }, []);

  // Create new list
  const handleCreateList = async () => {
    if (creating) return;

    const listName = newListName.trim() || getDefaultListName();

    setCreating(true);
    try {
      const listId = await createList(listName);
      if (listId) {
        setModalVisible(false);
        setNewListName("");
        await loadLists();

        // Navigate to the new list
        router.push({
          pathname: "/screens/BuyItemsList",
          params: { listId, listName },
        });
      }
    } catch (error) {
      console.error("Error creating list:", error);
    } finally {
      setCreating(false);
    }
  };

  // Navigate to list items
  const handleListPress = (list) => {
    router.push({
      pathname: "/screens/BuyItemsList",
      params: { listId: list.id, listName: list.name },
    });
  };

  // Delete list with confirmation
  const handleDeleteList = async (listId, listName) => {
    const deleted = await deleteList(listId);
    if (deleted) {
      await loadLists();
    }
  };

  // Format completion text
  const getCompletionText = (totalItems, boughtItems) => {
    if (totalItems === 0) return "Empty list";
    if (boughtItems === totalItems) return "Completed";
    return `${boughtItems} of ${totalItems} items`;
  };

  // Get completion color
  const getCompletionColor = (totalItems, boughtItems) => {
    if (totalItems === 0) return "#9CA3AF";
    const percentage = calculateCompletionPercentage(totalItems, boughtItems);
    if (percentage === 100) return "#10B981";
    if (percentage >= 50) return "#F59E0B";
    return "#EF4444";
  };

  // Render list card
  const renderListCard = (list) => {
    const completionPercentage = calculateCompletionPercentage(
      list.total_items,
      list.bought_items
    );
    const completionColor = getCompletionColor(
      list.total_items,
      list.bought_items
    );
    const completionText = getCompletionText(
      list.total_items,
      list.bought_items
    );

    return (
      <TouchableOpacity
        key={list.id}
        style={styles.listCard}
        onPress={() => handleListPress(list)}
        activeOpacity={0.7}
      >
        <View style={styles.listHeader}>
          <View style={styles.listTitleContainer}>
            <Text style={styles.listTitle} numberOfLines={2}>
              {list.name}
            </Text>
            <Text style={styles.listDate}>{formatDate(list.created_at)}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteList(list.id, list.name)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.listFooter}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${completionPercentage}%`,
                    backgroundColor: completionColor,
                  },
                ]}
              />
            </View>
            <Text style={[styles.completionText, { color: completionColor }]}>
              {completionText}
            </Text>
          </View>
          <View style={styles.itemsIndicator}>
            <Ionicons name="bag-outline" size={16} color={completionColor} />
            <Text style={[styles.itemsCount, { color: completionColor }]}>
              {list.total_items}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading shopping lists...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Shopping Lists</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#8B5CF6"]}
            tintColor="#8B5CF6"
          />
        }
      >
        {lists.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="bag-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No Shopping Lists Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first shopping list to get started organizing your
              purchases
            </Text>
          </View>
        ) : (
          <View style={styles.listsContainer}>{lists.map(renderListCard)}</View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create List Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Shopping List</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>List Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder={getDefaultListName()}
                value={newListName}
                onChangeText={setNewListName}
                maxLength={100}
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={handleCreateList}
              />
              <Text style={styles.inputHint}>
                Leave empty to use today's date as the name
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  creating && styles.saveButtonDisabled,
                ]}
                onPress={handleCreateList}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginLeft: -32,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  listsContainer: {
    padding: 16,
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  listTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
    lineHeight: 24,
  },
  listDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  deleteButton: {
    padding: 4,
  },
  listFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    minWidth: 6,
  },
  completionText: {
    fontSize: 12,
    fontWeight: "500",
  },
  itemsIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemsCount: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    margin: 20,
    width: width - 40,
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
