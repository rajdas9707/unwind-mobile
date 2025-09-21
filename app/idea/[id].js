import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Linking,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getIdeaById, updateIdea, deleteIdea } from "../../storage/idea/db";
import { deleteFile as deleteStoredFile } from "../../storage/idea/storage";
import { Ionicons } from "@expo/vector-icons";
import NewIdeaModal from "../../components/idea/NewIdeaModal";
import FileViewer from "../../components/shared/FileViewer";

export default function IdeaDetail() {
  const { id } = useLocalSearchParams();
  const [idea, setIdea] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const router = useRouter();

  const load = async () => {
    try {
      const row = await getIdeaById(Number(id));
      setIdea(row);
    } catch (error) {
      console.log("error loading idea detail", error);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const removeFile = async (index) => {
    try {
      const fileUri = idea.files[index];
      await deleteStoredFile(fileUri);
      const nextFiles = idea.files.filter((_, i) => i !== index);
   // import { AuthContext } from "../../context/AuthProvider";
      setIdea({ ...idea, files: nextFiles });
    } catch (error) {
      console.log("error removing file", error);
      Alert.alert("Error", "Failed to remove file");
    }
  };

  const handleEditIdea = () => {
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    setEditModalVisible(false);
    load(); // Reload the idea to show updated data
  };

  const handleDeleteIdea = async () => {
    Alert.alert(
      "Delete Idea",
      "Are you sure you want to delete this idea? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete all associated files first
              if (idea.files && idea.files.length > 0) {
                for (const fileUri of idea.files) {
                  await deleteStoredFile(fileUri);
                }
              }

              // Delete the idea from database
              await deleteIdea(idea.id);

              // Navigate back to ideas list
              router.back();
            } catch (error) {
              console.log("Error deleting idea:", error);
              Alert.alert("Error", "Failed to delete idea");
            }
          },
        },
      ]
    );
  };

  const handleFilePress = (index) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  if (!idea) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F4F6", padding: 16 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={handleEditIdea}
            style={{
              backgroundColor: "#2563EB",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteIdea}
            style={{
              backgroundColor: "#DC2626",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: "#111827",
          marginBottom: 8,
        }}
      >
        {idea.idea}
      </Text>
      <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
        {idea.tag || "miscellaneous"}
      </Text>

      {idea.urls?.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>URLs</Text>
          <FlatList
            data={idea.urls}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => Linking.openURL(item)}
                style={{ paddingVertical: 6 }}
              >
                <Text style={{ color: "#2563EB" }} numberOfLines={1}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {idea.files?.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>Files</Text>
          <FlatList
            data={idea.files}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item, index }) => {
              const uri = item;
              const isPdf =
                typeof uri === "string" && uri.toLowerCase().endsWith(".pdf");
              const isImage =
                !isPdf &&
                (uri.includes("image") ||
                  uri.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i));
              return (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                    padding: 12,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                  onPress={() => handleFilePress(index)}
                  activeOpacity={0.7}
                >
                  {isPdf ? (
                    <View
                      style={{
                        width: 64,
                        height: 64,
                        borderRadius: 8,
                        backgroundColor: "#f3f4f6",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={32}
                        color="#667eea"
                      />
                    </View>
                  ) : (
                    <Image
                      source={{ uri }}
                      style={{
                        width: 64,
                        height: 64,
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
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Edit Modal */}
      <NewIdeaModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveEdit}
        ideaId={idea.id}
        initialIdea={idea}
      />

      <FileViewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        files={idea.files?.map((uri) => ({ uri })) || []}
        currentIndex={viewerIndex}
      />
    </SafeAreaView>
  );
}
