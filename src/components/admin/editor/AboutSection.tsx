import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/editor-parts";
import { IconPicker } from "@/components/admin/IconPicker";
import { ReorderList, ReorderToggle } from "@/components/admin/reorder";
import { hasItems, type Stat } from "@/types/page";
import { MoveRemove, moveItem } from "@/components/admin/editor/shared";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

export function AboutSection({ s }: { s: PageEditorState }) {
  const { content, patchAbout, aboutFeatReorder, setAboutFeatReorder } = s;
  return (
    <>
      <Field label="Heading">
        <Input
          value={content.about?.heading ?? ""}
          onChange={(e) => patchAbout({ heading: e.target.value })}
        />
      </Field>
      <Field label="Body">
        <Textarea
          rows={4}
          value={content.about?.body ?? ""}
          onChange={(e) => patchAbout({ body: e.target.value })}
        />
      </Field>
      <Field label="Features" hint="Icons auto-match the text; override per row.">
        <div className="space-y-2">
          {aboutFeatReorder ? (
            <ReorderList
              items={(content.about?.features ?? []).map((f, i) => ({
                f,
                icon: content.about?.feature_icons?.[i],
              }))}
              onReorder={(items) =>
                patchAbout({
                  features: items.map((x) => x.f),
                  feature_icons: items.map((x) => x.icon as string),
                })
              }
              getLabel={(x) => x.f || "Feature"}
            />
          ) : (
            (content.about?.features ?? []).map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <IconPicker
                  value={content.about?.feature_icons?.[i]}
                  onChange={(icon) => {
                    const icons = (content.about?.feature_icons ?? []).slice();
                    while (icons.length <= i) icons.push(undefined as unknown as string);
                    icons[i] = icon as string;
                    patchAbout({ feature_icons: icons });
                  }}
                />
                <Input
                  value={f}
                  onChange={(e) => {
                    const next = (content.about?.features ?? []).slice();
                    next[i] = e.target.value;
                    patchAbout({ features: next });
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    const icons = (content.about?.feature_icons ?? []).filter(
                      (_, idx) => idx !== i,
                    );
                    patchAbout({
                      features: (content.about?.features ?? []).filter((_, idx) => idx !== i),
                      feature_icons: icons,
                    });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => patchAbout({ features: [...(content.about?.features ?? []), ""] })}
            >
              <Plus className="h-4 w-4" /> Add feature
            </Button>
            {(content.about?.features?.length ?? 0) > 1 && (
              <ReorderToggle
                active={aboutFeatReorder}
                onToggle={() => setAboutFeatReorder((v) => !v)}
              />
            )}
          </div>
        </div>
      </Field>
    </>
  );
}

export function StatsBody({ s }: { s: PageEditorState }) {
  const { content, patch, statsReorder, setStatsReorder } = s;
  return (
    <>
      {statsReorder ? (
        <ReorderList
          items={content.stats ?? []}
          onReorder={(stats) => patch({ stats })}
          getLabel={(st) => st.value || st.label || "Stat"}
        />
      ) : (
        (content.stats ?? []).map((st, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Icon</span>
              <IconPicker
                value={st.icon}
                onChange={(icon) => {
                  const next = content.stats.slice();
                  next[i] = { ...next[i], icon };
                  patch({ stats: next });
                }}
              />
            </div>
            <div className="flex-1">
              <Field label="Value">
                <Input
                  value={st.value}
                  onChange={(e) => {
                    const next = content.stats.slice();
                    next[i] = { ...next[i], value: e.target.value };
                    patch({ stats: next });
                  }}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Label">
                <Input
                  value={st.label}
                  onChange={(e) => {
                    const next = content.stats.slice();
                    next[i] = { ...next[i], label: e.target.value };
                    patch({ stats: next });
                  }}
                />
              </Field>
            </div>
            <MoveRemove
              onUp={() => patch({ stats: moveItem(content.stats, i, -1) })}
              onDown={() => patch({ stats: moveItem(content.stats, i, 1) })}
              onRemove={() => patch({ stats: content.stats.filter((_, idx) => idx !== i) })}
            />
          </div>
        ))
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => patch({ stats: [...content.stats, { value: "", label: "" } as Stat] })}
        >
          <Plus className="h-4 w-4" /> Add stat
        </Button>
        {hasItems(content.stats) && content.stats.length > 1 && (
          <ReorderToggle active={statsReorder} onToggle={() => setStatsReorder((v) => !v)} />
        )}
      </div>
    </>
  );
}
