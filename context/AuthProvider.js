import React, { createContext, useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useNetworkStatus } from "../utils/networkUtils";

export const AuthContext = createContext();


export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // idToken state removed, now handled in client.js
  const [loading, setLoading] = useState(true);
  const isOnline = useNetworkStatus();


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
  <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
};
