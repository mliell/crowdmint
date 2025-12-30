"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"
import Fuse from "fuse.js"
import { Input } from "@/components/ui/input"

interface SearchIndex {
  slug: string
  title: string
  description?: string
  section?: string
  content: string
}

interface DocsSearchProps {
  searchIndex: SearchIndex[]
}

export function DocsSearch({ searchIndex }: DocsSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Fuse.FuseResult<SearchIndex>[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [fuseInstance, setFuseInstance] = useState<Fuse<SearchIndex> | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fuse = new Fuse(searchIndex, {
      keys: ["title", "description", "content"],
      threshold: 0.3,
      minMatchCharLength: 2,
    })
    setFuseInstance(fuse)
  }, [searchIndex])

  useEffect(() => {
    if (query.trim() && fuseInstance) {
      const searchResults = fuseInstance.search(query).slice(0, 8)
      setResults(searchResults)
      setIsOpen(true)
    } else {
      setResults([])
      setIsOpen(false)
    }
  }, [query, fuseInstance])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          className="pl-9 pr-8 bg-muted/50"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("")
              setIsOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="max-h-96 overflow-y-auto">
            {results.map((result) => (
              <Link
                key={result.item.slug}
                href={`/docs/${result.item.slug}`}
                onClick={() => {
                  setQuery("")
                  setIsOpen(false)
                }}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0"
              >
                <div className="text-sm font-semibold text-foreground">{result.item.title}</div>
                {result.item.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">{result.item.description}</div>
                )}
                {result.item.section && <div className="text-xs text-muted-foreground">{result.item.section}</div>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 px-4 py-6 text-center text-muted-foreground text-sm">
          No results found for "{query}"
        </div>
      )}
    </div>
  )
}
