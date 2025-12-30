import type React from "react"
import type { Metadata } from "next"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { DocsSidebar } from "@/components/docs/docs-sidebar"
import { DocsSearch } from "@/components/docs/docs-search"
import { getDocsNavigation, generateSearchIndex } from "@/lib/docs"

export const metadata: Metadata = {
  title: "Documentation | CrowdMint",
  description: "Learn how to use CrowdMint and understand our crowdfunding platform.",
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navigation = getDocsNavigation()
  const searchIndex = generateSearchIndex()

  return (
    <div className="flex gap-8 max-w-7xl mx-auto px-4 py-8">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-56 flex-shrink-0">
        <div className="sticky top-24 space-y-6">
          <DocsSearch searchIndex={searchIndex} />
          <Separator />
          <ScrollArea className="h-[calc(100vh-300px)]">
            <DocsSidebar navigation={navigation} />
          </ScrollArea>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
