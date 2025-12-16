"use client"

import { createContext, useContext, type ReactNode } from "react"
import { createConfig, http, WagmiProvider } from "wagmi"
import { injected, walletConnect } from "wagmi/connectors"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { arcTestnet } from "@/config/web3"

// Cria o config do wagmi com configuração mais completa
const config = createConfig({
  chains: [arcTestnet],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
    // Adicione WalletConnect como fallback (opcional)
    // walletConnect({ projectId: "seu-project-id" }),
  ],
  transports: {
    [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]),
  },
  ssr: false,
  // IMPORTANTE: adicione estas opções
  multiInjectedProviderDiscovery: true,
})

// Cria o query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 3,
      staleTime: 30_000, // 30 segundos
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
