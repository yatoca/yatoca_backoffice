"use client";

import React from "react";

type Option = { label: string; value: string };

export type CabildosCompareGroup = {
    id: string;
    age_group: string[];
    region: string[];
    gender: string[];
    nivelinstruccion: string[];
    grupoetnico: string[];
    cabildoId: string[];
    stationId: string[];
};

export type CompareModalValue = {
    groups: CabildosCompareGroup[];
};

type FiltersApi = {
    regions: string[];
    genders: string[];
    ageGroups: string[];
    nivelesInstruccion: string[];
    gruposEtnicos: string[];
    estaciones: { id: number; nombre: string }[];
    cabildos: { id: number; nombre: string }[];
};

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function uniq(arr: string[]) {
    return Array.from(new Set(arr));
}

function toggle(list: string[], v: string) {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function createEmptyGroup(): CabildosCompareGroup {
    return {
        id: uid(),
        age_group: [],
        region: [],
        gender: [],
        nivelinstruccion: [],
        grupoetnico: [],
        cabildoId: [],
        stationId: [],
    };
}

function normalizeGroup(g: CabildosCompareGroup): CabildosCompareGroup {
    return {
        ...g,
        age_group: uniq(g.age_group.map((x) => x.trim()).filter(Boolean)),
        region: uniq(g.region.map((x) => x.trim()).filter(Boolean)),
        gender: uniq(g.gender.map((x) => x.trim()).filter(Boolean)),
        nivelinstruccion: uniq(g.nivelinstruccion.map((x) => x.trim()).filter(Boolean)),
        grupoetnico: uniq(g.grupoetnico.map((x) => x.trim()).filter(Boolean)),
        cabildoId: uniq(g.cabildoId.map((x) => x.trim()).filter(Boolean)),
        stationId: uniq(g.stationId.map((x) => x.trim()).filter(Boolean)),
    };
}

function hasAnyValue(g: CabildosCompareGroup) {
    return (
        g.age_group.length > 0 ||
        g.region.length > 0 ||
        g.gender.length > 0 ||
        g.nivelinstruccion.length > 0 ||
        g.grupoetnico.length > 0 ||
        g.cabildoId.length > 0 ||
        g.stationId.length > 0
    );
}

function groupKey(g: CabildosCompareGroup) {
    return JSON.stringify({
        age_group: [...g.age_group].sort(),
        region: [...g.region].sort(),
        gender: [...g.gender].sort(),
        nivelinstruccion: [...g.nivelinstruccion].sort(),
        grupoetnico: [...g.grupoetnico].sort(),
        cabildoId: [...g.cabildoId].sort(),
        stationId: [...g.stationId].sort(),
    });
}

export default function CompareModal({
    open,
    onClose,
    onApply,
    filtersApi,
}: {
    open: boolean;
    onClose: () => void;
    onApply: (val: CompareModalValue) => void;
    filtersApi: FiltersApi | null;
}) {
    const [groups, setGroups] = React.useState<CabildosCompareGroup[]>([
        createEmptyGroup(),
        createEmptyGroup(),
    ]);

    React.useEffect(() => {
        if (!open) return;
        setGroups([createEmptyGroup(), createEmptyGroup()]);
    }, [open]);

    if (!open) return null;

    const normalizedGroups = groups.map(normalizeGroup).filter(hasAnyValue);
    const keys = normalizedGroups.map(groupKey);
    const hasDuplicates = new Set(keys).size !== keys.length;
    const canApply = normalizedGroups.length >= 2 && !hasDuplicates;

    const setGroupField = (
        groupId: string,
        field: keyof Omit<CabildosCompareGroup, "id">,
        value: string
    ) => {
        setGroups((prev) =>
            prev.map((g) =>
                g.id === groupId
                    ? {
                        ...g,
                        [field]: toggle(g[field], value),
                    }
                    : g
            )
        );
    };

    const addGroup = () => {
        setGroups((prev) => [...prev, createEmptyGroup()]);
    };

    const removeGroup = (groupId: string) => {
        setGroups((prev) => {
            const next = prev.filter((g) => g.id !== groupId);
            return next.length >= 2 ? next : [createEmptyGroup(), createEmptyGroup()];
        });
    };

    const ageOptions: Option[] = (filtersApi?.ageGroups ?? []).map((x) => ({ label: x, value: x }));
    const regionOptions: Option[] = (filtersApi?.regions ?? []).map((x) => ({ label: x, value: x }));
    const genderOptions: Option[] = (filtersApi?.genders ?? []).map((x) => ({ label: x, value: x }));
    const nivelOptions: Option[] = (filtersApi?.nivelesInstruccion ?? []).map((x) => ({ label: x, value: x }));
    const etnicoOptions: Option[] = (filtersApi?.gruposEtnicos ?? []).map((x) => ({ label: x, value: x }));
    const cabildoOptions: Option[] = (filtersApi?.cabildos ?? [])
        .filter((c) => c.id !== 50 && c.id !== 51 && c.id !== 52)
        .map((c) => ({ label: c.nombre, value: String(c.id) }));
    const stationOptions: Option[] = (filtersApi?.estaciones ?? []).map((s) => ({
        label: s.nombre,
        value: String(s.id),
    }));

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,.55)",
                zIndex: 9999,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 16,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    width: "min(1200px, 100%)",
                    background: "#2f2f2f",
                    borderRadius: 16,
                    padding: 18,
                    color: "#fff",
                    boxShadow: "0 8px 30px rgba(0,0,0,.35)",
                    maxHeight: "88vh",
                    minHeight: "80vh",
                    overflowY: "auto",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 700 }}>Comparar múltiples grupos</div>
                        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                            Cada grupo puede combinar edad, región, género, nivel, grupo étnico, cabildo y estación.
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,.2)",
                            background: "transparent",
                            color: "#fff",
                            fontSize: 18,
                            cursor: "pointer",
                        }}
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                <div style={{ height: 16 }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontWeight: 700 }}>Grupos a comparar</div>
                    <button
                        onClick={addGroup}
                        style={{
                            height: 36,
                            padding: "0 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,.2)",
                            background: "#fff",
                            color: "#000",
                            cursor: "pointer",
                            fontWeight: 700,
                        }}
                    >
                        + Agregar grupo
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {groups.map((g, idx) => (
                        <div
                            key={g.id}
                            style={{
                                border: "1px solid rgba(255,255,255,.12)",
                                borderRadius: 14,
                                padding: 14,
                                background: "rgba(255,255,255,.06)",
                            }}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <div style={{ fontWeight: 700 }}>Grupo {idx + 1}</div>
                                <button
                                    onClick={() => removeGroup(g.id)}
                                    style={{
                                        height: 32,
                                        padding: "0 10px",
                                        borderRadius: 10,
                                        border: "1px solid rgba(255,255,255,.2)",
                                        background: "transparent",
                                        color: "#fff",
                                        cursor: "pointer",
                                    }}
                                >
                                    Eliminar
                                </button>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                                <MultiSelectBlock
                                    title="Grupo de edad"
                                    options={ageOptions}
                                    values={g.age_group}
                                    onToggle={(v) => setGroupField(g.id, "age_group", v)}
                                />
                                <MultiSelectBlock
                                    title="Región"
                                    options={regionOptions}
                                    values={g.region}
                                    onToggle={(v) => setGroupField(g.id, "region", v)}
                                />
                                <MultiSelectBlock
                                    title="Género"
                                    options={genderOptions}
                                    values={g.gender}
                                    onToggle={(v) => setGroupField(g.id, "gender", v)}
                                />
                                <MultiSelectBlock
                                    title="Nivel de instrucción"
                                    options={nivelOptions}
                                    values={g.nivelinstruccion}
                                    onToggle={(v) => setGroupField(g.id, "nivelinstruccion", v)}
                                />
                                <MultiSelectBlock
                                    title="Grupo étnico"
                                    options={etnicoOptions}
                                    values={g.grupoetnico}
                                    onToggle={(v) => setGroupField(g.id, "grupoetnico", v)}
                                />
                                <MultiSelectBlock
                                    title="Cabildo"
                                    options={cabildoOptions}
                                    values={g.cabildoId}
                                    onToggle={(v) => setGroupField(g.id, "cabildoId", v)}
                                />
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <MultiSelectBlock
                                        title="Estación"
                                        options={stationOptions}
                                        values={g.stationId}
                                        onToggle={(v) => setGroupField(g.id, "stationId", v)}
                                    />
                                </div>
                            </div>

                            {!hasAnyValue(normalizeGroup(g)) ? (
                                <div style={{ marginTop: 10, fontSize: 12, color: "#ffd9a8" }}>
                                    Selecciona al menos un filtro en este grupo.
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>

                {hasDuplicates ? (
                    <div
                        style={{
                            marginTop: 16,
                            padding: 12,
                            borderRadius: 12,
                            background: "rgba(255,100,100,.12)",
                            border: "1px solid rgba(255,100,100,.3)",
                            color: "#ffd2d2",
                            fontSize: 13,
                        }}
                    >
                        Hay grupos duplicados. Cada grupo debe ser único.
                    </div>
                ) : null}

                <div style={{ height: 18 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <button
                        onClick={() => onApply({ groups: normalizedGroups })}
                        disabled={!canApply}
                        style={{
                            height: 46,
                            borderRadius: 12,
                            border: "1px solid rgba(0,0,0,.4)",
                            background: canApply ? "#000" : "#222",
                            color: "#fff",
                            fontSize: 16,
                            cursor: canApply ? "pointer" : "not-allowed",
                        }}
                    >
                        Aplicar
                    </button>

                    <button
                        onClick={onClose}
                        style={{
                            height: 46,
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,.2)",
                            background: "transparent",
                            color: "#fff",
                            fontSize: 16,
                            cursor: "pointer",
                        }}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

function MultiSelectBlock({
    title,
    options,
    values,
    onToggle,
}: {
    title: string;
    options: Option[];
    values: string[];
    onToggle: (v: string) => void;
}) {
    return (
        <div>
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 8, fontWeight: 700 }}>{title}</div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {options.map((o) => {
                    const checked = values.includes(o.value);
                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => onToggle(o.value)}
                            style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid rgba(255,255,255,.2)",
                                background: checked ? "#fff" : "#666",
                                color: checked ? "#000" : "#fff",
                                cursor: "pointer",
                            }}
                        >
                            {o.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}