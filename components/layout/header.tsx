"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ConnectWalletButton } from "@/components/web3/connect-wallet-button"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import Image from "next/image" // Importe o componente Image do Next.js

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/my/campaigns", label: "My Campaigns" },
  { href: "/my/donations", label: "My Donations" },
  { href: "/docs", label: "Docs" },
]

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            {/* Substitua o texto pelos spans pela tag Image */}
            <Image
              src="/crowdmint-logo.png" // Caminho para a sua imagem na pasta public
              alt="CrowdMint Logo"
              width={200} // Defina a largura desejada para o logo
              height={50} // Defina a altura desejada para o logo
              priority // Opcional: para carregar a imagem com alta prioridade
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-deep-trust",
                  pathname === link.href ? "text-deep-trust" : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden md:block">
              <ConnectWalletButton />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-deep-trust px-2 py-2",
                    pathname === link.href ? "text-deep-trust bg-muted rounded-md" : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 px-2">
                <ConnectWalletButton />
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}
