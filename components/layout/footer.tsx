import Link from "next/link"
import Image from "next/image"
import { Github, Twitter } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Logo & Description */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center">
              <Image
                src="/crowdmint-logo.png"
                alt="CrowdMint Logo"
                width={150}
                height={50}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Crowd Together, Mint Forever — decentralized crowdfunding with
              sustainable incentives.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-3 md:items-center">
            <h3 className="text-sm font-semibold text-foreground">Platform</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="/campaigns"
                className="text-sm text-muted-foreground transition-colors hover:text-deep-trust"
              >
                Explore Campaigns
              </Link>
              <Link
                href="/campaigns/new"
                className="text-sm text-muted-foreground transition-colors hover:text-deep-trust"
              >
                Create Campaign
              </Link>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex flex-col gap-3 md:items-end">
            <h3 className="text-sm font-semibold text-foreground">Connect</h3>
            <div className="flex items-center gap-4">
              <Link
                href="https://x.com/CrowdMintLive"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-deep-trust"
                aria-label="Follow us on X"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://github.com/mliell/crowdmint"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-deep-trust"
                aria-label="View source on GitHub"
              >
                <Github className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} CrowdMint. Built on Arc Network. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
