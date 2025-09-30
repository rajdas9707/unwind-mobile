import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ToggleSwitch from "../../components/ToggleSwitch";

const NOTIFICATION_STORAGE_KEY = "notificationSettings";

const defaultSettings = {
  waterReminder: true,
  reminder: true,
  mistakePatternReminder: true,
  positivityReminder: true,
  allPushNotifications: true,
};

export default function NotificationsScreen() {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const storedSettings = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Error saving notification settings:", error);
      Alert.alert("Error", "Failed to save notification settings");
    }
  };

  const handleToggle = (key, value) => {
    const newSettings = { ...settings };
    
    if (key === "allPushNotifications") {
      // If toggling all notifications, update all others
      Object.keys(newSettings).forEach((settingKey) => {
        newSettings[settingKey] = value;
      });
    } else {
      // If toggling individual setting and turning it on, ensure all notifications is on
      newSettings[key] = value;
      if (value && !settings.allPushNotifications) {
        newSettings.allPushNotifications = true;
      }
      // If turning off individual setting, check if we should turn off all notifications
      if (!value) {
        const otherSettings = Object.keys(newSettings).filter(
          (k) => k !== "allPushNotifications" && k !== key
        );
        const anyOtherEnabled = otherSettings.some((k) => newSettings[k]);
        if (!anyOtherEnabled) {
          newSettings.allPushNotifications = false;
        }
      }
    }

    setSettings(newSettings);
    saveSettings(newSettings);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
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
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Card */}
        <LinearGradient
          colors={["#667EEA", "#764BA2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerCard}
        >
          <View style={styles.headerCardContent}>
            <Ionicons name="notifications" size={32} color="#FFFFFF" />
            <Text style={styles.headerCardTitle}>Stay Connected</Text>
            <Text style={styles.headerCardSubtitle}>
              Customize your notification preferences to stay on track with your wellness journey
            </Text>
          </View>
        </LinearGradient>

        {/* Master Control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Master Control</Text>
          <ToggleSwitch
            value={settings.allPushNotifications}
            onValueChange={(value) => handleToggle("allPushNotifications", value)}
            title="All Push Notifications"
            subtitle="Master switch for all app notifications"
            icon="notifications"
            activeColor="#8B5CF6"
          />
        </View>

        {/* Reminder Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminder Categories</Text>
          
          <ToggleSwitch
            value={settings.waterReminder}
            onValueChange={(value) => handleToggle("waterReminder", value)}
            title="Water Reminder"
            subtitle="Stay hydrated throughout the day"
            icon="water"
            activeColor="#06B6D4"
            disabled={!settings.allPushNotifications}
          />

          <ToggleSwitch
            value={settings.reminder}
            onValueChange={(value) => handleToggle("reminder", value)}
            title="Journal Reminder"
            subtitle="Daily prompts to write in your journal"
            icon="book"
            activeColor="#10B981"
            disabled={!settings.allPushNotifications}
          />

          <ToggleSwitch
            value={settings.mistakePatternReminder}
            onValueChange={(value) => handleToggle("mistakePatternReminder", value)}
            title="Mistake Pattern Reminder"
            subtitle="Gentle nudges to reflect on growth opportunities"
            icon="trending-up"
            activeColor="#F59E0B"
            disabled={!settings.allPushNotifications}
          />

          <ToggleSwitch
            value={settings.positivityReminder}
            onValueChange={(value) => handleToggle("positivityReminder", value)}
            title="Positivity Reminder"
            subtitle="Daily doses of motivation and encouragement"
            icon="happy"
            activeColor="#EF4444"
            disabled={!settings.allPushNotifications}
          />
        </View>

        {/* Information Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color="#6366F1" />
            <Text style={styles.infoTitle}>About Notifications</Text>
          </View>
          <Text style={styles.infoText}>
            Notifications are designed to support your wellness journey without being intrusive. 
            You can always adjust these settings based on your preferences and schedule.
          </Text>
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
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4338CA",
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
});