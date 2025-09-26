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
// import { LinearGradient } from "expo-linear-gradient";
import DocCardList from "../components/document/docCard";
import UploadDocModal from "../components/document/UploadDocModal";
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
  const [docs, setDocs] = useState([]);
  const [filteredDocs, setFilteredDocs] = useState([]);
  const fabAnim = useRef(new Animated.Value(0)).current;




  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const data = await getDocuments();
      setDocs(data || []);
      setFilteredDocs(data || []);
    } catch (error) {
      console.log("error loading documents", error);
    }
  };

  const filterDocs = (tab) => {
    setActiveTab(tab);
    if (tab === "All") {
      setFilteredDocs(docs);
    } else {
      const filtered = docs.filter((doc) => doc.tag === tab);
      setFilteredDocs(filtered);
    }
  };

  const handleSaveDocument = () => {
    setModalVisible(false);
    loadDocs();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <View style={[styles.gradientBackground, { backgroundColor: '#F3F4F6' }] }>
        <View style={styles.container}>
          <View style={styles.leftPane}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <View style={styles.headerRow}>
                <View style={styles.titleSection}>
                  <View style={styles.titleIcon}>
                    <Feather name="folder" size={20} color="#6366F1" />
                  </View>
                  <View style={styles.titleTextContainer}>
                    <Text style={styles.headerTitle}>My Documents</Text>
                    <Text style={styles.headerSubtitle}>
                      {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
                    </Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity style={styles.lockWrap}>
                    <Feather name="lock" size={18} color="#667085" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
              <Feather
                name="search"
                size={18}
                color="#9AA4B2"
                style={{ marginLeft: 12 }}
              />
              <TextInput
                placeholder="Search documents..."
                placeholderTextColor="#9AA4B2"
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
              />
              <TouchableOpacity style={styles.filterBtn}>
                <Feather name="sliders" size={18} color="#9AA4B2" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
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
                      <Text
                        style={[styles.tabText, active && styles.tabTextActive]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

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
              style={[styles.fab, styles.plusCircle, { backgroundColor: "#6366F1" }]}
              onPress={() => {
                setModalVisible(true);
              }}
              activeOpacity={0.9}
              accessibilityLabel="Add Document"
            >
              <Feather name={fabOpen ? "x" : "plus"} size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* {modal for upload} */}

          <UploadDocModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onSave={handleSaveDocument}
          />
        </View>
  </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1},
  gradientBackground: { flex: 1, paddingTop: Platform.OS === "android" ? 25 : 0 },
  container: { flex: 1 },
  leftPane: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 20,
    // borderRadius: 24,
    // borderWidth: 1,
    borderColor: '#E5E7EB',
    // backgroundColor: 'red'
  },
  headerContainer: {
    marginBottom: 10,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
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
    width: 48,
    height: 48,
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  titleTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F1724",
    letterSpacing: -0.5,
    marginBottom: 4,
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
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchWrap: {
    height: 56,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { 
    flex: 1, 
    marginLeft: 8, 
    fontSize: 16, 
    color: "#0F1724",
    fontWeight: "500",
  },
  filterBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    marginRight: 4,
  },
  tabsContainer: {
    // marginBottom: 10,
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    
    // borderWidth: 1,
    // borderColor: "#E2E8F0",
    // borderRadius: 16,
    // padding: 4,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.05,
    // shadowRadius: 8,
    // elevation: 2,
  },
  tabsScrollView: {
    flexGrow: 0,
  },
  tabsContent: {
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
    paddingVertical:3,
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
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    marginHorizontal: 3,
    minWidth: 90,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tabActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    transform: [{ scale: 1.05 }],
  },
  tabText: { 
    color: "#64748B", 
    fontSize: 14, 
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  tabTextActive: { 
    color: "#FFFFFF", 
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  cardsContainer: {
    flex: 1,
    marginTop:4,
    paddingTop: 0,
    borderRightColor:'red'
  },
  cardsContent: {
    paddingBottom: 100,
    flexGrow: 1,
    paddingTop: 0,
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
    right: 36,
    bottom: 34,
    alignItems: "center",
  },
  fab: {
    width: 62,
    height: 62,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  plusCircle: {
    width: 62,
    height: 62,
    borderRadius: 32,
    backgroundColor: "#0B5FFF",
    alignItems: "center",
    justifyContent: "center",
  },
  smallFab: {
    position: "absolute",
    right: 0,
    bottom: 6,
    alignItems: "center",
  },
  smallFabBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 170,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  smallFabLabel: { marginLeft: 10, color: "#0B5FFF", fontWeight: "600" },
});
