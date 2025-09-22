import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';


export default function CheckBox({ value, onValueChange, size = 28, color = '#2563EB' }) {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      style={styles.container}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.box,
          {
            width: size,
            height: size,
            borderColor: value ? color : '#CBD5E1',
            backgroundColor: value ? color : '#fff',
            shadowOpacity: value ? 0.15 : 0.05,
          },
        ]}
      >
        {value && (
          <Ionicons name="checkmark" size={size - 10} color="#fff" style={{}} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  box: {
    borderWidth: 2.5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    transition: 'background-color 0.2s',
  },
});
