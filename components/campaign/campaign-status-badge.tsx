import { cn } from "@/lib/utils"
import type { CampaignStatus } from "@/types/campaign"

interface CampaignStatusBadgeProps {
  status: CampaignStatus
  goalBased?: boolean
  className?: string
}

const statusConfig: Record<CampaignStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-mint-pulse/10 text-mint-pulse border-mint-pulse/20",
  },
  "goal-reached": {
    label: "Goal Reached",
    className: "bg-vault-gold/10 text-vault-gold border-vault-gold/20",
  },
  "expired-goal-met": {
    label: "Successful",
    className: "bg-mint-pulse/10 text-mint-pulse border-mint-pulse/20",
  },
  "expired-goal-not-met": {
    label: "Ended",
    className: "bg-carbon-clarity/10 text-carbon-clarity border-carbon-clarity/20",
  },
  withdrawn: {
    label: "Withdrawn",
    className: "bg-carbon-clarity/10 text-carbon-clarity border-carbon-clarity/20",
  },
}

export function CampaignStatusBadge({ status, goalBased, className }: CampaignStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
          config.className,
          className,
        )}
      >
        {config.label}
      </span>
      {goalBased !== undefined && (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
            goalBased
              ? "bg-deep-trust/10 text-deep-trust border-deep-trust/20"
              : "bg-carbon-clarity/10 text-carbon-clarity border-carbon-clarity/20",
          )}
        >
          {goalBased ? "Goal-based" : "Flexible"}
        </span>
      )}
    </div>
  )
}
