import type { InterestSuggestion } from "@/types";

interface InterestCardProps {
  suggestion: InterestSuggestion;
  selected: boolean;
  dimmed: boolean;
  onClick: () => void;
}

export function InterestCard({
  suggestion,
  selected,
  dimmed,
  onClick,
}: InterestCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : dimmed
          ? "border-border bg-background opacity-40"
          : "border-border bg-background hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{suggestion.emoji}</span>
        <div className="flex-1 space-y-1">
          <p className="font-semibold leading-tight">{suggestion.title}</p>
          <p className="text-sm text-muted-foreground">{suggestion.description}</p>
          <p className="text-xs text-muted-foreground">
            ok. {suggestion.estimated_minutes} min dziennie
          </p>
        </div>
        {selected && (
          <span className="mt-0.5 text-primary">✓</span>
        )}
      </div>
    </button>
  );
}
