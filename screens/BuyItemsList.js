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
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import {
  calculateCompletionPercentage,
  createItem,
  deleteItem,
  getItemsByListId,
  toggleItemBought,
  updateItem,
} from "../storage/buyItems/storage.js";

const { width } = Dimensions.get("window");

export default function BuyItemsList() {
  const params = useLocalSearchParams();
  const listId = parseInt(params.listId);
  const listName = params.listName || "Shopping List";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemLocation, setNewItemLocation] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Load items from storage
  const loadItems = async () => {
    try {
      const allItems = await getItemsByListId(listId);
      setItems(allItems);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh items
  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  // Focus effect to reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (listId) {
        loadItems();
      }
    }, [listId])
  );

  // Initial load
  useEffect(() => {
    if (listId) {
      loadItems();
    } else {
      Alert.alert("Error", "Invalid list ID", [
        { text: "OK", onPress: () => router.back() },
      ]);
    }
  }, [listId]);

  // Create new item
  const handleCreateItem = async () => {
    if (creating) return;

    setCreating(true);
    try {
      const itemId = await createItem(listId, newItemName, newItemLocation);
      if (itemId) {
        setModalVisible(false);
        setNewItemName("");
        setNewItemLocation("");
        await loadItems();
      }
    } catch (error) {
      console.error("Error creating item:", error);
    } finally {
      setCreating(false);
    }
  };

  // Toggle item bought status
  const handleToggleItem = async (itemId) => {
    try {
      const success = await toggleItemBought(itemId);
      if (success) {
        await loadItems();
      }
    } catch (error) {
      console.error("Error toggling item:", error);
    }
  };

  // Edit item
  const handleEditItem = (item) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemLocation(item.location || "");
    setEditModalVisible(true);
  };

  // Update item
  const handleUpdateItem = async () => {
    if (updating || !editingItem) return;

    setUpdating(true);
    try {
      const success = await updateItem(
        editingItem.id,
        newItemName,
        newItemLocation
      );
      if (success) {
        setEditModalVisible(false);
        setEditingItem(null);
        setNewItemName("");
        setNewItemLocation("");
        await loadItems();
      }
    } catch (error) {
      console.error("Error updating item:", error);
    } finally {
      setUpdating(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId) => {
    try {
      const deleted = await deleteItem(itemId);
      if (deleted) {
        await loadItems();
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  // Cancel modal
  const handleCancelModal = () => {
    setModalVisible(false);
    setNewItemName("");
    setNewItemLocation("");
  };

  // Cancel edit modal
  const handleCancelEditModal = () => {
    setEditModalVisible(false);
    setEditingItem(null);
    setNewItemName("");
    setNewItemLocation("");
  };

  // Get stats
  const getStats = () => {
    const total = items.length;
    const bought = items.filter((item) => item.is_bought).length;
    const remaining = total - bought;
    const percentage = calculateCompletionPercentage(total, bought);

    return { total, bought, remaining, percentage };
  };

  // Render item
  const renderItem = (item) => {
    const isBought = Boolean(item.is_bought);

    return (
      <View
        key={item.id}
        style={[styles.itemCard, isBought && styles.itemCardBought]}
      >
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => handleToggleItem(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, isBought && styles.checkboxChecked]}>
              {isBought && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </View>
          </View>

          <View style={styles.itemInfo}>
            <Text
              style={[styles.itemName, isBought && styles.itemNameBought]}
              numberOfLines={2}
            >
              {item.name}
            </Text>
            {item.location && (
              <Text
                style={[
                  styles.itemLocation,
                  isBought && styles.itemLocationBought,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={isBought ? "#9CA3AF" : "#6B7280"}
                />{" "}
                {item.location}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditItem(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil" size={18} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteItem(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const stats = getStats();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading items...</Text>
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
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {listName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {stats.total > 0
              ? `${stats.bought} of ${stats.total} items`
              : "Empty list"}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${stats.percentage}%`,
                  backgroundColor:
                    stats.percentage === 100 ? "#10B981" : "#8B5CF6",
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {stats.percentage === 100
              ? "Completed!"
              : `${stats.remaining} items remaining`}
          </Text>
        </View>
      )}

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
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="list-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>No Items Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your first item to start building your shopping list
            </Text>
          </View>
        ) : (
          <View style={styles.itemsContainer}>
            {/* Unbought items first */}
            {items.filter((item) => !item.is_bought).map(renderItem)}

            {/* Bought items at the bottom */}
            {items.filter((item) => item.is_bought).length > 0 && (
              <View style={styles.completedSection}>
                <Text style={styles.completedSectionTitle}>
                  Completed ({items.filter((item) => item.is_bought).length})
                </Text>
                {items.filter((item) => item.is_bought).map(renderItem)}
              </View>
            )}
          </View>
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

      {/* Add Item Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCancelModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Item</Text>
              <TouchableOpacity
                onPress={handleCancelModal}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter item name"
                value={newItemName}
                onChangeText={setNewItemName}
                maxLength={100}
                autoFocus={true}
                returnKeyType="next"
                onSubmitEditing={() => {
                  // Focus next input if possible
                }}
              />

              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Store section or location"
                value={newItemLocation}
                onChangeText={setNewItemLocation}
                maxLength={100}
                returnKeyType="done"
                onSubmitEditing={handleCreateItem}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (creating || !newItemName.trim()) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleCreateItem}
                disabled={creating || !newItemName.trim()}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={handleCancelEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TouchableOpacity
                onPress={handleCancelEditModal}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter item name"
                value={newItemName}
                onChangeText={setNewItemName}
                maxLength={100}
                autoFocus={true}
                returnKeyType="next"
              />

              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Store section or location"
                value={newItemLocation}
                onChangeText={setNewItemLocation}
                maxLength={100}
                returnKeyType="done"
                onSubmitEditing={handleUpdateItem}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelEditModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (updating || !newItemName.trim()) &&
                    styles.saveButtonDisabled,
                ]}
                onPress={handleUpdateItem}
                disabled={updating || !newItemName.trim()}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
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
  headerContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  headerSpacer: {
    width: 32,
  },
  progressSection: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    minWidth: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  itemsContainer: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  itemCardBought: {
    opacity: 0.6,
    backgroundColor: "#F9FAFB",
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  checkboxContainer: {
    marginRight: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxChecked: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    marginBottom: 4,
    lineHeight: 20,
  },
  itemNameBought: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  itemLocation: {
    fontSize: 14,
    color: "#6B7280",
    flexDirection: "row",
    alignItems: "center",
  },
  itemLocationBought: {
    color: "#9CA3AF",
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 12,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  completedSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  completedSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 16,
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
    backgroundColor: "#10B981",
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
    marginBottom: 16,
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
    backgroundColor: "#10B981",
    borderRadius: 12,
    minHeight: 48,
    justifyContent: "center",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
