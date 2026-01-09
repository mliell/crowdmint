"use client"

import type React from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { RotateCw, ZoomIn } from "lucide-react"

interface ImageCropperProps {
  imageSrc: string
  onCropComplete: (croppedBlob: Blob) => void
  onCancel: () => void
}

type Point = { x: number; y: number }

const OUT_W = 1200
const OUT_H = 630
const ASPECT = OUT_W / OUT_H

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

async function loadHtmlImage(src: string) {
  const img = new Image()
  img.crossOrigin = "anonymous"
  img.decoding = "async"
  img.src = src
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error("Failed to load image"))
  })
  return img
}

// cover scale considerando rotação 0/90/180/270
function getCoverBaseScale(imgW: number, imgH: number, viewW: number, viewH: number, rotationDeg: number) {
  const swap = Math.abs(rotationDeg % 180) === 90
  const effectiveW = swap ? imgH : imgW
  const effectiveH = swap ? imgW : imgH
  return Math.max(viewW / effectiveW, viewH / effectiveH)
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null)

  const [viewSize, setViewSize] = useState({ w: 640, h: Math.round(640 / ASPECT) })
  const [zoom, setZoom] = useState(1) // 1..3
  const [rotation, setRotation] = useState(0) // 0/90/180/270
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 }) // viewport px

  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<Point>({ x: 0, y: 0 })
  const panStart = useRef<Point>({ x: 0, y: 0 })

  const rad = useMemo(() => (rotation * Math.PI) / 180, [rotation])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const loaded = await loadHtmlImage(imageSrc)
        if (cancelled) return
        setImgEl(loaded)
        setZoom(1)
        setRotation(0)
        setPan({ x: 0, y: 0 })
      } catch (e) {
        console.error(e)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [imageSrc])

  // viewport responsivo mantendo aspect
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current

    const ro = new ResizeObserver(() => {
      const maxW = el.clientWidth
      const w = Math.max(320, Math.min(900, maxW))
      const h = Math.round(w / ASPECT)
      setViewSize({ w, h })
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const clampPan = (candidate: Point, currentZoom = zoom, currentRotation = rotation) => {
    if (!imgEl) return candidate

    const baseScale = getCoverBaseScale(imgEl.width, imgEl.height, viewSize.w, viewSize.h, currentRotation)
    const scale = baseScale * currentZoom

    const swap = Math.abs(currentRotation % 180) === 90
    const drawnW = (swap ? imgEl.height : imgEl.width) * scale
    const drawnH = (swap ? imgEl.width : imgEl.height) * scale

    const limitX = Math.max(0, drawnW / 2 - viewSize.w / 2)
    const limitY = Math.max(0, drawnH / 2 - viewSize.h / 2)

    return {
      x: clamp(candidate.x, -limitX, limitX),
      y: clamp(candidate.y, -limitY, limitY),
    }
  }

  // clamp ao mudar zoom/rotation/viewport
  useEffect(() => {
    setPan((p) => clampPan(p, zoom, rotation))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, rotation, viewSize.w, viewSize.h, imgEl])

  // desenha preview no canvas (fiel)
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(viewSize.w * dpr)
    canvas.height = Math.round(viewSize.h * dpr)
    canvas.style.width = `${viewSize.w}px`
    canvas.style.height = `${viewSize.h}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    ctx.clearRect(0, 0, viewSize.w, viewSize.h)
    ctx.fillStyle = "#0b1220"
    ctx.fillRect(0, 0, viewSize.w, viewSize.h)

    if (!imgEl) return

    const baseScale = getCoverBaseScale(imgEl.width, imgEl.height, viewSize.w, viewSize.h, rotation)
    const scale = baseScale * zoom
    const clamped = clampPan(pan, zoom, rotation)

    ctx.save()
    ctx.translate(viewSize.w / 2 + clamped.x, viewSize.h / 2 + clamped.y)
    ctx.rotate(rad)
    ctx.scale(scale, scale)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(imgEl, -imgEl.width / 2, -imgEl.height / 2)
    ctx.restore()

    // moldura + grid
    ctx.save()
    ctx.strokeStyle = "#2ecc71"
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, viewSize.w, viewSize.h)

    ctx.strokeStyle = "rgba(46, 204, 113, 0.35)"
    ctx.lineWidth = 1
    for (let i = 1; i < 3; i++) {
      ctx.beginPath()
      ctx.moveTo((viewSize.w / 3) * i, 0)
      ctx.lineTo((viewSize.w / 3) * i, viewSize.h)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(0, (viewSize.h / 3) * i)
      ctx.lineTo(viewSize.w, (viewSize.h / 3) * i)
      ctx.stroke()
    }
    ctx.restore()
  }, [imgEl, pan, rad, rotation, viewSize.h, viewSize.w, zoom])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY }
    panStart.current = { ...pan }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setPan(clampPan({ x: panStart.current.x + dx, y: panStart.current.y + dy }))
  }

  const stopDragging = () => setDragging(false)

  const handleExport = () => {
    if (!imgEl) return

    const panScaleX = OUT_W / viewSize.w
    const panScaleY = OUT_H / viewSize.h
    const clamped = clampPan(pan, zoom, rotation)

    const baseScaleOut = getCoverBaseScale(imgEl.width, imgEl.height, OUT_W, OUT_H, rotation)
    const scaleOut = baseScaleOut * zoom

    const outCanvas = document.createElement("canvas")
    outCanvas.width = OUT_W
    outCanvas.height = OUT_H
    const ctx = outCanvas.getContext("2d")
    if (!ctx) return

    // fundo branco para JPEG
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, OUT_W, OUT_H)

    ctx.save()
    ctx.translate(OUT_W / 2 + clamped.x * panScaleX, OUT_H / 2 + clamped.y * panScaleY)
    ctx.rotate(rad)
    ctx.scale(scaleOut, scaleOut)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"
    ctx.drawImage(imgEl, -imgEl.width / 2, -imgEl.height / 2)
    ctx.restore()

    // Qualidade aqui pode ser “média”, pois o backend vai otimizar até 250KB
    outCanvas.toBlob(
      (blob) => blob && onCropComplete(blob),
      "image/jpeg",
      0.85,
    )
  }

  return (
    <Card className="p-6 border-crowd-silver bg-white dark:bg-card">
      <div className="space-y-4">
        <div className="text-sm font-medium text-carbon-clarity">Crop Image (export: 1200×630, JPEG)</div>

        <div ref={containerRef} className="w-full">
          <div className="rounded-lg overflow-hidden border border-crowd-silver bg-background">
            <canvas
              ref={canvasRef}
              className="block w-full touch-none cursor-grab active:cursor-grabbing select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              onPointerLeave={stopDragging}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ZoomIn className="h-4 w-4 text-carbon-clarity" />
            <span className="text-xs text-carbon-clarity">Zoom: {(zoom * 100).toFixed(0)}%</span>
          </div>
          <Slider value={[zoom]} onValueChange={(v) => setZoom(v[0])} min={1} max={3} step={0.05} className="w-full" />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRotation((r) => (r + 270) % 360)}
            className="flex-1 border-crowd-silver"
          >
            <RotateCw className="h-4 w-4 mr-1" />
            Rotate Left
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="flex-1 border-crowd-silver"
          >
            <RotateCw className="h-4 w-4 mr-1 scale-x-[-1]" />
            Rotate Right
          </Button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-crowd-silver bg-transparent"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            className="flex-1 bg-mint-pulse hover:bg-mint-pulse/90 text-white"
          >
            Confirm Crop
          </Button>
        </div>
      </div>
    </Card>
  )
}
