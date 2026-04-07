import type { Address } from "viem"
import type { PublicClient } from "viem"
import type { Campaign, Donation, CampaignStatus, CampaignDetailsOnChain } from "@/types/campaign"
import {
  getAllCampaigns,
  readAllCampaignDetailsBatched,
  readAllBackersCountBatched,
  readUserDonationsBatched,
} from "@/lib/contracts"
import { formatUnits } from "viem"

// Helper to compute campaign status
export function computeCampaignStatus(campaign: {
  isActive: boolean
  isExpired: boolean
  hasReachedGoal: boolean
  withdrawn: boolean
}): CampaignStatus {
  if (campaign.withdrawn) return "withdrawn"
  if (!campaign.isExpired && campaign.isActive) {
    return campaign.hasReachedGoal ? "goal-reached" : "active"
  }
  return campaign.hasReachedGoal ? "expired-goal-met" : "expired-goal-not-met"
}

// Helper to fetch metadata from URI (IPFS, HTTP, Data URI, etc.)
async function fetchMetadata(uri: string): Promise<{
  title: string
  shortDescription: string
  longDescription?: string
  imageUrl?: string
  category?: string
}> {
  try {
    // Handle Data URIs (base64 encoded JSON)
    if (uri.startsWith("data:application/json")) {
      try {
        const base64Data = uri.split(",")[1]
        if (base64Data) {
          // Decode base64 to UTF-8 string
          // atob() alone produces Latin-1, corrupting multi-byte UTF-8 chars (ã, ç, é, etc.)
          let jsonString: string
          if (typeof window !== "undefined" && typeof atob !== "undefined") {
            const binaryString = atob(base64Data)
            const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0))
            jsonString = new TextDecoder("utf-8").decode(bytes)
          } else if (typeof Buffer !== "undefined") {
            jsonString = Buffer.from(base64Data, "base64").toString("utf-8")
          } else {
            throw new Error("No base64 decoder available")
          }
          const metadata = JSON.parse(jsonString)
          return {
            title: metadata.title || "Untitled Campaign",
            shortDescription: metadata.shortDescription || "No description available",
            longDescription: metadata.longDescription,
            imageUrl: metadata.imageUrl,
            category: metadata.category,
          }
        }
      } catch (error) {
        console.error("Error parsing data URI:", error)
        console.error("URI was:", uri.substring(0, 100) + "...")
      }
    }

    // Handle IPFS URIs
    if (uri.startsWith("ipfs://")) {
      const ipfsHash = uri.replace("ipfs://", "")
      const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`)
      if (response.ok) {
        const metadata = await response.json()
        return {
          title: metadata.title || "Untitled Campaign",
          shortDescription: metadata.shortDescription || "No description available",
          longDescription: metadata.longDescription,
          imageUrl: metadata.imageUrl,
          category: metadata.category,
        }
      }
    }

    // Handle HTTP/HTTPS URIs
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      const response = await fetch(uri)
      if (response.ok) {
        const metadata = await response.json()
        return {
          title: metadata.title || "Untitled Campaign",
          shortDescription: metadata.shortDescription || "No description available",
          longDescription: metadata.longDescription,
          imageUrl: metadata.imageUrl,
          category: metadata.category,
        }
      }
    }

    // Handle plain JSON strings (if stored directly)
    if (uri.startsWith("{") || uri.startsWith("[")) {
      try {
        const metadata = JSON.parse(uri)
        return {
          title: metadata.title || "Untitled Campaign",
          shortDescription: metadata.shortDescription || "No description available",
          longDescription: metadata.longDescription,
          imageUrl: metadata.imageUrl,
          category: metadata.category,
        }
      } catch (error) {
        console.error("Error parsing JSON string:", error)
      }
    }
  } catch (error) {
    console.error("Error fetching metadata:", error)
    console.error("URI was:", uri)
  }

  return {
    title: "Untitled Campaign",
    shortDescription: "No description available",
  }
}

// Convert on-chain details to Campaign object.
// backersCount is pre-fetched via multicall and passed in directly.
// undefined means getDonors() was unavailable (e.g. older contract version).
async function convertToCampaign(
  address: Address,
  details: CampaignDetailsOnChain,
  backersCount: number | undefined,
): Promise<Campaign> {
  const now = Math.floor(Date.now() / 1000)
  const deadline = Number(details.deadline)
  const isExpired = deadline < now
  const goalUsdc = Number(formatUnits(details.goal, 6))
  const raisedUsdc = Number(formatUnits(details.amountRaised, 6))
  const minContributionUsdc = Number(formatUnits(details.minContribution, 6))
  const hasReachedGoal = raisedUsdc >= goalUsdc

  const metadata = await fetchMetadata(details.metadataURI)

  return {
    address,
    creator: details.creator,
    title: metadata.title,
    shortDescription: metadata.shortDescription,
    longDescription: metadata.longDescription,
    imageUrl: metadata.imageUrl,
    category: metadata.category,
    goalUsdc,
    raisedUsdc,
    minContributionUsdc,
    goalBased: details.goalBased,
    withdrawn: details.withdrawn,
    deadline: new Date(deadline * 1000),
    isActive: details.active,
    isExpired,
    hasReachedGoal,
    status: computeCampaignStatus({
      isActive: details.active,
      isExpired,
      hasReachedGoal,
      withdrawn: details.withdrawn,
    }),
    backersCount,
  }
}

// Data access functions with smart contract integration
// Uses parallel batching: 1 call for addresses + parallel details + parallel backers (was 2N+1)
export async function fetchAllCampaigns(publicClient?: PublicClient): Promise<Campaign[]> {
  if (!publicClient) return []

  try {
    const campaignAddresses = await getAllCampaigns(publicClient)
    if (campaignAddresses.length === 0) return []

    const [allDetails, allBackers] = await Promise.all([
      readAllCampaignDetailsBatched(campaignAddresses, publicClient),
      readAllBackersCountBatched(campaignAddresses, publicClient),
    ])

    const campaigns = await Promise.all(
      campaignAddresses.map(async (address, i) => {
        const details = allDetails[i]
        if (!details) return null
        try {
          return await convertToCampaign(address, details, allBackers[i])
        } catch (error) {
          console.error(`Error converting campaign ${address}:`, error)
          return null
        }
      }),
    )

    return campaigns.filter((c): c is Campaign => c !== null)
  } catch (error) {
    console.error("Error fetching all campaigns:", error)
    return []
  }
}

// Single campaign fetch — batches details + backers in parallel (was 2 sequential calls)
export async function fetchCampaignByAddress(
  address: Address,
  publicClient?: PublicClient,
): Promise<Campaign | null> {
  if (!publicClient) return null

  try {
    const [[details], [backers]] = await Promise.all([
      readAllCampaignDetailsBatched([address], publicClient),
      readAllBackersCountBatched([address], publicClient),
    ])
    if (!details) return null
    return await convertToCampaign(address, details, backers)
  } catch (error) {
    console.error(`Error fetching campaign ${address}:`, error)
    return null
  }
}

// Fetch campaigns by creator — 1 call for addresses + parallel details, filter client-side (was N+1 + N+1)
export async function fetchCampaignsByCreator(
  creator: Address,
  publicClient?: PublicClient,
): Promise<Campaign[]> {
  if (!publicClient) return []

  try {
    const allAddresses = await getAllCampaigns(publicClient)
    if (allAddresses.length === 0) return []

    const [allDetails, allBackers] = await Promise.all([
      readAllCampaignDetailsBatched(allAddresses, publicClient),
      readAllBackersCountBatched(allAddresses, publicClient),
    ])

    const campaigns = await Promise.all(
      allAddresses.map(async (address, i) => {
        const details = allDetails[i]
        if (!details) return null
        if (details.creator.toLowerCase() !== creator.toLowerCase()) return null
        try {
          return await convertToCampaign(address, details, allBackers[i])
        } catch (error) {
          console.error(`Error converting campaign ${address}:`, error)
          return null
        }
      }),
    )

    return campaigns.filter((c): c is Campaign => c !== null)
  } catch (error) {
    console.error("Error fetching campaigns by creator:", error)
    return []
  }
}

// Fetch user donations — parallel: details + backers + donation amounts (was 3N+1)
export async function fetchDonationsByUser(
  user: Address,
  publicClient?: PublicClient,
): Promise<Donation[]> {
  if (!publicClient) return []

  try {
    const allAddresses = await getAllCampaigns(publicClient)
    if (allAddresses.length === 0) return []

    const [allDetails, allBackers, allDonations] = await Promise.all([
      readAllCampaignDetailsBatched(allAddresses, publicClient),
      readAllBackersCountBatched(allAddresses, publicClient),
      readUserDonationsBatched(user, allAddresses, publicClient),
    ])

    const donations: Donation[] = []

    for (let i = 0; i < allAddresses.length; i++) {
      const donationAmount = allDonations[i]
      if (donationAmount <= 0n) continue

      const details = allDetails[i]
      if (!details) continue

      const now = Math.floor(Date.now() / 1000)
      const isExpired = Number(details.deadline) < now
      const goalUsdc = Number(formatUnits(details.goal, 6))
      const raisedUsdc = Number(formatUnits(details.amountRaised, 6))
      const hasReachedGoal = raisedUsdc >= goalUsdc

      const metadata = await fetchMetadata(details.metadataURI)

      donations.push({
        campaignAddress: allAddresses[i],
        campaignTitle: metadata.title,
        amountUsdc: Number(formatUnits(donationAmount, 6)),
        donatedAt: new Date(),
        campaignStatus: isExpired
          ? hasReachedGoal || !details.goalBased
            ? "ended"
            : "refunding"
          : details.withdrawn
            ? "withdrawn"
            : "active",
      })
    }

    return donations
  } catch (error) {
    console.error("Error fetching donations by user:", error)
    return []
  }
}

export async function fetchFeaturedCampaigns(publicClient?: PublicClient): Promise<Campaign[]> {
  if (!publicClient) return []

  try {
    const allCampaigns = await fetchAllCampaigns(publicClient)
    return allCampaigns.sort((a, b) => b.raisedUsdc - a.raisedUsdc).slice(0, 3)
  } catch (error) {
    console.error("Error fetching featured campaigns:", error)
    return []
  }
}

// Format helpers
export function formatUsdc(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function getTimeRemaining(deadline: Date | string | number): string {
  const now = new Date()

  let deadlineDate: Date
  if (deadline instanceof Date) {
    deadlineDate = deadline
  } else if (typeof deadline === "string") {
    deadlineDate = new Date(deadline)
  } else {
    deadlineDate = new Date(deadline * 1000)
  }

  const diff = deadlineDate.getTime() - now.getTime()

  if (diff <= 0) return "Ended"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h left`

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${minutes}m left`
}

export function getProgressPercent(raised: number, goal: number): number {
  if (goal === 0) return 0
  return Math.min(100, Math.round((raised / goal) * 100))
}
