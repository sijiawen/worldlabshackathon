// app/api/trellis/route.js
// Converts a 2D image into a 3D GLB model via HuggingFace TRELLIS spaces.
//
// Gradio 4 /call API flow:
//   1. Upload image file via /upload endpoint → get server-side file path
//   2. POST /call/image_to_3d              → get event_id
//   3. GET  /call/image_to_3d/{event_id}   → SSE stream, parse for GLB URL

// Primary: JeffreyXiang/TRELLIS (original, most reliable)
const SPACES = [
  "https://jeffreyxiang-trellis.hf.space",
  "https://trellis-community-trellis.hf.space",
  "https://microsoft-trellis.hf.space",
]

export async function POST(req) {
  const formData = await req.formData()
  const image = formData.get("image")

  if (!image) {
    return Response.json({ error: "No image provided" }, { status: 400 })
  }

  const buffer = Buffer.from(await image.arrayBuffer())
  const mimeType = image.type || "image/png"
  const fileName = image.name || "image.png"

  // Try each space in order
  for (const baseUrl of SPACES) {
    try {
      console.log(`Trying TRELLIS space: ${baseUrl}`)

      // Step 1: Upload image file to Gradio's /upload endpoint
      const uploadForm = new FormData()
      const blob = new Blob([buffer], { type: mimeType })
      uploadForm.append("files", blob, fileName)

      const uploadRes = await fetch(`${baseUrl}/upload`, {
        method: "POST",
        body: uploadForm,
      })

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.status} ${await uploadRes.text()}`)
      }

      const uploadedPaths = await uploadRes.json()
      // Returns array of file paths like ["/tmp/gradio/abc123/image.png"]
      const serverFilePath = Array.isArray(uploadedPaths) ? uploadedPaths[0] : uploadedPaths

      if (!serverFilePath) {
        throw new Error("Upload returned no file path")
      }

      // Step 2: Submit job using the server-side file path
      const submitRes = await fetch(`${baseUrl}/call/image_to_3d`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            { path: serverFilePath, meta: { _type: "gradio.FileData" } }, // image
            [],           // multiimages (empty = single image mode)
            0,            // seed
            7.5,          // ss_guidance_strength
            12,           // ss_sampling_steps
            3,            // slat_guidance_strength
            12,           // slat_sampling_steps
            "stochastic", // multiimage_algo
          ],
        }),
      })

      if (!submitRes.ok) {
        throw new Error(`Submit failed: ${submitRes.status} ${await submitRes.text()}`)
      }

      const submitData = await submitRes.json()
      const event_id = submitData.event_id

      if (!event_id) {
        throw new Error(`No event_id in response: ${JSON.stringify(submitData)}`)
      }

      console.log(`TRELLIS event_id: ${event_id}, polling...`)

      // Step 3: Poll SSE stream for result (with timeout)
      const resultRes = await fetch(`${baseUrl}/call/image_to_3d/${event_id}`, {
        signal: AbortSignal.timeout(300_000), // 5 min max
      })

      if (!resultRes.ok) {
        throw new Error(`Poll failed: ${resultRes.status} ${await resultRes.text()}`)
      }

      const text = await resultRes.text()
      console.log("TRELLIS SSE response (truncated):", text.slice(0, 500))

      const glbUrl = parseGradioSSEForGLB(text, baseUrl)

      if (!glbUrl) {
        throw new Error(`No GLB URL found in SSE response. Response: ${text.slice(0, 300)}`)
      }

      console.log("TRELLIS success, GLB URL:", glbUrl)
      return Response.json({ modelUrl: glbUrl })

    } catch (err) {
      console.error(`TRELLIS space ${baseUrl} failed:`, err.message)
      // Continue to next space
    }
  }

  return Response.json(
    { error: "All TRELLIS spaces failed. The spaces may be sleeping — try visiting https://huggingface.co/spaces/JeffreyXiang/TRELLIS to wake them up, then retry." },
    { status: 503 }
  )
}

// Parse Gradio 4 SSE stream to find a .glb file URL
function parseGradioSSEForGLB(sseText, baseUrl) {
  const lines = sseText.split("\n")
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue
    try {
      const parsed = JSON.parse(line.slice(6))
      // Gradio SSE "complete" event: data is an array of outputs
      const glb = findGLBInData(parsed, baseUrl)
      if (glb) return glb
    } catch {
      // Not JSON, skip
    }
  }
  return null
}

function findGLBInData(data, baseUrl = "") {
  if (!data) return null

  // Array: iterate elements
  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findGLBInData(item, baseUrl)
      if (found) return found
    }
    return null
  }

  // String: check if it's a .glb URL or path
  if (typeof data === "string") {
    if (data.endsWith(".glb") || data.includes(".glb?")) {
      return data.startsWith("http") ? data : `${baseUrl}${data}`
    }
    return null
  }

  // Object: check common Gradio FileData fields
  if (typeof data === "object") {
    // Check url, path, value, name fields for GLB
    for (const key of ["url", "path", "value", "name"]) {
      if (typeof data[key] === "string") {
        const v = data[key]
        if (v.endsWith(".glb") || v.includes(".glb?")) {
          return v.startsWith("http") ? v : `${baseUrl}${v}`
        }
      }
    }
    // Recurse into object values
    for (const val of Object.values(data)) {
      if (typeof val === "object" || Array.isArray(val)) {
        const found = findGLBInData(val, baseUrl)
        if (found) return found
      }
    }
  }

  return null
}
