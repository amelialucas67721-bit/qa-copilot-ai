'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FooterColumn, FooterContent } from '@/lib/footer-content';
import { DEFAULT_FOOTER_CONTENT } from '@/lib/footer-content';
import {
  DEFAULT_SITE_PAGES,
  pageHref,
  slugifyLabel,
  type SitePageInput,
} from '@/lib/site-pages-content';

const emptyColumn = (): FooterColumn => ({
  title: '',
  links: [{ label: '', href: '#', pageSlug: '' }],
});

type PagesState = Record<string, SitePageInput>;

function defaultPageForSlug(slug: string, label: string): SitePageInput {
  return (
    DEFAULT_SITE_PAGES[slug] ?? {
      title: label || slug,
      content: '',
    }
  );
}

export default function FooterAdminPage() {
  const [footer, setFooter] = useState<FooterContent>(DEFAULT_FOOTER_CONTENT);
  const [pages, setPages] = useState<PagesState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/footer')
      .then((res) => res.json())
      .then((data) => {
        if (data.footer) setFooter(data.footer);
        if (data.pages) setPages(data.pages);
      })
      .catch(() => {
        setToast({ type: 'error', msg: 'Failed to load footer content' });
      })
      .finally(() => setLoading(false));
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const updateColumn = (index: number, patch: Partial<FooterColumn>) => {
    setFooter((prev) => ({
      ...prev,
      columns: prev.columns.map((col, i) => (i === index ? { ...col, ...patch } : col)),
    }));
  };

  const updateLink = (
    colIndex: number,
    linkIndex: number,
    field: 'label' | 'href' | 'pageSlug',
    value: string
  ) => {
    if (field === 'label') {
      const slug = slugifyLabel(value);
      if (slug) {
        setPages((current) => ({
          ...current,
          [slug]: current[slug] ?? defaultPageForSlug(slug, value),
        }));
      }
    }

    if (field === 'pageSlug') {
      const slug = value.trim();
      if (slug) {
        setPages((current) => ({
          ...current,
          [slug]:
            current[slug] ??
            defaultPageForSlug(
              slug,
              footer.columns[colIndex]?.links[linkIndex]?.label || slug
            ),
        }));
      }
    }

    setFooter((prev) => ({
      ...prev,
      columns: prev.columns.map((col, i) =>
        i === colIndex
          ? {
              ...col,
              links: col.links.map((link, j) => {
                if (j !== linkIndex) return link;
                const next = { ...link, [field]: value };
                if (field === 'label' && !link.pageSlug) {
                  const slug = slugifyLabel(value);
                  if (slug) {
                    next.pageSlug = slug;
                    next.href = pageHref(slug);
                  }
                }
                if (field === 'pageSlug') {
                  const slug = value.trim();
                  next.href = slug ? pageHref(slug) : '#';
                }
                return next;
              }),
            }
          : col
      ),
    }));
  };

  const updatePage = (slug: string, field: keyof SitePageInput, value: string) => {
    setPages((prev) => ({
      ...prev,
      [slug]: {
        ...(prev[slug] ?? defaultPageForSlug(slug, slug)),
        [field]: value,
      },
    }));
  };

  const addColumn = () => {
    setFooter((prev) => ({ ...prev, columns: [...prev.columns, emptyColumn()] }));
  };

  const removeColumn = (index: number) => {
    setFooter((prev) => ({
      ...prev,
      columns: prev.columns.filter((_, i) => i !== index),
    }));
  };

  const addLink = (colIndex: number) => {
    setFooter((prev) => ({
      ...prev,
      columns: prev.columns.map((col, i) =>
        i === colIndex
          ? { ...col, links: [...col.links, { label: '', href: '#', pageSlug: '' }] }
          : col
      ),
    }));
  };

  const removeLink = (colIndex: number, linkIndex: number) => {
    setFooter((prev) => ({
      ...prev,
      columns: prev.columns.map((col, i) =>
        i === colIndex
          ? { ...col, links: col.links.filter((_, j) => j !== linkIndex) }
          : col
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/footer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ footer, pages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setFooter(data.footer);
      if (data.pages) setPages(data.pages);
      showToast('success', 'Footer and page content updated successfully');
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Footer Content</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edit footer columns, link labels, and the page content visitors see when they click each
            link.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-rose-600 hover:bg-rose-500 text-white"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 mb-6 p-4 rounded-xl text-sm ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toast.msg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Branding</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Brand name</label>
            <input
              value={footer.brandName}
              onChange={(e) => setFooter((prev) => ({ ...prev, brandName: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Copyright line</label>
            <input
              value={footer.copyright}
              onChange={(e) => setFooter((prev) => ({ ...prev, copyright: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Columns</h2>
          <Button type="button" variant="outline" size="sm" onClick={addColumn}>
            <Plus className="w-4 h-4 mr-1" /> Add column
          </Button>
        </div>

        {footer.columns.map((column, colIndex) => (
          <div key={colIndex} className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1.5">
                  Column title
                </label>
                <input
                  value={column.title}
                  onChange={(e) => updateColumn(colIndex, { title: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-7 text-rose-600 border-rose-200 hover:bg-rose-50"
                onClick={() => removeColumn(colIndex)}
                disabled={footer.columns.length <= 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {column.links.map((link, linkIndex) => {
                const slug = link.pageSlug?.trim() || '';
                const page = slug ? pages[slug] ?? defaultPageForSlug(slug, link.label) : null;

                return (
                  <div
                    key={linkIndex}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 space-y-3"
                  >
                    <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Link label
                        </label>
                        <input
                          value={link.label}
                          onChange={(e) =>
                            updateLink(colIndex, linkIndex, 'label', e.target.value)
                          }
                          placeholder="e.g. Privacy Policy"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Page slug
                        </label>
                        <input
                          value={link.pageSlug || ''}
                          onChange={(e) =>
                            updateLink(colIndex, linkIndex, 'pageSlug', e.target.value)
                          }
                          placeholder="e.g. privacy"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="self-end"
                        onClick={() => removeLink(colIndex, linkIndex)}
                        disabled={column.links.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {slug ? (
                      <div className="space-y-3 pt-1">
                        <p className="text-xs text-gray-500">
                          Public page:{' '}
                          <a
                            href={pageHref(slug)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-rose-600 hover:underline"
                          >
                            {pageHref(slug)}
                          </a>
                        </p>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Page title
                          </label>
                          <input
                            value={page?.title || ''}
                            onChange={(e) => updatePage(slug, 'title', e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Page content
                          </label>
                          <p className="text-xs text-gray-400 mb-2">
                            Headings render bold. Use <code className="text-gray-600"># Heading</code>{' '}
                            or put a title on its own line above the paragraph.
                          </p>
                          <textarea
                            value={page?.content || ''}
                            onChange={(e) => updatePage(slug, 'content', e.target.value)}
                            rows={6}
                            placeholder="Use blank lines between sections. Start a line with # for a bold heading, or put a heading on its own line followed by body text."
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-y min-h-[120px]"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          External URL (optional)
                        </label>
                        <input
                          value={link.href === '#' ? '' : link.href}
                          onChange={(e) =>
                            updateLink(colIndex, linkIndex, 'href', e.target.value || '#')
                          }
                          placeholder="https://example.com or leave blank"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => addLink(colIndex)}
            >
              <Plus className="w-4 h-4 mr-1" /> Add link
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
