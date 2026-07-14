import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/admin/editor-parts";
import { IconPicker } from "@/components/admin/IconPicker";
import { ReorderList, ReorderToggle } from "@/components/admin/reorder";
import { hasItems, type AboutData, type Stat } from "@/types/page";
import { MoveRemove, moveItem } from "@/components/admin/editor/shared";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

export function AboutSection({ s, id = "about" }: { s: PageEditorState; id?: string }) {
  const { getData, setData, aboutFeatReorder, setAboutFeatReorder } = s;
  const about = (getData(id) as AboutData | undefined) ?? {};
  const patchAbout = (p: Partial<AboutData>) => setData(id, { ...about, ...p });
  return (
    <>
      <Field label="Heading">
        <Input
          value={about?.heading ?? ""}
          onChange={(e) => patchAbout({ heading: e.target.value })}
        />
      </Field>
      <Field label="Body">
        <Textarea
          rows={4}
          value={about?.body ?? ""}
          onChange={(e) => patchAbout({ body: e.target.value })}
        />
      </Field>
      <Field label="Features" hint="Icons auto-match the text; override per row.">
        <div className="space-y-2">
          {aboutFeatReorder ? (
            <ReorderList
              items={(about?.features ?? []).map((f, i) => ({
                f,
                icon: about?.feature_icons?.[i],
                color: about?.feature_colors?.[i],
              }))}
              onReorder={(items) =>
                patchAbout({
                  features: items.map((x) => x.f),
                  feature_icons: items.map((x) => x.icon as string),
                  feature_colors: items.map((x) => x.color as string),
                })
              }
              getLabel={(x) => x.f || "Feature"}
            />
          ) : (
            (about?.features ?? []).map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <IconPicker
                  value={about?.feature_icons?.[i]}
                  onChange={(icon) => {
                    const icons = (about?.feature_icons ?? []).slice();
                    while (icons.length <= i) icons.push(undefined as unknown as string);
                    icons[i] = icon as string;
                    patchAbout({ feature_icons: icons });
                  }}
                  color={about?.feature_colors?.[i]}
                  onColorChange={(color) => {
                    const colors = (about?.feature_colors ?? []).slice();
                    while (colors.length <= i) colors.push(undefined as unknown as string);
                    colors[i] = color as string;
                    patchAbout({ feature_colors: colors });
                  }}
                />
                <Input
                  value={f}
                  onChange={(e) => {
                    const next = (about?.features ?? []).slice();
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
                    const icons = (about?.feature_icons ?? []).filter(
                      (_, idx) => idx !== i,
                    );
                    const colors = (about?.feature_colors ?? []).filter(
                      (_, idx) => idx !== i,
                    );
                    patchAbout({
                      features: (about?.features ?? []).filter((_, idx) => idx !== i),
                      feature_icons: icons,
                      feature_colors: colors,
                    });
                  }}
                />
              </div>
            ))
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => patchAbout({ features: [...(about?.features ?? []), ""] })}
            >
              <Plus className="h-4 w-4" /> Add feature
            </Button>
            {(about?.features?.length ?? 0) > 1 && (
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

export function StatsBody({ s, id = "stats" }: { s: PageEditorState; id?: string }) {
  const { getData, setData, statsReorder, setStatsReorder } = s;
  const stats = (getData(id) as Stat[] | undefined) ?? [];
  const set = (next: Stat[]) => setData(id, next);
  return (
    <>
      {statsReorder ? (
        <ReorderList
          items={stats}
          onReorder={(next) => set(next)}
          getLabel={(st) => st.value || st.label || "Stat"}
        />
      ) : (
        stats.map((st, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-foreground">Icon</span>
              <IconPicker
                value={st.icon}
                onChange={(icon) => {
                  const next = stats.slice();
                  next[i] = { ...next[i], icon };
                  set(next);
                }}
              />
            </div>
            <div className="flex-1">
              <Field label="Value">
                <Input
                  value={st.value}
                  onChange={(e) => {
                    const next = stats.slice();
                    next[i] = { ...next[i], value: e.target.value };
                    set(next);
                  }}
                />
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Label">
                <Input
                  value={st.label}
                  onChange={(e) => {
                    const next = stats.slice();
                    next[i] = { ...next[i], label: e.target.value };
                    set(next);
                  }}
                />
              </Field>
            </div>
            <MoveRemove
              onUp={() => set(moveItem(stats, i, -1))}
              onDown={() => set(moveItem(stats, i, 1))}
              onRemove={() => set(stats.filter((_, idx) => idx !== i))}
            />
          </div>
        ))
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => set([...stats, { value: "", label: "" } as Stat])}
        >
          <Plus className="h-4 w-4" /> Add stat
        </Button>
        {hasItems(stats) && stats.length > 1 && (
          <ReorderToggle active={statsReorder} onToggle={() => setStatsReorder((v) => !v)} />
        )}
      </div>
    </>
  );
}

