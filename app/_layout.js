import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Text } from "react-native";
import { initDb } from "../storage/db";

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function prepareDb() {
      try {
        console.log("Initializing database...");
        await initDb();
        setDbReady(true);
        console.log("Database ready");
      } catch (err) {
        console.error("DB initialization failed:", err);
        setError(err);
      }
    }

    prepareDb();
  }, []);

  // Show a loading screen until DB is ready
  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        {error ? (
          <Text style={{ color: "red" }}>DB Init Failed: {error.message}</Text>
        ) : (
          <>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 10 }}>Initializing database...</Text>
          </>
        )}
      </View>
    );
  }

  // Once DB is ready, render your stack
  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="meditation" options={{ title: "Meditation" }} />
        <Stack.Screen name="tasks/[category]" options={{ title: "Tasks" }} />
        <Stack.Screen
          name="tasks/[category]/carried-over"
          options={{ title: "Carried Over Tasks" }}
        />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
