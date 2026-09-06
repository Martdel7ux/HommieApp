import { useMemo } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';

/**
 * Renders one legal doc (Terms or Privacy) as the card-per-section layout:
 * a "SECTION N" eyebrow + icon, the heading, then the body (paragraphs,
 * bullets, `###` sub-blocks, `**bold**`). Content is plain markdown from
 * `src/content/legal.ts` — this component owns all the styling.
 */

const SECTION_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'shield-checkmark',
  'person-circle',
  'id-card',
  'home',
  'people',
  'chatbubbles',
  'document-text',
  'happy',
  'walk',
  'megaphone',
  'sparkles',
  'globe',
  'server',
  'ribbon',
  'shield',
  'card',
  'log-out',
  'alert-circle',
  'scale',
  'refresh',
  'lock-closed',
  'mail',
  'help-circle',
];

export interface ParsedSection {
  /** "1", "2", … from `## 1. Title` */
  number: string;
  /** "Introduction & Platform Scope" */
  title: string;
  body: string;
}

export interface ParsedDoc {
  intro: string;
  sections: ParsedSection[];
}

export function parseLegalDoc(md: string): ParsedDoc {
  const chunks = md.split(/\n(?=## )/);
  const sections: ParsedSection[] = [];
  let intro = '';

  const stripRules = (s: string) =>
    s
      .replace(/\n\s*-{3,}\s*$/g, '')
      .replace(/^\s*-{3,}\s*\n/g, '')
      .trim();

  chunks.forEach((chunk, i) => {
    if (i === 0 && !chunk.startsWith('## ')) {
      intro = stripRules(chunk);
      return;
    }
    const firstNl = chunk.indexOf('\n');
    const headerLine = (firstNl === -1 ? chunk : chunk.slice(0, firstNl)).replace(/^##\s+/, '').trim();
    const body = firstNl === -1 ? '' : stripRules(chunk.slice(firstNl + 1));
    const m = headerLine.match(/^(\d+)\.\s+(.*)$/);
    sections.push(
      m ? { number: m[1], title: m[2].trim(), body } : { number: String(sections.length + 1), title: headerLine, body },
    );
  });

  return { intro, sections };
}

// ---------------------------------------------------------------------------
// Body rendering
// ---------------------------------------------------------------------------

type Block =
  | { kind: 'p'; text: string }
  | { kind: 'li'; text: string }
  | { kind: 'sub'; title: string; blocks: Block[] };

function parseBody(md: string): Block[] {
  const out: Block[] = [];
  let para: string[] = [];
  let sub: { title: string; blocks: Block[] } | null = null;

  const target = () => (sub ? sub.blocks : out);
  const flushPara = () => {
    if (para.length) {
      target().push({ kind: 'p', text: para.join(' ').trim() });
      para = [];
    }
  };
  const flushSub = () => {
    flushPara();
    if (sub) {
      out.push({ kind: 'sub', title: sub.title, blocks: sub.blocks });
      sub = null;
    }
  };

  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (line === '') {
      flushPara();
      continue;
    }
    const heading = line.match(/^#{3,4}\s+(.*)$/);
    if (heading) {
      flushSub();
      sub = { title: heading[1].replace(/\*\*/g, '').trim(), blocks: [] };
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      flushPara();
      target().push({ kind: 'li', text: bullet[1].trim() });
      continue;
    }
    para.push(line);
  }
  flushSub();
  return out;
}

function Inline({ text, muted }: { text: string; muted?: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text variant="body" muted={muted} style={{ lineHeight: 22 }}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} variant="body" weight="600" style={{ lineHeight: 22 }}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

function Blocks({ blocks }: { blocks: Block[] }) {
  const theme = useTheme();
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'p') {
          return (
            <View key={i} style={{ marginTop: i === 0 ? 0 : theme.spacing.sm }}>
              <Inline text={b.text} muted />
            </View>
          );
        }
        if (b.kind === 'li') {
          return (
            <View
              key={i}
              style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs, paddingLeft: 2 }}
            >
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.primary,
                  marginTop: 8,
                }}
              />
              <View style={{ flex: 1 }}>
                <Inline text={b.text} muted />
              </View>
            </View>
          );
        }
        // sub-block → tinted inner card
        return (
          <View
            key={i}
            style={{
              marginTop: theme.spacing.md,
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.md,
              gap: 2,
            }}
          >
            <Text variant="label" style={{ marginBottom: 2 }}>
              {b.title}
            </Text>
            <Blocks blocks={b.blocks} />
          </View>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------

function SectionCard({
  section,
  index,
  onLayout,
}: {
  section: ParsedSection;
  index: number;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const theme = useTheme();
  const blocks = useMemo(() => parseBody(section.body), [section.body]);
  const icon = SECTION_ICONS[index % SECTION_ICONS.length];

  return (
    <View
      onLayout={onLayout}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        gap: theme.spacing.sm,
        ...theme.shadows.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.primarySubtle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={16} color={theme.colors.primary} />
        </View>
        <Text variant="overline" color={theme.colors.primary}>
          Section {section.number}
        </Text>
      </View>

      <Text variant="h3" style={{ marginTop: 2 }}>
        {section.number}. {section.title}
      </Text>

      <View style={{ marginTop: theme.spacing.xs }}>
        <Blocks blocks={blocks} />
      </View>
    </View>
  );
}

export function LegalDocument({
  doc,
  onSectionOffsets,
}: {
  doc: ParsedDoc;
  /** Reports each section card's y (relative to this component's top). */
  onSectionOffsets: (ys: number[]) => void;
}) {
  const theme = useTheme();
  const ys: number[] = [];

  return (
    <View style={{ gap: theme.spacing.lg }}>
      {doc.sections.map((s, i) => (
        <SectionCard
          key={s.number + s.title}
          section={s}
          index={i}
          onLayout={(e) => {
            ys[i] = e.nativeEvent.layout.y;
            if (ys.filter((y) => y !== undefined).length === doc.sections.length) onSectionOffsets([...ys]);
          }}
        />
      ))}
    </View>
  );
}
