import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
// Removed animation imports
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNetworkStatus } from "../../utils/networkUtils";
// import { useDatabaseReady } from "../../hooks/useDatabaseReady";

// Import our storage layer
import {
  fetchJournalEntryById,
  fetchJournalEntryWithServerData,
  updateJournalEntryLocal,
  deleteJournalEntryLocal,
  syncJournalEntryToServer,
  canSyncToday
} from "../../storage/journal/storage";

export default function JournalDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  // const { isReady } = useDatabaseReady();
  const isOnline = useNetworkStatus();
  
  const [entry, setEntry] = useState(null);
  const [combinedData, setCombinedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Removed animation logic

  // Load entry data
  useEffect(() => {
    if ( id) {
      loadEntry();
    }
  }, [ id]);

  const loadEntry = async () => {
    try {
      setLoading(true);
      // Load combined local and server data
      const combined = await fetchJournalEntryWithServerData(id);
      
      if (!combined) {
        Alert.alert("Entry Not Found", "This journal entry could not be found.", [
          { text: "OK", onPress: () => router.back() }
        ]);
        return;
      }
      
      // Keep existing single entry API for editing references
      const entryData = combined.local;
      setCombinedData(combined);
      setEntry(entryData);
      setEditTitle(entryData.title || "");
      setEditContent(entryData.content || "");
    } catch (error) {
      console.error("Error loading journal entry:", error);
      Alert.alert("Error", "Failed to load journal entry");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditTitle(entry?.title || "");
    setEditContent(entry?.content || "");
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    try {
      if (!editContent.trim()) {
        Alert.alert("Error", "Journal content cannot be empty");
        return;
      }

      const updatedEntry = await updateJournalEntryLocal({
        id: entry.id,
        title: editTitle.trim(),
        content: editContent.trim()
      });

      setEntry(updatedEntry);
      setIsEditing(false);
      
      Alert.alert("Success", "Entry updated successfully!");
      
      // Try to sync if online
      if (isOnline) {
        try {
          setIsSyncing(true);
          const synced=await syncJournalEntryToServer({ entry: updatedEntry });
                  if(!synced){
                     Alert.alert("Sync Failed", "Entry saved locally but couldn't be synced. You can try again later.");
                     return
                   } 
          await loadEntry(); // Refresh to show synced status
        } catch (syncError) {
          console.warn("Failed to sync updated entry:", syncError);
          Alert.alert(
            "Sync Failed", 
            "Entry updated locally but couldn't be synced. You can try syncing manually later."
          );
        } finally {
          setIsSyncing(false);
        }
      }
    } catch (error) {
      console.error("Error updating journal entry:", error);
      Alert.alert("Error", error.message || "Failed to update entry");
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this journal entry? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteJournalEntryLocal({ entry });
              Alert.alert("Success", "Entry deleted successfully!", [
                { text: "OK", onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error("Error deleting entry:", error);
              Alert.alert("Error", "Failed to delete entry");
            }
          },
        },
      ]
    );
  };

  const handleSync = async () => {
    if (!entry || entry.synced) return;
    
    if (!isOnline) {
      Alert.alert(
        "No Internet Connection",
        "Please check your connection and try again."
      );
      return;
    }
    
    // idToken check removed, handled in client.js
    
    try {
      // Check daily sync limit
      const canSync = await canSyncToday();
      if (!canSync) {
        Alert.alert(
          "Sync Limit Reached",
          "You can only sync 3 times per day. Try again tomorrow."
        );
        return;
      }
      
      setIsSyncing(true);
      
 const synced=await syncJournalEntryToServer({ entry });
                   
 if(!synced)
 {
                            Alert.alert("Sync Failed", "Failed to sync entry. Please try again later.");
                            return;
                          }
      await loadEntry(); // Refresh to show synced status
      
      Alert.alert("Success", "Entry synced to cloud successfully!");
    } catch (error) {
      console.error("Error syncing entry:", error);
      Alert.alert(
        "Sync Failed",
        error.message || "Failed to sync entry. Please try again later."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleShare = async () => {
    if (!entry) return;
    
    try {
      const shareContent = `${entry.title ? `${entry.title}\n\n` : ''}${entry.content}`;
      await Share.share({
        message: shareContent,
        title: entry.title || "Journal Entry"
      });
    } catch (error) {
      console.error("Error sharing entry:", error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading entry...</Text>
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="dark" />
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Entry not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Entry" : "Journal Entry"}
        </Text>
        
        <View style={styles.headerActions}>
          {!isEditing && (
            <>
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={handleShare}
              >
                <Ionicons name="share-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={handleEdit}
              >
                <Ionicons name="create-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.headerButton, { marginLeft: 4 }]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
          
          {isEditing && (
            <>
              <TouchableOpacity 
                style={styles.headerButton} 
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {combinedData && combinedData.isSynced ? (
        /* Simple Split View for Synced Entries */
        <View style={styles.syncedContainer}>
          {/* Top Half - Device Data */}
          <View style={styles.deviceSection}>
            <View style={styles.simpleHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.deviceDot} />
                <Text style={styles.simpleHeaderTitle}>Device</Text>
              </View>
              <Text style={styles.headerDate}>{formatDate(combinedData.local.created_at)}</Text>
            </View>
            
            <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
              {isEditing ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={styles.titleInput}
                    placeholder="Title (optional)"
                    placeholderTextColor="#9CA3AF"
                    value={editTitle}
                    onChangeText={setEditTitle}
                    maxLength={200}
                  />
                  
                  <TextInput
                    style={styles.contentInput}
                    placeholder="What's on your mind?"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={12}
                    value={editContent}
                    onChangeText={setEditContent}
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>
              ) : (
                <View style={styles.contentDisplay}>
                  {combinedData.local.title && (
                    <Text style={styles.displayTitle}>{combinedData.local.title}</Text>
                  )}
                  <Text style={styles.displayContent}>{combinedData.local.content}</Text>
                </View>
              )}
            </ScrollView>
          </View>
          
          {/* Divider */}
          <View style={styles.simpleDivider} />
          
          {/* Bottom Half - Cloud Data */}
          <View style={styles.cloudSection}>
            <View style={styles.simpleHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.cloudDot} />
                <Text style={styles.simpleHeaderTitle}>Cloud</Text>
              </View>
              <Text style={styles.headerDate}>
                {combinedData.server ? formatDate(combinedData.server.createdAt) : 'Unavailable'}
              </Text>
            </View>
            
            <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
              {combinedData.server ? (
                <View style={styles.contentDisplay}>
                  {combinedData.server.title && (
                    <Text style={styles.displayTitle}>{combinedData.server.title}</Text>
                  )}
                  <Text style={styles.displayContent}>{combinedData.server.content}</Text>
                  
                  {(combinedData.server.tags?.length > 0 || combinedData.server.mood) && (
                    <View style={styles.extraInfo}>
                      {combinedData.server.tags?.length > 0 && (
                        <Text style={styles.tags}>Tags: {combinedData.server.tags.join(", ")}</Text>
                      )}
                      {combinedData.server.mood && (
                        <Text style={styles.mood}>Mood: {combinedData.server.mood}</Text>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.unavailableContainer}>
                  <Ionicons name="cloud-offline" size={32} color="#94A3B8" />
                  <Text style={styles.unavailableTitle}>No Data</Text>
                  <Text style={styles.unavailableText}>Server data unavailable</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : (
        /* Original Single View Layout for Non-Synced Entries */
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Entry Info */}
          <View style={styles.entryInfo}>
            <Text style={styles.entryDate}>
              {formatDate(entry.created_at)}
            </Text>
            
            <View style={styles.statusRow}>
              <View style={styles.sentimentContainer}>
                <Text style={styles.sentimentEmoji}>{entry.sentiment}</Text>
                <Text style={styles.sentimentLabel}>Mood</Text>
              </View>
              
              <View style={styles.syncStatusContainer}>
                {entry.synced ? (
                  <View style={styles.syncStatus}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.syncedText}>Synced</Text>
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={styles.syncStatus} 
                    onPress={handleSync}
                    disabled={isSyncing}
                  >
                    <Ionicons 
                      name={isSyncing ? "sync-outline" : "cloud-upload-outline"} 
                      size={16} 
                      color={isSyncing ? "#9CA3AF" : "#F59E0B"} 
                    />
                    <Text style={styles.unsyncedText}>
                      {isSyncing ? "Syncing..." : "Tap to sync"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Entry Content */}
          <View style={styles.entryContent}>
            {isEditing ? (
              <>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Title (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={editTitle}
                  onChangeText={setEditTitle}
                  maxLength={200}
                />
                
                <TextInput
                  style={styles.contentInput}
                  placeholder="What's on your mind?"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={20}
                  value={editContent}
                  onChangeText={setEditContent}
                  textAlignVertical="top"
                  autoFocus
                />
              </>
            ) : (
              <>
                {entry.title && (
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                )}
                <Text style={styles.entryText}>{entry.content}</Text>
              </>
            )}
          </View>

          {/* Server Meta Info (if synced) - Keep for backward compatibility */}
          {entry.synced && entry.server_meta && (
            <View style={styles.serverMetaContainer}>
              <Text style={styles.serverMetaTitle}>Cloud Information</Text>
              
              <View style={styles.serverMetaRow}>
                <Ionicons name="cloud" size={16} color="#6B7280" />
                <Text style={styles.serverMetaText}>
                  Synced to cloud on {formatDate(entry.server_meta.updatedAt)}
                </Text>
              </View>
              
              {entry.server_meta.tags && entry.server_meta.tags.length > 0 && (
                <View style={styles.serverMetaRow}>
                  <Ionicons name="pricetags" size={16} color="#6B7280" />
                  <Text style={styles.serverMetaText}>
                    Tags: {entry.server_meta.tags.join(", ")}
                  </Text>
                </View>
              )}
              
              {entry.server_meta.mood && (
                <View style={styles.serverMetaRow}>
                  <Ionicons name="happy" size={16} color="#6B7280" />
                  <Text style={styles.serverMetaText}>
                    Server mood: {entry.server_meta.mood}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Not Synced Warning */}
          {!entry.synced && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning-outline" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                This entry hasn't been synced to the cloud yet. {isOnline ? "Tap the sync button above to save it online." : "Connect to the internet to sync."}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  backButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "500",
  },
  saveButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  entryInfo: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  entryDate: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sentimentContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sentimentEmoji: {
    fontSize: 24,
  },
  sentimentLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  syncStatusContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  syncStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 6,
    borderRadius: 6,
  },
  syncedText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500",
  },
  unsyncedText: {
    fontSize: 12,
    color: "#F59E0B",
    fontWeight: "500",
  },
  entryContent: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    minHeight: 300,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    padding: 0,
    textAlignVertical: "top",
  },
  contentInput: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    padding: 0,
    textAlignVertical: "top",
    minHeight: 200,
  },
  entryTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    lineHeight: 28,
  },
  entryText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  serverMetaContainer: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  serverMetaTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  serverMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  serverMetaText: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  // Simple, modern split-view styles
  syncedContainer: {
    flex: 1,
  },
  deviceSection: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  cloudSection: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  simpleDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  simpleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F1F1",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deviceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
  },
  cloudDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  simpleHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  headerDate: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  contentArea: {
    flex: 1,
  },
  editContainer: {
    padding: 20,
  },
  contentDisplay: {
    padding: 20,
  },
  displayTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    lineHeight: 26,
  },
  displayContent: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  extraInfo: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  tags: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  mood: {
    fontSize: 13,
    color: "#6B7280",
  },
  unavailableContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  unavailableTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginTop: 12,
    marginBottom: 4,
  },
  unavailableText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
  },
});
