import React, { useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import NewIdeaModal from "../components/idea/NewIdeaModal";

const initialIdeas = [
  {
    id: "1",
    title: "Develop a sustainable urban farming initiative",
    source: "futurecities.org",
    time: "2h ago",
    thumbnail: "https://picsum.photos/200/300?random=1",
  },
  {
    id: "2",
    title: "Gamified language learning for kids",
    source: "edtech.com",
    time: "1d ago",
    thumbnail: "https://picsum.photos/200/300?random=2",
  },
];

export default function Idea() {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [modalVisible, setModalVisible] = useState(false);

  const addIdea = (idea, url, tag, photo) => {
    const newEntry = {
      id: Date.now().toString(),
      title: idea,
      source: url || "myideas.com",
      time: "Just now",
      thumbnail:
        photo ||
        "https://picsum.photos/200/300?random=" + Math.floor(Math.random() * 100),
      tag,
    };

    setIdeas([newEntry, ...ideas]);
  };

  const renderItem = ({ item }) => (
    <View
      style={{
        backgroundColor: "#fff",
        padding: 16,
        marginBottom: 16,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Image
          source={{ uri: item.thumbnail }}
          style={{
            width: 55,
            height: 55,
            borderRadius: 12,
            backgroundColor: "#eee",
          }}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#111827",
            }}
          >
            {item.title}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#6B7280",
              marginTop: 4,
            }}
          >
            {item.source}
          </Text>
        </View>
      </View>
      <Text
        style={{
          fontSize: 12,
          color: "#9CA3AF",
          marginTop: 8,
          alignSelf: "flex-end",
        }}
      >
        {item.time}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 18,
      }}
    >
      <StatusBar style="dark" />
      <Text
        style={{
          fontSize: 22,
          fontWeight: "bold",
          marginVertical: 18,
          alignSelf: "center",
          color: "#1F2937",
        }}
      >
        💡 IdeaStream
      </Text>

      <FlatList
        data={ideas}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={{
          position: "absolute",
          bottom: 30,
          right: 25,
          backgroundColor: "#2563EB",
          width: 62,
          height: 62,
          borderRadius: 31,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 6,
          elevation: 6,
        }}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal Component */}
      <NewIdeaModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={addIdea}
      />
    </SafeAreaView>
  );
}
