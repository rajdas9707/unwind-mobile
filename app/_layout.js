import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

// import { useFrameworkReady } from "@/hooks/useFrameworkReady";

export default function RootLayout() {
  // useFrameworkReady();
  console.log("RootLayout rendered");

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="auth" />

        <Stack.Screen name="todo" />

        <Stack.Screen name="meditation" options={{ title: "Meditation" }} />
        <Stack.Screen name="reflection" options={{ title: "Reflection" }} />
        <Stack.Screen name="gratitude" options={{ title: "Gratitude" }} />
        <Stack.Screen name="tasks/[category]" options={{ title: "Tasks" }} />
        <Stack.Screen
          name="tasks/[category]/carried-over"
          options={{ title: "Carried Over Tasks" }}
        />
        <Stack.Screen name="(tabs)" />

        {/* <Stack.Screen name="+not-found" /> */}
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
