import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import {
  initStorage,
  getAllCards,
  createCard,
  deleteCard,
} from "../storage/topic/storage";
import NewTopicCardModal from "../components/topic/NewTopicCardModal";

export default function TopicScreen() {
  const [cards, setCards] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingCard, setEditingCard] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const router = useRouter();

  // Load cards when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [])
  );

  const loadCards = async () => {
    try {
      setLoading(true);
      const cardsData = await getAllCards();
      setCards(cardsData);
    } catch (error) {
      console.error("Failed to load cards:", error);
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const addCard = () => {
    setModalVisible(false);
    setEditingCard(null);
    setShowCompleted(false); // Move to pending tab when adding new card
    loadCards();
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setModalVisible(true);
  };

  const handleDeleteCard = (card) => {
    Alert.alert(
      "Delete Card",
      `Are you sure you want to delete "${card.displayTitle}"?\n\nThis will also delete all topics and links associated with this card.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await deleteCard(card.id);
              loadCards();
            } catch (error) {
              console.error("Failed to delete card:", error);
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const renderCard = ({ item, index }) => {
    const gradients = [
      ["#667eea", "#764ba2"],
      ["#f093fb", "#f5576c"],
      ["#4facfe", "#00f2fe"],
      ["#43e97b", "#38f9d7"],
      ["#fa709a", "#fee140"],
      ["#a8edea", "#fed6e3"],
      ["#ff9a9e", "#fecfef"],
      ["#ffecd2", "#fcb69f"],
    ];

    const gradient = gradients[index % gradients.length];
    const isCompleted = item.is_completed;
    const hasTopics = item.total_topics > 0;
    const progressPercentage = item.progress || 0;

    return (
      <TouchableOpacity
        style={{
          marginBottom: 16,
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/topic/[id]", params: { id: item.id } });
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={gradient}
          style={{
            borderRadius: 16,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 6,
          }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "white",
                    textShadowColor: "rgba(0,0,0,0.3)",
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 2,
                    flex: 1,
                  }}
                  numberOfLines={2}
                >
                  {isCompleted ? '🎉 ' : '🚀 '}{item.displayTitle}{isCompleted ? ' 👑' : ' ⭐'}
                </Text>
                {isCompleted && (
                  <View style={{ 
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    marginLeft: 8,
                  }}>
                    <Text style={{ fontSize: 16 }}>🏆</Text>
                  </View>
                )}
              </View>
              
              {item.description ? (
                <Text
                  style={{
                    fontSize: 14,
                    color: "rgba(255,255,255,0.9)",
                    lineHeight: 20,
                    marginBottom: 8,
                    textShadowColor: "rgba(0,0,0,0.3)",
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 2,
                  }}
                  numberOfLines={3}
                >
                  {item.description}
                </Text>
              ) : null}
              
              {/* Progress Section */}
              {hasTopics ? (
                <View style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.8)',
                      fontWeight: '600',
                    }}>
                      {isCompleted ? '🎯 Completed!' : '📈 Progress'}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.8)',
                      fontWeight: '600',
                    }}>
                      {isCompleted ? '✨ All done!' : `🔥 ${item.completed_topics}/${item.total_topics} topics`}
                    </Text>
                  </View>
                  
                  <View style={{
                    height: 6,
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <View style={{
                      height: '100%',
                      width: `${progressPercentage}%`,
                      backgroundColor: isCompleted ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                      borderRadius: 3,
                    }} />
                  </View>
                </View>
              ) : (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.7)',
                    fontStyle: 'italic',
                  }}>
                    {isCompleted ? '🎉 Ready for new challenges!' : '💡 No topics yet - tap to add some!'}
                  </Text>
                </View>
              )}
              
              <Text
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.8)",
                  textShadowColor: "rgba(0,0,0,0.3)",
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {item.formattedDate}
              </Text>
            </View>

            <View style={{ flexDirection: "row", marginLeft: 12, gap: 8 }}>
              <TouchableOpacity
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditCard(item);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="create-outline"
                  size={20}
                  color="rgba(255,255,255,0.9)"
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.2)",
                }}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteCard(item);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color="rgba(255,255,255,0.9)"
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#F8FAFC', '#F1F5F9', '#EEF2FF']}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleIcon}>
              <Ionicons name="library" size={28} color="#8B5CF6" />
            </View>
            <View style={styles.titleText}>
              <Text style={styles.title}>Topic Cards</Text>
              <Text style={styles.subtitle}>
                {cards.length} {cards.length === 1 ? 'card' : 'cards'} created
              </Text>
            </View>
          </View>
        </View>

        {/* Toggle Button */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              !showCompleted && styles.toggleButtonActive
            ]}
            onPress={() => setShowCompleted(false)}
          >
            <Text style={[
              styles.toggleButtonText,
              !showCompleted && styles.toggleButtonTextActive
            ]}>
              Pending ({cards.filter(c => !c.is_completed).length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.toggleButton,
              showCompleted && styles.toggleButtonActive
            ]}
            onPress={() => setShowCompleted(true)}
          >
            <Text style={[
              styles.toggleButtonText,
              showCompleted && styles.toggleButtonTextActive
            ]}>
              Completed ({cards.filter(c => c.is_completed).length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cards List */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <FlatList
            data={cards.filter(card => showCompleted ? card.is_completed : !card.is_completed)}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCard}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyState}>
                  <Ionicons name="refresh" size={40} color="#8B5CF6" />
                  <Text style={styles.emptyTitle}>Loading cards...</Text>
                </View>
              ) : cards.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="library-outline" size={60} color="#8B5CF6" />
                  <Text style={styles.emptyTitle}>📚 No topic cards yet</Text>
                  <Text style={styles.emptySubtitle}>
                    💡 Tap the + button to create your first card
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name={showCompleted ? "checkmark-circle-outline" : "time-outline"} size={60} color="#8B5CF6" />
                  <Text style={styles.emptyTitle}>
                    {showCompleted ? '🏆 No completed cards yet' : '🚀 No pending cards'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {showCompleted ? 'Complete some cards to see them here' : '🎉 All cards are completed!'}
                  </Text>
                </View>
              )
            }
          />
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setEditingCard(null);
            setModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={["#8B5CF6", "#6366F1"]}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Modal Component */}
        <NewTopicCardModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false);
            setEditingCard(null);
          }}
          onSave={addCard}
          cardId={editingCard?.id}
          initialCard={editingCard}
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
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backdropFilter: "blur(10px)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  titleText: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    color: "#8B5CF6",
    marginTop: 16,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#8B5CF6",
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButtonText: {
    color: "#6B7280",
    fontWeight: "600",
    fontSize: 14,
  },
  toggleButtonTextActive: {
    color: "#fff",
  },
});
