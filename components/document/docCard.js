import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = 120; // Reduced height

const DocCard = ({ item }) => {
  const router = useRouter();
  const iconColor = "#6366F1";

  const formatDate = (dateString) => {
    if (!dateString) return "Never opened";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getFileIcon = () => {
    const fileCount = (item.files || []).length;
    if (fileCount === 0) return "document-outline";
    if (fileCount === 1) return "document-text-outline";
    return "folder-outline";
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={{
        backgroundColor: "#FAFBFC",
        borderRadius: 20,
        padding: 18,
        marginVertical: 6,
        marginHorizontal: 8,
        alignSelf: "center",
        width: CARD_WIDTH - 16,
        minHeight: CARD_HEIGHT,
        shadowColor: "#6366F1",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 3 },
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#F1F5F9",
      }}
      onPress={() =>
        router.push({ pathname: "/document/[id]", params: { id: item.id } })
      }
    >
      {/* Header Row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 14,
            shadowColor: "#6366F1",
            shadowOpacity: 0.1,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 8,
            elevation: 3,
            borderWidth: 1,
            borderColor: "#F1F5F9",
          }}
        >
          <Ionicons name={getFileIcon()} size={26} color={iconColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: "#111827",
              marginBottom: 4,
            }}
            numberOfLines={1}
          >
            {item.docName}
          </Text>
          <Text style={{ fontSize: 13, color: "#64748B", fontWeight: "500" }}>
            {(item.files || []).length} {item.files?.length === 1 ? 'file' : 'files'}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#EEF2FF",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: "#E0E7FF",
          }}
        >
          <Text style={{ fontSize: 12, color: "#6366F1", fontWeight: "600" }}>
            {item.tag || "Personal"}
          </Text>
        </View>
      </View>

      {/* Footer Row */}
      <View 
        style={{ 
          flexDirection: "row", 
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: "#F1F5F9",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="time-outline" size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "500" }}>
            {formatDate(item.lastOpenedAt)}
          </Text>
        </View>
        
        <View style={{ 
          flexDirection: "row", 
          alignItems: "center",
          backgroundColor: "#F8FAFC",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "#E2E8F0",
        }}>
          <Text style={{ fontSize: 12, color: iconColor, fontWeight: "600", marginRight: 4 }}>
            View
          </Text>
          <Ionicons name="chevron-forward" size={12} color={iconColor} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const DocCardList = ({ data }) => {
  return (
    <View>
      {data.map((item, idx) => (
        <DocCard key={idx} item={item} />
      ))}
    </View>
  );
};

export default DocCardList;
