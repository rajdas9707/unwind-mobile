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
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = 120; // Reduced height

const DocCard = ({ item }) => {
  const router = useRouter();
  
  // Dynamic colors based on category or file type
  const getCardColors = () => {
    const tag = item.tag?.toLowerCase() || 'personal';
    switch (tag) {
      case 'work':
        return ['#667EEA', '#764BA2'];
      case 'personal':
        return ['#FF6B6B', '#4ECDC4'];
      case 'education':
        return ['#4ECDC4', '#44A08D'];
      case 'health':
        return ['#FF6B6B', '#FFE66D'];
      case 'finance':
        return ['#A8E6CF', '#88D8A3'];
      default:
        return ['#667EEA', '#764BA2'];
    }
  };

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

  const cardColors = getCardColors();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={{
        marginVertical: 6,
        marginHorizontal: 16,
        borderRadius: 24,
        shadowColor: cardColors[0],
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 16,
        elevation: 8,
      }}
      onPress={() =>
        router.push({ pathname: "/document/[id]", params: { id: item.id } })
      }
    >
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          padding: 18,
          flex: 1,
          minHeight: CARD_HEIGHT + 16,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.8)',
        }}
      >
        {/* Header Row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <LinearGradient
            colors={cardColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 58,
              height: 58,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 16,
              shadowColor: cardColors[0],
              shadowOpacity: 0.25,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Ionicons name={getFileIcon()} size={28} color="#FFFFFF" />
          </LinearGradient>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: "#1F2937",
                marginBottom: 6,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {item.docName}
            </Text>
            <Text style={{ fontSize: 14, color: "#6B7280", fontWeight: "500" }}>
              {(item.files || []).length} {item.files?.length === 1 ? 'file' : 'files'}
            </Text>
          </View>

          <LinearGradient
            colors={[`${cardColors[0]}15`, `${cardColors[1]}15`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: `${cardColors[0]}30`,
            }}
          >
            <Text style={{ fontSize: 13, color: cardColors[0], fontWeight: "700", letterSpacing: 0.3 }}>
              {item.tag || "Personal"}
            </Text>
          </LinearGradient>
      </View>

        {/* Footer Row */}
        <View 
          style={{ 
            flexDirection: "row", 
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: "rgba(0, 0, 0, 0.06)",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="time-outline" size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 13, color: "#9CA3AF", fontWeight: "600" }}>
              {formatDate(item.lastOpenedAt)}
            </Text>
          </View>
          
          <LinearGradient
            colors={[`${cardColors[0]}20`, `${cardColors[1]}20`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ 
              flexDirection: "row", 
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: `${cardColors[0]}40`,
            }}
          >
            <Text style={{ fontSize: 13, color: cardColors[0], fontWeight: "700", marginRight: 6 }}>
              View
            </Text>
            <Ionicons name="chevron-forward" size={14} color={cardColors[0]} />
          </LinearGradient>
        </View>
      </LinearGradient>
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
