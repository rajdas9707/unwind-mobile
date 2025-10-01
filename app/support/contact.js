import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Animated,
  Linking,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MailComposer from "expo-mail-composer";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get('window');

export default function ContactUsScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const contactTopics = [
    { id: 'bug', title: 'Report a Bug', icon: 'bug', color: '#EF4444', bgColor: '#FEE2E2' },
    { id: 'feature', title: 'Feature Request', icon: 'lightbulb', color: '#F59E0B', bgColor: '#FEF3C7' },
    { id: 'help', title: 'Get Help', icon: 'help-circle', color: '#3B82F6', bgColor: '#DBEAFE' },
    { id: 'feedback', title: 'General Feedback', icon: 'chatbubble-ellipses', color: '#10B981', bgColor: '#D1FAE5' },
    { id: 'account', title: 'Account Issues', icon: 'person-circle', color: '#8B5CF6', bgColor: '#EDE9FE' },
    { id: 'other', title: 'Other', icon: 'ellipsis-horizontal-circle', color: '#6B7280', bgColor: '#F3F4F6' },
  ];

  useEffect(() => {
    loadUserData();
    startAnimations();
  }, []);

  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem("userInfo");
      if (stored) {
        const parsed = JSON.parse(stored);
        setName(parsed?.name || "");
        setEmail(parsed?.email || "");
      }
    } catch {}
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      })
    ]).start();
  };

  const onSend = async () => {
    if (!message.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Message Required", "Please enter your message before sending.");
      return;
    }

    try {
      setSending(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const topicTitle = selectedTopic ? contactTopics.find(t => t.id === selectedTopic)?.title : 'General Inquiry';
      const available = await MailComposer.isAvailableAsync();
      const options = {
        recipients: ["support@unwindapp.com"],
        subject: `${topicTitle} - Support request from ${name || "User"}`,
        body: `Name: ${name}\nEmail: ${email}\nTopic: ${topicTitle}\n\nMessage:\n${message}\n\n---\nSent from Unwind Mobile App`,
      };
      
      if (available) {
        await MailComposer.composeAsync(options);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("✅ Email Ready", "Your email has been prepared. Please send it from the mail composer.");
        // Clear form after successful composition
        setMessage("");
        setSelectedTopic(null);
      } else {
        // Fallback: use a mailto link
        const mailto = `mailto:support@unwindapp.com?subject=${encodeURIComponent(
          options.subject
        )}&body=${encodeURIComponent(options.body)}`;
        await Linking.openURL(mailto);
      }
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Error", "Could not open mail composer. Please try again or contact us directly at support@unwindapp.com");
    } finally {
      setSending(false);
    }
  };

  const selectTopic = async (topicId) => {
    await Haptics.selectionAsync();
    setSelectedTopic(topicId);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Gradient Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Us</Text>
          <View style={styles.headerRight} />
        </View>
        
        {/* Hero Section */}
        <Animated.View style={[
          styles.heroSection,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }] 
          }
        ]}>
          <View style={styles.heroIcon}>
            <Ionicons name="chatbubble-ellipses" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.heroTitle}>We're here to help!</Text>
          <Text style={styles.heroSubtitle}>Tell us how we can make your Unwind experience better</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[
          styles.contentContainer,
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }] 
          }
        ]}>
          {/* Contact Topics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What can we help you with?</Text>
            <View style={styles.topicsGrid}>
              {contactTopics.map((topic, index) => (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.topicCard,
                    selectedTopic === topic.id && styles.topicCardSelected,
                    { backgroundColor: selectedTopic === topic.id ? topic.bgColor : '#FFFFFF' }
                  ]}
                  onPress={() => selectTopic(topic.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.topicIcon,
                    { backgroundColor: topic.bgColor }
                  ]}>
                    <Ionicons 
                      name={topic.icon} 
                      size={20} 
                      color={topic.color} 
                    />
                  </View>
                  <Text style={[
                    styles.topicTitle,
                    selectedTopic === topic.id && { color: topic.color, fontWeight: '600' }
                  ]}>
                    {topic.title}
                  </Text>
                  {selectedTopic === topic.id && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={16} color={topic.color} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* User Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Information</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="person" size={18} color="#6B7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Name</Text>
                  <Text style={styles.infoValue}>{name || "Not provided"}</Text>
                </View>
              </View>
              
              <View style={styles.infoDivider} />
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="mail" size={18} color="#6B7280" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{email || "Not provided"}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Message Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Message</Text>
            
            <View style={styles.messageContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Tell us about your experience, report a bug, request a feature, or ask any questions..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
              />
              <View style={styles.messageFooter}>
                <Text style={styles.characterCount}>
                  {message.length}/500 characters
                </Text>
              </View>
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={onSend}
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            disabled={sending || !message.trim()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={sending ? ['#9CA3AF', '#6B7280'] : ['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendButtonGradient}
            >
              {sending ? (
                <>
                  <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
                  <Text style={styles.sendButtonText}>Sending...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.sendButtonText}>Send Message</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Contact Options */}
          <View style={styles.quickContactSection}>
            <Text style={styles.quickContactTitle}>Other ways to reach us</Text>
            
            <View style={styles.quickContactGrid}>
              <TouchableOpacity 
                style={styles.quickContactCard}
                onPress={() => Linking.openURL('mailto:support@unwindapp.com')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#F59E0B', '#F97316']}
                  style={styles.quickContactIcon}
                >
                  <Ionicons name="mail" size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.quickContactText}>Email</Text>
                <Text style={styles.quickContactSubtext}>support@unwindapp.com</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickContactCard}
                onPress={() => Linking.openURL('https://unwindapp.com/help')}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.quickContactIcon}
                >
                  <Ionicons name="help-circle" size={20} color="#FFFFFF" />
                </LinearGradient>
                <Text style={styles.quickContactText}>Help Center</Text>
                <Text style={styles.quickContactSubtext}>Browse FAQs</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { padding: 8, borderRadius: 8, backgroundColor: "#F3F4F6" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerRight: { width: 32 },
  form: { flex: 1, padding: 16 },
  label: { fontSize: 14, color: "#6B7280", marginBottom: 6, marginTop: 14 },
  readonlyBox: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    borderRadius: 10,
  },
  readonlyText: { fontSize: 16, color: "#111827" },
  messageInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 12,
    minHeight: 140,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  sendBtn: {
    marginTop: 20,
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
});
