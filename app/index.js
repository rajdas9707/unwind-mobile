import { useEffect, useState, useContext } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "../context/AuthProvider";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    checkOnboardingStatus();
  }, [user]);

  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");
      const userInfo = user || (await AsyncStorage.getItem("userInfo"));

      if (!hasSeenOnboarding) {
        router.replace("/onboarding");
      } else if (!userInfo) {
        router.replace("/auth");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      router.replace("/onboarding");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
});
