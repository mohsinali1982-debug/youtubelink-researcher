import { BookOpen, ExternalLink, Lightbulb, ListChecks, ScrollText, ShieldCheck } from "lucide-react"
import { VerdictBadge } from "@/components/verdict-badge"
import type { Brief, Source } from "@/lib/types"

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: typeof BookOpen
  children: React.ReactNode
}) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
      <Icon className="size-4 text-brand" aria-hidden="true" />
      {children}
    </h3>
  )
}

function SourceLink({ source }: { source: Source }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground transition hover:bg-accent"
    >
      <span className="truncate">{source.title || hostname(source.url)}</span>
      <span className="text-muted-foreground">· {hostname(source.url)}</span>
      <ExternalLink className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
    </a>
  )
}

export function BriefView({ brief }: { brief: Brief }) {
  return (
    <div className="space-y-10">
      {/* TL;DR */}
      <section className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
        <SectionHeading icon={ScrollText}>TL;DR</SectionHeading>
        <p className="mt-3 text-pretty font-serif text-lg leading-relaxed">{brief.tldr}</p>
        {brief.topics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {brief.topics.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Summary */}
      <section className="space-y-3">
        <SectionHeading icon={BookOpen}>What the video covers</SectionHeading>
        <div className="prose-brief space-y-3 text-foreground/90">
          {brief.summary.split(/\n{2,}/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </section>

      {/* Key takeaways */}
      {brief.keyTakeaways.length > 0 && (
        <section className="space-y-3">
          <SectionHeading icon={ListChecks}>Key takeaways</SectionHeading>
          <ul className="space-y-2">
            {brief.keyTakeaways.map((t, i) => (
              <li key={i} className="flex gap-3 rounded-lg border bg-card p-3 text-sm leading-relaxed">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                  {i + 1}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Concepts */}
      {brief.concepts.length > 0 && (
        <section className="space-y-3">
          <SectionHeading icon={Lightbulb}>Key concepts</SectionHeading>
          <dl className="grid gap-3 sm:grid-cols-2">
            {brief.concepts.map((c) => (
              <div key={c.term} className="rounded-lg border bg-card p-4">
                <dt className="font-serif text-base font-semibold">{c.term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.explanation}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Claims / fact-check */}
      {brief.claims.length > 0 && (
        <section className="space-y-3">
          <SectionHeading icon={ShieldCheck}>Claims, checked against sources</SectionHeading>
          <div className="space-y-3">
            {brief.claims.map((claim, i) => (
              <div key={i} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-serif text-base font-medium leading-snug">
                    &ldquo;{claim.claim}&rdquo;
                  </p>
                  <VerdictBadge verdict={claim.verdict} className="shrink-0" />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{claim.assessment}</p>
                {claim.sources.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {claim.sources.map((s) => (
                      <SourceLink key={s.url} source={s} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Further reading */}
      {brief.furtherReading.length > 0 && (
        <section className="space-y-3">
          <SectionHeading icon={ExternalLink}>Further reading</SectionHeading>
          <ul className="space-y-2">
            {brief.furtherReading.map((s) => (
              <li key={s.url} className="rounded-lg border bg-card p-3">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 font-medium hover:text-brand hover:underline"
                >
                  {s.title || hostname(s.url)}
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </a>
                <p className="text-xs text-muted-foreground">{hostname(s.url)}</p>
                {s.note && <p className="mt-1 text-sm text-muted-foreground">{s.note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
