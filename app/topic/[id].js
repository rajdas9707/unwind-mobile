import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  getTopicsByCard,
  getCard,
  createTopic,
  updateTopic,
  deleteTopic,
  addLink,
  updateLink,
  deleteLink,
  toggleTopicCompletion,
  deleteCompletedCard,
} from '../../storage/topic/storage';
import NewTopicModal from '../../components/topic/NewTopicModal';
import NewLinkModal from '../../components/topic/NewLinkModal';

export default function TopicDetail() {
  const { id } = useLocalSearchParams();
  const [card, setCard] = useState(null);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Topic modal states
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  
  // Link modal states
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [linkTopicId, setLinkTopicId] = useState(null);
  
  const router = useRouter();

  // Load card and topics when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (id) {
        loadData();
      }
    }, [id])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardData, topicsData] = await Promise.all([
        getCard(Number(id)),
        getTopicsByCard(Number(id))
      ]);
      setCard(cardData);
      setTopics(topicsData);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Topic functions
  const handleAddTopic = () => {
    setEditingTopic(null);
    setTopicModalVisible(true);
  };

  const handleEditTopic = (topic) => {
    setEditingTopic(topic);
    setTopicModalVisible(true);
  };

  const handleSaveTopic = () => {
    setTopicModalVisible(false);
    setEditingTopic(null);
    loadData();
  };

  const handleDeleteTopic = (topic) => {
    Alert.alert(
      'Delete Topic',
      `Are you sure you want to delete "${topic.name}"?\n\nThis will also delete all links associated with this topic.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await deleteTopic(topic.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete topic:', error);
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleToggleCompletion = async (topicId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await toggleTopicCompletion(topicId);
      
      // Reload data to get updated completion status
      const [cardData, topicsData] = await Promise.all([
        getCard(Number(id)),
        getTopicsByCard(Number(id))
      ]);
      
      // Check if all topics are completed
      const completedTopics = topicsData.filter(t => t.is_completed).length;
      const totalTopics = topicsData.length;
      
      if (totalTopics > 0 && completedTopics === totalTopics) {
        // Show completion celebration
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          '🎉 Congratulations!',
          'You\'ve completed all topics in this card!',
          [
            {
              text: 'Great!',
              onPress: () => {
                // Just reload data normally - keep the card
                loadData();
              }
            }
          ]
        );
      } else {
        // Just reload data normally
        loadData();
      }
    } catch (error) {
      console.error('Failed to toggle completion:', error);
      Alert.alert('Error', error.message);
    }
  };

  // Link functions
  const handleAddLink = (topicId) => {
    setEditingLink(null);
    setLinkTopicId(topicId);
    setLinkModalVisible(true);
  };

  const handleEditLink = (link, topicId) => {
    setEditingLink(link);
    setLinkTopicId(topicId);
    setLinkModalVisible(true);
  };

  const handleSaveLink = () => {
    setLinkModalVisible(false);
    setEditingLink(null);
    setLinkTopicId(null);
    loadData();
  };

  const handleDeleteLink = (link) => {
    Alert.alert(
      'Delete Link',
      'Are you sure you want to delete this link?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await deleteLink(link.id);
              loadData();
            } catch (error) {
              console.error('Failed to delete link:', error);
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleOpenLink = async (url) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this link');
      }
    } catch (error) {
      console.error('Failed to open link:', error);
      Alert.alert('Error', 'Failed to open link');
    }
  };

  const renderLink = (link, topicId, iconColor = '#3498db') => (
    <View
      key={link.id}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
      }}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onPress={() => handleOpenLink(link.normalizedUrl)}
      >
        <Ionicons name="link" size={16} color={iconColor} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 13,
              color: 'white',
              fontWeight: '500',
            }}
            numberOfLines={1}
          >
            🔗 {link.title || link.url}
          </Text>
          {link.title && (
            <Text
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.7)',
                marginTop: 1,
              }}
              numberOfLines={1}
            >
              {link.url}
            </Text>
          )}
        </View>
        <Ionicons name="open-outline" size={16} color={iconColor} style={{ marginLeft: 8 }} />
      </TouchableOpacity>
      
      <View style={{ flexDirection: 'row', marginLeft: 8 }}>
        <TouchableOpacity
          style={{
            padding: 4,
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.2)',
            marginRight: 8,
          }}
          onPress={() => handleEditLink(link, topicId)}
        >
          <Ionicons name="create-outline" size={14} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            padding: 4,
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
          onPress={() => handleDeleteLink(link)}
        >
          <Ionicons name="trash-outline" size={14} color={iconColor} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderTopic = ({ item: topic, index }) => {
    const gradients = [
      ['#667eea', '#764ba2'],
      ['#f093fb', '#f5576c'],
      ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'],
      ['#fa709a', '#fee140'],
      ['#a8edea', '#fed6e3'],
    ];
    
    const gradient = gradients[index % gradients.length];
    
    // Get a contrasting color to the gradient for better icon visibility
    const getContrastingColor = (gradient) => {
      // Convert hex to RGB and calculate luminance
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };
      
      const getLuminance = (r, g, b) => {
        const [rs, gs, bs] = [r, g, b].map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
      };
      
      // Get the average color of the gradient
      const color1 = hexToRgb(gradient[0]);
      const color2 = hexToRgb(gradient[1]);
      
      if (!color1 || !color2) return '#000000';
      
      const avgR = Math.round((color1.r + color2.r) / 2);
      const avgG = Math.round((color1.g + color2.g) / 2);
      const avgB = Math.round((color1.b + color2.b) / 2);
      
      const luminance = getLuminance(avgR, avgG, avgB);
      
      // Return white for dark gradients, black for light gradients
      return luminance > 0.5 ? '#000000' : '#FFFFFF';
    };
    
    const iconColor = getContrastingColor(gradient);

    return (
      <View style={{ marginBottom: 16 }}>
        <LinearGradient
          colors={gradient}
          style={{
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <TouchableOpacity
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.8)',
                    backgroundColor: topic.is_completed ? 'rgba(255,255,255,0.9)' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                  onPress={() => handleToggleCompletion(topic.id)}
                  activeOpacity={0.7}
                >
                  {topic.is_completed && (
                    <Ionicons name="checkmark" size={16} color={iconColor} />
                  )}
                </TouchableOpacity>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: 'white',
                    textShadowColor: 'rgba(0,0,0,0.3)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 2,
                    textDecorationLine: topic.is_completed ? 'line-through' : 'none',
                    opacity: topic.is_completed ? 0.7 : 1,
                    flex: 1,
                  }}
                  numberOfLines={2}
                >
                  {topic.is_completed ? '🎉 ' : '🚀 '}{topic.name}{topic.is_completed ? ' 👑' : ' ⭐'}
                </Text>
              </View>
              {topic.description && (
                <Text
                  style={{
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 20,
                    marginBottom: 8,
                    textShadowColor: 'rgba(0,0,0,0.3)',
                    textShadowOffset: { width: 1, height: 1 },
                    textShadowRadius: 2,
                  }}
                  numberOfLines={3}
                >
                  {topic.description}
                </Text>
              )}
              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.8)',
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {topic.formattedDate}
              </Text>
            </View>
            
            <View style={{ flexDirection: 'row', marginLeft: 12 }}>
              <TouchableOpacity
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  marginRight: 12,
                }}
                onPress={() => handleEditTopic(topic)}
              >
                <Ionicons name="create-outline" size={20} color={iconColor} />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
                onPress={() => handleDeleteTopic(topic)}
              >
                <Ionicons name="trash-outline" size={20} color={iconColor} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Links Section */}
          <View
            style={{
              marginTop: 12,
              paddingTop: 16,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.2)',
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: 'rgba(255,255,255,0.9)',
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                🔗 Links ({topic.links.length})
              </Text>
              <TouchableOpacity
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
                onPress={() => handleAddLink(topic.id)}
              >
                <Ionicons name="add" size={16} color={iconColor} />
              </TouchableOpacity>
            </View>
            
            {topic.links.length > 0 ? (
              <View>
                {topic.links.map((link) => renderLink(link, topic.id, iconColor))}
              </View>
            ) : (
              <Text
                style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.7)',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  paddingVertical: 8,
                }}
              >
                💡 No links yet. Tap + to add one.
              </Text>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (!card) return null;

  return (
    <LinearGradient
      colors={['#F8FAFC', '#F1F5F9', '#EEF2FF']}
      style={styles.gradientContainer}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            
            <View style={styles.titleSection}>
              <View style={styles.titleIcon}>
              <Ionicons name="bookmark" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.titleText}>
                <Text style={styles.title} numberOfLines={1}>
                {card.displayTitle}
                </Text>
                <Text style={styles.subtitle}>
                  {topics.length === 0 ? '💡 No topics yet' : ` ${topics.length} topic${topics.length === 1 ? '' : 's'}`}
                </Text>
              </View>
            </View>
          </View>
        </View>


        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <View style={styles.loadingState}>
              <Ionicons name="refresh" size={40} color="#8B5CF6" />
              <Text style={styles.loadingText}>🔄 Loading topics...</Text>
            </View>
          ) : topics.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={60} color="#8B5CF6" />
              <Text style={styles.emptyTitle}>📚 No topics yet</Text>
              <Text style={styles.emptySubtitle}>
                💡 Tap the + button to create your first topic
              </Text>
            </View>
          ) : (
            <FlatList
              data={topics}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderTopic}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
            />
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddTopic}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#6366F1']}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Topic Modal */}
        <NewTopicModal
          visible={topicModalVisible}
          onClose={() => setTopicModalVisible(false)}
          onSave={handleSaveTopic}
          cardId={Number(id)}
          topicId={editingTopic?.id}
          initialTopic={editingTopic}
        />

        {/* Link Modal */}
        <NewLinkModal
          visible={linkModalVisible}
          onClose={() => setLinkModalVisible(false)}
          onSave={handleSaveLink}
          topicId={linkTopicId}
          linkId={editingLink?.id}
          initialLink={editingLink}
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backdropFilter: "blur(10px)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
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
    marginRight: 16,
  },
  titleSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  titleText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
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
  loadingState: {
    alignItems: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 18,
    color: "#8B5CF6",
    marginTop: 16,
    fontWeight: "600",
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
  listContent: {
    paddingTop: 20,
    paddingBottom: 100,
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
});