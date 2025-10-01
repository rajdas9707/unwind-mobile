import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import * as Haptics from "expo-haptics";

// Helper function to determine if a color is light or dark
const isLightColor = (color) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

// A responsive, animated two-option toggle for top bars
// Options: "Today's" (left) and "Backlogs" (right)
// Props:
// - selected: 'today' | 'backlogs'
// - onChange: (value: 'today' | 'backlogs') => void
// - primaryColor: string (highlight color)
// - counts?: { today?: number, backlogs?: number }
// - containerStyle?: any
// - haptics?: boolean (default true)
export default function TopBarToggle({
  selected = "today",
  onChange,
  primaryColor = "#3B82F6",
  counts = {},
  containerStyle,
  haptics = true,
  leftText,
  rightText,
  activeTextColor,
  inactiveTextColor = "#374151",
  backgroundColor = "#EEF2F7",
  borderColor = "#E5E7EB",
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const segmentWidth = containerWidth > 0 ? containerWidth / 2 : 0;

  const initialIndex = selected === "backlogs" ? 1 : 0;
  const anim = useRef(new Animated.Value(initialIndex)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: selected === "backlogs" ? 1 : 0,
      useNativeDriver: true,
      friction: 10,
      tension: 90,
    }).start();
  }, [selected]);

  const translateX = useMemo(() => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, segmentWidth],
    });
  }, [anim, segmentWidth]);

  const handlePress = async (value) => {
    if (value !== selected) {
      try {
        if (haptics) {
          await Haptics.selectionAsync();
        }
      } catch (e) {
        // no-op if haptics not available
      }
      onChange && onChange(value);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        },
        containerStyle,
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      {segmentWidth > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.slider,
            {
              width: segmentWidth,
              transform: [{ translateX }],
              backgroundColor: primaryColor,
              shadowColor: primaryColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 10,
              elevation: 4,
            },
          ]}
        />
      )}

      <Pressable
        style={[styles.segment, styles.segmentLeft]}
        onPress={() => handlePress("today")}
        android_ripple={{ color: "rgba(0,0,0,0.05)", borderless: false }}
      >
        <Text
          style={[
            styles.label,
            { color: selected === "today" ? activeTextColor : inactiveTextColor },
          ]}
          numberOfLines={1}
        >
          {`${leftText ?? "Today's"}${Number.isFinite(counts.left)
            ? ` (${counts.left})`
            : Number.isFinite(counts.today)
            ? ` (${counts.today})`
            : ""
          }`}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.segment, styles.segmentRight]}
        onPress={() => handlePress("backlogs")}
        android_ripple={{ color: "rgba(0,0,0,0.05)", borderless: false }}
      >
        <Text
          style={[
            styles.label,
            { color: selected === "backlogs" ? activeTextColor : inactiveTextColor },
          ]}
          numberOfLines={1}
        >
          {`${rightText ?? "Backlogs"}${Number.isFinite(counts.right)
            ? ` (${counts.right})`
            : Number.isFinite(counts.backlogs)
            ? ` (${counts.backlogs})`
            : ""
          }`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLeft: {
    borderRightWidth: 0,
    borderRightColor: "transparent",
  },
  segmentRight: {},
  label: {
    fontSize: 13,
    fontWeight: "800",
  },
  slider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
  },
});

