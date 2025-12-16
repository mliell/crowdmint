// hooks/use-web3-client.ts
"use client"

import { useEffect, useState } from "react"
import { usePublicClient, useConnectorClient, useAccount } from "wagmi"
import { createPublicClient, http, createWalletClient, custom } from "viem"
import { arcTestnet } from "@/config/web3"

export function useWeb3Clients() {
  const publicClient = usePublicClient()
  const { data: connectorClient } = useConnectorClient()
  const { address, isConnected } = useAccount()
  const [walletClient, setWalletClient] = useState<any>(undefined)

  useEffect(() => {
    async function setupWalletClient() {
      // Se temos connectorClient do wagmi, use-o
      if (connectorClient) {
        console.log("✅ Using wagmi connectorClient")
        setWalletClient(connectorClient)
        return
      }

      // Fallback: se conectado mas sem connectorClient, use window.ethereum diretamente
      if (isConnected && address && typeof window !== "undefined" && window.ethereum) {
        try {
          console.log("⚠️ Fallback: Creating walletClient from window.ethereum")
          const client = createWalletClient({
            account: address,
            chain: arcTestnet,
            transport: custom(window.ethereum),
          })
          setWalletClient(client)
        } catch (error) {
          console.error("❌ Failed to create fallback walletClient:", error)
        }
      } else {
        setWalletClient(undefined)
      }
    }

    setupWalletClient()
  }, [connectorClient, isConnected, address])

  const fallbackPublicClient = publicClient || createPublicClient({
    chain: arcTestnet,
    transport: http(),
  })

  console.log("🔧 useWeb3Clients:", {
    hasPublicClient: !!fallbackPublicClient,
    hasConnectorClient: !!connectorClient,
    hasWalletClient: !!walletClient,
    isConnected,
    hasWindowEthereum: typeof window !== "undefined" && !!window.ethereum,
  })

  return {
    publicClient: fallbackPublicClient,
    walletClient,
  }
}
