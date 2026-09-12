'use client';

import React from "react";
import { useRouter } from "next/navigation";
import Wrapper from "@/components/basic/wrapper";
import SafeArea from "@/components/basic/safe-area";
import "./styles.css";
import DarkRoomDashboard from "@/components/darkroom/DarkRoomDashboard";
import MultiSelectChipsDropdown, { ChipOption } from "@/components/basic/chip-multiselect/ChipMultiselect";

export type DarkRoomFiltersState = {
    questionId: string[];   // now multi
    optionId: string[];     // now multi (but we'll restrict UI by question)
    age: string[];
    gender: string[];
    regionId: string[];
};

type FiltersApi = {
    questions: { id: number; text: string; sort_order?: number }[];
    optionsByQuestion: Record<number, { id: number; question_id: number; text: string; sort_order?: number }[]>;
    ageGroups: string[];
    genders: string[];
    regions: { id: number; name: string }[];
};

const DEFAULT_FILTERS: DarkRoomFiltersState = {
    questionId: [],
    optionId: [],
    age: [],
    gender: [],
    regionId: [],
};

export default function DarkRoom() {
    const router = useRouter();

    const [filtersApi, setFiltersApi] = React.useState<FiltersApi | null>(null);
    const [loadingFilters, setLoadingFilters] = React.useState(true);
    const [filters, setFilters] = React.useState<DarkRoomFiltersState>(DEFAULT_FILTERS);

    React.useEffect(() => {
        const run = async () => {
            try {
                setLoadingFilters(true);
                const res = await fetch("/api/darkroom/filters");
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

    const questionOptions: ChipOption[] = React.useMemo(() => {
        const list = filtersApi?.questions ?? [];
        return list.map((q) => ({ label: q.text, value: String(q.id) }));
    }, [filtersApi]);

    const selectedQuestionId = React.useMemo(() => {
        // only allow option dropdown when exactly 1 question selected
        if (filters.questionId.length !== 1) return null;
        const q = filters.questionId[0];
        return q && /^\d+$/.test(q) ? Number(q) : null;
    }, [filters.questionId]);

    const optionOptions: ChipOption[] = React.useMemo(() => {
        const qid = selectedQuestionId;
        if (!qid || !filtersApi?.optionsByQuestion?.[qid]) return [];
        const list = filtersApi.optionsByQuestion[qid] ?? [];
        return list.map((o) => ({ label: o.text, value: String(o.id) }));
    }, [filtersApi, selectedQuestionId]);

    const ageOptions: ChipOption[] = React.useMemo(() => {
        const list = filtersApi?.ageGroups?.length
            ? filtersApi.ageGroups
            : ["15-", "16-29", "30-45", "46+", "No especifica"];
        return list.map((x) => ({ label: x, value: x }));
    }, [filtersApi]);

    const genderOptions: ChipOption[] = React.useMemo(() => {
        const list = filtersApi?.genders?.length
            ? filtersApi.genders
            : ["Femenino", "Masculino", "Otro", "No especifica"];
        return list.map((x) => ({ label: x, value: x }));
    }, [filtersApi]);

    const regionOptions: ChipOption[] = React.useMemo(() => {
        const list = filtersApi?.regions?.length
            ? filtersApi.regions
            : [{ id: 29, name: "Lima" }, { id: 23, name: "Arequipa" }];
        return list.map((r) => ({ label: r.name, value: String(r.id) }));
    }, [filtersApi]);

    const goAnalyze = React.useCallback(() => {
        const params = new URLSearchParams();

        // multi values
        filters.questionId.forEach((x) => params.append("questionId", x));
        filters.optionId.forEach((x) => params.append("optionId", x));
        filters.age.forEach((x) => params.append("age", x));
        filters.gender.forEach((x) => params.append("gender", x));
        filters.regionId.forEach((x) => params.append("regionId", x));

        router.push(`/darkroom/analyze?${params.toString()}`);
    }, [filters, router]);

    return (
        <Wrapper>
            <div className="admin-darkroom">
                <SafeArea mv={32}>
                    <>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                            <MultiSelectChipsDropdown
                                label="Pregunta"
                                value={filters.questionId}
                                onChange={(vals: string[]) =>
                                    setFilters((p) => ({
                                        ...p,
                                        questionId: vals,
                                        optionId: [], // reset options when question changes
                                    }))
                                }
                                options={questionOptions}
                                placeholder="Seleccionar pregunta(s)"
                            />

                            <MultiSelectChipsDropdown
                                label="Opción"
                                value={filters.optionId}
                                onChange={(vals: string[]) => setFilters((p) => ({ ...p, optionId: vals }))}
                                options={optionOptions}
                                placeholder={selectedQuestionId ? "Seleccionar opción(es)" : "Selecciona 1 pregunta"}
                                disabled={!selectedQuestionId}
                            />

                            <MultiSelectChipsDropdown
                                label="Edad"
                                value={filters.age}
                                onChange={(vals: string[]) => setFilters((p) => ({ ...p, age: vals }))}
                                options={ageOptions}
                                placeholder="Todas"
                            />

                            <MultiSelectChipsDropdown
                                label="Género"
                                value={filters.gender}
                                onChange={(vals: string[]) => setFilters((p) => ({ ...p, gender: vals }))}
                                options={genderOptions}
                                placeholder="Todos"
                            />

                            <MultiSelectChipsDropdown
                                label="Región"
                                value={filters.regionId}
                                onChange={(vals: string[]) => setFilters((p) => ({ ...p, regionId: vals }))}
                                options={regionOptions}
                                placeholder="Todas"
                            />

                            <button
                                onClick={goAnalyze}
                                style={{
                                    height: 40,
                                    padding: "0 12px",
                                    borderRadius: 8,
                                    background:
                                        "linear-gradient(90deg, hsla(346, 100%, 83%, 1) 0%, hsla(238, 70%, 48%, 1) 100%)",
                                    filter:
                                        "progid: DXImageTransform.Microsoft.gradient( startColorstr=\"#FFA8BD\", endColorstr=\"#242ACF\", GradientType=1 )",
                                    color: "#fff",
                                    border: "none",
                                }}
                            >
                                Analizar
                            </button>

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

                        <DarkRoomDashboard filters={filters} loadingFilters={loadingFilters} />
                    </>
                </SafeArea>
            </div>
        </Wrapper>
    );
}