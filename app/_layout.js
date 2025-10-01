import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import { AuthProvider } from "../context/AuthProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Configure how notifications should be handled when app is running
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
export default function RootLayout() {
  console.log("RootLayout rendered");

  useEffect(() => {
    // Request notification permissions on app start
    const requestPermissions = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.log("Notification permissions not granted");
        } else {
          console.log("Notification permissions granted");
        }
      } catch (error) {
        console.error("Error requesting notification permissions:", error);
      }
    };

    requestPermissions();
  }, []);

  return (
    <SafeAreaProvider>
      {/* <PaperProvider> */}
      {/* <DatabaseProvider> */}
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="meditation" options={{ title: "Meditation" }} />
          {/* <Stack.Screen name="idea" options={{ title: "Idea" }} /> */}
          {/* <Stack.Screen name="reminder" options={{ title: "Reminder" }} /> */}
          {/* <Stack.Screen name="document" options={{ title: "Document" }} /> */}

          <Stack.Screen name="tasks/[category]" options={{ title: "Tasks" }} />
          <Stack.Screen name="pomodoro" options={{ title: "Pomodoro Timer", headerShown: false }} />
          {/* carried-over route removed; unified under tasks/[category] with toggle */}
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
      {/* </DatabaseProvider> */}
      {/* </PaperProvider> */}
    </SafeAreaProvider>
  );
}
