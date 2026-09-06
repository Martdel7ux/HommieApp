import { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';

/**
 * Deliberately tiny markdown renderer for our static legal docs. Supports:
 * `#`/`##`/`###`/`####` headings, `-`/`*` bullets, `**bold**` inline spans,
 * `---` dividers, and blank-line-separated paragraphs. Nothing else.
 *
 * Styling comes entirely from the app's type scale (`Text` variants) and
 * spacing tokens so these pages read like the rest of Hommie.
 */

type Block =
  | { kind: 'h'; level: number; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'li'; text: string }
  | { kind: 'hr' };

function parse(md: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];

  const flush = () => {
    if (para.length) {
      blocks.push({ kind: 'p', text: para.join(' ').trim() });
      para = [];
    }
  };

  for (const raw of md.split('\n')) {
    const line = raw.trimEnd();
    if (line.trim() === '') {
      flush();
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) {
      flush();
      blocks.push({ kind: 'hr' });
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flush();
      blocks.push({ kind: 'h', level: heading[1].length, text: heading[2].trim() });
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      flush();
      blocks.push({ kind: 'li', text: bullet[1].trim() });
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return blocks;
}

/** Render a line, splitting on `**bold**` runs into semibold spans. */
function Inline({ text, color, muted }: { text: string; color?: string; muted?: boolean }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text variant="body" color={color} muted={muted} style={{ lineHeight: 23 }}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} variant="body" weight="600" color={color} style={{ lineHeight: 23 }}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          p
        ),
      )}
    </Text>
  );
}

export function MarkdownLite({ content }: { content: string }) {
  const theme = useTheme();
  const blocks = useMemo(() => parse(content), [content]);

  return (
    <View>
      {blocks.map((b, i) => {
        if (b.kind === 'hr') {
          return (
            <View
              key={i}
              style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.xl }}
            />
          );
        }

        if (b.kind === 'h') {
          const clean = b.text.replace(/\*\*/g, '');
          // ## → section header; ### / #### → sub-header.
          if (b.level <= 2) {
            return (
              <Text
                key={i}
                variant="h3"
                style={{ marginTop: i === 0 ? 0 : theme.spacing.sm, marginBottom: theme.spacing.md }}
              >
                {clean}
              </Text>
            );
          }
          return (
            <Text
              key={i}
              variant="label"
              color={theme.colors.textPrimary}
              style={{
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.sm,
                letterSpacing: 0.2,
              }}
            >
              {clean}
            </Text>
          );
        }

        if (b.kind === 'li') {
          return (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: theme.spacing.sm,
                marginBottom: theme.spacing.xs,
                paddingLeft: theme.spacing.xs,
              }}
            >
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: theme.colors.textTertiary,
                  marginTop: 9,
                }}
              />
              <View style={{ flex: 1 }}>
                <Inline text={b.text} muted />
              </View>
            </View>
          );
        }

        return (
          <View key={i} style={{ marginBottom: theme.spacing.md }}>
            <Inline text={b.text} muted />
          </View>
        );
      })}
    </View>
  );
}
