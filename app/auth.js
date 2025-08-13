import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      // Simulate authentication
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // For demo purposes, we'll just store a token
      await AsyncStorage.setItem("userToken", "demo-token");
      await AsyncStorage.setItem(
        "userInfo",
        JSON.stringify({
          name: name || "User",
          email: email,
          joinDate: new Date().toISOString().split("T")[0],
        })
      );

      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert("Error", "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    Alert.alert(
      "Google Sign In",
      "Google authentication will be implemented with Firebase"
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="heart" size={40} color="#3B82F6" />
        </View>
        <Text style={styles.title}>Mental Clarity</Text>
        <Text style={styles.subtitle}>
          {isLogin ? "Welcome back" : "Create your account"}
        </Text>
      </View>

      <View style={styles.form}>
        {!isLogin && (
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#6B7280" />
            <TextInput
              style={styles.textInput}
              placeholder="Full Name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.textInput}
            placeholder="Email"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
          <TextInput
            style={styles.textInput}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {!isLogin && (
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
            <TextInput
              style={styles.textInput}
              placeholder="Confirm Password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
          </View>
        )}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          <Text style={styles.submitButtonText}>
            {isLoading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleSignIn}
        >
          <Ionicons name="logo-google" size={20} color="#FFFFFF" />
          <Text style={styles.googleButtonText}>
            {isLogin ? "Sign in with Google" : "Sign up with Google"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchButton}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.switchButtonText}>
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1F2937",
  },
  header: {
    alignItems: "center",
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9CA3AF",
  },
  form: {
    flex: 1,
    paddingHorizontal: 32,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#374151",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 12,
    color: "#FFFFFF",
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
  },
  googleButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  switchButton: {
    alignItems: "center",
  },
  switchButtonText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
});
