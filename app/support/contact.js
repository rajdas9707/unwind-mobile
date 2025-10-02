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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
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
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

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
      })
    ]).start();
  };

  const onSend = async () => {
    // Validate required fields
    if (!name.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Name Required", "Please enter your name.");
      return;
    }
    
    if (!email.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Email Required", "Please enter your email address.");
      return;
    }
    
    if (!subject.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Subject Required", "Please enter a subject for your message.");
      return;
    }
    
    if (!message.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Message Required", "Please enter your message.");
      return;
    }

    try {
      setSending(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const available = await MailComposer.isAvailableAsync();
      const options = {
        recipients: ["support@unwindapp.com"],
        subject: subject.trim(),
        body: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message.trim()}\n\n---\nSent from Unwind Mobile App`,
      };
      
      if (available) {
        await MailComposer.composeAsync(options);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("✅ Email Ready", "Your email has been prepared. Please send it from the mail composer.");
        // Clear form after successful composition
        setSubject("");
        setMessage("");
      } else {
        // Fallback: use a mailto link
        const mailto = `mailto:support@unwindapp.com?subject=${encodeURIComponent(
          options.subject
        )}&body=${encodeURIComponent(options.body)}`;
        await Linking.openURL(mailto);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("✅ Email Sent", "Your email has been sent successfully!");
        // Clear form after successful send
        setSubject("");
        setMessage("");
      }
    } catch (e) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("❌ Error", "Could not send email. Please try again or contact us directly at support@unwindapp.com");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Contact Us</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={[
          styles.formContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }] 
          }
        ]}>
          {/* Welcome Message */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeIcon}>
              <Ionicons name="mail" size={24} color="#667eea" />
            </View>
            <Text style={styles.welcomeTitle}>Get in Touch</Text>
            <Text style={styles.welcomeSubtitle}>We'd love to hear from you. Fill out the form below and we'll get back to you as soon as possible.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email address"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Subject Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Subject *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="document-text-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Brief description of your inquiry"
                  placeholderTextColor="#9CA3AF"
                  value={subject}
                  onChangeText={setSubject}
                  autoCapitalize="sentences"
                />
              </View>
            </View>

            {/* Message Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Message *</Text>
              <View style={styles.messageContainer}>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Tell us more about your inquiry, feedback, or issue..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={6}
                  value={message}
                  onChangeText={setMessage}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <View style={styles.messageFooter}>
                  <Text style={styles.characterCount}>
                    {message.length}/1000 characters
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={onSend}
            style={[
              styles.sendButton, 
              (sending || !name.trim() || !email.trim() || !subject.trim() || !message.trim()) && styles.sendButtonDisabled
            ]}
            disabled={sending || !name.trim() || !email.trim() || !subject.trim() || !message.trim()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={(sending || !name.trim() || !email.trim() || !subject.trim() || !message.trim()) 
                ? ['#9CA3AF', '#6B7280'] 
                : ['#667eea', '#764ba2']}
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
                  <Ionicons name="send" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.sendButtonText}>Send Mail</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  welcomeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  messageContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  messageInput: {
    fontSize: 16,
    color: '#1F2937',
    padding: 16,
    minHeight: 120,
    maxHeight: 200,
  },
  messageFooter: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  sendButton: {
    marginTop: 30,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sendButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
