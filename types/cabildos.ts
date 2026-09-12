// cabildos.types.ts (or inside page file)
export type CabildosFiltersState = {
    cabildoId: string;
    region: string;
    age: string;
    gender: string;
    nivelinstruccion: string;
    grupoetnico: string;
    stationId: string;
};

export const CABILDOS_DEFAULT_FILTERS: CabildosFiltersState = {
    cabildoId: "",
    region: "",
    age: "",
    gender: "",
    nivelinstruccion: "",
    grupoetnico: "",
    stationId: "",
};
