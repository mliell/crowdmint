// lib/docs.ts

import fs from "fs"
import path from "path"
import matter from "gray-matter"

const docsDirectory = path.join(process.cwd(), "content/docs")

export interface DocFrontmatter {
  title: string
  description?: string
  section?: string
  order?: number
}

export interface DocPage {
  slug: string
  title: string
  description?: string
  content: string
  section?: string
  order?: number
}

export interface DocNavigation {
  section: string
  pages: DocPage[]
}

// Ordem das seções no menu lateral E na navegação
const SECTION_ORDER = [
  "Introduction",
  "Using CrowdMint",
  "Campaigns",
  "Security",
  "FAQ",
]

// Recursively read all markdown files
function getAllDocFiles(dir: string, baseDir = ""): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) {
    return files
  }

  const items = fs.readdirSync(dir)

  items.forEach((item) => {
    const fullPath = path.join(dir, item)
    const relPath = baseDir ? `${baseDir}/${item}` : item
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...getAllDocFiles(fullPath, relPath))
    } else if (item.endsWith(".md")) {
      files.push(relPath)
    }
  })

  return files
}

// Convert file path to slug
function pathToSlug(filePath: string): string {
  return filePath.replace(/\.md$/, "").toLowerCase()
}

// Get section order index
function getSectionOrderIndex(section: string): number {
  const index = SECTION_ORDER.indexOf(section)
  return index === -1 ? 999 : index
}

// Parse a single markdown file
export function getDocBySlug(slug: string): DocPage | null {
  const filePath = path.join(docsDirectory, `${slug}.md`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContents = fs.readFileSync(filePath, "utf8")
  const { data, content } = matter(fileContents)

  return {
    slug,
    title: data.title || "Untitled",
    description: data.description,
    section: data.section,
    order: data.order ?? 999,
    content,
  }
}

// Get all docs respeitando a ordem das seções
export function getAllDocs(): DocPage[] {
  if (!fs.existsSync(docsDirectory)) {
    return []
  }

  const files = getAllDocFiles(docsDirectory)
  const docs = files
    .map((file) => getDocBySlug(pathToSlug(file)))
    .filter((doc): doc is DocPage => doc !== null)

  // Ordenar por seção (respeitando SECTION_ORDER) e depois por order
  return docs.sort((a, b) => {
    const sectionA = a.section || "Getting Started"
    const sectionB = b.section || "Getting Started"

    // Primeiro ordena por seção
    const sectionOrderA = getSectionOrderIndex(sectionA)
    const sectionOrderB = getSectionOrderIndex(sectionB)

    if (sectionOrderA !== sectionOrderB) {
      return sectionOrderA - sectionOrderB
    }

    // Depois ordena por order dentro da mesma seção
    return (a.order ?? 999) - (b.order ?? 999)
  })
}

// Build navigation tree for sidebar
export function getDocsNavigation(): DocNavigation[] {
  const docs = getAllDocs()
  const navMap = new Map<string, DocPage[]>()

  // Agrupar docs por seção
  docs.forEach((doc) => {
    const section = doc.section || "Getting Started"
    if (!navMap.has(section)) {
      navMap.set(section, [])
    }
    navMap.get(section)!.push(doc)
  })

  // Ordenar seções de acordo com SECTION_ORDER
  const sortedSections = Array.from(navMap.entries()).sort(([sectionA], [sectionB]) => {
    return getSectionOrderIndex(sectionA) - getSectionOrderIndex(sectionB)
  })

  // Retornar navegação com páginas ordenadas por 'order'
  return sortedSections.map(([section, pages]) => ({
    section,
    pages: pages.sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
  }))
}

// Generate search index
export function generateSearchIndex(): Array<{
  slug: string
  title: string
  description?: string
  section?: string
  content: string
}> {
  const docs = getAllDocs()
  return docs.map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    section: doc.section,
    content: doc.content,
  }))
}

// Get previous and next docs for navigation (agora respeita SECTION_ORDER)
export function getAdjacentDocs(slug: string): { previous: DocPage | null; next: DocPage | null } {
  const docs = getAllDocs() // Já está ordenado corretamente
  const index = docs.findIndex((doc) => doc.slug === slug)

  return {
    previous: index > 0 ? docs[index - 1] : null,
    next: index < docs.length - 1 ? docs[index + 1] : null,
  }
}
