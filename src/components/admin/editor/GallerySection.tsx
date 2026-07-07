import { GalleryUpload } from "@/components/admin/MediaUpload";
import { LayoutPicker } from "@/components/admin/editor/LayoutPicker";
import type { Media } from "@/types/page";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

export function GallerySection({ s, id = "gallery" }: { s: PageEditorState; id?: string }) {
  const { getData, setData, slug, canUpload } = s;
  const value = (getData(id) as Media[] | undefined) ?? [];
  return (
    <div className="space-y-5">
      <LayoutPicker s={s} id={id} type="gallery" count={value.length} />
      <GalleryUpload
        slug={slug}
        value={value}
        onChange={(gallery) => setData(id, gallery)}
        disabled={!canUpload}
      />
    </div>
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
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground">
        These images render edge-to-edge on the page (no cropping into cards).
      </p>
      <LayoutPicker s={s} id={id} type="wide_images" count={value.length} />
      <GalleryUpload
        slug={slug}
        value={value}
        onChange={(wide_images) => setData(id, wide_images)}
        disabled={!canUpload}
      />
    </div>
  );
}
