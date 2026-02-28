"use client"
import { useEffect, useRef } from "react"
import { useThree, useFrame } from "@react-three/fiber"

// Uses DropInViewer which is designed for integration into existing Three.js scenes.
// It's added directly to the R3F scene as a Three.js Group object.
// In selfDrivenMode:false we must call both update() AND render() each frame.
export default function WorldSplat({ url, fileName }) {
  const { gl, scene, camera } = useThree()
  const viewerRef  = useRef(null)
  const readyRef   = useRef(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!url) return
    if (mountedRef.current) return
    mountedRef.current = true

    let alive = true
    let dropInViewer = null

    async function initSplat() {
      try {
        const GS = await import("@mkkellogg/gaussian-splats-3d")

        // Proxy blob: URLs — library needs a real URL with file extension
        let sceneUrl = url
        if (url.startsWith("blob:")) {
          const ext  = (fileName || "scene.spz").split(".").pop().toLowerCase()
          const name = fileName || `scene.${ext}`
          const resp = await fetch(url)
          const blob = await resp.blob()
          const form = new FormData()
          form.append("file", blob, name)
          const uploadRes = await fetch("/api/splat-proxy", { method: "POST", body: form })
          if (!uploadRes.ok) throw new Error(`Proxy upload failed: ${await uploadRes.text()}`)
          const data = await uploadRes.json()
          sceneUrl = data.fileUrl
          console.log("[WorldSplat] proxied to:", sceneUrl)
        }

        if (!alive) return

        // DropInViewer integrates cleanly into an existing Three.js scene —
        // it's a Group you add to the scene, and it manages its own splat mesh internally.
        dropInViewer = new GS.DropInViewer({
          gpuAcceleratedSort:     false, // safer default for integration
          sharedMemoryForWorkers: false,
          selfDrivenMode:         false,
          renderer:               gl,
          camera,
          useBuiltInControls:     false,
        })

        scene.add(dropInViewer)
        viewerRef.current = dropInViewer

        await dropInViewer.addSplatScenes([{
          path:                       sceneUrl,
          splatAlphaRemovalThreshold: 5,
          showLoadingUI:              false,
          position:                   [0, 0, 0],
          rotation:                   [0, 0, 0, 1],
          scale:                      [1, 1, 1],
        }])

        if (alive) {
          console.log("[WorldSplat] DropInViewer ready")
          readyRef.current = true
        }

      } catch (err) {
        console.error("[WorldSplat] failed:", err)
      }
    }

    initSplat()

    return () => {
      alive = false
      readyRef.current   = false
      mountedRef.current = false
      if (viewerRef.current) {
        try {
          scene.remove(viewerRef.current)
          viewerRef.current.dispose?.()
        } catch (_) {}
        viewerRef.current = null
      }
    }
  }, [url, fileName, gl, scene, camera])

  // Must call both update() AND render() in non-selfDriven mode
  useFrame(() => {
    if (readyRef.current && viewerRef.current) {
      try {
        viewerRef.current.update()
        viewerRef.current.render()
      } catch (_) {}
    }
  })

  return null
}
