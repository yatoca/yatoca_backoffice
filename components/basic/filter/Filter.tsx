'use client';

import React from "react";

type Option = string | { label: string; value: string };

export default function Filter({
    label,
    value,
    onChange,
    options,
    disabled
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: Option[];
    disabled?: boolean;
}) {
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>

            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    height: 40,
                    minWidth: 180,
                    width: '100%',
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    padding: "0 10px",
                    background: disabled ? "#949494" : "#fff",
                    cursor: disabled ? "not-allowed" : "pointer",
                }}
                disabled={disabled}
            >
                {options.map((opt) => {
                    if (typeof opt === "string") {
                        return (
                            <option key={opt} value={opt}>
                                {opt === "" ? "Todos" : opt}
                            </option>
                        );
                    }
                    return (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    );
                })}
            </select>
        </label>
    );
}
