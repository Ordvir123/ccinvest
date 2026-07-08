import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/admin/editor-parts";
import { SingleImageUpload, UnitFileUpload } from "@/components/admin/MediaUpload";
import { IconPicker } from "@/components/admin/IconPicker";
import { ReorderList, ReorderToggle } from "@/components/admin/reorder";
import {
  UNIT_TYPES,
  ORIENTATION_CODES,
  PARKING_CODES,
  UNIT_TYPE_OPTION_LABELS,
  ORIENTATION_OPTION_LABELS,
  PARKING_OPTION_LABELS,
  BUILTIN_SPEC_PRESETS,
  BUILTIN_FEATURE_PRESETS,
  resolvePreset,
  migrateUnitSpecs,
  migrateUnitFeatures,
} from "@/lib/unit-i18n";
import {
  READING_LANGS,
  isRtlReading,
  type DetailRow,
  type SpecPreset,
  type Unit,
} from "@/types/page";
import {
  MoveRemove,
  moveItem,
  sanitizeNum,
  LinkToggle,
  CUSTOM_PRESET,
} from "@/components/admin/editor/shared";
import type { PageEditorState } from "@/components/admin/editor/usePageEditorState";

/** Editor for flexible spec rows (Area, Rooms, Floor, …). */
function SpecRowsEditor({
  rows,
  presets,
  onChange,
}: {
  rows: DetailRow[];
  presets: SpecPreset[];
  onChange: (rows: DetailRow[]) => void;
}) {
  const [reorder, setReorder] = useState(false);
  const update = (i: number, p: Partial<DetailRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...p };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {reorder ? (
        <ReorderList
          items={rows}
          onReorder={onChange}
          getLabel={(row) => {
            const p = resolvePreset(row.presetKey, presets, BUILTIN_SPEC_PRESETS);
            return (p?.labels.fr || row.label || row.value || "Detail") as string;
          }}
        />
      ) : (
        rows.map((row, i) => {
          const preset = resolvePreset(row.presetKey, presets, BUILTIN_SPEC_PRESETS);
          const isCustom = !row.presetKey;
          const linked = !isCustom && row.linked !== false;
          const kind = preset?.valueKind ?? "text";
          const effIcon = linked ? preset?.icon : row.icon || preset?.icon;
          return (
            <div key={i} className="space-y-2 rounded-md border border-border p-2">
              <div className="flex items-center gap-2">
                <IconPicker
                  value={effIcon}
                  onChange={(icon) => update(i, { icon: (icon as string) ?? "" })}
                />
                <LinkToggle
                  linked={linked}
                  disabled={isCustom}
                  onToggle={() =>
                    update(i, {
                      linked: !linked,
                      label: !linked ? undefined : (preset?.labels.fr ?? ""),
                      icon: !linked ? undefined : preset?.icon,
                    })
                  }
                />
                <Select
                  value={row.presetKey ?? CUSTOM_PRESET}
                  onValueChange={(v) => {
                    if (v === CUSTOM_PRESET) {
                      update(i, {
                        presetKey: undefined,
                        linked: false,
                        label: row.label ?? "",
                        icon: effIcon,
                      });
                    } else {
                      update(i, {
                        presetKey: v,
                        linked: true,
                        label: undefined,
                        icon: undefined,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.labels.fr || p.labels.en || p.labels.he || p.key}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_PRESET}>Custom text…</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {(isCustom || !linked) && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {READING_LANGS.map((l) => (
                    <Input
                      key={l}
                      dir={isRtlReading(l) ? "rtl" : "ltr"}
                      aria-label={`Label (${l})`}
                      placeholder={`Label (${l.toUpperCase()})`}
                      value={l === "fr" ? (row.label ?? "") : ""}
                      disabled={l !== "fr"}
                      onChange={(e) => update(i, { label: e.target.value })}
                    />
                  ))}
                </div>
              )}
              {kind === "orientation" ? (
                <Select value={row.value ?? ""} onValueChange={(v) => update(i, { value: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select orientation" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORIENTATION_CODES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {ORIENTATION_OPTION_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : kind === "parking" ? (
                <Select value={row.value ?? ""} onValueChange={(v) => update(i, { value: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select parking" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARKING_CODES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {PARKING_OPTION_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  inputMode={kind === "text" ? "text" : "decimal"}
                  placeholder="Value"
                  value={row.value ?? ""}
                  onChange={(e) =>
                    update(i, {
                      value: kind === "text" ? e.target.value : sanitizeNum(e.target.value),
                    })
                  }
                />
              )}
            </div>
          );
        })
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([...rows, { presetKey: presets[0]?.key, linked: true, value: "" }])
          }
        >
          <Plus className="h-4 w-4" /> Add detail
        </Button>
        {rows.length > 1 && (
          <ReorderToggle active={reorder} onToggle={() => setReorder((v) => !v)} />
        )}
      </div>
    </div>
  );
}

/** Editor for flexible feature rows (icon + text, preset or custom). */
function FeatureRowsEditor({
  rows,
  presets,
  onChange,
}: {
  rows: DetailRow[];
  presets: SpecPreset[];
  onChange: (rows: DetailRow[]) => void;
}) {
  const [reorder, setReorder] = useState(false);
  const update = (i: number, p: Partial<DetailRow>) => {
    const next = rows.slice();
    next[i] = { ...next[i], ...p };
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {reorder ? (
        <ReorderList
          items={rows}
          onReorder={onChange}
          getLabel={(row) => {
            const p = resolvePreset(row.presetKey, presets, BUILTIN_FEATURE_PRESETS);
            return (row.value || p?.labels.fr || "Feature") as string;
          }}
        />
      ) : (
        rows.map((row, i) => {
          const preset = resolvePreset(row.presetKey, presets, BUILTIN_FEATURE_PRESETS);
          const isCustom = !row.presetKey;
          const linked = !isCustom && row.linked !== false;
          const effIcon = linked ? preset?.icon : row.icon || preset?.icon;
          return (
            <div key={i} className="space-y-2 rounded-md border border-border p-2">
              <div className="flex items-center gap-2">
                <IconPicker
                  value={effIcon}
                  onChange={(icon) => update(i, { icon: (icon as string) ?? "" })}
                />
                <LinkToggle
                  linked={linked}
                  disabled={isCustom}
                  onToggle={() =>
                    update(i, {
                      linked: !linked,
                      value: !linked ? (preset?.labels.fr ?? "") : "",
                      icon: !linked ? undefined : preset?.icon,
                    })
                  }
                />
                <Select
                  value={row.presetKey ?? CUSTOM_PRESET}
                  onValueChange={(v) => {
                    if (v === CUSTOM_PRESET)
                      update(i, { presetKey: undefined, linked: false, icon: effIcon });
                    else update(i, { presetKey: v, linked: true, value: "", icon: undefined });
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Choose a feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {presets.map((p) => (
                      <SelectItem key={p.key} value={p.key}>
                        {p.labels.fr || p.labels.en || p.labels.he || p.key}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_PRESET}>Custom text…</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {(isCustom || !linked) && (
                <Input
                  placeholder="Feature text"
                  value={row.value ?? ""}
                  onChange={(e) => update(i, { value: e.target.value })}
                />
              )}
            </div>
          );
        })
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, { presetKey: undefined, linked: false, value: "" }])}
        >
          <Plus className="h-4 w-4" /> Add feature
        </Button>
        {rows.length > 1 && (
          <ReorderToggle active={reorder} onToggle={() => setReorder((v) => !v)} />
        )}
      </div>
    </div>
  );
}

/* ---------- Unit block ---------- */
export function UnitBlock({
  index,
  unit,
  slug,
  canUpload,
  onChange,
  onUp,
  onDown,
  onRemove,
  onDuplicate,
  titleOverride,
  forceOpen = false,
  specPresets,
  featurePresets,
  titleNode,
}: {
  index: number;
  unit: Unit;
  slug: string;
  canUpload: boolean;
  onChange: (u: Unit) => void;
  onUp?: () => void;
  onDown?: () => void;
  onRemove?: () => void;
  onDuplicate?: () => void;
  /** When set, shows this title instead of the derived unit title. */
  titleOverride?: string;
  /** When true, the block renders expanded and without a collapse toggle. */
  forceOpen?: boolean;
  /** Spec presets from template settings (merged with built-ins). */
  specPresets: SpecPreset[];
  /** Feature presets from template settings (merged with built-ins). */
  featurePresets: SpecPreset[];
  /** Optional heading picker rendered at the top of the block. */
  titleNode?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const set = (p: Partial<Unit>) => onChange({ ...unit, ...p });
  const specs = unit.specs ?? migrateUnitSpecs(unit);
  const featureRows = unit.featureRows ?? migrateUnitFeatures(unit);
  // Custom name only applies to "Other" (or legacy units saved without a type).
  const isOther = !unit.unit_type || unit.unit_type === "other";
  const title =
    titleOverride ??
    ((isOther
      ? unit.name?.trim()
      : `${UNIT_TYPE_OPTION_LABELS[unit.unit_type!]}${unit.unit_number ? " " + unit.unit_number : ""}`) ||
      `Unit ${index + 1}`);
  const showControls = !!(onUp && onDown && onRemove);
  const isOpen = forceOpen || open;

  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        {forceOpen ? (
          <span className="text-sm font-medium text-foreground">{title}</span>
        ) : (
          <button
            type="button"
            className="text-sm font-medium text-foreground"
            onClick={() => setOpen((v) => !v)}
          >
            {title}
          </button>
        )}
        {showControls && <MoveRemove onUp={onUp!} onDown={onDown!} onRemove={onRemove!} />}
      </div>
      {isOpen && (
        <div className="mt-3 space-y-3">
          {titleNode}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Unit type" required>
              <Select
                value={unit.unit_type ?? "apartment"}
                onValueChange={(v) => set({ unit_type: v as Unit["unit_type"] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((tpe) => (
                    <SelectItem key={tpe} value={tpe}>
                      {UNIT_TYPE_OPTION_LABELS[tpe]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Number">
              <Input
                inputMode="numeric"
                value={unit.unit_number ?? ""}
                onChange={(e) => set({ unit_number: e.target.value })}
                placeholder="№"
              />
            </Field>
          </div>
          {isOther && (
            <Field
              label="Custom name"
              hint="Shown verbatim across all languages — only used for “Other”."
            >
              <Input value={unit.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
            </Field>
          )}
          <Field
            label="Details"
            hint="Add any detail rows you want. Pick a preset (label + icon), or use custom text. Click the chain to unlink and edit the label & icon."
          >
            <SpecRowsEditor
              rows={specs}
              presets={specPresets}
              onChange={(rows) => set({ specs: rows })}
            />
          </Field>
          <Field label="Price">
            <Input value={unit.price ?? ""} onChange={(e) => set({ price: e.target.value })} />
          </Field>
          <Field label="Description">
            <Textarea
              rows={2}
              value={unit.description ?? ""}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
          <Field
            label="Features"
            hint="Pick a preset feature (label + icon) or add custom text. Unlink to edit label & icon per row."
          >
            <FeatureRowsEditor
              rows={featureRows}
              presets={featurePresets}
              onChange={(rows) => set({ featureRows: rows })}
            />
          </Field>
          <Field label="Image">
            <SingleImageUpload
              slug={slug}
              value={unit.image}
              onChange={(image) => set({ image })}
              disabled={!canUpload}
            />
          </Field>
          <Field label="Floor plan" hint="Optional image or PDF shown on the unit card.">
            <UnitFileUpload
              slug={slug}
              value={unit.attachment}
              label="floor plan"
              onChange={(attachment) => set({ attachment })}
              disabled={!canUpload}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

/* ---------- Listing (units / apartment) section body ---------- */
export function ListingBody({ s }: { s: PageEditorState }) {
  const {
    content,
    patch,
    slug,
    canUpload,
    specPresets,
    featurePresets,
    unitsReorder,
    setUnitsReorder,
    listingIsProject,
    titleOptions,
    aptTitleCustom,
    setAptTitleCustom,
    CUSTOM_TITLE,
    DEFAULT_TITLE,
  } = s;

  return listingIsProject ? (
    <div className="space-y-4">
      {unitsReorder ? (
        <ReorderList
          items={content.units ?? []}
          onReorder={(units) => patch({ units })}
          getLabel={(u, i) => u.name || u.unit_type || `Unit ${i + 1}`}
        />
      ) : (
        (content.units ?? []).map((u, i) => (
          <UnitBlock
            key={i}
            index={i}
            unit={u}
            slug={slug}
            canUpload={canUpload}
            onChange={(unit) => {
              const next = (content.units ?? []).slice();
              next[i] = unit;
              patch({ units: next });
            }}
            onUp={() => patch({ units: moveItem(content.units ?? [], i, -1) })}
            onDown={() => patch({ units: moveItem(content.units ?? [], i, 1) })}
            onRemove={() =>
              patch({ units: (content.units ?? []).filter((_, idx) => idx !== i) })
            }
            specPresets={specPresets}
            featurePresets={featurePresets}
          />
        ))
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            patch({
              units: [...(content.units ?? []), { name: "", unit_type: "apartment" } as Unit],
            })
          }
        >
          <Plus className="h-4 w-4" /> Add unit
        </Button>
        {(content.units?.length ?? 0) > 1 && (
          <ReorderToggle active={unitsReorder} onToggle={() => setUnitsReorder((v) => !v)} />
        )}
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      <Field
        label="Image side (desktop)"
        hint="Which side the main image sits on. Mirrored automatically in Hebrew (RTL)."
      >
        <Select
          value={content.apartment_image_side ?? "right"}
          onValueChange={(v) => patch({ apartment_image_side: v as "left" | "right" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="right">Image on the right</SelectItem>
            <SelectItem value="left">Image on the left</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <UnitBlock
        index={0}
        unit={content.apartment ?? ({ name: "", unit_type: "apartment" } as Unit)}
        slug={slug}
        canUpload={canUpload}
        titleOverride="Apartment details"
        forceOpen
        specPresets={specPresets}
        featurePresets={featurePresets}
        titleNode={(() => {
          const label = content.apartment_title?.trim() ?? "";
          const matched = titleOptions.find((o) => o.label.trim() === label);
          const isCustom = aptTitleCustom || (label.length > 0 && !matched);
          const linked = !isCustom;
          const selectValue = isCustom
            ? CUSTOM_TITLE
            : matched
              ? matched.label
              : DEFAULT_TITLE;
          return (
            <Field
              label="Section heading"
              hint="Choose a preset heading (label + icon) or unlink to edit freely — new custom headings are saved as future options on save."
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <IconPicker
                    value={content.apartment_title_icon}
                    onChange={(icon) => patch({ apartment_title_icon: (icon as string) ?? "" })}
                  />
                  <LinkToggle linked={linked} onToggle={() => setAptTitleCustom((v) => !v)} />
                  <Select
                    value={selectValue}
                    onValueChange={(v) => {
                      if (v === DEFAULT_TITLE) {
                        setAptTitleCustom(false);
                        patch({ apartment_title: "", apartment_title_icon: "" });
                      } else if (v === CUSTOM_TITLE) {
                        setAptTitleCustom(true);
                      } else {
                        setAptTitleCustom(false);
                        const opt = titleOptions.find((o) => o.label === v);
                        patch({
                          apartment_title: v,
                          apartment_title_icon: opt?.icon ?? content.apartment_title_icon ?? "",
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DEFAULT_TITLE}>
                        Default (À propos de l'appartement)
                      </SelectItem>
                      {titleOptions.map((o) => (
                        <SelectItem key={o.label} value={o.label}>
                          {o.label}
                        </SelectItem>
                      ))}
                      <SelectItem value={CUSTOM_TITLE}>Custom text…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isCustom && (
                  <Input
                    value={content.apartment_title ?? ""}
                    onChange={(e) => patch({ apartment_title: e.target.value })}
                    placeholder="Enter a custom heading…"
                  />
                )}
              </div>
            </Field>
          );
        })()}
        onChange={(apartment) => patch({ apartment })}
      />
    </div>
  );
}
