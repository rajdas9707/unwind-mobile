import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getReminderWithCheckpoints,
  updateCheckpointStatus,
} from '../../storage/waterreminder/db.js';
import {
  formatReminderName,
  formatInterval,
  getCheckpointStatusSummary,
  hasCheckpointTimePassed,
} from '../../storage/waterreminder/storage.js';

const { width } = Dimensions.get('window');

export default function ReminderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [reminder, setReminder] = useState(null);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingCheckpoint, setUpdatingCheckpoint] = useState(null);

  const loadReminderData = async () => {
    try {
      setLoading(true);
      const reminderData = await getReminderWithCheckpoints(parseInt(id));
      
      if (!reminderData) {
        Alert.alert('Error', 'Reminder not found');
        router.back();
        return;
      }
      
      setReminder(reminderData);
      setCheckpoints(reminderData.checkpoints || []);
  // const { idToken } = useContext(AuthContext); // removed, now handled in client.js
    }
  catch(error){
 console.error('Error loading reminder data:', error);
      Alert.alert('Error', 'Failed to load reminder details');
  }
     
     finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReminderData();
    }, [id])
  );

  const handleToggleCheckpoint = async (checkpointId, currentStatus) => {
    try {
      setUpdatingCheckpoint(checkpointId);
      const newStatus = !currentStatus;
      
      await updateCheckpointStatus(checkpointId, newStatus);
      
      // Update local state
      setCheckpoints(prevCheckpoints =>
        prevCheckpoints.map(checkpoint =>
          checkpoint.id === checkpointId
            ? { ...checkpoint, is_completed: newStatus ? 1 : 0 }
            : checkpoint
        )
      );
    } catch (error) {
      console.error('Error updating checkpoint:', error);
      Alert.alert('Error', 'Failed to update checkpoint status');
    } finally {
      setUpdatingCheckpoint(null);
    }
  };

  const renderCheckpoint = (checkpoint, index) => {
    const isCompleted = checkpoint.is_completed === 1;
    const timePassed = hasCheckpointTimePassed(checkpoint.checkpoint_time);
    const isUpdating = updatingCheckpoint === checkpoint.id;

    return (
      <View key={checkpoint.id} style={styles.checkpointCard}>
        <LinearGradient
          colors={isCompleted ? ['#10B981', '#059669'] : timePassed ? ['#F59E0B', '#D97706'] : ['#E5E7EB', '#D1D5DB']}
          style={styles.checkpointGradient}
        >
          <View style={styles.checkpointContent}>
            <View style={styles.checkpointInfo}>
              <View style={styles.checkpointHeader}>
                <Text style={[styles.checkpointTime, isCompleted && styles.completedText]}>
                  {checkpoint.checkpoint_time}
                </Text>
                <Text style={[styles.checkpointLabel, isCompleted && styles.completedText]}>
                  Checkpoint {index + 1}
                </Text>
              </View>
              <Text style={[styles.checkpointQuantity, isCompleted && styles.completedText]}>
                {reminder?.quantity}ml of water
              </Text>
              {isCompleted && checkpoint.completed_at && (
                <Text style={styles.completedTime}>
                  Completed: {new Date(checkpoint.completed_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              )}
            </View>
            <View style={styles.checkpointActions}>
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Switch
                  value={isCompleted}
                  onValueChange={() => handleToggleCheckpoint(checkpoint.id, isCompleted)}
                  trackColor={{ false: '#D1D5DB', true: '#34D399' }}
                  thumbColor={isCompleted ? '#FFFFFF' : '#F9FAFB'}
                  ios_backgroundColor="#D1D5DB"
                />
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading reminder details...</Text>
      </View>
    );
  }

  if (!reminder) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="light" />
        <Ionicons name="water" size={64} color="#6B7280" />
        <Text style={styles.errorText}>Reminder not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusSummary = getCheckpointStatusSummary(checkpoints);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient colors={['#3B82F6', '#1D4ED8', '#1E40AF']} style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="water" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>Water Reminder</Text>
          <Text style={styles.headerSubtitle}>
            {formatReminderName(reminder.start_time, reminder.end_time)}
          </Text>
        </View>
      </LinearGradient>

      {/* Progress Summary */}
      <View style={styles.progressContainer}>
        <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Today's Progress</Text>
            <View style={styles.progressBadge}>
              <Text style={styles.progressPercentage}>{statusSummary.percentage}%</Text>
            </View>
          </View>
          
          <View style={styles.progressBar}>
            <View style={styles.progressBarBackground}>
              <LinearGradient
                colors={['#10B981', '#34D399']}
                style={[styles.progressBarFill, { width: `${statusSummary.percentage}%` }]}
              />
            </View>
          </View>
          
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatNumber}>{statusSummary.completed}</Text>
              <Text style={styles.progressStatLabel}>Completed</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatNumber}>{statusSummary.remaining}</Text>
              <Text style={styles.progressStatLabel}>Remaining</Text>
            </View>
            <View style={styles.progressStat}>
              <Text style={styles.progressStatNumber}>{statusSummary.total}</Text>
              <Text style={styles.progressStatLabel}>Total</Text>
            </View>
          </View>

          <View style={styles.reminderInfo}>
            <View style={styles.reminderInfoItem}>
              <Ionicons name="time" size={16} color="#6B7280" />
              <Text style={styles.reminderInfoText}>
                {formatInterval(reminder.interval_value, reminder.interval_unit)}
              </Text>
            </View>
            <View style={styles.reminderInfoItem}>
              <Ionicons name="water" size={16} color="#6B7280" />
              <Text style={styles.reminderInfoText}>{reminder.quantity}ml per reminder</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Checkpoints List */}
      <ScrollView 
        style={styles.checkpointsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.checkpointsContent}
      >
        <Text style={styles.checkpointsTitle}>Hydration Checkpoints</Text>
        {checkpoints.map((checkpoint, index) => renderCheckpoint(checkpoint, index))}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Stay hydrated throughout the day! 💧
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerBackButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  progressCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  progressBadge: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  progressBar: {
    marginBottom: 16,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  progressStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  reminderInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  reminderInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderInfoText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  checkpointsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  checkpointsContent: {
    paddingBottom: 40,
  },
  checkpointsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 16,
  },
  checkpointCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  checkpointGradient: {
    padding: 16,
  },
  checkpointContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkpointInfo: {
    flex: 1,
  },
  checkpointHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkpointTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  checkpointLabel: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkpointQuantity: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  completedText: {
    color: '#FFFFFF',
  },
  completedTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  checkpointActions: {
    marginLeft: 16,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});