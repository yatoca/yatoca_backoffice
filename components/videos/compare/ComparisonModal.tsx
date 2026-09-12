'use client';

import React from "react";

export type CompareModalValueVideos = {
  aEventId: string;
  bEventId: string;
};

type FiltersApi = {
  events: { id: number; name_event: string; idregion: number }[];
};

export default function CompareModalVideos({
  open,
  onClose,
  filtersApi,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  filtersApi: FiltersApi | null;
  onApply: (val: CompareModalValueVideos) => void;
}) {
  const [aEventId, setAEventId] = React.useState("");
  const [bEventId, setBEventId] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setAEventId("");
    setBEventId("");
  }, [open]);

  if (!open) return null;

  const events = filtersApi?.events ?? [];

  const canApply = aEventId && bEventId && aEventId !== bEventId;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.35)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(820px, 100%)",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #000",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
          <div>
            <div className="fs18 fw700">Comparar eventos (Videos)</div>
            <div style={{ color: "#666", marginTop: 6 }}>Elige 2 eventos para comparar sus frases.</div>
          </div>
          <button onClick={onClose} style={{ height: 40, padding: "0 12px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}>
            Cerrar
          </button>
        </div>

        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Evento A</div>
            <select
              value={aEventId}
              onChange={(e) => setAEventId(e.target.value)}
              style={{ width: "100%", height: 42, borderRadius: 10, border: "1px solid #ddd", padding: "0 10px" }}
            >
              <option value="">Selecciona...</option>
              {events.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.name_event}                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Evento B</div>
            <select
              value={bEventId}
              onChange={(e) => setBEventId(e.target.value)}
              style={{ width: "100%", height: 42, borderRadius: 10, border: "1px solid #ddd", padding: "0 10px" }}
            >
              <option value="">Selecciona...</option>
              {events.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.name_event}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ padding: 14, borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          {!canApply ? (
            <div style={{ color: "#777", alignSelf: "center" }}>Selecciona 2 eventos distintos.</div>
          ) : null}

          <button
            onClick={() => onApply({ aEventId, bEventId })}
            disabled={!canApply}
            style={{
              height: 40,
              padding: "0 12px",
              borderRadius: 10,
              border: "1px solid #000",
              background: canApply ? "#000" : "#eee",
              color: canApply ? "#fff" : "#999",
              cursor: canApply ? "pointer" : "not-allowed",
            }}
          >
            Comparar
          </button>
        </div>
      </div>
    </div>
  );
}