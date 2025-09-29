import React, { useEffect, useMemo, useRef } from "react";
import { Pressable, View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AnimatedCheckbox({
  checked = false,
  onPress,
  size = 24,
  activeColor = "#10B981",
  inactiveColor = "#6B7280",
  backgroundColor = "#FFFFFF",
  borderColor = "#E5E7EB",
  duration = 180,
  style,
  disabled = false,
}) {
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: checked ? 1 : 0,
      duration,
      easing: undefined,
      useNativeDriver: false,
    }).start();
  }, [checked, duration, progress]);

  const containerSize = useMemo(() => ({ width: size, height: size, borderRadius: size / 6 }), [size]);
  const iconSize = Math.max(14, Math.floor(size * 0.7));

  const animatedStyles = {
    borderColor: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [borderColor, activeColor],
    }),
    backgroundColor: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [backgroundColor, `${activeColor}20`],
    }),
    shadowOpacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.25] }),
  };

  const scaleIn = progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] });
  const checkOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      style={[{ padding: 4 }, style]}
      hitSlop={8}
    >
      <Animated.View
        style={[
          styles.box,
          containerSize,
          {
            borderWidth: 2,
            shadowColor: activeColor,
            transform: [{ scale: scaleIn }],
          },
          animatedStyles,
        ]}
      >
        <Animated.View style={{ opacity: checkOpacity, transform: [{ scale: checkOpacity }] }}>
          <Ionicons name="checkmark" size={iconSize} color={activeColor} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
});

