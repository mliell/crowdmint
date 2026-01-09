import { put } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"
import sharp from "sharp"

export const runtime = "nodejs"

const OUT_W = 1200
const OUT_H = 630

const TARGET_MAX_BYTES = 250 * 1024 // 250KB
const MIN_QUALITY = 55

async function optimizeToJpeg(inputBuffer: Buffer) {
  const base = sharp(inputBuffer)
    .rotate()
    .resize(OUT_W, OUT_H, { fit: "cover", position: "centre" })

  const qualities = [82, 78, 74, 70, 66, 62, 58, 55]

  let lastBuf: Buffer | null = null
  let lastQ = qualities[qualities.length - 1]

  for (const q of qualities) {
    lastQ = q
    const buf = await base
      .jpeg({
        quality: q,
        mozjpeg: true,
        progressive: true,
        chromaSubsampling: "4:2:0",
      })
      .toBuffer()

    lastBuf = buf

    if (buf.length <= TARGET_MAX_BYTES) {
      return { buffer: buf, usedQuality: q, hitTarget: true }
    }

    if (q <= MIN_QUALITY) break
  }

  return { buffer: lastBuf!, usedQuality: lastQ, hitTarget: false }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    const inputArrayBuffer = await file.arrayBuffer()
    const inputBuffer = Buffer.from(inputArrayBuffer)

    const { buffer: optimized, usedQuality, hitTarget } = await optimizeToJpeg(inputBuffer)

    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const filename = `campaign-${timestamp}-${random}.jpg`

    // put aceita Blob; assim evita qualquer incompatibilidade com File no runtime
    const optimizedBlob = new Blob([optimized], { type: "image/jpeg" })

    const blob = await put(filename, optimizedBlob, {
      access: "public",
      addRandomSuffix: true,
    })

    return NextResponse.json({
      url: blob.url,
      filename,
      size: optimized.length,
      type: "image/jpeg",
      meta: {
        outWidth: OUT_W,
        outHeight: OUT_H,
        targetBytes: TARGET_MAX_BYTES,
        hitTarget,
        usedQuality,
      },
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
