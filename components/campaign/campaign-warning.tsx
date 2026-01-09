import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

export function CampaignWarning() {
  return (
    <Alert className="border-l-4 border-l-vault-gold bg-vault-gold/5 border-vault-gold/30">
      <AlertCircle className="h-4 w-4 text-vault-gold" />
      <AlertDescription className="text-sm text-carbon-clarity">
        <div className="space-y-2">
          <p className="font-semibold text-carbon-clarity">Review all details carefully</p>
          <p>After a campaign is created, it cannot be changed or edited.</p>
          <p className="mt-3 font-semibold text-carbon-clarity">Fees</p>
          <p>
            Creating a campaign is free (you only pay ARC network fees). If the campaign is successful, a 0.5% fee will
            be applied when withdrawing funds.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  )
}
