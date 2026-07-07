import { GalleryUpload } from "@/components/admin/MediaUpload";
import type { Media } from "@/types/page";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

export function GallerySection({ s, id = "gallery" }: { s: PageEditorState; id?: string }) {
  const { getData, setData, slug, canUpload } = s;
  const value = (getData(id) as Media[] | undefined) ?? [];
  return (
    <GalleryUpload
      slug={slug}
      value={value}
      onChange={(gallery) => setData(id, gallery)}
      disabled={!canUpload}
    />
  );
}

export function WideImagesSection({
  s,
  id = "wide_images",
}: {
  s: PageEditorState;
  id?: string;
}) {
  const { getData, setData, slug, canUpload } = s;
  const value = (getData(id) as Media[] | undefined) ?? [];
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        These images render edge-to-edge on the page (no cropping into cards).
      </p>
      <GalleryUpload
        slug={slug}
        value={value}
        onChange={(wide_images) => setData(id, wide_images)}
        disabled={!canUpload}
      />
    </div>
  );
}
