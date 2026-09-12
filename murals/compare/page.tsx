// app/murals/compare/page.tsx
import React, { Suspense } from "react";
import MuralsComparisonClient from "./MuralsComparisonClient";

export default function Page() {
    return (
        <Suspense fallback={<div className="dash-loading" style={{ marginTop: 16 }}>Cargando comparación...</div>}>
            <MuralsComparisonClient />
        </Suspense>
    );
}
