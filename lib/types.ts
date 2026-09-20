export type Verdict = "supported" | "disputed" | "partly-true" | "unverified"

export interface VideoMeta {
  id: string
  url: string
  title: string
  author: string
  authorUrl?: string
  thumbnail: string
  hasTranscript: boolean
  transcriptChars: number
}

export interface Concept {
  term: string
  explanation: string
}

export interface Claim {
  claim: string
  verdict: Verdict
  assessment: string
  sources: Source[]
}

export interface Source {
  title: string
  url: string
  note?: string
}

export interface Brief {
  tldr: string
  summary: string
  topics: string[]
  keyTakeaways: string[]
  concepts: Concept[]
  claims: Claim[]
  furtherReading: Source[]
}

/** Streamed events emitted by /api/analyze (NDJSON, one JSON object per line). */
export type AnalyzeEvent =
  | { type: "status"; stage: Stage; message: string }
  | { type: "metadata"; video: VideoMeta }
  | { type: "brief"; brief: Brief }
  | { type: "error"; message: string }

export type Stage = "fetch" | "analyze" | "research" | "synthesize" | "done"
