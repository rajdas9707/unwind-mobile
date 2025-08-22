import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import * as SQLite from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";

export default function HistoryScreen() {
  const [sessions, setSessions] = useState([]);
  const [db, setDb] = useState(null);

  const loadFromStorageFallback = async () => {
    try {
      const existing = await AsyncStorage.getItem(
        "meditation_sessions_fallback"
      );
      const arr = existing ? JSON.parse(existing) : [];
      if (arr.length) setSessions(arr);
    } catch (_) {}
  };

  const loadSessions = async (opened) => {
    const selectSQL = `SELECT id, created_at, mood, feeling, notes, duration_seconds FROM meditation_sessions ORDER BY created_at DESC`;
    try {
      if (opened?.getAllAsync) {
        const rows = await opened.getAllAsync(selectSQL);
        if (rows?.length) setSessions(rows);
        else await loadFromStorageFallback();
      } else if (opened) {
        opened.transaction((tx) => {
          tx.executeSql(selectSQL, [], (_, { rows }) => {
            if (rows._array?.length) setSessions(rows._array);
          });
        });
        // Also try fallback to ensure visibility
        await loadFromStorageFallback();
      } else {
        await loadFromStorageFallback();
      }
    } catch (_) {
      await loadFromStorageFallback();
    }
  };

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
        await loadSessions(opened);
      } catch (_) {
        await loadFromStorageFallback();
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadSessions(db);
    }, [db])
  );

  const renderItem = ({ item }) => {
    const date = new Date(item.created_at);
    const minutes = Math.round(item.duration_seconds / 60);
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{date.toLocaleString()}</Text>
        <Text style={styles.row}>
          Mood: {item.mood || "-"} • Feeling: {item.feeling || "-"}
        </Text>
        <Text style={styles.row}>Duration: {minutes} min</Text>
        {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Meditation History</Text>
      <FlatList
        data={sessions}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={<Text style={styles.empty}>No sessions yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b1220",
  },
  header: {
    color: "#e5e7eb",
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  title: {
    color: "#e5e7eb",
    fontWeight: "700",
    marginBottom: 4,
  },
  row: {
    color: "#cbd5e1",
    marginBottom: 2,
  },
  notes: {
    color: "#94a3b8",
    marginTop: 6,
  },
  empty: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 40,
  },
});
