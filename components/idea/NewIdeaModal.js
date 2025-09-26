import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  ScrollView,
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
  const [ideaName, setIdeaName] = useState(initialIdea?.name || "");
  const [newIdea, setNewIdea] = useState(initialIdea?.idea || "");
  const [urls, setUrls] = useState(initialIdea?.urls || []);
  const [newUrl, setNewUrl] = useState("");
  const [selectedTag, setSelectedTag] = useState(
    initialIdea?.tag || "miscellaneous"
  );
  const [files, setFiles] = useState(
    initialIdea?.files?.map((uri) => ({ uri })) || []
  );
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if (visible) {
      setIdeaName(initialIdea?.name || "");
      setNewIdea(initialIdea?.idea || "");
      setUrls(initialIdea?.urls || []);
      setNewUrl("");
      setSelectedTag(initialIdea?.tag || "miscellaneous");
      setFiles(initialIdea?.files?.map((uri) => ({ uri })) || []);
    }
  }, [visible]);

  const startListening = async () => {
    // TODO: Implement speech recognition
    // const available = await SpeechRecognizer.isAvailableAsync();
    // if (!available) {
    //   alert(
    //     "Speech recognition not available on this device. please contact developer"
    //   );
    //   return;
    // }

    setIsListening(true);
    // await SpeechRecognizer.startAsync({
    //   onResult: (event) => {
    //     setNewIdea(event.transcription.text);
    //   },
    //   onDone: () => {
    //     setIsListening(false);
    //   },
    // });
  };

  const stopListening = async () => {
    // TODO: Implement speech recognition
    // await SpeechRecognizer.stopAsync();
    setIsListening(false);
  };

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
    if (!ideaName.trim()) {
      Alert.alert("Error", "Idea name is required");
      return;
    }
    if (!newIdea.trim()) {
      Alert.alert("Error", "Idea description cannot be empty");
      return;
    }

    try {
      // Ensure we have an id
      let id = ideaId;
      if (!id) {
        id = await insertIdea({
          name: ideaName.trim(),
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
        name: ideaName.trim(),
        idea: newIdea.trim(),
        urls,
        files: finalFiles,
        tag: selectedTag,
      });

      onSave &&
        onSave({
          id,
          name: ideaName.trim(),
          idea: newIdea.trim(),
          urls,
          files: finalFiles,
          tag: selectedTag,
        });

      // Reset state
      setIdeaName("");
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
          <Text style={styles.modalHeader}>New Idea</Text>
          
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >

          {/* Idea Name Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Idea Name *</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="Give your idea a name..."
              value={ideaName}
              onChangeText={setIdeaName}
              maxLength={100}
            />
          </View>

          {/* Idea Description with Mic */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Idea Description</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                placeholder="Describe your idea in detail..."
                value={newIdea}
                onChangeText={setNewIdea}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={styles.micButton}
                onPress={isListening ? stopListening : startListening}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isListening ? "mic" : "mic-outline"}
                  size={24}
                  color={isListening ? "#EF4444" : "#6366F1"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* URL Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Links (Optional)</Text>
            <View style={styles.urlContainer}>
              <TextInput
                style={styles.urlInput}
                placeholder="Paste URL here..."
                value={newUrl}
                onChangeText={setNewUrl}
              />
              <TouchableOpacity 
                style={styles.addButton}
                onPress={addUrl}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#6366F1" />
              </TouchableOpacity>
            </View>
            
            {urls.length > 0 && (
              <View style={styles.urlList}>
                {urls.map((url, index) => (
                  <View key={`${url}-${index}`} style={styles.urlItem}>
                    <Ionicons name="link" size={16} color="#6366F1" style={styles.urlIcon} />
                    <Text numberOfLines={1} style={styles.urlText}>
                      {url}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => removeUrl(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Files Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Files & Photos (Optional)</Text>
            <View style={styles.photoRow}>
              <TouchableOpacity style={styles.photoButton} onPress={pickFiles}>
                <Ionicons name="images-outline" size={24} color="#6366F1" />
                <Text style={styles.photoText}>Upload Files</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={24} color="#6366F1" />
                <Text style={styles.photoText}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            {files.length > 0 && (
              <View style={styles.filesList}>
                {files.map((file, index) => {
                  const uri = file.uri || file.fileCopyUri || file.localUri;
                  const fileName = file.name || uri.split('/').pop() || `File ${index + 1}`;
                  const isPdf = typeof uri === "string" && uri.toLowerCase().endsWith(".pdf");
                  const isImage = !isPdf && (uri.includes("image") || uri.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i));
                  
                  return (
                    <View key={`file-${index}`} style={styles.fileItem}>
                      <View style={styles.fileIconContainer}>
                        {isPdf ? (
                          <Ionicons name="document-text-outline" size={24} color="#6366F1" />
                        ) : isImage ? (
                          <Image source={{ uri }} style={styles.fileThumbnail} />
                        ) : (
                          <Ionicons name="document-outline" size={24} color="#6366F1" />
                        )}
                      </View>
                      <View style={styles.fileInfo}>
                        <Text numberOfLines={1} style={styles.fileName}>
                          {fileName}
                        </Text>
                        <Text style={styles.fileType}>
                          {isPdf ? 'PDF' : isImage ? 'Image' : 'File'}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => removeFile(index)}
                        style={styles.removeButton}
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Tags */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Category</Text>
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
          </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Idea</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    flex: 1,
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
  },
  textAreaContainer: {
    position: "relative",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 50,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    minHeight: 100,
  },
  micButton: {
    position: "absolute",
    right: 12,
    top: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  urlContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    marginRight: 8,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  urlList: {
    marginTop: 8,
  },
  urlItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  urlIcon: {
    marginRight: 8,
  },
  urlText: {
    flex: 1,
    color: "#374151",
    fontSize: 14,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  photoRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  photoButton: {
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 100,
  },
  photoText: {
    fontSize: 12,
    color: "#6366F1",
    marginTop: 4,
    fontWeight: "600",
  },
  filesList: {
    marginTop: 12,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  fileThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
    color: "#6B7280",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderWidth: 1,
    borderColor: "#6366F1",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },
  activeTag: {
    backgroundColor: "#6366F1",
  },
  tagText: {
    color: "#6366F1",
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtons: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#F8FAFC",
  },
  saveButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "500",
  },
});
