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

// Helper to get the base URL for API calls
function getBaseUrl(): string {
  // No navegador
  if (typeof window !== 'undefined') {
    return ''
  }

  // No servidor durante build ou produção
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Desenvolvimento local
  return `http://localhost:${process.env.PORT || 3000}`
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
  const goalUsdc = Number(formatUnits(details.goal, 6))
  const raisedUsdc = Number(formatUnits(details.amountRaised, 6))
  const minContributionUsdc = Number(formatUnits(details.minContribution, 6))
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

// ===== NOVA FUNÇÃO: Buscar campanhas da API Route =====
export async function fetchAllCampaigns(): Promise<Campaign[]> {
  try {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/api/campaigns`

    const response = await fetch(url, {
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch campaigns from API: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Converter deadline de string para Date
    const campaigns = (data.campaigns || []).map((campaign: any) => ({
      ...campaign,
      deadline: new Date(campaign.deadline), // Converte string ISO para Date
    }))

    return campaigns
  } catch (error) {
    console.error('Error fetching campaigns from API:', error)
    return []
  }
}

// ===== Manter funções existentes para páginas individuais =====
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
    const allCampaigns = await fetchAllCampaigns()
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
            donatedAt: new Date(),
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

export async function fetchFeaturedCampaigns(): Promise<Campaign[]> {
  try {
    const allCampaigns = await fetchAllCampaigns()
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

// ✅ ATUALIZADO: Aceita Date, string ou number
export function getTimeRemaining(deadline: Date | string | number): string {
  const now = new Date()

  // Converter para Date se for string ou number
  let deadlineDate: Date
  if (deadline instanceof Date) {
    deadlineDate = deadline
  } else if (typeof deadline === 'string') {
    deadlineDate = new Date(deadline)
  } else {
    deadlineDate = new Date(deadline * 1000) // Assume timestamp em segundos
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
