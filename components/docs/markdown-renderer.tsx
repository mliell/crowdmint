"use client"

import { useEffect, useState } from "react"

interface MarkdownRendererProps {
  htmlContent: string
}

export function MarkdownRenderer({ htmlContent }: MarkdownRendererProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="animate-pulse bg-muted h-96 rounded" />
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <style>{`
        .prose {
          --tw-prose-body: var(--foreground);
          --tw-prose-headings: var(--foreground);
          --tw-prose-lead: var(--muted-foreground);
          --tw-prose-links: var(--deep-trust);
          --tw-prose-bold: var(--foreground);
          --tw-prose-counters: var(--muted-foreground);
          --tw-prose-bullets: var(--border);
          --tw-prose-hr: var(--border);
          --tw-prose-quotes: var(--muted-foreground);
          --tw-prose-quote-borders: var(--border);
          --tw-prose-captions: var(--muted-foreground);
          --tw-prose-code: var(--foreground);
          --tw-prose-pre-code: var(--foreground);
          --tw-prose-pre-bg: var(--muted);
          --tw-prose-th-borders: var(--border);
          --tw-prose-td-borders: var(--border);
          --tw-prose-th-bg: var(--muted);
        }

        .prose h1, .prose h2, .prose h3, .prose h4, .prose h5, .prose h6 {
          color: var(--foreground);
          font-weight: 700;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          scroll-margin-top: 80px;
        }

        .prose h1 { font-size: 2em; }
        .prose h2 { font-size: 1.5em; color: var(--deep-trust); }
        .prose h3 { font-size: 1.25em; }
        .prose h4 { font-size: 1.1em; }

        .prose a {
          color: var(--deep-trust);
          text-decoration: none;
          font-weight: 500;
        }

        .prose a:hover {
          color: var(--mint-pulse);
          text-decoration: underline;
        }

        .prose code {
          background: var(--muted);
          color: var(--foreground);
          padding: 0.125em 0.375em;
          border-radius: 0.25em;
          font-family: var(--font-mono);
          font-size: 0.875em;
        }

        .prose pre {
          background: var(--muted);
          color: var(--foreground);
          padding: 1em;
          border-radius: 0.5em;
          overflow-x: auto;
          border: 1px solid var(--border);
        }

        .prose pre code {
          background: none;
          color: inherit;
          padding: 0;
          border-radius: 0;
          font-size: inherit;
        }

        .prose blockquote {
          border-left-color: var(--deep-trust);
          color: var(--muted-foreground);
          background: var(--muted);
          padding: 0.5em 1em;
          border-radius: 0.25em;
          line-height: 1.5;
          margin-bottom: 1em;
        }

        .prose table {
          border-collapse: collapse;
          width: 100%;
          margin: 1em 0;
        }

        .prose table th,
        .prose table td {
          padding: 0.75em;
          border: 1px solid var(--border);
          text-align: left;
        }

        .prose table th {
          background: var(--muted);
          font-weight: 600;
        }

        .prose ul { /* Estilos para listas não ordenadas */
          margin: 1em 0;
          padding-left: 2em;
          list-style-type: disc;
          line-height: 1.75;
        }

        .prose ol { /* Estilos para listas ordenadas */
          margin: 1em 0;
          padding-left: 2em;
          list-style-type: decimal;
          line-height: 1.75;
        }

        .prose li {
          margin: 0.5em 0;
          line-height: 1.75;
        }

        .prose p { 
          line-height: 1.75;
          margin-bottom: 1em; 
        }

        .anchor-link {
          text-decoration: none;
          color: inherit;
        }

        .anchor-link:hover {
          color: var(--mint-pulse);
        }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  )
}
