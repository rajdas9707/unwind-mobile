import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window"); // Screen width
const CARD_WIDTH = width * 0.9; // 90% of screen
const CARD_HEIGHT = 160; // fixed height for uniformity

const DocCard = ({ item }) => {
  const IconComp = item.icon.lib;

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
        borderLeftColor: item.icon.color,
      }}
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
            backgroundColor: `${item.icon.color}20`,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
          }}
        >
          <IconComp name={item.icon.name} size={36} color={item.icon.color} />
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
            {item.title}
          </Text>
          <Text style={{ fontSize: 14, color: "#666" }} numberOfLines={1}>
            {item.meta}
          </Text>
        </View>
      </View>

      {/* Bottom Row */}
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View
          style={{
            backgroundColor: `${item.icon.color}15`,
            borderRadius: 14,
            paddingVertical: 6,
            paddingHorizontal: 14,
          }}
        >
          <Text
            style={{ fontSize: 13, fontWeight: "600", color: item.icon.color }}
          >
            {item.tag}
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
