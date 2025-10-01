import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
  Easing,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import Modal from 'react-native-modal';
import Svg, { Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CIRCLE_RADIUS = screenWidth * 0.35;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const WORK_GRADIENTS = ['#FF6B6B', '#FF8E8E', '#C44569'];
const BREAK_GRADIENTS = ['#4ECDC4', '#44A08D', '#096A2E'];

const PomodoroTimer = () => {
  // Timer state
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work'); // 'work' or 'break'
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  
  // UI state
  const [isCustomModalVisible, setIsCustomModalVisible] = useState(false);
  const [tempWorkDuration, setTempWorkDuration] = useState(25);
  const [tempBreakDuration, setTempBreakDuration] = useState(5);

  // Animations
  const progressValue = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  const breathingValue = useSharedValue(1);
  const buttonScaleValue = useSharedValue(1);

  // Load saved durations from AsyncStorage
  useEffect(() => {
    loadSavedDurations();
  }, []);

  const loadSavedDurations = async () => {
    try {
      const savedWorkDuration = await AsyncStorage.getItem('pomodoro_work_duration');
      const savedBreakDuration = await AsyncStorage.getItem('pomodoro_break_duration');
      
      if (savedWorkDuration) {
        const work = parseInt(savedWorkDuration);
        setWorkDuration(work);
        setTempWorkDuration(work);
        if (mode === 'work') {
          setTimeLeft(work * 60);
        }
      }
      
      if (savedBreakDuration) {
        const breakTime = parseInt(savedBreakDuration);
        setBreakDuration(breakTime);
        setTempBreakDuration(breakTime);
        if (mode === 'break') {
          setTimeLeft(breakTime * 60);
        }
      }
    } catch (error) {
      console.error('Error loading saved durations:', error);
    }
  };

  const saveDurations = async (workTime, breakTime) => {
    try {
      await AsyncStorage.setItem('pomodoro_work_duration', workTime.toString());
      await AsyncStorage.setItem('pomodoro_break_duration', breakTime.toString());
    } catch (error) {
      console.error('Error saving durations:', error);
    }
  };

  // Timer logic
  useEffect(() => {
    let interval = null;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft]);

  // Update progress animation
  useEffect(() => {
    const totalTime = mode === 'work' ? workDuration * 60 : breakDuration * 60;
    const progress = 1 - timeLeft / totalTime;
    progressValue.value = withTiming(progress, {
      duration: 1000,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [timeLeft, mode, workDuration, breakDuration]);

  // Breathing animation for timer text
  useEffect(() => {
    if (isRunning) {
      breathingValue.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    } else {
      breathingValue.value = withTiming(1, { duration: 500 });
    }
  }, [isRunning]);

  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Auto-switch between work and break
    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    
    const newDuration = newMode === 'work' ? workDuration : breakDuration;
    setTimeLeft(newDuration * 60);
    
    // Show completion alert
    Alert.alert(
      `${mode === 'work' ? 'Work' : 'Break'} Session Complete!`,
      `Time for a ${newMode === 'work' ? 'work session' : 'break'}!`,
      [
        {
          text: 'Start Now',
          onPress: () => setIsRunning(true),
        },
        {
          text: 'Later',
          style: 'cancel',
        },
      ]
    );
  }, [mode, workDuration, breakDuration]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
    
    // Button press animation
    buttonScaleValue.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    
    // Light haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const resetTimer = () => {
    setIsRunning(false);
    const duration = mode === 'work' ? workDuration : breakDuration;
    setTimeLeft(duration * 60);
    
    // Button press animation
    buttonScaleValue.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 400 })
    );
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const switchMode = () => {
    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    setIsRunning(false);
    
    const newDuration = newMode === 'work' ? workDuration : breakDuration;
    setTimeLeft(newDuration * 60);
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCustomizeSave = () => {
    setWorkDuration(tempWorkDuration);
    setBreakDuration(tempBreakDuration);
    saveDurations(tempWorkDuration, tempBreakDuration);
    
    // Update current timer if not running
    if (!isRunning) {
      const newDuration = mode === 'work' ? tempWorkDuration : tempBreakDuration;
      setTimeLeft(newDuration * 60);
    }
    
    setIsCustomModalVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDurationOptions = () => {
    const options = [];
    for (let i = 1; i <= 60; i++) {
      options.push(i);
    }
    return options;
  };

  // Animated styles
  const progressAnimatedStyle = useAnimatedStyle(() => {
    const strokeDashoffset = CIRCUMFERENCE * (1 - progressValue.value);
    return {
      strokeDashoffset,
    };
  });

  const breathingAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: breathingValue.value }],
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScaleValue.value }],
    };
  });

  const currentGradient = mode === 'work' ? WORK_GRADIENTS : BREAK_GRADIENTS;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={currentGradient}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Pomodoro Timer</Text>
          
          <TouchableOpacity
            style={styles.customizeButton}
            onPress={() => setIsCustomModalVisible(true)}
          >
            <Ionicons name="settings" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeContainer}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'work' && styles.activeModeButton]}
            onPress={switchMode}
          >
            <Text style={[styles.modeText, mode === 'work' && styles.activeModeText]}>
              Work
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'break' && styles.activeModeButton]}
            onPress={switchMode}
          >
            <Text style={[styles.modeText, mode === 'break' && styles.activeModeText]}>
              Break
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timer Circle */}
        <View style={styles.timerContainer}>
          <View style={styles.circleContainer}>
            {/* Background Circle */}
            <Svg width={CIRCLE_RADIUS * 2} height={CIRCLE_RADIUS * 2}>
              <Circle
                cx={CIRCLE_RADIUS}
                cy={CIRCLE_RADIUS}
                r={CIRCLE_RADIUS - STROKE_WIDTH / 2}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              <Circle
                cx={CIRCLE_RADIUS}
                cy={CIRCLE_RADIUS}
                r={CIRCLE_RADIUS - STROKE_WIDTH / 2}
                stroke="white"
                strokeWidth={STROKE_WIDTH}
                fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE}
                strokeLinecap="round"
                transform={`rotate(-90 ${CIRCLE_RADIUS} ${CIRCLE_RADIUS})`}
                style={progressAnimatedStyle}
              />
            </Svg>
            
            {/* Timer Text */}
            <Animated.View style={[styles.timerTextContainer, breathingAnimatedStyle]}>
              <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              <Text style={styles.modeLabel}>{mode.toUpperCase()}</Text>
            </Animated.View>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[styles.controlButton, styles.resetButton]}
              onPress={resetTimer}
            >
              <Ionicons name="refresh" size={24} color="white" />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[styles.controlButton, styles.playButton]}
              onPress={toggleTimer}
            >
              <Ionicons 
                name={isRunning ? "pause" : "play"} 
                size={32} 
                color="white" 
                style={!isRunning && { marginLeft: 3 }}
              />
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={buttonAnimatedStyle}>
            <TouchableOpacity
              style={[styles.controlButton, styles.resetButton]}
              onPress={switchMode}
            >
              <Ionicons name="swap-horizontal" size={24} color="white" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </LinearGradient>

      {/* Customization Modal */}
      <Modal
        isVisible={isCustomModalVisible}
        onBackdropPress={() => setIsCustomModalVisible(false)}
        style={styles.modal}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Customize Timer</Text>
          
          <View style={styles.durationContainer}>
            <Text style={styles.durationLabel}>Work Duration (minutes)</Text>
            <View style={styles.durationSelector}>
              <TouchableOpacity
                style={styles.durationButton}
                onPress={() => setTempWorkDuration(Math.max(1, tempWorkDuration - 1))}
              >
                <Ionicons name="remove" size={24} color="#666" />
              </TouchableOpacity>
              
              <Text style={styles.durationValue}>{tempWorkDuration}</Text>
              
              <TouchableOpacity
                style={styles.durationButton}
                onPress={() => setTempWorkDuration(Math.min(60, tempWorkDuration + 1))}
              >
                <Ionicons name="add" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.durationContainer}>
            <Text style={styles.durationLabel}>Break Duration (minutes)</Text>
            <View style={styles.durationSelector}>
              <TouchableOpacity
                style={styles.durationButton}
                onPress={() => setTempBreakDuration(Math.max(1, tempBreakDuration - 1))}
              >
                <Ionicons name="remove" size={24} color="#666" />
              </TouchableOpacity>
              
              <Text style={styles.durationValue}>{tempBreakDuration}</Text>
              
              <TouchableOpacity
                style={styles.durationButton}
                onPress={() => setTempBreakDuration(Math.min(60, tempBreakDuration + 1))}
              >
                <Ionicons name="add" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => {
                setTempWorkDuration(workDuration);
                setTempBreakDuration(breakDuration);
                setIsCustomModalVisible(false);
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleCustomizeSave}
            >
              <LinearGradient
                colors={['#4ECDC4', '#44A08D']}
                style={styles.modalSaveGradient}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  customizeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  modeButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  activeModeButton: {
    backgroundColor: 'white',
  },
  modeText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  activeModeText: {
    color: '#333',
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 5,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 40,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  resetButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  modal: {
    justifyContent: 'center',
    margin: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  durationContainer: {
    marginBottom: 25,
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  durationSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 30,
    minWidth: 50,
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 15,
    marginRight: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modalSaveButton: {
    flex: 1,
    marginLeft: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalSaveGradient: {
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

export default PomodoroTimer;