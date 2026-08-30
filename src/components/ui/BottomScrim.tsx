import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

/**
 * A thin, subtle haze right where scrolling content meets the floating tab bar:
 * content softly blurs at its bottom edge as it passes behind the bar. Kept
 * gentle on purpose — over the (near-white) page background it is barely there.
 * Always decorative: pointerEvents="none".
 */
export function BottomScrim() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pillTop = Math.max(insets.bottom, 14) + 60; // paddingBottom + PILL_HEIGHT
  const RAMP = 40;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: pillTop - 12, // tuck the bottom of the ramp behind the pill's top edge
        height: RAMP,
      }}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            style={StyleSheet.absoluteFill}
            colors={['transparent', 'rgba(0,0,0,0.85)']}
            locations={[0, 1]}
          />
        }
      >
        <BlurView tint="light" intensity={16} style={StyleSheet.absoluteFill} />
        <LinearGradient
          style={StyleSheet.absoluteFill}
          colors={['transparent', theme.colors.background]}
          locations={[0.2, 1]}
        />
      </MaskedView>
    </View>
  );
}
