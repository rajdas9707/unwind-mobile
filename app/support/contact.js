import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as MailComposer from "expo-mail-composer";

export default function ContactUsScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("userInfo");
        if (stored) {
          const parsed = JSON.parse(stored);
          setName(parsed?.name || "");
          setEmail(parsed?.email || "");
        }
      } catch {}
    })();
  }, []);

  const onSend = async () => {
    if (!message.trim()) {
      Alert.alert("Message required", "Please enter your message before sending.");
      return;
    }

    try {
      setSending(true);
      const available = await MailComposer.isAvailableAsync();
      const options = {
        recipients: ["support@myapp.com"],
        subject: `Support request from ${name || "User"}`,
        body: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      };
      if (available) {
        await MailComposer.composeAsync(options);
        Alert.alert("Mail opened", "Please send your email from the composer.");
      } else {
        // Fallback: use a mailto link
        const mailto = `mailto:support@myapp.com?subject=${encodeURIComponent(
          options.subject
        )}&body=${encodeURIComponent(options.body)}`;
        await Linking.openURL(mailto);
      }
    } catch (e) {
      Alert.alert("Failed", "Could not open mail composer.");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Name</Text>
        <View style={styles.readonlyBox}>
          <Text style={styles.readonlyText}>{name || "-"}</Text>
        </View>

        <Text style={styles.label}>Email</Text>
        <View style={styles.readonlyBox}>
          <Text style={styles.readonlyText}>{email || "-"}</Text>
        </View>

        <Text style={styles.label}>Message</Text>
        <TextInput
          style={styles.messageInput}
          placeholder="Tell us how we can help..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={6}
          value={message}
          onChangeText={setMessage}
          textAlignVertical="top"
        />

        <TouchableOpacity
          onPress={onSend}
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          disabled={sending}
        >
          {sending ? (
            <Text style={styles.sendBtnText}>Sending...</Text>
          ) : (
            <Text style={styles.sendBtnText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
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
