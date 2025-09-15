import React, { useState } from "react";
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

export default function NewIdeaModal({ visible, onClose, onSave }) {
  const [newIdea, setNewIdea] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [selectedTag, setSelectedTag] = useState("Work");
  const [photo, setPhoto] = useState(null);

  const tags = ["Work", "Personal", "Startup"];

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!newIdea.trim()) return;
    onSave(newIdea, newUrl, selectedTag, photo);
    setNewIdea("");
    setNewUrl("");
    setSelectedTag("Work");
    setPhoto(null);
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>New Idea</Text>

          {/* Idea input with mic button */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Write or speak your idea..."
              value={newIdea}
              onChangeText={setNewIdea}
            />
            <Ionicons name="mic-outline" size={22} color="gray" style={{ marginLeft: 6 }} />
          </View>

          {/* URL input */}
          <TextInput
            style={styles.urlInput}
            placeholder="Paste URL here..."
            value={newUrl}
            onChangeText={setNewUrl}
          />

          {/* Photo Upload Options */}
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
              <Ionicons name="images-outline" size={22} color="#2563EB" />
              <Text style={styles.photoText}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={22} color="#2563EB" />
              <Text style={styles.photoText}>Camera</Text>
            </TouchableOpacity>
          </View>

          {/* Preview selected photo */}
          {photo && <Image source={{ uri: photo }} style={styles.previewImage} />}

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
