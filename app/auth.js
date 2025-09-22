import { auth, db } from "../firebaseConfig"; // Adjust the import path as necessary
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
// import { doc, setDoc } from "firebase/firestore";
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
  Modal,
  ScrollView,
  Button
} from "react-native";
import CheckBox from "../components/auth/checkbox";
import { StatusBar } from "expo-status-bar";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { signup } from "../api/client";
import { TERMS_AND_CONDITIONS } from "../TermsAndConditions";


export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
    const [isChecked, setIsChecked] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
   const toggleModal = () => setModalVisible(!isModalVisible);


    const handleAccept = () => {
      console.log('clickefd')
    setIsChecked(true);
   setModalVisible(false);
  };

  const handleReject = () => {
    setIsChecked(false);
    setModalVisible(false);
  };


  const handleSubmit = async () => {

     if (!isChecked) {
     Alert.alert("You must accept Terms & Conditions to sign up.");
      return;
    }
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
      let userCredential;

      if (isLogin) {
        // Login user
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Check if email is verified
        if (!userCredential.user.emailVerified) {
          Alert.alert(
            "Verify Email",
            "Please verify your email before logging in."
          );
          setIsLoading(false);
          return;
        }

        await AsyncStorage.setItem(
          "userInfo",
          JSON.stringify({
            name: userCredential?.user.displayName || "User",
            email: userCredential?.user.email,
            joinDate: new Date(userCredential.user.metadata.creationTime)
              .toISOString()
              .split("T")[0],

            subscription: {
              isActive: false,
              plan: "trial",
            },
            trialStart: "25-05-2025",
            trialEnd: "01-06-2025",
          })
        );

        Alert.alert("Success", "Logged in successfully!");
      } else {
        // Register user
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        //update user in the backend with name,uid,email
        const response = await signup({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: name || "User",
          trialStart: new Date().toISOString().split("T")[0],
        });

        await updateProfile(userCredential.user, {
          displayName: name || "User",
          isAccessAllowed: true,
        });

        // 🔑 Reload the user to apply changes
        await userCredential.user.reload();

        // Send verification email
        await sendEmailVerification(userCredential.user);

        Alert.alert(
          "Verify Email",
          "Account created! Please check your email for a verification link before logging in."
        );
      }

      if (userCredential?.user?.emailVerified) router.replace("/(tabs)");
      else {
        setIsLogin(!isLogin);
        setIsLoading(false);
        return;
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email first");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Success", "Password reset email sent!");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
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

        {isLogin && (
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

     {!isLogin && <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <CheckBox
          value={isChecked}
          onValueChange={setIsChecked}
        />
        <Text style={{ color: "#FFFFFF", textAlign: "right", marginLeft: 10}}>I agree to the </Text>
        <TouchableOpacity onPress={toggleModal}>
          <Text style={{ color: 'blue', textDecorationLine: 'underline' }}>Terms & Conditions</Text>
        </TouchableOpacity>
      </View>}

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
          style={styles.switchButton}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.switchButtonText}>
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </Text>
        </TouchableOpacity>

            {/* Terms Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.termsText}>{TERMS_AND_CONDITIONS}</Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalButton, styles.rejectButton]} onPress={handleReject}>
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.acceptButton]} onPress={handleAccept}>
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1F2937" },
  header: { alignItems: "center", paddingTop: 80, paddingBottom: 40 },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "#9CA3AF" },
  form: { flex: 1, paddingHorizontal: 32 },
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
  forgotPassword: { color: "#3B82F6", textAlign: "right", marginBottom: 10 },
  submitButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  switchButton: { alignItems: "center" },
  switchButtonText: { color: "#9CA3AF", fontSize: 14 },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.5,
  },
  modalContent: {
    marginBottom: 18,
    maxHeight: 300,
  },
  termsText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'justify',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  acceptButton: {
    backgroundColor: '#22C55E',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  rejectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
