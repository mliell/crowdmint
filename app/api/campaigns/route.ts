import { NextResponse } from 'next/server'
import { createPublicClient, http, type Address } from 'viem'
import type { Campaign } from '@/types/campaign'
import { campaignAbi, campaignFactoryAbi } from '@/contracts/abis'
import { formatUnits } from 'viem'

// ===== CONFIGURAÇÃO DO CACHE =====
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos
const BATCH_SIZE = 3
const DELAY_BETWEEN_BATCHES = 1500

let cachedData: {
  campaigns: Campaign[]
  timestamp: number
} | null = null

let isFetching = false

// ===== CLIENTE RPC =====
const publicClient = createPublicClient({
  chain: {
    id: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 5042002),
    name: 'Arc Testnet',
    nativeCurrency: { name: 'Arc', symbol: 'ARC', decimals: 18 },
    rpcUrls: {
      default: { http: [process.env.NEXT_PUBLIC_RPC_URL!] },
      public: { http: [process.env.NEXT_PUBLIC_RPC_URL!] },
    },
  },
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
})

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as Address

// ===== HELPERS =====
async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error: any) {
      const is429 = error?.message?.includes('429') || error?.status === 429
      if (is429 && i < retries - 1) {
        await sleep(2000 * (i + 1))
        continue
      }
      return null
    }
  }
  return null
}

async function fetchMetadata(uri: string) {
  try {
    if (uri.startsWith("data:application/json")) {
      const base64Data = uri.split(",")[1]
      if (base64Data) {
        const jsonString = Buffer.from(base64Data, "base64").toString("utf-8")
        const metadata = JSON.parse(jsonString)
        return {
          title: metadata.title || "Untitled Campaign",
          shortDescription: metadata.shortDescription || "No description available",
          longDescription: metadata.longDescription,
          imageUrl: metadata.imageUrl,
          category: metadata.category,
        }
      }
    }

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

    if (uri.startsWith("{") || uri.startsWith("[")) {
      const metadata = JSON.parse(uri)
      return {
        title: metadata.title || "Untitled Campaign",
        shortDescription: metadata.shortDescription || "No description available",
        longDescription: metadata.longDescription,
        imageUrl: metadata.imageUrl,
        category: metadata.category,
      }
    }
  } catch (error) {
    console.error("[Cache] Error fetching metadata:", error)
  }

  return {
    title: "Untitled Campaign",
    shortDescription: "No description available",
  }
}

function computeCampaignStatus(campaign: {
  isActive: boolean
  isExpired: boolean
  hasReachedGoal: boolean
  withdrawn: boolean
}) {
  if (campaign.withdrawn) return "withdrawn"
  if (!campaign.isExpired && campaign.isActive) {
    return campaign.hasReachedGoal ? "goal-reached" : "active"
  }
  return campaign.hasReachedGoal ? "expired-goal-met" : "expired-goal-not-met"
}

// ===== BUSCAR CAMPANHA INDIVIDUAL (COM BACKERS) =====
async function fetchCampaignData(address: Address): Promise<Campaign | null> {
  try {
    // ✅ NOVO: Buscar getDonors() junto com details e progress
    const [details, progress, donors] = await Promise.all([
      fetchWithRetry(() =>
        publicClient.readContract({
          address,
          abi: campaignAbi,
          functionName: 'details',
        })
      ),
      fetchWithRetry(() =>
        publicClient.readContract({
          address,
          abi: campaignAbi,
          functionName: 'getProgress',
        })
      ),
      fetchWithRetry(() =>
        publicClient.readContract({
          address,
          abi: campaignAbi,
          functionName: 'getDonors',
        })
      ),
    ]) as any

    if (!details || !progress) return null

    // Acessar os valores via índice (details retorna array)
    const creator = details[0]
    const goal = details[1]
    const deadline = details[2]
    const amountRaised = details[3]
    const goalBased = details[4]
    const withdrawn = details[5]
    const metadataURI = details[6]
    const active = details[7]
    const minContribution = details[8]

    const metadata = await fetchMetadata(metadataURI)

    const now = Math.floor(Date.now() / 1000)
    const deadlineNum = Number(deadline)
    const isExpired = deadlineNum < now
    const goalUsdc = Number(formatUnits(goal, 6))
    const raisedUsdc = Number(formatUnits(amountRaised, 6))
    const minContributionUsdc = Number(formatUnits(minContribution, 6))
    const hasReachedGoal = raisedUsdc >= goalUsdc

    // ✅ NOVO: Calcular backersCount a partir do array de donors
    const backersCount = Array.isArray(donors) ? donors.length : 0

    return {
      address,
      creator,
      title: metadata.title,
      shortDescription: metadata.shortDescription,
      longDescription: metadata.longDescription,
      imageUrl: metadata.imageUrl,
      category: metadata.category,
      goalUsdc,
      raisedUsdc,
      minContributionUsdc,
      goalBased,
      withdrawn,
      deadline: new Date(deadlineNum * 1000),
      isActive: active,
      isExpired,
      hasReachedGoal,
      status: computeCampaignStatus({
        isActive: active,
        isExpired,
        hasReachedGoal,
        withdrawn,
      }),
      backersCount, // ✅ AGORA COM VALOR REAL
    } as Campaign
  } catch (error) {
    console.error(`[Cache] Error fetching campaign ${address}:`, error)
    return null
  }
}

// ===== BUSCAR TODAS AS CAMPANHAS (COM BATCHING) =====
async function fetchAllCampaignsFromRpc(): Promise<Campaign[]> {
  try {
    const campaignAddresses = await fetchWithRetry(() =>
      publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: campaignFactoryAbi,
        functionName: 'getCampaigns',
      })
    ) as Address[]

    if (!campaignAddresses || !Array.isArray(campaignAddresses)) {
      return []
    }

    if (campaignAddresses.length === 0) {
      return []
    }

    console.log(`[Cache] Fetching ${campaignAddresses.length} campaigns with backers...`)
    const campaigns: Campaign[] = []

    for (let i = 0; i < campaignAddresses.length; i += BATCH_SIZE) {
      const batch = campaignAddresses.slice(i, i + BATCH_SIZE)

      const batchResults = await Promise.allSettled(
        batch.map(address => fetchCampaignData(address))
      )

      const successful = batchResults
        .filter((r): r is PromiseFulfilledResult<Campaign | null> => 
          r.status === 'fulfilled' && r.value !== null
        )
        .map(r => r.value!)

      campaigns.push(...successful)

      if (i + BATCH_SIZE < campaignAddresses.length) {
        await sleep(DELAY_BETWEEN_BATCHES)
      }
    }

    console.log(`[Cache] Successfully fetched ${campaigns.length} campaigns with backers data`)
    return campaigns
  } catch (error) {
    console.error('[Cache] Error fetching campaigns:', error)
    return []
  }
}

// ===== ATUALIZAR CACHE =====
async function updateCache() {
  if (isFetching) {
    return
  }

  isFetching = true

  try {
    const campaigns = await fetchAllCampaignsFromRpc()
    cachedData = {
      campaigns,
      timestamp: Date.now(),
    }
  } catch (error) {
    console.error('[Cache] Error updating cache:', error)
  } finally {
    isFetching = false
  }
}

// ===== API ROUTE HANDLER =====
export async function GET(request: Request) {
  const now = Date.now()

  if (!cachedData || now - cachedData.timestamp > CACHE_TTL) {
    await updateCache()
  }

  return NextResponse.json({
    campaigns: cachedData?.campaigns || [],
    cached: true,
    timestamp: cachedData?.timestamp || now,
    ttl: CACHE_TTL,
    nextUpdate: cachedData ? cachedData.timestamp + CACHE_TTL : now,
  })
}
