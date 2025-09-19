import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { createTopic, updateTopic } from '../../storage/topic/storage';

export default function NewTopicModal({ 
  visible, 
  onClose, 
  onSave, 
  cardId, 
  topicId = null, 
  initialTopic = null 
}) {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Reset form when modal becomes visible
  useEffect(() => {
    if (visible) {
      if (initialTopic) {
        setFormData({
          name: initialTopic.name || '',
          description: initialTopic.description || '',
        });
      } else {
        setFormData({ name: '', description: '' });
      }
      
      // Animate modal in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animation values when modal is hidden
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [visible, initialTopic]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Topic name is required');
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (topicId && initialTopic) {
        // Update existing topic
        await updateTopic(topicId, formData);
      } else {
        // Create new topic
        await createTopic({ cardId, ...formData });
      }
      
      onSave();
    } catch (error) {
      console.error('Failed to save topic:', error);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Animated.View
          style={{
            backgroundColor: 'white',
            borderRadius: 16,
            padding: 24,
            width: '100%',
            maxWidth: 400,
            shadowColor: '#000',
            shadowOffset: {
              width: 0,
              height: 8,
            },
            shadowOpacity: 0.25,
            shadowRadius: 16,
            elevation: 16,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#2c3e50',
              }}
            >
              {topicId ? 'Edit Topic' : 'New Topic'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={{ marginBottom: 24 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#34495e',
                marginBottom: 8,
              }}
            >
              Name *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e0e0e0',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: '#2c3e50',
                backgroundColor: '#f8f9fa',
                marginBottom: 16,
              }}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder="Enter topic name"
              placeholderTextColor="#999"
              editable={!loading}
            />

            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#34495e',
                marginBottom: 8,
              }}
            >
              Description (optional)
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#e0e0e0',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: '#2c3e50',
                backgroundColor: '#f8f9fa',
                height: 80,
                textAlignVertical: 'top',
              }}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Enter a description for this topic"
              placeholderTextColor="#999"
              multiline={true}
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#ecf0f1',
                paddingVertical: 16,
                alignItems: 'center',
                borderRadius: 12,
              }}
              onPress={handleClose}
              disabled={loading}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: loading ? '#bdc3c7' : '#7f8c8d',
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                flex: 1,
                borderRadius: 12,
                overflow: 'hidden',
              }}
              onPress={handleSave}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#bdc3c7', '#95a5a6'] : ['#667eea', '#764ba2']}
                style={{
                  paddingVertical: 16,
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: 'white',
                  }}
                >
                  {loading ? 'Saving...' : (topicId ? 'Update' : 'Create')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}