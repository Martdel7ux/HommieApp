import { MessagesScreen } from '@/features/messaging/MessagesScreen';
import { useAuth } from '@/features/auth/AuthProvider';

/**
 * Top-level /messages route — didn't exist before this; the native apps
 * only ever reach MessagesScreen nested inside the (student)/(landlord)
 * tab groups. Added for the web app (see the web-app plan), which has no
 * tab bar, but this is just as valid a deep-link target on native.
 */
export default function Messages() {
  const { role } = useAuth();
  return <MessagesScreen role={role === 'landlord' ? 'landlord' : 'student'} />;
}
