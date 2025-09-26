import React, { useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { WebView } from "react-native-webview";
import { Asset } from "expo-asset";
import { useWindowDimensions } from "react-native";

export default function MeditationScreen() {
  const router = useRouter();
  const { width, height, scale } = useWindowDimensions();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const webViewRef = useRef(null);

  const localUri = useMemo(() => {
    try {
      const asset = Asset.fromModule(
        require("../assets/meditation/index.html")
      );
      return asset.uri;
    } catch {
      return null;
    }
  }, []);

  const audioParams = (() => {
    let focused, fallback;
    try {
      focused = Asset.fromModule(
        require("../assets/focus-sound.mp3")
      ).uri;
    } catch {}
    try {
      fallback = Asset.fromModule(
        require("../assets/relax-sound.mp3")
      ).uri;
    } catch {}
    const qp = new URLSearchParams({
      w: String(width),
      h: String(height),
      dpr: String(scale),
    });
    if (focused) {
      qp.set("focused", focused);
    } else if (fallback) {
      qp.set("focused", fallback);
    }
    return `?${qp.toString()}`;
  })();

  const source = localUri
    ? { uri: `${localUri}${audioParams}` }
    : {
        html: "<html><body><h2>Meditation</h2><p>Local asset missing.</p></body></html>",
      };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    // Send theme change to WebView
    const script = `
      (function() {
        try {
          var body = document.body;
          if (body) {
            // Remove any existing theme classes
            body.classList.remove('theme-light', 'theme-dark');
            
            if (${newTheme}) {
              body.classList.add('theme-dark');
            } else {
              body.classList.add('theme-light');
            }
          }
        } catch(e) {
          console.log('Theme sync error:', e);
        }
      })();
    `;
    
    // Execute the script in the WebView
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />

      <View style={[styles.header, isDarkMode && styles.headerDark]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backBtn, isDarkMode && styles.backBtnDark]}
        >
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color={isDarkMode ? "#E5E7EB" : "#111827"} 
          />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <View style={[styles.badge, isDarkMode && styles.badgeDark]}>
            <Ionicons 
              name="leaf" 
              size={16} 
              color={isDarkMode ? "#A7F3D0" : "#065F46"} 
            />
          </View>
          <Text style={[styles.headerTitle, isDarkMode && styles.headerTitleDark]}>
            Meditation
          </Text>
        </View>
        
        <TouchableOpacity 
          onPress={toggleTheme} 
          style={[styles.themeToggle, isDarkMode && styles.themeToggleDark]}
        >
          <View style={[styles.toggleTrack, isDarkMode && styles.toggleTrackActive]}>
            <View style={[styles.toggleThumb, isDarkMode && styles.toggleThumbActive]}>
              <Ionicons 
                name={isDarkMode ? "moon" : "sunny"} 
                size={16} 
                color={isDarkMode ? "#1F2937" : "#F59E0B"} 
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>

      <WebView
        ref={webViewRef}
        source={source}
        scalesPageToFit={false}
        startInLoadingState
        renderLoading={() => (
          <View style={[styles.loading, isDarkMode && styles.loadingDark]}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={[styles.loadingText, isDarkMode && styles.loadingTextDark]}>
              Loading session...
            </Text>
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        style={styles.webview}
        originWhitelist={["*"]}
        injectedJavaScript={`(function(){
          try{
            var meta=document.querySelector('meta[name=viewport]');
            if(meta){
              meta.setAttribute('content','width=' + window.innerWidth + ', initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
            }
            document.documentElement.style.setProperty('--screen-w', window.innerWidth + 'px');
            document.documentElement.style.setProperty('--screen-h', window.innerHeight + 'px');
            
            // Set initial theme based on React Native state
            var body = document.body;
            if (body) {
              // Remove any existing theme classes
              body.classList.remove('theme-light', 'theme-dark');
              
              ${isDarkMode ? `
                body.classList.add('theme-dark');
              ` : `
                body.classList.add('theme-light');
              `}
            }
          }catch(e){}
        })();`}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'themeChange') {
              setIsDarkMode(data.isDark);
            }
          } catch (e) {
            // Handle simple string messages
            if (event.nativeEvent.data === 'toggleTheme') {
              setIsDarkMode(!isDarkMode);
            }
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#FFFFFF" 
  },
  containerDark: {
    backgroundColor: "#0B1020"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerDark: {
    backgroundColor: "#0E1528",
    borderBottomColor: "#1A2440",
    shadowColor: "#000",
    shadowOpacity: 0.2,
  },
  backBtn: { 
    padding: 12, 
    borderRadius: 12, 
    backgroundColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backBtnDark: {
    backgroundColor: "#1F2937",
    shadowOpacity: 0.3,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(16,185,129,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(5,150,105,0.35)",
  },
  badgeDark: {
    backgroundColor: "rgba(16,185,129,0.16)",
    borderColor: "#115E59",
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#111827",
    letterSpacing: 0.5,
  },
  headerTitleDark: {
    color: "#E5E7EB",
  },
  themeToggle: {
    padding: 4,
  },
  themeToggleDark: {
    // Same styling for both themes
  },
  toggleTrack: {
    width: 56,
    height: 32,
    backgroundColor: "#E5E7EB",
    borderRadius: 16,
    padding: 2,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleTrackActive: {
    backgroundColor: "#10B981",
    shadowOpacity: 0.2,
  },
  toggleThumb: {
    width: 28,
    height: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleThumbActive: {
    transform: [{ translateX: 24 }],
  },
  webview: { flex: 1 },
  loading: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingDark: {
    backgroundColor: "#0B1020",
  },
  loadingText: { 
    marginTop: 12, 
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "500",
  },
  loadingTextDark: {
    color: "#9CA3AF",
  },
});
