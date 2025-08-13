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
        <Stack.Screen name="(tabs)" />
        {/* <Stack.Screen name="+not-found" /> */}
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
