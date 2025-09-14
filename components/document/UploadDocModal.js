import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";

const TAGS = ["Bank", "Work", "Personal", "ID", "Miscellaneous"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const UploadDocModal = ({ visible, onClose }) => {
  const [files, setFiles] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [note, setNote] = useState("");

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        multiple: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const validFiles = result.assets.filter((file) => {
          if (file.size > MAX_FILE_SIZE) {
            Alert.alert(
              "File Too Large",
              `${file.name} exceeds 10 MB and was skipped.`
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

  const removeFile = (index) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = () => {
    console.log("Submitting files:", files, "Selected tag:", selectedTag, "Note:", note);

    if (!selectedTag) {
      Alert.alert("Select Tag", "Please select a tag before submitting.");
      return;
    }

    if (!files || files.length === 0) {
      Alert.alert("No Files", "Please select at least one file or image.");
      return;
    }

    // 👉 Here you can save files, send to backend, etc.
    files.forEach((file) => {
      console.log("Saving file:", file.name, file.uri, selectedTag, note);
    });

    // Reset modal state
    setFiles([]);
    setSelectedTag(null);
    setNote("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.4)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: "90%",
            backgroundColor: "#fff",
            borderRadius: 20,
            padding: 20,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowOffset: { width: 0, height: 3 },
            shadowRadius: 6,
            elevation: 6,
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
            Upload Document
          </Text>

          {/* Note input */}
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              fontSize: 16,
            }}
            value={note}
            onChangeText={setNote}
            placeholder="Enter a note"
          />

          {/* Tags */}
          <Text style={{ fontSize: 14, fontWeight: "600", marginBottom: 8 }}>
            Select Tag
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
            {TAGS.map((tag) => (
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

          {/* Upload button */}
          <TouchableOpacity
            onPress={pickFiles}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#0B5FFF",
              borderRadius: 12,
              paddingVertical: 12,
              marginBottom: 20,
            }}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
            <Text
              style={{
                color: "#fff",
                fontSize: 15,
                marginLeft: 8,
                fontWeight: "600",
              }}
            >
              Choose Files
            </Text>
          </TouchableOpacity>

          {/* Selected files preview */}
          {files.length > 0 &&
            files.map((file, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingVertical: 6,
                }}
              >
                <Text style={{ fontSize: 14, flex: 1 }}>{file.name}</Text>
                <TouchableOpacity onPress={() => removeFile(index)}>
                  <Ionicons name="trash-outline" size={20} color="red" />
                </TouchableOpacity>
              </View>
            ))}

          {/* Action buttons */}
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <TouchableOpacity
              style={{
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 20,
                marginLeft: 10,
                backgroundColor: "#ccc",
              }}
              onPress={onClose}
            >
              <Text style={{ fontSize: 15, fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                borderRadius: 12,
                paddingVertical: 10,
                paddingHorizontal: 20,
                marginLeft: 10,
                backgroundColor: "#0B5FFF",
              }}
              onPress={handleSubmit}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#fff" }}>
                Submit
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default UploadDocModal;
