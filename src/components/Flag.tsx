interface FlagProps {
  code: "fr" | "he" | "en";
  className?: string;
}

/**
 * Inline SVG flags (FR / IL / US) — reliable across platforms where emoji
 * flags do not render (notably Windows). 4:3 rounded swatches.
 */
export function Flag({ code, className = "h-4 w-5 rounded-sm" }: FlagProps) {
  if (code === "fr") {
    return (
      <svg viewBox="0 0 3 2" className={className} aria-hidden role="img">
        <rect width="3" height="2" fill="#fff" />
        <rect width="1" height="2" fill="#0055A4" />
        <rect width="1" height="2" x="2" fill="#EF4135" />
      </svg>
    );
  }
  if (code === "he") {
    return (
      <svg viewBox="0 0 660 480" className={className} aria-hidden role="img">
        <rect width="660" height="480" fill="#fff" />
        <g fill="none" stroke="#0038b8" strokeWidth="28">
          <rect x="0" y="55" width="660" height="40" stroke="none" fill="#0038b8" />
          <rect x="0" y="385" width="660" height="40" stroke="none" fill="#0038b8" />
          <path d="M330 175 l46 80 -92 0 z" />
          <path d="M330 305 l46 -80 -92 0 z" />
        </g>
      </svg>
    );
  }
  // en -> US
  return (
    <svg viewBox="0 0 7410 3900" className={className} aria-hidden role="img">
      <rect width="7410" height="3900" fill="#b22234" />
      <g fill="#fff">
        <rect y="300" width="7410" height="300" />
        <rect y="900" width="7410" height="300" />
        <rect y="1500" width="7410" height="300" />
        <rect y="2100" width="7410" height="300" />
        <rect y="2700" width="7410" height="300" />
        <rect y="3300" width="7410" height="300" />
      </g>
      <rect width="2964" height="2100" fill="#3c3b6e" />
    </svg>
  );
}
