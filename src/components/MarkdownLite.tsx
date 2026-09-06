import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from '@/components/ui';

/**
 * Deliberately tiny markdown renderer for our static legal docs. Supports:
 * `#`/`##`/`###`/`####` headings, `-`/`*` bullets, `**bold**` inline spans,
 * `---` dividers, and blank-line-separated paragraphs. Nothing else.
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

/** Split a string on `**bold**` and render the bold runs with weight 700. */
function Rich({ text, color, size }: { text: string; color?: string; size?: number }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text variant="body" color={color} style={size ? { fontSize: size, lineHeight: size * 1.5 } : undefined}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} weight="700" color={color} style={size ? { fontSize: size } : undefined}>
            {p.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i} color={color} style={size ? { fontSize: size } : undefined}>
            {p}
          </Text>
        ),
      )}
    </Text>
  );
}

export function MarkdownLite({ content }: { content: string }) {
  const theme = useTheme();
  const blocks = useMemo(() => parse(content), [content]);

  return (
    <View style={{ gap: theme.spacing.md }}>
      {blocks.map((b, i) => {
        if (b.kind === 'hr') {
          return <View key={i} style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.sm }} />;
        }
        if (b.kind === 'h') {
          const fontSize = b.level === 1 ? 24 : b.level === 2 ? 19 : b.level === 3 ? 16 : 14;
          return (
            <Text
              key={i}
              variant="h3"
              style={{
                fontSize,
                lineHeight: fontSize * 1.3,
                marginTop: b.level <= 2 ? theme.spacing.md : theme.spacing.xs,
              }}
            >
              {b.text.replace(/\*\*/g, '')}
            </Text>
          );
        }
        if (b.kind === 'li') {
          return (
            <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingLeft: theme.spacing.xs }}>
              <Text variant="body" color={theme.colors.textTertiary} style={{ lineHeight: 21 }}>
                •
              </Text>
              <View style={{ flex: 1 }}>
                <Rich text={b.text} color={theme.colors.textSecondary} />
              </View>
            </View>
          );
        }
        return (
          <View key={i}>
            <Rich text={b.text} color={theme.colors.textSecondary} />
          </View>
        );
      })}
    </View>
  );
}
