import type React from "react"
import type { Metadata } from "next"
import { Poppins, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { Web3Provider } from "@/components/providers/web3-provider"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "CrowdMint - Decentralized Crowdfunding",
  description:
    "CrowdMint connects communities and capital with transparent smart contracts. Back campaigns with stablecoins and earn sustainable yield.",
  keywords: ["crowdfunding", "web3", "blockchain", "defi", "crypto"],
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Web3Provider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </Web3Provider>
        </ThemeProvider>
        <Toaster position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}
