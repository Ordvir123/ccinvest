import { Sparkles } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ICON_NAMES, getIcon } from "@/lib/page-icons";

const AUTO = "__auto__";

/**
 * Small dropdown to pick an icon by name. Empty value means "auto" (derived
 * from the label text at render time).
 */
export function IconPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (name: string | undefined) => void;
}) {
  return (
    <Select
      value={value || AUTO}
      onValueChange={(v) => onChange(v === AUTO ? undefined : v)}
    >
      <SelectTrigger className="w-[64px] shrink-0 px-2" aria-label="Icon">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={AUTO}>
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Auto
          </span>
        </SelectItem>
        {ICON_NAMES.map((name) => {
          const Icon = getIcon(name)!;
          return (
            <SelectItem key={name} value={name}>
              <span className="flex items-center gap-2 capitalize">
                <Icon className="h-4 w-4" /> {name}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
