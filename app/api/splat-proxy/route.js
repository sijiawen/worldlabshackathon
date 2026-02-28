// app/api/splat-proxy/route.js
//
// The gaussian-splats-3d library ONLY accepts URL strings in addSplatScene().
// It determines file format by the URL's file extension (.spz, .ply, etc).
// Blob: URLs have no extension, causing "File format not supported" errors.
//
// This proxy accepts a splat file upload, stores it in memory, and serves it
// back at a URL like /api/splat-proxy?id=xxx&name=scene.spz — the library
// reads the ?name= parameter or the path extension to detect format.

// In-memory store: id → { buffer, mimeType, fileName }
const store = new Map()
let counter = 0

export async function POST(req) {
  const formData = await req.formData()
  const file = formData.get("file")

  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = file.name || "scene.spz"
  const id = `splat_${Date.now()}_${counter++}`

  store.set(id, { buffer, fileName })

  // Clean up old entries (keep max 10)
  if (store.size > 10) {
    const oldest = store.keys().next().value
    store.delete(oldest)
  }

  const fileUrl = `/api/splat-proxy?id=${id}&name=${encodeURIComponent(fileName)}`
  return Response.json({ fileUrl })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const name = searchParams.get("name") || "scene.spz"

  if (!id || !store.has(id)) {
    return new Response("Not found", { status: 404 })
  }

  const { buffer, fileName } = store.get(id)
  const ext = (fileName || name).split(".").pop().toLowerCase()

  const mimeTypes = {
    spz:    "application/octet-stream",
    ply:    "application/octet-stream",
    splat:  "application/octet-stream",
    ksplat: "application/octet-stream",
  }

  return new Response(buffer, {
    headers: {
      "Content-Type":        mimeTypes[ext] || "application/octet-stream",
      "Content-Disposition": `inline; filename="${fileName || name}"`,
      "Cache-Control":       "no-store",
    },
  })
}
