import { Alert, Platform } from 'react-native';

/**
 * react-native-web's Alert.alert is a complete no-op (not even a single OK
 * dialog — see node_modules/react-native-web/src/exports/Alert/index.js),
 * so every Alert.alert call is silently swallowed on web. These wrappers
 * fall back to the browser's real window.alert/confirm there; native is
 * untouched (still plain Alert.alert, same UI as before).
 */

export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}

export function confirmAlert(
  title: string,
  message: string | undefined,
  onConfirm: () => void,
  options?: { confirmLabel?: string; destructive?: boolean },
) {
  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: options?.confirmLabel ?? 'OK', style: options?.destructive ? 'destructive' : 'default', onPress: onConfirm },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
