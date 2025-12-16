"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAccount, useConnect, usePublicClient } from "wagmi"
import { injected } from "wagmi/connectors"
import { fetchDonationsByUser, formatUsdc } from "@/lib/campaigns"
import type { Donation } from "@/types/campaign"
import { Wallet, ExternalLink, Heart } from "lucide-react"
import useSWR from "swr"

const statusColors: Record<Donation["campaignStatus"], string> = {
  active: "bg-mint-pulse/10 text-mint-pulse",
  ended: "bg-carbon-clarity/10 text-carbon-clarity",
  refunding: "bg-vault-gold/10 text-vault-gold",
  withdrawn: "bg-carbon-clarity/10 text-carbon-clarity",
}

export default function MyDonationsPage() {
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { connect } = useConnect()

  const handleConnect = () => {
    connect({ connector: injected() })
  }

  const { data: donations = [], isLoading } = useSWR<Donation[]>(
    isConnected && address && publicClient ? `my-donations-${address}` : null,
    () => fetchDonationsByUser(address!, publicClient || undefined),
  )

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-crowd-silver/50 flex items-center justify-center mx-auto mb-6">
            <Wallet className="h-8 w-8 text-deep-trust" />
          </div>
          <h1 className="text-2xl font-bold text-deep-trust mb-4">Connect Your Wallet</h1>
          <p className="text-carbon-clarity mb-8">Connect your wallet to view your donation history.</p>
          <Button onClick={handleConnect} className="bg-mint-pulse hover:bg-mint-pulse/90 text-white font-semibold">
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  const totalDonated = donations.reduce((sum, d) => sum + d.amountUsdc, 0)

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-deep-trust mb-2">My Donations</h1>
        <p className="text-carbon-clarity">Your contributions to campaigns on CrowdMint</p>
      </div>

      {/* Stats */}
      {donations.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="border-crowd-silver">
            <CardContent className="p-4">
              <p className="text-sm text-carbon-clarity mb-1">Total Donated</p>
              <p className="text-2xl font-bold text-deep-trust">{formatUsdc(totalDonated)} USDC</p>
            </CardContent>
          </Card>
          <Card className="border-crowd-silver">
            <CardContent className="p-4">
              <p className="text-sm text-carbon-clarity mb-1">Campaigns Supported</p>
              <p className="text-2xl font-bold text-mint-pulse">{donations.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-crowd-silver animate-pulse" />
          ))}
        </div>
      ) : donations.length === 0 ? (
        <Card className="border-crowd-silver">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-crowd-silver/50 flex items-center justify-center mx-auto mb-6">
              <Heart className="h-8 w-8 text-carbon-clarity" />
            </div>
            <h2 className="text-xl font-semibold text-deep-trust mb-2">No donations yet</h2>
            <p className="text-carbon-clarity mb-6 max-w-md mx-auto">
              You haven&apos;t donated to any campaigns yet. Explore campaigns and support projects you believe in!
            </p>
            <Button asChild className="bg-deep-trust hover:bg-deep-trust/90">
              <Link href="/campaigns">Explore Campaigns</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {donations.map((donation, index) => (
            <Card key={index} className="border-crowd-silver">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/campaigns/${donation.campaignAddress}`}
                        className="font-semibold text-deep-trust hover:underline"
                      >
                        {donation.campaignTitle}
                      </Link>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[donation.campaignStatus]
                        }`}
                      >
                        {donation.campaignStatus.charAt(0).toUpperCase() + donation.campaignStatus.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-carbon-clarity">
                      {donation.donatedAt.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-mint-pulse">{formatUsdc(donation.amountUsdc)} USDC</p>
                    </div>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="border-crowd-silver text-carbon-clarity hover:border-deep-trust hover:text-deep-trust bg-transparent"
                    >
                      <Link href={`/campaigns/${donation.campaignAddress}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
                {/* Refund notice for failed goal-based campaigns */}
                {donation.campaignStatus === "refunding" && (
                  <div className="mt-3 p-3 rounded-lg bg-vault-gold/10 border border-vault-gold/20">
                    <p className="text-sm text-vault-gold">
                      This campaign did not reach its goal. A refund may be available.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
