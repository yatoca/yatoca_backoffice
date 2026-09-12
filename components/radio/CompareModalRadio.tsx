"use client";

import React from "react";

export type CompareGroup = {
    id: string;
    programId: string;
    topicId: string;
};

export type CompareModalValueRadio = {
    groups: CompareGroup[];
};

type FiltersApi = {
    programs: { id: number; name_program: string }[];
    topics: { id: number; topic_name: string }[];
};

type Option = { label: string; value: string };

function uid() {
    return Math.random().toString(36).slice(2, 10);
}

function createEmptyGroup(): CompareGroup {
    return {
        id: uid(),
        programId: "",
        topicId: "",
    };
}

function isValidGroup(g: CompareGroup) {
    return !!g.programId || !!g.topicId;
}

function normalizeGroups(groups: CompareGroup[]) {
    return groups
        .map((g) => ({
            id: g.id || uid(),
            programId: String(g.programId || "").trim(),
            topicId: String(g.topicId || "").trim(),
        }))
        .filter(isValidGroup);
}

function groupKey(g: CompareGroup) {
    return `p:${g.programId || ""}|t:${g.topicId || ""}`;
}

export default function CompareModalRadio({
    open,
    onClose,
    onApply,
    filtersApi,
}: {
    open: boolean;
    onClose: () => void;
    onApply: (val: CompareModalValueRadio) => void;
    filtersApi: FiltersApi | null;
}) {
    const [groups, setGroups] = React.useState<CompareGroup[]>([
        createEmptyGroup(),
        createEmptyGroup(),
    ]);

    React.useEffect(() => {
        if (!open) return;
        setGroups([createEmptyGroup(), createEmptyGroup()]);
    }, [open]);

    if (!open) return null;

    const programOptions: Option[] = (filtersApi?.programs ?? []).map((p) => ({
        label: p.name_program,
        value: String(p.id),
    }));

    const topicOptions: Option[] = (filtersApi?.topics ?? []).map((t) => ({
        label: t.topic_name,
        value: String(t.id),
    }));

    const normalizedGroups = normalizeGroups(groups);
    const keys = normalizedGroups.map(groupKey);
    const hasDuplicates = new Set(keys).size !== keys.length;
    const canApply = normalizedGroups.length >= 2 && !hasDuplicates;

    const setGroupValue = (groupId: string, patch: Partial<CompareGroup>) => {
        setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...patch } : g)));
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
                    width: "min(1100px, 100%)",
                    background: "#2f2f2f",
                    borderRadius: 16,
                    padding: 18,
                    color: "#fff",
                    boxShadow: "0 8px 30px rgba(0,0,0,.35)",
                    maxHeight: "88vh",
                    minHeight: "78vh",
                    overflowY: "auto",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                    }}
                >
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>
                            Comparar múltiples grupos
                        </div>
                        <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8 }}>
                            Crea 2 o más grupos. Cada grupo puede combinar Programa y Topic.
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

                <div
                    style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "rgba(255,255,255,.07)",
                        fontSize: 13,
                        lineHeight: 1.45,
                        opacity: 0.9,
                    }}
                >
                    Ejemplos:
                    <br />
                    - Grupo 1: Programa A + Topic X
                    <br />
                    - Grupo 2: Programa A + Topic Y
                    <br />
                    - Grupo 3: Programa A + Topic Z
                    <br />
                    <br />
                    Reglas:
                    <br />
                    - Cada grupo debe tener al menos Programa o Topic.
                    <br />
                    - Debes tener mínimo 2 grupos válidos.
                    <br />
                    - No puede repetirse el mismo grupo exacto.
                </div>

                <div style={{ height: 16 }} />

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                    }}
                >
                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                        Grupos a comparar
                    </div>

                    <button
                        onClick={addGroup}
                        style={{
                            height: 36,
                            padding: "0 12px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,.2)",
                            background: "#fff",
                            color: "#000",
                            fontWeight: 800,
                            cursor: "pointer",
                        }}
                    >
                        + Agregar grupo
                    </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {groups.map((g, idx) => {
                        const valid = isValidGroup(g);

                        return (
                            <div
                                key={g.id}
                                style={{
                                    border: "1px solid rgba(255,255,255,.12)",
                                    borderRadius: 14,
                                    padding: 12,
                                    background: "rgba(255,255,255,.06)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: 10,
                                        gap: 10,
                                    }}
                                >
                                    <div style={{ fontWeight: 800 }}>
                                        Grupo {idx + 1}
                                    </div>

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

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: 10,
                                    }}
                                >
                                    <SelectBox
                                        label="Programa"
                                        value={g.programId}
                                        onChange={(v) => setGroupValue(g.id, { programId: v })}
                                        options={programOptions}
                                        placeholder="Todos / no restringir"
                                    />

                                    <SelectBox
                                        label="Topic"
                                        value={g.topicId}
                                        onChange={(v) => setGroupValue(g.id, { topicId: v })}
                                        options={topicOptions}
                                        placeholder="Todos / no restringir"
                                    />
                                </div>

                                {!valid ? (
                                    <div
                                        style={{
                                            marginTop: 10,
                                            fontSize: 12,
                                            color: "#ffd9a8",
                                        }}
                                    >
                                        Selecciona al menos un Programa o un Topic.
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
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
                        Hay grupos repetidos. Cada grupo debe ser único.
                    </div>
                ) : null}

                <div style={{ height: 18 }} />

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 16,
                    }}
                >
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
                            fontWeight: 800,
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
                            fontWeight: 800,
                        }}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
}

function SelectBox({
    label,
    value,
    onChange,
    options,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: Option[];
    placeholder: string;
}) {
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 13, opacity: 0.9, fontWeight: 700 }}>
                {label}
            </span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    height: 40,
                    borderRadius: 10,
                    padding: "0 10px",
                    border: "1px solid rgba(255,255,255,.15)",
                    background: "#fff",
                    color: "#000",
                    outline: "none",
                    width: "100%"
                }}
            >
                <option value="">{placeholder}</option>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}