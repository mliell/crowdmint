"use client"

import { createContext, useContext, type ReactNode } from "react"
import { createConfig, http, WagmiProvider } from "wagmi"
import { injected } from "wagmi/connectors"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { arcTestnet } from "@/config/web3"

// Cria o config do wagmi com transports explícitos
const config = createConfig({
  chains: [arcTestnet],
  connectors: [injected()],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
  },
  // IMPORTANTE: adicione esta linha
  ssr: false,
})

// Cria o query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
})

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
