import { defineChain } from "viem"

// Arc Network Testnet configuration
export const arcTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 5042002,
  name: "Arc Network Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "ETH",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.testnet.arc.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer.testnet.arc.network",
    },
  },
  testnet: true,
})

// Contract addresses
export const contracts = {
  factory: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}` | undefined,
  vault: process.env.NEXT_PUBLIC_CROWDMINT_VAULT_ADDRESS as `0x${string}` | undefined,
  usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}` | undefined,
}

// WalletConnect project ID
export const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || ""

// Explorer URL helper
export const getExplorerUrl = (path: string) => {
  const baseUrl = process.env.NEXT_PUBLIC_EXPLORER_URL || "https://explorer.testnet.arc.network"
  return `${baseUrl}${path}`
}

export const getAddressExplorerUrl = (address: string) => getExplorerUrl(`/address/${address}`)
export const getTxExplorerUrl = (hash: string) => getExplorerUrl(`/tx/${hash}`)
