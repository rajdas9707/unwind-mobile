import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window"); // Screen width
const CARD_WIDTH = width * 0.9; // 90% of screen
const CARD_HEIGHT = 160; // fixed height for uniformity

const DocCard = ({ item }) => {
  const router = useRouter();
  const iconColor = "#0B5FFF";

  const formatDate = (dateString) => {
    if (!dateString) return "Never opened";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Opened today";
    if (diffDays === 2) return "Opened yesterday";
    if (diffDays <= 7) return `Opened ${diffDays} days ago`;
    return `Opened ${date.toLocaleDateString()}`;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={{
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 20,
        marginVertical: 14,
        alignSelf: "center",
        width: CARD_WIDTH,
        minHeight: CARD_HEIGHT,
        shadowColor: "#000",
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 6,
        borderLeftWidth: 6,
        borderLeftColor: iconColor,
      }}
      onPress={() =>
        router.push({ pathname: "/document/[id]", params: { id: item.id } })
      }
    >
      {/* Top Row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <View
          style={{
            width: 70,
            height: 70,
            borderRadius: 35,
            backgroundColor: `${iconColor}20`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          <Text style={{ fontSize: 24, color: iconColor }}>📄</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#222",
              marginBottom: 6,
            }}
            numberOfLines={1}
          >
            {item.docName}
          </Text>
          <Text style={{ fontSize: 14, color: "#666" }} numberOfLines={1}>
            {(item.files || []).length} files
          </Text>
          <Text
            style={{ fontSize: 12, color: "#999", marginTop: 2 }}
            numberOfLines={1}
          >
            {formatDate(item.lastOpenedAt)}
          </Text>
        </View>
      </View>

      {/* Bottom Row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View
          style={{
            backgroundColor: `${iconColor}15`,
            borderRadius: 14,
            paddingVertical: 6,
            paddingHorizontal: 14,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: iconColor }}>
            {item.tag || "miscellaneous"}
          </Text>
        </View>

        <Text style={{ fontSize: 14, color: "#0B5FFF", fontWeight: "600" }}>
          View →
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const DocCardList = ({ data }) => {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingVertical: 20,
      }}
    >
      {data.map((item, idx) => (
        <DocCard key={idx} item={item} />
      ))}
    </ScrollView>
  );
};

export default DocCardList;
