export function getUserIdFromRequest(req: Request): number | null {
    const raw =
        req.headers.get("x-user-id") ||
        req.headers.get("x-userid") ||
        req.headers.get("X-User-Id");

    if (!raw) return null;

    const userId = Number(raw);
    return Number.isFinite(userId) ? userId : null;
}

export function requireUserIdFromRequest(req: Request): number {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        throw new Error("UNAUTHORIZED");
    }
    return userId;
}