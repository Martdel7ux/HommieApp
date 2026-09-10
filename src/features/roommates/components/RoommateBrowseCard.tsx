import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text, Button } from '@/components/ui';
import type { StudyLevel } from '@/types/database';
import type { RoommateMatch } from '../types';

const SHORT_LEVEL: Record<StudyLevel, string> = {
  foundation: 'Foundation',
  undergraduate_y1: 'Year 1',
  undergraduate_y2: 'Year 2',
  undergraduate_y3: 'Year 3',
  undergraduate_y4: 'Year 4',
  postgraduate: 'Masters',
  phd: 'PhD',
  erasmus_exchange: 'Erasmus',
};

const TAG_LABELS: Record<string, string> = {
  non_smoker: 'Non-smoker',
  clean: 'Tidy',
  studious: 'Studious',
  quiet: 'Quiet',
  sociable: 'Social',
  pet_lover: 'Pet friendly',
  cook: 'Loves cooking',
  early_riser: 'Early Bird',
};

function prettyTag(tag: string): string {
  return TAG_LABELS[tag] ?? tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayTags(r: RoommateMatch): string[] {
  const tags: string[] = [];
  if (r.sleep_schedule === 'early_bird') tags.push('Early Bird');
  else if (r.sleep_schedule === 'night_owl') tags.push('Night Owl');
  if (r.smoking === 'no') tags.push('Non-smoker');
  if (r.social_level === 'very_social') tags.push('Social');
  else if (r.social_level === 'homebody') tags.push('Homebody');
  for (const t of r.lifestyle_tags) {
    if (tags.length >= 3) break;
    const label = prettyTag(t);
    if (!tags.includes(label)) tags.push(label);
  }
  return tags.slice(0, 3);
}

export function RoommateBrowseCard({
  match,
  sending,
  onPress,
  onMessage,
}: {
  match: RoommateMatch;
  sending?: boolean;
  onPress: () => void;
  onMessage: () => void;
}) {
  const theme = useTheme();
  const p = match.profile;
  const first = p?.first_name ?? p?.display_name ?? 'Student';
  const initial = p?.last_name ? ` ${p.last_name[0]}.` : '';
  const name = match.age ? `${first}${initial}, ${match.age}` : `${first}${initial}`;
  const uni = match.university?.short_name ?? match.university?.name ?? null;
  const level = p?.study_level ? SHORT_LEVEL[p.study_level] : null;
  const context = [uni, level].filter(Boolean).join('  •  ');
  const budget = match.budget_max ?? match.budget_min;
  const tags = displayTags(match);
  const { score, pending } = match.compatibility;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        pending || score === 0
          ? name
          : `${name}. ${score}% estimated match. ${match.compatibility.reasons.join(', ')}`
      }
      style={({ pressed }) => ({ borderRadius: theme.radius.xl, opacity: pressed ? 0.97 : 1, ...theme.shadows.sm })}
    >
      <View
        style={{
          borderRadius: theme.radius.xl,
          overflow: 'hidden',
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      >
        <View>
          {p?.avatar_url ? (
            <Image
              source={{ uri: p.avatar_url }}
              style={{ width: '100%', height: 210 }}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: 210,
                backgroundColor: theme.colors.primarySubtle,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="person" size={54} color={theme.colors.primary} />
            </View>
          )}

          {score > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: theme.spacing.md,
                right: theme.spacing.md,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: theme.colors.success,
                borderRadius: theme.radius.pill,
                paddingHorizontal: 10,
                paddingVertical: 6,
              }}
            >
              <Ionicons name="heart" size={12} color="#FFFFFF" />
              <Text style={{ fontSize: 12.5, fontWeight: '700' }} color="#FFFFFF">
                {score}% Match
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text variant="h3" numberOfLines={1}>
                {name}
              </Text>
              {context ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="school-outline" size={14} color={theme.colors.textTertiary} />
                  <Text variant="bodySm" muted numberOfLines={1}>
                    {context}
                  </Text>
                </View>
              ) : null}
            </View>
            {budget != null ? (
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="h3" color={theme.colors.primary}>
                  €{budget}
                </Text>
                <Text variant="caption" muted>
                  Max budget
                </Text>
              </View>
            ) : null}
          </View>

          {tags.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {tags.map((t) => (
                <View
                  key={t}
                  style={{
                    backgroundColor: theme.colors.primarySubtle,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <Text variant="caption" color={theme.colors.primarySubtleInk}>
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={{ height: 1, backgroundColor: theme.colors.border, marginTop: 2 }} />

          <Button
            title="Message"
            loading={sending}
            onPress={onMessage}
            leftIcon={<Ionicons name="chatbubble-outline" size={16} color={theme.colors.onPrimary} />}
          />
        </View>
      </View>
    </Pressable>
  );
}
