"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CampaignCard } from "@/components/campaign/campaign-card"
import { fetchAllCampaigns } from "@/lib/campaigns"
import { useWeb3Clients } from "@/hooks/use-web3-client"
import type { Campaign } from "@/types/campaign"
import { Search } from "lucide-react"
import useSWR from "swr"

type FilterType = "all" | "goal-based" | "flexible"
type FilterStatus = "all" | "active" | "ended"

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<FilterType>("all")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")
  const { publicClient } = useWeb3Clients()

  const { data: campaigns = [], isLoading } = useSWR<Campaign[]>(
    publicClient ? "campaigns" : null,
    () => fetchAllCampaigns(publicClient || undefined),
  )

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      // Search filter
      const matchesSearch =
        searchQuery === "" ||
        campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())

      // Type filter
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "goal-based" && campaign.goalBased) ||
        (typeFilter === "flexible" && !campaign.goalBased)

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && campaign.isActive && !campaign.isExpired) ||
        (statusFilter === "ended" && campaign.isExpired)

      return matchesSearch && matchesType && matchesStatus
    })
  }, [campaigns, searchQuery, typeFilter, statusFilter])

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-deep-trust mb-2">All Campaigns</h1>
        <p className="text-carbon-clarity">Discover and support innovative projects from creators around the world.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        {/* Search */}
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

        {/* Type filter */}
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

        {/* Status filter */}
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
      </div>

      {/* Campaign Grid */}
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

      {/* Results count */}
      {!isLoading && filteredCampaigns.length > 0 && (
        <p className="text-sm text-carbon-clarity mt-8 text-center">
          Showing {filteredCampaigns.length} of {campaigns.length} campaigns
        </p>
      )}
    </div>
  )
}
