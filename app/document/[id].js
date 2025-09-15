import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getDocumentById,
  updateDocument,
  deleteDocument,
  updateLastOpened,
} from "../../storage/document/db";
import { deleteFile as deleteStoredFile } from "../../storage/document/storage";
import { Ionicons } from "@expo/vector-icons";
import UploadDocModal from "../../components/document/UploadDocModal";
import FileViewer from "../../components/shared/FileViewer";

export default function DocumentDetail() {
  const { id } = useLocalSearchParams();
  const [document, setDocument] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const router = useRouter();

  const load = async () => {
    try {
      const row = await getDocumentById(Number(id));
      setDocument(row);
      // Update last opened time
      if (row) {
        await updateLastOpened(Number(id));
      }
    } catch (error) {
      console.log("error loading document detail", error);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const removeFile = async (index) => {
    try {
      const fileUri = document.files[index];
      await deleteStoredFile(fileUri);
      const nextFiles = document.files.filter((_, i) => i !== index);
      await updateDocument({ id: document.id, files: nextFiles });
      setDocument({ ...document, files: nextFiles });
    } catch (error) {
      console.log("error removing file", error);
      Alert.alert("Error", "Failed to remove file");
    }
  };

  const handleEditDocument = () => {
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    setEditModalVisible(false);
    load(); // Reload the document to show updated data
  };

  const handleDeleteDocument = async () => {
    Alert.alert(
      "Delete Document",
      "Are you sure you want to delete this document? This action cannot be undone.",
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
              if (document.files && document.files.length > 0) {
                for (const fileUri of document.files) {
                  await deleteStoredFile(fileUri);
                }
              }

              // Delete the document from database
              await deleteDocument(document.id);

              // Navigate back to documents list
              router.back();
            } catch (error) {
              console.log("Error deleting document:", error);
              Alert.alert("Error", "Failed to delete document");
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

  if (!document) return null;

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
            onPress={handleEditDocument}
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
            onPress={handleDeleteDocument}
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
        {document.docName}
      </Text>
      <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
        {document.tag || "miscellaneous"}
      </Text>

      {document.files?.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>Files</Text>
          <FlatList
            data={document.files}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item, index }) => {
              const uri = item;
              const isPdf =
                typeof uri === "string" && uri.toLowerCase().endsWith(".pdf");
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
      <UploadDocModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSave={handleSaveEdit}
        docId={document.id}
        initialDoc={document}
      />

      <FileViewer
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        files={document.files?.map((uri) => ({ uri })) || []}
        currentIndex={viewerIndex}
      />
    </SafeAreaView>
  );
}
