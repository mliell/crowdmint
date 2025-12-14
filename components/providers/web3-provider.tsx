"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createConfig, http, useAccount, useConnect, useDisconnect, WagmiProvider } from "wagmi"
import { injected } from "wagmi/connectors"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { arcTestnet } from "@/config/web3"

// Create wagmi config with only injected connector (MetaMask, etc.)
// WalletConnect requires proper origin configuration which doesn't work in preview
const config = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(),
  },
})

// Create query client
const queryClient = new QueryClient()

// Wallet context for easy access throughout the app
interface WalletContextType {
  isConnected: boolean
  address: `0x${string}` | undefined
  connect: () => void
  disconnect: () => void
  isConnecting: boolean
}

const WalletContext = createContext<WalletContextType | null>(null)

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within Web3Provider")
  }
  return context
}

function WalletProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleConnect = () => {
    // Use injected wallet (MetaMask, etc.)
    const injectedConnector = connectors.find((c) => c.id === "injected")
    if (injectedConnector) {
      connect({ connector: injectedConnector })
    }
  }

  const value: WalletContextType = {
    isConnected: mounted ? isConnected : false,
    address: mounted ? address : undefined,
    connect: handleConnect,
    disconnect,
    isConnecting: isPending,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>{children}</WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
