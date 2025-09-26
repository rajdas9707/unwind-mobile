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
  StyleSheet,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
    <LinearGradient
      colors={['#F8FAFC', '#F1F5F9', '#EEF2FF']}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleEditDocument}
            style={styles.editButton}
            accessibilityLabel="Edit Document"
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteDocument}
            style={styles.deleteButton}
            accessibilityLabel="Delete Document"
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Document Info Card */}
        <View style={styles.documentCard}>
          <View style={styles.documentHeader}>
            <View style={styles.documentIcon}>
              <Ionicons name="document-outline" size={28} color="#6366F1" />
            </View>
            <View style={styles.documentInfo}>
              <Text style={styles.documentTitle}>
                {document.docName}
              </Text>
              <View style={styles.categoryContainer}>
                <Ionicons name="pricetag-outline" size={14} color="#6366F1" />
                <Text style={styles.categoryText}>
                  {document.tag || "miscellaneous"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Files Section */}
        {document.files?.length > 0 && (
          <View style={styles.filesSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="folder-outline" size={20} color="#6366F1" />
              <Text style={styles.sectionTitle}>
                Files ({(document.files || []).length})
              </Text>
            </View>
            
            {document.files.map((item, index) => {
              const uri = item;
              const isPdf = typeof uri === "string" && uri.toLowerCase().endsWith(".pdf");
              return (
                <TouchableOpacity
                  key={`${item}-${index}`}
                  style={styles.fileItem}
                  onPress={() => handleFilePress(index)}
                  activeOpacity={0.8}
                >
                  <View style={styles.fileIconContainer}>
                    {isPdf ? (
                      <Ionicons
                        name="document-text-outline"
                        size={24}
                        color="#6366F1"
                      />
                    ) : (
                      <Image
                        source={{ uri }}
                        style={styles.fileImage}
                      />
                    )}
                  </View>
                  
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {uri.split('/').pop() || uri}
                    </Text>
                    <Text style={styles.fileType}>
                      {isPdf ? 'PDF Document' : 'Image'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    onPress={() => removeFile(index)}
                    style={styles.removeButton}
                    accessibilityLabel="Remove File"
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    paddingTop: Platform.OS === "android" ? 50 : 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backdropFilter: "blur(10px)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    backgroundColor: "#6366F1",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: "#DC2626",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  documentCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.1)",
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  documentIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryText: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "600",
    marginLeft: 6,
    textTransform: "capitalize",
  },
  filesSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 8,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.1)",
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  fileImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  fileType: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
});
