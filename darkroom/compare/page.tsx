// app/murals/compare/page.tsx
import React, { Suspense } from "react";
import DarkRoomComparisonClient from "./DarkRoomComparisonClient";

export default function Page() {
    return (
        <Suspense fallback={<div className="dash-loading" style={{ marginTop: 16 }}>Cargando comparación...</div>}>
            <DarkRoomComparisonClient />
        </Suspense>
    );
}
