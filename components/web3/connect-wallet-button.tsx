"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { injected } from "wagmi/connectors"
import { shortenAddress } from "@/lib/campaigns"
import { Wallet, LogOut, Copy, ExternalLink } from "lucide-react"
import { getAddressExplorerUrl } from "@/config/web3"
import { useState } from "react"

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const [copied, setCopied] = useState(false)

  const handleConnect = () => {
    connect({ connector: injected() })
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isConnected) {
    return (
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="bg-mint-pulse hover:bg-mint-pulse/90 text-white font-semibold"
      >
        <Wallet className="mr-2 h-4 w-4" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-deep-trust text-deep-trust font-semibold bg-transparent">
          <div className="w-2 h-2 rounded-full bg-mint-pulse mr-2" />
          {shortenAddress(address || "")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={copyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          {copied ? "Copied!" : "Copy Address"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={getAddressExplorerUrl(address || "")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on Explorer
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => disconnect()} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
