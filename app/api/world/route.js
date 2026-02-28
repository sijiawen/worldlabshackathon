// app/api/world/route.js
// World Labs API: Local images must be uploaded as media assets first.
// Flow:
//   1. POST /marble/v1/media-assets:prepare_upload  → get signed GCS upload URL + media_asset_id
//   2. PUT signed URL with raw image bytes           → upload to Google Cloud Storage
//   3. POST /marble/v1/worlds:generate               → kick off generation using media_asset_id
//   4. GET  /marble/v1/operations/{operation_id}     → poll until done

const BASE = "https://api.worldlabs.ai/marble/v1"

export async function POST(req) {
  const formData = await req.formData()
  const image = formData.get("image")
  const prompt = formData.get("prompt") || ""
  const mode = formData.get("mode") || "image" // "image" | "text"

  const API_KEY = process.env.WORLDLABS_API_KEY
  if (!API_KEY) {
    return Response.json(
      { error: "WORLDLABS_API_KEY is not set in .env.local" },
      { status: 500 }
    )
  }

  const headers = {
    "Content-Type": "application/json",
    "WLT-Api-Key": API_KEY,
  }

  let worldPrompt

  if (mode === "text") {
    worldPrompt = {
      type: "text",
      text_prompt: prompt,
    }
  } else {
    // Image mode: must upload via media asset (no base64 inline support)
    if (!image) {
      return Response.json({ error: "No image provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await image.arrayBuffer())
    const mimeType = image.type || "image/jpeg"
    const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg"
    const fileName = image.name || `upload.${ext}`

    // Step 1: Prepare upload — get signed GCS URL + media_asset_id
    const prepareRes = await fetch(`${BASE}/media-assets:prepare_upload`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        file_name: fileName,
        kind: "image",
        extension: ext,
      }),
    })

    if (!prepareRes.ok) {
      const err = await prepareRes.text()
      console.error("World Labs prepare_upload error:", err)
      return Response.json(
        { error: `Failed to prepare upload: ${err}` },
        { status: prepareRes.status }
      )
    }

    const prepareData = await prepareRes.json()
    const { media_asset_id } = prepareData.media_asset
    const { upload_url, required_headers } = prepareData.upload_info

    // Step 2: Upload image bytes to signed GCS URL
    const uploadRes = await fetch(upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
        ...required_headers,
      },
      body: buffer,
    })

    if (!uploadRes.ok) {
      const err = await uploadRes.text()
      console.error("World Labs GCS upload error:", err)
      return Response.json(
        { error: `Failed to upload image to storage: ${err}` },
        { status: uploadRes.status }
      )
    }

    worldPrompt = {
      type: "image",
      image_prompt: {
        source: "media_asset",
        media_asset_id,
      },
      ...(prompt ? { text_prompt: prompt } : {}),
    }
  }

  // Step 3: Kick off generation
  const generateRes = await fetch(`${BASE}/worlds:generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      display_name: prompt || "AI Filmmaker Scene",
      world_prompt: worldPrompt,
      model: "Marble 0.1-plus",
    }),
  })

  if (!generateRes.ok) {
    const err = await generateRes.text()
    console.error("World Labs generate error:", err)
    return Response.json({ error: err }, { status: generateRes.status })
  }

  const operation = await generateRes.json()
  return Response.json({ operationId: operation.operation_id })
}

// GET: Poll operation status
export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const operationId = searchParams.get("operationId")

  const API_KEY = process.env.WORLDLABS_API_KEY
  if (!operationId) {
    return Response.json({ error: "Missing operationId" }, { status: 400 })
  }

  const pollRes = await fetch(
    `${BASE}/operations/${operationId}`,
    { headers: { "WLT-Api-Key": API_KEY } }
  )

  if (!pollRes.ok) {
    const err = await pollRes.text()
    return Response.json({ error: err }, { status: pollRes.status })
  }

  const data = await pollRes.json()
  return Response.json(data)
}
