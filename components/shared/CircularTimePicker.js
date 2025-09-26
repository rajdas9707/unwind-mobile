import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

// Elegant circular time picker with hour/minute modes
// Props:
// - hour: string ("HH") 00-23
// - minute: string ("MM") 00-59
// - onChange: ({ hour, minute }) => void
// - accentColor?: string
export default function CircularTimePicker({
  hour = "12",
  minute = "00",
  onChange,
  accentColor = "#667eea",
}) {
  const [mode, setMode] = useState("hour"); // 'hour' | 'minute'

  const isPM = parseInt(hour, 10) >= 12;
  const hour12 = (parseInt(hour, 10) % 12) || 12;

  const hours = useMemo(() => Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i)), []);
  const minutes5 = useMemo(() => Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, "0")), []);

  const handleSelectHour = (h12) => {
    const base = parseInt(hour, 10);
    const newHour = isPM ? (h12 % 12) + 12 : (h12 % 12);
    onChange?.({ hour: newHour.toString().padStart(2, "0"), minute });
  };

  const handleSelectMinute = (m) => {
    onChange?.({ hour, minute: m });
  };

  const toggleAMPM = (target) => {
    const current = parseInt(hour, 10);
    if (target === "AM" && current >= 12) {
      const newHour = current - 12;
      onChange?.({ hour: newHour.toString().padStart(2, "0"), minute });
    } else if (target === "PM" && current < 12) {
      const newHour = current + 12;
      onChange?.({ hour: newHour.toString().padStart(2, "0"), minute });
    }
  };

  const angleFor = (value, total) => (value / total) * 360 - 90; // start at top

  const pointerAngle = useMemo(() => {
    if (mode === "hour") {
      return angleFor(hour12 % 12, 12);
    }
    const mIndex = Math.round(parseInt(minute, 10) / 5) % 12;
    return angleFor(mIndex, 12);
  }, [mode, hour12, minute]);

  const renderTicks = () => {
    const radius = 90;
    const total = 12;
    const items = mode === "hour" ? hours : minutes5;
    return items.map((val, i) => {
      const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const isSelected = mode === "hour" ? val === hour12 : val === minute.padStart(2, "0");
      return (
        <TouchableOpacity
          key={val}
          style={[styles.tick, { transform: [{ translateX: x }, { translateY: y }] }, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}
          onPress={() => (mode === "hour" ? handleSelectHour(val) : handleSelectMinute(val))}
        >
          <Text style={[styles.tickText, isSelected && { color: "#FFFFFF", fontWeight: "800" }]}>
            {val}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "hour" && [styles.modeBtnActive, { borderColor: accentColor }]]}
          onPress={() => setMode("hour")}
        >
          <Text style={[styles.modeText, mode === "hour" && { color: accentColor }]}>Hours</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "minute" && [styles.modeBtnActive, { borderColor: accentColor }]]}
          onPress={() => setMode("minute")}
        >
          <Text style={[styles.modeText, mode === "minute" && { color: accentColor }]}>Minutes</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.clockFace}>
        <View style={styles.clockCircle}>
          {/* Pointer */}
          <View style={[styles.pointerWrap, { transform: [{ rotate: `${pointerAngle}deg` }] }]}>
            <View style={[styles.pointer, { backgroundColor: accentColor }]} />
          </View>
          <View style={[styles.centerDot, { backgroundColor: accentColor }]} />
          {renderTicks()}
        </View>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.timeDisplay}>
          <Text style={[styles.timeText, { color: accentColor }]}>
            {(hour12).toString().padStart(2, "0")}:{minute}
          </Text>
        </View>
        <View style={styles.ampmRow}>
          <TouchableOpacity
            style={[styles.ampmBtn, !isPM && [styles.ampmActive, { borderColor: accentColor, backgroundColor: `${accentColor}15` }]]}
            onPress={() => toggleAMPM("AM")}
          >
            <Text style={[styles.ampmText, !isPM && { color: accentColor }]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ampmBtn, isPM && [styles.ampmActive, { borderColor: accentColor, backgroundColor: `${accentColor}15` }]]}
            onPress={() => toggleAMPM("PM")}
          >
            <Text style={[styles.ampmText, isPM && { color: accentColor }]}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modeBtnActive: {
    backgroundColor: "#FFFFFF",
  },
  modeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  clockFace: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  clockCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  centerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: "absolute",
  },
  pointerWrap: {
    position: "absolute",
    width: 200,
    height: 200,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  pointer: {
    width: 90,
    height: 3,
    borderRadius: 2,
    marginLeft: 110,
  },
  tick: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  tickText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeDisplay: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  timeText: {
    fontSize: 18,
    fontWeight: "800",
  },
  ampmRow: {
    flexDirection: "row",
    gap: 8,
  },
  ampmBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  ampmActive: {},
  ampmText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6B7280",
  },
});

