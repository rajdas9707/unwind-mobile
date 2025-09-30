import React, { useState, useRef, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  ScrollView,
} from "react-native";
import {
  Feather,
  MaterialIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DocCardList from "../components/document/docCard";
import UploadDocModal from "../components/document/UploadDocModal";
import FilterModal from "../components/document/FilterModal";
import { getDocuments } from "../storage/document/db";
import { CATEGORIES } from "../utils/categories";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 12;
const CARD_SIZE = (width - CARD_MARGIN * 3 - 40) / 2;

export default function Document() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [fabOpen, setFabOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [docs, setDocs] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const [sortBy, setSortBy] = useState("name"); // name, date, size
  const [sortOrder, setSortOrder] = useState("asc"); // asc, desc
  const fabAnim = useRef(new Animated.Value(0)).current;




  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const data = await getDocuments();
      setDocs(data || []);
      applyFilters(data || [], query, activeTab);
    } catch (error) {
      console.log("error loading documents", error);
    }
  };

  // Search and filter logic
  const applyFilters = (docsList, searchQuery, category) => {
    let filtered = [...docsList];

    // Apply category filter
    if (category !== "All") {
      filtered = filtered.filter((doc) => 
        doc.tag?.toLowerCase() === category.toLowerCase()
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((doc) => {
        const nameMatch = doc.docName?.toLowerCase().includes(query);
        const tagMatch = doc.tag?.toLowerCase().includes(query);
        const filesMatch = doc.files?.some(file => 
          file.name?.toLowerCase().includes(query)
        );
        return nameMatch || tagMatch || filesMatch;
      });
    }

    // Apply sorting
    filtered = sortDocuments(filtered);
    
    setFilteredDocs(filtered);
  };

  const sortDocuments = (docsList) => {
    return [...docsList].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.docName?.toLowerCase() || "";
          bValue = b.docName?.toLowerCase() || "";
          break;
        case "date":
          aValue = new Date(a.lastOpenedAt || a.createdAt || 0);
          bValue = new Date(b.lastOpenedAt || b.createdAt || 0);
          break;
        case "size":
          aValue = (a.files || []).length;
          bValue = (b.files || []).length;
          break;
        default:
          return 0;
      }
      
      if (sortBy === "date") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      } else if (sortBy === "size") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      } else {
        if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
        if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
        return 0;
      }
    });
  };

  const filterDocs = (tab) => {
    setActiveTab(tab);
    applyFilters(docs, query, tab);
  };

  // Handle search input change
  const handleSearchChange = (text) => {
    setQuery(text);
    applyFilters(docs, text, activeTab);
  };

  // Handle sort change
  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    applyFilters(docs, query, activeTab);
  };

  // Clear search
  const clearSearch = () => {
    setQuery("");
    applyFilters(docs, "", activeTab);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setQuery("");
    setActiveTab("All");
    setSortBy("name");
    setSortOrder("asc");
    applyFilters(docs, "", "All");
  };

  const handleSaveDocument = () => {
    setModalVisible(false);
    loadDocs();
  };

  // Use effect to reapply filters when sort changes
  useEffect(() => {
    if (docs.length > 0) {
      applyFilters(docs, query, activeTab);
    }
  }, [sortBy, sortOrder]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667EEA', '#764BA2', '#F093FB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <View style={styles.container}>
          <View style={styles.leftPane}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerGradient}
              >
                <View style={styles.headerRow}>
                  <View style={styles.titleSection}>
                    <LinearGradient
                      colors={['#667EEA', '#764BA2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.titleIcon}
                    >
                      <Feather name="folder" size={24} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.titleTextContainer}>
                      <Text style={styles.headerTitle}>My Documents</Text>
                      <Text style={styles.headerSubtitle}>
                        {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.lockWrap}>
                      <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Search */}
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.searchWrap}
            >
              <View style={styles.searchIconWrap}>
                <Ionicons
                  name="search"
                  size={20}
                  color="#667EEA"
                />
              </View>
              <TextInput
                placeholder="Search documents..."
                placeholderTextColor="#9CA3AF"
                value={query}
                onChangeText={handleSearchChange}
                style={styles.searchInput}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              <TouchableOpacity 
                style={styles.filterBtn}
                onPress={() => setFilterModalVisible(true)}
              >
                <LinearGradient
                  colors={['#667EEA', '#764BA2']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.filterGradient}
                >
                  <Ionicons name="options" size={18} color="#FFFFFF" />
                  {(sortBy !== "name" || sortOrder !== "asc") && (
                    <View style={styles.filterDot} />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </LinearGradient>

            {/* Tabs */}
            <LinearGradient
              colors={['#F1F5F9', '#E2E8F0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tabsContainer}
            >
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.tabsScrollView}
                contentContainerStyle={styles.tabsContent}
              >
                {CATEGORIES.map((t) => {
                  const active = activeTab === t;
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.tabItem, active && styles.tabActive]}
                      onPress={() => filterDocs(t)}
                    >
                      {active ? (
                        <LinearGradient
                          colors={['#667EEA', '#764BA2']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.activeTabGradient}
                        >
                          <Text style={[styles.tabText, styles.tabTextActive]}>
                            {t}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <Text style={styles.tabText}>
                          {t}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </LinearGradient>

            {/* Cards */}
            <ScrollView 
              style={styles.cardsContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.cardsContent}
            >
              <DocCardList data={filteredDocs} />
            </ScrollView>
          </View>

          {/* Floating Action Button */}
          <View style={styles.fabWrap}>
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {
                setModalVisible(true);
              }}
              activeOpacity={0.8}
              accessibilityLabel="Add Document"
            >
              <LinearGradient
                colors={['#FF6B6B', '#4ECDC4', '#45B7D1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fabGradient}
              >
                <Ionicons name={fabOpen ? "close" : "add"} size={28} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* {modal for upload} */}

          <UploadDocModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onSave={handleSaveDocument}
          />

          <FilterModal
            visible={filterModalVisible}
            onClose={() => setFilterModalVisible(false)}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            onClearFilters={clearAllFilters}
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1,
    backgroundColor: '#667EEA',
  },
  gradientBackground: { 
    flex: 1, 
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  container: { 
    flex: 1,
  },
  leftPane: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 0,
    paddingHorizontal: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  headerContainer: {
    marginBottom: 16,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
    shadowColor: "#667EEA",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  titleTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1F2937",
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  lockWrap: {
    backgroundColor: "#ECFDF5",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  searchWrap: {
    height: 60,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  searchIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  searchInput: { 
    flex: 1,
    fontSize: 16, 
    color: "#1F2937",
    fontWeight: "500",
  },
  filterBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  filterGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filterDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B6B",
  },
  tabsContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tabsScrollView: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingHorizontal: 0,
    alignItems: "center",
    gap: 6,
    paddingVertical: 0,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    height: "auto",
    
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
    minWidth: 70,
    minHeight: 36,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tabActive: {
    borderColor: "transparent",
    shadowColor: "#667EEA",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  activeTabGradient: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
    minHeight: 36,
  },
  tabText: { 
    color: "#6B7280", 
    fontSize: 14, 
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  tabTextActive: { 
    color: "#FFFFFF", 
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  cardsContent: {
    paddingBottom: 100,
    flexGrow: 1,
    paddingTop: 4,
  },
  card: {
    width: CARD_SIZE,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardBody: { 
    padding: 14,
    paddingTop: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F1724",
    marginBottom: 6,
    lineHeight: 20,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  tag: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  tagText: { 
    color: "#6366F1", 
    fontWeight: "600", 
    fontSize: 12,
    letterSpacing: 0.2,
  },
  cardMeta: { 
    fontSize: 11, 
    color: "#64748B", 
    flex: 1, 
    textAlign: "right",
    fontWeight: "500",
  },

  fabWrap: {
    position: "absolute",
    right: 20,
    bottom: 24,
    alignItems: "center",
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
