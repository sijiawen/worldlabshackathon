"use client"

export default function Toolbar({ mode, setMode, selected, onRemove }) {
  const modes = [
    { id: "translate", label: "MOVE", key: "W", icon: "⊹" },
    { id: "rotate", label: "ROTATE", key: "E", icon: "↻" },
    { id: "scale", label: "SCALE", key: "R", icon: "⤢" },
  ]

  return (
    <div style={{
      position: "absolute",
      top: 16,
      left: "50%",
      transform: "translateX(-50%)",
      display: "flex",
      gap: 4,
      background: "rgba(13,13,18,0.92)",
      border: "1px solid var(--border)",
      borderRadius: 8,
      padding: 6,
      backdropFilter: "blur(12px)",
      zIndex: 10,
      alignItems: "center",
    }}>
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => setMode(m.id)}
          disabled={!selected}
          title={`${m.label} (${m.key})`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 14px",
            background: mode === m.id && selected ? "rgba(255,200,80,0.12)" : "transparent",
            border: `1px solid ${mode === m.id && selected ? "var(--accent)" : "transparent"}`,
            borderRadius: 5,
            color: !selected
              ? "var(--text-dim)"
              : mode === m.id
              ? "var(--accent)"
              : "var(--text)",
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: 1,
            cursor: selected ? "pointer" : "not-allowed",
            opacity: !selected ? 0.4 : 1,
            transition: "all 0.15s",
          }}
        >
          <span style={{ fontSize: 14 }}>{m.icon}</span>
          {m.label}
          <span style={{ fontSize: 9, color: "var(--text-dim)", marginLeft: 2 }}>{m.key}</span>
        </button>
      ))}

      {selected && onRemove && (
        <>
          <div style={{ width: 1, height: 24, background: "var(--border)", margin: "0 4px" }} />
          <button
            onClick={onRemove}
            style={{
              padding: "7px 12px",
              background: "transparent",
              border: "1px solid transparent",
              borderRadius: 5,
              color: "var(--red)",
              fontFamily: "var(--mono)",
              fontSize: 10,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            ✕ DELETE
          </button>
        </>
      )}

      {!selected && (
        <span style={{ padding: "7px 14px", fontFamily: "var(--mono)", fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
          SELECT AN OBJECT TO TRANSFORM
        </span>
      )}
    </div>
  )
}
