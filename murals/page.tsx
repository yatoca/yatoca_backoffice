'use client';

import React from "react";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import "./styles.css";
import MuralsDashboard from "@/components/murals/MuralsDashboard";
import MuralsPhrasesTable from "@/components/murals/MuralsPhrasesTable";
import MultiSelectChipsDropdown, { ChipOption } from "@/components/basic/chip-multiselect/ChipMultiselect";

type FiltersApi = {
    regions: { id: number; nombreregion: string }[];
    events: { id: number; name: string; id_region: number; region_name?: string | null }[];
};

type EventItem = { id: number; name: string; id_region: number; region_name?: string | null };
type ActivityItem = { id: number; name_event: string; date_event: string | null; id_event: number; event_name?: string | null };

export type MuralsFiltersState = {
    regionId: string[];
    eventId: string[];
    activityId: string[];
};

const DEFAULT_FILTERS: MuralsFiltersState = { regionId: [], eventId: [], activityId: [] };

export default function Murals() {
    const [filtersApi, setFiltersApi] = React.useState<FiltersApi | null>(null);
    const [loadingFilters, setLoadingFilters] = React.useState(true);

    const [filters, setFilters] = React.useState<MuralsFiltersState>(DEFAULT_FILTERS);

    // Events (depend on regionId[])
    const [eventsList, setEventsList] = React.useState<EventItem[]>([]);
    const [loadingEvents, setLoadingEvents] = React.useState(false);

    // Activities (depend on regionId[] + eventId[])
    const [activitiesList, setActivitiesList] = React.useState<ActivityItem[]>([]);
    const [loadingActivities, setLoadingActivities] = React.useState(false);

    React.useEffect(() => {
        const run = async () => {
            try {
                setLoadingFilters(true);
                const res = await fetch("/api/murals/phrases/filters");
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

    // Load events when region(s) change
    React.useEffect(() => {
        const loadEvents = async () => {
            try {
                setLoadingEvents(true);

                const params = new URLSearchParams();
                (filters.regionId ?? []).forEach((v) => params.append("regionId", v));

                const url = params.toString()
                    ? `/api/murals/events/list?${params.toString()}`
                    : `/api/murals/events/list`;

                const res = await fetch(url);
                const json = await res.json();
                setEventsList(json?.events ?? []);
            } catch (e) {
                console.error("Failed to load events list", e);
                setEventsList([]);
            } finally {
                setLoadingEvents(false);
            }
        };

        loadEvents();
    }, [filters.regionId]);

    // Load activities when region(s) or event(s) change
    React.useEffect(() => {
        const loadActivities = async () => {
            try {
                setLoadingActivities(true);

                const params = new URLSearchParams();
                (filters.regionId ?? []).forEach((v) => params.append("regionId", v));
                (filters.eventId ?? []).forEach((v) => params.append("eventId", v));

                const url = params.toString()
                    ? `/api/murals/activities/list?${params.toString()}`
                    : `/api/murals/activities/list`;

                const res = await fetch(url);
                const json = await res.json();
                setActivitiesList(json?.activities ?? []);
            } catch (e) {
                console.error("Failed to load activities list", e);
                setActivitiesList([]);
            } finally {
                setLoadingActivities(false);
            }
        };

        loadActivities();
    }, [filters.regionId, filters.eventId]);

    const regionOptions: ChipOption[] = React.useMemo(() => {
        const list = filtersApi?.regions ?? [];
        return list.map((r) => ({ label: r.nombreregion, value: String(r.id) }));
    }, [filtersApi]);

    const eventOptions: ChipOption[] = React.useMemo(() => {
        const list = eventsList ?? [];
        return list.map((e) => ({ label: e.name, value: String(e.id) }));
    }, [eventsList]);

    const activityOptions: ChipOption[] = React.useMemo(() => {
        const list = activitiesList ?? [];
        return list.map((a) => ({
            label: `${a.name_event}`,
            value: String(a.id),
        }));
    }, [activitiesList]);

    const isLoadingTop = loadingFilters || loadingEvents || loadingActivities;

    return (
        <Wrapper>
            <div className="admin-murals">
                <SafeArea mv={32}>
                    <>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <MultiSelectChipsDropdown
                                label="Región"
                                value={filters.regionId}
                                onChange={(vals) =>
                                    setFilters((p) => ({
                                        ...p,
                                        regionId: vals,
                                        eventId: [],
                                        activityId: [],
                                    }))
                                }
                                options={regionOptions}
                                placeholder="Todas"
                                disabled={filters.activityId.length > 0 || filters.eventId.length > 0}
                            />

                            <MultiSelectChipsDropdown
                                label="Evento"
                                value={filters.eventId}
                                onChange={(vals) =>
                                    setFilters((p) => ({
                                        ...p,
                                        eventId: vals,
                                        activityId: [],
                                    }))
                                }
                                options={eventOptions}
                                placeholder="Todos"
                                disabled={filters.activityId.length > 0}
                            />

                            <MultiSelectChipsDropdown
                                label="Actividad"
                                value={filters.activityId}
                                onChange={(vals) => setFilters((p) => ({ ...p, activityId: vals }))}
                                options={activityOptions}
                                placeholder="Todas"
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

                        {isLoadingTop ? (
                            <div className="dash-loading" style={{ marginTop: 10 }}>
                                Cargando filtros...
                            </div>
                        ) : null}

                        <br />

                        <MuralsDashboard filters={filters} />
                        <br />
                        <MuralsPhrasesTable filtersApi={filtersApi} filters={filters} />
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    );
}