// hooks/use-web3-client.ts
"use client"

import { usePublicClient, useConnectorClient } from "wagmi"
import { createPublicClient, http } from "viem"
import { arcTestnet } from "@/config/web3"

export function useWeb3Clients() {
  const publicClient = usePublicClient()
  const { data: connectorClient } = useConnectorClient()

  // O connectorClient do wagmi já é um wallet client válido
  // Não precisamos criar um novo, apenas retorná-lo
  const walletClient = connectorClient

  // Fallback: create a public client directly if wagmi's usePublicClient is undefined
  const fallbackPublicClient = publicClient || createPublicClient({
    chain: arcTestnet,
    transport: http(),
  })

  // Debug log
  console.log("🔧 useWeb3Clients:", {
    hasPublicClient: !!fallbackPublicClient,
    hasConnectorClient: !!connectorClient,
    connectorClientType: connectorClient ? typeof connectorClient : "undefined",
  })

  return {
    publicClient: fallbackPublicClient,
    walletClient,
  }
}
