export function colorsFromMap(
    labels: string[],
    colorMap: Record<string, string>,
    fallback = "#BDBDBD"
) {
    return labels.map((l) => colorMap[l] ?? fallback);
}
