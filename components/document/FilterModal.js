import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const FilterModal = ({ 
  visible, 
  onClose, 
  sortBy, 
  sortOrder, 
  onSortChange,
  onClearFilters 
}) => {
  const sortOptions = [
    { key: "name", label: "Name", icon: "text" },
    { key: "date", label: "Last Opened", icon: "time" },
    { key: "size", label: "File Count", icon: "documents" },
  ];

  const handleSortSelect = (newSortBy) => {
    const newOrder = sortBy === newSortBy && sortOrder === "asc" ? "desc" : "asc";
    onSortChange(newSortBy, newOrder);
  };

  const getSortIcon = (optionKey) => {
    if (sortBy !== optionKey) return "chevron-down";
    return sortOrder === "asc" ? "chevron-up" : "chevron-down";
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.backdrop}>
          <TouchableOpacity 
            style={styles.backdropTouch} 
            activeOpacity={1} 
            onPress={onClose} 
          />
          
          <View style={styles.modalContent}>
            {/* Header */}
            <LinearGradient
              colors={['#667EEA', '#764BA2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              {/* Sort Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sort By</Text>
                
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.optionItem,
                      sortBy === option.key && styles.activeOption
                    ]}
                    onPress={() => handleSortSelect(option.key)}
                  >
                    <View style={styles.optionLeft}>
                      <View style={[
                        styles.optionIcon,
                        sortBy === option.key && styles.activeOptionIcon
                      ]}>
                        <Ionicons 
                          name={option.icon} 
                          size={20} 
                          color={sortBy === option.key ? "#FFFFFF" : "#667EEA"} 
                        />
                      </View>
                      <Text style={[
                        styles.optionText,
                        sortBy === option.key && styles.activeOptionText
                      ]}>
                        {option.label}
                      </Text>
                    </View>
                    
                    <View style={styles.optionRight}>
                      {sortBy === option.key && (
                        <Text style={styles.sortOrderText}>
                          {sortOrder === "asc" ? "A-Z" : "Z-A"}
                        </Text>
                      )}
                      <Ionicons 
                        name={getSortIcon(option.key)} 
                        size={20} 
                        color={sortBy === option.key ? "#667EEA" : "#9CA3AF"} 
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.clearButton}
                  onPress={() => {
                    onClearFilters();
                    onClose();
                  }}
                >
                  <Ionicons name="refresh" size={20} color="#EF4444" />
                  <Text style={styles.clearButtonText}>Reset Filters</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdropTouch: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeOption: {
    backgroundColor: "#EEF2FF",
    borderColor: "#667EEA",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activeOptionIcon: {
    backgroundColor: "#667EEA",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  activeOptionText: {
    color: "#667EEA",
  },
  optionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sortOrderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#667EEA",
  },
  actions: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
    marginLeft: 8,
  },
});

export default FilterModal;