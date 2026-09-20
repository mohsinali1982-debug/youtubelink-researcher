"use client"

import { ArrowRight, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"

const EXAMPLES = [
  { label: "How large language models work", url: "https://www.youtube.com/watch?v=wjZofJX0v4M" },
  { label: "The science of sleep", url: "https://www.youtube.com/watch?v=nm1TxQj9IsQ" },
]

export function UrlForm({
  value,
  onChange,
  onSubmit,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled?: boolean
}) {
  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!disabled) onSubmit()
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Link2
            className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="yt-url" className="sr-only">
            YouTube video URL
          </label>
          <input
            id="yt-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder="Paste a YouTube URL…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-12 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-base shadow-sm outline-none ring-ring/50 transition focus-visible:ring-[3px] disabled:opacity-60"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          disabled={disabled || value.trim().length === 0}
          className="h-12 gap-2 rounded-xl bg-brand px-6 text-brand-foreground hover:bg-brand/90"
        >
          Analyze
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        <span>Try:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.url}
            type="button"
            disabled={disabled}
            onClick={() => onChange(ex.url)}
            className="rounded-md underline decoration-dotted underline-offset-4 transition hover:text-foreground disabled:opacity-60"
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  )
}
