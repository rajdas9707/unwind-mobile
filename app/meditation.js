import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  FlatList,
  Pressable,
  Animated,
  ImageBackground,
  Modal,
} from "react-native";
import { Audio } from "expo-av";
import { AntDesign, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import * as SQLite from "expo-sqlite";

export default function MeditationScreen() {
  const [timeLeft, setTimeLeft] = useState(300); // Default 5 mins
  const [isRunning, setIsRunning] = useState(false);
  const [streak, setStreak] = useState(0);
  const [sound, setSound] = useState(null);
  const [mood, setMood] = useState("Calm"); // Single state for mood and theme
  const [selectedSound, setSelectedSound] = useState("Calm"); // Default sound
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  const [breathingPhase, setBreathingPhase] = useState("Inhale");
  const [breatheAnim] = useState(new Animated.Value(0));
  const [customTime, setCustomTime] = useState("5"); // Time input in minutes
  const [isMuted, setIsMuted] = useState(false);
  const [selectedFeeling, setSelectedFeeling] = useState("");
  const feelings = [
    "Calm",
    "Happy",
    "Grateful",
    "Relaxed",
    "Focused",
    "Energized",
    "Neutral",
  ];
  const [db, setDb] = useState(null);
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

  // SQLite: open DB (async or legacy) and create table
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const opened = SQLite.openDatabaseAsync
          ? await SQLite.openDatabaseAsync("unwind.db")
          : SQLite.openDatabase("unwind.db");
        if (!isMounted) return;
        setDb(opened);
        const createSQL = `CREATE TABLE IF NOT EXISTS meditation_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at TEXT NOT NULL,
          mood TEXT,
          feeling TEXT,
          notes TEXT,
          duration_seconds INTEGER
        );`;
        if (opened.execAsync) {
          await opened.execAsync(createSQL);
        } else {
          opened.transaction((tx) => tx.executeSql(createSQL));
        }
      } catch (_) {}
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleMute = async () => {
    setIsMuted((prev) => !prev);
    try {
      if (sound) {
        await sound.setIsMutedAsync(!isMuted);
      } else {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      }
    } catch (e) {}
  };

  const resetTimer = async () => {
    setIsRunning(false);
    setTimeLeft(parseInt(customTime) * 60 || 300);
    if (sound) {
      try {
        await sound.stopAsync();
      } catch (e) {}
    }
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
  useEffect(() => {
    const loadStreak = async () => {
      const saved = await AsyncStorage.getItem("meditationStreak");
      const lastCompleted = await AsyncStorage.getItem("lastMeditation");
      const today = new Date().toDateString();
      if (saved && lastCompleted !== today) {
        setStreak(parseInt(saved));
      } else if (!saved) {
        setStreak(0);
        await AsyncStorage.setItem("meditationStreak", "0");
      }
    };
    loadStreak();
  }, []);

  // Timer logic
  useEffect(() => {
    let timer;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      if (sound) sound.stopAsync();
      setCompletionModalVisible(true);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  // Guided breathing animation
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
    if (sound) await sound.unloadAsync();
    const { sound } = await Audio.Sound.createAsync(moodSounds[moodKey]);
    setSound(sound);
    await sound.playAsync();
    setSelectedSound(moodKey);
  };

  // Cleanup audio
  useEffect(() => {
    return sound ? () => sound.unloadAsync() : undefined;
  }, [sound]);

  // Complete meditation and update streak
  const completeMeditation = async () => {
    const today = new Date().toDateString();
    const lastCompleted = await AsyncStorage.getItem("lastMeditation");
    if (lastCompleted !== today) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      await AsyncStorage.setItem("meditationStreak", newStreak.toString());
      await AsyncStorage.setItem("lastMeditation", today);
    }
    await AsyncStorage.setItem("sessionNotes", sessionNotes);
    setCompletionModalVisible(false);
    setTimeLeft(parseInt(customTime) * 60 || 300);
    setIsRunning(false);
    if (sound) await sound.stopAsync();

    // Save session to SQLite
    try {
      if (!db) throw new Error("db not ready");
      const createdAt = new Date().toISOString();
      const duration = parseInt(customTime) * 60 || 300;
      const sql = `INSERT INTO meditation_sessions (created_at, mood, feeling, notes, duration_seconds) VALUES (?, ?, ?, ?, ?)`;
      const params = [createdAt, mood, selectedFeeling, sessionNotes, duration];
      if (db.runAsync) {
        await db.runAsync(sql, params);
      } else {
        db.transaction((tx) => tx.executeSql(sql, params));
      }
    } catch (_) {
      // ignore
    }

    // Fallback: also persist to AsyncStorage list for History
    try {
      const createdAt = new Date().toISOString();
      const duration = parseInt(customTime) * 60 || 300;
      const fallbackKey = "meditation_sessions_fallback";
      const existing = await AsyncStorage.getItem(fallbackKey);
      const arr = existing ? JSON.parse(existing) : [];
      arr.unshift({
        id: Date.now(),
        created_at: createdAt,
        mood,
        feeling: selectedFeeling,
        notes: sessionNotes,
        duration_seconds: duration,
      });
      await AsyncStorage.setItem(fallbackKey, JSON.stringify(arr));
    } catch (_) {}
  };

  // Set custom time
  const setTime = () => {
    const minutes = parseInt(customTime);
    if (minutes > 0) {
      setTimeLeft(minutes * 60);
      setIsRunning(false);
      if (sound) sound.stopAsync();
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
      {/* Punchline */}
      <Text style={[styles.punchline, { color: theme.fg }]}>
        Pause. Reset. Start.
      </Text>

      {/* Mood Selection Scroll */}
      <ScrollView
        horizontal
        style={[styles.moodScroll, { backgroundColor: scrollBg }]}
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
              if (isRunning) playSound(m);
            }}
          >
            <Text style={[styles.moodText, { color: theme.fg }]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Music Selection Scroll */}
      <ScrollView
        horizontal
        style={[styles.musicScroll, { backgroundColor: scrollBg }]}
        contentContainerStyle={styles.musicScrollContent}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
      >
        {moods.map((m) => (
          <TouchableOpacity
            key={m}
            activeOpacity={0.8}
            style={[
              styles.musicItem,
              { backgroundColor: chipBg, borderColor },
              selectedSound === m && {
                borderColor: moodThemes[mood].accent,
                backgroundColor: chipBg,
              },
            ]}
            onPress={() => playSound(m)}
          >
            <Text style={[styles.musicText, { color: theme.fg }]}>
              {m} Sound
            </Text>
            {selectedSound === m && isRunning && (
              <AntDesign name="pause" size={20} color={theme.fg} />
            )}
            {selectedSound === m && !isRunning && (
              <AntDesign name="play" size={20} color={theme.fg} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Streak Display */}
      <View style={styles.streakContainer}>
        <Text style={[styles.streakText, { color: theme.fg }]}>
          🔥 Streak: {streak} Days
        </Text>
      </View>

      {/* Circular Timer */}
      <View style={styles.timerContainer}>
        <CircularImageTimer
          progress={progress}
          size={200}
          strokeWidth={10}
          color={moodThemes[mood].accent}
          backgroundColor="#E0E0E0"
          imageSource={moodThemes[mood].backgroundImage}
        />
      </View>

      {/* Guided Breathing */}
      <Animated.View
        style={[
          styles.breathingContainer,
          {
            transform: [
              {
                scale: breatheAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.5],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={[styles.breathingText, { color: theme.fg }]}>
          {breathingPhase}
        </Text>
      </Animated.View>

      {/* Time Input */}
      <View style={styles.timeInputContainer}>
        <View
          style={[styles.timeCard, { backgroundColor: cardBg, borderColor }]}
        >
          <Text style={[styles.timeLabel, { color: theme.fg }]}>
            Duration (min)
          </Text>
          <View style={styles.timeRow}>
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
              style={[styles.setTimeBtn, { backgroundColor: theme.accent }]}
              onPress={setTime}
            >
              <Text style={[styles.setTimeText, { color: "#fff" }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Controls: Mute and Reset */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: controlBg, borderColor },
          ]}
          onPress={() => setThemeMode(themeMode === "Night" ? "Day" : "Night")}
        >
          <AntDesign name="bulb1" size={18} color={theme.fg} />
          <Text style={[styles.controlText, { color: theme.fg }]}>
            {themeMode === "Night" ? "Day" : "Night"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.controlButton,
            { backgroundColor: controlBg, borderColor },
            isMuted && { borderColor: moodThemes[mood].accent },
          ]}
          onPress={toggleMute}
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
        >
          <AntDesign name="reload1" size={18} color={theme.fg} />
          <Text style={[styles.controlText, { color: theme.fg }]}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Play/Pause Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: moodThemes[mood].accent }]}
        onPress={() => {
          setIsRunning(!isRunning);
          if (!isRunning && timeLeft > 0) playSound(mood);
        }}
      >
        <AntDesign
          name={isRunning ? "pause" : "play"}
          size={32}
          color={theme.fg}
        />
      </TouchableOpacity>

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
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  moodScroll: {
    position: "absolute",
    top: 50,
    height: 56,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 16,
  },
  moodScrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  moodItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 6,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  moodText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  musicScroll: {
    position: "absolute",
    top: 110,
    height: 60,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 16,
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
    backgroundColor: "rgba(255,255,255,0.12)",
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
    position: "absolute",
    top: 170,
  },
  streakText: {
    fontSize: 24,
    color: "#fff",
  },
  timerContainer: {
    marginVertical: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: "bold",
  },
  breathingContainer: {
    marginVertical: 20,
  },
  breathingText: {
    fontSize: 20,
    color: "#fff",
  },
  timeInputContainer: {
    flexDirection: "row",
    marginVertical: 10,
    width: "90%",
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
  },
  timeInput: {
    color: "#fff",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    width: 90,
    textAlign: "center",
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
  punchline: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
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
    marginTop: 10,
    gap: 12,
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
});
