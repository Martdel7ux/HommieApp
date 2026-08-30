import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';

/**
 * The soft "fog" that sits just above the floating tab bar: page content blurs
 * and fades into the background as it scrolls down toward the bar. Purely
 * decorative — always rendered with pointerEvents="none".
 */
export function BottomScrim() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pillBottom = Math.max(insets.bottom, 12);
  const RAMP = 84;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        // start a touch behind the pill's top edge so there is no visible seam
        bottom: pillBottom + theme.layout.tabBarPillHeight - 14,
        height: RAMP,
      }}
    >
      <MaskedView
        style={StyleSheet.absoluteFill}
        maskElement={
          <LinearGradient
            style={StyleSheet.absoluteFill}
            colors={['transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,1)']}
            locations={[0, 0.55, 1]}
          />
        }
      >
        <BlurView tint="default" intensity={26} style={StyleSheet.absoluteFill} />
      </MaskedView>

      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={['transparent', theme.colors.background]}
        locations={[0.1, 1]}
      />
    </View>
  );
}
