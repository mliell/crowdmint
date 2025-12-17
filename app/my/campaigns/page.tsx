"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CampaignCard } from "@/components/campaign/campaign-card"
import { useAccount, useConnect, useSwitchChain } from "wagmi"
import { injected } from "wagmi/connectors"
import { useWeb3Clients } from "@/hooks/use-web3-client"
import { arcTestnet } from "@/config/web3"
import { fetchCampaignsByCreator, shortenAddress } from "@/lib/campaigns"
import { withdrawFromCampaign } from "@/lib/contracts"
import type { Campaign } from "@/types/campaign"
import { Wallet, Plus, ArrowRight } from "lucide-react"
import useSWR from "swr"
import { toast } from "sonner"

export default function MyCampaignsPage() {
  const { address, isConnected, chain } = useAccount()
  const { publicClient, walletClient } = useWeb3Clients()
  const { connect } = useConnect()
  const { switchChainAsync } = useSwitchChain()

  const handleConnect = () => {
    connect({ connector: injected() })
  }

  const { data: campaigns = [], isLoading, mutate } = useSWR<Campaign[]>(
    isConnected && address && publicClient ? `my-campaigns-${address}` : null,
    () => fetchCampaignsByCreator(address!, publicClient || undefined),
  )

  const handleWithdraw = async (campaignAddress: string) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet")
      return
    }

    // Verificar e trocar rede se necessário
    if (chain?.id !== arcTestnet.id) {
      try {
        toast.info(`Switching to ${arcTestnet.name}...`)
        await switchChainAsync({ chainId: arcTestnet.id })
        toast.success("Network switched successfully!")
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error: any) {
        console.error("Error switching network:", error)
        toast.error(`Please switch to ${arcTestnet.name} manually in your wallet`)
        return
      }
    }

    let attempts = 0
    let currentWalletClient = walletClient
    while (!currentWalletClient && attempts < 6) {
      console.log(`⏳ Waiting for walletClient... attempt ${attempts + 1}/6`)
      await new Promise(resolve => setTimeout(resolve, 500))
      attempts++
      currentWalletClient = walletClient
    }

    if (!currentWalletClient) {
      toast.error("Wallet client not ready. Please disconnect and reconnect your wallet, then try again.")
      return
    }

    if (!publicClient) {
      toast.error("Web3 client is not available. Please refresh the page.")
      return
    }

    try {
      toast.info("Processing withdrawal...")
      const hash = await withdrawFromCampaign(
        campaignAddress as `0x${string}`,
        currentWalletClient,
        address
      )
      toast.success(`Withdrawal transaction sent: ${hash.slice(0, 10)}...`)

      await publicClient.waitForTransactionReceipt({ hash })
      toast.success("Withdrawal successful!")

      mutate()
    } catch (error: any) {
      console.error("Error withdrawing:", error)
      toast.error(error?.message || "Failed to withdraw. Please try again.")
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-crowd-silver/50 flex items-center justify-center mx-auto mb-6">
            <Wallet className="h-8 w-8 text-deep-trust" />
          </div>
          <h1 className="text-2xl font-bold text-deep-trust mb-4">Connect Your Wallet</h1>
          <p className="text-carbon-clarity mb-8">Connect your wallet to view and manage your campaigns.</p>
          <Button onClick={handleConnect} className="bg-mint-pulse hover:bg-mint-pulse/90 text-white font-semibold">
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-deep-trust mb-2">My Campaigns</h1>
          <p className="text-carbon-clarity">
            Campaigns created by <span className="font-mono text-deep-trust">{shortenAddress(address || "")}</span>
          </p>
        </div>
        <Button asChild className="bg-mint-pulse hover:bg-mint-pulse/90 text-white font-semibold self-start">
          <Link href="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 rounded-lg bg-crowd-silver animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-crowd-silver">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-crowd-silver/50 flex items-center justify-center mx-auto mb-6">
              <Plus className="h-8 w-8 text-carbon-clarity" />
            </div>
            <h2 className="text-xl font-semibold text-deep-trust mb-2">No campaigns yet</h2>
            <p className="text-carbon-clarity mb-6 max-w-md mx-auto">
              You haven&apos;t created any campaigns yet. Start your first campaign and bring your ideas to life!
            </p>
            <Button asChild className="bg-deep-trust hover:bg-deep-trust/90">
              <Link href="/campaigns/new">
                Create Your First Campaign
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <div key={campaign.address} className="relative">
              <CampaignCard campaign={campaign} />
              {campaign.isExpired && !campaign.withdrawn && (campaign.hasReachedGoal || !campaign.goalBased) && (
                <div className="absolute bottom-4 left-4 right-4">
                  <Button
                    className="w-full bg-vault-gold hover:bg-vault-gold/90 text-white font-semibold"
                    onClick={() => handleWithdraw(campaign.address)}
                  >
                    Withdraw Funds
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
