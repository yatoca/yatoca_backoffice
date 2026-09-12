// Basic Spanish stopwords + fillers you said you’re seeing
const ES_STOPWORDS = new Set([
    'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'aquel', 'aquella', 'aquellas', 'aquellos', 'aqui', 'asi', 'aunque',
    'cada', 'como', 'con', 'contra', 'cual', 'cuales', 'cualquier', 'cuanto', 'de', 'del', 'desde', 'donde', 'dos', 'el', 'ella', 'ellas', 'ellos',
    'en', 'entre', 'era', 'eramos', 'eran', 'eres', 'es', 'esa', 'esas', 'ese', 'eso', 'esos', 'esta', 'estaba', 'estaban', 'estado', 'estamos',
    'estar', 'este', 'esto', 'estos', 'etc', 'fuera', 'fue', 'fueron', 'ha', 'hace', 'hacen', 'hacer', 'hacia', 'han', 'hasta', 'hay',
    'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me', 'mi', 'mis', 'mucho', 'muy', 'nada', 'ni', 'no', 'nos', 'nosotros', 'nuestra', 'nuestro',
    'nuestras', 'nuestros', 'o', 'otra', 'otros', 'para', 'pero', 'poco', 'por', 'porque', 'que', 'quien', 'quienes', 'se', 'segun', 'ser', 'si',
    'sin', 'sobre', 'sus', 'su', 'tal', 'tambien', 'tanto', 'te', 'ti', 'tiene', 'tienen', 'todo', 'todos', 'tras', 'tu', 'tus', 'un', 'una',
    'uno', 'unos', 'ya',
    // your “junk” examples:
    'peor', 'mejor', 'nuestro', 'nuestra', 'nuestros', 'nuestras'
]);

// Remove accents (NFD) and punctuation, collapse spaces; keep internal spaces for phrases
function normalizeForCompare(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')         // strip diacritics
        .replace(/[^\p{L}\p{N}\s/.-]/gu, ' ')    // keep letters/numbers/spaces/slash/dot/hyphen
        .replace(/\s+/g, ' ')
        .trim();
}

// Very light singularizer for Spanish nouns (heuristic, not full lemmatizer)
function singularizeEs(token: string): string {
    // ejemplos: derechos -> derecho, leyes -> ley, papeles -> papel, jóvenes -> joven
    if (token.endsWith('es')) {
        const stem = token.slice(0, -2);
        // papel(es) -> papel, joven(es) -> joven
        return stem;
    }
    if (token.endsWith('s') && token.length > 3) {
        return token.slice(0, -1);
    }
    return token;
}

// Heuristic: phrases ≤ 3 words; discard if any token is stopword-only phrase
function isValidPhrase(phrase: string): boolean {
    const parts = normalizeForCompare(phrase).split(' ').filter(Boolean);
    if (parts.length === 0 || parts.length > 3) return false;
    // drop 1-word stopwords; for multiword, allow if at least one content token remains
    if (parts.length === 1) return !ES_STOPWORDS.has(parts[0]);
    const contentCount = parts.filter(p => !ES_STOPWORDS.has(p)).length;
    return contentCount > 0;
}

// Canonical form used for dedup: normalize + per-word singularization
function canonicalize(phrase: string): string {
    const norm = normalizeForCompare(phrase);
    return norm.split(' ').map(singularizeEs).join(' ');
}

// --- Tiny Jaro–Winkler (fast, no deps) ---
function jaroWinkler(a: string, b: string): number {
    // Adapted small implementation
    if (a === b) return 1;
    const m = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
    let matches = 0, transpositions = 0;
    const aMatches = new Array(a.length).fill(false);
    const bMatches = new Array(b.length).fill(false);

    for (let i = 0; i < a.length; i++) {
        const start = Math.max(0, i - m);
        const end = Math.min(i + m + 1, b.length);
        for (let j = start; j < end; j++) {
            if (bMatches[j]) continue;
            if (a[i] === b[j]) { aMatches[i] = true; bMatches[j] = true; matches++; break; }
        }
    }
    if (matches === 0) return 0;

    let k = 0;
    for (let i = 0; i < a.length; i++) {
        if (!aMatches[i]) continue;
        while (!bMatches[k]) k++;
        if (a[i] !== b[k]) transpositions++;
        k++;
    }
    transpositions /= 2;

    const jaro =
        (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;

    // common prefix up to 4 chars
    let prefix = 0;
    for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
        if (a[i] === b[i]) prefix++; else break;
    }
    return jaro + prefix * 0.1 * (1 - jaro);
}

// Merge near-duplicates using JW on canonical forms
function dedupeNearDuplicates(phrases: string[], threshold = 0.92): string[] {
    const kept: string[] = [];
    const keptCanon: string[] = [];
    for (const p of phrases) {
        const c = canonicalize(p);
        let isDup = false;
        for (let i = 0; i < keptCanon.length; i++) {
            const score = jaroWinkler(c, keptCanon[i]);
            if (score >= threshold) { isDup = true; break; }
        }
        if (!isDup) { kept.push(p); keptCanon.push(c); }
    }
    return kept;
}

// Full post-processing pipeline
export function postProcessSpanishKeywords(raw: string[]): string[] {
    // 1) trim, lowercase visually, keep original accents for display but we will canonicalize for merge
    let cleaned = raw
        .map(s => s?.toString().trim().toLowerCase())
        .filter(Boolean)
        // 2) remove punctuation at ends, collapse inner spaces
        .map(s => s.replace(/[“”"']/g, '').replace(/\s+/g, ' ').trim())
        // 3) keep valid phrases only
        .filter(isValidPhrase);

    // 4) Remove exact duplicates by canonical form (accents & plural variants)
    const seen = new Set<string>();
    cleaned = cleaned.filter(s => {
        const key = canonicalize(s);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    // 5) Jaro–Winkler near-duplicate merge (rendición vs rendicion vs rendir cuentas)
    cleaned = dedupeNearDuplicates(cleaned, 0.92);

    // 6) Prefer noun-y look: de-prioritize single stopword fragments if any slipped through
    cleaned = cleaned.filter(k => {
        const parts = normalizeForCompare(k).split(' ').filter(Boolean);
        if (parts.length === 1) return !ES_STOPWORDS.has(parts[0]);
        return true;
    });

    // 7) Cap to 12; ensure at least 5 where possible
    if (cleaned.length > 12) cleaned = cleaned.slice(0, 12);

    return cleaned;
}

export function normForLike(s: string) {
    return s.trim().toLowerCase();
}