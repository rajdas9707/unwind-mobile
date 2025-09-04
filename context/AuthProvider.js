import React, { createContext, useEffect, useState } from "react";
import { auth } from "../firebaseConfig";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        console.log("token from authprovider", typeof token);
        setIdToken(token);
        const currentUser = await AsyncStorage.getItem("userInfo");

        setUser(currentUser);
        setLoading(false);
      } catch (error) {
        console.log("error from authprovider useeffect", error.message);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ user, idToken }}>
      {children}
    </AuthContext.Provider>
  );
};
