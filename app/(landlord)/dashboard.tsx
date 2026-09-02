import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Card, Button, Banner, LoadingState } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryClient';
import { verificationLabels } from '@/config/labels';

function Stat({ label, value }: { label: string; value: number | string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        minWidth: '28%',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        gap: 2,
      }}
    >
      <Text variant="h2">{value}</Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}

export default function LandlordDashboard() {
  const theme = useTheme();
  const { landlordProfile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: qk.landlordDashboard,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('landlord_dashboard_summary');
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  if (isLoading) return <Screen><LoadingState /></Screen>;

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.xl }}>
        <View style={{ marginTop: theme.spacing.sm }}>
          <Text variant="bodySm" muted>
            Welcome back
          </Text>
          <Text variant="h1">{landlordProfile?.business_name || landlordProfile?.contact_name || 'Dashboard'}</Text>
        </View>

        {landlordProfile && landlordProfile.verification !== 'verified' ? (
          <Banner
            tone={landlordProfile.verification === 'submitted' ? 'info' : 'warning'}
            title={verificationLabels[landlordProfile.verification]}
            message={
              landlordProfile.verification === 'submitted'
                ? 'Our team is reviewing your verification. You can keep managing listings meanwhile.'
                : 'Submit verification from your profile to earn the Hommie Verified badge students trust.'
            }
          />
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
          <Stat label="Active listings" value={data?.active_listings ?? 0} />
          <Stat label="Unread enquiries" value={data?.unread_enquiries ?? 0} />
          <Stat label="Total views" value={data?.total_views ?? 0} />
          <Stat label="Total saves" value={data?.total_saves ?? 0} />
          <Stat label="Enquiries" value={data?.total_enquiries ?? 0} />
          <Stat label="Drafts" value={data?.draft_listings ?? 0} />
        </View>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.colors.primarySubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="add" size={24} color={theme.colors.primaryPressed} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3">Create a listing</Text>
              <Text variant="bodySm" muted>
                A quick step-by-step flow for photos, location, rent and more.
              </Text>
            </View>
          </View>
          <Button
            title="Create Listing"
            style={{ marginTop: theme.spacing.md }}
            onPress={() => {
              /* wired to the creation flow in Phase 2 */
            }}
          />
        </Card>

        <Banner
          tone="info"
          title="More on the way"
          message="Listing management, the enquiry inbox and performance charts land in the next update."
        />
      </View>
    </Screen>
  );
}
