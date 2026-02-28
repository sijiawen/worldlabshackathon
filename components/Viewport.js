"use client"
import { useState, useRef, useCallback } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls, TransformControls, Environment, Grid } from "@react-three/drei"
import MeshObject from "./MeshObject"
import WorldSplat from "./WorldSplat"
import Sidebar from "./Sidebar"
import Toolbar from "./Toolbar"
import StatusBar from "./StatusBar"

export default function Viewport() {
  const [worldSplatUrl, setWorldSplatUrl] = useState(null)
  const [worldMeshUrl, setWorldMeshUrl] = useState(null)
  const [objects, setObjects] = useState([]) // { id, url, name, type }
  const [selectedId, setSelectedId] = useState(null)
  const [transformMode, setTransformMode] = useState("translate") // translate | rotate | scale
  const [status, setStatus] = useState({ type: "idle", message: "Ready" })
  const [showGrid, setShowGrid] = useState(true)
  const [worldGenerating, setWorldGenerating] = useState(false)
  const [worldProgress, setWorldProgress] = useState(null)
  const orbitRef = useRef()

  const addObject = useCallback((url, name, type = "glb") => {
    const id = `obj_${Date.now()}`
    setObjects((prev) => [...prev, { id, url, name, type }])
    setSelectedId(id)
  }, [])

  const removeObject = useCallback((id) => {
    setObjects((prev) => prev.filter((o) => o.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }, [])

  const handleWorldGenerated = useCallback((assets) => {
    const url = assets?.splats?.spz_urls?.["500k"] || assets?.splats?.spz_urls?.full_res
    if (url) {
      setWorldSplatUrl({ url, fileName: assets?.fileName || null })
    }
    if (assets?.mesh?.collider_mesh_url) {
      setWorldMeshUrl(assets.mesh.collider_mesh_url)
    }
  }, [])

  const selected = objects.find((o) => o.id === selectedId)

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* Top Bar */}
      <div style={{
        height: 48,
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 24,
        flexShrink: 0,
        zIndex: 10,
      }}>
        <span style={{ fontFamily: "var(--display)", fontSize: 22, letterSpacing: 2, color: "var(--accent)" }}>Creatorgen</span>
        <span style={{ color: "var(--text-dim)", fontFamily: "var(--mono)", fontSize: 11 }}></span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <TopBtn active={showGrid} onClick={() => setShowGrid(v => !v)} label="GRID" />
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Sidebar */}
        <Sidebar
          onWorldGenerated={handleWorldGenerated}
          onAddObject={addObject}
          setStatus={setStatus}
          worldGenerating={worldGenerating}
          setWorldGenerating={setWorldGenerating}
          worldProgress={worldProgress}
          setWorldProgress={setWorldProgress}
        />

        {/* Main Viewport */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Transform Toolbar */}
          <Toolbar
            mode={transformMode}
            setMode={setTransformMode}
            selected={selected}
            onRemove={selectedId ? () => removeObject(selectedId) : null}
          />

          {/* 3D Canvas */}
          <Canvas
            camera={{ position: [0, 2, 8], fov: 60 }}
            style={{ background: "var(--bg)" }}
            shadows
            frameloop="always"
            gl={{ autoClear: false }}
          >
            <fog attach="fog" args={["#050507", 30, 80]} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 10, 5]} intensity={1} castShadow />

            {showGrid && (
              <Grid
                position={[0, -0.01, 0]}
                args={[40, 40]}
                cellSize={1}
                cellThickness={0.5}
                cellColor="#1a1a2e"
                sectionSize={5}
                sectionThickness={1}
                sectionColor="#2a2a4a"
                fadeDistance={30}
                fadeStrength={1}
                infiniteGrid
              />
            )}

            {/* World Splat Background */}
            {worldSplatUrl && <WorldSplat url={worldSplatUrl.url} fileName={worldSplatUrl.fileName} />}

            {/* Placed Objects */}
            {objects.map((obj) =>
              obj.id === selectedId ? (
                <TransformControls
                  key={obj.id}
                  mode={transformMode}
                  onMouseDown={(e) => e?.stopPropagation?.()}
                >
                  <MeshObject url={obj.url} onClick={() => setSelectedId(obj.id)} />
                </TransformControls>
              ) : (
                <MeshObject
                  key={obj.id}
                  url={obj.url}
                  onClick={() => setSelectedId(obj.id)}
                />
              )
            )}

            <OrbitControls
              ref={orbitRef}
              makeDefault
              enableDamping
              dampingFactor={0.05}
              minDistance={1}
              maxDistance={100}
            />
          </Canvas>

          {/* Scene Objects List (right overlay) */}
          <SceneObjectsList
            objects={objects}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onRemove={removeObject}
          />

          {/* Camera info overlay */}
          <CameraOverlay />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar status={status} worldProgress={worldProgress} />
    </div>
  )
}

function TopBtn({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(255,200,80,0.12)" : "transparent",
        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
        color: active ? "var(--accent)" : "var(--text-dim)",
        padding: "4px 12px",
        borderRadius: 3,
        fontFamily: "var(--mono)",
        fontSize: 10,
        cursor: "pointer",
        letterSpacing: 1,
      }}
    >
      {label}
    </button>
  )
}

function SceneObjectsList({ objects, selectedId, setSelectedId, onRemove }) {
  if (objects.length === 0) return null
  return (
    <div style={{
      position: "absolute",
      top: 56,
      right: 16,
      width: 180,
      background: "rgba(13,13,18,0.92)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      overflow: "hidden",
      backdropFilter: "blur(12px)",
    }}>
      <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border)", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-dim)", letterSpacing: 1 }}>
        SCENE OBJECTS
      </div>
      {objects.map((obj) => (
        <div
          key={obj.id}
          onClick={() => setSelectedId(obj.id)}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "7px 12px",
            cursor: "pointer",
            background: obj.id === selectedId ? "rgba(255,200,80,0.08)" : "transparent",
            borderLeft: obj.id === selectedId ? "2px solid var(--accent)" : "2px solid transparent",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 10, flex: 1, fontFamily: "var(--mono)", color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {obj.name}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(obj.id) }}
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

function CameraOverlay() {
  return (
    <div style={{
      position: "absolute",
      bottom: 16,
      right: 16,
      fontFamily: "var(--mono)",
      fontSize: 10,
      color: "var(--text-dim)",
      lineHeight: 1.8,
      pointerEvents: "none",
    }}>
      <div>LMB — Orbit</div>
      <div>RMB — Pan</div>
      <div>Scroll — Zoom</div>
    </div>
  )
}
