"use client"

import { use, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProgressBar } from "@/components/campaign/progress-bar"
import { CampaignStatusBadge } from "@/components/campaign/campaign-status-badge"
import { useAccount, useConnect, useSwitchChain } from "wagmi"
import { injected } from "wagmi/connectors"
import { useWeb3Clients } from "@/hooks/use-web3-client"
import { useUsdcBalance } from "@/hooks/use-usdc-balance"
import { arcTestnet } from "@/config/web3"
import {
  formatUsdc,
  shortenAddress,
  getTimeRemaining,
  getProgressPercent,
} from "@/lib/campaigns"
import { donateToCampaign, approveUsdc, readUsdcAllowance, endCampaign, sweepUnclaimedFunds } from "@/lib/contracts"
import { getAddressExplorerUrl } from "@/config/web3"
import { useCampaign, useInvalidateCampaigns } from "@/hooks/use-campaigns"
import { parseUnits, formatUnits } from "viem"
import { Clock, Users, ExternalLink, Wallet, ArrowLeft, CheckCircle, AlertTriangle, Timer, Zap } from "lucide-react"
import { DonorsModal } from "@/components/campaign/donors-modal"
import { toast } from "sonner"

export default function CampaignDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { address, isConnected, chain } = useAccount()
  const { publicClient, walletClient } = useWeb3Clients()
  const { connect: wagmiConnect } = useConnect()
  const { switchChainAsync } = useSwitchChain()

  const connect = () => {
    wagmiConnect({ connector: injected() })
  }

  const { balance: usdcBalance, isLoading: isLoadingBalance } = useUsdcBalance()
  const [donationAmount, setDonationAmount] = useState("")
  const [isDonating, setIsDonating] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [donationSuccess, setDonationSuccess] = useState(false)

  const { data: campaign, isLoading } = useCampaign(id)
  const { invalidateCampaign, invalidateDonations, invalidateAll } = useInvalidateCampaigns()
  const [isEndingCampaign, setIsEndingCampaign] = useState(false)
  const [isSweeping, setIsSweeping] = useState(false)

  // Grace period: 6 * 30 days = 180 days (matches contract WITHDRAWAL_GRACE_PERIOD)
  const GRACE_PERIOD_DAYS = 180
  const gracePeriodEnd = campaign
    ? new Date(campaign.deadline.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000)
    : null
  const isGracePeriodOver = gracePeriodEnd ? new Date() >= gracePeriodEnd : false
  const isCreator = campaign && address
    ? campaign.creator.toLowerCase() === address.toLowerCase()
    : false

  const handleEndCampaign = async () => {
    if (!campaign || !publicClient || !walletClient || !address) return

    setIsEndingCampaign(true)
    try {
      toast.info("Ending campaign...")
      const hash = await endCampaign(campaign.address, publicClient, walletClient, address)
      toast.success(`Transaction sent: ${hash.slice(0, 10)}...`)
      await publicClient.waitForTransactionReceipt({ hash })
      toast.success("Campaign ended successfully!")
      invalidateCampaign(id)
    } catch (error: any) {
      console.error("Error ending campaign:", error)
      toast.error(error?.message || "Failed to end campaign.")
    } finally {
      setIsEndingCampaign(false)
    }
  }

  const handleSweep = async () => {
    if (!campaign || !publicClient || !walletClient || !address) return

    setIsSweeping(true)
    try {
      // Sweep campaign funds (DepositType 0 = CampaignFunds)
      toast.info("Sweeping unclaimed funds to vault...")
      const hash = await sweepUnclaimedFunds(
        campaign.address,
        campaign.creator,
        0, // CampaignFunds
        publicClient,
        walletClient,
        address,
      )
      toast.success(`Transaction sent: ${hash.slice(0, 10)}...`)
      await publicClient.waitForTransactionReceipt({ hash })
      toast.success("Funds swept to CrowdMint Vault!")
      invalidateAll()
    } catch (error: any) {
      console.error("Error sweeping:", error)
      toast.error(error?.message || "Failed to sweep funds.")
    } finally {
      setIsSweeping(false)
    }
  }

  const handleDonate = async () => {
    if (!isConnected || !address || !donationAmount || !campaign) {
      toast.error("Please connect your wallet and enter a donation amount")
      return
    }

    // Verificar e trocar rede se necessário
    if (chain?.id !== arcTestnet.id) {
      try {
        toast.info(`Switching to ${arcTestnet.name}...`)
        await switchChainAsync({ chainId: arcTestnet.id })
        toast.success("Network switched successfully!")
        // Aguarde um pouco para a rede estabilizar
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (error: any) {
        console.error("Error switching network:", error)
        toast.error(`Please switch to ${arcTestnet.name} manually in your wallet`)
        return
      }
    }

    let attempts = 0
    let currentWalletClient = walletClient
    while (!currentWalletClient && attempts < 6) {
      await new Promise((resolve) => setTimeout(resolve, 500))
      attempts++
      currentWalletClient = walletClient
    }

    if (!currentWalletClient) {
      toast.error("Wallet client not ready. Please disconnect and reconnect your wallet.")
      return
    }

    if (!publicClient) {
      toast.error("Web3 client is not available. Please refresh the page.")
      return
    }

    try {
      const amount = parseUnits(donationAmount, 6)

      if (campaign.minContributionUsdc > 0 && Number(donationAmount) < campaign.minContributionUsdc) {
        toast.error(
          `Minimum contribution is ${formatUsdc(campaign.minContributionUsdc)} USDC. Please increase your donation amount.`,
        )
        return
      }

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
        const amountToApprove = amount - currentAllowance

        toast.info(`Approving ${formatUsdc(Number(formatUnits(amountToApprove, 6)))} USDC...`)
        try {
          const approveHash = await approveUsdc(campaign.address, amountToApprove, publicClient, currentWalletClient, address)
          toast.success(`Approval transaction sent: ${approveHash.slice(0, 10)}...`)

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

      toast.info("Processing donation...")
      const donateHash = await donateToCampaign(campaign.address, amount, publicClient, currentWalletClient, address)
      toast.success(`Donation transaction sent: ${donateHash.slice(0, 10)}...`)

      await publicClient.waitForTransactionReceipt({ hash: donateHash })
      toast.success("Donation successful!")

      setIsDonating(false)
      setDonationSuccess(true)
      setDonationAmount("")

      invalidateCampaign(id)
      if (address) invalidateDonations(address)
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

  const heroSrc =
    campaign.imageUrl && campaign.imageUrl.trim() !== ""
      ? campaign.imageUrl
      : "/no-image.jpg"

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Button asChild variant="ghost" className="mb-6 text-carbon-clarity hover:text-deep-trust">
        <Link href="/campaigns">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Link>
      </Button>

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
        <div className="lg:col-span-2 space-y-8">
          {/* Hero image (always shows, with fallback) */}
          <div className="relative aspect-video rounded-xl overflow-hidden bg-crowd-silver">
            <Image src={heroSrc} alt={campaign.title} fill className="object-cover" priority />
          </div>

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
              {/* Withdrawal fee info — visible to creator */}
              {isCreator && !campaign.withdrawn && campaign.raisedUsdc > 0 && (
                <div className="pt-3 border-t border-crowd-silver">
                  <div className="flex items-center justify-between">
                    <span className="text-carbon-clarity">Withdrawal Fee</span>
                    <span className="text-vault-gold font-medium">0.5%</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-carbon-clarity text-sm">Net Amount</span>
                    <span className="text-deep-trust font-medium text-sm">
                      ~{formatUsdc(campaign.raisedUsdc * 0.995)} USDC
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grace Period & Actions — only shown for expired campaigns */}
          {campaign.isExpired && (
            <Card className="border-crowd-silver">
              <CardHeader>
                <CardTitle className="text-deep-trust flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Post-Expiration Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Grace period status */}
                {gracePeriodEnd && (
                  <div className={`p-3 rounded-lg ${isGracePeriodOver ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900" : "bg-vault-gold/10 border border-vault-gold/20"}`}>
                    <div className="flex items-start gap-2">
                      {isGracePeriodOver ? (
                        <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      ) : (
                        <Timer className="h-4 w-4 text-vault-gold mt-0.5 shrink-0" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${isGracePeriodOver ? "text-red-600 dark:text-red-400" : "text-vault-gold"}`}>
                          {isGracePeriodOver
                            ? "Grace period ended"
                            : `Grace period: ${Math.ceil((gracePeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining`}
                        </p>
                        <p className="text-xs text-carbon-clarity mt-1">
                          {isGracePeriodOver
                            ? "Unclaimed funds can be swept to the CrowdMint Vault by anyone."
                            : `The creator has until ${gracePeriodEnd.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} to withdraw funds. After that, unclaimed funds go to the Vault.`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* End Campaign button — creator only, if campaign is still active */}
                {isCreator && campaign.isActive && (
                  <Button
                    onClick={handleEndCampaign}
                    disabled={isEndingCampaign || !walletClient}
                    className="w-full bg-deep-trust hover:bg-deep-trust/90 text-white font-semibold"
                  >
                    {isEndingCampaign ? "Ending..." : "End Campaign"}
                  </Button>
                )}

                {/* Sweep button — permissionless, after grace period, if funds not yet withdrawn */}
                {isGracePeriodOver && !campaign.withdrawn && campaign.raisedUsdc > 0 && (
                  <>
                    {/* Only show sweep for eligible campaigns */}
                    {(!campaign.goalBased || campaign.hasReachedGoal) && (
                      <Button
                        onClick={handleSweep}
                        disabled={isSweeping || !walletClient || !isConnected}
                        variant="outline"
                        className="w-full border-vault-gold text-vault-gold hover:bg-vault-gold/10 font-semibold"
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        {isSweeping ? "Sweeping..." : "Sweep to Vault"}
                      </Button>
                    )}
                    <p className="text-xs text-carbon-clarity text-center">
                      Anyone can sweep unclaimed funds to the CrowdMint Vault after the grace period.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-crowd-silver sticky top-24">
            <CardContent className="p-6 space-y-6">
              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-2xl font-bold text-deep-trust">{formatUsdc(campaign.raisedUsdc)} USDC</span>
                  <span className="text-carbon-clarity text-sm">of {formatUsdc(campaign.goalUsdc)} USDC</span>
                </div>
                <ProgressBar percent={progress} size="md" showLabel />
              </div>

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

              {/* View Donors button */}
              {(campaign.backersCount ?? 0) > 0 && (
                <DonorsModal campaignAddress={campaign.address} campaignTitle={campaign.title}>
                  <Button
                    variant="outline"
                    className="w-full border-crowd-silver text-carbon-clarity hover:border-deep-trust hover:text-deep-trust bg-transparent"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    View All Donors
                  </Button>
                </DonorsModal>
              )}

              <div className="pt-4 border-t border-crowd-silver">
                {campaign.isExpired || !campaign.isActive ? (
                  <div className="text-center py-4">
                    <p className="text-carbon-clarity text-sm">
                      {campaign.withdrawn
                        ? "This campaign has been withdrawn."
                        : campaign.isExpired
                          ? "This campaign has expired. Donations are no longer accepted."
                          : "This campaign is no longer active."}
                    </p>
                  </div>
                ) : !isConnected ? (
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
                          Minimum contribution:{" "}
                          <span className="font-medium">{formatUsdc(campaign.minContributionUsdc)} USDC</span>
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
                      {isApproving ? "Approving..." : isDonating ? "Processing..." : "Donate"}
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
