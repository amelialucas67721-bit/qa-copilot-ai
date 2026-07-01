import { parsePageContent } from '@/lib/page-content';

type PageContentProps = {
  content: string;
  emptyMessage?: string;
};

export function PageContent({
  content,
  emptyMessage = 'This page has no content yet.',
}: PageContentProps) {
  const blocks = parsePageContent(content);

  if (blocks.length === 0) {
    return <p className="text-white/40">{emptyMessage}</p>;
  }

  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const className =
            block.level === 2
              ? 'text-xl font-bold text-white mb-3 mt-8 first:mt-0'
              : 'text-lg font-bold text-white mb-2 mt-6 first:mt-0';

          return block.level === 2 ? (
            <h2 key={index} className={className}>
              {block.text}
            </h2>
          ) : (
            <h3 key={index} className={className}>
              {block.text}
            </h3>
          );
        }

        if (block.type === 'section') {
          return (
            <div key={index} className="mb-6 last:mb-0">
              <p className="font-bold text-white mb-2">{block.heading}</p>
              <p className="text-white/70 leading-relaxed whitespace-pre-line">{block.body}</p>
            </div>
          );
        }

        if (!block.text) return null;

        return (
          <p
            key={index}
            className="text-white/70 leading-relaxed mb-4 last:mb-0 whitespace-pre-line"
          >
            {block.text}
          </p>
        );
      })}
    </>
  );
}
