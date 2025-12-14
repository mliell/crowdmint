import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CampaignCard } from "@/components/campaign/campaign-card"
import { fetchFeaturedCampaigns } from "@/lib/campaigns"
import { ArrowRight, Sparkles, Wallet, TrendingUp, Users } from "lucide-react"
import Image from "next/image"


const howItWorksSteps = [
  {
    icon: Sparkles,
    title: "Create transparent campaigns",
    description:
      "Launch your project with clear goals and milestones, all recorded on-chain for full transparency.",
  },
  {
    icon: Wallet,
    title: "Fund with stablecoins",
    description:
      "Back campaigns using USDC through your Web3 wallet. No banks, no borders, no barriers.",
  },
  {
    icon: TrendingUp,
    title: "Unclaimed funds earn yield",
    description:
      "Funds not withdrawn after 6 months flow into a yield vault, generating sustainable returns for the ecosystem.",
  },
  {
    icon: Users,
    title: "Community benefits",
    description:
      "The community shares in the long-term value created through transparent, decentralized incentives.",
  },
]

export default async function HomePage() {
  const featuredCampaigns = await fetchFeaturedCampaigns()

  return (
    <div className="flex flex-col">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-deep-trust/5 via-background to-mint-pulse/5">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Left side - Copy */}
            <div className="flex flex-col gap-6">
              {/* Slogan badge */}
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-crowd-silver/60 bg-crowd-silver/60 px-3 py-1 text-xs font-medium text-carbon-clarity shadow-sm dark:border-crowd-silver/20 dark:bg-crowd-silver/10 dark:text-crowd-silver">
                <Sparkles className="h-3.5 w-3.5 text-mint-pulse" />
                <span>Crowd Together, Mint Forever</span>
              </div>

              <h1 className="text-balance text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
                <span className="text-deep-trust">Crowdfunding</span>{" "}
                <span className="text-foreground">that keeps</span>{" "}
                <span className="text-mint-pulse">rewarding</span>{" "}
                <span className="text-foreground">the crowd.</span>
              </h1>

              <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
                CrowdMint is a decentralized crowdfunding platform that unites
                community, Web3, and sustainable financial incentives. Back
                campaigns with USDC, track every move on-chain, and let
                unclaimed funds work in a yield vault for the ecosystem.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-mint-pulse text-white font-semibold hover:bg-mint-pulse/90"
                >
                  <Link href="/campaigns">
                    Explore Campaigns
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-deep-trust text-deep-trust font-semibold hover:bg-deep-trust/10"
                >
                  <Link href="/campaigns/new">Create a Campaign</Link>
                </Button>
              </div>

              {/* Trust signals / value props */}
              <div className="mt-2 grid gap-4 text-sm text-muted-foreground sm:grid-cols-3">
                <div>
                  <p className="font-semibold text-foreground">Built on Arc Network</p>
                  <p className="text-xs">
                    Fast, low-fee L2 environment for on-chain campaigns.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">USDC-native flows</p>
                  <p className="text-xs">
                    Stablecoin rails for predictable fundraising.
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-foreground">Vault-backed design</p>
                  <p className="text-xs">
                    Unclaimed funds routed to a shared yield vault.
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Visual */}
            <div className="relative">
              <div className="relative mx-auto max-w-md">
                {/* Logo/Brand visual */}
                <div className="flex aspect-square items-center justify-center rounded-3xl border border-border bg-gradient-to-br from-deep-trust/10 to-mint-pulse/10 p-8 shadow-xl">
                  <div className="text-center">
                    <Image
                      src="/CrowdMint-Logo-Text.png" // caminho na pasta public
                      alt="CrowdMint"
                      width={320}
                      height={320}
                      className="h-auto w-56 md:w-72 lg:w-80"
                      priority
                    />
                    <p className="text-sm text-muted-foreground">
                      Crowd Together, Mint Forever
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      Powered by Arc Network
                    </p>
                  </div>
                </div>

                {/* Floating stats card */}
                <Card className="absolute right-2 top-full -mt-2 md:right-4 md:-mt-1 shadow-lg">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-mint-pulse/10">
                        <TrendingUp className="h-5 w-5 text-mint-pulse" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vault APY</p>
                        <p className="text-xl font-bold text-vault-gold">Coming soon</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-background py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-deep-trust md:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              CrowdMint reimagines crowdfunding with on-chain transparency and a
              vault that gives unclaimed funds a second life, generating yield
              that can flow back to the community.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorksSteps.map((step, index) => (
              <Card
                key={index}
                className="transition-colors hover:border-mint-pulse/30"
              >
                <CardContent className="p-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-deep-trust/10 to-mint-pulse/10">
                    <step.icon className="h-7 w-7 text-deep-trust" />
                  </div>
                  <h3 className="mb-2 font-semibold text-deep-trust">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED CAMPAIGNS */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-deep-trust md:text-4xl">
                Featured Campaigns
              </h2>
              <p className="text-muted-foreground">
                Discover innovative projects already backed by the CrowdMint
                community.
              </p>
            </div>
            <Button
              asChild
              variant="outline"
              className="bg-transparent self-start border-deep-trust text-deep-trust hover:bg-deep-trust/10"
            >
              <Link href="/campaigns">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredCampaigns.map((campaign) => (
              <CampaignCard key={campaign.address} campaign={campaign} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-gradient-to-br from-deep-trust to-deep-trust/90 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-4xl">
            Ready to bring your idea to life?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-white/80">
            Launch your campaign on CrowdMint and tap into a global community of
            Web3 supporters. Transparent, decentralized, and designed so that
            value keeps flowing — even after the campaign ends.
          </p>
          <Button
            asChild
            size="lg"
            className="bg-mint-pulse text-white font-semibold hover:bg-mint-pulse/90"
          >
            <Link href="/campaigns/new">
              Start Your Campaign
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
