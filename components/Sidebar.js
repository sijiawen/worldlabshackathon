"use client"
import { useState, useRef, forwardRef } from "react"

export default function Sidebar({
  onWorldGenerated,
  onAddObject,
  setStatus,
  worldGenerating,
  setWorldGenerating,
  worldProgress,
  setWorldProgress,
}) {
  const [activePanel, setActivePanel] = useState("world")
  const [worldPrompt, setWorldPrompt] = useState("")
  const [worldMode, setWorldMode] = useState("image")
  const [worldImagePreview, setWorldImagePreview] = useState(null)
  const [worldImageFile, setWorldImageFile] = useState(null)
  const [objectImagePreview, setObjectImagePreview] = useState(null)
  const [objectImageFile, setObjectImageFile] = useState(null)
  const [trellisLoading, setTrellisLoading] = useState(false)
  const [trellisResult, setTrellisResult] = useState(null)
  const worldFileRef = useRef()
  const objectFileRef = useRef()

  function handleWorldImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setWorldImageFile(file)
    setWorldImagePreview(URL.createObjectURL(file))
  }

  function handleObjectImageSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setObjectImageFile(file)
    setObjectImagePreview(URL.createObjectURL(file))
    setTrellisResult(null)
  }

  async function handleGenerateWorld() {
    if (worldMode === "image" && !worldImageFile) {
      setStatus({ type: "error", message: "Please select a scene image first" }); return
    }
    if (worldMode === "text" && !worldPrompt.trim()) {
      setStatus({ type: "error", message: "Please enter a scene description" }); return
    }
    setWorldGenerating(true)
    setWorldProgress({ status: "Uploading image...", percent: 3, stage: null })
    setStatus({ type: "loading", message: "Generating 3D world..." })
    const formData = new FormData()
    formData.append("mode", worldMode)
    if (worldImageFile) formData.append("image", worldImageFile)
    if (worldPrompt) formData.append("prompt", worldPrompt)
    try {
      const res = await fetch("/api/world", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Generation failed")
      const { operationId } = data
      setWorldProgress({ status: "Queued — waiting for server...", percent: 5, stage: null })
      let done = false, attempts = 0
      while (!done && attempts < 120) {
        await sleep(5000); attempts++
        const pollRes = await fetch(`/api/world?operationId=${operationId}`)
        const poll = await pollRes.json()

        // Use real progress from the API when available
        const meta = poll?.metadata?.progress
        const apiPct = typeof meta?.percent === "number" ? meta.percent : null
        const apiStage = meta?.stage || meta?.step || null
        const apiStatus = meta?.status || null

        if (apiStatus === "FAILED" || poll.error) {
          throw new Error(poll.error?.message || "World generation failed on server")
        }

        if (poll.done) {
          done = true
          onWorldGenerated(poll.response?.assets)
          setWorldProgress({ status: "Complete!", percent: 100, stage: null })
          setStatus({ type: "success", message: "World generated successfully!" })
        } else {
          // Fall back to time-based estimate if API gives no percent
          const estimatedPct = Math.min(10 + attempts * 0.72, 92)
          const pct = apiPct ?? Math.round(estimatedPct)
          const elapsed = attempts * 5
          const statusText = apiStage
            ? apiStage
            : apiStatus === "RUNNING"
            ? `Generating... (${elapsed}s)`
            : `Processing... (${elapsed}s)`
          setWorldProgress({ status: statusText, percent: pct, stage: apiStage })
        }
      }
      if (!done) throw new Error("Timed out after 10 minutes")
    } catch (err) {
      setStatus({ type: "error", message: err.message }); setWorldProgress(null)
    } finally {
      setWorldGenerating(false)
    }
  }

  async function handleTrellis() {
    if (!objectImageFile) {
      setStatus({ type: "error", message: "Please select an object image first" }); return
    }
    setTrellisLoading(true)
    setStatus({ type: "loading", message: "Converting to 3D via TRELLIS..." })
    const formData = new FormData()
    formData.append("image", objectImageFile)
    try {
      const res = await fetch("/api/trellis", { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "TRELLIS failed")
      setTrellisResult(data)
      setStatus({ type: "success", message: "3D object added to scene!" })
      if (data.modelUrl) {
        const name = objectImageFile.name.replace(/\.[^.]+$/, "") + "_3d"
        onAddObject(data.modelUrl, name, "glb")
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message })
    } finally {
      setTrellisLoading(false)
    }
  }

  const tabs = [
    { id: "world", label: "WORLD" },
    { id: "object", label: "OBJECT" },
  ]

  return (
    <div style={{ width:300, flexShrink:0, background:"var(--surface)", borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <div style={{ display:"flex", borderBottom:"1px solid var(--border)" }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActivePanel(tab.id)} style={{
            flex:1, padding:"12px 0",
            background: activePanel===tab.id ? "var(--surface2)" : "transparent",
            border:"none",
            borderBottom: activePanel===tab.id ? "2px solid var(--accent)" : "2px solid transparent",
            color: activePanel===tab.id ? "var(--accent)" : "var(--text-dim)",
            fontFamily:"var(--mono)", fontSize:10, letterSpacing:1.5, cursor:"pointer",
          }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:16 }}>

        {/* WORLD */}
        {activePanel==="world" && (
          <div style={col}>
            <SL>GENERATE 3D WORLD</SL>
            <p style={hint}>Turn a 2D image or text prompt into a Gaussian Splat world via World Labs.</p>
            <div style={{ display:"flex", gap:4 }}>
              {["image","text"].map((m) => (
                <button key={m} onClick={() => setWorldMode(m)} style={{
                  flex:1, padding:"7px 0",
                  background: worldMode===m ? "rgba(255,200,80,0.1)" : "var(--surface2)",
                  border:`1px solid ${worldMode===m ? "var(--accent)" : "var(--border)"}`,
                  borderRadius:3, color: worldMode===m ? "var(--accent)" : "var(--text-dim)",
                  fontFamily:"var(--mono)", fontSize:10, cursor:"pointer", letterSpacing:1,
                }}>{m.toUpperCase()}</button>
              ))}
            </div>
            {worldMode==="image" && (
              <>
                <Lbl>Scene Image</Lbl>
                <ImagePicker ref={worldFileRef} preview={worldImagePreview} onSelect={handleWorldImageSelect} label="Click to select image" />
              </>
            )}
            <Lbl>{worldMode==="text" ? "Scene Description *" : "Additional Context (optional)"}</Lbl>
            <textarea value={worldPrompt} onChange={(e)=>setWorldPrompt(e.target.value)}
              placeholder={worldMode==="text" ? "A misty cyberpunk city at night..." : "Describe mood or details..."}
              rows={3} style={taStyle} />
            <PBtn onClick={handleGenerateWorld} disabled={worldGenerating} loading={worldGenerating}>
              {worldGenerating ? "GENERATING..." : "GENERATE WORLD"}
            </PBtn>
            {worldProgress && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontFamily:"var(--mono)", fontSize:10, color: worldProgress.percent===100 ? "var(--green)" : "var(--text-dim)", display:"flex", alignItems:"center", gap:6 }}>
                    {worldProgress.percent > 0 && worldProgress.percent < 100 && <Spin size={10} />}
                    {worldProgress.percent === 100 && <span style={{ color:"var(--green)" }}>✓</span>}
                    {worldProgress.status}
                  </span>
                  <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--accent)", flexShrink:0, marginLeft:8 }}>{worldProgress.percent}%</span>
                </div>
                <PBar value={worldProgress.percent} />
                {worldProgress.stage && worldProgress.percent < 100 && (
                  <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"rgba(255,200,80,0.4)", letterSpacing:1, textTransform:"uppercase" }}>
                    Stage: {worldProgress.stage}
                  </div>
                )}
                {worldProgress.percent > 0 && worldProgress.percent < 100 && (
                  <div style={{ fontFamily:"var(--mono)", fontSize:9, color:"var(--text-dim)", lineHeight:1.5 }}>
                    World Labs Marble typically takes 30–300s depending on model tier. This tab will update automatically.
                  </div>
                )}
              </div>
            )}
            <Hr />
            <SL>LOAD EXISTING SPLAT</SL>
            <p style={hint}>Already have a .spz export from World Labs? Load it directly.</p>
            <FBtn accept=".spz,.ply" label="Load .spz / .ply" onChange={(e)=>{
              const f=e.target.files?.[0]; if(!f) return
              onWorldGenerated({ splats:{ spz_urls:{ "500k":URL.createObjectURL(f) } }, fileName: f.name })
              setStatus({ type:"success", message:`Loaded ${f.name}` })
            }} />
          </div>
        )}

        {/* OBJECT */}
        {activePanel==="object" && (
          <div style={col}>
            <SL>ADD OBJECT TO SCENE</SL>
            <p style={hint}>Photo of any real object → 3D mesh via TRELLIS AI, placed directly in your scene.</p>
            <Lbl>Object Photo</Lbl>
            <ImagePicker ref={objectFileRef} preview={objectImagePreview} onSelect={handleObjectImageSelect} label="Click to select photo" />
            <PBtn onClick={handleTrellis} disabled={trellisLoading || !objectImageFile} loading={trellisLoading}>
              {trellisLoading ? "CONVERTING TO 3D..." : "CONVERT & ADD TO SCENE"}
            </PBtn>
            {trellisLoading && (
              <p style={{ fontFamily:"var(--mono)", fontSize:11, color:"var(--text-dim)", lineHeight:1.6 }}>
                TRELLIS is processing... usually 30–120s.
              </p>
            )}
            {trellisResult && (
              <div style={{ background:"rgba(0,232,122,0.05)", borderRadius:6, padding:12, border:"1px solid rgba(0,232,122,0.25)" }}>
                <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--green)", marginBottom:6 }}>✓ OBJECT ADDED TO SCENE</div>
                <p style={{ fontSize:11, color:"var(--text-dim)", lineHeight:1.5, marginBottom:8 }}>
                  Click the object in the viewport, then use MOVE / ROTATE / SCALE to position it.
                </p>
                {trellisResult.modelUrl && (
                  <a href={trellisResult.modelUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--accent)" }}>
                    ↓ Download GLB
                  </a>
                )}
              </div>
            )}
            <Hr />
            <SL>OR UPLOAD 3D FILE DIRECTLY</SL>
            <FBtn accept=".glb" label="Upload GLB" onChange={(e)=>{
              const f=e.target.files?.[0]; if(!f) return
              onAddObject(URL.createObjectURL(f), f.name, "glb")
              setStatus({ type:"success", message:`Added ${f.name}` })
            }} />
            <FBtn accept=".ply" label="Upload PLY" onChange={(e)=>{
              const f=e.target.files?.[0]; if(!f) return
              onAddObject(URL.createObjectURL(f), f.name, "ply")
              setStatus({ type:"success", message:`Added ${f.name}` })
            }} />
            <Hr />
            <SL>QUICK PRIMITIVES</SL>
            {[["Cube","box"],["Sphere","sphere"],["Cylinder","cylinder"]].map(([label,p]) => (
              <button key={p} onClick={()=>{ onAddObject(`__primitive__${p}`,label,"primitive"); setStatus({type:"success",message:`Added ${label}`}) }}
                style={{ background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:4,
                  padding:"10px 14px", color:"var(--text)", fontFamily:"var(--mono)", fontSize:11, cursor:"pointer", textAlign:"left" }}>
                <span style={{ color:"var(--text-dim)" }}>+</span> {label}
              </button>
            ))}
          </div>
        )}


      </div>
    </div>
  )
}

// ── Shared UI ────────────────────────────────────────────────

const ImagePicker = forwardRef(function ImagePicker({ preview, onSelect, label }, ref) {
  return (
    <div
      onClick={() => ref?.current?.click()}
      style={{
        border:`1px dashed ${preview ? "rgba(255,200,80,0.45)" : "rgba(255,200,80,0.18)"}`,
        borderRadius:6, overflow:"hidden", background:"var(--surface2)", cursor:"pointer",
        minHeight: preview ? "auto" : 80, display:"flex", alignItems:"center",
        justifyContent:"center", flexDirection:"column", gap:6, position:"relative",
      }}
      onMouseEnter={(e)=>e.currentTarget.style.borderColor="rgba(255,200,80,0.65)"}
      onMouseLeave={(e)=>e.currentTarget.style.borderColor=preview?"rgba(255,200,80,0.45)":"rgba(255,200,80,0.18)"}
    >
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" style={{ width:"100%", display:"block", maxHeight:160, objectFit:"cover" }} />
          <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.65)",
            backdropFilter:"blur(4px)", padding:"5px 10px", fontFamily:"var(--mono)", fontSize:10, color:"rgba(255,255,255,0.55)" }}>
            Click to change
          </div>
        </>
      ) : (
        <>
          <span style={{ fontSize:20, opacity:0.25 }}>⊕</span>
          <span style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)" }}>{label}</span>
        </>
      )}
      <input ref={ref} type="file" accept="image/*" style={{ display:"none" }} onChange={onSelect} />
    </div>
  )
})

function FBtn({ accept, label, onChange }) {
  const ref = useRef()
  const ext = accept.replace(/\./g,"").split(",")[0].toUpperCase()
  return (
    <>
      <button onClick={()=>ref.current?.click()} style={{
        width:"100%", background:"var(--surface2)", border:"1px solid var(--border)",
        borderRadius:4, padding:"11px 14px", color:"var(--text)", fontFamily:"var(--mono)",
        fontSize:11, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:10,
      }}>
        <span style={{ background:"rgba(255,200,80,0.1)", border:"1px solid rgba(255,200,80,0.3)",
          borderRadius:3, padding:"2px 8px", color:"var(--accent)", fontSize:10, letterSpacing:1, flexShrink:0 }}>
          {ext}
        </span>
        {label}
      </button>
      <input ref={ref} type="file" accept={accept} style={{ display:"none" }} onChange={onChange} />
    </>
  )
}

function PBtn({ children, onClick, disabled, loading }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:"100%", padding:"12px 0",
      background: disabled ? "rgba(255,200,80,0.04)" : "rgba(255,200,80,0.12)",
      border:`1px solid ${disabled ? "rgba(255,200,80,0.15)" : "var(--accent)"}`,
      borderRadius:4, color: disabled ? "rgba(255,200,80,0.35)" : "var(--accent)",
      fontFamily:"var(--mono)", fontSize:11, letterSpacing:2, cursor:disabled?"not-allowed":"pointer",
      display:"flex", alignItems:"center", justifyContent:"center", gap:8,
    }}>
      {loading && <Spin size={12} />}
      {children}
    </button>
  )
}

function SL({ children }) { return <div style={{ fontFamily:"var(--mono)", fontSize:10, letterSpacing:2, color:"var(--text-dim)" }}>{children}</div> }
function Lbl({ children }) { return <div style={{ fontFamily:"var(--mono)", fontSize:10, color:"var(--text-dim)", marginBottom:6 }}>{children}</div> }
function Hr() { return <div style={{ height:1, background:"var(--border)", margin:"4px 0" }} /> }
function Spin({ size=14 }) {
  return <div style={{ width:size, height:size, border:"2px solid rgba(255,200,80,0.2)", borderTop:"2px solid var(--accent)", borderRadius:"50%", animation:"spin 0.8s linear infinite", flexShrink:0 }} />
}
function PBar({ value }) {
  return (
    <div style={{ height:3, background:"var(--surface2)", borderRadius:2, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${value}%`, background:"linear-gradient(90deg, var(--accent), var(--accent2))", borderRadius:2, transition:"width 0.5s ease" }} />
    </div>
  )
}

function sleep(ms) { return new Promise((r)=>setTimeout(r,ms)) }
const col = { display:"flex", flexDirection:"column", gap:14 }
const hint = { color:"var(--text-dim)", fontSize:11, lineHeight:1.6 }
const taStyle = { width:"100%", background:"var(--surface2)", border:"1px solid var(--border)", borderRadius:4, padding:"10px 12px", color:"var(--text)", fontFamily:"var(--mono)", fontSize:11, resize:"vertical", outline:"none", lineHeight:1.6 }
