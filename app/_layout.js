import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { DatabaseProvider } from "../context/DatabaseProvider";
import { AuthProvider } from "../context/AuthProvider";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  console.log("RootLayout rendered");

  return (
    <SafeAreaProvider>
      <DatabaseProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="meditation" options={{ title: "Meditation" }} />
            <Stack.Screen
              name="tasks/[category]"
              options={{ title: "Tasks" }}
            />
            <Stack.Screen
              name="tasks/[category]/carried-over"
              options={{ title: "Carried Over Tasks" }}
            />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="auto" />
        </AuthProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}
