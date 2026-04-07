// hooks/use-campaigns.ts
"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { usePublicClient, useAccount } from "wagmi"
import type { Address } from "viem"
import type { Campaign, Donation } from "@/types/campaign"
import {
  fetchAllCampaigns,
  fetchCampaignByAddress,
  fetchCampaignsByCreator,
  fetchDonationsByUser,
  fetchFeaturedCampaigns,
} from "@/lib/campaigns"

// Shared stale times
const CAMPAIGNS_STALE_TIME = 30_000 // 30s — campaigns don't change every second
const CAMPAIGN_DETAIL_STALE_TIME = 15_000 // 15s — single campaign may need fresher data after donate

// Query key factories for consistent cache keys
export const campaignKeys = {
  all: ["campaigns"] as const,
  detail: (address: string) => ["campaign", address] as const,
  byCreator: (creator: string) => ["campaigns", "creator", creator] as const,
  donations: (user: string) => ["donations", user] as const,
  featured: ["campaigns", "featured"] as const,
}

/** All campaigns list (used by /campaigns page) */
export function useAllCampaigns() {
  const publicClient = usePublicClient()

  return useQuery<Campaign[]>({
    queryKey: campaignKeys.all,
    queryFn: () => fetchAllCampaigns(publicClient),
    enabled: !!publicClient,
    staleTime: CAMPAIGNS_STALE_TIME,
  })
}

/** Single campaign detail (used by /campaigns/[id] page) */
export function useCampaign(address: string) {
  const publicClient = usePublicClient()

  return useQuery<Campaign | null>({
    queryKey: campaignKeys.detail(address),
    queryFn: () => fetchCampaignByAddress(address as Address, publicClient),
    enabled: !!publicClient && !!address,
    staleTime: CAMPAIGN_DETAIL_STALE_TIME,
  })
}

/** Campaigns created by current user (used by /my/campaigns page) */
export function useMyCampaigns() {
  const publicClient = usePublicClient()
  const { address, isConnected } = useAccount()

  return useQuery<Campaign[]>({
    queryKey: campaignKeys.byCreator(address ?? ""),
    queryFn: () => fetchCampaignsByCreator(address!, publicClient),
    enabled: !!publicClient && isConnected && !!address,
    staleTime: CAMPAIGNS_STALE_TIME,
  })
}

/** Donations made by current user (used by /my/donations page) */
export function useMyDonations() {
  const publicClient = usePublicClient()
  const { address, isConnected } = useAccount()

  return useQuery<Donation[]>({
    queryKey: campaignKeys.donations(address ?? ""),
    queryFn: () => fetchDonationsByUser(address!, publicClient),
    enabled: !!publicClient && isConnected && !!address,
    staleTime: CAMPAIGNS_STALE_TIME,
  })
}

/** Featured campaigns for homepage */
export function useFeaturedCampaigns() {
  const publicClient = usePublicClient()

  return useQuery<Campaign[]>({
    queryKey: campaignKeys.featured,
    queryFn: () => fetchFeaturedCampaigns(publicClient),
    enabled: !!publicClient,
    staleTime: CAMPAIGNS_STALE_TIME,
  })
}

/** Hook to invalidate campaign caches after mutations (donate, withdraw, etc.) */
export function useInvalidateCampaigns() {
  const queryClient = useQueryClient()

  return {
    /** Invalidate a specific campaign detail */
    invalidateCampaign: (address: string) =>
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(address) }),

    /** Invalidate all campaign lists (after create, withdraw, etc.) */
    invalidateAll: () =>
      queryClient.invalidateQueries({ queryKey: ["campaigns"] }),

    /** Invalidate user's donations (after donating) */
    invalidateDonations: (user: string) =>
      queryClient.invalidateQueries({ queryKey: campaignKeys.donations(user) }),

    /** Invalidate everything campaign-related */
    invalidateEverything: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] })
      queryClient.invalidateQueries({ queryKey: ["campaign"] })
      queryClient.invalidateQueries({ queryKey: ["donations"] })
    },
  }
}
