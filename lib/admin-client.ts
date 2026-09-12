export function getAdminUserId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("admin_user_id");
}

export function getAdminUsername(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("admin_user");
}

export function isAdminLoggedIn(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("admin_logged") === "true";
}

export function clearAdminSession() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("admin_logged");
    localStorage.removeItem("admin_user");
    localStorage.removeItem("admin_user_id");
}

export function buildAdminHeaders(extra?: HeadersInit): HeadersInit {
    const userId = getAdminUserId();
    const username = getAdminUsername();

    const normalizedExtra =
        extra instanceof Headers
            ? Object.fromEntries(extra.entries())
            : Array.isArray(extra)
                ? Object.fromEntries(extra)
                : (extra ?? {});

    return {
        ...normalizedExtra,
        ...(userId ? { "x-user-id": userId } : {}),
        ...(username ? { "x-admin-username": username } : {}),
    };
}

export async function adminFetch(input: RequestInfo | URL, init?: RequestInit) {
    const headers = buildAdminHeaders(init?.headers);

    return fetch(input, {
        ...init,
        headers,
    });
}