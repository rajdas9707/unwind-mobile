import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import NewIdeaModal from "../components/idea/NewIdeaModal";
import { getIdeas } from "../storage/idea/db";
import { useRouter } from "expo-router";

const initialIdeas = [];

export default function IdeaScreen() {
  const [ideas, setIdeas] = useState(initialIdeas);
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  const loadIdeas = async () => {
    try {
      const rows = await getIdeas();
      setIdeas(rows);
    } catch (error) {
      console.log("error loading ideas", error);
    }
  };

  useEffect(() => {
    loadIdeas();
  }, []);

  const addIdea = () => {
    setModalVisible(false);
    loadIdeas();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
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
      onPress={() => router.push({ pathname: "/idea/[id]", params: { id: item.id } })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{ fontSize: 16, fontWeight: "600", color: "#111827" }}
            numberOfLines={2}
          >
            {item.idea}
          </Text>
          <View style={{ flexDirection: "row", marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: "#6B7280", marginRight: 12 }}>
              {item.tag || "miscellaneous"}
            </Text>
            <Text style={{ fontSize: 12, color: "#6B7280", marginRight: 12 }}>
              {(item.files || []).length} files
            </Text>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>
              {(item.urls || []).length} URLs
            </Text>
          </View>
        </View>
      </View>
      <Text
        style={{ fontSize: 12, color: "#9CA3AF", marginTop: 8, alignSelf: "flex-end" }}
      >
        {item.time}
      </Text>
    </TouchableOpacity>
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
