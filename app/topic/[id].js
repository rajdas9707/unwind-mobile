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

  const renderLink = (link, topicId) => (
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
        <Ionicons name="link" size={16} color="#3498db" style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 13,
              color: 'white',
              fontWeight: '500',
            }}
            numberOfLines={1}
          >
            {link.title || link.url}
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
        <Ionicons name="open-outline" size={16} color="#7f8c8d" style={{ marginLeft: 8 }} />
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
          <Ionicons name="create-outline" size={14} color="#3498db" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            padding: 4,
            borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.2)',
          }}
          onPress={() => handleDeleteLink(link)}
        >
          <Ionicons name="trash-outline" size={14} color="#e74c3c" />
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
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: 6,
                  textShadowColor: 'rgba(0,0,0,0.3)',
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 2,
                }}
                numberOfLines={2}
              >
                {topic.name}
              </Text>
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
                <Ionicons name="create-outline" size={20} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
                onPress={() => handleDeleteTopic(topic)}
              >
                <Ionicons name="trash-outline" size={20} color="rgba(255,255,255,0.9)" />
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
                Links ({topic.links.length})
              </Text>
              <TouchableOpacity
                style={{
                  padding: 6,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                }}
                onPress={() => handleAddLink(topic.id)}
              >
                <Ionicons name="add" size={16} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            </View>
            
            {topic.links.length > 0 ? (
              <View>
                {topic.links.map((link) => renderLink(link, topic.id))}
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
                No links yet. Tap + to add one.
              </Text>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (!card) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6', padding: 16 }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#2c3e50',
            }}
            numberOfLines={1}
          >
            {card.displayTitle}
          </Text>
          <Text style={{ fontSize: 14, color: '#7f8c8d', marginTop: 2 }}>
            {topics.length === 0 ? 'No topics yet' : `${topics.length} topic${topics.length === 1 ? '' : 's'}`}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="refresh" size={40} color="#666" />
          <Text style={{ fontSize: 18, color: '#95a5a6', marginTop: 16, fontWeight: '600' }}>
            Loading topics...
          </Text>
        </View>
      ) : topics.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="bookmark-outline" size={60} color="#ccc" />
          <Text style={{ fontSize: 18, color: '#95a5a6', marginTop: 16, fontWeight: '600' }}>
            No topics yet
          </Text>
          <Text style={{ fontSize: 14, color: '#bdc3c7', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
            Tap the + button to create your first topic
          </Text>
        </View>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTopic}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 30,
          right: 25,
          width: 62,
          height: 62,
          borderRadius: 31,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 6,
        }}
        onPress={handleAddTopic}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={{
            width: 62,
            height: 62,
            borderRadius: 31,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="add" size={30} color="#fff" />
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
  );
}