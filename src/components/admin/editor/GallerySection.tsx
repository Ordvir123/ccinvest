import { GalleryUpload } from "@/components/admin/MediaUpload";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

export function GallerySection({ s }: { s: PageEditorState }) {
  const { content, patch, slug, canUpload } = s;
  return (
    <GalleryUpload
      slug={slug}
      value={content.gallery ?? []}
      onChange={(gallery) => patch({ gallery })}
      disabled={!canUpload}
    />
  );
}

export function WideImagesSection({ s }: { s: PageEditorState }) {
  const { content, patch, slug, canUpload } = s;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        These images render edge-to-edge on the page (no cropping into cards).
      </p>
      <GalleryUpload
        slug={slug}
        value={content.wide_images ?? []}
        onChange={(wide_images) => patch({ wide_images })}
        disabled={!canUpload}
      />
    </div>
  );
}
