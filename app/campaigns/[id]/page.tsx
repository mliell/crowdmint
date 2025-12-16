// app/campaigns/[id]/page.tsx
"use client"

import { use } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProgressBar } from "@/components/campaign/progress-bar"
import { CampaignStatusBadge } from "@/components/campaign/campaign-status-badge"
//import { useWallet } from "@/components/providers/web3-provider"
//import { useWeb3Clients } from "@/hooks/use-web3-client"
import { useAccount, usePublicClient, useWalletClient, useConnect, useDisconnect } from "wagmi"
import { injected } from "wagmi/connectors"

import { useUsdcBalance } from "@/hooks/use-usdc-balance"
import {
  fetchCampaignByAddress,
  formatUsdc,
  shortenAddress,
  getTimeRemaining,
  getProgressPercent,
} from "@/lib/campaigns"
import { donateToCampaign, approveUsdc, readUsdcAllowance, getUsdcDecimals } from "@/lib/contracts"
import { contracts } from "@/config/web3"
import { getAddressExplorerUrl } from "@/config/web3"
import type { Campaign } from "@/types/campaign"
import { parseUnits, formatUnits } from "viem"
import { Clock, Users, ExternalLink, Wallet, ArrowLeft, CheckCircle } from "lucide-react"
import useSWR from "swr"
import { useState } from "react"
import { toast } from "sonner"

export default function CampaignDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  //const { isConnected, address, connect } = useWallet()
  //const { publicClient, walletClient } = useWeb3Clients()
  const { address, isConnected } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { connect: wagmiConnect } = useConnect()
  const { disconnect } = useDisconnect()
  const connect = () => {
    wagmiConnect({ connector: injected() })
  }

  const { balance: usdcBalance, isLoading: isLoadingBalance } = useUsdcBalance()
  const [donationAmount, setDonationAmount] = useState("")
  const [isDonating, setIsDonating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [donationSuccess, setDonationSuccess] = useState(false)

  // Debug log
  console.log("🔍 Component state:", {
    isConnected,
    address,
    hasPublicClient: !!publicClient,
    hasWalletClient: !!walletClient,
  })

  const {
    data: campaign,
    isLoading,
    mutate,
  } = useSWR<Campaign | null>(
    publicClient ? `campaign-${id}` : null,
    () => fetchCampaignByAddress(id as `0x${string}`, publicClient || undefined),
  )

  const handleDonate = async () => {
    // Validação inicial
  if (!isConnected || !address || !donationAmount || !campaign) {
    toast.error("Please connect your wallet and enter a donation amount")
    return
  }

  // Espera até 3 segundos pelo walletClient se necessário
  let attempts = 0
  while (!walletClient && attempts < 6) {
    console.log(`⏳ Waiting for walletClient... attempt ${attempts + 1}/6`)
    await new Promise(resolve => setTimeout(resolve, 500))
    attempts++
  }

  if (!walletClient) {
    toast.error("Wallet client not ready. Please try disconnecting and reconnecting your wallet.")
    return
  }

  if (!publicClient) {
    toast.error("Web3 client is not available. Please refresh the page.")
    return
  }

    try {
      const amount = parseUnits(donationAmount, 6) // USDC has 6 decimals

      // Validate minimum contribution
      if (campaign.minContributionUsdc > 0 && Number(donationAmount) < campaign.minContributionUsdc) {
        toast.error(
          `Minimum contribution is ${formatUsdc(campaign.minContributionUsdc)} USDC. Please increase your donation amount.`,
        )
        return
      }

      // Check if approval is needed (approve to campaign contract)
      setIsApproving(true)
      let currentAllowance = 0n

      try {
        currentAllowance = await readUsdcAllowance(address, campaign.address, publicClient)
      } catch (error: any) {
        console.error("Error reading allowance:", error)
        toast.warning("Could not check allowance. Proceeding with approval...")
        currentAllowance = 0n
      }

      if (currentAllowance < amount) {
        // Calculate the exact amount needed to approve
        const amountToApprove = amount - currentAllowance

        // Approve USDC spending to campaign contract (only the amount needed)
        toast.info(`Approving ${formatUsdc(Number(formatUnits(amountToApprove, 6)))} USDC...`)
        try {
          const approveHash = await approveUsdc(
            campaign.address,
            amountToApprove,
            walletClient,
            address // <-- PASSE O ADDRESS AQUI
          )
          toast.success(`Approval transaction sent: ${approveHash.slice(0, 10)}...`)

          // Wait for approval transaction to be mined
          await publicClient.waitForTransactionReceipt({ hash: approveHash })
          toast.success("USDC approved successfully!")
        } catch (error: any) {
          console.error("Error approving USDC:", error)
          toast.error(error?.message || "Failed to approve USDC. Please try again.")
          setIsApproving(false)
          return
        }
      } else {
        toast.success("USDC already approved")
      }

      setIsApproving(false)
      setIsDonating(true)

      // Donate to campaign
      toast.info("Processing donation...")
      const donateHash = await donateToCampaign(
        campaign.address,
        amount,
        walletClient,
        address // <-- PASSE O ADDRESS AQUI
      )
      toast.success(`Donation transaction sent: ${donateHash.slice(0, 10)}...`)

      // Wait for donation transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash: donateHash })
      toast.success("Donation successful!")

      setIsDonating(false)
      setDonationSuccess(true)
      setDonationAmount("")

      // Refresh campaign data
      mutate()
    } catch (error: any) {
      console.error("Error donating:", error)
      toast.error(error?.message || "Failed to donate. Please try again.")
      setIsDonating(false)
      setIsApproving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-crowd-silver rounded mb-8" />
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-crowd-silver rounded-lg" />
              <div className="h-32 bg-crowd-silver rounded-lg" />
            </div>
            <div className="h-96 bg-crowd-silver rounded-lg" />
          </div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-deep-trust mb-4">Campaign Not Found</h1>
        <p className="text-carbon-clarity mb-8">
          The campaign you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button asChild className="bg-deep-trust hover:bg-deep-trust/90">
          <Link href="/campaigns">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Campaigns
          </Link>
        </Button>
      </div>
    )
  }

  const progress = getProgressPercent(campaign.raisedUsdc, campaign.goalUsdc)
  const timeRemaining = getTimeRemaining(campaign.deadline)

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Back button */}
      <Button asChild variant="ghost" className="mb-6 text-carbon-clarity hover:text-deep-trust">
        <Link href="/campaigns">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <CampaignStatusBadge status={campaign.status} goalBased={campaign.goalBased} />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-deep-trust mb-2">{campaign.title}</h1>
        <p className="text-carbon-clarity">
          by{" "}
          <a
            href={getAddressExplorerUrl(campaign.creator)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-deep-trust hover:underline"
          >
            {shortenAddress(campaign.creator)}
          </a>
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Image */}
          {campaign.imageUrl && (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-crowd-silver">
              <Image src={campaign.imageUrl || "/placeholder.svg"} alt={campaign.title} fill className="object-cover" />
            </div>
          )}

          {/* Description */}
          <Card className="border-crowd-silver">
            <CardHeader>
              <CardTitle className="text-deep-trust">About this campaign</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-carbon-clarity leading-relaxed whitespace-pre-wrap">
                {campaign.longDescription || campaign.shortDescription}
              </p>
            </CardContent>
          </Card>

          {/* On-chain details */}
          <Card className="border-crowd-silver">
            <CardHeader>
              <CardTitle className="text-deep-trust">On-chain Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-carbon-clarity">Contract Address</span>
                <a
                  href={getAddressExplorerUrl(campaign.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-deep-trust hover:underline font-mono text-sm"
                >
                  {shortenAddress(campaign.address, 6)}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-carbon-clarity">Campaign Type</span>
                <span className="text-deep-trust font-medium">
                  {campaign.goalBased ? "Goal-based (All-or-nothing)" : "Flexible"}
                </span>
              </div>
              {campaign.category && (
                <div className="flex items-center justify-between">
                  <span className="text-carbon-clarity">Category</span>
                  <span className="text-deep-trust font-medium">{campaign.category}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card className="border-crowd-silver sticky top-24">
            <CardContent className="p-6 space-y-6">
              {/* Funding progress */}
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold text-deep-trust">{formatUsdc(campaign.raisedUsdc)} USDC</span>
                  <span className="text-carbon-clarity text-sm">of {formatUsdc(campaign.goalUsdc)} USDC</span>
                </div>
                <ProgressBar percent={progress} size="md" showLabel />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 rounded-lg bg-crowd-silver/50">
                  <div className="flex items-center justify-center gap-1 text-carbon-clarity mb-1">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-deep-trust">{campaign.backersCount || 0}</p>
                  <p className="text-xs text-carbon-clarity">Backers</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-crowd-silver/50">
                  <div className="flex items-center justify-center gap-1 text-carbon-clarity mb-1">
                    <Clock className="h-4 w-4" />
                  </div>
                  <p className="text-xl font-bold text-deep-trust">{timeRemaining}</p>
                  <p className="text-xs text-carbon-clarity">Remaining</p>
                </div>
              </div>

              {/* Donation form */}
              <div className="pt-4 border-t border-crowd-silver">
                {!isConnected ? (
                  <div className="text-center">
                    <p className="text-carbon-clarity mb-4">Connect your wallet to donate to this campaign.</p>
                    <Button
                      onClick={connect}
                      className="w-full bg-mint-pulse hover:bg-mint-pulse/90 text-white font-semibold"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      Connect Wallet
                    </Button>
                  </div>
                ) : donationSuccess ? (
                  <div className="text-center py-4">
                    <CheckCircle className="h-12 w-12 text-mint-pulse mx-auto mb-3" />
                    <p className="font-semibold text-deep-trust">Thank you for your donation!</p>
                    <p className="text-sm text-carbon-clarity mt-1">Your support helps bring this project to life.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-carbon-clarity">Your USDC Balance</span>
                      <span className="font-medium text-deep-trust">
                        {isLoadingBalance ? "Loading..." : formatUsdc(usdcBalance)} USDC
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="donation-amount" className="text-carbon-clarity">
                        Donation Amount (USDC)
                      </Label>
                      <Input
                        id="donation-amount"
                        type="number"
                        min={campaign.minContributionUsdc > 0 ? campaign.minContributionUsdc : 1}
                        step="0.01"
                        placeholder={
                          campaign.minContributionUsdc > 0
                            ? `Min: ${formatUsdc(campaign.minContributionUsdc)} USDC`
                            : "Enter amount"
                        }
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                        className="border-crowd-silver focus:border-mint-pulse"
                      />
                      {campaign.minContributionUsdc > 0 && (
                        <p className="text-xs text-carbon-clarity">
                          Minimum contribution: <span className="font-medium">{formatUsdc(campaign.minContributionUsdc)} USDC</span>
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleDonate}
                      disabled={
                        isDonating ||
                        isApproving ||
                        !donationAmount ||
                        Number(donationAmount) <= 0 ||
                        Number(donationAmount) > usdcBalance ||
                        (campaign.minContributionUsdc > 0 && Number(donationAmount) < campaign.minContributionUsdc) ||
                        isLoadingBalance
                      }
                      className="w-full bg-mint-pulse hover:bg-mint-pulse/90 text-white font-semibold"
                    >
                      {isApproving
                        ? "Approving..."
                        : isDonating
                          ? "Processing..."
                          : "Donate"}
                    </Button>
                    {Number(donationAmount) > usdcBalance && (
                      <p className="text-xs text-red-500 text-center">Insufficient USDC balance</p>
                    )}
                    {campaign.minContributionUsdc > 0 &&
                      Number(donationAmount) > 0 &&
                      Number(donationAmount) < campaign.minContributionUsdc && (
                        <p className="text-xs text-red-500 text-center">
                          Minimum contribution is {formatUsdc(campaign.minContributionUsdc)} USDC
                        </p>
                      )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
