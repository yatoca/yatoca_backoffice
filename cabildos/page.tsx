'use client';

import React from "react";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import CabildosStationsTable from "@/components/cabildos/CabildosStationsTable";
import Filter from "@/components/basic/filter/Filter";
import "./styles.css";
import CabildosDashboard from "@/components/cabildos/CabildosDashboard";

type Option = { label: string; value: string };

type FiltersApi = {
    regions: string[];
    genders: string[];
    ageGroups: string[];
    nivelesInstruccion: string[];
    gruposEtnicos: string[];
    estaciones: { id: number; nombre: string }[];
    cabildos: { id: number; nombre: string }[];
};

export type CabildosFiltersState = {
    cabildoId: string;
    region: string;
    age: string;
    gender: string;
    nivelinstruccion: string;
    grupoetnico: string;
    stationId: string;
};

const DEFAULT_FILTERS: CabildosFiltersState = {
    cabildoId: "",
    region: "",
    age: "",
    gender: "",
    nivelinstruccion: "",
    grupoetnico: "",
    stationId: "",
};

export default function Cabildos() {
    const [filtersApi, setFiltersApi] = React.useState<FiltersApi | null>(null);
    const [loadingFilters, setLoadingFilters] = React.useState(true);

    const [filters, setFilters] = React.useState<CabildosFiltersState>(DEFAULT_FILTERS);

    // Load filter options once (single source)
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

    const cabildoOptions: Option[] = React.useMemo(() => {
        const list = filtersApi?.cabildos ?? [];
        return [{ label: "Todos", value: "" }, ...list.map((c) => ({ label: c.nombre, value: String(c.id) }))];
    }, [filtersApi]);

    const stationOptions: Option[] = React.useMemo(() => {
        const list = filtersApi?.estaciones ?? [];
        return [{ label: "Todas", value: "" }, ...list.map((s) => ({ label: s.nombre, value: String(s.id) }))];
    }, [filtersApi]);

    const regionOptions: Option[] = React.useMemo(() => {
        const list = filtersApi?.regions ?? [];
        return [{ label: "Todas", value: "" }, ...list.map((r) => ({ label: r, value: r }))];
    }, [filtersApi]);

    const ageOptions: Option[] = React.useMemo(() => {
        const list = filtersApi?.ageGroups ?? ["15-", "16-29", "30-45", "46+", "No especifica"];
        return [{ label: "Todas", value: "" }, ...list.map((a) => ({ label: a, value: a }))];
    }, [filtersApi]);

    const genderOptions: Option[] = React.useMemo(() => {
        const list = filtersApi?.genders ?? ["Femenino", "Masculino", "Prefiero no indicar", "No especifica"];
        return [{ label: "Todos", value: "" }, ...list.map((g) => ({ label: g, value: g }))];
    }, [filtersApi]);

    const nivelOptions: Option[] = React.useMemo(() => {
        const list = filtersApi?.nivelesInstruccion ?? [];
        return [{ label: "Todos", value: "" }, ...list.map((n) => ({ label: n, value: n }))];
    }, [filtersApi]);

    const etnicoOptions: Option[] = React.useMemo(() => {
        const list = filtersApi?.gruposEtnicos ?? [];
        return [{ label: "Todos", value: "" }, ...list.map((e) => ({ label: e, value: e }))];
    }, [filtersApi]);

    return (
        <Wrapper>
            <div className="admin-cabildos">
                <SafeArea mv={32}>
                    <>
                        {/* Filters live here (single place) */}
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <Filter label="Cabildo" value={filters.cabildoId} onChange={(v) => setFilters((p) => ({ ...p, cabildoId: v }))} options={cabildoOptions} />
                            <Filter label="Estación" value={filters.stationId} onChange={(v) => setFilters((p) => ({ ...p, stationId: v }))} options={stationOptions} />
                            <Filter label="Edad" value={filters.age} onChange={(v) => setFilters((p) => ({ ...p, age: v }))} options={ageOptions} />
                            <Filter label="Género" value={filters.gender} onChange={(v) => setFilters((p) => ({ ...p, gender: v }))} options={genderOptions} />
                            <Filter label="Región" value={filters.region} onChange={(v) => setFilters((p) => ({ ...p, region: v }))} options={regionOptions} />
                            <Filter label="Nivel" value={filters.nivelinstruccion} onChange={(v) => setFilters((p) => ({ ...p, nivelinstruccion: v }))} options={nivelOptions} />
                            <Filter label="Grupo étnico" value={filters.grupoetnico} onChange={(v) => setFilters((p) => ({ ...p, grupoetnico: v }))} options={etnicoOptions} />

                            <button
                                onClick={() => setFilters(DEFAULT_FILTERS)}
                                style={{ height: 40, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff" }}
                            >
                                Limpiar
                            </button>
                        </div>

                        {loadingFilters ? <div className="dash-loading" style={{ marginTop: 10 }}>Cargando filtros...</div> : null}

                        <br />

                        <CabildosDashboard filters={filters} />
                        <br />
                        <CabildosStationsTable filters={filters} />
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    );
}
