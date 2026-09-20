import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Stage } from "@/lib/types"

const STEPS: { stage: Stage; label: string; hint: string }[] = [
  { stage: "fetch", label: "Fetch", hint: "Video + transcript" },
  { stage: "analyze", label: "Analyze", hint: "Claims & concepts" },
  { stage: "research", label: "Research", hint: "Independent sources" },
  { stage: "synthesize", label: "Synthesize", hint: "Fact-check & brief" },
]

const ORDER: Stage[] = ["fetch", "analyze", "research", "synthesize", "done"]

export function ProgressTimeline({ current }: { current: Stage }) {
  const currentIdx = ORDER.indexOf(current)
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STEPS.map((step) => {
        const idx = ORDER.indexOf(step.stage)
        const done = currentIdx > idx
        const active = currentIdx === idx
        return (
          <li
            key={step.stage}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3 transition",
              active && "border-brand/40 bg-brand/5",
              done && "border-success/30 bg-success/5",
              !active && !done && "border-border bg-card",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                active && "bg-brand text-brand-foreground",
                done && "bg-success text-white",
                !active && !done && "bg-muted text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="size-3.5" aria-hidden="true" />
              ) : active ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                idx + 1
              )}
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", !active && !done && "text-muted-foreground")}>
                {step.label}
              </p>
              <p className="truncate text-xs text-muted-foreground">{step.hint}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
