import type { ProgramIcon as IconName } from "@/lib/programs";

/** One line drawing per tableau of a program (24×24, stroked). */
export const PROGRAM_ICON_PATHS: Record<IconName, string> = {
  train: "M7 3h10a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3zM4 10h16M8 20l-2 2M16 20l2 2M9 14h.01M15 14h.01",
  boat: "M2.5 13c3 .8 6 1.2 9.5 1.2s6.5-.4 9.5-1.2l-2.6 5.5H5.1zM8 13.6 10 7M16 13.6 14 7",
  nile: "M3 15.5h18l-3 4H6zM12 15.5V3l7 10.5h-7M10.5 5 5 13.5h5.5",
  window: "M5 21V10a7 7 0 0 1 14 0v11zM12 3.2V21M5 13h14",
  dome: "M4 21h16M6 21v-7h12v7M7 14c0-4 2.5-6.5 5-8 2.5 1.5 5 4 5 8M12 6V3",
  speech: "M3 4h11v8H8l-3 3v-3H3zM14 8h7v8h-2v3l-3-3h-5v-2",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z",
  rings: "M4.5 12a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0M10.5 12a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0",
  river: "M3 7c3-2 6 2 9 0s6 2 9 0M3 12c3-2 6 2 9 0s6 2 9 0M3 17c3-2 6 2 9 0s6 2 9 0",
  bird: "M2.5 13.5c3.5-.5 6-3.3 7-7.5 1 3.5 3.3 5.6 6.5 5.6 1.9 0 3.8-.8 5.5-2.6-1.2 4.8-4.6 7.8-9 8.6L10.5 21l-1-3.4c-3-.4-5.4-1.6-7-4.1z",
  medina: "M5 21V11a7 7 0 0 1 14 0v10M9 21v-6a3 3 0 0 1 6 0v6M3 21h18",
  dune: "M2 18c4-6.5 8.5-6.5 12-2 2.2-2.2 5.2-2 8 2M2 21h20M15 6.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0",
  coffee: "M4.5 9h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM15.5 10.5h1.8a2.2 2.2 0 0 1 0 4.4h-2M8 2.5c-1 1.8 1 2.8 0 4.6M12 2.5c-1 1.8 1 2.8 0 4.6M3 21h15",
  village: "M2.5 21h19M4.5 21v-8l4.5-3.5 4.5 3.5v8M13.5 21v-6l3.5-2.5 3.5 2.5v6M8 21v-4h2v4M9 6V3",
  lantern: "M12 2v2M9 4h6l1.5 3h-9zM7.5 7h9l-1.2 10H8.7zM8.7 17h6.6v3H8.7zM12 10v4",
  drum: "M6 4h12M6 4c0 5 3 7 4 9l-1 7h6l-1-7c1-2 4-4 4-9M6.5 7h11",
};

export function ProgramIcon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={className}
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={PROGRAM_ICON_PATHS[name]} />
    </svg>
  );
}
