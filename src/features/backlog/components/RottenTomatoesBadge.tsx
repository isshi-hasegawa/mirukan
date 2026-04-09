import { cn } from "../../../lib/utils.ts";

type RottenTomatoesBadgeVariant = "fresh" | "rotten";

type Props = {
  score: number;
  variant: RottenTomatoesBadgeVariant;
  className?: string;
};

function FreshIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <circle cx="12" cy="13" r="7" fill="#ef4444" />
      <path
        d="M9.5 6.5c1-.73 2.2-1.1 3.74-1.1 1.12 0 2.2.24 3.26.73-.74 1.18-1.97 1.85-3.65 1.94-.68-.69-1.8-1.23-3.35-1.57z"
        fill="#15803d"
      />
      <path
        d="M12.16 5.42c.5-1 1.28-1.76 2.32-2.22-.05 1.2-.5 2.26-1.3 3.03-.32-.3-.65-.57-1.02-.81z"
        fill="#16a34a"
      />
      <circle cx="9.6" cy="11.4" r="1.4" fill="#fff" opacity="0.16" />
    </svg>
  );
}

function RottenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true">
      <path
        d="M12.07 5.1c1.05-1.2 2.55-1.77 4.22-1.61-.44 1.48-1.32 2.55-2.57 3.1a6.85 6.85 0 00-1.65-1.5z"
        fill="#14532d"
      />
      <path
        d="M18.32 14.76c1.22 1.14 1.45 2.82.53 3.94-.76.93-2.16 1.22-3.34.7-.42 1.18-1.5 1.97-2.78 1.97-1.03 0-1.97-.5-2.56-1.32-.58.86-1.56 1.38-2.62 1.38-1.55 0-2.83-1.1-3.1-2.56-1.43.03-2.7-.86-3.01-2.18-.38-1.59.69-3.16 2.42-3.6-.54-1.36-.18-2.96.98-3.92 1.23-1.03 3.03-1.01 4.28-.02.62-1.37 2-2.32 3.62-2.32 1.83 0 3.37 1.2 3.82 2.83 1.26-.11 2.5.3 3.29 1.1 1.15 1.16 1.13 3.01.05 4z"
        fill="#65a30d"
      />
      <circle cx="9" cy="12.4" r="1.15" fill="#365314" />
      <circle cx="15.3" cy="11.7" r="1.1" fill="#365314" />
      <path
        d="M8.72 16.92c1.82-1.02 3.8-1.06 5.95-.1"
        stroke="#365314"
        strokeWidth="1.3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function getVariantCopy(variant: RottenTomatoesBadgeVariant) {
  switch (variant) {
    case "fresh":
      return {
        label: "Fresh",
        className: "bg-[rgba(239,68,68,0.14)] text-[#f87171] border-[rgba(239,68,68,0.24)]",
        Icon: FreshIcon,
      };
    case "rotten":
      return {
        label: "Rotten",
        className: "bg-[rgba(132,204,22,0.14)] text-[#bef264] border-[rgba(132,204,22,0.24)]",
        Icon: RottenIcon,
      };
  }
}

export function RottenTomatoesBadge({ score, variant, className }: Props) {
  const { label, className: variantClassName, Icon } = getVariantCopy(variant);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium",
        variantClassName,
        className,
      )}
      title="Rotten Tomatoes"
      aria-label={`Rotten Tomatoes ${label} ${score}%`}
    >
      <Icon />
      <span>{score}%</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
