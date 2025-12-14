"use client"

import { usePublicClient, useWalletClient } from "wagmi"
import { createPublicClient, http } from "viem"
import { arcTestnet } from "@/config/web3"

/**
 * Hook to get Web3 clients (public and wallet)
 * Falls back to a direct RPC connection if usePublicClient returns undefined
 */
export function useWeb3Clients() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  // Fallback: create a public client directly if wagmi's usePublicClient is undefined
  const fallbackPublicClient = publicClient || createPublicClient({
    chain: arcTestnet,
    transport: http(),
  })

  return {
    publicClient: fallbackPublicClient,
    walletClient,
  }
}

