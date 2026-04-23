import Image from "next/image";
import type { Resources } from "@/types";

interface Props {
  resources: Resources | null;
}

function youtubeIdFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname.replace(/^www\./, "") === "youtube.com") {
      return u.searchParams.get("v");
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function ResourceCard({ resources }: Props) {
  if (!resources || (!resources.video && !resources.article)) return null;

  return (
    <div className="space-y-2">
      {resources.video && (() => {
        const video = resources.video!;
        const videoId = youtubeIdFromUrl(video.url);
        const thumbnail =
          video.thumbnail ?? (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null);
        return (
          <a
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex gap-3 rounded-lg border border-border p-2 hover:border-primary/50 transition-colors"
          >
            {thumbnail && (
              <Image
                src={thumbnail}
                alt=""
                width={112}
                height={64}
                className="rounded object-cover flex-shrink-0"
                unoptimized
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium line-clamp-2 group-hover:text-primary">
                {video.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                YouTube · {video.channel}
              </p>
            </div>
          </a>
        );
      })()}
      {resources.article && (
        <a
          href={resources.article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary/50 hover:text-primary transition-colors max-w-full"
        >
          <span className="truncate font-medium">{resources.article.title}</span>
          <span className="text-muted-foreground flex-shrink-0">· {resources.article.source}</span>
        </a>
      )}
    </div>
  );
}
