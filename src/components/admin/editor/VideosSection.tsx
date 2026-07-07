import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/admin/editor-parts";
import { ReorderList, ReorderToggle } from "@/components/admin/reorder";
import { extractYouTubeId } from "@/lib/pages";
import type { Video } from "@/types/page";
import { MoveRemove, moveItem } from "@/components/admin/editor/shared";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

/* ---------- Video row ---------- */
function VideoRow({
  video,
  onChange,
  onUp,
  onDown,
  onRemove,
}: {
  video: Video;
  onChange: (v: Video) => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
}) {
  const [raw, setRaw] = useState(video.youtube_id);
  const id = useMemo(() => extractYouTubeId(raw), [raw]);

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-2">
          <Field label="Title (optional)">
            <Input
              value={video.title ?? ""}
              onChange={(e) => onChange({ ...video, title: e.target.value })}
            />
          </Field>
          <Field label="YouTube URL">
            <Input
              value={raw}
              placeholder="https://youtu.be/… or watch?v=…"
              onChange={(e) => {
                setRaw(e.target.value);
                onChange({ ...video, youtube_id: extractYouTubeId(e.target.value) ?? "" });
              }}
            />
          </Field>
          {raw && !id && (
            <p className="text-xs text-destructive">Could not detect a valid YouTube id.</p>
          )}
        </div>
        <MoveRemove onUp={onUp} onDown={onDown} onRemove={onRemove} />
      </div>
      {id && (
        <img
          src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
          alt="YouTube thumbnail"
          className="mt-2 h-24 rounded object-cover"
        />
      )}
    </div>
  );
}

export function VideosSection({ s, id = "videos" }: { s: PageEditorState; id?: string }) {
  const { getData, setData, videosReorder, setVideosReorder } = s;
  const videos = (getData(id) as Video[] | undefined) ?? [];
  const set = (next: Video[]) => setData(id, next);
  return (
    <div className="space-y-3">
      {videosReorder ? (
        <ReorderList
          items={videos}
          onReorder={(next) => set(next)}
          getLabel={(v, i) => v.title || v.youtube_id || `Video ${i + 1}`}
        />
      ) : (
        videos.map((v, i) => (
          <VideoRow
            key={i}
            video={v}
            onChange={(video) => {
              const next = videos.slice();
              next[i] = video;
              set(next);
            }}
            onUp={() => set(moveItem(videos, i, -1))}
            onDown={() => set(moveItem(videos, i, 1))}
            onRemove={() => set(videos.filter((_, idx) => idx !== i))}
          />
        ))
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => set([...videos, { youtube_id: "" } as Video])}
        >
          <Plus className="h-4 w-4" /> Add video
        </Button>
        {videos.length > 1 && (
          <ReorderToggle active={videosReorder} onToggle={() => setVideosReorder((v) => !v)} />
        )}
      </div>
    </div>
  );
}

