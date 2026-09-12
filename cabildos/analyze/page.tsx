import React, { Suspense } from "react";
import CabildosAnalyzeClient from "./CabildosAnalysisClient"

export default function Page() {
  return (
    <Suspense fallback={<div className="dash-loading" style={{ marginTop: 16 }}>Cargando análisis...</div>}>
      <CabildosAnalyzeClient />
    </Suspense>
  );
}
