import React, { useState, useRef, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  Animated,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as MediaLibrary from "expo-media-library";
import { Platform } from "react-native";

const { width, height } = Dimensions.get("window");

const FileViewer = ({ visible, onClose, files, currentIndex = 0 }) => {
  const [activeIndex, setActiveIndex] = useState(currentIndex);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      setActiveIndex(currentIndex);
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible, currentIndex]);

  const currentFile = files[activeIndex];
  const isPdf = currentFile?.uri?.toLowerCase().endsWith(".pdf");
  const isImage = currentFile?.uri && !isPdf;

  const handlePrevious = () => {
    if (activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < files.length - 1) {
      setActiveIndex(activeIndex + 1);
    }
  };

  const handleShare = async () => {
    try {
      setIsLoading(true);
      console.log("Sharing file:", currentFile.uri);

      if (await Sharing.isAvailableAsync()) {
        try {
          await Sharing.shareAsync(currentFile.uri, {
            mimeType: getMimeType(),
            dialogTitle: "Share file",
            UTI: getUTI(),
          });
          console.log("Share completed successfully");
        } catch (shareError) {
          console.log(
            "Sharing with MIME type failed, trying without:",
            shareError
          );

          // Fallback: try sharing without MIME type but with UTI
          try {
            await Sharing.shareAsync(currentFile.uri, {
              UTI: getUTI(),
              dialogTitle: "Share file",
            });
            console.log("Share without MIME type completed successfully");
          } catch (fallbackError) {
            console.log("Fallback sharing failed:", fallbackError);

            // Final fallback: copy to temp location and share
            if (Platform.OS === "android") {
              const fileName =
                currentFile.uri.split("/").pop() ||
                (isPdf ? "document.pdf" : "image.jpg");
              const tempUri = `${FileSystem.cacheDirectory}temp_${fileName}`;

              console.log(
                "Trying to copy file to temp location for sharing:",
                tempUri
              );
              await FileSystem.copyAsync({
                from: currentFile.uri,
                to: tempUri,
              });

              console.log("File copied, attempting to share temp file");
              await Sharing.shareAsync(tempUri, {
                mimeType: getMimeType(),
                dialogTitle: "Share file",
                UTI: getUTI(),
              });
              console.log("Share with temp file completed successfully");
            } else {
              throw fallbackError;
            }
          }
        }
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.log("Error sharing file:", error);
      Alert.alert("Error", `Failed to share file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenExternal = async () => {
    try {
      setIsLoading(true);
      console.log("Opening file:", currentFile.uri);
      console.log("Platform:", Platform.OS);
      console.log("Is PDF:", isPdf);

      if (Platform.OS === "android") {
        // For Android, we need to handle file URIs specially
        console.log("Using sharing for Android");

        try {
          // First, try to get file info to ensure it exists
          const fileInfo = await FileSystem.getInfoAsync(currentFile.uri);
          console.log("File info:", fileInfo);

          if (!fileInfo.exists) {
            throw new Error("File does not exist");
          }

          if (await Sharing.isAvailableAsync()) {
            console.log("Sharing is available, attempting to share");

            // Try sharing with proper MIME type for PDFs
            await Sharing.shareAsync(currentFile.uri, {
              mimeType: getMimeType(),
              dialogTitle: "Open with...",
              UTI: getUTI(),
            });
            console.log("Share completed successfully");
          } else {
            console.log("Sharing is not available");
            Alert.alert("Error", "Sharing is not available on this device");
          }
        } catch (shareError) {
          console.log("Sharing failed:", shareError);

          // Fallback: try to copy to a different location and share
          try {
            const fileName =
              currentFile.uri.split("/").pop() ||
              (isPdf ? "document.pdf" : "image.jpg");
            const tempUri = `${FileSystem.cacheDirectory}temp_${fileName}`;

            console.log("Trying to copy file to temp location:", tempUri);
            await FileSystem.copyAsync({
              from: currentFile.uri,
              to: tempUri,
            });

            console.log("File copied, attempting to share temp file");
            await Sharing.shareAsync(tempUri, {
              mimeType: getMimeType(),
              dialogTitle: "Open with...",
              UTI: getUTI(),
            });
            console.log("Share with temp file completed successfully");
          } catch (copyError) {
            console.log("Copy and share failed:", copyError);
            throw new Error("Unable to open file. Please try sharing instead.");
          }
        }
      } else {
        // For iOS, try WebBrowser first, fallback to sharing
        console.log("Using WebBrowser for iOS");
        try {
          await WebBrowser.openBrowserAsync(currentFile.uri);
          console.log("WebBrowser opened successfully");
        } catch (webError) {
          console.log("WebBrowser failed, trying sharing:", webError);
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(currentFile.uri, {
              mimeType: isPdf ? "application/pdf" : "image/*",
              dialogTitle: "Open with...",
            });
          } else {
            throw new Error("Neither WebBrowser nor Sharing is available");
          }
        }
      }
    } catch (error) {
      console.log("Error opening file:", error);
      console.log("Error details:", error.message);
      Alert.alert("Error", `Failed to open file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = () => {
    if (isPdf) return "document-text";
    if (isImage) return "image";
    return "document";
  };

  const getFileType = () => {
    if (isPdf) return "PDF Document";
    if (isImage) return "Image";
    return "Document";
  };

  const getMimeType = () => {
    if (isPdf) return "application/pdf";
    if (isImage) return "image/*";
    return "application/octet-stream";
  };

  const getUTI = () => {
    if (isPdf) return "com.adobe.pdf";
    if (isImage) return "public.image";
    return "public.data";
  };

  if (!visible || !files || files.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <LinearGradient
            colors={["rgba(0,0,0,0.8)", "transparent"]}
            style={styles.header}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>

              <View style={styles.headerInfo}>
                <Text style={styles.fileType}>{getFileType()}</Text>
                <Text style={styles.fileCounter}>
                  {activeIndex + 1} of {files.length}
                </Text>
              </View>

              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleShare}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="share-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleOpenExternal}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Ionicons name="open-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Content Area */}
          <Animated.View
            style={[
              styles.content,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {isImage ? (
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.imageContainer}
              >
                <Image
                  source={{ uri: currentFile.uri }}
                  style={styles.image}
                  resizeMode="contain"
                  onLoadStart={() => setIsLoading(true)}
                  onLoadEnd={() => setIsLoading(false)}
                />
              </ScrollView>
            ) : (
              <View style={styles.documentContainer}>
                <View style={styles.documentIcon}>
                  <Ionicons name={getFileIcon()} size={80} color="#667eea" />
                </View>
                <Text style={styles.documentTitle}>
                  {currentFile.name || "Document"}
                </Text>
                <Text style={styles.documentSubtitle}>
                  Tap "Open" to view this {isPdf ? "PDF" : "document"}
                </Text>
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={handleOpenExternal}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={["#667eea", "#764ba2"]}
                    style={styles.openButtonGradient}
                  >
                    <Ionicons name="open-outline" size={20} color="#fff" />
                    <Text style={styles.openButtonText}>Open Document</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Navigation */}
          {files.length > 1 && (
            <View style={styles.navigation}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  activeIndex === 0 && styles.navButtonDisabled,
                ]}
                onPress={handlePrevious}
                disabled={activeIndex === 0}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={activeIndex === 0 ? "#666" : "#fff"}
                />
              </TouchableOpacity>

              <View style={styles.navDots}>
                {files.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.navDot,
                      index === activeIndex && styles.navDotActive,
                    ]}
                    onPress={() => setActiveIndex(index)}
                    activeOpacity={0.7}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  activeIndex === files.length - 1 && styles.navButtonDisabled,
                ]}
                onPress={handleNext}
                disabled={activeIndex === files.length - 1}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={activeIndex === files.length - 1 ? "#666" : "#fff"}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingContainer}>
                <Ionicons name="hourglass-outline" size={32} color="#fff" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  fileType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  fileCounter: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width,
    height: height * 0.7,
  },
  documentContainer: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  documentIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  documentSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 32,
  },
  openButton: {
    borderRadius: 25,
    overflow: "hidden",
  },
  openButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 8,
  },
  openButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  navDots: {
    flexDirection: "row",
    gap: 8,
  },
  navDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  navDotActive: {
    backgroundColor: "#667eea",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
});

export default FileViewer;
