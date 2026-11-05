import { CommunityScreen } from '@/features/community/CommunityScreen';

/**
 * Top-level `/community` — the web nav links here directly (see
 * WebAppFrame.tsx). On native this same screen is reached through the
 * (student) tab group instead; kept as one shared component so they can't
 * drift (see CommunityScreen.tsx).
 */
export default function Community() {
  return <CommunityScreen />;
}
