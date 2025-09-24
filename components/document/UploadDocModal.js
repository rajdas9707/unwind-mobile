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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
// import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { saveFiles } from "../../storage/document/storage";
import { insertDocument, updateDocument } from "../../storage/document/db";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const UploadDocModal = ({ visible, onClose, onSave, docId, initialDoc }) => {
  const [docName, setDocName] = useState(initialDoc?.docName || "");
  const [selectedTag, setSelectedTag] = useState(
    initialDoc?.tag || "miscellaneous"
  );
  const [files, setFiles] = useState(
    initialDoc?.files?.map((uri) => ({ uri })) || []
  );

  useEffect(() => {
    if (visible) {
      setDocName(initialDoc?.docName || "");
      setSelectedTag(initialDoc?.tag || "miscellaneous");
      setFiles(initialDoc?.files?.map((uri) => ({ uri })) || []);
    }
  }, [visible]);

  const tags = ["miscellaneous", "Bank", "Work", "Personal", "ID"];

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
      setSelectedTag("miscellaneous");
      setFiles([]);
      onClose && onClose();
    } catch (error) {
      console.log("Error saving document:", error);
      Alert.alert("Error", "Failed to save document");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "90%",
            backgroundColor: "#fff",
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: "#E5E7EB",
            // No box shadow for a clean, modern look
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {docId ? "Edit Document" : "Upload Document"}
          </Text>

          {/* Document name input */}
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              fontSize: 16,
            }}
            value={docName}
            onChangeText={setDocName}
            placeholder="Enter document name"
          />

          {/* Tags */}
          <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
            Select Tag
          </Text>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}
          >
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  backgroundColor:
                    selectedTag === tag ? "#0B5FFF20" : "#f0f0f0",
                  borderWidth: selectedTag === tag ? 1 : 0,
                  borderColor: selectedTag === tag ? "#0B5FFF" : "transparent",
                  marginRight: 8,
                  marginBottom: 8,
                }}
                onPress={() => setSelectedTag(tag)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: selectedTag === tag ? "#0B5FFF" : "#444",
                    fontWeight: selectedTag === tag ? "600" : "400",
                  }}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upload and Camera Options */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 18,
              gap: 12,
            }}
          >
            <TouchableOpacity
              onPress={pickFiles}
              style={{
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 18,
                height: 54,
                width: 54,
                marginRight: 6,
                backgroundColor: "#6366F1",
                shadowColor: "#6366F1",
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 1,
              }}
              activeOpacity={0.85}
              accessibilityLabel="Upload File"
            >
              <Ionicons name="cloud-upload-outline" size={30} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={takePhoto}
              style={{
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 18,
                height: 54,
                width: 54,
                marginLeft: 6,
                backgroundColor: "#22C55E",
                shadowColor: "#22C55E",
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 1,
              }}
              activeOpacity={0.85}
              accessibilityLabel="Take Photo"
            >
              <Ionicons name="camera-outline" size={30} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Files list */}
          {files.length > 0 && (
            <FlatList
              data={files}
              keyExtractor={(_, index) => `file-${index}`}
              renderItem={({ item, index }) => {
                const uri = item.uri || item.fileCopyUri || item.localUri;
                const isPdf =
                  typeof uri === "string" && uri.toLowerCase().endsWith(".pdf");
                return (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                      backgroundColor: "#F3F4F6",
                      borderRadius: 10,
                      padding: 8,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                    }}
                  >
                    {isPdf ? (
                      <Ionicons
                        name="document-text-outline"
                        size={26}
                        color="#6366F1"
                        style={{ marginRight: 6 }}
                      />
                    ) : (
                      <Image
                        source={{ uri }}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: "#eee",
                          marginRight: 6,
                        }}
                      />
                    )}
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        marginLeft: 2,
                        color: "#374151",
                        fontSize: 14,
                      }}
                    >
                      {item.name || uri}
                    </Text>
                    <TouchableOpacity
                      onPress={() => removeFile(index)}
                      style={{
                        marginLeft: 8,
                        padding: 6,
                        borderRadius: 8,
                        backgroundColor: "#fff",
                        borderWidth: 1,
                        borderColor: "#FCA5A5",
                      }}
                      accessibilityLabel="Remove File"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color="#DC2626"
                      />
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}

          {/* Action buttons */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              marginTop: 18,
              gap: 10,
            }}
          >
            <TouchableOpacity
              style={{
                borderRadius: 14,
                height: 48,
                minWidth: 100,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#F3F4F6",
                marginLeft: 0,
                paddingHorizontal: 18,
                marginRight: 6,
              }}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text
                style={{ fontSize: 15, fontWeight: "700", color: "#374151" }}
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                borderRadius: 14,
                height: 48,
                minWidth: 110,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#6366F1",
                flexDirection: "row",
                paddingHorizontal: 22,
                marginLeft: 0,
              }}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <Ionicons
                name="save-outline"
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>
                {docId ? "Update" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UploadDocModal;
