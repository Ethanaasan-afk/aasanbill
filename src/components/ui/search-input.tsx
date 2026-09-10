import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-card border border-border bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-slate-dim transition-all duration-200 focus:border-vivid-teal focus:outline-none focus:shadow-lift"
      />
    </div>
  );
}
