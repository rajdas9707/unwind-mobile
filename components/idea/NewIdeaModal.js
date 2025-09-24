import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Alert, FlatList } from "react-native";
import { saveFiles } from "../../storage/idea/storage";
import { insertIdea, updateIdea } from "../../storage/idea/db";
// import * as SpeechRecognizer from "expo-speech-recognition";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function NewIdeaModal({
  visible,
  onClose,
  onSave,
  ideaId,
  initialIdea,
}) {
  const [newIdea, setNewIdea] = useState(initialIdea?.idea || "");
  const [urls, setUrls] = useState(initialIdea?.urls || []);
  const [newUrl, setNewUrl] = useState("");
  const [selectedTag, setSelectedTag] = useState(
    initialIdea?.tag || "miscellaneous"
  );
  const [files, setFiles] = useState(
    initialIdea?.files?.map((uri) => ({ uri })) || []
  );
  // const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (visible) {
      setNewIdea(initialIdea?.idea || "");
      setUrls(initialIdea?.urls || []);
      setNewUrl("");
      setSelectedTag(initialIdea?.tag || "miscellaneous");
      setFiles(initialIdea?.files?.map((uri) => ({ uri })) || []);
    }
  }, [visible]);

  // const startListening = async () => {
  //   const available = await SpeechRecognizer.isAvailableAsync();
  //   if (!available) {
  //     alert(
  //       "Speech recognition not available on this device. please contact developer"
  //     );
  //     return;
  //   }

  //   setIsListening(true);
  //   await SpeechRecognizer.startAsync({
  //     onResult: (event) => {
  //       setNewIdea(event.transcription.text);
  //     },
  //     onDone: () => {
  //       setIsListening(false);
  //     },
  //   });
  // };

  // const stopListening = async () => {
  //   await SpeechRecognizer.stopAsync();
  //   setIsListening(false);
  // };

  const tags = ["miscellaneous", "Work", "Personal", "Startup"];

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validFiles = result.assets.filter((file) => {
          if (file.size && file.size > MAX_FILE_SIZE) {
            Alert.alert(
              "File Too Large",
              `${file.name || "A file"} exceeds 10 MB and was skipped.`
            );
            return false;
          }
          return true;
        });

        if (validFiles.length > 0) {
          setFiles((prev) => [...prev, ...validFiles]);
          console.log("Files picked:", validFiles);
        }
      }
    } catch (error) {
      console.log("Error picking files/newideaMODAL:", error);
    }
  };

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const takePhoto = async () => {
    try {
      const { status: cameraStatus } =
        await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== "granted") {
        Alert.alert("Permission required", "Camera permission is required.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validPhotos = result.assets.filter((photo) => {
          if (photo.size && photo.size > MAX_FILE_SIZE) {
            Alert.alert(
              "Photo Too Large",
              `A photo exceeds 10 MB and was skipped.`
            );
            return false;
          }
          return true;
        });

        if (validPhotos.length > 0) {
          setFiles((prev) => [...prev, ...validPhotos]);
          console.log("Photos taken:", validPhotos);
        }
      }
    } catch (error) {
      console.log("Error taking photos in IdeaModal:", error);
    }
  };

  const addUrl = () => {
    if (!newUrl.trim()) return;
    setUrls((prev) => [...prev, newUrl.trim()]);
    setNewUrl("");
  };

  const removeUrl = (index) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!newIdea.trim()) {
      Alert.alert("Error", "Idea cannot be empty");
      return;
    }

    try {
      // Ensure we have an id
      let id = ideaId;
      if (!id) {
        id = await insertIdea({
          idea: newIdea.trim(),
          urls,
          files: [],
          tag: selectedTag,
        });
      }

      // Save files with unique names bound to idea id
      const savedUris = await saveFiles({
        files,
        fileLabel: "idea",
        ideaId: id,
      });

      // Merge existing files if editing
      const existingUris = (initialIdea?.files || []).filter(Boolean);
      const finalFiles = ideaId ? [...existingUris, ...savedUris] : savedUris;

      await updateIdea({
        id,
        idea: newIdea.trim(),
        urls,
        files: finalFiles,
        tag: selectedTag,
      });

      onSave &&
        onSave({
          id,
          idea: newIdea.trim(),
          urls,
          files: finalFiles,
          tag: selectedTag,
        });

      // Reset state
      setNewIdea("");
      setNewUrl("");
      setUrls([]);
      setSelectedTag("miscellaneous");
      setFiles([]);
      onClose && onClose();
    } catch (error) {
      console.log("Error saving idea in IdeaModal:", error);
      Alert.alert("Error", "Failed to save idea");
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>New Idea </Text>

          {/* Idea input with mic button */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Write or speak your idea..."
              value={newIdea}
              onChangeText={setNewIdea}
              multiline
            />
            {/* <TouchableOpacity
              onPress={isListening ? stopListening : startListening}
            >
              <Ionicons
                name={isListening ? "mic" : "mic-outline"}
                size={26}
                color={isListening ? "red" : "gray"}
              />
            </TouchableOpacity> */}
          </View>

          {/* URL input and list */}
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TextInput
              style={[styles.urlInput, { flex: 1 }]}
              placeholder="Paste URL here... (optional)"
              value={newUrl}
              onChangeText={setNewUrl}
            />
            <TouchableOpacity onPress={addUrl} style={{ marginLeft: 8 }}>
              <Ionicons name="add-circle" size={28} color="#2563EB" />
            </TouchableOpacity>
          </View>
          {urls.length > 0 && (
            <FlatList
              data={urls}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={({ item, index }) => (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                    justifyContent: "space-between",
                  }}
                >
                  <Text numberOfLines={1} style={{ flex: 1, color: "#374151" }}>
                    {item}
                  </Text>
                  <TouchableOpacity onPress={() => removeUrl(index)}>
                    <Text style={{ color: "red" }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {/* Photo Upload Options */}
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={pickFiles}>
              <Ionicons name="images-outline" size={22} color="#2563EB" />
              <Text style={styles.photoText}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={22} color="#2563EB" />
              <Text style={styles.photoText}>Camera</Text>
            </TouchableOpacity>
          </View>

          {/* Files list with remove and edit */}
          {files.length > 0 && (
            <FlatList
              data={files}
              keyExtractor={(_, index) => `file-${index}`}
              renderItem={({ item, index }) => {
                const uri = item.uri || item.fileCopyUri || item.localUri;
                const isPdf =
                  typeof uri === "string" && uri.toLowerCase().endsWith(".pdf");
                const isImage =
                  !isPdf &&
                  (uri.includes("image") ||
                    uri.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i));
                return (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    {isPdf ? (
                      <Ionicons
                        name="document-text-outline"
                        size={28}
                        color="#6B7280"
                      />
                    ) : (
                      <Image
                        source={{ uri }}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 8,
                          backgroundColor: "#eee",
                        }}
                      />
                    )}
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, marginLeft: 10, color: "#374151" }}
                    >
                      {uri}
                    </Text>
                    <TouchableOpacity onPress={() => removeFile(index)}>
                      <Text style={{ color: "red" }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}

          {/* Tags */}
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[styles.tag, selectedTag === tag && styles.activeTag]}
                onPress={() => setSelectedTag(tag)}
              >
                <Text
                  style={[
                    styles.tagText,
                    selectedTag === tag && { color: "#fff" },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save button */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
              Save Idea
            </Text>
          </TouchableOpacity>

          {/* Cancel button */}
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: "red", marginTop: 12, textAlign: "center" }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 10,
  },
  urlInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  photoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  photoButton: {
    alignItems: "center",
  },
  photoText: {
    fontSize: 12,
    color: "#2563EB",
    marginTop: 4,
  },
  previewImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    marginBottom: 16,
  },
  tagsRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  tag: {
    borderWidth: 1,
    borderColor: "#2563EB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
  activeTag: {
    backgroundColor: "#2563EB",
  },
  tagText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
});
