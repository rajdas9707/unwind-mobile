import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Animated,
  ImageBackground,
  Modal,
  Image,
} from "react-native";
import { Audio } from "expo-av";
import { AntDesign, FontAwesome5 } from "@expo/vector-icons";
// import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useDatabase } from "../context/DatabaseProvider";

export default function MeditationScreen() {
  const [timeLeft, setTimeLeft] = useState(300); // Default 5 mins
  const [isRunning, setIsRunning] = useState(false);
  const [streak, setStreak] = useState(0);
  const [sound, setSound] = useState(null);
  const [mood, setMood] = useState("Calm"); // Single state for mood and theme
  const [selectedSound, setSelectedSound] = useState("Calm"); // Default sound
  const [isTrackPlaying, setIsTrackPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [breathingPhase, setBreathingPhase] = useState("Inhale");
  const [breatheAnim] = useState(new Animated.Value(0));

  const [customTime, setCustomTime] = useState("5"); // Time input in minutes
  const [isMuted, setIsMuted] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState("");
  const [tracks, setTracks] = useState([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [errorTracks, setErrorTracks] = useState(null);
  const feelings = [
    "Calm",
    "Happy",
    "Grateful",
    "Relaxed",
    "Focused",
    "Energized",
    "Neutral",
  ];
  const { getDb } = useDatabase();
  const THEMES = {
    Day: { bg: "#e6f0ff", fg: "#0f172a", accent: "#2563eb", soft: "#c7d2fe" },
    Night: { bg: "#0b1220", fg: "#e5e7eb", accent: "#60a5fa", soft: "#1f2a44" },
  };
  const [themeMode, setThemeMode] = useState("Night");
  const theme = THEMES[themeMode];
  const isDay = themeMode === "Day";
  const scrollBg = isDay ? "transparent" : "rgba(0,0,0,0.25)";
  const chipBg = isDay ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.12)";
  const controlBg = isDay ? "rgba(15,23,42,0.08)" : "rgba(255,255,255,0.08)";
  const cardBg = isDay ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.06)";
  const borderColor = isDay ? "rgba(15,23,42,0.2)" : "rgba(255,255,255,0.12)";
  const inputBg = isDay ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.08)";

  // Create meditation_sessions table if not exists
  useEffect(() => {
    const initTable = async () => {
      try {
        const db = await getDb();
        const createSQL = `CREATE TABLE IF NOT EXISTS meditation_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT NOT NULL,
          mood TEXT,
          feeling TEXT,
          notes TEXT,
          duration_seconds INTEGER
        );`;
        await db.execAsync(createSQL);
      } catch (error) {
        console.error("Failed to create meditation_sessions table:", error);
      }
    };
    initTable();
  }, [getDb]);

  // Fetch tracks from SoundCloud API
  // useEffect(() => {
  //   const fetchTracks = async () => {
  //     setLoadingTracks(true);
  //     setErrorTracks(null);
  //     try {
  //       const clientId = process.env.EXPO_PUBLIC_SOUNDCLOUD_CLIENT_ID;
  //       const baseUrl = process.env.EXPO_PUBLIC_MUSIC_API_BASE_URL;

  //       if (!clientId || clientId === 'your_soundcloud_client_id_here') {
  //         throw new Error('SoundCloud client ID not configured. Please set EXPO_PUBLIC_SOUNDCLOUD_CLIENT_ID in your .env file');
  //       }

  //       // Search for meditation/ambient tracks on SoundCloud
  //       const response = await fetch(
  //         `${baseUrl}/tracks?client_id=${clientId}&q=meditation%20ambient&limit=10&streamable=true`
  //       );

  //       if (!response.ok) {
  //         throw new Error(`Failed to fetch tracks: ${response.status} ${response.statusText}`);
  //       }

  //       const data = await response.json();
  //       // Map SoundCloud track data to expected format
  //       const formattedTracks = data.map(track => ({
  //         id: track.id,
  //         title: track.title || 'Untitled Track',
  //         user: track.user?.username || 'Unknown Artist',
  //         duration: track.duration || 0,
  //         stream_url: track.stream_url ? `${track.stream_url}?client_id=${clientId}` : null,
  //         artwork_url: track.artwork_url || null
  //       }));
  //       setTracks(formattedTracks);
  //     } catch (error) {
  //       setErrorTracks(error.message);
  //       console.error("Failed to fetch tracks:", error);
  //     } finally {
  //       setLoadingTracks(false);
  //     }
  //   };

  //   fetchTracks();
  // }, []);

  const toggleMute = async () => {
    setIsMuted((prev) => !prev);
    try {
      if (sound) {
        await sound.setIsMutedAsync(!isMuted);
      } else {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      }
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  };

  const resetTimer = async () => {
    setIsRunning(false);
    setTimeLeft(parseInt(customTime) * 60 || 300);
    // Don't stop the track when resetting timer
  };

  // Mood-based sounds, themes, and background images
  const moods = ["Calm", "Energized", "Relaxed", "Focused"];
  const moodSounds = {
    Calm: require("../assets/rain.mp3"),
    Energized: require("../assets/rain.mp3"),
    Relaxed: require("../assets/rain.mp3"),
    Focused: require("../assets/rain.mp3"),
  };
  const moodThemes = {
    Calm: {
      backgroundColor: "#0F1E17",
      backgroundImage: require("../assets/calm-bg.jpeg"),
      accent: "#4CAF50",
    },
    Energized: {
      backgroundColor: "#241A00",
      backgroundImage: require("../assets/energized-bg.jpeg"),
      accent: "#FFC107",
    },
    Relaxed: {
      backgroundColor: "#0B1A2B",
      backgroundImage: require("../assets/calm-bg.jpeg"),
      accent: "#2196F3",
    },
    Focused: {
      backgroundColor: "#1A0E1F",
      backgroundImage: require("../assets/energized-bg.jpeg"),
      accent: "#9C27B0",
    },
  };

  // Load streak on mount
  // useEffect(() => {
  //   const loadStreak = async () => {
  //     const saved = await AsyncStorage.getItem("meditationStreak");
  //     const lastCompleted = await AsyncStorage.getItem("lastMeditation");
  //     const today = new Date().toDateString();
  //     if (saved && lastCompleted !== today) {
  //       setStreak(parseInt(saved));
  //     } else if (!saved) {
  //       setStreak(0);
  //       await AsyncStorage.setItem("meditationStreak", "0");
  //     }
  //   };
  //   loadStreak();
  // }, []);

  // Timer logic
  useEffect(() => {
    let timer;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) {
            clearInterval(timer);
            setIsRunning(false);
            if (sound) sound.stopAsync();
            setCompletionModalVisible(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    // Cleanup function to clear the interval when component unmounts or dependencies change
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, sound]);

  // Breathing animation
  useEffect(() => {
    if (isRunning) {
      const breatheCycle = Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(breatheAnim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ]);

      Animated.loop(breatheCycle).start();
    } else {
      breatheAnim.stopAnimation();
      breatheAnim.setValue(0);
    }
  }, [isRunning, breatheAnim]);

  // Inhale/Exhale text toggle at specific intervals
  useEffect(() => {
    const inhaleMs = 4000;
    const exhaleMs = 6000;
    let timeouts = [];

    const startCycle = () => {
      setBreathingPhase("Inhale");
      timeouts.push(
        setTimeout(() => {
          setBreathingPhase("Exhale");
        }, inhaleMs)
      );
      timeouts.push(
        setTimeout(() => {
          startCycle();
        }, inhaleMs + exhaleMs)
      );
    };

    if (isRunning) {
      startCycle();
    } else {
      setBreathingPhase("Inhale");
    }

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [isRunning]);

  // Play sound based on selected mood
  const playSound = async (moodKey) => {
    try {
      // Unload previous sound if it exists
      if (sound) {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded) {
            await sound.unloadAsync();
          }
        } catch (unloadError) {
          console.log("Error unloading previous sound:", unloadError);
          setSound(null);
        }
      }

      // Load and play the new sound
      const soundSource = moodSounds[moodKey];
      if (!soundSource) {
        throw new Error(`Sound not found for mood: ${moodKey}`);
      }

      // Create and load the sound with looping enabled
      const { sound: newSound } = await Audio.Sound.createAsync(soundSource, {
        shouldPlay: true,
        isLooping: true,
      });

      // Set the sound state
      setSound(newSound);

      // Apply mute setting if needed
      if (isMuted) {
        await newSound.setIsMutedAsync(true);
      }

      setSelectedSound(moodKey);
    } catch (error) {
      console.error("Error playing sound:", error);
      setIsTrackPlaying(false);
      setCurrentTrack(null);
      alert("Unable to play sound. Please try again.");
    }
  };

  // Cleanup audio
  useEffect(() => {
    return sound ? () => sound.unloadAsync() : undefined;
  }, [sound]);

  // Complete meditation and update streak
  const completeMeditation = async () => {
    const today = new Date().toDateString();
    // const lastCompleted = await AsyncStorage.getItem("lastMeditation");
    if (lastCompleted !== today) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      // await AsyncStorage.setItem("meditationStreak", newStreak.toString());
      // await AsyncStorage.setItem("lastMeditation", today);
    }
    // await AsyncStorage.setItem("sessionNotes", sessionNotes);
    setCompletionModalVisible(false);
    setTimeLeft(parseInt(customTime) * 60 || 300);
    setIsRunning(false);
    if (sound) await sound.stopAsync();

    // Save session to SQLite
    try {
      const db = await getDb();
      const createdAt = new Date().toISOString();
      const duration = parseInt(customTime) * 60 || 300;
      const sql = `INSERT INTO meditation_sessions (created_at, mood, feeling, notes, duration_seconds) VALUES (?, ?, ?, ?, ?)`;
      const params = [createdAt, mood, selectedFeeling, sessionNotes, duration];
      await db.runAsync(sql, params);
    } catch (error) {
      console.error("Failed to save meditation session:", error);
    }

    // Fallback: also persist to AsyncStorage list for History
    try {
      const createdAt = new Date().toISOString();
      const duration = parseInt(customTime) * 60 || 300;
      const fallbackKey = "meditation_sessions_fallback";
      // const existing = await AsyncStorage.getItem(fallbackKey);
      const arr = existing ? JSON.parse(existing) : [];
      arr.unshift({
        id: Date.now(),
        created_at: createdAt,
        mood,
        feeling: selectedFeeling,
        notes: sessionNotes,
        duration_seconds: duration,
      });
      // await AsyncStorage.setItem(fallbackKey, JSON.stringify(arr));
    } catch (error) {
      console.error("Failed to save session to AsyncStorage:", error);
    }
  };

  // Set custom time with validation
  const setTime = () => {
    const minutes = parseInt(customTime);
    if (minutes > 0 && minutes <= 60) {
      setTimeLeft(minutes * 60);
      setIsRunning(false);
      if (sound) sound.stopAsync();
    } else {
      console.warn("Invalid time: must be between 1 and 60 minutes");
    }
  };

  // Circular Progress for Timer
  const CircularProgress = ({
    progress,
    size,
    strokeWidth,
    color,
    backgroundColor,
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - progress * circumference;

    return (
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Path
          d={`M ${size / 2} ${size / 2 - radius} A ${radius} ${radius} 0 ${
            progress > 0.5 ? 1 : 0
          } 1 ${size / 2 + radius * Math.sin(2 * Math.PI * progress)} ${
            size / 2 - radius * Math.cos(2 * Math.PI * progress)
          }`}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
        <Text
          style={[
            styles.timerText,
            {
              position: "absolute",
              top: size / 2 - 24,
              left: 0,
              right: 0,
              textAlign: "center",
              color: theme.fg,
            },
          ]}
        >
          {Math.floor(timeLeft / 60)}:
          {(timeLeft % 60).toString().padStart(2, "0")}
        </Text>
      </Svg>
    );
  };

  // Circular timer with image background masked inside the circle
  const CircularImageTimer = ({
    progress,
    size,
    strokeWidth,
    color,
    backgroundColor,
    imageSource,
  }) => {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#111",
        }}
      >
        <ImageBackground
          source={imageSource}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
        />
        <View style={{ position: "absolute", top: 0, left: 0 }}>
          <CircularProgress
            progress={progress}
            size={size}
            strokeWidth={strokeWidth}
            color={color}
            backgroundColor={backgroundColor}
          />
        </View>
      </View>
    );
  };

  const progress =
    timeLeft > 0 ? 1 - timeLeft / (parseInt(customTime) * 60 || 300) : 1;

  return (
    <LinearGradient
      colors={[theme.bg, theme.soft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <View style={styles.headerContainer}>
        {/* Punchline */}
        <Text style={[styles.punchline, { color: theme.fg }]}>
          Pause. Reset. Start.
        </Text>

        {/* Streak Display */}
        <View style={styles.streakContainer}>
          <Text style={[styles.streakText, { color: theme.fg }]}>
            🔥 Streak: {streak} Days
          </Text>
        </View>
      </View>

      {/* Professional Timer */}
      <View style={styles.timerContainer}>
        <View style={styles.timerShadow}>
          <CircularImageTimer
            progress={progress}
            size={220}
            strokeWidth={8}
            color={moodThemes[mood].accent}
            backgroundColor={
              isDay ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.2)"
            }
            imageSource={moodThemes[mood].backgroundImage}
          />
          <View style={styles.breathingContainer}>
            <View
              style={[
                styles.buttonOuter,
                {
                  borderColor: moodThemes[mood].accent,
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.breathingPlayButton]}
                onPress={() => {
                  try {
                    setIsRunning(!isRunning);
                  } catch (error) {
                    console.error("Error toggling timer:", error);
                    setIsRunning(false);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={isRunning ? "Stop timer" : "Start timer"}
                accessibilityState={{ checked: isRunning }}
              >
                <AntDesign
                  name={isRunning ? "pause" : "play"}
                  size={28}
                  color={isRunning ? "#fff" : moodThemes[mood].accent}
                  // style={{ marginLeft: isRunning ? 0 : 3 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Elegant Timer Control Button */}

      {/* Time Input */}
      <View style={styles.timeInputContainer}>
        <View
          style={[styles.timeCard, { backgroundColor: cardBg, borderColor }]}
        >
          <Text style={[styles.timeLabel, { color: theme.fg }]}>
            Duration (min)
          </Text>
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={[styles.timeButton, { backgroundColor: theme.accent }]}
              onPress={() => {
                const newTime = Math.max(1, parseInt(customTime || "5") - 1);
                setCustomTime(newTime.toString());
              }}
              accessibilityRole="button"
              accessibilityLabel="Decrease time by 1 minute"
            >
              <Text style={[styles.timeButtonText, { color: "#fff" }]}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={[
                styles.timeInput,
                {
                  backgroundColor: inputBg,
                  borderColor,
                  borderWidth: 1,
                  color: theme.fg,
                },
              ]}
              keyboardType="numeric"
              value={customTime}
              onChangeText={setCustomTime}
              placeholder="5"
              placeholderTextColor={themeMode === "Night" ? "#889" : "#445"}
            />
            <TouchableOpacity
              style={[styles.timeButton, { backgroundColor: theme.accent }]}
              onPress={() => {
                const newTime = Math.min(60, parseInt(customTime || "5") + 1);
                setCustomTime(newTime.toString());
              }}
              accessibilityRole="button"
              accessibilityLabel="Increase time by 1 minute"
            >
              <Text style={[styles.timeButtonText, { color: "#fff" }]}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.setTimeBtn, { backgroundColor: theme.accent }]}
              onPress={setTime}
              accessibilityRole="button"
              accessibilityLabel="Apply custom time"
            >
              <Text style={[styles.setTimeText, { color: "#fff" }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Controls: Mute, Reset, and Theme Toggle */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: controlBg, borderColor },
            isMuted && { borderColor: moodThemes[mood].accent },
          ]}
          onPress={toggleMute}
          accessibilityRole="button"
          accessibilityLabel={isMuted ? "Unmute sound" : "Mute sound"}
          accessibilityState={{ checked: isMuted }}
        >
          <AntDesign
            name={isMuted ? "sound" : "sound"}
            size={18}
            color={theme.fg}
          />
          <Text style={[styles.controlText, { color: theme.fg }]}>
            {isMuted ? "Unmute" : "Mute"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: controlBg, borderColor },
          ]}
          onPress={resetTimer}
          accessibilityRole="button"
          accessibilityLabel="Reset timer"
        >
          <AntDesign name="reload1" size={18} color={theme.fg} />
          <Text style={[styles.controlText, { color: theme.fg }]}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: controlBg, borderColor },
          ]}
          onPress={() => setThemeMode(themeMode === "Night" ? "Day" : "Night")}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${
            themeMode === "Night" ? "Day" : "Night"
          } mode`}
        >
          <AntDesign name="bulb1" size={18} color={theme.fg} />
          <Text style={[styles.controlText, { color: theme.fg }]}>
            {themeMode === "Night" ? "Day" : "Night"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Play/Pause Button moved to breathing container */}

      <View style={styles.scrollsContainer}>
        {/* Mood Selection Scroll */}
        <ScrollView
          horizontal
          style={styles.moodScroll}
          contentContainerStyle={styles.moodScrollContent}
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
        >
          {moods.map((m) => (
            <TouchableOpacity
              key={m}
              activeOpacity={0.8}
              style={[
                styles.moodItem,
                { backgroundColor: chipBg, borderColor },
                mood === m && {
                  borderColor: moodThemes[mood].accent,
                  backgroundColor: chipBg,
                },
              ]}
              onPress={() => {
                setMood(m);
                if (isTrackPlaying) playSound(m);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Select ${m} mood`}
              accessibilityState={{ selected: mood === m }}
            >
              <Text style={[styles.moodText, { color: theme.fg }]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <ScrollView
        style={[styles.tracksScroll, { backgroundColor: scrollBg }]}
        contentContainerStyle={styles.tracksScrollContent}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
      >
        {/* {offline collection} */}
        <View style={styles.tracksContainer}>
          <Text style={[styles.tracksTitle, { color: theme.fg }]}>
            🎵 Offline Collection
          </Text>
          <ScrollView
            horizontal
            style={[styles.tracksScroll, { backgroundColor: scrollBg }]}
            contentContainerStyle={styles.tracksScrollContent}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
          >
            {[
              {
                id: 1,
                title: "Calm Waters",
                artist: "Nature Sounds",
                mood: "Calm",
                duration: "8:30",
              },
              {
                id: 2,
                title: "Forest Meditation",
                artist: "Zen Master",
                mood: "Relaxed",
                duration: "12:15",
              },
              {
                id: 3,
                title: "Mountain Peace",
                artist: "Mindfulness",
                mood: "Focused",
                duration: "6:45",
              },
              {
                id: 4,
                title: "Ocean Waves",
                artist: "Deep Relax",
                mood: "Calm",
                duration: "10:20",
              },
              {
                id: 5,
                title: "Energy Flow",
                artist: "Cosmic Sounds",
                mood: "Energized",
                duration: "9:10",
              },
            ].map((poster) => (
              <TouchableOpacity
                key={poster.id}
                activeOpacity={0.9}
                style={[
                  styles.posterItem,
                  {
                    backgroundColor: chipBg,
                    borderColor: isDay
                      ? "rgba(0,0,0,0.1)"
                      : "rgba(255,255,255,0.15)",
                    shadowColor: isDay ? "#000" : "#fff",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDay ? 0.15 : 0.1,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Play track: ${poster.title} by ${poster.artist}`}
              >
                <View
                  style={[
                    styles.posterImageContainer,
                    {
                      backgroundColor: moodThemes[poster.mood].backgroundColor,
                    },
                  ]}
                >
                  <Image
                    source={moodThemes[poster.mood].backgroundImage}
                    style={styles.posterImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.7)"]}
                    style={styles.posterGradient}
                  />
                  <View style={styles.posterDuration}>
                    <Text style={styles.posterDurationText}>
                      {poster.duration}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.posterPlayButton,
                      {
                        backgroundColor:
                          isTrackPlaying && currentTrack === poster.id
                            ? "rgba(255,255,255,0.9)"
                            : moodThemes[poster.mood].accent,
                        shadowColor: moodThemes[poster.mood].accent,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        elevation: 4,
                      },
                    ]}
                    onPress={() => {
                      try {
                        if (isTrackPlaying && currentTrack === poster.id) {
                          // Stop current track
                          if (sound) {
                            sound.pauseAsync();
                          }
                          setIsTrackPlaying(false);
                          setCurrentTrack(null);
                        } else {
                          // Start new track
                          setMood(poster.mood);
                          setCurrentTrack(poster.id);
                          setIsTrackPlaying(true);
                          playSound(poster.mood);
                        }
                      } catch (error) {
                        console.error("Error toggling track:", error);
                        setIsTrackPlaying(false);
                        setCurrentTrack(null);
                      }
                    }}
                  >
                    <AntDesign
                      name={
                        isTrackPlaying && currentTrack === poster.id
                          ? "pause"
                          : "play"
                      }
                      size={14}
                      color={
                        isTrackPlaying && currentTrack === poster.id
                          ? moodThemes[poster.mood].accent
                          : "white"
                      }
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.posterInfo}>
                  <Text
                    style={[styles.posterTitle, { color: theme.fg }]}
                    numberOfLines={1}
                  >
                    {poster.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Meditation Posters with Play/Pause Buttons */}
        <View style={styles.tracksContainer}>
          <Text style={[styles.tracksTitle, { color: theme.fg }]}>
            🎵 Meditation Collection
          </Text>
          <ScrollView
            horizontal
            style={[styles.tracksScroll, { backgroundColor: scrollBg }]}
            contentContainerStyle={styles.tracksScrollContent}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
          >
            {[
              {
                id: 1,
                title: "Calm Waters",
                artist: "Nature Sounds",
                mood: "Calm",
                duration: "8:30",
              },
              {
                id: 2,
                title: "Forest Meditation",
                artist: "Zen Master",
                mood: "Relaxed",
                duration: "12:15",
              },
              {
                id: 3,
                title: "Mountain Peace",
                artist: "Mindfulness",
                mood: "Focused",
                duration: "6:45",
              },
              {
                id: 4,
                title: "Ocean Waves",
                artist: "Deep Relax",
                mood: "Calm",
                duration: "10:20",
              },
              {
                id: 5,
                title: "Energy Flow",
                artist: "Cosmic Sounds",
                mood: "Energized",
                duration: "9:10",
              },
            ].map((poster) => (
              <TouchableOpacity
                key={poster.id}
                activeOpacity={0.9}
                style={[
                  styles.posterItem,
                  {
                    backgroundColor: chipBg,
                    borderColor: isDay
                      ? "rgba(0,0,0,0.1)"
                      : "rgba(255,255,255,0.15)",
                    shadowColor: isDay ? "#000" : "#fff",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: isDay ? 0.15 : 0.1,
                    shadowRadius: 8,
                    elevation: 6,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Play track: ${poster.title} by ${poster.artist}`}
              >
                <View
                  style={[
                    styles.posterImageContainer,
                    {
                      backgroundColor: moodThemes[poster.mood].backgroundColor,
                    },
                  ]}
                >
                  <Image
                    source={moodThemes[poster.mood].backgroundImage}
                    style={styles.posterImage}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.7)"]}
                    style={styles.posterGradient}
                  />
                  <View style={styles.posterDuration}>
                    <Text style={styles.posterDurationText}>
                      {poster.duration}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.posterPlayButton,
                      {
                        backgroundColor:
                          isTrackPlaying && currentTrack === poster.id
                            ? "rgba(255,255,255,0.9)"
                            : moodThemes[poster.mood].accent,
                        shadowColor: moodThemes[poster.mood].accent,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        elevation: 4,
                      },
                    ]}
                    onPress={() => {
                      try {
                        if (isTrackPlaying && currentTrack === poster.id) {
                          // Stop current track
                          if (sound) {
                            sound.pauseAsync();
                          }
                          setIsTrackPlaying(false);
                          setCurrentTrack(null);
                        } else {
                          // Start new track
                          setMood(poster.mood);
                          setCurrentTrack(poster.id);
                          setIsTrackPlaying(true);
                          playSound(poster.mood);
                        }
                      } catch (error) {
                        console.error("Error toggling track:", error);
                        setIsTrackPlaying(false);
                        setCurrentTrack(null);
                      }
                    }}
                  >
                    <AntDesign
                      name={
                        isTrackPlaying && currentTrack === poster.id
                          ? "pause"
                          : "play"
                      }
                      size={14}
                      color={
                        isTrackPlaying && currentTrack === poster.id
                          ? moodThemes[poster.mood].accent
                          : "white"
                      }
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.posterInfo}>
                  <Text
                    style={[styles.posterTitle, { color: theme.fg }]}
                    numberOfLines={1}
                  >
                    {poster.title}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Completion Modal */}
      <Modal
        visible={completionModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View
          style={[
            styles.completionModal,
            {
              backgroundColor: isDay
                ? "rgba(255,255,255,0.92)"
                : "rgba(15,15,20,0.9)",
              borderRadius: 20,
            },
          ]}
        >
          <Text style={[styles.modalTitle, { color: theme.fg }]}>
            How do you feel?
          </Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 10,
            }}
          >
            {feelings.map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setSelectedFeeling(f)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  margin: 6,
                  borderRadius: 18,
                  backgroundColor:
                    selectedFeeling === f ? moodThemes[mood].accent : chipBg,
                }}
                accessibilityRole="button"
                accessibilityLabel={`Select ${f} feeling`}
                accessibilityState={{ selected: selectedFeeling === f }}
              >
                <Text
                  style={{ color: selectedFeeling === f ? "#fff" : theme.fg }}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text
            style={[
              styles.modalTitle,
              { color: theme.fg, fontSize: 18, marginTop: 12 },
            ]}
          >
            Add a note
          </Text>
          <TextInput
            style={{
              minHeight: 90,
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 12,
              padding: 12,
              marginVertical: 12,
              color: theme.fg,
              backgroundColor: inputBg,
            }}
            multiline
            placeholder="Write a few words about your session..."
            value={sessionNotes}
            onChangeText={setSessionNotes}
            placeholderTextColor={themeMode === "Night" ? "#aaa" : "#555"}
          />
          <TouchableOpacity
            style={[
              styles.completeBtn,
              { backgroundColor: moodThemes[mood].accent, borderRadius: 14 },
            ]}
            onPress={completeMeditation}
            accessibilityRole="button"
            accessibilityLabel="Save reflection and complete meditation"
          >
            <Text style={[styles.completeText, { color: "#fff" }]}>
              Save Reflection
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  breathingPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    // backgroundColor:"red",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  buttonOuter: {
    marginTop: 10,
    width: 50,
    height: 50,
    borderRadius: 35,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  timerShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  timerOverlay: {
    position: "absolute",
    bottom: -30,
    alignSelf: "center",
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 20,
    paddingHorizontal: 12,
  },
  moodScroll: {
    marginBottom: 5,
  },
  moodScrollContent: {
    paddingHorizontal: 12,
    // paddingVertical: 6,
    alignItems: "center",
    // backgroundColor:"red"
  },
  moodItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 6,
    // backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    // elevation: 3,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.15,
    // shadowRadius: 4,
  },
  moodText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  scrollsContainer: {
    width: "100%",
    marginBottom: 8,
  },
  musicScroll: {
    marginTop: 10,
  },
  musicScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  musicItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 6,
    //  backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  musicText: {
    color: "#fff",
    fontSize: 15,
    marginRight: 5,
  },
  streakContainer: {
    marginTop: 4,
    marginBottom: 4,
    alignItems: "center",
  },
  streakText: {
    fontSize: 18,
    color: "#fff",
  },
  timerContainer: {
    marginTop: 5,
    marginBottom: 15,
    alignItems: "center",
    position: "relative",
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
  },
  breathingContainer: {
    marginTop: 10,
    marginBottom: 15,
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  breathingText: {
    fontSize: 20,
    color: "#fff",
  },
  timeInputContainer: {
    flexDirection: "row",
    marginTop: 2,
    marginBottom: 8,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  timeCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    width: "90%",
    maxWidth: 320,
    justifyContent: "center",
    alignItems: "center",
  },
  timeLabel: {
    color: "#bbb",
    marginBottom: 6,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 60,
    textAlign: "center",
  },
  timeButton: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    minWidth: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  timeButtonText: {
    color: "#4A90E2",
    fontSize: 18,
    fontWeight: "bold",
  },
  setTimeBtn: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  setTimeText: {
    color: "#4A90E2",
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  completionModal: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    margin: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  modalInput: {
    borderBottomWidth: 1,
    marginVertical: 20,
    color: "#000",
  },
  headerContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 8,
  },
  punchline: {
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  completeBtn: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  completeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 8,
    gap: 8,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  controlActive: {
    borderColor: "#fff",
  },
  controlText: {
    color: "#fff",
    marginLeft: 6,
  },
  // Track list styles
  tracksContainer: {
    // position: "absolute",
    // top: 580,
    width: "100%",
    // paddingHorizontal: 20,
  },
  tracksTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  tracksText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
  },
  errorContainer: {
    alignItems: "center",
    marginTop: 10,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
  },
  errorSubtext: {
    fontSize: 12,
    textAlign: "center",
  },
  tracksScroll: {
    height: 140,
    borderRadius: 12,
  },
  tracksScrollContent: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  trackItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginHorizontal: 8,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  trackImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  trackImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  trackInfo: {
    marginTop: 5,
    alignItems: "center",
  },
  trackTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  trackArtist: {
    fontSize: 10,
    textAlign: "center",
    opacity: 0.8,
  },
  // Poster styles
  posterItem: {
    width: 100,
    height: 120,
    borderRadius: 12,
    marginHorizontal: 6,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  posterImageContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  posterImage: {
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },
  posterGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  posterDuration: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  posterDurationText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  posterInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    height: 70,
  },
  posterTitle: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  posterArtist: {
    fontSize: 10,
    textAlign: "center",
    marginBottom: 4,
  },
  moodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "center",
  },
  moodBadgeText: {
    color: "white",
    fontSize: 8,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  posterPlayButton: {
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
});
