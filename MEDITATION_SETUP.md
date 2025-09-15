# Meditation Screen Setup Guide

This guide will help you set up the meditation screen with all the required dependencies for Expo Go compatibility.

## Dependencies Already Included

The following dependencies are already included in your `package.json` and are compatible with Expo Go:

- `expo-linear-gradient` - For gradient backgrounds
- `expo-blur` - For blur effects  
- `react-native-reanimated` - For animations and confetti particles
- `react-native-svg` - For SVG graphics and circular progress
- `@expo/vector-icons` - For icons (Ionicons)

## Installation Steps

1. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm start
   ```

3. **Open in Expo Go**:
   - Scan the QR code with your phone's camera (iOS) or Expo Go app (Android)
   - The meditation screen should now work with all animations and effects

## Features Implemented

### 🎨 **Visual Design**
- Dark gradient background with sparkling effects
- Circular timer with animated progress ring
- Confetti particles animation
- Lens flare effect behind the timer
- Professional glass-morphism UI elements

### ⏱️ **Timer Component**
- 25-minute default timer (customizable)
- Animated circular progress indicator
- Play/pause functionality
- Breathing animation effect
- Confetti particles that fall around the timer
- Lens flare effect for visual appeal

### 🎛️ **Controls Section**
- Custom time adjustment (+/- 5 minutes)
- Lightbulb, speaker, and headphones utility buttons
- Clean, modern button design
- Interactive time display

### 🎵 **Music Modes**
- Three music mode cards: Ambient Focus, Deep Work, Relax & Unwind
- Horizontal scrolling cards
- Play/pause indicators
- Selection highlighting
- Beautiful image overlays with gradients

## Customization

### Timer Duration
You can modify the default timer duration in `Mobile/app/meditation.js`:
```javascript
const [timeLeft, setTimeLeft] = useState(1500); // 25 minutes in seconds
```

### Confetti Colors
Modify confetti particle colors in `Mobile/components/meditation/Timer.js`:
```javascript
const confettiParticles = [
  { id: 1, color: "#FFD700", size: 4, startX: 50, startY: 100, delay: 0, duration: 3000 },
  // Add more particles or change colors
];
```

### Music Modes
Add or modify music modes in `Mobile/components/meditation/MusicModes.js`:
```javascript
const musicData = [
  {
    id: "1",
    title: "AMBIENT FOCUS",
    subtitle: "Forest ASMR",
    duration: "30:00",
    image: require("../../assets/calm-bg.jpeg"),
    isPlaying: false,
  },
  // Add more modes
];
```

## Troubleshooting

### Common Issues

1. **Animations not working**: Ensure `react-native-reanimated` is properly installed
2. **SVG not rendering**: Check that `react-native-svg` is installed
3. **Icons not showing**: Verify `@expo/vector-icons` is installed
4. **Gradients not working**: Ensure `expo-linear-gradient` is installed

### Performance Tips

- The confetti animation is optimized for performance
- Animations use `react-native-reanimated` for smooth 60fps performance
- SVG graphics are lightweight and scalable

## Expo Go Compatibility

All dependencies used are compatible with Expo Go:
- ✅ `expo-linear-gradient`
- ✅ `expo-blur`
- ✅ `react-native-reanimated`
- ✅ `react-native-svg`
- ✅ `@expo/vector-icons`

No native code compilation required - everything works in Expo Go!

## Next Steps

1. Test the meditation screen in Expo Go
2. Customize colors, durations, and music modes as needed
3. Add actual audio functionality if desired
4. Implement timer notifications
5. Add more music modes or categories
