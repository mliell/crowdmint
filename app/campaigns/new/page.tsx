"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAccount, useConnect, useSwitchChain } from "wagmi"
import { injected } from "wagmi/connectors"
import { useWeb3Clients } from "@/hooks/use-web3-client"
import { arcTestnet } from "@/config/web3"
import { CAMPAIGN_CATEGORIES } from "@/types/campaign"
import { formatUsdc } from "@/lib/campaigns"
import { createCampaign } from "@/lib/contracts"
import { uploadMetadataToIPFS } from "@/lib/metadata"
import { parseUnits } from "viem"
import { Wallet, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface FormData {
  title: string
  shortDescription: string
  longDescription: string
  goalAmount: string
  deadline: string
  type: "goal-based" | "flexible"
  category: string
  imageUrl: string
  minContribution: string
}

export default function CreateCampaignPage() {
  const router = useRouter()
  const { address, isConnected, chain } = useAccount()
  const { walletClient } = useWeb3Clients()
  const { connect } = useConnect()
  const { switchChainAsync } = useSwitchChain()

  const handleConnect = () => {
    connect({ connector: injected() })
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})

  const [formData, setFormData] = useState<FormData>({
    title: "",
    shortDescription: "",
    longDescription: "",
    goalAmount: "",
    deadline: "",
    type: "goal-based",
    category: "",
    imageUrl: "",
    minContribution: "",
  })

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.title.trim()) {
      newErrors.title = "Title is required"
    }
    if (!formData.shortDescription.trim()) {
      newErrors.shortDescription = "Short description is required"
    }
    if (!formData.goalAmount || Number(formData.goalAmount) <= 0) {
      newErrors.goalAmount = "Goal must be greater than 0"
    }
    if (!formData.deadline) {
      newErrors.deadline = "Deadline is required"
    } else if (new Date(formData.deadline) <= new Date()) {
      newErrors.deadline = "Deadline must be in the future"
    }
    if (!formData.category) {
      newErrors.category = "Category is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    if (!isConnected || !address) {
      toast.error("Please connect your wallet")
      return
    }

    // Verificar e trocar rede se necessário
    if (chain?.id !== arcTestnet.id) {
      try {
        toast.info(`Switching to ${arcTestnet.name}...`)
        await switchChainAsync({ chainId: arcTestnet.id })
        toast.success("Network switched successfully!")
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error: any) {
        console.error("Error switching network:", error)
        toast.error(`Please switch to ${arcTestnet.name} manually in your wallet`)
        return
      }
    }

    let attempts = 0
    let currentWalletClient = walletClient
    while (!currentWalletClient && attempts < 6) {
      await new Promise(resolve => setTimeout(resolve, 500))
      attempts++
      currentWalletClient = walletClient
    }

    if (!currentWalletClient) {
      toast.error("Wallet client not ready. Please disconnect and reconnect your wallet, then try again.")
      return
    }

    setIsSubmitting(true)

    try {
      const metadata = {
        title: formData.title,
        shortDescription: formData.shortDescription,
        longDescription: formData.longDescription || undefined,
        imageUrl: formData.imageUrl || undefined,
        category: formData.category || undefined,
      }

      const metadataURI = await uploadMetadataToIPFS(metadata)

      console.log("Creating campaign with metadata:", metadata)
      console.log("Metadata URI:", metadataURI)

      const goalAmount = parseUnits(formData.goalAmount, 6)
      const deadline = BigInt(Math.floor(new Date(formData.deadline).getTime() / 1000))
      const minContribution = formData.minContribution
        ? parseUnits(formData.minContribution, 6)
        : parseUnits("0", 6)

      console.log("Campaign parameters:", {
        goal: goalAmount.toString(),
        deadline: deadline.toString(),
        goalBased: formData.type === "goal-based",
        metadataURI,
        minContribution: minContribution.toString(),
      })

      const hash = await createCampaign(
        goalAmount,
        deadline,
        formData.type === "goal-based",
        metadataURI,
        minContribution,
        currentWalletClient,
        address,
      )

      setTxHash(hash)
      setIsSuccess(true)
      toast.success("Campaign created successfully!")

      await new Promise((resolve) => setTimeout(resolve, 3000))
    } catch (error: any) {
      console.error("Error creating campaign:", error)
      toast.error(error?.message || "Failed to create campaign. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-crowd-silver/50 flex items-center justify-center mx-auto mb-6">
            <Wallet className="h-8 w-8 text-deep-trust" />
          </div>
          <h1 className="text-2xl font-bold text-deep-trust mb-4">Connect Your Wallet</h1>
          <p className="text-carbon-clarity mb-8">You need to connect your wallet to create a campaign on CrowdMint.</p>
          <Button onClick={handleConnect} className="bg-mint-pulse hover:bg-mint-pulse/90 text-white font-semibold">
            <Wallet className="mr-2 h-4 w-4" />
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-mint-pulse/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-8 w-8 text-mint-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-deep-trust mb-4">Campaign Created!</h1>
          <p className="text-carbon-clarity mb-8">
            Your campaign has been submitted to the blockchain. It will be visible once the transaction is confirmed.
          </p>
          {txHash && (
            <p className="text-sm text-carbon-clarity mb-4 font-mono break-all">
              TX: {txHash}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-deep-trust hover:bg-deep-trust/90">
              <Link href="/my/campaigns">View My Campaigns</Link>
            </Button>
            <Button
              variant="outline"
              className="border-deep-trust text-deep-trust bg-transparent"
              onClick={() => {
                setIsSuccess(false)
                setFormData({
                  title: "",
                  shortDescription: "",
                  longDescription: "",
                  goalAmount: "",
                  deadline: "",
                  type: "goal-based",
                  category: "",
                  imageUrl: "",
                  minContribution: "",
                })
              }}
            >
              Create Another
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Button asChild variant="ghost" className="mb-6 text-carbon-clarity hover:text-deep-trust">
        <Link href="/campaigns">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Link>
      </Button>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-deep-trust mb-2">Create a Campaign</h1>
        <p className="text-carbon-clarity mb-8">Launch your project and connect with backers from around the world.</p>

        <div className="grid lg:grid-cols-5 gap-8">
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-carbon-clarity">
                Campaign Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Give your campaign a catchy title"
                className={`border-crowd-silver focus:border-deep-trust ${errors.title ? "border-red-500" : ""}`}
              />
              {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDescription" className="text-carbon-clarity">
                Short Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => updateField("shortDescription", e.target.value)}
                placeholder="A brief summary of your campaign (shown in listings)"
                rows={2}
                className={`border-crowd-silver focus:border-deep-trust ${
                  errors.shortDescription ? "border-red-500" : ""
                }`}
              />
              {errors.shortDescription && <p className="text-xs text-red-500">{errors.shortDescription}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="longDescription" className="text-carbon-clarity">
                Full Description
              </Label>
              <Textarea
                id="longDescription"
                value={formData.longDescription}
                onChange={(e) => updateField("longDescription", e.target.value)}
                placeholder="Tell backers more about your project, goals, and how you'll use the funds"
                rows={6}
                className="border-crowd-silver focus:border-deep-trust"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goalAmount" className="text-carbon-clarity">
                  Goal Amount (USDC) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="goalAmount"
                  type="number"
                  min="1"
                  step="1"
                  value={formData.goalAmount}
                  onChange={(e) => updateField("goalAmount", e.target.value)}
                  placeholder="1000"
                  className={`border-crowd-silver focus:border-deep-trust ${errors.goalAmount ? "border-red-500" : ""}`}
                />
                {errors.goalAmount && <p className="text-xs text-red-500">{errors.goalAmount}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="deadline" className="text-carbon-clarity">
                  Deadline <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                  onChange={(e) => updateField("deadline", e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className={`border-crowd-silver focus:border-deep-trust ${errors.deadline ? "border-red-500" : ""}`}
                />
                {errors.deadline && <p className="text-xs text-red-500">{errors.deadline}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minContribution" className="text-carbon-clarity">
                Minimum Contribution (USDC)
              </Label>
              <Input
                id="minContribution"
                type="number"
                min="0"
                step="0.01"
                value={formData.minContribution}
                onChange={(e) => updateField("minContribution", e.target.value)}
                placeholder="0 (optional - no minimum)"
                className="border-crowd-silver focus:border-deep-trust"
              />
              <p className="text-xs text-carbon-clarity">
                Set a minimum donation amount. Leave empty or set to 0 for no minimum.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-carbon-clarity">
                Campaign Type <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value) => updateField("type", value as "goal-based" | "flexible")}
                className="grid sm:grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="type-goal"
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.type === "goal-based"
                      ? "border-deep-trust bg-deep-trust/5"
                      : "border-crowd-silver hover:border-deep-trust/50"
                  }`}
                >
                  <RadioGroupItem value="goal-based" id="type-goal" />
                  <div>
                    <p className="font-medium text-deep-trust">Goal-based</p>
                    <p className="text-xs text-carbon-clarity mt-1">
                      All-or-nothing: funds are returned if goal isn&apos;t met.
                    </p>
                  </div>
                </Label>
                <Label
                  htmlFor="type-flexible"
                  className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    formData.type === "flexible"
                      ? "border-deep-trust bg-deep-trust/5"
                      : "border-crowd-silver hover:border-deep-trust/50"
                  }`}
                >
                  <RadioGroupItem value="flexible" id="type-flexible" />
                  <div>
                    <p className="font-medium text-deep-trust">Flexible</p>
                    <p className="text-xs text-carbon-clarity mt-1">Keep all funds raised regardless of goal.</p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-carbon-clarity">
                Category <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.category} onValueChange={(value) => updateField("category", value)}>
                <SelectTrigger
                  className={`border-crowd-silver focus:border-deep-trust ${errors.category ? "border-red-500" : ""}`}
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-red-500">{errors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl" className="text-carbon-clarity">
                Image URL (optional)
              </Label>
              <Input
                id="imageUrl"
                type="url"
                value={formData.imageUrl}
                onChange={(e) => updateField("imageUrl", e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="border-crowd-silver focus:border-deep-trust"
              />
              <p className="text-xs text-carbon-clarity">Provide a URL to an image for your campaign banner.</p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-mint-pulse hover:bg-mint-pulse/90 text-white font-semibold py-6"
            >
              {isSubmitting ? "Creating Campaign..." : "Create Campaign"}
            </Button>
          </form>

          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <h3 className="text-sm font-semibold text-carbon-clarity mb-4">Preview</h3>
              <Card className="border-crowd-silver">
                <div className="h-40 bg-gradient-to-br from-deep-trust/10 to-mint-pulse/10 flex items-center justify-center">
                  {formData.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.imageUrl || "/placeholder.svg"}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl font-bold text-deep-trust/20">{formData.title?.charAt(0) || "?"}</span>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-deep-trust/10 text-deep-trust border border-deep-trust/20">
                      {formData.type === "goal-based" ? "Goal-based" : "Flexible"}
                    </span>
                    {formData.category && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-crowd-silver text-carbon-clarity">
                        {formData.category}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-deep-trust line-clamp-1">
                    {formData.title || "Your Campaign Title"}
                  </h3>
                  <p className="text-sm text-carbon-clarity line-clamp-2 mt-1">
                    {formData.shortDescription || "A brief description of your campaign..."}
                  </p>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-deep-trust">0 USDC</span>
                      <span className="text-carbon-clarity">
                        of {formData.goalAmount ? formatUsdc(Number(formData.goalAmount)) : "0"} USDC
                      </span>
                    </div>
                    <div className="h-2 bg-crowd-silver rounded-full overflow-hidden">
                      <div className="h-full w-0 bg-deep-trust rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
