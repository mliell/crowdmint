import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Page Not Found</h1>
          <p className="text-muted-foreground">The documentation page you're looking for doesn't exist.</p>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild className="gap-2">
            <Link href="/docs">
              <ArrowLeft className="h-4 w-4" />
              Back to Documentation
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Go to Home</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          If you think this page should exist, please check the URL or use the search to find what you're looking for.
        </p>
      </div>
    </div>
  )
}
