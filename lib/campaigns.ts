import type { Address } from "viem"
import type { PublicClient } from "viem"
import type { Campaign, Donation, CampaignStatus, CampaignDetailsOnChain } from "@/types/campaign"
import {
  getAllCampaigns,
  getCampaignsByCreator,
  readCampaignDetails,
  getBackersCount,
} from "@/lib/contracts"
import { parseUnits, formatUnits } from "viem"

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
        // Extract base64 data from data URI
        const base64Data = uri.split(",")[1]
        if (base64Data) {
          // Decode base64 to string (browser compatible)
          let jsonString: string
          if (typeof window !== "undefined" && typeof atob !== "undefined") {
            // Browser environment - use atob
            jsonString = atob(base64Data)
          } else if (typeof Buffer !== "undefined") {
            // Node.js environment - use Buffer
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

  // Return default metadata if fetch fails
  return {
    title: "Untitled Campaign",
    shortDescription: "No description available",
  }
}

// Convert on-chain details to Campaign object
async function convertToCampaign(
  address: Address,
  details: CampaignDetailsOnChain,
  publicClient: PublicClient,
): Promise<Campaign> {
  const now = Math.floor(Date.now() / 1000)
  const deadline = Number(details.deadline)
  const isExpired = deadline < now
  const goalUsdc = Number(formatUnits(details.goal, 6)) // USDC has 6 decimals
  const raisedUsdc = Number(formatUnits(details.amountRaised, 6))
  const minContributionUsdc = Number(formatUnits(details.minContribution, 6)) // USDC has 6 decimals
  const hasReachedGoal = raisedUsdc >= goalUsdc

  // Fetch metadata
  const metadata = await fetchMetadata(details.metadataURI)

  // Get backers count
  let backersCount = 0
  try {
    backersCount = await getBackersCount(address, publicClient)
  } catch (error) {
    console.error("Error fetching backers count:", error)
  }

  const campaign: Campaign = {
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

  return campaign
}

// Data access functions with smart contract integration
export async function fetchAllCampaigns(publicClient?: PublicClient): Promise<Campaign[]> {
  if (!publicClient) {
    // Return empty array if no public client (client-side only)
    return []
  }

  try {
    const campaignAddresses = await getAllCampaigns(publicClient)
    const campaigns = await Promise.all(
      campaignAddresses.map(async (address) => {
        try {
          const details = await readCampaignDetails(address, publicClient)
          return await convertToCampaign(address, details, publicClient)
        } catch (error) {
          console.error(`Error fetching campaign ${address}:`, error)
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

export async function fetchCampaignByAddress(
  address: Address,
  publicClient?: PublicClient,
): Promise<Campaign | null> {
  if (!publicClient) {
    return null
  }

  try {
    const details = await readCampaignDetails(address, publicClient)
    return await convertToCampaign(address, details, publicClient)
  } catch (error) {
    console.error(`Error fetching campaign ${address}:`, error)
    return null
  }
}

export async function fetchCampaignsByCreator(
  creator: Address,
  publicClient?: PublicClient,
): Promise<Campaign[]> {
  if (!publicClient) {
    return []
  }

  try {
    const campaignAddresses = await getCampaignsByCreator(creator, publicClient)
    const campaigns = await Promise.all(
      campaignAddresses.map(async (address) => {
        try {
          const details = await readCampaignDetails(address, publicClient)
          return await convertToCampaign(address, details, publicClient)
        } catch (error) {
          console.error(`Error fetching campaign ${address}:`, error)
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

export async function fetchDonationsByUser(
  user: Address,
  publicClient?: PublicClient,
): Promise<Donation[]> {
  if (!publicClient) {
    return []
  }

  try {
    // Get all campaigns and check for donations
    const allCampaigns = await fetchAllCampaigns(publicClient)
    const donations: Donation[] = []

    for (const campaign of allCampaigns) {
      try {
        const { getCampaignContract } = await import("@/lib/contracts")
        const campaignContract = getCampaignContract(campaign.address, publicClient)
        const donationAmount = await campaignContract.read.donations([user])

        if (donationAmount > 0n) {
          const amountUsdc = Number(formatUnits(donationAmount, 6))
          donations.push({
            campaignAddress: campaign.address,
            campaignTitle: campaign.title,
            amountUsdc,
            donatedAt: new Date(), // TODO: Get actual donation timestamp from events
            campaignStatus: campaign.isExpired
              ? campaign.hasReachedGoal || !campaign.goalBased
                ? "ended"
                : "refunding"
              : campaign.withdrawn
                ? "withdrawn"
                : "active",
          })
        }
      } catch (error) {
        console.error(`Error checking donation for campaign ${campaign.address}:`, error)
      }
    }

    return donations
  } catch (error) {
    console.error("Error fetching donations by user:", error)
    return []
  }
}

export async function fetchFeaturedCampaigns(publicClient?: PublicClient): Promise<Campaign[]> {
  if (!publicClient) {
    return []
  }

  try {
    const allCampaigns = await fetchAllCampaigns(publicClient)
    // Sort by amount raised and take top 3
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

export function getTimeRemaining(deadline: Date): string {
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()

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
