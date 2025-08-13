import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';

export default function JournalScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [newEntry, setNewEntry] = useState('');
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const storedEntries = await AsyncStorage.getItem('journalEntries');
      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    }
  };

  const saveEntries = async (updatedEntries) => {
    try {
      await AsyncStorage.setItem('journalEntries', JSON.stringify(updatedEntries));
      setEntries(updatedEntries);
    } catch (error) {
      console.error('Error saving entries:', error);
    }
  };

  const addEntry = () => {
    if (!newEntry.trim()) {
      Alert.alert('Error', 'Please write something in your journal');
      return;
    }

    const entry = {
      id: Date.now().toString(),
      date: selectedDate,
      content: newEntry.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedEntries = [...entries, entry];
    saveEntries(updatedEntries);
    setNewEntry('');
    setShowAddModal(false);
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
        dotColor: '#3B82F6',
        selectedColor: '#3B82F6'
      };
    });
    marked[selectedDate] = {
      ...marked[selectedDate],
      selected: true,
      selectedColor: '#3B82F6'
    };
    return marked;
  };

  const todaysEntries = getEntriesForDate(selectedDate);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <TouchableOpacity 
          style={styles.calendarButton}
          onPress={() => setShowCalendar(true)}
        >
          <Ionicons name="calendar" size={20} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {todaysEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No entries for this date</Text>
            <Text style={styles.emptyStateSubtext}>Start writing to capture your thoughts</Text>
          </View>
        ) : (
          todaysEntries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
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
              <Text style={styles.entryContent}>{entry.content}</Text>
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
            <Text style={styles.modalTitle}>New Journal Entry</Text>
            <TouchableOpacity 
              onPress={addEntry}
              style={styles.saveButton}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.textInput}
            placeholder="What's on your mind today?"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={10}
            value={newEntry}
            onChangeText={setNewEntry}
            textAlignVertical="top"
            autoFocus
          />
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
              selectedDayBackgroundColor: '#3B82F6',
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#3B82F6',
              dayTextColor: '#2D3748',
              textDisabledColor: '#CBD5E0',
              dotColor: '#3B82F6',
              selectedDotColor: '#FFFFFF',
              arrowColor: '#3B82F6',
              monthTextColor: '#2D3748',
              indicatorColor: '#3B82F6',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300',
              textDayFontSize: 16,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13
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
    backgroundColor: '#EBF4FF',
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
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  deleteButton: {
    padding: 4,
  },
  entryContent: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
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
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  textInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
});