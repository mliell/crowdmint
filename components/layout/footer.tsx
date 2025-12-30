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

          {/* Navigation & Social Links */}
          <div className="flex flex-col items-center gap-4 md:items-end">
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
              <Link
                href="/docs"
                className="text-sm text-muted-foreground transition-colors hover:text-deep-trust"
              >
                Docs
              </Link>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              <Link
                href="https://x.com/CrowdMintLive"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-deep-trust"
                aria-label="Follow us on X"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>X / Twitter</span>
              </Link>

              <Link
                href="https://github.com/mliell/crowdmint"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-deep-trust"
                aria-label="View source on GitHub"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>GitHub</span>
              </Link>
            </div>
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
