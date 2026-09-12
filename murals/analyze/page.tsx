import React, { Suspense } from "react";
import MuralsAnalyzeClient from "./MuralsAnalyzeClient";

export default function Page() {
    return (
        <Suspense fallback={<div className="dash-loading" style={{ marginTop: 16 }}>Cargando análisis...</div>}>
            <MuralsAnalyzeClient />
        </Suspense>
    );
}