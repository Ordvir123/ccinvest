import { GRADIENTS } from "@/lib/icon-colors";

/**
 * Shared SVG <defs> holding the gradient definitions referenced by icons
 * across the app. Mounted once at the app root so any icon can render a
 * gradient stroke via `stroke: url(#lov-grad-<key>)`.
 */
export function IconGradientDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {GRADIENTS.map((g) => (
          <linearGradient
            key={g.key}
            id={`lov-grad-${g.key}`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            {g.stops.map((c, i) => (
              <stop
                key={i}
                offset={`${(i / Math.max(1, g.stops.length - 1)) * 100}%`}
                stopColor={c}
              />
            ))}
          </linearGradient>
        ))}
      </defs>
    </svg>
  );
}
