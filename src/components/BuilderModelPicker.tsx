import { useState } from "react";
import { ChevronDown, Sparkles, Zap, Code as CodeIcon, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODELS, getModel, type BuilderModel } from "@/lib/builder-models";

interface Props {
  model: string;
  onChange: (id: string) => void;
  hasMistralKey: boolean;
  byokActive: boolean;
}

const BADGE_ICON: Record<BuilderModel["badge"], typeof Sparkles> = {
  Code: CodeIcon,
  Pro: Sparkles,
  Fast: Zap,
  Balanced: Gauge,
};

export default function BuilderModelPicker({ model, onChange, hasMistralKey, byokActive }: Props) {
  const [open, setOpen] = useState(false);
  const current = getModel(model);

  const mistral = MODELS.filter((m) => m.provider === "mistral");
  const gemini = MODELS.filter((m) => m.provider === "gemini");

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/40 transition-colors text-sm"
      >
        <span className="font-medium">{current?.label ?? model}</span>
        <span className="text-xs text-muted-foreground">{current?.badge}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover shadow-2xl z-50 overflow-hidden">
            <Section
              title="Mistral"
              warning={
                !hasMistralKey && !byokActive
                  ? "Vyžaduje MISTRAL_API_KEY alebo BYOK"
                  : byokActive
                  ? "Aktívny dočasný BYOK kľúč"
                  : undefined
              }
            >
              {mistral.map((m) => (
                <ModelRow
                  key={m.id}
                  m={m}
                  selected={m.id === model}
                  disabled={!hasMistralKey && !byokActive}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                />
              ))}
            </Section>
            <Section title="Gemini" subtitle="Cez Lovable AI Gateway — ready">
              {gemini.map((m) => (
                <ModelRow
                  key={m.id}
                  m={m}
                  selected={m.id === model}
                  onClick={() => {
                    onChange(m.id);
                    setOpen(false);
                  }}
                />
              ))}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  warning,
  children,
}: {
  title: string;
  subtitle?: string;
  warning?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <div className="px-3 pb-1 flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
      </div>
      {warning && (
        <div className="mx-2 mb-1 px-2 py-1 rounded text-[11px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
          {warning}
        </div>
      )}
      {children}
    </div>
  );
}

function ModelRow({
  m,
  selected,
  disabled,
  onClick,
}: {
  m: BuilderModel;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const Icon = BADGE_ICON[m.badge];
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full px-3 py-2 flex items-start gap-3 text-left transition-colors",
        selected ? "bg-primary/10" : "hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Icon className="w-4 h-4 mt-0.5 text-primary" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{m.label}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {m.badge}
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">{m.description}</div>
        <div className="text-[10px] text-muted-foreground/70 mt-0.5">
          ${m.inputPrice.toFixed(2)} / ${m.outputPrice.toFixed(2)} per 1M
        </div>
      </div>
    </button>
  );
}
