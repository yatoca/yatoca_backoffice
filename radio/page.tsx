'use client';

import React from "react";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import RadioDashboard from "@/components/radio/RadioDashboard";
import RadioEpisodesTable from "@/components/radio/RadioEpisodesTable";
import "./styles.css";
import Filter from "@/components/basic/filter/Filter";

export type RadioFiltersState = {
    programId: string;
    topicId: string; // can be "" | "null" | numeric string
};

type FiltersResponse = {
    programs: { id: number; name_program: string }[];
    topics: { id: number; topic_name: string }[];
};

type Option = { label: string; value: string };

function clampStr(x: any) {
    return String(x ?? "").trim();
}

const DEFAULT_FILTERS: RadioFiltersState = { programId: "", topicId: "" };

export default function Radio() {
    const [filtersApi, setFiltersApi] = React.useState<FiltersResponse | null>(null);
    const [loadingFilters, setLoadingFilters] = React.useState(true);

    const [filters, setFilters] = React.useState<RadioFiltersState>(DEFAULT_FILTERS);

    // load filters once
    React.useEffect(() => {
        const run = async () => {
            try {
                setLoadingFilters(true);
                const res = await fetch("/api/radio/filters");
                const json = (await res.json()) as FiltersResponse;
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

    const programOptions: Option[] = React.useMemo(() => {
        const list = filtersApi?.programs ?? [];
        return [{ label: "Todos", value: "" }, ...list.map((p) => ({ label: p.name_program, value: String(p.id) }))];
    }, [filtersApi]);

    const topicOptions: Option[] = React.useMemo(() => {
        const list = filtersApi?.topics ?? [];
        return [
            { label: "Todos", value: "" },
            ...list.map((t) => ({ label: t.topic_name, value: String(t.id) })),
        ];
    }, [filtersApi]);

    return (
        <Wrapper>
            <div className="admin-radio">
                <SafeArea mv={32}>
                    <>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <Filter
                                label="Programa"
                                value={filters.programId}
                                onChange={(v) => setFilters((p) => ({ ...p, programId: clampStr(v) }))}
                                options={programOptions}
                            />

                            <Filter
                                label="Topic"
                                value={filters.topicId}
                                onChange={(v) => setFilters((p) => ({ ...p, topicId: clampStr(v) }))}
                                options={topicOptions}
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

                        {/* <RadioDashboard filters={filters} loadingFilters={loadingFilters} /> */}
                        <br />
                        <RadioEpisodesTable
                            filters={filters}
                            filtersApi={filtersApi}
                            loadingFilters={loadingFilters}
                        />
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    );
}
