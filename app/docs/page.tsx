import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDocsNavigation } from "@/lib/docs"
import { ArrowRight, BookOpen, Search, Zap } from "lucide-react"

export default function DocsPage() {
  const navigation = getDocsNavigation()

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="space-y-4">
        <h1 className="text-4xl font-bold text-deep-trust">Documentation</h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Welcome to CrowdMint documentation. Learn how to create campaigns, manage donations, and leverage the power of
          decentralized crowdfunding.
        </p>
      </section>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:border-mint-pulse/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-deep-trust" />
              <CardTitle className="text-base">Getting Started</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <CardDescription>Learn the basics of CrowdMint and get up to speed quickly.</CardDescription>
            <Link
              href="/docs/using/getting-started"
              className="text-deep-trust hover:text-mint-pulse font-medium text-sm inline-flex items-center gap-1"
            >
              Read guide <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-mint-pulse/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-deep-trust" />
              <CardTitle className="text-base">Create Campaigns</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <CardDescription>Step-by-step guide to launching your crowdfunding campaign.</CardDescription>
            <Link
              href="/docs/using/create-a-campaign"
              className="text-deep-trust hover:text-mint-pulse font-medium text-sm inline-flex items-center gap-1"
            >
              Start creating <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-mint-pulse/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-5 w-5 text-deep-trust" />
              <CardTitle className="text-base">Search Docs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <CardDescription>Use the search box to find answers quickly across all topics.</CardDescription>
            <p className="text-deep-trust hover:text-mint-pulse font-medium text-sm">Use Cmd+K / Ctrl+K</p>
          </CardContent>
        </Card>
      </div>

      {/* Browse by Section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Browse by Section</h2>
          <p className="text-muted-foreground">Explore documentation organized by topic.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {navigation.map((nav) => (
            <Card key={nav.section} className="hover:border-mint-pulse/30 transition-colors">
              <CardHeader>
                <CardTitle className="text-deep-trust">{nav.section}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {nav.pages.slice(0, 4).map((page) => (
                    <li key={page.slug}>
                      <Link
                        href={`/docs/${page.slug}`}
                        className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                      >
                        {page.title}
                      </Link>
                    </li>
                  ))}
                  {nav.pages.length > 4 && (
                    <li>
                      <span className="text-muted-foreground text-sm">+ {nav.pages.length - 4} more</span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
