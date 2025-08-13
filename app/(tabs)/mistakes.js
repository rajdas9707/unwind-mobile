import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import RNPickerSelect from 'react-native-picker-select';

export default function MistakesScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newMistake, setNewMistake] = useState('');
  const [newSolution, setNewSolution] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [entries, setEntries] = useState([]);

  const categories = [
    { label: 'Work/Career', value: 'Work/Career' },
    { label: 'Relationships', value: 'Relationships' },
    { label: 'Health', value: 'Health' },
    { label: 'Finance', value: 'Finance' },
    { label: 'Personal Growth', value: 'Personal Growth' },
    { label: 'Communication', value: 'Communication' },
    { label: 'Time Management', value: 'Time Management' },
    { label: 'Decision Making', value: 'Decision Making' },
    { label: 'Other', value: 'Other' }
  ];

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const storedEntries = await AsyncStorage.getItem('mistakeEntries');
      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const saveEntries = async (updatedEntries) => {
    try {
      await AsyncStorage.setItem('mistakeEntries', JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error saving entries:', error);
    }
  };

  const addEntry = () => {
    if (!newMistake.trim()) {
      Alert.alert('Error', 'Please describe the mistake');
      return;
    }

    if (!newSolution.trim()) {
      Alert.alert('Error', 'Please provide a solution or lesson learned');
      return;
    }

    const entry = {
      id: Date.now().toString(),
      date: selectedDate,
      mistake: newMistake.trim(),
      solution: newSolution.trim(),
      category: newCategory || 'Other',
      timestamp: new Date().toISOString(),
      avoided: false,
    };

    const updatedEntries = [...entries, entry];
    saveEntries(updatedEntries);
    setNewMistake('');
    setNewSolution('');
    setNewCategory('');
    setShowAddModal(false);
  };

  const toggleAvoided = (entryId) => {
    const updatedEntries = entries.map(entry =>
      entry.id === entryId ? { ...entry, avoided: !entry.avoided } : entry
    );
    saveEntries(updatedEntries);
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
        dotColor: '#F59E0B',
        selectedColor: '#F59E0B'
      };
    });
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#F59E0B'
    };
    return marked;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Work/Career': '#3B82F6',
      'Relationships': '#EF4444',
      'Health': '#10B981',
      'Finance': '#F59E0B',
      'Personal Growth': '#8B5CF6',
      'Communication': '#06B6D4',
      'Time Management': '#84CC16',
      'Decision Making': '#F97316',
      'Other': '#6B7280'
    };
    return colors[category] || '#6B7280';
  };

  const todaysEntries = getEntriesForDate(selectedDate);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Mistakes</Text>
        <TouchableOpacity 
          style={styles.calendarButton}
          onPress={() => setShowCalendar(true)}
        >
          <Ionicons name="calendar" size={20} color="#F59E0B" />
        </TouchableOpacity>
      </View>

      <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {todaysEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No mistake logs for this date</Text>
            <Text style={styles.emptyStateSubtext}>Learn and grow from your experiences</Text>
          </View>
        ) : (
          todaysEntries.map((entry) => (
            <View key={entry.id} style={[styles.entryCard, entry.avoided && styles.avoidedCard]}>
              <View style={styles.entryHeader}>
                <View style={styles.entryHeaderLeft}>
                  <Text style={styles.entryTime}>
                    {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(entry.category) + '20' }]}>
                    <Text style={[styles.categoryText, { color: getCategoryColor(entry.category) }]}>
                      {entry.category}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  onPress={() => deleteEntry(entry.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.mistakeLabel}>Mistake:</Text>
              <Text style={styles.mistakeContent}>{entry.mistake}</Text>
              
              <Text style={styles.solutionLabel}>Solution/Lesson:</Text>
              <Text style={styles.solutionContent}>{entry.solution}</Text>

              <TouchableOpacity 
                style={[styles.avoidButton, entry.avoided && styles.avoidedButton]}
                onPress={() => toggleAvoided(entry.id)}
              >
                <Ionicons name="checkmark-circle" size={16} color={entry.avoided ? "#FFFFFF" : "#10B981"} />
                <Text style={[styles.avoidButtonText, entry.avoided && styles.avoidedButtonText]}>
                  {entry.avoided ? 'Successfully Avoided' : 'Mark as Avoided Today'}
                </Text>
              </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Log Mistake</Text>
            <TouchableOpacity 
              onPress={addEntry}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>What mistake did you make?</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Describe the mistake..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={newMistake}
                onChangeText={setNewMistake}
                textAlignVertical="top"
                autoFocus
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Solution/Lesson Learned</Text>
              <TextInput
                style={styles.textInput}
                placeholder="How will you avoid this in the future?"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={newSolution}
                onChangeText={setNewSolution}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Category</Text>
              <RNPickerSelect
                onValueChange={setNewCategory}
                items={categories}
                placeholder={{ label: 'Select a category...', value: null }}
                style={pickerSelectStyles}
                value={newCategory}
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
              selectedDayBackgroundColor: '#F59E0B',
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#F59E0B',
              dayTextColor: '#2D3748',
              textDisabledColor: '#CBD5E0',
              dotColor: '#F59E0B',
              selectedDotColor: '#FFFFFF',
              arrowColor: '#F59E0B',
              monthTextColor: '#2D3748',
              indicatorColor: '#F59E0B',
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
    backgroundColor: '#FEF3C7',
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
  avoidedCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  entryHeaderLeft: {
    flex: 1,
  },
  entryTime: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
  mistakeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  mistakeContent: {
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
  avoidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  avoidedButton: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  avoidButtonText: {
    color: '#10B981',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  avoidedButtonText: {
    color: '#FFFFFF',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
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
    backgroundColor: '#F59E0B',
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
    minHeight: 80,
  },
});

const pickerSelectStyles = {
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    color: '#374151',
    backgroundColor: '#FFFFFF',
    paddingRight: 30,
  },
};