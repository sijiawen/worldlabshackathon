"use client"

import { useState } from "react"

export default function ImageUploader({ onUpload }) {
  const [loading, setLoading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files[0]

    setLoading(true)

    const formData = new FormData()
    formData.append("image", file)

    const response = await fetch("/api/trellis", {
      method: "POST",
      body: formData
    })

    const data = await response.json()

    setLoading(false)

    onUpload(data.modelUrl)
  }

  return (
    <div style={{
      position:"absolute",
      top:20,
      left:20,
      background:"#222",
      padding:20,
      color:"white"
    }}>
      <input type="file" onChange={handleFile} />
      {loading && <p>Generating 3D model...</p>}
    </div>
  )
}