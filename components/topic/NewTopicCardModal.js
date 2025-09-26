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
import { createCard, updateCard } from '../../storage/topic/storage';

export default function NewTopicCardModal({ visible, onClose, onSave, cardId = null, initialCard = null }) {
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Reset form when modal becomes visible
  useEffect(() => {
    if (visible) {
      if (initialCard) {
        setFormData({
          title: initialCard.title || '',
          description: initialCard.description || '',
        });
      } else {
        setFormData({ title: '', description: '' });
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
  }, [visible, initialCard]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    
    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (cardId && initialCard) {
        // Update existing card
        await updateCard(cardId, formData);
      } else {
        // Create new card
        await createCard(formData);
      }
      
      onSave();
    } catch (error) {
      console.error('Failed to save card:', error);
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
              {cardId ? 'Edit Card' : 'New Card'}
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
              Title *
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: formData.title.trim() ? '#e0e0e0' : '#ef4444',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: '#2c3e50',
                backgroundColor: '#f8f9fa',
                marginBottom: 16,
              }}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
              placeholder="Enter a title for your topic card"
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
                height: 100,
                textAlignVertical: 'top',
              }}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              placeholder="Enter a description for this card"
              placeholderTextColor="#999"
              multiline={true}
              numberOfLines={4}
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
                  {loading ? 'Saving...' : (cardId ? 'Update' : 'Create')}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}