import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';

export default function OverthinkingScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newThought, setNewThought] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const storedEntries = await AsyncStorage.getItem('overthinkingEntries');
      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const saveEntries = async (updatedEntries) => {
    try {
      await AsyncStorage.setItem('overthinkingEntries', JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error saving entries:', error);
    }
  };

  const addEntry = () => {
    if (!newThought.trim()) {
      Alert.alert('Error', 'Please describe your overthinking pattern');
      return;
    }

    const entry = {
      id: Date.now().toString(),
      date: selectedDate,
      thought: newThought.trim(),
      solution: newSolution.trim(),
      timestamp: new Date().toISOString(),
      dumped: false,
    };

    const updatedEntries = [...entries, entry];
    saveEntries(updatedEntries);
    setNewThought('');
    setNewSolution('');
    setShowAddModal(false);
  };

  const dumpThought = (entryId) => {
    Alert.alert(
      'Release Thought',
      'Are you ready to let go of this overthinking pattern?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          onPress: () => {
            const updatedEntries = entries.map(entry =>
              entry.id === entryId ? { ...entry, dumped: true } : entry
            );
            saveEntries(updatedEntries);
          }
        }
      ]
    );
  };

  const deleteEntry = (entryId) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedEntries = entries.filter(entry => entry.id !== entryId);
            saveEntries(updatedEntries);
          }
        }
      ]
    );
  };

  const getEntriesForDate = (date) => {
    return entries.filter(entry => entry.date === date);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMarkedDates = () => {
    const marked = {};
    entries.forEach(entry => {
      marked[entry.date] = {
        marked: true,
        dotColor: '#8B5CF6',
        selectedColor: '#8B5CF6'
      };
    });
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#8B5CF6'
    };
    return marked;
  };

  const todaysEntries = getEntriesForDate(selectedDate);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Overthinking</Text>
        <TouchableOpacity 
          style={styles.calendarButton}
          onPress={() => setShowCalendar(true)}
        >
          <Ionicons name="calendar" size={20} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {todaysEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bulb-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No overthinking logs today</Text>
            <Text style={styles.emptyStateSubtext}>Track and release your racing thoughts</Text>
          </View>
        ) : (
          todaysEntries.map((entry) => (
            <View key={entry.id} style={[styles.entryCard, entry.dumped && styles.dumpedCard]}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTime}>
                  {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <TouchableOpacity 
                  onPress={() => deleteEntry(entry.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.thoughtLabel}>Thought:</Text>
              <Text style={styles.thoughtContent}>{entry.thought}</Text>
              
              {entry.solution && (
                <>
                  <Text style={styles.solutionLabel}>Solution:</Text>
                  <Text style={styles.solutionContent}>{entry.solution}</Text>
                </>
              )}

              {!entry.dumped ? (
                <TouchableOpacity 
                  style={styles.dumpButton}
                  onPress={() => dumpThought(entry.id)}
                >
                  <Text style={styles.dumpButtonText}>Release Thought</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.dumpedIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.dumpedText}>Released</Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Entry Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAddModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Overthinking</Text>
            <TouchableOpacity 
              onPress={addEntry}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>What are you overthinking about?</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Describe your racing thoughts..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                value={newThought}
                onChangeText={setNewThought}
                textAlignVertical="top"
                autoFocus
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Potential Solution (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="What could help resolve this?"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={newSolution}
                onChangeText={setNewSolution}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowCalendar(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Date</Text>
            <View style={styles.placeholder} />
          </View>
          
          <Calendar
            onDayPress={(day) => {
              setSelectedDate(day.dateString);
              setShowCalendar(false);
            }}
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: '#FFFFFF',
              calendarBackground: '#FFFFFF',
              textSectionTitleColor: '#6B7280',
              selectedDayBackgroundColor: '#8B5CF6',
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#8B5CF6',
              dayTextColor: '#2D3748',
              textDisabledColor: '#CBD5E0',
              dotColor: '#8B5CF6',
              selectedDotColor: '#FFFFFF',
              arrowColor: '#8B5CF6',
              monthTextColor: '#2D3748',
              indicatorColor: '#8B5CF6',
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  calendarButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3E8FF',
  },
  dateText: {
    fontSize: 16,
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  entryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dumpedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  entryTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  deleteButton: {
    padding: 4,
  },
  thoughtLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  thoughtContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  solutionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  solutionContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 12,
  },
  dumpButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  dumpButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  dumpedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  dumpedText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  modalScrollView: {
    flex: 1,
    padding: 16,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
  },
});