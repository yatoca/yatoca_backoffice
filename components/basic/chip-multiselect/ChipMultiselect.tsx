'use client';

import React from "react";

export type ChipOption = { label: string; value: string };

export default function MultiSelectChipsDropdown({
    label,
    value,
    options,
    placeholder = "Seleccionar...",
    onChange,
    disabled,
    maxSelected,
}: {
    label: string;
    value: string[];
    options: ChipOption[];
    placeholder?: string;
    onChange: (v: string[]) => void;
    disabled?: boolean;
    maxSelected?: number;
}) {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!ref.current) return;
            if (!ref.current.contains(e.target as any)) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, []);

    const selectedSet = React.useMemo(() => new Set(value), [value]);

    const toggle = (val: string) => {
        if (disabled) return;

        const exists = selectedSet.has(val);

        if (exists) {
            onChange(value.filter((x) => x !== val));
            return;
        }

        if (maxSelected && value.length >= maxSelected) return;
        onChange([...value, val]);
    };

    const remove = (val: string) => {
        if (disabled) return;
        onChange(value.filter((x) => x !== val));
    };

    const selectedOptions = React.useMemo(() => {
        const map = new Map(options.map((o) => [o.value, o.label]));
        return value.map((v) => ({ value: v, label: map.get(v) ?? v }));
    }, [value, options]);

    return (
        <div style={{ minWidth: 260 }} ref={ref}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{label}</div>

            <div
                onClick={() => !disabled && setOpen((p) => !p)}
                style={{
                    minHeight: 44,
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    padding: "6px 10px",
                    background: disabled ? "#f2f2f2" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    cursor: disabled ? "not-allowed" : "pointer",
                    position: "relative",
                }}
            >
                {selectedOptions.length === 0 ? (
                    <span style={{ opacity: 0.6, fontSize: 13 }}>{placeholder}</span>
                ) : (
                    selectedOptions.map((opt) => (
                        <span
                            key={opt.value}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 8,
                                borderRadius: 16,
                                padding: "6px 10px",
                                background: "rgba(0,0,0,0.06)",
                                border: "1px solid rgba(0,0,0,0.10)",
                                fontSize: 13,
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {opt.label}
                            <button
                                type="button"
                                onClick={() => remove(opt.value)}
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    lineHeight: 1,
                                    opacity: 0.7,
                                }}
                                aria-label="Remove"
                            >
                                ✕
                            </button>
                        </span>
                    ))
                )}

                <div style={{ marginLeft: "auto", opacity: 0.6, fontSize: 12 }}>
                    {open ? "▲" : "▼"}
                </div>

                {open && !disabled && (
                    <div
                        style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            left: 0,
                            right: 0,
                            background: "#fff",
                            border: "1px solid #ddd",
                            borderRadius: 10,
                            boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
                            zIndex: 50,
                            maxHeight: 260,
                            overflowY: "auto",
                            padding: 6,
                        }}
                    >
                        {options.map((opt) => {
                            const isSelected = selectedSet.has(opt.value);
                            const blocked = !!maxSelected && !isSelected && value.length >= maxSelected;

                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => toggle(opt.value)}
                                    disabled={blocked}
                                    style={{
                                        width: "100%",
                                        textAlign: "left",
                                        border: "none",
                                        background: isSelected ? "rgba(0,0,0,0.06)" : "transparent",
                                        padding: "10px 10px",
                                        borderRadius: 8,
                                        cursor: blocked ? "not-allowed" : "pointer",
                                        opacity: blocked ? 0.5 : 1,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        fontSize: 13,
                                    }}
                                >
                                    <span>{opt.label}</span>
                                    <span style={{ opacity: 0.7 }}>{isSelected ? "✓" : ""}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {!!maxSelected && (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                    Selecciona hasta {maxSelected}.
                </div>
            )}
        </div>
    );
}