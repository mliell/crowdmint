import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ProgressBar } from "@/components/campaign/progress-bar"
import { CampaignStatusBadge } from "@/components/campaign/campaign-status-badge"
import { formatUsdc, shortenAddress, getTimeRemaining, getProgressPercent } from "@/lib/campaigns"
import type { Campaign } from "@/types/campaign"
import { Clock, Users } from "lucide-react"

interface CampaignCardProps {
  campaign: Campaign
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const progress = getProgressPercent(campaign.raisedUsdc, campaign.goalUsdc)
  const timeRemaining = getTimeRemaining(campaign.deadline)

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image */}
      <div className="relative h-48 bg-muted">
        {campaign.imageUrl ? (
          <Image src={campaign.imageUrl || "/placeholder.svg"} alt={campaign.title} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-deep-trust/10 to-mint-pulse/10">
            <span className="text-4xl font-bold text-deep-trust/20">{campaign.title.charAt(0)}</span>
          </div>
        )}
        {campaign.category && (
          <span className="absolute top-3 left-3 px-2 py-1 bg-background/90 backdrop-blur-sm rounded-md text-xs font-medium text-muted-foreground">
            {campaign.category}
          </span>
        )}
      </div>

      <CardContent className="p-4">
        {/* Status badges */}
        <div className="mb-3">
          <CampaignStatusBadge status={campaign.status} goalBased={campaign.goalBased} />
        </div>

        {/* Title & Description */}
        <h3 className="font-semibold text-lg text-deep-trust line-clamp-1 mb-1">{campaign.title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{campaign.shortDescription}</p>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-deep-trust">{formatUsdc(campaign.raisedUsdc)} USDC</span>
            <span className="text-muted-foreground">of {formatUsdc(campaign.goalUsdc)} USDC</span>
          </div>
          <ProgressBar percent={progress} size="sm" />
        </div>

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{timeRemaining}</span>
          </div>
          {campaign.backersCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>{campaign.backersCount} backers</span>
            </div>
          )}
        </div>

        {/* Creator */}
        <p className="mt-2 text-xs text-muted-foreground/70">by {shortenAddress(campaign.creator)}</p>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full bg-deep-trust hover:bg-deep-trust/90 text-white">
          <Link href={`/campaigns/${campaign.address}`}>View Campaign</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
