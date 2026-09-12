'use client';

import React from "react";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import "./styles.css";

import VideosDashboard from "@/components/videos/VideosDashboard";
import VideosPhrasesTable from "@/components/videos/VideosPhrasesTable";
import Filter from "@/components/basic/filter/Filter";

export type VideosFiltersState = {
  regionId: string;
  eventId: string;
};

type FiltersApi = {
  regions: { id: number; nombreregion: string }[];
};

type EventItem = {
  id: number;
  name_event: string;
  date_event: string;
  region_name?: string | null;
};

type Option = { label: string; value: string };

const DEFAULT_FILTERS: VideosFiltersState = { regionId: "", eventId: "" };

export default function VideosPage() {
  const [loadingFilters, setLoadingFilters] = React.useState(true);

  const [filters, setFilters] = React.useState<VideosFiltersState>(DEFAULT_FILTERS);

  const [filtersApi, setFiltersApi] = React.useState<FiltersApi | null>(null);
  const [eventsList, setEventsList] = React.useState<EventItem[]>([]);

  // ✅ Load regions once
  React.useEffect(() => {
    const run = async () => {
      try {
        setLoadingFilters(true);
        const res = await fetch("/api/videos/phrases/filters");
        const json = (await res.json()) as any; // backend returns {regions, events?}
        setFiltersApi({ regions: json?.regions ?? [] });
      } catch (e) {
        console.error(e);
        setFiltersApi(null);
      } finally {
        setLoadingFilters(false);
      }
    };
    run();
  }, []);

  // ✅ Events depend on region (like you had)
  React.useEffect(() => {
    const loadEvents = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.regionId) params.set("regionId", filters.regionId);

        const url = params.toString()
          ? `/api/videos/events/list?${params.toString()}`
          : `/api/videos/events/list`;

        const res = await fetch(url);
        const json = await res.json();
        setEventsList(json?.events ?? []);
      } catch (e) {
        console.error("Failed to load events list", e);
        setEventsList([]);
      }
    };
    loadEvents();
  }, [filters.regionId]);

  const regionOptions: Option[] = React.useMemo(() => {
    const list = filtersApi?.regions ?? [];
    return [
      { label: "Todas", value: "" },
      ...list.map((r) => ({ label: r.nombreregion, value: String(r.id) })),
    ];
  }, [filtersApi]);

  const eventOptions: Option[] = React.useMemo(() => {
    const list = eventsList ?? [];
    return [
      { label: "Todos", value: "" },
      ...list.map((e) => ({ label: e.name_event, value: String(e.id) })),
    ];
  }, [eventsList]);

  return (
    <Wrapper>
      <div className="admin-videos">
        <SafeArea mv={32}>
          <>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <Filter
                label="Región"
                value={filters.regionId}
                onChange={(v) => setFilters((p) => ({ ...p, regionId: v, eventId: "" }))}
                options={regionOptions}
              />

              <Filter
                label="Evento"
                value={filters.eventId}
                onChange={(v) => setFilters((p) => ({ ...p, eventId: v }))}
                options={eventOptions}
              />

              <button
                onClick={() => setFilters(DEFAULT_FILTERS)}
                style={{
                  height: 40,
                  padding: "0 12px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: "#fff",
                }}
              >
                Limpiar
              </button>
            </div>

            {loadingFilters ? (
              <div className="dash-loading" style={{ marginTop: 10 }}>
                Cargando filtros...
              </div>
            ) : null}

            <br />

            {/* <VideosDashboard filters={filters} loadingFilters={loadingFilters} />
            <br /> */}
            <VideosPhrasesTable filters={filters} loadingFilters={loadingFilters} />
          </>
        </SafeArea>
      </div>
    </Wrapper>
  );
}
