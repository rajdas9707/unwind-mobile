import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../firebaseConfig";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import ToggleSwitch from "../../components/ToggleSwitch";

const SYNC_SETTINGS_KEY = "dataSyncSettings";

const defaultSyncSettings = {
  dataSyncEnabled: true,
  lastSyncDate: null,
};

export default function PrivacyScreen() {
  const [syncSettings, setSyncSettings] = useState(defaultSyncSettings);
  const [loading, setLoading] = useState(true);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadSyncSettings();
  }, []);

  const loadSyncSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem(SYNC_SETTINGS_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSyncSettings({ ...defaultSyncSettings, ...parsed });
      }
    } catch (error) {
      console.error("Error loading sync settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSyncSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Error saving sync settings:", error);
      Alert.alert("Error", "Failed to save privacy settings");
    }
  };

  const handleDataSyncToggle = (enabled) => {
    if (!enabled) {
      Alert.alert(
        "Disable Data Sync",
        "This will stop syncing your data to our secure cloud servers. Your data will only be stored locally on this device. You can re-enable this anytime.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disable Sync",
            style: "destructive",
            onPress: () => {
              const newSettings = {
                ...syncSettings,
                dataSyncEnabled: false,
                lastSyncDate: new Date().toISOString(),
              };
              setSyncSettings(newSettings);
              saveSyncSettings(newSettings);
            },
          },
        ]
      );
    } else {
      const newSettings = {
        ...syncSettings,
        dataSyncEnabled: true,
        lastSyncDate: new Date().toISOString(),
      };
      setSyncSettings(newSettings);
      saveSyncSettings(newSettings);
      
      Alert.alert(
        "Data Sync Enabled",
        "Your data will now sync to our secure cloud servers. This helps keep your data safe and accessible across devices."
      );
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }

    if (!newPassword.trim()) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    try {
      setChangingPassword(true);
      const user = auth.currentUser;
      
      if (!user || !user.email) {
        Alert.alert("Error", "User not found. Please sign in again.");
        return;
      }

      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      Alert.alert(
        "Password Changed",
        "Your password has been successfully updated.",
        [
          {
            text: "OK",
            onPress: () => {
              setChangePasswordVisible(false);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error changing password:", error);
      
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        Alert.alert("Error", "Current password is incorrect");
      } else if (error.code === "auth/weak-password") {
        Alert.alert("Error", "New password is too weak. Please choose a stronger password.");
      } else {
        Alert.alert("Error", "Failed to change password. Please try again.");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const getLastSyncText = () => {
    if (!syncSettings.lastSyncDate) return "Never synced";
    const date = new Date(syncSettings.lastSyncDate);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Synced less than an hour ago";
    if (diffHours === 1) return "Synced 1 hour ago";
    if (diffHours < 24) return `Synced ${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Synced 1 day ago";
    return `Synced ${diffDays} days ago`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667EEA" />
          <Text style={styles.loadingText}>Loading privacy settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.title}>Privacy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Card */}
        <LinearGradient
          colors={["#4F46E5", "#7C3AED", "#EC4899"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerCardContent}>
            <Ionicons name="shield-checkmark" size={32} color="#FFFFFF" />
            <Text style={styles.headerCardTitle}>Your Privacy Matters</Text>
            <Text style={styles.headerCardSubtitle}>
              Control how your data is stored and managed
            </Text>
          </View>
        </LinearGradient>

        {/* Data Sync Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Synchronization</Text>
          
          <ToggleSwitch
            value={syncSettings.dataSyncEnabled}
            onValueChange={handleDataSyncToggle}
            title="Cloud Data Sync"
            subtitle={syncSettings.dataSyncEnabled ? "Your data syncs to secure cloud servers" : "Data only stored locally on this device"}
            icon="cloud"
            activeColor="#10B981"
          />

          {/* Sync Status */}
          <View style={styles.syncStatusCard}>
            <View style={styles.syncStatusHeader}>
              <Ionicons 
                name={syncSettings.dataSyncEnabled ? "checkmark-circle" : "pause-circle"} 
                size={20} 
                color={syncSettings.dataSyncEnabled ? "#10B981" : "#F59E0B"} 
              />
              <Text style={styles.syncStatusTitle}>Sync Status</Text>
            </View>
            <Text style={styles.syncStatusText}>
              {getLastSyncText()}
            </Text>
            {!syncSettings.dataSyncEnabled && (
              <Text style={styles.syncWarningText}>
                ⚠️ Data sync is disabled. Your data won't be backed up.
              </Text>
            )}
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          {!changePasswordVisible ? (
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setChangePasswordVisible(true)}
            >
              <View style={styles.settingLeft}>
                <LinearGradient
                  colors={["#EF4444", "#F59E0B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.settingIcon}
                >
                  <Ionicons name="key" size={20} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>Change Password</Text>
                  <Text style={styles.settingSubtitle}>Update your account password</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.changePasswordForm}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Change Password</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setChangePasswordVisible(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Current Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  editable={!changingPassword}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  editable={!changingPassword}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  editable={!changingPassword}
                />
              </View>

              <TouchableOpacity 
                style={[styles.changePasswordButton, changingPassword && styles.buttonDisabled]}
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.changePasswordButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  headerCard: {
    borderRadius: 20,
    marginBottom: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  headerCardContent: {
    padding: 24,
    alignItems: "center",
  },
  headerCardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 12,
    marginBottom: 8,
  },
  headerCardSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    paddingLeft: 4,
  },
  syncStatusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  syncStatusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  syncStatusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  syncStatusText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  syncWarningText: {
    fontSize: 13,
    color: "#F59E0B",
    fontWeight: "500",
  },
  settingItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  changePasswordForm: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#374151",
    backgroundColor: "#FFFFFF",
  },
  changePasswordButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: "#FCA5A5",
  },
  changePasswordButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomSpacing: {
    height: 20,
  },
});