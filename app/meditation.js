import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
  Pressable,
  Platform,
  TextInput,
} from "react-native";
import { Audio } from "expo-av";
import { MaterialIcons } from "@expo/vector-icons";
import Svg, { Circle, G, Defs, RadialGradient, Stop } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolateColor,
  useAnimatedProps,
  interpolate,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function MeditationScreen() {
  // Core states
  const [timeLeft, setTimeLeft] = useState(300); // Default 5 mins
  const [totalTime, setTotalTime] = useState(300); // For progress calculation
  const [isRunning, setIsRunning] = useState(false);
  const [sound, setSound] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(5); // Custom time input

  // Theme and mood states
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [selectedMood, setSelectedMood] = useState("Relax");

  // Timer animation
  const progress = useSharedValue(0);
  const breatheScale = useSharedValue(1);
  const themeTransition = useSharedValue(isDarkTheme ? 1 : 0);

  // Audio reference
  const soundRef = useRef(null);

  // Mood configurations
  const moods = [
    {
      id: "relax",
      name: "Relax",
      icon: "self-improvement",
      color: "#4A90E2",
      sound: require("../assets/relax-sound.mp3"),
      image: require("../assets/relax-bg.jpeg"),
    },
    {
      id: "focus",
      name: "Focus",
      icon: "lightbulb-outline",
      color: "#9C27B0",
      sound: require("../assets/focus-sound.mp3"),
      image: require("../assets/focus-bg.jpeg"),
    },
    {
      id: "sleep",
      name: "Sleep",
      icon: "nights-stay",
      color: "#2E7D32",
      sound: require("../assets/sleep-sound.mp3"),
      image: require("../assets/sleep-bg.jpeg"),
    },
    {
      id: "energy",
      name: "Energy",
      icon: "bolt",
      color: "#FF9800",
      sound: require("../assets/energy-sound.mp3"),
      image: require("../assets/energy-bg.jpeg"),
    },
  ];

  // Find current mood object
  const currentMood = moods.find((m) => m.name === selectedMood) || moods[0];

  // Theme colors
  const theme = {
    light: {
      background: ["#ffffff", "#f0f8ff"],
      text: "#2d3748",
      subText: "#718096",
      card: "rgba(255, 255, 255, 0.8)",
      cardBorder: "rgba(0, 0, 0, 0.1)",
      shadow: "rgba(0, 0, 0, 0.1)",
    },
    dark: {
      background: ["#1A202C", "#2D3748"],
      text: "#f7fafc",
      subText: "#cbd5e0",
      card: "rgba(26, 32, 44, 0.8)",
      cardBorder: "rgba(255, 255, 255, 0.1)",
      shadow: "rgba(0, 0, 0, 0.3)",
    },
  };

  // Get current theme
  const currentTheme = isDarkTheme ? theme.dark : theme.light;

  // Animated background gradient
  const backgroundStyle = useAnimatedStyle(() => {
    const lightColors = ["#ffffff", "#f0f8ff"];
    const darkColors = ["#1A202C", "#2D3748"];

    return {
      colors: [
        interpolateColor(
          themeTransition.value,
          [0, 1],
          [lightColors[0], darkColors[0]]
        ),
        interpolateColor(
          themeTransition.value,
          [0, 1],
          [lightColors[1], darkColors[1]]
        ),
      ],
    };
  });

  // Timer setup function
  const setTimerDuration = (minutes) => {
    const seconds = minutes * 60;
    setTimeLeft(seconds);
    setTotalTime(seconds);
    setCustomMinutes(minutes);
    progress.value = withTiming(0, { duration: 300 });

    if (isRunning) {
      setIsRunning(false);
      if (sound) {
        sound.pauseAsync();
      }
    }
  };

  // Increment/Decrement time functions
  const incrementTime = () => {
    const newMinutes = Math.min(60, customMinutes + 1);
    setTimerDuration(newMinutes);
  };

  const decrementTime = () => {
    const newMinutes = Math.max(1, customMinutes - 1);
    setTimerDuration(newMinutes);
  };

  const handleCustomTimeChange = (text) => {
    const minutes = parseInt(text) || 1;
    const validMinutes = Math.max(1, Math.min(60, minutes));
    setCustomMinutes(validMinutes);
  };

  const applyCustomTime = () => {
    setTimerDuration(customMinutes);
  };

  // Toggle theme with animation
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    themeTransition.value = withTiming(isDarkTheme ? 0 : 1, {
      duration: 500,
      easing: Easing.inOut(Easing.ease),
    });
  };

  // Change mood and sound
  const changeMood = async (mood) => {
    setSelectedMood(mood.name);

    // Always reload sound when mood changes, regardless of timer state
    if (sound) {
      await sound.unloadAsync();
      setSound(null);
    }

    if (isRunning) {
      await playMoodSound(mood);
    }
  };

  // Play sound based on selected mood
  const playMoodSound = async (mood) => {
    try {
      // Unload previous sound if it exists
      if (sound) {
        await sound.unloadAsync();
      }

      // Create and load the new sound with looping enabled
      const { sound: newSound } = await Audio.Sound.createAsync(mood.sound, {
        shouldPlay: true,
        isLooping: true,
        volume: isMuted ? 0 : 1,
      });

      setSound(newSound);
      soundRef.current = newSound;
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  // Toggle mute/unmute
  const toggleMute = async () => {
    setIsMuted(!isMuted);
    if (sound) {
      await sound.setVolumeAsync(isMuted ? 1 : 0);
    }
  };

  // Start/Pause timer
  const toggleTimer = async () => {
    if (!isRunning) {
      // Starting timer
      setIsRunning(true);
      if (!sound) {
        await playMoodSound(currentMood);
      } else {
        await sound.playAsync();
      }
    } else {
      // Pausing timer
      setIsRunning(false);
      if (sound) {
        await sound.pauseAsync();
      }
    }
  };

  // Reset timer
  const resetTimer = async () => {
    setIsRunning(false);
    setTimeLeft(totalTime);
    progress.value = withTiming(0, { duration: 300 });
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
  };

  // Timer logic
  useEffect(() => {
    let timer;

    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsRunning(false);
            progress.value = withTiming(1, { duration: 300 });
            return 0;
          }
          progress.value = withTiming(1 - (prev - 1) / totalTime, {
            duration: 300,
          });
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft, totalTime]);

  // Breathing animation
  useEffect(() => {
    if (isRunning) {
      breatheScale.value = withRepeat(
        withSequence(
          withTiming(1.2, {
            duration: 4000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // infinite repeat
        false // no reverse
      );
    } else {
      breatheScale.value = withTiming(1, { duration: 500 });
    }
  }, [isRunning]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Update theme transition when theme changes
  useEffect(() => {
    themeTransition.value = withTiming(isDarkTheme ? 1 : 0, {
      duration: 500,
      easing: Easing.inOut(Easing.ease),
    });
  }, [isDarkTheme]);

  // Animated properties for the timer circle
  const circleProps = useAnimatedProps(() => {
    const circumference = 2 * Math.PI * 120;
    return {
      strokeDashoffset: circumference * (1 - progress.value),
      strokeDasharray: circumference,
    };
  });

  // Animated style for breathing effect
  const breatheStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: breatheScale.value }],
      opacity: isRunning
        ? withTiming(1, { duration: 500 })
        : withTiming(0.7, { duration: 500 }),
    };
  });

  // Format time for display
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Main renderer
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDarkTheme ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

      {/* Mood-based Background */}
      <View style={styles.backgroundContainer}>
        <Image
          source={currentMood.image}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <LinearGradient
          style={styles.backgroundOverlay}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          colors={[
            isDarkTheme
              ? ["rgba(26, 32, 44, 0.85)", "rgba(45, 55, 72, 0.9)"]
              : ["rgba(255, 255, 255, 0.8)", "rgba(240, 248, 255, 0.85)"],
          ].flat()}
        />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Timer Section */}
        <View style={styles.timerSection}>
          {/* Circular Timer */}
          <View style={styles.timerContainer}>
            <Animated.View style={[styles.breatheCircle, breatheStyle]}>
              <Image
                source={currentMood.image}
                style={styles.moodBackground}
                resizeMode="cover"
              />
            </Animated.View>

            <Svg width={280} height={280} style={styles.timerSvg}>
              <Defs>
                <RadialGradient id="timerGradient" cx="50%" cy="50%" r="50%">
                  <Stop
                    offset="0%"
                    stopColor={currentMood.color}
                    stopOpacity="0.3"
                  />
                  <Stop
                    offset="100%"
                    stopColor={currentMood.color}
                    stopOpacity="0.1"
                  />
                </RadialGradient>
              </Defs>
              <G rotation="-90" origin="140, 140">
                {/* Background circle with gradient */}
                <Circle cx="140" cy="140" r="120" fill="url(#timerGradient)" />
                {/* Track circle */}
                <Circle
                  cx="140"
                  cy="140"
                  r="120"
                  stroke={
                    isDarkTheme ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"
                  }
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress circle */}
                <AnimatedCircle
                  cx="140"
                  cy="140"
                  r="120"
                  stroke={currentMood.color}
                  strokeWidth="8"
                  fill="transparent"
                  strokeLinecap="round"
                  animatedProps={circleProps}
                />
              </G>
            </Svg>

            {/* Timer Text */}
            <View style={styles.timerTextContainer}>
              <Text style={[styles.timerText, { color: currentTheme.text }]}>
                {formatTime(timeLeft)}
              </Text>
            </View>

            {/* Play/Pause Button */}
            <TouchableOpacity
              style={[
                styles.playButton,
                { backgroundColor: currentMood.color },
              ]}
              onPress={toggleTimer}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[currentMood.color, currentMood.color + "DD"]}
                style={styles.playButtonGradient}
              >
                <MaterialIcons
                  name={isRunning ? "pause" : "play-arrow"}
                  size={36}
                  color="#FFFFFF"
                  style={!isRunning ? { marginLeft: 4 } : {}}
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Timer Controls */}
          <View style={styles.timerControls}>
            <Pressable
              style={styles.resetButton}
              onPress={resetTimer}
              android_ripple={{ color: "rgba(0,0,0,0.1)", radius: 20 }}
            >
              <MaterialIcons
                name="refresh"
                size={24}
                color={currentTheme.subText}
              />
            </Pressable>
          </View>
        </View>

        {/* Duration Selection */}
        <View
          style={[
            styles.durationCard,
            {
              backgroundColor: currentTheme.card,
              borderColor: currentTheme.cardBorder,
            },
          ]}
        >
          <Text style={[styles.durationTitle, { color: currentTheme.text }]}>
            Duration
          </Text>

          {/* Quick Duration Options */}
          <View style={styles.durationOptions}>
            {[5, 10, 15, 20].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.durationButton,
                  totalTime === minutes * 60 && {
                    borderColor: currentMood.color,
                    borderWidth: 2,
                    backgroundColor: currentMood.color + "20",
                  },
                  {
                    backgroundColor: isDarkTheme
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                  },
                ]}
                onPress={() => setTimerDuration(minutes)}
              >
                <Text
                  style={[
                    styles.durationButtonText,
                    totalTime === minutes * 60 && {
                      color: currentMood.color,
                      fontWeight: "bold",
                    },
                    { color: currentTheme.text },
                  ]}
                >
                  {minutes}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Time Input */}
          <View style={styles.customTimeContainer}>
            <View style={styles.customTimeRow}>
              <TouchableOpacity
                style={[
                  styles.timeControlButton,
                  { borderColor: currentTheme.cardBorder },
                ]}
                onPress={decrementTime}
              >
                <MaterialIcons
                  name="remove"
                  size={20}
                  color={currentTheme.text}
                />
              </TouchableOpacity>

              <View style={styles.customTimeInputContainer}>
                <TextInput
                  style={[
                    styles.customTimeInput,
                    {
                      backgroundColor: isDarkTheme
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                      borderColor: currentTheme.cardBorder,
                      color: currentTheme.text,
                    },
                  ]}
                  value={customMinutes.toString()}
                  onChangeText={handleCustomTimeChange}
                  onSubmitEditing={applyCustomTime}
                  keyboardType="numeric"
                  maxLength={2}
                  textAlign="center"
                />
                {/* <Text
                  style={[styles.minutesLabel, { color: currentTheme.subText }]}
                >
                  min
                </Text> */}
              </View>

              <TouchableOpacity
                style={[
                  styles.timeControlButton,
                  { borderColor: currentTheme.cardBorder },
                ]}
                onPress={incrementTime}
              >
                <MaterialIcons name="add" size={20} color={currentTheme.text} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Mood Selection */}
        <View style={styles.moodSection}>
          <Text style={[styles.sectionTitle, { color: currentTheme.text }]}>
            Select Mood
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodScrollContent}
            style={styles.moodScroll}
          >
            {moods.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodItem,
                  selectedMood === mood.name && styles.selectedMoodItem,
                  {
                    backgroundColor: isDarkTheme
                      ? "rgba(255,255,255,0.15)"
                      : "rgba(255,255,255,0.8)",
                    borderColor:
                      selectedMood === mood.name
                        ? mood.color
                        : "rgba(255,255,255,0.3)",
                  },
                ]}
                onPress={() => changeMood(mood)}
              >
                <View
                  style={[styles.moodIcon, { backgroundColor: mood.color }]}
                >
                  <MaterialIcons name={mood.icon} size={24} color="#FFF" />
                </View>
                <Text style={[styles.moodText, { color: currentTheme.text }]}>
                  {mood.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Footer Controls */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.footerButton,
              {
                backgroundColor: isDarkTheme
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.9)",
                borderColor: isMuted
                  ? currentMood.color
                  : "rgba(255,255,255,0.3)",
                borderWidth: 2,
              },
            ]}
            onPress={toggleMute}
          >
            <MaterialIcons
              name={isMuted ? "volume-off" : "volume-up"}
              size={28}
              color={isMuted ? currentMood.color : currentTheme.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.footerButton,
              {
                backgroundColor: isDarkTheme
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.9)",
                borderColor: "rgba(255,255,255,0.3)",
                borderWidth: 2,
              },
            ]}
            onPress={toggleTheme}
          >
            <MaterialIcons
              name={isDarkTheme ? "light-mode" : "dark-mode"}
              size={28}
              color={currentTheme.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  backgroundContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    // paddingHorizontal: 20,
    // paddingBottom: 20, // Extra space for footer
    zIndex: 1,
    // backgroundColor: "red",
  },
  timerSection: {
    alignItems: "center",
    // gap: 15,
    // marginBottom: 40,
    // backgroundColor: "red",
    // marginTop: 30,
  },
  timerContainer: {
    position: "relative",
    width: 300,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    // marginBottom: 30,
    // backgroundColor: "blue",
  },
  timerSvg: {
    position: "absolute",
    top: 10,
    left: 10,
    // backgroundColor: "yellow",
  },
  breatheCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: "hidden",
    position: "absolute",
    top: 50,
    left: 50,
    zIndex: -1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 12,
    // backgroundColor: "pink",
  },
  moodBackground: {
    width: "100%",
    height: "100%",
  },
  timerTextContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  timerText: {
    fontSize: 28,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  playButton: {
    position: "absolute",
    bottom: 80,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    zIndex: 2,
  },
  playButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  timerControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    // marginTop: 25,
    // marginBottom: 10,
  },
  resetButton: {
    padding: 16,
    borderRadius: 28,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  durationCard: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 20,
    padding: 10,
    marginTop: 10,
    marginBottom: 30,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  durationTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  durationOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 5,
    // paddingHorizontal: 8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  durationButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  customTimeContainer: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    paddingTop: 10,
    // backgroundColor: "pink",
  },

  customTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  timeControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  customTimeInputContainer: {
    alignItems: "center",
    gap: 6,
    // backgroundColor: "blue",
  },
  customTimeInput: {
    width: 64,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  minutesLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  moodSection: {
    // marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  moodScroll: {
    marginBottom: 10,
  },
  moodScrollContent: {
    paddingHorizontal: 2,
    paddingVertical: 5,
  },
  moodItem: {
    padding: 10,
    borderRadius: 10,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderWidth: 2,
    minWidth: 120,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  selectedMoodItem: {
    borderWidth: 3,
    shadowOpacity: 0.25,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  moodIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  moodText: {
    fontSize: 16,
    fontWeight: "700",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 25,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 35 : 25,
    gap: 40,
    zIndex: 2,
  },
  footerButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
