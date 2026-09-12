import { Topic } from "./predefined_themes";
import crypto from "crypto";

export const separate_number_commas = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const get_substring = (str: string, limit: number = 20, suffix: string = "..."): string => {
    if (str.length > limit) {
        return str.substring(0, limit) + suffix;
    }
    return str;
}
export const build_topic_text = (t: Topic): string => {
    // Keep stable order + minimal formatting for reproducibility
    const kw = t.keywords?.length ? `\nKeywords: ${t.keywords.join(", ")}` : "";
    const ex = t.seed_examples?.length
        ? `\nSeed examples:\n- ${t.seed_examples.join("\n- ")}`
        : "";

    return [
        `Topic: ${t.name}`,
        `Alias: ${t.alias}`,
        `Description: ${t.description}`,
        kw,
        ex,
    ]
        .filter(Boolean)
        .join("\n");
}
export const l2_normalize = (vec: number[]): { embedding: number[]; norm: number } => {
    const sumSq = vec.reduce((s, x) => s + x * x, 0);
    const norm = Math.sqrt(sumSq) || 1;
    return { embedding: vec.map((x) => x / norm), norm };
}
export const sha256 = (s: string): string => {
    return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

export const es_normalize = (s: string) =>
    s
        .trim()
        .toLowerCase()
        .normalize("NFD")                     // decompose accents
        .replace(/[\u0300-\u036f]/g, "")      // remove accents
        .replace(/\s+/g, " ")                 // collapse spaces
        .replace(/[^\w\s]/g, "");             // optional: remove punctuation

export function sentence_case(str: string) {
    if (!str) return str; // Return the original string if it's falsy (e.g., "", null, undefined)

    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
export function toPgVectorLiteral(vec: number[]) {
    // pgvector expects: [1,2,3]
    // ensure plain numbers (no quotes) and stable decimal formatting
    return `[${vec.map((n) => (Number.isFinite(n) ? n : 0)).join(",")}]`;
}
export function buildPercentRows(labels: string[], values: number[]) {
    const total = values.reduce((a, b) => a + b, 0) || 1;
    return labels.map((label, i) => {
        const v = values[i] ?? 0;
        const pct = (v / total) * 100;
        return { label, value: v, pct };
    });
}