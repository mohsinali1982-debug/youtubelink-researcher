import { YoutubeTranscript } from "youtube-transcript"

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"

export function parseVideoId(input: string): string | null {
  const raw = input.trim()
  // Bare 11-char id
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, "")
    if (host === "youtu.be") {
      const id = url.pathname.slice(1)
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v")
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v
      const parts = url.pathname.split("/").filter(Boolean)
      // /embed/ID, /shorts/ID, /live/ID, /v/ID
      const idx = parts.findIndex((p) => ["embed", "shorts", "live", "v"].includes(p))
      if (idx !== -1 && parts[idx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])) {
        return parts[idx + 1]
      }
    }
  } catch {
    // not a URL
  }
  return null
}

export interface OEmbed {
  title: string
  author_name: string
  author_url: string
  thumbnail_url: string
}

export async function fetchMetadata(id: string): Promise<{
  title: string
  author: string
  authorUrl?: string
  thumbnail: string
}> {
  const fallbackThumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${id}`,
      )}&format=json`,
      { headers: { "user-agent": UA } },
    )
    if (res.ok) {
      const data = (await res.json()) as OEmbed
      return {
        title: data.title,
        author: data.author_name,
        authorUrl: data.author_url,
        thumbnail: data.thumbnail_url ?? fallbackThumb,
      }
    }
  } catch {
    // ignore, use fallback below
  }
  return { title: "YouTube video", author: "Unknown channel", thumbnail: fallbackThumb }
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

interface TranscriptResult {
  text: string
  language?: string
}

/** Primary path: YouTube Innertube player API -> caption track -> json3 events. */
async function fetchTranscriptInnertube(id: string): Promise<TranscriptResult | null> {
  const res = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": UA },
    body: JSON.stringify({
      videoId: id,
      context: {
        client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "en" },
      },
    }),
  })
  if (!res.ok) return null
  const data: any = await res.json()
  const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks as
    | Array<{ baseUrl: string; languageCode: string; kind?: string }>
    | undefined
  if (!tracks?.length) return null

  // Prefer a manual English track, then any English, then any track.
  const pick =
    tracks.find((t) => t.languageCode?.startsWith("en") && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode?.startsWith("en")) ??
    tracks[0]

  const capUrl = `${pick.baseUrl}${pick.baseUrl.includes("fmt=") ? "" : "&fmt=json3"}`
  const capRes = await fetch(capUrl, { headers: { "user-agent": UA } })
  if (!capRes.ok) return null
  const capData: any = await capRes.json()
  const events = capData?.events as Array<{ segs?: Array<{ utf8?: string }> }> | undefined
  if (!events?.length) return null
  const text = events
    .flatMap((e) => e.segs?.map((s) => s.utf8 ?? "") ?? [])
    .join("")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return text.length > 0 ? { text, language: pick.languageCode } : null
}

/** Fallback path: youtube-transcript package. */
async function fetchTranscriptPackage(id: string): Promise<TranscriptResult | null> {
  try {
    const items = await YoutubeTranscript.fetchTranscript(id)
    const text = items
      .map((i) => i.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
    return text.length > 0 ? { text } : null
  } catch {
    return null
  }
}

export async function fetchTranscript(id: string): Promise<TranscriptResult | null> {
  try {
    const primary = await fetchTranscriptInnertube(id)
    if (primary) return primary
  } catch {
    // fall through
  }
  return fetchTranscriptPackage(id)
}
