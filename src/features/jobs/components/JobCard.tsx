import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text, Button } from '@/components/ui';
import type { JobType } from '@/types/database';
import { jobLocationLabel, payLabel } from '../api';
import type { JobCard as JobCardModel } from '../types';

interface Props {
  job: JobCardModel;
  saved?: boolean;
  onPress?: () => void;
  onToggleSave?: () => void;
}

const TYPE_ICON: Record<JobType, keyof typeof Ionicons.glyphMap> = {
  part_time: 'time-outline',
  internship: 'school-outline',
  full_time: 'briefcase-outline',
  contract: 'document-text-outline',
  seasonal: 'sunny-outline',
};

function MetaChip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: theme.colors.surfaceSunken,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
      }}
    >
      <Ionicons name={icon} size={13} color={theme.colors.textTertiary} />
      <Text variant="bodySm" color={theme.colors.textSecondary} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function TrustChip({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: theme.colors.successSubtle,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
      }}
    >
      <Ionicons name="checkmark-circle" size={13} color={theme.colors.success} />
      <Text variant="bodySm" color={theme.colors.success} weight="600">
        {label}
      </Text>
    </View>
  );
}

export function JobCard({ job, saved, onPress, onToggleSave }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${job.title} at ${job.company}, ${jobLocationLabel(job)}, ${payLabel(job)}`}
      style={({ pressed }) => ({
        alignSelf: 'stretch',
        borderRadius: 16,
        opacity: pressed ? 0.96 : 1,
        ...theme.shadows.sm,
      })}
    >
      <View
        style={{
          borderRadius: 16,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        }}
      >
        {/* header */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              overflow: 'hidden',
              backgroundColor: theme.colors.primarySubtle,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {job.company_logo_url ? (
              <Image source={{ uri: job.company_logo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <Ionicons name={TYPE_ICON[job.job_type]} size={20} color={theme.colors.primary} />
            )}
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="h3" numberOfLines={2} style={{ fontSize: 17 }}>
              {job.title}
            </Text>
            <Text variant="bodySm" muted numberOfLines={1}>
              {job.company}
            </Text>
          </View>

          {onToggleSave ? (
            <Pressable
              onPress={onToggleSave}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={saved ? 'Remove from saved' : 'Save job'}
            >
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={22}
                color={saved ? theme.colors.danger : theme.colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>

        {/* meta chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <MetaChip icon="location-outline" label={jobLocationLabel(job)} />
          <MetaChip icon="card-outline" label={payLabel(job)} />
          {job.verified ? <TrustChip label="Verified" /> : null}
          {!job.verified && job.student_friendly ? <TrustChip label="Student Friendly" /> : null}
        </View>

        {/* action */}
        <View style={{ alignItems: 'flex-end' }}>
          <Button title="View Details" fullWidth={false} onPress={onPress} />
        </View>
      </View>
    </Pressable>
  );
}
