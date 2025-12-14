// types/campaign.ts
import type { Address } from "viem"

// Raw on-chain details from a Campaign contract
export interface CampaignDetailsOnChain {
  creator: Address
  goal: bigint // USDC in 6-decimal smallest units
  deadline: bigint // unix timestamp (seconds)
  amountRaised: bigint // USDC in 6-decimal smallest units
  goalBased: boolean
  withdrawn: boolean
  metadataURI: string
  active: boolean
  minContribution: bigint // USDC in 6-decimal smallest units
}

// Campaign status type
export type CampaignStatus =
  | "active"
  | "goal-reached"
  | "expired-goal-met"
  | "expired-goal-not-met"
  | "withdrawn"
  | "refunding" // NOVO: Adicionado "refunding"

// Normalized/denormalized shape used by the UI
export interface Campaign {
  // On-chain identity
  address: Address
  creator: Address

  // Off-chain metadata (resolved from metadataURI)
  title: string
  shortDescription: string
  longDescription?: string
  imageUrl?: string
  category?: string // e.g. "Social", "DeFi", "Art"

  // Financials (normalized to user-facing numbers)
  goalUsdc: number // e.g. 1000 (not 1_000_000_000_000)
  raisedUsdc: number
  minContributionUsdc: number // Minimum contribution amount in USDC
  goalBased: boolean
  withdrawn: boolean

  // Time & status
  deadline: Date
  isActive: boolean
  isExpired: boolean
  hasReachedGoal: boolean
  status: CampaignStatus

  // Extra info (optional)
  backersCount?: number
  donors?: Address[] // NOVO: Adicionado a lista de endereços dos doadores
}

// Donation type for My Donations page
export interface Donation {
  campaignAddress: Address
  campaignTitle: string
  amountUsdc: number
  donatedAt: Date
  campaignStatus:
    | "active"
    | "ended"
    | "refunding"
    | "withdrawn"
}

// Category options
export const CAMPAIGN_CATEGORIES = [
  "Social",
  "DeFi",
  "Art",
  "Gaming",
  "Infrastructure",
  "Education",
  "Environment",
  "Other",
] as const

export type CampaignCategory = (typeof CAMPAIGN_CATEGORIES)[number]
