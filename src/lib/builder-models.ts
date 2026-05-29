export type ModelProvider = "mistral" | "gemini";

export interface BuilderModel {
  id: string;
  provider: ModelProvider;
  label: string;
  badge: "Code" | "Pro" | "Fast" | "Balanced";
  description: string;
  recommended: string[];
  /** USD per 1M tokens */
  inputPrice: number;
  outputPrice: number;
}

export const MODELS: BuilderModel[] = [
  {
    id: "codestral-latest",
    provider: "mistral",
    label: "Codestral",
    badge: "Code",
    description: "Mistral kód-špecializovaný model. Najlepší na komponenty a apps.",
    recommended: ["component", "app"],
    inputPrice: 0.3,
    outputPrice: 0.9,
  },
  {
    id: "mistral-large-latest",
    provider: "mistral",
    label: "Mistral Large",
    badge: "Pro",
    description: "Najsilnejší general-purpose Mistral model.",
    recommended: ["landing"],
    inputPrice: 2.0,
    outputPrice: 6.0,
  },
  {
    id: "mistral-small-latest",
    provider: "mistral",
    label: "Mistral Small",
    badge: "Fast",
    description: "Rýchly a lacný Mistral model.",
    recommended: [],
    inputPrice: 0.2,
    outputPrice: 0.6,
  },
  {
    id: "google/gemini-2.5-flash",
    provider: "gemini",
    label: "Gemini 2.5 Flash",
    badge: "Balanced",
    description: "Default cez Lovable AI Gateway. Vyvážený pomer rýchlosť/kvalita.",
    recommended: ["component", "landing"],
    inputPrice: 0.3,
    outputPrice: 2.5,
  },
  {
    id: "google/gemini-2.5-pro",
    provider: "gemini",
    label: "Gemini 2.5 Pro",
    badge: "Pro",
    description: "Top model pre komplexné UI a dlhý kontext.",
    recommended: ["app", "landing"],
    inputPrice: 1.25,
    outputPrice: 10.0,
  },
  {
    id: "google/gemini-2.5-flash-lite",
    provider: "gemini",
    label: "Gemini 2.5 Flash Lite",
    badge: "Fast",
    description: "Najrýchlejší/najlacnejší Gemini.",
    recommended: [],
    inputPrice: 0.1,
    outputPrice: 0.4,
  },
];

export const DEFAULT_MODEL_ID = "google/gemini-2.5-flash";
export const FALLBACK_MODEL_ID = "google/gemini-2.5-flash";

export const getModel = (id: string): BuilderModel | undefined =>
  MODELS.find((m) => m.id === id);
