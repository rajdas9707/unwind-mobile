import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
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
          opacity: isCompleted ? 0.6 : 1,
        }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/topic/[id]", params: { id: item.id } });
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isCompleted ? ['#95a5a6', '#7f8c8d'] : gradient}
          style={{
            borderRadius: 16,
            padding: 20,
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: 4,
            },
            shadowOpacity: isCompleted ? 0.1 : 0.15,
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
                    textDecorationLine: isCompleted ? 'line-through' : 'none',
                  }}
                  numberOfLines={2}
                >
                  {item.displayTitle}
                </Text>
                {isCompleted && (
                  <View style={{ 
                    backgroundColor: 'rgba(255,255,255,0.3)',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    marginLeft: 8,
                  }}>
                    <Ionicons name="checkmark-circle" size={16} color="white" />
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
                      Progress
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.8)',
                      fontWeight: '600',
                    }}>
                      {item.completed_topics}/{item.total_topics} topics
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
                    No topics yet - tap to add some!
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
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 18,
      }}
    >
      <StatusBar style="dark" />
      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginVertical: 18,
          alignSelf: "center",
          color: "#1F2937",
        }}
      >
        📋 Topic Cards
      </Text>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCard}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Ionicons name="refresh" size={40} color="#666" />
              <Text
                style={{
                  fontSize: 18,
                  color: "#95a5a6",
                  marginTop: 16,
                  fontWeight: "600",
                }}
              >
                Loading cards...
              </Text>
            </View>
          ) : (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Ionicons name="library-outline" size={60} color="#ccc" />
              <Text
                style={{
                  fontSize: 18,
                  color: "#95a5a6",
                  marginTop: 16,
                  fontWeight: "600",
                }}
              >
                No topic cards yet
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: "#bdc3c7",
                  marginTop: 8,
                  textAlign: "center",
                  paddingHorizontal: 40,
                }}
              >
                Tap the + button to create your first card
              </Text>
            </View>
          )
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 30,
          right: 25,
          width: 62,
          height: 62,
          borderRadius: 31,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 6,
        }}
        onPress={() => {
          setEditingCard(null);
          setModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={{
            width: 62,
            height: 62,
            borderRadius: 31,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="add" size={30} color="#fff" />
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
  );
}
