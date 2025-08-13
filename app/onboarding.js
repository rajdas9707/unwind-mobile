import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: "Welcome to Mental Clarity",
    description: "Your personal journey to mental wellness and self-improvement starts here.",
    icon: "heart-outline",
    color: "#3B82F6"
  },
  {
    id: 2,
    title: "Journal Your Thoughts",
    description: "Write down your daily experiences, thoughts, and reflections to gain clarity.",
    icon: "book-outline",
    color: "#10B981"
  },
  {
    id: 3,
    title: "Manage Overthinking",
    description: "Track and release overthinking patterns to find peace of mind.",
    icon: "bulb-outline",
    color: "#8B5CF6"
  },
  {
    id: 4,
    title: "Learn from Mistakes",
    description: "Transform mistakes into valuable learning opportunities for growth.",
    icon: "trending-up-outline",
    color: "#F59E0B"
  }
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/auth');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const currentItem = onboardingData[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: currentItem.color + '20' }]}>
          <Ionicons name={currentItem.icon} size={80} color={currentItem.color} />
        </View>

        <Text style={styles.title}>{currentItem.title}</Text>
        <Text style={styles.description}>{currentItem.description}</Text>

        <View style={styles.pagination}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.paginationDot,
                index === currentIndex && styles.activeDot,
                index === currentIndex && { backgroundColor: currentItem.color }
              ]}
            />
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: currentItem.color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
  },
  skipText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 60,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4B5563',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  nextButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
});