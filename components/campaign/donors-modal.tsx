"use client"

import { useState, useMemo, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { usePublicClient } from "wagmi"
import type { Address } from "viem"
import { formatUnits } from "viem"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getDonorsList, getDonorContribution } from "@/lib/contracts"
import { formatUsdc, shortenAddress } from "@/lib/campaigns"
import { getAddressExplorerUrl } from "@/config/web3"
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  ExternalLink,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

interface DonorEntry {
  address: Address
  amountUsdc: number
  amountRaw: bigint
}

type SortField = "address" | "amount"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 10

interface DonorsModalProps {
  campaignAddress: Address
  campaignTitle: string
  children: React.ReactNode
}

export function DonorsModal({ campaignAddress, campaignTitle, children }: DonorsModalProps) {
  const publicClient = usePublicClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>("amount")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(0)

  // Fetch donors only when modal is open
  const { data: donors = [], isLoading } = useQuery<DonorEntry[]>({
    queryKey: ["donors", campaignAddress],
    queryFn: async () => {
      if (!publicClient) return []
      const addresses = await getDonorsList(campaignAddress, publicClient)
      if (addresses.length === 0) return []

      const results = await Promise.allSettled(
        addresses.map((addr) => getDonorContribution(campaignAddress, addr, publicClient)),
      )

      return addresses
        .map((addr, i) => {
          const result = results[i]
          const amountRaw = result.status === "fulfilled" ? result.value : 0n
          return {
            address: addr,
            amountRaw,
            amountUsdc: Number(formatUnits(amountRaw, 6)),
          }
        })
        .filter((d) => d.amountRaw > 0n)
    },
    enabled: open && !!publicClient,
    staleTime: 30_000,
  })

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return donors
    const q = search.toLowerCase()
    return donors.filter((d) => d.address.toLowerCase().includes(q))
  }, [donors, search])

  // Sort
  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      if (sortField === "amount") {
        return sortDir === "desc" ? b.amountUsdc - a.amountUsdc : a.amountUsdc - b.amountUsdc
      }
      // Sort by address
      const cmp = a.address.toLowerCase().localeCompare(b.address.toLowerCase())
      return sortDir === "desc" ? -cmp : cmp
    })
    return list
  }, [filtered, sortField, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages - 1)
  const paginated = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  // Reset page when search or sort changes
  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(0)
  }, [])

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir(field === "amount" ? "desc" : "asc")
    }
    setPage(0)
  }, [sortField])

  // CSV export
  const handleExportCsv = useCallback(() => {
    if (sorted.length === 0) return
    const header = "Wallet Address,Amount (USDC)\n"
    const rows = sorted.map((d) => `${d.address},${d.amountUsdc}`).join("\n")
    const csv = header + rows

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `donors-${campaignAddress.slice(0, 8)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }, [sorted, campaignAddress])

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-carbon-clarity/50" />
    return sortDir === "asc"
      ? <ArrowUp className="h-3.5 w-3.5" />
      : <ArrowDown className="h-3.5 w-3.5" />
  }

  const totalDonated = useMemo(
    () => donors.reduce((sum, d) => sum + d.amountUsdc, 0),
    [donors],
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-deep-trust flex items-center gap-2">
            <Users className="h-5 w-5" />
            Donors
          </DialogTitle>
          <DialogDescription className="text-sm text-carbon-clarity">
            {campaignTitle}
          </DialogDescription>
        </DialogHeader>

        {/* Stats bar */}
        {!isLoading && donors.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-carbon-clarity">
              <span className="font-semibold text-deep-trust">{donors.length}</span> donors
            </span>
            <span className="text-carbon-clarity">
              Total: <span className="font-semibold text-mint-pulse">{formatUsdc(totalDonated)} USDC</span>
            </span>
          </div>
        )}

        {/* Search + Export */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-carbon-clarity" />
            <Input
              type="text"
              placeholder="Search by wallet address..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 border-crowd-silver focus:border-deep-trust"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={sorted.length === 0}
            className="border-crowd-silver text-carbon-clarity hover:border-deep-trust hover:text-deep-trust bg-transparent shrink-0"
          >
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded bg-crowd-silver animate-pulse" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 text-carbon-clarity/30 mx-auto mb-3" />
              <p className="text-carbon-clarity">
                {donors.length === 0
                  ? "No donors yet."
                  : "No donors match your search."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-carbon-clarity">#</TableHead>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("address")}
                      className="flex items-center gap-1 hover:text-deep-trust transition-colors"
                    >
                      Wallet
                      <SortIcon field="address" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => toggleSort("amount")}
                      className="flex items-center gap-1 ml-auto hover:text-deep-trust transition-colors"
                    >
                      Amount
                      <SortIcon field="amount" />
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((donor, i) => (
                  <TableRow key={donor.address}>
                    <TableCell className="text-carbon-clarity/60 text-xs">
                      {currentPage * PAGE_SIZE + i + 1}
                    </TableCell>
                    <TableCell>
                      <a
                        href={getAddressExplorerUrl(donor.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-sm text-deep-trust hover:underline"
                      >
                        {shortenAddress(donor.address, 6)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-mint-pulse">
                      {formatUsdc(donor.amountUsdc)} USDC
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 border-t border-crowd-silver">
            <p className="text-xs text-carbon-clarity">
              Page {currentPage + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="h-8 w-8 p-0 border-crowd-silver bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="h-8 w-8 p-0 border-crowd-silver bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
