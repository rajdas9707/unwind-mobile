import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  console.log("Checking onboarding status...");

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem("hasSeenOnboarding");
      console.log("Has seen onboarding:", hasSeenOnboarding);

      const userToken = await AsyncStorage.getItem("userToken");

      if (!hasSeenOnboarding) {
        router.replace("/onboarding");
      } else if (!userToken) {
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
