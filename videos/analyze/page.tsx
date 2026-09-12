import React, { Suspense } from "react";
import VideosAnalyzeClient from "./VideosAnalyzeClient";

export default function Page() {
    return (
        <Suspense fallback={<div className="dash-loading" style={{ marginTop: 16 }}>Cargando análisis...</div>}>
            <VideosAnalyzeClient />
        </Suspense>
    );
}