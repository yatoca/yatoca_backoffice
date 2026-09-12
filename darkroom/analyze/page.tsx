import React, { Suspense } from "react";
import DarkRoomAnalysisClient from "./DarkRoomAnalysisClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="dash-loading" style={{ marginTop: 16 }}>Cargando análisis...</div>}>
      <DarkRoomAnalysisClient />
    </Suspense>
  );
}