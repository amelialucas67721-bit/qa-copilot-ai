export type PageContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'section'; heading: string; body: string }
  | { type: 'paragraph'; text: string };

export function parsePageContent(content: string): PageContentBlock[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  return trimmed.split('\n\n').map((block) => {
    const text = block.trim();
    if (!text) return { type: 'paragraph' as const, text: '' };

    if (text.startsWith('## ')) {
      return { type: 'heading' as const, level: 3, text: text.slice(3).trim() };
    }
    if (text.startsWith('# ')) {
      return { type: 'heading' as const, level: 2, text: text.slice(2).trim() };
    }

    const lines = text.split('\n');
    if (lines.length > 1) {
      const [heading, ...rest] = lines;
      const body = rest.join('\n').trim();
      if (heading.trim() && body) {
        return { type: 'section' as const, heading: heading.trim(), body };
      }
    }

    return { type: 'paragraph' as const, text };
  });
}
