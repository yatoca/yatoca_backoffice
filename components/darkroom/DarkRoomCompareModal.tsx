'use client';

import React from "react";

type Option = { label: string; value: string };

export type DarkRoomCompareDimension = "age_group" | "gender";

export type DarkRoomCompareModalValue = {
    dimension: DarkRoomCompareDimension;
    aValues: string[];
    bValues: string[];
};

type FiltersApi = {
    ageGroups: string[];
    genders: string[];
};

function uniq(arr: string[]) {
    return Array.from(new Set(arr));
}

function toggle(list: string[], v: string) {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

function remove(list: string[], v: string) {
    return list.filter((x) => x !== v);
}

const FALLBACK_AGE: Option[] = [
    { label: "15-", value: "15-" },
    { label: "16-29", value: "16-29" },
    { label: "30-45", value: "30-45" },
    { label: "46+", value: "46+" },
    { label: "No especifica", value: "No especifica" },
];

const FALLBACK_GENDER: Option[] = [
    { label: "Femenino", value: "Femenino" },
    { label: "Masculino", value: "Masculino" },
    { label: "Prefiero no indicar", value: "Prefiero no indicar" },
    { label: "No especifica", value: "No especifica" },
];

export default function DarkRoomCompareModal({
    open,
    onClose,
    onApply,
    filtersApi,
}: {
    open: boolean;
    onClose: () => void;
    onApply: (val: DarkRoomCompareModalValue) => void;
    filtersApi: FiltersApi | null;
}) {
    const [dimension, setDimension] = React.useState<DarkRoomCompareDimension>("age_group");
    const [aValues, setAValues] = React.useState<string[]>([]);
    const [bValues, setBValues] = React.useState<string[]>([]);

    React.useEffect(() => {
        if (!open) return;
        setDimension("age_group");
        setAValues([]);
        setBValues([]);
    }, [open]);

    if (!open) return null;

    const labelForDim: Record<DarkRoomCompareDimension, string> = {
        age_group: "Grupo de edad",
        gender: "Género",
    };

    const getOptions = (): Option[] => {
        if (dimension === "age_group") {
            const list = (filtersApi?.ageGroups ?? [])
                .map((x) => String(x).trim())
                .filter(Boolean)
                .map((x) => ({ label: x, value: x }));
            return list.length ? list : FALLBACK_AGE;
        }

        if (dimension === "gender") {
            const list = (filtersApi?.genders ?? [])
                .map((x) => String(x).trim())
                .filter(Boolean)
                .map((x) => ({ label: x, value: x }));
            return list.length ? list : FALLBACK_GENDER;
        }

        return [];
    };

    const options = getOptions();

    const onToggleA = (v: string) => {
        setAValues((prevA) => uniq(toggle(prevA, v)));
        setBValues((prevB) => remove(prevB, v)); // sin overlap
    };

    const onToggleB = (v: string) => {
        setBValues((prevB) => uniq(toggle(prevB, v)));
        setAValues((prevA) => remove(prevA, v)); // sin overlap
    };

    const canApply = aValues.length > 0 && bValues.length > 0;

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
                    width: "min(920px, 100%)",
                    background: "#2f2f2f",
                    borderRadius: 16,
                    padding: 18,
                    color: "#fff",
                    boxShadow: "0 8px 30px rgba(0,0,0,.35)",
                    maxHeight: "80vh",
                    minHeight: "80vh",
                    overflowY: "auto",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                        Comparar cohortes (Dark Room)
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

                <div style={{ height: 14 }} />

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <div style={{ opacity: 0.9 }}>Comparar por:</div>

                    <select
                        value={dimension}
                        onChange={(e) => {
                            const d = e.target.value as DarkRoomCompareDimension;
                            setDimension(d);
                            setAValues([]);
                            setBValues([]);
                        }}
                        style={{
                            height: 40,
                            padding: "0 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,.2)",
                            background: "#3a3a3a",
                            color: "#fff",
                            outline: "none",
                        }}
                    >
                        {Object.entries(labelForDim).map(([k, label]) => (
                            <option key={k} value={k}>
                                {label}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ height: 16 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Column title="Cohorte A" options={options} values={aValues} onToggle={onToggleA} />
                    <Column title="Cohorte B" options={options} values={bValues} onToggle={onToggleB} />
                </div>

                <div style={{ height: 18 }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <button
                        onClick={() => onApply({ dimension, aValues, bValues })}
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

                <div style={{ height: 10 }} />
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                    Resultado: se comparará la distribución de respuestas <b>en todas las preguntas</b>.
                </div>
            </div>
        </div>
    );
}

function Column({
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
            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 10 }}>{title}</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {options.map((o) => {
                    const checked = values.includes(o.value);
                    return (
                        <label
                            key={o.value}
                            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
                        >
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => onToggle(o.value)}
                                style={{ width: 18, height: 18 }}
                            />
                            <span
                                style={{
                                    display: "inline-block",
                                    padding: "8px 12px",
                                    borderRadius: 10,
                                    background: checked ? "#fff" : "#666",
                                    color: checked ? "#000" : "#222",
                                    minWidth: 160,
                                }}
                            >
                                {o.label}
                            </span>
                        </label>
                    );
                })}
                {options.length === 0 ? <div style={{ color: "#bbb" }}>No hay opciones.</div> : null}
            </div>
        </div>
    );
}
