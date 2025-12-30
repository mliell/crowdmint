"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface DocPage {
  slug: string
  title: string
}

interface DocNavigation {
  section: string
  pages: DocPage[]
}

interface DocsSidebarProps {
  navigation: DocNavigation[]
}

export function DocsSidebar({ navigation }: DocsSidebarProps) {
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(navigation.map((nav) => nav.section)))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  return (
    <div className="space-y-6 py-4">
      {navigation.map((nav) => (
        <div key={nav.section} className="space-y-2">
          <button
            onClick={() => toggleSection(nav.section)}
            className="flex items-center gap-2 w-full px-2 py-1 text-sm font-semibold text-foreground hover:text-deep-trust transition-colors"
          >
            {expandedSections.has(nav.section) ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {nav.section}
          </button>

          {expandedSections.has(nav.section) && (
            <div className="space-y-1">
              {nav.pages.map((page) => {
                const isActive = pathname === `/docs/${page.slug}`
                return (
                  <Link
                    key={page.slug}
                    href={`/docs/${page.slug}`}
                    className={cn(
                      "block px-3 py-2 rounded text-sm transition-colors truncate",
                      isActive
                        ? "bg-mint-pulse/10 text-mint-pulse font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                  >
                    {page.title}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
