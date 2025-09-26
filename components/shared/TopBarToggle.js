import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";

// A responsive, animated two-option toggle for top bars
// Options: "Today's" (left) and "Backlogs" (right)
// Props:
// - selected: 'today' | 'backlogs'
// - onChange: (value: 'today' | 'backlogs') => void
// - primaryColor: string (highlight color)
// - counts?: { today?: number, backlogs?: number }
// - containerStyle?: any
export default function TopBarToggle({
  selected = "today",
  onChange,
  primaryColor = "#3B82F6",
  counts = {},
  containerStyle,
}) {
  const [containerWidth, setContainerWidth] = useState(0);
  const segmentWidth = containerWidth > 0 ? containerWidth / 2 : 0;

  const initialIndex = selected === "backlogs" ? 1 : 0;
  const anim = useRef(new Animated.Value(initialIndex)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: selected === "backlogs" ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [selected]);

  const translateX = useMemo(() => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, segmentWidth],
    });
  }, [anim, segmentWidth]);

  const handlePress = (value) => {
    if (value !== selected) {
      onChange && onChange(value);
    }
  };

  return (
    <View
      style={[styles.container, containerStyle]}
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
            },
          ]}
        />
      )}

      <Pressable
        style={[styles.segment, styles.segmentLeft]}
        onPress={() => handlePress("today")}
      >
        <Text
          style={[
            styles.label,
            selected === "today" ? styles.labelActive : styles.labelInactive,
          ]}
          numberOfLines={1}
        >
          {`Today's${Number.isFinite(counts.today) ? ` (${counts.today})` : ""}`}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.segment, styles.segmentRight]}
        onPress={() => handlePress("backlogs")}
      >
        <Text
          style={[
            styles.label,
            selected === "backlogs" ? styles.labelActive : styles.labelInactive,
          ]}
          numberOfLines={1}
        >
          {`Backlogs${Number.isFinite(counts.backlogs) ? ` (${counts.backlogs})` : ""}`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2F7",
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLeft: {
    borderRightWidth: 0,
    borderRightColor: "transparent",
  },
  segmentRight: {},
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
  labelInactive: {
    color: "#374151",
  },
  labelActive: {
    color: "#FFFFFF",
  },
  slider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 999,
  },
});

