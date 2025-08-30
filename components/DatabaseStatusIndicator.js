import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../context/DatabaseProvider';

export function DatabaseStatusIndicator() {
  const { isInitialized, isLoading, error, testDatabaseConnection } = useDatabase();

  const getStatusColor = () => {
    if (error) return '#EF4444'; // Red
    if (isLoading) return '#F59E0B'; // Yellow
    if (isInitialized) return '#10B981'; // Green
    return '#6B7280'; // Gray
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isLoading) return 'Loading';
    if (isInitialized) return 'Ready';
    return 'Unknown';
  };

  const getStatusIcon = () => {
    if (error) return 'close-circle';
    if (isLoading) return 'time';
    if (isInitialized) return 'checkmark-circle';
    return 'help-circle';
  };

  const handleTestConnection = async () => {
    try {
      const isConnected = await testDatabaseConnection();
      console.log('Database connection test result:', isConnected);
    } catch (error) {
      console.error('Database connection test failed:', error);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { borderColor: getStatusColor() }]} 
      onPress={handleTestConnection}
    >
      <Ionicons 
        name={getStatusIcon()} 
        size={16} 
        color={getStatusColor()} 
      />
      <Text style={[styles.text, { color: getStatusColor() }]}>
        DB: {getStatusText()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 1000,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});
