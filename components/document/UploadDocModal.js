import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Image,
  Animated,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { saveFiles } from "../../storage/document/storage";
import { insertDocument, updateDocument } from "../../storage/document/db";
import { getFormCategories, DEFAULT_CATEGORY } from "../../utils/categories";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const UploadDocModal = ({ visible, onClose, onSave, docId, initialDoc }) => {
  const [docName, setDocName] = useState(initialDoc?.docName || "");
  const [selectedTag, setSelectedTag] = useState(
    initialDoc?.tag || DEFAULT_CATEGORY
  );
  const [files, setFiles] = useState(
    initialDoc?.files?.map((uri) => ({ uri })) || []
  );

  useEffect(() => {
    if (visible) {
      setDocName(initialDoc?.docName || "");
      setSelectedTag(initialDoc?.tag || DEFAULT_CATEGORY);
      setFiles(initialDoc?.files?.map((uri) => ({ uri })) || []);
    }
  }, [visible]);

  const tags = getFormCategories();

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
      console.log("Error picking files:", error);
    }
  };

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
        allowsEditing: true, // Always allow editing/cropping
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];

        if (photo.size && photo.size > MAX_FILE_SIZE) {
          Alert.alert(
            "Photo Too Large",
            "Photo exceeds 10 MB and was skipped."
          );
          return;
        }

        setFiles((prev) => [...prev, photo]);
        console.log("Photo taken and cropped:", photo);
      }
    } catch (error) {
      console.log("Error taking photos:", error);
    }
  };

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!docName.trim()) {
      Alert.alert("Error", "Document name cannot be empty");
      return;
    }

    if (!files || files.length === 0) {
      Alert.alert("Error", "Please select at least one file or image");
      return;
    }

    try {
      // Ensure we have an id
      let id = docId;
      if (!id) {
        try {
          id = await insertDocument({
            docName: docName.trim(),
            files: [],
            tag: selectedTag,
          });
        } catch (error) {
          if (
            error.message &&
            error.message.includes("UNIQUE constraint failed")
          ) {
            Alert.alert(
              "Error",
              "A document with this name already exists. Please choose a different name."
            );
            return;
          }
          throw error;
        }
      }

      // Separate new files from existing files
      const newFiles = files.filter(
        (file) => !file.uri || !file.uri.includes("docs/")
      );
      const existingFiles = files.filter(
        (file) => file.uri && file.uri.includes("docs/")
      );

      // Save only new files to filesystem
      let savedUris = [];
      if (newFiles.length > 0) {
        savedUris = await saveFiles({
          files: newFiles,
          fileLabel: "doc",
          docId: id,
        });
      }

      // Combine existing files (already saved) with newly saved files
      const existingUris = existingFiles.map((file) => file.uri);
      const finalFiles = [...existingUris, ...savedUris];

      await updateDocument({
        id,
        docName: docName.trim(),
        files: finalFiles,
        tag: selectedTag,
      });

      onSave &&
        onSave({
          id,
          docName: docName.trim(),
          files: finalFiles,
          tag: selectedTag,
        });

      // Reset state
      setDocName("");
      setSelectedTag(DEFAULT_CATEGORY);
      setFiles([]);
      onClose && onClose();
    } catch (error) {
      console.log("Error saving document:", error);
      Alert.alert("Error", "Failed to save document");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerIcon}>
              <Ionicons 
                name={docId ? "create-outline" : "cloud-upload-outline"} 
                size={24} 
                color="#6366F1" 
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.modalTitle}>
                {docId ? "Edit Document" : "Upload Document"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {docId ? "Update your document details" : "Add files and organize your documents"}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Document name input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Document Name</Text>
            <TextInput
              style={styles.textInput}
              value={docName}
              onChangeText={setDocName}
              placeholder="Enter document name"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Tags */}
          <View style={styles.tagSection}>
            <Text style={styles.tagLabel}>Category</Text>
            <View style={styles.tagContainer}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagButton,
                    selectedTag === tag && styles.tagButtonActive
                  ]}
                  onPress={() => setSelectedTag(tag)}
                >
                  <Text
                    style={[
                      styles.tagText,
                      selectedTag === tag && styles.tagTextActive
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Upload and Camera Options */}
          <View style={styles.uploadSection}>
            <Text style={styles.uploadLabel}>Add Files</Text>
            <View style={styles.uploadButtons}>
              <TouchableOpacity
                onPress={pickFiles}
                style={[styles.uploadButton, styles.uploadButtonPrimary]}
                activeOpacity={0.7}
                accessibilityLabel="Upload File"
              >
                <Ionicons name="cloud-upload-outline" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={takePhoto}
                style={[styles.uploadButton, styles.uploadButtonSecondary]}
                activeOpacity={0.7}
                accessibilityLabel="Take Photo"
              >
                <Ionicons name="camera-outline" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Files list */}
          {files.length > 0 && (
            <View style={styles.filesSection}>
              <Text style={styles.filesLabel}>
                Selected Files ({files.length})
              </Text>
              <FlatList
                data={files}
                keyExtractor={(_, index) => `file-${index}`}
                renderItem={({ item, index }) => {
                  const uri = item.uri || item.fileCopyUri || item.localUri;
                  const isPdf =
                    typeof uri === "string" && uri.toLowerCase().endsWith(".pdf");
                  return (
                    <View style={styles.fileItem}>
                      <View style={styles.fileIcon}>
                        {isPdf ? (
                          <Ionicons
                            name="document-text-outline"
                            size={20}
                            color="#6366F1"
                          />
                        ) : (
                          <Image
                            source={{ uri }}
                            style={styles.fileThumbnail}
                          />
                        )}
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>
                          {item.name || uri}
                        </Text>
                        <Text style={styles.fileType}>
                          {isPdf ? 'PDF Document' : 'Image'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeFile(index)}
                        style={styles.removeButton}
                        accessibilityLabel="Remove File"
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#DC2626"
                        />
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <Ionicons
                name="save-outline"
                size={18}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.saveButtonText}>
                {docId ? "Update" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 0,
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FAFBFC",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerIcon: {
    width: 52,
    height: 52,
    backgroundColor: "#EEF2FF",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  headerText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F1724",
    marginBottom: 6,
    letterSpacing: -0.8,
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#64748B",
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputSection: {
    paddingHorizontal: 28,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 16,
    padding: 18,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
    fontWeight: "500",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tagSection: {
    paddingHorizontal: 28,
    marginBottom: 28,
  },
  tagLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tagButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tagButtonActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
    shadowColor: "#6366F1",
    shadowOpacity: 0.2,
  },
  tagText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  tagTextActive: {
    color: "#6366F1",
    fontWeight: "700",
  },
  uploadSection: {
    paddingHorizontal: 28,
    marginBottom: 28,
  },
  uploadLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  uploadButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  uploadButton: {
    width: 120,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  uploadButtonPrimary: {
    backgroundColor: "#6366F1",
    shadowColor: "#6366F1",
    shadowOpacity: 0.3,
  },
  uploadButtonSecondary: {
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
    shadowOpacity: 0.3,
  },
  filesSection: {
    paddingHorizontal: 28,
    marginBottom: 28,
  },
  filesLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 14,
    letterSpacing: 0.3,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  fileIcon: {
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
    backgroundColor: "#F3F4F6",
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
    fontWeight: "500",
    color: "#64748B",
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  actionButtons: {
    flexDirection: "row",
    padding: 28,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    backgroundColor: "#FAFBFC",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
    letterSpacing: 0.3,
  },
  saveButton: {
    flex: 1,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    borderRadius: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
});

export default UploadDocModal;
