'use client';

import React from "react";
import CompareModal, { CompareModalValue } from "@/components/cabildos/CompareModal";
import { useRouter } from "next/navigation";

type FiltersApi = {
  regions: string[];
  genders: string[];
  ageGroups: string[];
  nivelesInstruccion: string[];
  gruposEtnicos: string[];
  estaciones: { id: number; nombre: string }[];
  cabildos: { id: number; nombre: string }[];
};

type Row = {
  fecha: string;
  participant_id: string;
  cabildo: string;
  telefono: string;
  region_cabildo: string | null;
  region_procedencia: string | null;
  genero: string;
  age_group: string;
  nivelinstruccion: string;
  grupoetnico: string;

  e1_catarsis: string;
  e2_circunstancias: string;
  e3_yo_presidente: string;
  e4_estacion4: string;
  cierre: string;
};

export default function CabildosStationsTable({
  filters,
}: {
  filters: {
    cabildoId: string;
    region: string;
    age: string;
    gender: string;
    nivelinstruccion: string;
    grupoetnico: string;
    stationId: string;
  };
}) {
  const [filtersApi, setFiltersApi] = React.useState<FiltersApi | null>(null);
  const [loadingFilters, setLoadingFilters] = React.useState(true);
  const router = useRouter();

  const [compareOpen, setCompareOpen] = React.useState(false);

  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const pageSize = 100;

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoadingFilters(true);
        const res = await fetch("/api/cabildos/stations/filters");
        const json = (await res.json()) as FiltersApi;
        setFiltersApi(json);
      } catch (e) {
        console.error(e);
        setFiltersApi(null);
      } finally {
        setLoadingFilters(false);
      }
    };
    run();
  }, []);

  const buildUrl = React.useCallback(() => {
    const params = new URLSearchParams();
    if (filters.cabildoId) params.set("cabildoId", filters.cabildoId);
    if (filters.region) params.set("region", filters.region);
    if (filters.age) params.set("age", filters.age);
    if (filters.gender) params.set("gender", filters.gender);
    if (filters.nivelinstruccion) params.set("nivelinstruccion", filters.nivelinstruccion);
    if (filters.grupoetnico) params.set("grupoetnico", filters.grupoetnico);
    if (filters.stationId) params.set("stationId", filters.stationId);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return `/api/cabildos/stations/comments?${params.toString()}`;
  }, [filters, page]);

  React.useEffect(() => {
    setPage(1);
  }, [
    filters.cabildoId,
    filters.region,
    filters.age,
    filters.gender,
    filters.nivelinstruccion,
    filters.grupoetnico,
    filters.stationId,
  ]);

  React.useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(buildUrl());
        const json = await res.json();
        setRows(json?.rows ?? []);
        setTotal(json?.total ?? 0);
      } catch (e) {
        console.error(e);
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [buildUrl]);

  function encodeGroup(group: {
    age_group: string[];
    region: string[];
    gender: string[];
    nivelinstruccion: string[];
    grupoetnico: string[];
    cabildoId: string[];
    stationId: string[];
  }) {
    const params = new URLSearchParams();

    group.age_group.forEach((v) => params.append("age_group", v));
    group.region.forEach((v) => params.append("region", v));
    group.gender.forEach((v) => params.append("gender", v));
    group.nivelinstruccion.forEach((v) => params.append("nivelinstruccion", v));
    group.grupoetnico.forEach((v) => params.append("grupoetnico", v));
    group.cabildoId.forEach((v) => params.append("cabildoId", v));
    group.stationId.forEach((v) => params.append("stationId", v));

    return params.toString();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const Cell = ({ text }: { text?: string }) => (
    <div
      style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        lineHeight: 1.35,
      }}
    >
      {text?.trim() ? text : "-"}
    </div>
  );

  const stickyTh: React.CSSProperties = {
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 2,
    padding: 12,
    borderBottom: "1px solid #ddd",
  };

  return (
    <div style={{ marginTop: 28 }}>
      <div className="fs18 fw700">Comentarios por Participante</div>
      <div style={{ height: 10 }} />
      {filters.cabildoId && [50, 51, 52].includes(Number(filters.cabildoId)) && (
        <div style={{ color: "red", fontSize: 12 }}>
          Comparación no disponible para Cabildos La Libertad - Urbano marginal 1, La Libertad - Urbano marginal 2 y La Libertad - Urbano marginal 3
        </div>
      )}
      <br />
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <button
          onClick={() => setCompareOpen(true)}
          disabled={!!(filters.cabildoId && [50, 51, 52].includes(Number(filters.cabildoId)))}
          style={{
            height: 40,
            padding: "0 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: filters.cabildoId && [50, 51, 52].includes(Number(filters.cabildoId)) ? "#ccc" : "#000",
            color: "#fff",
            cursor: filters.cabildoId && [50, 51, 52].includes(Number(filters.cabildoId)) ? "not-allowed" : "pointer",
          }}
        >
          Comparar
        </button>
        <button
          onClick={() => {
            const params = new URLSearchParams();

            if (filters.cabildoId) params.set("cabildoId", filters.cabildoId);
            if (filters.region) params.set("region", filters.region);
            if (filters.age) params.set("age", filters.age);
            if (filters.gender) params.set("gender", filters.gender);
            if (filters.nivelinstruccion) params.set("nivelinstruccion", filters.nivelinstruccion);
            if (filters.grupoetnico) params.set("grupoetnico", filters.grupoetnico);
            if (filters.stationId) params.set("stationId", filters.stationId);

            router.push(`/cabildos/analyze?${params.toString()}`);
          }}
          style={{
            height: 40,
            padding: "0 12px",
            borderRadius: 8,
            background: "linear-gradient(90deg, hsla(346, 100%, 83%, 1) 0%, hsla(238, 70%, 48%, 1) 100%)",
            filter: "progid: DXImageTransform.Microsoft.gradient( startColorstr=\"#FFA8BD\", endColorstr=\"#242ACF\", GradientType=1 )",
            color: "#fff",
          }}
        >
          Analizar
        </button>
      </div>

      <div style={{ height: 14 }} />

      {loadingFilters ? <div className="dash-loading">Cargando filtros...</div> : null}

      {loading ? (
        <div className="dash-loading">Cargando comentarios...</div>
      ) : (
        <div
          style={{
            width: "calc(100vw - 56px - 134px)",
            maxHeight: "70vh",
            overflow: "auto",
            border: "1px solid #000",
            borderRadius: 12,
            background: "#fff",
          }}
        >
          <div style={{ color: "#666", padding: 12 }}>{total.toLocaleString()} resultados</div>

          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1600 }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ ...stickyTh, minWidth: 200 }}>Cabildo</th>
                <th style={{ ...stickyTh, minWidth: 200 }}>Región procedencia</th>
                <th style={{ ...stickyTh, minWidth: 100 }}>Género</th>
                <th style={{ ...stickyTh, minWidth: 100 }}>Edad</th>
                <th style={{ ...stickyTh, minWidth: 150 }}>Nivel</th>
                <th style={{ ...stickyTh, minWidth: 150 }}>Grupo étnico</th>

                <th style={{ ...stickyTh, minWidth: 360 }}>E1 CATARSIS</th>
                <th style={{ ...stickyTh, minWidth: 360 }}>E2 CIRCUNSTANCIAS Y DIFERENCIAS</th>
                <th style={{ ...stickyTh, minWidth: 360 }}>E3 YO PRESIDENTE</th>
                <th style={{ ...stickyTh, minWidth: 360 }}>E4 ESTACIÓN 4</th>
                <th style={{ ...stickyTh, minWidth: 360 }}>CIERRE</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #000" }}>
                  <td style={{ padding: 12 }}>{r.cabildo || "-"}</td>
                  <td style={{ padding: 12 }}>{r.region_procedencia || "-"}</td>
                  <td style={{ padding: 12 }}>
                    {r.genero === "Masculino" ? "M" : r.genero === "Femenino" ? "F" : "-"}
                  </td>
                  <td style={{ padding: 12 }}>{r.age_group || "-"}</td>
                  <td style={{ padding: 12 }}>{r.nivelinstruccion || "-"}</td>
                  <td style={{ padding: 12 }}>{r.grupoetnico || "-"}</td>

                  <td style={{ padding: 12, verticalAlign: "middle" }}>
                    <Cell text={r.e1_catarsis} />
                  </td>
                  <td style={{ padding: 12, verticalAlign: "middle" }}>
                    <Cell text={r.e2_circunstancias} />
                  </td>
                  <td style={{ padding: 12, verticalAlign: "middle" }}>
                    <Cell text={r.e3_yo_presidente} />
                  </td>
                  <td style={{ padding: 12, verticalAlign: "middle" }}>
                    <Cell text={r.e4_estacion4} />
                  </td>
                  <td style={{ padding: 12, verticalAlign: "middle" }}>
                    <Cell text={r.cierre} />
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: 16, color: "#777" }}>
                    No hay resultados con los filtros seleccionados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
          >
            Anterior
          </button>

          <div style={{ minWidth: 120, textAlign: "center" }}>
            Página {page} / {totalPages}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ height: 36, padding: "0 10px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
          >
            Siguiente
          </button>
        </div>
      </div>

      <CompareModal
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
        filtersApi={filtersApi}
        onApply={(val: CompareModalValue) => {
          setCompareOpen(false);

          const params = new URLSearchParams();
          val.groups.forEach((g) => {
            params.append("group", encodeGroup(g));
          });

          router.push(`/cabildos/compare?${params.toString()}`);
        }}
      />
    </div>
  );
}
