import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Progressive blur ramp that sits directly on top of the floating tab bar:
 * scrolling content is sharp higher up and dissolves into frost as it nears the
 * bar, so there is no hard edge where content meets the glass. Built from a few
 * stacked, gradient-masked blur layers (RN has no native variable-radius blur).
 * Always decorative: pointerEvents="none".
 */
const LAYERS = 5;

export function BottomScrim() {
  const insets = useSafeAreaInsets();
  const pillTop = Math.max(insets.bottom - 6, 14) + 62; // gap + PILL_HEIGHT (see FloatingTabBar)
  const HEIGHT = 92;

  if (Platform.OS === 'android') return null; // blur is disabled on Android

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: pillTop - 18, // overlap the pill's top edge so the ramp is seamless
        height: HEIGHT,
      }}
    >
      {Array.from({ length: LAYERS }).map((_, i) => {
        const start = i / LAYERS;
        return (
          <MaskedView
            key={i}
            style={StyleSheet.absoluteFill}
            maskElement={
              <LinearGradient
                style={StyleSheet.absoluteFill}
                colors={['transparent', '#000']}
                locations={[start, Math.min(start + 1 / LAYERS + 0.05, 1)]}
              />
            }
          >
            <BlurView tint="light" intensity={2 + i * 6} style={StyleSheet.absoluteFill} />
          </MaskedView>
        );
      })}
    </View>
  );
}
