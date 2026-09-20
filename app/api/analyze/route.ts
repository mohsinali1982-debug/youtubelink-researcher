import { generateObject, generateText } from "ai"
import { z } from "zod"
import { fetchMetadata, fetchTranscript, parseVideoId } from "@/lib/youtube"
import type { AnalyzeEvent, Brief, Source, VideoMeta } from "@/lib/types"

export const maxDuration = 300

// Gemini can ingest a YouTube URL directly (Google fetches it server-side),
// so analysis never depends on scraping captions from our own IP.
const ANALYSIS_MODEL = "google/gemini-2.5-flash"
const RESEARCH_MODEL = "perplexity/sonar-pro"
const SYNTH_MODEL = "openai/gpt-5-mini"

const MAX_TRANSCRIPT_CHARS = 42_000

const analysisSchema = z.object({
  tldr: z.string().describe("One or two sentence plain-language summary of what the video is about."),
  summary: z
    .string()
    .describe("A neutral 2-4 paragraph summary of the main information the video presents."),
  topics: z.array(z.string()).describe("3-8 core topics or subjects covered."),
  keyTakeaways: z.array(z.string()).describe("4-8 concrete things a learner should walk away knowing."),
  concepts: z
    .array(z.object({ term: z.string(), explanation: z.string() }))
    .describe("Key terms/concepts introduced, each explained in one or two sentences."),
  claims: z
    .array(z.string())
    .describe(
      "3-6 of the most important, specific, factual/checkable claims the video makes (statements that could be true or false), phrased standalone.",
    ),
})

const briefClaimSchema = z.object({
  claim: z.string(),
  verdict: z.enum(["supported", "disputed", "partly-true", "unverified"]),
  assessment: z
    .string()
    .describe("2-4 sentences explaining what independent sources say about this claim."),
  sources: z.array(z.object({ title: z.string(), url: z.string() })),
})

const synthesisSchema = z.object({
  claims: z.array(briefClaimSchema),
  furtherReading: z
    .array(z.object({ title: z.string(), url: z.string(), note: z.string() }))
    .describe("3-6 high-quality sources for someone who wants to learn more."),
})

export async function POST(req: Request) {
  const { url } = (await req.json().catch(() => ({}))) as { url?: string }
  const id = url ? parseVideoId(url) : null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (event: AnalyzeEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))

      try {
        if (!id) {
          send({ type: "error", message: "That doesn't look like a valid YouTube URL or video ID." })
          controller.close()
          return
        }

        send({ type: "status", stage: "fetch", message: "Fetching video…" })
        // Metadata is quick and reliable (oEmbed). Transcript scraping is
        // best-effort only — it's frequently blocked from datacenter IPs, so
        // we never depend on it: Gemini watches the video itself.
        const [meta, transcript] = await Promise.all([fetchMetadata(id), fetchTranscript(id)])

        const video: VideoMeta = {
          id,
          url: `https://www.youtube.com/watch?v=${id}`,
          title: meta.title,
          author: meta.author,
          authorUrl: meta.authorUrl,
          thumbnail: meta.thumbnail,
          hasTranscript: Boolean(transcript),
          transcriptChars: transcript?.text.length ?? 0,
        }
        send({ type: "metadata", video })

        const transcriptText = transcript
          ? transcript.text.length > MAX_TRANSCRIPT_CHARS
            ? transcript.text.slice(0, MAX_TRANSCRIPT_CHARS) + " …[transcript truncated]"
            : transcript.text
          : null

        // ---- Stage 1: analyze the video (Gemini watches it directly) ----
        send({ type: "status", stage: "analyze", message: "Watching the video and extracting key claims…" })
        const { object: analysis } = await generateObject({
          model: ANALYSIS_MODEL,
          schema: analysisSchema,
          system:
            "You are a careful analyst. Watch the provided YouTube video and extract the main information it presents. " +
            "Be neutral and precise. Only report information actually presented in the video. " +
            "For claims, select the most important checkable factual assertions, not opinions or filler.",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    `Analyze this video.\nTitle: ${video.title}\nChannel: ${video.author}` +
                    (transcriptText
                      ? `\n\nA partial transcript is provided as a supplement; rely primarily on the video itself:\n"""\n${transcriptText}\n"""`
                      : ""),
                },
                { type: "file", data: video.url, mediaType: "video/mp4" },
              ],
            },
          ],
        })

        // ---- Stage 2: research the claims/topics with a web-grounded model ----
        send({
          type: "status",
          stage: "research",
          message: "Researching claims across independent sources…",
        })
        const researchPrompt =
          `A video titled "${video.title}" makes the following claims and covers these topics. ` +
          `Research each using reliable, independent sources and report what the current evidence and expert consensus says. ` +
          `For every claim, state whether it is supported, disputed, partly true, or not verifiable, and why.\n\n` +
          `Claims:\n${analysis.claims.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\n` +
          `Topics:\n${analysis.topics.join(", ")}\n\n` +
          `Also suggest the best further-reading sources for a general learner.`

        const research = await generateText({
          model: RESEARCH_MODEL,
          prompt: researchPrompt,
        })

        const allowedSources: Source[] = dedupeSources(
          research.sources
            .filter((s): s is typeof s & { url: string } => "url" in s && Boolean(s.url))
            .map((s) => ({ title: (s as any).title || hostname((s as any).url), url: (s as any).url })),
        )

        // ---- Stage 3: synthesize verified claims + further reading ----
        send({ type: "status", stage: "synthesize", message: "Writing the knowledge brief…" })
        const { object: synthesis } = await generateObject({
          model: SYNTH_MODEL,
          schema: synthesisSchema,
          system:
            "You turn research notes into a fact-check and reading list. " +
            "You may ONLY cite sources from the provided allowed-sources list, matching their exact URLs. " +
            "If a claim has no supporting source in the list, mark it 'unverified' with an empty sources array. " +
            "Never invent URLs.",
          prompt:
            `Claims to verify:\n${analysis.claims.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\n` +
            `Research notes:\n"""\n${research.text}\n"""\n\n` +
            `Allowed sources (title — url):\n${
              allowedSources.length
                ? allowedSources.map((s) => `- ${s.title} — ${s.url}`).join("\n")
                : "(none returned)"
            }`,
        })

        const validUrls = new Set(allowedSources.map((s) => s.url))
        const filterSources = (sources: { title: string; url: string }[]) =>
          sources.filter((s) => validUrls.has(s.url))

        const brief: Brief = {
          tldr: analysis.tldr,
          summary: analysis.summary,
          topics: analysis.topics,
          keyTakeaways: analysis.keyTakeaways,
          concepts: analysis.concepts,
          claims: synthesis.claims.map((c) => ({
            claim: c.claim,
            verdict: c.verdict,
            assessment: c.assessment,
            sources: filterSources(c.sources),
          })),
          furtherReading: filterSources(synthesis.furtherReading.map((s) => ({ title: s.title, url: s.url })))
            .map((s) => {
              const match = synthesis.furtherReading.find((f) => f.url === s.url)
              return { ...s, note: match?.note }
            }),
        }

        send({ type: "brief", brief })
        send({ type: "status", stage: "done", message: "Done" })
        controller.close()
      } catch (err) {
        console.log("[v0] analyze error:", err instanceof Error ? err.message : String(err))
        send({
          type: "error",
          message:
            err instanceof Error
              ? `Something went wrong while analyzing: ${err.message}`
              : "Something went wrong while analyzing this video.",
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  })
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>()
  const out: Source[] = []
  for (const s of sources) {
    if (seen.has(s.url)) continue
    seen.add(s.url)
    out.push(s)
  }
  return out
}
