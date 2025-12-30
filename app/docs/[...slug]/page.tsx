// app/docs/[...slug]/page.tsx

import { notFound } from "next/navigation"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { DocsToc } from "@/components/docs/docs-toc"
import { MarkdownRenderer } from "@/components/docs/markdown-renderer"
import { getDocBySlug, getAllDocs, getAdjacentDocs } from "@/lib/docs"
import { renderMarkdown } from "@/lib/markdown"
import { extractHeadings } from "@/lib/markdown"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface DocsPageProps {
  params: Promise<{ slug: string[] }>
}

export async function generateStaticParams() {
  const docs = getAllDocs()
  return docs.map((doc) => ({
    slug: doc.slug.split("/"),
  }))
}

export async function generateMetadata({ params }: DocsPageProps) {
  const { slug } = await params
  const slugPath = slug.join("/")
  const doc = getDocBySlug(slugPath)

  if (!doc) {
    return {
      title: "Page Not Found",
    }
  }

  return {
    title: `${doc.title} | Documentation | CrowdMint`,
    description: doc.description || "CrowdMint documentation page",
  }
}

export default async function DocPage({ params }: DocsPageProps) {
  const { slug } = await params
  const slugPath = slug.join("/")
  const doc = getDocBySlug(slugPath)

  if (!doc) {
    notFound()
  }

  const htmlContent = await renderMarkdown(doc.content)
  const headings = extractHeadings(doc.content)
  const { previous, next } = getAdjacentDocs(slugPath)

  return (
    <article className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {doc.section && (
            <>
              <span>{doc.section}</span>
              <span className="mx-2">/</span>
            </>
          )}
          <span className="text-foreground font-medium">{doc.title}</span>
        </div>
        <h1 className="text-4xl font-bold text-foreground">{doc.title}</h1>
        {doc.description && <p className="text-lg text-muted-foreground">{doc.description}</p>}
      </div>

      <Separator />

      {/* Content */}
      <div className="flex gap-8">
        <div className="flex-1 min-w-0">
          <MarkdownRenderer htmlContent={htmlContent} />
        </div>

        {/* TOC Sidebar */}
        {headings.length > 0 && (
          <aside className="hidden lg:block w-48 flex-shrink-0">
            <div className="sticky top-24">
              <DocsToc headings={headings} />
            </div>
          </aside>
        )}
      </div>

      <Separator className="mt-12" />

      {/* Navigation */}
      <div className="flex gap-4 justify-between">
        {previous ? (
          <Link href={`/docs/${previous.slug}`}>
            <Button variant="outline" className="gap-2 bg-transparent">
              <ChevronLeft className="h-4 w-4" />
              {previous.title}
            </Button>
          </Link>
        ) : (
          <div />
        )}

        {next ? (
          <Link href={`/docs/${next.slug}`}>
            <Button variant="outline" className="gap-2 bg-transparent">
              {next.title}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </article>
  )
}
