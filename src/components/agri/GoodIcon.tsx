import { cn } from "@/lib/utils";

const TONES = [
  "bg-primary/15 text-primary",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
  "bg-danger/15 text-danger",
  "bg-muted-foreground/15 text-muted-foreground",
];

function toneFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 9973;
  return TONES[hash % TONES.length]!;
}

export function GoodIcon({
  name,
  className,
  size = "md",
}: {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        size === "sm" ? "size-8 text-[11px]" : size === "lg" ? "size-14 text-base" : "size-11 text-xs",
        toneFor(name),
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}
