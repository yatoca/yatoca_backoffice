import React, { Suspense } from "react";
import VideosCompareClient from "./VideosCompareClient";

export default function Page() {
    return (
        <Suspense fallback={<div className="dash-loading" style={{ marginTop: 16 }}>Cargando comparación...</div>}>
            <VideosCompareClient />
        </Suspense>
    );
}