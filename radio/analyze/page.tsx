import React, { Suspense } from "react";
import RedioAnalyzeClient from "./RedioAnalysisClient"

export default function Page() {
  return (
    <Suspense fallback={<div className="dash-loading" style={{ marginTop: 16 }}>Cargando análisis...</div>}>
      <RedioAnalyzeClient />
    </Suspense>
  );
}
