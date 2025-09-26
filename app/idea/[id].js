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
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
            onPress={handleEditIdea}
              style={styles.editButton}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteIdea}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Idea Info Card */}
          <View style={styles.ideaCard}>
            <View style={styles.ideaHeader}>
              <View style={styles.ideaIcon}>
                <Ionicons name="bulb" size={28} color="#F59E0B" />
              </View>
              <View style={styles.ideaInfo}>
                <Text style={styles.ideaTitle}>
                  {idea.name || "Untitled Idea"}
      </Text>
                <View style={styles.categoryContainer}>
                  <Ionicons name="pricetag" size={14} color="#6366F1" />
                  <Text style={styles.categoryText}>
        {idea.tag || "miscellaneous"}
      </Text>
                </View>
              </View>
            </View>
          </View>
          
          {/* Description Section */}
          {idea.idea && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={20} color="#6366F1" />
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              <View style={styles.descriptionCard}>
                <Text style={styles.descriptionText}>
                  {idea.idea}
                </Text>
              </View>
            </View>
          )}

          {/* URLs Section */}
      {idea.urls?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="link" size={20} color="#10B981" />
                <Text style={styles.sectionTitle}>Links ({idea.urls.length})</Text>
              </View>
              <View style={styles.urlsList}>
                {idea.urls.map((url, index) => (
              <TouchableOpacity
                    key={`${url}-${index}`}
                    onPress={() => Linking.openURL(url)}
                    style={styles.urlItem}
                    activeOpacity={0.7}
                  >
                    <View style={styles.urlIcon}>
                      <Ionicons name="link" size={16} color="#10B981" />
                    </View>
                    <Text style={styles.urlText} numberOfLines={1}>
                      {url}
                </Text>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
                ))}
              </View>
        </View>
      )}

          {/* Files Section */}
      {idea.files?.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="folder" size={20} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Files ({idea.files.length})</Text>
              </View>
              <View style={styles.filesList}>
                {idea.files.map((file, index) => {
                  const uri = file;
                  const fileName = uri.split('/').pop() || `File ${index + 1}`;
                  const isPdf = typeof uri === "string" && uri.toLowerCase().endsWith(".pdf");
                  const isImage = !isPdf && (uri.includes("image") || uri.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i));
                  
              return (
                <TouchableOpacity
                      key={`${uri}-${index}`}
                      style={styles.fileItem}
                  onPress={() => handleFilePress(index)}
                  activeOpacity={0.7}
                >
                      <View style={styles.fileIconContainer}>
                  {isPdf ? (
                          <Ionicons name="document-text-outline" size={24} color="#8B5CF6" />
                        ) : isImage ? (
                          <Image source={{ uri }} style={styles.fileThumbnail} />
                        ) : (
                          <Ionicons name="document-outline" size={24} color="#8B5CF6" />
                        )}
                      </View>
                      <View style={styles.fileInfo}>
                        <Text style={styles.fileName} numberOfLines={1}>
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
                </TouchableOpacity>
              );
                })}
              </View>
        </View>
      )}
        </ScrollView>

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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ideaCard: {
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
  ideaHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  ideaIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ideaInfo: {
    flex: 1,
  },
  ideaTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  categoryText: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "600",
    marginLeft: 6,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 8,
  },
  descriptionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.1)",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  descriptionText: {
    fontSize: 16,
    color: "#111827",
    lineHeight: 24,
  },
  urlsList: {
    gap: 8,
  },
  urlItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.1)",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  urlIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  filesList: {
    gap: 8,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.1)",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  fileThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
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
  removeButton: {
    padding: 4,
  },
});
