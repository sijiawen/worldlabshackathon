"use client"

export default function StatusBar({ status, worldProgress }) {
  const colors = {
    idle: "var(--text-dim)",
    loading: "var(--accent)",
    success: "var(--green)",
    error: "var(--red)",
  }

  const dots = {
    idle: null,
    loading: <PulseDot color="var(--accent)" />,
    success: null,
    error: null,
  }

  return (
    <div style={{
      height: 32,
      background: "var(--surface)",
      borderTop: "1px solid var(--border)",
      display: "flex",
      alignItems: "center",
      padding: "0 16px",
      gap: 12,
      flexShrink: 0,
    }}>
      {dots[status.type]}
      <span style={{
        fontFamily: "var(--mono)",
        fontSize: 11,
        color: colors[status.type] || "var(--text-dim)",
        letterSpacing: 0.3,
      }}>
        {status.message}
      </span>

      {worldProgress && worldProgress.percent < 100 && (
        <>
          <div style={{ width: 1, height: 16, background: "var(--border)" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-dim)" }}>
            WORLD: {worldProgress.percent}%
          </span>
          <div style={{ width: 80, height: 2, background: "var(--surface2)", borderRadius: 1, overflow: "hidden" }}>
            <div style={{ width: `${worldProgress.percent}%`, height: "100%", background: "var(--accent)", transition: "width 0.5s" }} />
          </div>
        </>
      )}

      <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
        <StatusItem label="R3F" value="v8" />
        <StatusItem label="THREE.JS" value="r158" />
        <StatusItem label="NEXT.JS" value="14" />
      </div>
    </div>
  )
}

function PulseDot({ color = "var(--accent)" }) {
  return (
    <div style={{
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: color,
      flexShrink: 0,
      animation: "pulse-dot 1.2s ease-in-out infinite",
    }} />
  )
}

function StatusItem({ label, value }) {
  return (
    <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-dim)" }}>
      {label}: <span style={{ color: "rgba(255,255,255,0.4)" }}>{value}</span>
    </span>
  )
}
