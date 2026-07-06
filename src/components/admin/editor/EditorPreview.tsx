import { useEffect, useRef, useState } from "react";
import { PageRenderer } from "@/components/page/PageRenderer";
import { isRtlReading, type PageContent, type ReadingLang } from "@/types/page";
import type { TemplateSettings } from "@/lib/template-settings";
import type { SectionKey } from "@/lib/page-sections";

/** Desktop base width the preview is authored at, then scaled to fit the pane. */
const BASE_WIDTH = 1280;

/**
 * Live, scaled preview of the public page reused inside the editor. The public
 * PageRenderer output is unchanged — this only turns on `preview` mode (section
 * overlays) and scales the desktop layout down to fit the pane.
 */
export function EditorPreview({
  content,
  lang,
  settings,
  onSelect,
}: {
  content: PageContent;
  lang: ReadingLang;
  settings?: TemplateSettings;
  onSelect?: (key: SectionKey) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.max(0.2, el.clientWidth / BASE_WIDTH));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const dir = isRtlReading(lang) ? "rtl" : "ltr";

  return (
    <div ref={ref} className="h-full w-full overflow-auto bg-muted">
      <div style={{ zoom: scale } as React.CSSProperties}>
        <div style={{ width: BASE_WIDTH }} dir={dir}>
          <PageRenderer
            content={content}
            lang={lang}
            settings={settings}
            preview
            onSectionSelect={onSelect}
          />
        </div>
      </div>
    </div>
  );
}
