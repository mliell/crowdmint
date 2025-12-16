// hooks/use-web3-client.ts
"use client"

import { useMemo } from "react"
import { usePublicClient, useAccount, useConnectorClient } from "wagmi"
import { createPublicClient, http, createWalletClient, custom } from "viem"
import { arcTestnet } from "@/config/web3"

export function useWeb3Clients() {
  const publicClient = usePublicClient()
  const { address } = useAccount()
  const { data: connectorClient } = useConnectorClient()

  // Cria wallet client a partir do connector client
  const walletClient = useMemo(() => {
    if (!connectorClient || !address) return undefined

    return createWalletClient({
       arcTestnet,
      transport: custom(connectorClient.transport),
    })
  }, [connectorClient, address])

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
