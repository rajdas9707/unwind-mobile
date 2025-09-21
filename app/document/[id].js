import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
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
   // import { AuthContext } from "../../context/AuthProvider";
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [editModalVisible, setEditModalVisible] = useState(false);
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
  <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC", paddingHorizontal: 0, paddingTop: Platform.OS === "android" ? 50 : 0 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 8,
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
              padding: 8,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
            accessibilityLabel="Edit Document"
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteDocument}
            style={{
              backgroundColor: "#DC2626",
              padding: 8,
              borderRadius: 8,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityLabel="Delete Document"
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={{
        marginHorizontal: 16,
        marginTop: 18,
        borderRadius: 18,
        padding: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}>
        <Ionicons name="document-outline" size={26} color="#6366F1" style={{ marginRight: 6 }} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: "#1F2937",
              marginBottom: 2,
              letterSpacing: 0.1,
            }}
          >
            {document.docName}
          </Text>
          <Text style={{ fontSize: 13, color: "#6366F1", fontWeight: '600', marginBottom: 2, textTransform: 'capitalize', flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="pricetag-outline" size={14} color="#6366F1" style={{ marginRight: 2 }} />
            {document.tag || "miscellaneous"}
          </Text>
        </View>
      </View>

      {document.files?.length > 0 && (
  <View style={{ marginHorizontal: 16, marginTop: 18, marginBottom: 24 }}>
          <Text style={{ fontWeight: "700", marginBottom: 12, fontSize: 16, color: '#1F2937' }}>Files</Text>
          <FlatList
            data={document.files}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item, index }) => {
              const uri = item;
              const isPdf = typeof uri === "string" && uri.toLowerCase().endsWith(".pdf");
              return (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 14,
                    padding: 14,
                    backgroundColor: "#F9FAFB",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                  onPress={() => handleFilePress(index)}
                  activeOpacity={0.8}
                >
                  {isPdf ? (
                    <View
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        backgroundColor: "#EEF2FF",
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 12,
                        borderWidth: 1,
                        borderColor: '#E0E7FF',
                      }}
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={28}
                        color="#6366F1"
                      />
                    </View>
                  ) : (
                    <Image
                      source={{ uri }}
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        backgroundColor: "#E0E7FF",
                        marginRight: 12,
                        borderWidth: 1,
                        borderColor: '#E0E7FF',
                      }}
                    />
                  )}
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, marginLeft: 2, color: "#374151", fontSize: 15, fontWeight: '500' }}
                  >
                    {uri}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeFile(index)}
                    style={{
                      marginLeft: 10,
                      padding: 10,
                      borderRadius: 20,
                      backgroundColor: '#fff',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: '#FCA5A5',
                    }}
                    accessibilityLabel="Remove File"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={22} color="#DC2626" />
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
