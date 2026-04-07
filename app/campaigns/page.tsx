"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CampaignCard } from "@/components/campaign/campaign-card"
import { useAllCampaigns } from "@/hooks/use-campaigns"
import type { Campaign } from "@/types/campaign"
import { Search, ArrowUpDown } from "lucide-react"

type FilterType = "all" | "goal-based" | "flexible"
type FilterStatus = "all" | "active" | "ended"
type SortOption = "newest" | "most-funded" | "most-backers" | "ending-soon" | "highest-goal" | "closest-to-goal"

const sortLabels: Record<SortOption, string> = {
  "newest": "Newest",
  "most-funded": "Most Funded",
  "most-backers": "Most Backers",
  "ending-soon": "Ending Soon",
  "highest-goal": "Highest Goal",
  "closest-to-goal": "Closest to Goal",
}

function getProgress(c: Campaign): number {
  if (c.goalUsdc === 0) return 0
  return Math.min(100, (c.raisedUsdc / c.goalUsdc) * 100)
}

function sortCampaigns(campaigns: Campaign[], sortBy: SortOption): Campaign[] {
  return campaigns.toSorted((a, b) => {
    switch (sortBy) {
      case "newest":
        // Array from factory is oldest-first, so reverse: b index > a index = newer
        // Since we don't have index, reverse the original order
        return 0 // handled by reversing before sort
      case "most-funded":
        return b.raisedUsdc - a.raisedUsdc
      case "most-backers":
        return (b.backersCount ?? 0) - (a.backersCount ?? 0)
      case "ending-soon": {
        // Active non-expired first (sorted by closest deadline), then expired at the end
        const aActive = a.isActive && !a.isExpired ? 0 : 1
        const bActive = b.isActive && !b.isExpired ? 0 : 1
        if (aActive !== bActive) return aActive - bActive
        return a.deadline.getTime() - b.deadline.getTime()
      }
      case "highest-goal":
        return b.goalUsdc - a.goalUsdc
      case "closest-to-goal": {
        // Highest progress % first, but cap at 100 and treat goal=0 as 0%
        return getProgress(b) - getProgress(a)
      }
      default:
        return 0
    }
  })
}

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<FilterType>("all")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("active")
  const [sortBy, setSortBy] = useState<SortOption>("newest")

  const { data: campaigns = [], isLoading } = useAllCampaigns()

  const filteredCampaigns = useMemo(() => {
    // Start with reversed array (newest first — factory returns oldest first)
    const reversed = [...campaigns].reverse()

    const filtered = reversed.filter((campaign) => {
      const matchesSearch =
        searchQuery === "" ||
        campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "goal-based" && campaign.goalBased) ||
        (typeFilter === "flexible" && !campaign.goalBased)

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && campaign.isActive && !campaign.isExpired) ||
        (statusFilter === "ended" && campaign.isExpired)

      return matchesSearch && matchesType && matchesStatus
    })

    // "newest" is already handled by the reverse above
    if (sortBy === "newest") return filtered
    return sortCampaigns(filtered, sortBy)
  }, [campaigns, searchQuery, typeFilter, statusFilter, sortBy])

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-deep-trust mb-2">All Campaigns</h1>
        <p className="text-carbon-clarity">Discover and support innovative projects from creators around the world.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-carbon-clarity" />
          <Input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-crowd-silver focus:border-deep-trust"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "goal-based", "flexible"] as FilterType[]).map((type) => (
            <Button
              key={type}
              variant={typeFilter === type ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(type)}
              className={
                typeFilter === type
                  ? "bg-deep-trust hover:bg-deep-trust/90"
                  : "border-crowd-silver text-carbon-clarity hover:border-deep-trust hover:text-deep-trust"
              }
            >
              {type === "all" ? "All Types" : type === "goal-based" ? "Goal-based" : "Flexible"}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          {(["all", "active", "ended"] as FilterStatus[]).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={
                statusFilter === status
                  ? "bg-mint-pulse hover:bg-mint-pulse/90"
                  : "border-crowd-silver text-carbon-clarity hover:border-mint-pulse hover:text-mint-pulse"
              }
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>

        {/* Sort dropdown */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-[180px] border-crowd-silver focus:border-deep-trust">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-3.5 w-3.5 text-carbon-clarity" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(sortLabels) as [SortOption, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-96 rounded-lg bg-crowd-silver animate-pulse" />
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-carbon-clarity text-lg">No campaigns found matching your criteria.</p>
          <Button
            variant="outline"
            className="mt-4 border-deep-trust text-deep-trust bg-transparent"
            onClick={() => {
              setSearchQuery("")
              setTypeFilter("all")
              setStatusFilter("all")
              setSortBy("newest")
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.address} campaign={campaign} />
          ))}
        </div>
      )}

      {!isLoading && filteredCampaigns.length > 0 && (
        <p className="text-sm text-carbon-clarity mt-8 text-center">
          Showing {filteredCampaigns.length} of {campaigns.length} campaigns
        </p>
      )}
    </div>
  )
}
