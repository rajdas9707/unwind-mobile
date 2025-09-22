import React, { createContext, useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useNetworkStatus } from "../utils/networkUtils";
import { getProfile } from "../api/client";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // idToken state removed, now handled in client.js
  const [loading, setLoading] = useState(true);
  const isOnline = useNetworkStatus();

  const fetchUserDetailsFromBackend = async () => {
    getProfile({ uid: auth.currentUser.uid })
      .then((data) => {
        console.log("Fetched user details from backend:", data);
        setUser(data.user); // Assuming backend returns user details in data.user
      })
      .catch((error) => {
        console.log("Error fetching user details from backend:", error);
      });
  };
  useEffect(() => {
    if (isOnline && auth.currentUser) {
      fetchUserDetailsFromBackend();
    }
  }, [isOnline]);

  useEffect(() => {
    const fetchAndSetToken = async () => {
      try {
        let userInfo = await AsyncStorage.getItem("userInfo");
        setUser(userInfo);
        setLoading(false);
      } catch (error) {
        console.log("error from authprovider useeffect", error.message);
      }
    };
    fetchAndSetToken();
    // Optionally, listen for auth state changes and refresh token
    // return () => unsubscribe && unsubscribe();
  }, [isOnline]);

  // Optionally, expose a manual refreshToken function if needed

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
