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
import { getDocuments } from "../storage/document/db";

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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const toggleFab = () => {
    const toValue = fabOpen ? 0 : 1;
    setFabOpen(!fabOpen);
    Animated.timing(fabAnim, {
      toValue,
      duration: 180,
      useNativeDriver: true,
    }).start();
  };

  const fab1Style = {
    transform: [
      {
        translateY: fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -60],
        }),
      },
    ],
    opacity: fabAnim,
  };
  const fab2Style = {
    transform: [
      {
        translateY: fabAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -120],
        }),
      },
    ],
    opacity: fabAnim,
  };
  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const data = await getDocuments();
      setDocs(data || []);
      setFilteredDocs(data || []);

      // Animate fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
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
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        style={styles.gradientBackground}
      >
        <View style={styles.container}>
          <View style={styles.leftPane}>
            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>My Documents</Text>
              <View style={styles.lockWrap}>
                <Feather name="lock" size={18} color="#667085" />
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
            <View style={styles.tabs}>
              {["All", "Bank", "Work", "Personal", "ID"].map((t) => {
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
            </View>

            {/* Cards */}
            <Animated.View style={{ opacity: fadeAnim }}>
              <DocCardList data={filteredDocs} />
            </Animated.View>
          </View>

          {/* Floating Action Button */}
          <View style={styles.fabWrap}>
            <TouchableOpacity
              style={styles.fab}
              onPress={() => {
                setModalVisible(true);
              }}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#667eea", "#764ba2"]}
                style={styles.plusCircle}
              >
                <Feather name={fabOpen ? "x" : "plus"} size={26} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* {modal for upload} */}

          <UploadDocModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}
            onSave={handleSaveDocument}
          />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#667eea" },
  gradientBackground: { flex: 1 },
  container: { flex: 1, paddingVertical: 20, paddingHorizontal: 16 },
  leftPane: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    marginHorizontal: 4,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F1724",
    letterSpacing: 0.5,
  },
  lockWrap: {
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    height: 52,
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: "#0F1724" },
  filterBtn: {
    width: 44,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  tabs: {
    flexDirection: "row",
    marginVertical: 16,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  tabItem: {
    marginRight: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
  },
  tabActive: {
    backgroundColor: "#667eea",
  },
  tabText: { color: "#8C98A9", fontSize: 14, fontWeight: "500" },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  grid: { paddingBottom: 120 },
  card: {
    width: CARD_SIZE,
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 14,
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: "#e8eef8",
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
    }),
  },
  cardTop: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fafcff",
  },
  cardBody: { padding: 12 },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F1724",
    marginBottom: 8,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tag: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: { color: "#0B5FFF", fontWeight: "700", fontSize: 11 },
  cardMeta: { fontSize: 12, color: "#9AA4B2", flex: 1, textAlign: "right" },

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
