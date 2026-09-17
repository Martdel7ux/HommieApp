import * as Haptics from 'expo-haptics';

/** Thin, semantic wrapper around expo-haptics — call sites express intent, not primitives. */
export const haptics = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  select: () => Haptics.selectionAsync(),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
};
