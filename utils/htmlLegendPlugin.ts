import type { Chart } from "chart.js";

export function htmlLegendPlugin(containerID: string) {
    return {
        id: `htmlLegend_${containerID}`,
        afterUpdate(chart: Chart) {
            const container = document.getElementById(containerID);
            if (!container) return;

            container.innerHTML = "";

            const ul = document.createElement("ul");
            ul.style.listStyle = "none";
            ul.style.margin = "0";
            ul.style.padding = "0";
            ul.style.display = "grid";
            ul.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
            ul.style.gap = "10px 14px";

            const items = chart.options.plugins?.legend?.labels?.generateLabels?.(chart) ?? [];

            items.forEach((item) => {
                const li = document.createElement("li");
                li.style.display = "flex";
                li.style.alignItems = "center";
                li.style.gap = "10px";
                li.style.cursor = "pointer";
                li.style.userSelect = "none";

                li.onclick = () => {
                    chart.toggleDataVisibility(item.index ?? 0);
                    chart.update();
                };

                const box = document.createElement("span");
                box.style.width = "34px";
                box.style.height = "12px";
                box.style.borderRadius = "6px";
                box.style.background = String(item.fillStyle);

                const text = document.createElement("span");
                text.textContent = item.text;
                text.style.fontSize = "14px";
                text.style.color = "#444";
                text.style.opacity = item.hidden ? "0.45" : "1";
                text.style.overflow = "hidden";
                text.style.textOverflow = "ellipsis";
                text.style.whiteSpace = "nowrap";

                li.appendChild(box);
                li.appendChild(text);
                ul.appendChild(li);
            });

            container.appendChild(ul);
        },
    };
}
