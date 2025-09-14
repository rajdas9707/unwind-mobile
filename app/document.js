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
import DocCardList from "../components/document/docCard";
import UploadDocModal from "../components/document/UploadDocModal";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 12;
const CARD_SIZE = (width - CARD_MARGIN * 3 - 40) / 2;

const sampleDocs = [
  {
    id: "1",
    title: "PAN Card",
    tag: "IDS",
    meta: "Last opened: 2 days ago",
    icon: { lib: Feather, name: "id-card", color: "#0B5FFF" },
  },
  {
    id: "2",
    title: "Passport",
    tag: "IDS",
    meta: "Expires: 12/25",
    icon: { lib: FontAwesome5, name: "passport", color: "#0B5FFF" },
  },
  {
    id: "3",
    title: "Bank Statement",
    tag: "Bank",
    meta: "Last opened: 3 month ago",
    icon: { lib: Ionicons, name: "card-outline", color: "#0B5FFF" },
  },
  {
    id: "4",
    title: "Work Contract",
    tag: "IDS",
    meta: "Last opened: 3 weeks ago",
    icon: { lib: MaterialIcons, name: "work-outline", color: "#0B5FFF" },
  },
];

export default function Document() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [fabOpen, setFabOpen] = useState(false);
  const[modalVisible,setModalVisible]=useState(false)
  const fabAnim = useRef(new Animated.Value(0)).current;

 

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
    const data = await getDocuments();
    setDocs(data);
  };
 

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f6f7f8" />
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
            {["All", "Bank", "Work", "Personal", "Expiring Soon"].map((t) => {
              const active = activeTab === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabItem, active && styles.tabActive]}
                  onPress={() => setActiveTab(t)}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cards */}
        <DocCardList  data={sampleDocs}/>
        </View>

        {/* Floating Action Button */}
        <View style={styles.fabWrap}>
          <Animated.View style={[styles.smallFab, fab2Style]}>
            <TouchableOpacity style={styles.smallFabBtn}>
              <Ionicons name="camera" size={18} color="#0B5FFF" />
              <Text style={styles.smallFabLabel}>Camera</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.smallFab, fab1Style]}>
            <TouchableOpacity style={styles.smallFabBtn} onPress={()=>setModalVisible(true)}>
              <Ionicons name="cloud-upload-outline" size={18} color="#0B5FFF" />
              <Text style={styles.smallFabLabel}>Upload </Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.fab}
            onPress={toggleFab}
            activeOpacity={0.9}
          >
            <View style={styles.plusCircle}>
              <Feather name={fabOpen ? "x" : "plus"} size={26} color="#fff" />
            </View>
          </TouchableOpacity>
        </View>

        {/* {modal for upload} */}

        <UploadDocModal visible={modalVisible} onClose={()=>setModalVisible(false)}/>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f7f8" },
  container: { flex: 1, paddingVertical:10},
  leftPane: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    ...Platform.select({
      android: { elevation: 6 },
      ios: {
        shadowColor: "#cfd8e3",
        shadowOffset: { width: -4, height: -4 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
    }),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: "700", color: "#0F1724" },
  lockWrap: {
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrap: {
    height: 48,
    backgroundColor: "#f6f7f9",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
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
  tabs: { flexDirection: "row", marginVertical: 12, alignItems: "center" },
  tabItem: {
    marginRight: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#0B5FFF",
  },
  tabText: { color: "#8C98A9", fontSize: 14 },
  tabTextActive: { color: "#0B5FFF", fontWeight: "600" },
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
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0F1724", marginBottom: 8 },
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

  fabWrap: { position: "absolute", right: 36, bottom: 34, alignItems: "center" },
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
