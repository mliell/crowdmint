import { cn } from "@/lib/utils"

interface ProgressBarProps {
  percent: number
  size?: "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function ProgressBar({ percent, size = "md", showLabel = false, className }: ProgressBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent))

  const heightClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  }

  return (
    <div className={cn("w-full", className)}>
      <div className={cn("w-full bg-crowd-silver rounded-full overflow-hidden", heightClasses[size])}>
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            clampedPercent >= 100 ? "bg-mint-pulse" : "bg-deep-trust",
          )}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      {showLabel && <p className="text-xs text-carbon-clarity mt-1 text-right">{clampedPercent}% funded</p>}
    </div>
  )
}
