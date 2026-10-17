export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <g fill="none" stroke="#E4BE74" strokeWidth="1.8">
        <path d="M4 24 Q20 36 36 24" />
        <path d="M10 22 L20 10 L30 22" />
        <circle cx="20" cy="17" r="2.5" fill="#E4BE74" />
      </g>
    </svg>
  );
}

export function LockIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function FileIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#E4BE74" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6v18h12V7z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

/** Arrow pointing "forward" in reading direction. */
export function ForwardArrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ltr:-scale-x-100">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}
