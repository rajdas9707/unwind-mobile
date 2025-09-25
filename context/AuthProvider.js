import React, { createContext, useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useNetworkStatus } from "../utils/networkUtils";
import { getProfile } from "../api/client";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const isOnline = useNetworkStatus();

  const fetchUserDetailsFromBackend = async () => {
    try {
      if (!auth.currentUser) return;
      const data = await getProfile({ uid: auth.currentUser.uid });
      if (data?.user) {
        setUser((prev) => ({ ...(prev || {}), ...data.user }));
      }
    } catch (error) {
      console.log("Error fetching user details from backend:", error);
    }
  };

  useEffect(() => {
    if (isOnline && auth.currentUser) {
      fetchUserDetailsFromBackend();
    }
  }, [isOnline]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const stored = await AsyncStorage.getItem("userInfo");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setUser(parsed);
          } catch {
            // if it was stored as a string previously
            setUser(stored);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.log("AuthProvider bootstrap error:", error?.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, [isOnline]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
  );
};
