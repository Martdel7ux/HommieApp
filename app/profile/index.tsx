import { Stack } from 'expo-router';
import { ProfileScreen } from '@/features/profile/ProfileScreen';

export default function Profile() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileScreen />
    </>
  );
}
