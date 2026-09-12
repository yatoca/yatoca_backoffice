import React, { Suspense } from "react";
import "./styles.css";
import RadioComparisonClient from "./RadioComparisonClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="dash-loading" style={{ marginTop: 16 }}>
          Cargando comparación...
        </div>
      }
    >
      <RadioComparisonClient />
    </Suspense>
  );
}