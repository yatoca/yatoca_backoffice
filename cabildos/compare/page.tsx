// app/cabildos/compare/page.tsx
import React, { Suspense } from "react";
import CabildosComparisonClient from "./CabildosComparisonClient";

export default function Page() {
    return (
        <Suspense fallback={<div className="dash-loading" style={{ marginTop: 16 }}>Cargando comparación...</div>}>
            <CabildosComparisonClient />
        </Suspense>
    );
}
