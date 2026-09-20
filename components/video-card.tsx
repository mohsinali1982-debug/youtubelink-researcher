import { ExternalLink, FileText, Video } from "lucide-react"
import type { VideoMeta } from "@/lib/types"

export function VideoCard({ video }: { video: VideoMeta }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <a
        href={video.url}
        target="_blank"
        rel="noreferrer"
        className="group relative block w-full overflow-hidden rounded-xl border bg-muted sm:w-64 sm:shrink-0"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={video.thumbnail || "/placeholder.svg"}
          alt={`Thumbnail for ${video.title}`}
          className="aspect-video w-full object-cover transition group-hover:opacity-90"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/30">
          <ExternalLink className="size-6 text-white opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
        </span>
      </a>
      <div className="min-w-0">
        <h2 className="text-balance font-serif text-xl font-semibold leading-tight">{video.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {video.authorUrl ? (
            <a href={video.authorUrl} target="_blank" rel="noreferrer" className="hover:text-foreground hover:underline">
              {video.author}
            </a>
          ) : (
            video.author
          )}
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          {video.hasTranscript ? (
            <>
              <FileText className="size-3.5" aria-hidden="true" />
              Video + transcript analyzed
            </>
          ) : (
            <>
              <Video className="size-3.5" aria-hidden="true" />
              Video analyzed directly
            </>
          )}
        </p>
      </div>
    </div>
  )
}
