import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Section } from "@/components/ui/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SingleImageUpload } from "@/components/admin/MediaUpload";
import { IconPicker } from "@/components/admin/IconPicker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import {
  DEFAULT_TEMPLATE_SETTINGS,
  fetchTemplateSettings,
  saveTemplateSettings,
  type ApartmentTitleOption,
  type TemplateSettings,
} from "@/lib/template-settings";
import { READING_LANGS, type SpecPreset, type SpecValueKind } from "@/types/page";

export const Route = createFileRoute("/_admin/admin/settings")({
  component: SettingsPage,
});

const SETTINGS_SLUG = "template-settings";

function SettingsPage() {
  const settingsQuery = useQuery({
    queryKey: ["template-settings"],
    queryFn: fetchTemplateSettings,
  });

  const [form, setForm] = useState<TemplateSettings>(DEFAULT_TEMPLATE_SETTINGS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsQuery.data) setForm(settingsQuery.data);
  }, [settingsQuery.data]);

  const update = (patch: Partial<TemplateSettings>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const onSave = async () => {
    setSaving(true);
    try {
      const saved = await saveTemplateSettings(form);
      setForm(saved);
      settingsQuery.refetch();
      toast.success("ההגדרות נשמרו ויחולו על כל דפי הנחיתה.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "השמירה נכשלה.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl text-foreground">הגדרות טמפלייט</h1>
          <p className="mt-2 text-muted-foreground">
            הגדרות בסיסיות שחלות על כל דפי הנחיתה לנכסים.
          </p>
        </div>
        <Button onClick={onSave} disabled={saving || settingsQuery.isLoading}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          שמירה
        </Button>
      </div>

      {settingsQuery.isLoading ? (
        <Card className="mt-8">
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>מיתוג</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>שם המותג</Label>
                <Input
                  value={form.brandName}
                  onChange={(e) => update({ brandName: e.target.value })}
                  placeholder="CC Invest"
                />
              </div>
              <div className="space-y-2">
                <Label>לוגו</Label>
                <SingleImageUpload
                  slug={SETTINGS_SLUG}
                  value={form.brandLogoUrl ? { url: form.brandLogoUrl, alt: form.brandName } : undefined}
                  onChange={(m) => update({ brandLogoUrl: m?.url ?? "" })}
                />
                <Input
                  className="mt-2"
                  value={form.brandLogoUrl}
                  onChange={(e) => update({ brandLogoUrl: e.target.value })}
                  placeholder="כתובת תמונה (URL)"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>צבע מותג ראשי</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>צבע ראשי</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.primaryColor || "#1f2a4d"}
                    onChange={(e) => update({ primaryColor: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-border bg-card"
                    aria-label="בורר צבע"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => update({ primaryColor: e.target.value })}
                    placeholder="#1f2a4d (השאר ריק לברירת מחדל)"
                  />
                  {form.primaryColor && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => update({ primaryColor: "" })}
                    >
                      איפוס
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  משפיע על הגרדיאנט בהירו, הכפתורים והאייקונים. ריק = ברירת המחדל של התבנית.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>טקסטים בברירת מחדל</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>תווית כפתור CTA</Label>
                <Input
                  value={form.defaultCtaLabel}
                  onChange={(e) => update({ defaultCtaLabel: e.target.value })}
                  placeholder="לדוגמה: לפרטים נוספים"
                />
              </div>
              <div className="space-y-2">
                <Label>כותרת סקשן צור קשר</Label>
                <Input
                  value={form.defaultContactHeading}
                  onChange={(e) => update({ defaultContactHeading: e.target.value })}
                  placeholder="לדוגמה: צרו קשר"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                משמש כברירת מחדל כאשר לדף עצמו לא הוגדר טקסט.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>תמונת רקע לסקשן צור קשר</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SingleImageUpload
                slug={SETTINGS_SLUG}
                value={form.contactBgUrl ? { url: form.contactBgUrl } : undefined}
                onChange={(m) => update({ contactBgUrl: m?.url ?? "" })}
              />
              <Input
                value={form.contactBgUrl}
                onChange={(e) => update({ contactBgUrl: e.target.value })}
                placeholder="כתובת תמונה (URL) — ריק = תמונת ברירת המחדל"
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>כותרות לסקשן "על הדירה"</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                כותרות לבחירה בסקשן "על הדירה" בעורך הדף. לכל כותרת ניתן לבחור אייקון.
                כותרות חדשות שמוזנות בעורך הדף נשמרות כאן אוטומטית.
              </p>
              {(form.apartmentTitleOptions ?? []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <IconPicker
                    value={opt.icon}
                    onChange={(icon) => {
                      const next = (form.apartmentTitleOptions ?? []).slice();
                      next[i] = { ...next[i], icon: (icon as string) ?? "" };
                      update({ apartmentTitleOptions: next });
                    }}
                  />
                  <Input
                    value={opt.label}
                    onChange={(e) => {
                      const next = (form.apartmentTitleOptions ?? []).slice();
                      next[i] = { ...next[i], label: e.target.value };
                      update({ apartmentTitleOptions: next });
                    }}
                    placeholder="לדוגמה: À propos de l'appartement"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() =>
                      update({
                        apartmentTitleOptions: (form.apartmentTitleOptions ?? []).filter(
                          (_, idx) => idx !== i,
                        ),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  update({
                    apartmentTitleOptions: [
                      ...(form.apartmentTitleOptions ?? []),
                      { label: "", icon: "home" } as ApartmentTitleOption,
                    ],
                  })
                }
              >
                <Plus className="h-4 w-4" /> הוספת כותרת
              </Button>
            </CardContent>
          </Card>

          <PresetsCard
            title='כותרות ואייקונים ל"פרטי הדירה"'
            hint="רשימת פרטים מוכנים (כותרת + אייקון) לבחירה בשורות הפרטים בעורך. ניתן לערוך כותרת בכל שפה, לבחור אייקון וסוג ערך. פרטים חדשים מהעורך יישמרו כאן."
            presets={form.specPresets ?? []}
            withValueKind
            onChange={(specPresets) => update({ specPresets })}
          />

          <PresetsCard
            title="מאפיינים ואייקונים (Features)"
            hint="רשימת מאפיינים מוכנים (טקסט + אייקון) לבחירה בשורות המאפיינים בעורך. ניתן לערוך טקסט בכל שפה ולבחור אייקון."
            presets={form.featurePresets ?? []}
            onChange={(featurePresets) => update({ featurePresets })}
          />
        </div>

      )}
    </Section>
  );
}

const VALUE_KIND_LABELS: Record<SpecValueKind, string> = {
  number: "מספר",
  area: 'שטח (מ"ר)',
  floor: "קומה",
  rooms: "חדרים",
  orientation: "כיוון",
  parking: "חניה",
  text: "טקסט חופשי",
};

function PresetsCard({
  title,
  hint,
  presets,
  withValueKind = false,
  onChange,
}: {
  title: string;
  hint: string;
  presets: SpecPreset[];
  withValueKind?: boolean;
  onChange: (presets: SpecPreset[]) => void;
}) {
  const update = (i: number, patch: Partial<SpecPreset>) => {
    const next = presets.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const setLabel = (i: number, lang: (typeof READING_LANGS)[number], value: string) => {
    const next = presets.slice();
    next[i] = { ...next[i], labels: { ...next[i].labels, [lang]: value } };
    onChange(next);
  };
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{hint}</p>
        {presets.map((p, i) => (
          <div key={i} className="space-y-2 rounded-md border border-border p-3" dir="ltr">
            <div className="flex items-center gap-2">
              <IconPicker value={p.icon} onChange={(icon) => update(i, { icon: (icon as string) || "check" })} />
              {withValueKind && (
                <Select value={p.valueKind} onValueChange={(v) => update(i, { valueKind: v as SpecValueKind })}>
                  <SelectTrigger className="w-[150px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(VALUE_KIND_LABELS) as SpecValueKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {VALUE_KIND_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8 shrink-0"
                onClick={() => onChange(presets.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {READING_LANGS.map((l) => (
                <Input
                  key={l}
                  dir={l === "he" ? "rtl" : "ltr"}
                  aria-label={`Label (${l})`}
                  placeholder={`Label (${l.toUpperCase()})`}
                  value={p.labels[l] ?? ""}
                  onChange={(e) => setLabel(i, l, e.target.value)}
                />
              ))}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([
              ...presets,
              {
                key: `preset_${Math.random().toString(36).slice(2, 8)}`,
                icon: "check",
                valueKind: withValueKind ? "number" : "text",
                labels: { fr: "", he: "", en: "" },
              } as SpecPreset,
            ])
          }
        >
          <Plus className="h-4 w-4" /> הוספה
        </Button>
      </CardContent>
    </Card>
  );
}

