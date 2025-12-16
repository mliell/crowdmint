import Link from "next/link"
import Image from "next/image"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          {/* Logo */}
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

          <div className="flex items-center gap-6">
            <Link
              href="/campaigns"
              className="text-sm text-muted-foreground transition-colors hover:text-deep-trust"
            >
              Explore
            </Link>
            <Link
              href="/campaigns/new"
              className="text-sm text-muted-foreground transition-colors hover:text-deep-trust"
            >
              Create
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground/70">
            © {new Date().getFullYear()} CrowdMint. Built on Arc Network. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
