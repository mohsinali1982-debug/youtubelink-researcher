"use client"

import { useCallback, useRef, useState } from "react"
import { CircleAlert, Sparkles } from "lucide-react"
import { UrlForm } from "@/components/url-form"
import { ProgressTimeline } from "@/components/progress-timeline"
import { VideoCard } from "@/components/video-card"
import { BriefView } from "@/components/brief-view"
import type { AnalyzeEvent, Brief, Stage, VideoMeta } from "@/lib/types"

export default function Page() {
  const [url, setUrl] = useState("")
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState<Stage>("fetch")
  const [statusMsg, setStatusMsg] = useState("")
  const [video, setVideo] = useState<VideoMeta | null>(null)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setRunning(true)
    setError(null)
    setBrief(null)
    setVideo(null)
    setStage("fetch")
    setStatusMsg("Fetching video and transcript…")

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      })
      if (!res.body) throw new Error("No response stream")

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""
        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line) as AnalyzeEvent
          handleEvent(event)
        }
      }
      if (buffer.trim()) handleEvent(JSON.parse(buffer) as AnalyzeEvent)
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("The connection was interrupted. Please try again.")
      }
    } finally {
      setRunning(false)
    }

    function handleEvent(event: AnalyzeEvent) {
      switch (event.type) {
        case "status":
          setStage(event.stage)
          setStatusMsg(event.message)
          break
        case "metadata":
          setVideo(event.video)
          break
        case "brief":
          setBrief(event.brief)
          break
        case "error":
          setError(event.message)
          break
      }
    }
  }, [url])

  const showWorkspace = running || video || brief || error

  return (
    <main className="mx-auto min-h-svh w-full max-w-3xl px-4 py-10 sm:py-16">
      <header className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
          <Sparkles className="size-3.5" aria-hidden="true" />
          AI knowledge brief
        </span>
        <h1 className="mt-4 text-balance font-serif text-4xl font-semibold leading-tight sm:text-5xl">
          Understand any YouTube video — verified
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
          Paste a link and get a clear summary, the key concepts, and its main claims checked against
          independent sources — plus where to learn more.
        </p>
      </header>

      <div className="mt-8">
        <UrlForm value={url} onChange={setUrl} onSubmit={run} disabled={running} />
      </div>

      {showWorkspace && (
        <div className="mt-10 space-y-8">
          {(running || (brief && stage !== "done")) && (
            <div className="space-y-3">
              <ProgressTimeline current={stage} />
              {running && (
                <p aria-live="polite" className="text-center text-sm text-muted-foreground">
                  {statusMsg}
                </p>
              )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger"
            >
              <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          )}

          {video && (
            <div className="rounded-2xl border bg-card p-5">
              <VideoCard video={video} />
            </div>
          )}

          {brief && <BriefView brief={brief} />}
        </div>
      )}

      <footer className="mt-16 border-t pt-6 text-center text-xs text-muted-foreground">
        Brief analyzes transcripts and researches sources with AI. Always verify important claims
        against the cited sources yourself.
      </footer>
    </main>
  )
}
