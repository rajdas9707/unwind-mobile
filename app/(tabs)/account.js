import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { auth } from "../../firebaseConfig";
import { authorizedFetch } from "../../api/client";
import { exportDatabase } from "../testDb";

export default function AccountScreen() {
  const [userInfo, setUserInfo] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(userInfo.name);
  const [stats, setStats] = useState({
    journalEntries: 0,
    overthinkingLogs: 0,
    mistakeEntries: 0,
    streaks: 0,
  });

  useEffect(() => {
    loadUserInfo();
    loadUserStats();
    fetchProfile();
  }, []);

  const loadUserInfo = async () => {
    try {
      const storedUserInfo = await AsyncStorage.getItem("userInfo");
      if (storedUserInfo) {
        const parsed = JSON.parse(storedUserInfo); /*userInfo:{
    name: 'John Doe',
    email: 'john.doe@example.com',
    joinDate: '2024-01-15',
  }*/
        setUserInfo(parsed);
        setEditName(parsed.name);
      }
    } catch (error) {
      console.error("Error loading user info:", error);
    }
  };

  const getIdToken = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      return await currentUser.getIdToken();
    } catch (e) {
      return null;
    }
  };

  const fetchProfile = async () => {
    try {
      const idToken = await getIdToken();
      if (!idToken) return;
      const data = await authorizedFetch(
        "/api/auth/profile",
        { method: "GET" },
        idToken
      );
      // Optionally store/merge user info from backend
      if (data?.user) {
        const updatedInfo = {
          ...userInfo,
          email: data.user.email || userInfo.email,
        };
        setUserInfo(updatedInfo);
      }
    } catch (e) {
      // Ignore if unauthorized or network error; UI already works offline
    }
  };

  // Removed: password reset is handled directly via Firebase client SDK on Mobile

  const loadUserStats = async () => {
    try {
      const journalEntries = await AsyncStorage.getItem("journalEntries");
      const overthinkingEntries = await AsyncStorage.getItem(
        "overthinkingEntries"
      );
      const mistakeEntries = await AsyncStorage.getItem("mistakeEntries");

      const journalCount = journalEntries
        ? JSON.parse(journalEntries).length
        : 0;
      const overthinkingCount = overthinkingEntries
        ? JSON.parse(overthinkingEntries).length
        : 0;
      const mistakeCount = mistakeEntries
        ? JSON.parse(mistakeEntries).length
        : 0;

      setStats({
        journalEntries: journalCount,
        overthinkingLogs: overthinkingCount,
        mistakeEntries: mistakeCount,
        streaks: Math.floor(
          (journalCount + overthinkingCount + mistakeCount) / 7
        ),
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const saveUserInfo = async () => {
    try {
      const updatedInfo = { ...userInfo, name: editName };
      await AsyncStorage.setItem("userInfo", JSON.stringify(updatedInfo));
      setUserInfo(updatedInfo);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving user info:", error);
      Alert.alert("Error", "Failed to save user information");
    }
  };

  const cancelEdit = () => {
    setEditName(userInfo.name);
    setIsEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await AsyncStorage.removeItem("userToken");
            router.replace("/auth");
          } catch (error) {
            console.error("Error signing out:", error);
          }
        },
      },
    ]);
  };

  const clearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your journal entries, overthinking logs, and mistake records. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                "journalEntries",
                "overthinkingEntries",
                "mistakeEntries",
              ]);
              loadUserStats();
              Alert.alert("Success", "All data has been cleared");
            } catch (error) {
              Alert.alert("Error", "Failed to clear data");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color="#6B7280" />
          </View>

          <View style={styles.profileInfo}>
            {isEditing ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter your name"
                  placeholderTextColor="#9CA3AF"
                />
                <View style={styles.editButtons}>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveUserInfo}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={cancelEdit}
                  >
                    <Ionicons name="close" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.profileDetails}>
                <View style={styles.nameContainer}>
                  <Text style={styles.userName}>{userInfo?.name}</Text>
                  <TouchableOpacity onPress={() => setIsEditing(true)}>
                    <Ionicons name="pencil" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.userEmail}>{userInfo?.email}</Text>
                <Text style={styles.joinDate}>
                  Member since{" "}
                  {new Date(userInfo.joinDate).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>

          <View style={styles.statsGrid}>
            <LinearGradient
              colors={["#E0F2FE", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statCardInner}>
                <View style={[styles.iconChip, { backgroundColor: "#DBEAFE" }]}>
                  <Ionicons name="book" size={18} color="#2563EB" />
                </View>
                <Text style={styles.statValue}>{stats.journalEntries}</Text>
                <Text style={styles.statLabel}>Journal Entries</Text>
              </View>
            </LinearGradient>

            <LinearGradient
              colors={["#EDE9FE", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statCardInner}>
                <View style={[styles.iconChip, { backgroundColor: "#DDD6FE" }]}>
                  <Ionicons name="bulb" size={18} color="#7C3AED" />
                </View>
                <Text style={styles.statValue}>{stats.overthinkingLogs}</Text>
                <Text style={styles.statLabel}>Thoughts Released</Text>
              </View>
            </LinearGradient>

            <LinearGradient
              colors={["#FEF3C7", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statCardInner}>
                <View style={[styles.iconChip, { backgroundColor: "#FDE68A" }]}>
                  <Ionicons name="alert-circle" size={18} color="#D97706" />
                </View>
                <Text style={styles.statValue}>{stats.mistakeEntries}</Text>
                <Text style={styles.statLabel}>Lessons Learned</Text>
              </View>
            </LinearGradient>

            <LinearGradient
              colors={["#FEE2E2", "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.statCardGradient}
            >
              <View style={styles.statCardInner}>
                <View style={[styles.iconChip, { backgroundColor: "#FECACA" }]}>
                  <Ionicons name="flame" size={18} color="#DC2626" />
                </View>
                <Text style={styles.statValue}>{stats.streaks}</Text>
                <Text style={styles.statLabel}>Week Streaks</Text>
              </View>
            </LinearGradient>
          </View>

          <LinearGradient
            colors={["#F1F5F9", "#FFFFFF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.historyCardGradient}
          >
            <TouchableOpacity
              style={styles.historyRow}
              onPress={() => router.push("/history")}
            >
              <View style={styles.historyLeft}>
                <View style={[styles.iconChip, { backgroundColor: "#E2E8F0" }]}>
                  <Ionicons name="time" size={18} color="#334155" />
                </View>
                <Text style={styles.historyText}>Meditation History</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#64748B" />
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="notifications" size={20} color="#6B7280" />
            <Text style={styles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="shield-checkmark" size={20} color="#6B7280" />
            <Text style={styles.settingText}>Privacy</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="download" size={20} color="#6B7280" />
            <Text style={styles.settingText}>Export Data</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={clearAllData}>
            <Ionicons name="trash" size={20} color="#EF4444" />
            <Text style={[styles.settingText, { color: "#EF4444" }]}>
              Clear All Data
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="help-circle" size={20} color="#6B7280" />
            <Text style={styles.settingText}>Help Center</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="mail" size={20} color="#6B7280" />
            <Text style={styles.settingText}>Contact Us</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="star" size={20} color="#6B7280" />
            <Text style={styles.settingText}>Rate App</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Export Database Button */}
        <TouchableOpacity style={styles.exportButton} onPress={exportDatabase}>
          <Ionicons name="download" size={20} color="#FFFFFF" />
          <Text style={styles.exportText}>Export Database</Text>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#EF4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  editContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: "#374151",
    marginRight: 8,
  },
  editButtons: {
    flexDirection: "row",
  },
  saveButton: {
    backgroundColor: "#10B981",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  profileDetails: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginRight: 8,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  joinDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statCardGradient: {
    borderRadius: 14,
    width: "48%",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardInner: {
    padding: 16,
    alignItems: "center",
    minHeight: 120,
    borderRadius: 14,
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  historyCardGradient: {
    borderRadius: 14,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#334155",
    fontWeight: "600",
  },
  settingItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
  },
  signOutButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
    marginLeft: 8,
  },
  exportButton: {
    backgroundColor: "#8B5CF6",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  exportText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});
