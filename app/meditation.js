import React, { useMemo } from "react";
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
    try {
      const calm = Asset.fromModule(
        require("../assets/meditation/calm.mp3")
      ).uri;
      const focused = Asset.fromModule(
        require("../assets/meditation/focused.mp3")
      ).uri;
      const relaxed = Asset.fromModule(
        require("../assets/meditation/relaxed.mp3")
      ).uri;
      const energetic = Asset.fromModule(
        require("../assets/meditation/energetic.mp3")
      ).uri;
      const qp = new URLSearchParams({
        w: String(width),
        h: String(height),
        dpr: String(scale),
      });
      if (calm) qp.set("calm", calm);
      if (focused) qp.set("focused", focused);
      if (relaxed) qp.set("relaxed", relaxed);
      if (energetic) qp.set("energetic", energetic);
      return `?${qp.toString()}`;
    } catch {
      const qp = new URLSearchParams({
        w: String(width),
        h: String(height),
        dpr: String(scale),
      });
      return `?${qp.toString()}`;
    }
  })();

  const source = localUri
    ? { uri: `${localUri}${audioParams}` }
    : {
        html: "<html><body><h2>Meditation</h2><p>Local asset missing.</p></body></html>",
      };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meditation</Text>
        <View style={styles.headerRight} />
      </View>

      <WebView
        source={source}
        scalesPageToFit={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Loading session...</Text>
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
          }catch(e){}
        })();`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { padding: 8, borderRadius: 8, backgroundColor: "#F3F4F6" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  headerRight: { width: 32 },
  webview: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 12, color: "#6B7280" },
});
