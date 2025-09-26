import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import NewIdeaModal from "../components/idea/NewIdeaModal";
import { getIdeas } from "../storage/idea/db";
import { useRouter } from "expo-router";

const initialIdeas = [];

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return "Unknown";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    
    console.log("Date formatting debug:", {
      dateString,
      date: date.toISOString(),
      now: now.toISOString(),
      diffInMs,
      diffInMinutes: Math.floor(diffInMs / (1000 * 60))
    });
    
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMs < 0) return "Just now"; // Future date
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  } catch (error) {
    console.log("Error formatting date:", error);
    return "Invalid date";
  }
};

export default function IdeaScreen() {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  const loadIdeas = async () => {
    try {
      const rows = await getIdeas();
      setIdeas(rows);
    } catch (error) {
      console.log("error loading ideas", error);
    }
  };

  useEffect(() => {
    loadIdeas();
  }, []);

  const addIdea = () => {
    setModalVisible(false);
    loadIdeas();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.ideaCard}
      onPress={() => router.push({ pathname: "/idea/[id]", params: { id: item.id } })}
      activeOpacity={0.8}
    >
      <View style={styles.ideaHeader}>
        <View style={styles.ideaIcon}>
          <Ionicons name="bulb-outline" size={24} color="#F59E0B" />
        </View>
        <View style={styles.ideaContent}>
          <Text style={styles.ideaTitle} numberOfLines={2}>
            {item.name || "Untitled Idea"}
          </Text>
          <View style={styles.ideaMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={12} color="#6366F1" />
              <Text style={styles.metaText}>
                {item.tag || "miscellaneous"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="document-outline" size={12} color="#10B981" />
              <Text style={styles.metaText}>
                {(item.files || []).length} files
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="link-outline" size={12} color="#8B5CF6" />
              <Text style={styles.metaText}>
                {(item.urls || []).length} URLs
              </Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.ideaFooter}>
        <Text style={styles.timeText}>
          {formatDate(item.time)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#F8FAFC', '#F1F5F9', '#EEF2FF']}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleIcon}>
              <Ionicons name="bulb" size={28} color="#F59E0B" />
            </View>
            <View style={styles.titleText}>
              <Text style={styles.title}>IdeaStream</Text>
              <Text style={styles.subtitle}>
                {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'} captured
              </Text>
            </View>
          </View>
        </View>

        {/* Ideas List */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <FlatList
            data={ideas}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
          />
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Modal Component */}
        <NewIdeaModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSave={addIdea}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    paddingTop: Platform.OS === "android" ? 50 : 0,
  },
  header: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backdropFilter: "blur(10px)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  titleText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  ideaCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.1)",
  },
  ideaHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  ideaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  ideaContent: {
    flex: 1,
  },
  ideaTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 24,
    marginBottom: 12,
  },
  ideaMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginLeft: 4,
  },
  ideaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  timeText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
