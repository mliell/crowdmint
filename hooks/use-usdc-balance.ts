"use client"

import { useAccount, useReadContract } from "wagmi"
import { contracts } from "@/config/web3"
import { erc20Abi } from "@/contracts/abis"
import { formatUnits } from "viem"

/**
 * Hook to get USDC balance for the connected wallet
 */
export function useUsdcBalance() {
  const { address, isConnected } = useAccount()

  const { data: balance, isLoading, error } = useReadContract({
    address: contracts.usdc,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && !!contracts.usdc,
    },
  })

  return {
    balance: balance ? Number(formatUnits(balance, 6)) : 0, // USDC has 6 decimals
    rawBalance: balance || 0n,
    isLoading,
    error,
  }
}

