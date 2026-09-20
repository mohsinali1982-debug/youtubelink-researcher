import { CheckCircle2, CircleHelp, TriangleAlert, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Verdict } from "@/lib/types"

const CONFIG: Record<
  Verdict,
  { label: string; icon: typeof CheckCircle2; className: string; dot: string }
> = {
  supported: {
    label: "Supported",
    icon: CheckCircle2,
    className: "border-success/30 bg-success/10 text-success",
    dot: "bg-success",
  },
  "partly-true": {
    label: "Partly true",
    icon: TriangleAlert,
    className: "border-warning/30 bg-warning/10 text-warning",
    dot: "bg-warning",
  },
  disputed: {
    label: "Disputed",
    icon: XCircle,
    className: "border-danger/30 bg-danger/10 text-danger",
    dot: "bg-danger",
  },
  unverified: {
    label: "Unverified",
    icon: CircleHelp,
    className: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
}

export function VerdictBadge({ verdict, className }: { verdict: Verdict; className?: string }) {
  const c = CONFIG[verdict]
  const Icon = c.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        c.className,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {c.label}
    </span>
  )
}

export function verdictDot(verdict: Verdict) {
  return CONFIG[verdict].dot
}
