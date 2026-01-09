"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, Loader2 } from "lucide-react"
import { ImageCropper } from "./image-cropper"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  onError?: (error: string) => void
  onUploadStateChange?: (isUploading: boolean) => void
}

export function ImageUpload({ value, onChange, onError, onUploadStateChange }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(value)
  const [fileName, setFileName] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<string | null>(null) // objectURL
  const [isCropping, setIsCropping] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreviewUrl(value)
  }, [value])

  const uploadCroppedImage = async (blob: Blob) => {
    setIsUploading(true)
    onUploadStateChange?.(true)

    try {
      const formData = new FormData()
      formData.append("file", blob, "campaign-image.jpg")

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Upload failed")
      }

      const data = await response.json()
      setPreviewUrl(data.url)
      onChange(data.url)

      // cleanup objectURL
      if (selectedFile) URL.revokeObjectURL(selectedFile)
      setSelectedFile(null)

      setIsCropping(false)
      onError?.("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed"
      onError?.(message)
    } finally {
      setIsUploading(false)
      onUploadStateChange?.(false)
    }
  }

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      onError?.("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      onError?.("File size must be less than 5MB")
      return
    }

    // (Opcional) valida dimensão mínima para não ficar muito borrado
    try {
      const bmp = await createImageBitmap(file)
      const w = bmp.width
      const h = bmp.height
      bmp.close?.()

      const minW = 600
      const minH = 315
      if (w < minW || h < minH) {
        onError?.(`Image too small (${w}×${h}). Use at least ${minW}×${minH} (recommended).`)
        return
      }
    } catch {
      // se falhar, deixa passar (ou você pode bloquear)
    }

    setFileName(file.name)

    // troca de arquivo: limpa objectURL anterior
    if (selectedFile) URL.revokeObjectURL(selectedFile)

    const objectUrl = URL.createObjectURL(file)
    setSelectedFile(objectUrl)
    setIsCropping(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void handleFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFileSelect(file)
  }

  const handleRemove = () => {
    setPreviewUrl("")
    onChange("")
    setFileName("")
    if (inputRef.current) inputRef.current.value = ""

    if (selectedFile) URL.revokeObjectURL(selectedFile)
    setSelectedFile(null)
    setIsCropping(false)
  }

  if (isCropping && selectedFile) {
    return (
      <div className="space-y-3">
        <Label className="text-carbon-clarity">Crop Campaign Image</Label>
        <ImageCropper
          imageSrc={selectedFile}
          onCropComplete={uploadCroppedImage}
          onCancel={() => {
            if (selectedFile) URL.revokeObjectURL(selectedFile)
            setSelectedFile(null)
            setIsCropping(false)
            setFileName("")
            if (inputRef.current) inputRef.current.value = ""
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Label className="text-carbon-clarity">Campaign Image (optional)</Label>

      {previewUrl ? (
        <div className="relative w-full rounded-lg overflow-hidden border border-crowd-silver">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl || "/placeholder.svg"} alt="Campaign preview" className="w-full h-48 object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            disabled={isUploading}
            className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          {fileName && <p className="text-xs text-carbon-clarity p-2 bg-white/90 dark:bg-background">{fileName}</p>}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="border-2 border-dashed border-crowd-silver rounded-lg p-8 text-center hover:border-deep-trust/50 transition-colors cursor-pointer"
        >
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            disabled={isUploading}
            className="hidden"
          />

          <div onClick={() => inputRef.current?.click()} className="flex flex-col items-center gap-2">
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 text-deep-trust animate-spin" />
                <p className="text-sm text-carbon-clarity">Uploading...</p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-deep-trust" />
                <div>
                  <p className="text-sm font-medium text-deep-trust">Click to upload or drag and drop</p>
                  <p className="text-xs text-carbon-clarity mt-1">
                    PNG, JPG, GIF up to 5MB (will be cropped to 1200×630)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
